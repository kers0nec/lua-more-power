// In-browser client-side Lua execution sandbox powered by Fengari
// Allows users to test their Luau/Lua scripts and verified obfuscated code live in the browser.

export interface ExecutionResult {
  success: boolean;
  logs: Array<{ type: "log" | "warn" | "error" | "info"; message: string; timestamp: string }>;
  output: string;
  error?: string;
  executionTimeMs: number;
}

export async function runLuaInBrowser(
  luaCode: string,
  options: {
    mockRobloxGlobals?: boolean;
    playerName?: string;
    timeoutMs?: number;
  } = {},
): Promise<ExecutionResult> {
  const startTime = performance.now();
  const logs: Array<{
    type: "log" | "warn" | "error" | "info";
    message: string;
    timestamp: string;
  }> = [];

  const addLog = (type: "log" | "warn" | "error" | "info", msg: string) => {
    logs.push({
      type,
      message: msg,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  try {
    const fengari = (await import("fengari")).default;
    const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari;

    const L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(L);

    // Register print
    lua.lua_register(L, to_luastring("print"), (state: unknown) => {
      const top = lua.lua_gettop(state as Parameters<typeof lua.lua_gettop>[0]);
      const parts: string[] = [];
      for (let i = 1; i <= top; i++) {
        const str = lua.lua_tostring(state as Parameters<typeof lua.lua_tostring>[0], i);
        parts.push(str ? to_jsstring(str) : "nil");
      }
      addLog("log", parts.join("\t"));
      return 0;
    });

    // Register warn
    lua.lua_register(L, to_luastring("warn"), (state: unknown) => {
      const top = lua.lua_gettop(state as Parameters<typeof lua.lua_gettop>[0]);
      const parts: string[] = [];
      for (let i = 1; i <= top; i++) {
        const str = lua.lua_tostring(state as Parameters<typeof lua.lua_tostring>[0], i);
        parts.push(str ? to_jsstring(str) : "nil");
      }
      addLog("warn", parts.join("\t"));
      return 0;
    });

    // Mock basic Roblox environment if enabled
    const playerName = options.playerName || "LuaMoreUser";
    const robloxMockLua = `
      _G.game = {
        GetService = function(self, name)
          if name == "Players" then
            return {
              LocalPlayer = {
                Name = "${playerName}",
                UserId = 12345678,
                DisplayName = "${playerName}",
              },
              GetPlayers = function() return { _G.game:GetService("Players").LocalPlayer } end,
            }
          elseif name == "RbxAnalyticsService" then
            return {
              GetClientId = function() return "LM-MOCK-HWID-999-AF" end
            }
          elseif name == "UserInputService" then
            return {
              TouchEnabled = false,
              KeyboardEnabled = true,
              MouseEnabled = true,
            }
          end
          return {}
        end
      }
      _G.workspace = {}
      _G.script = { Name = "LuaMoreLoader" }
      _G.getgenv = function() return _G end
      _G.identifyexecutor = function() return "LuaMore In-Browser Engine", "v15.0" end
      _G.getexecutorname = function() return "LuaMore Engine" end
      _G.gethwid = function() return "MOCK_HWID_ABC123" end
      _G.task = {
        wait = function(sec) return sec or 0 end,
        spawn = function(f, ...) if type(f) == "function" then return f(...) end end,
        delay = function(sec, f, ...) if type(f) == "function" then return f(...) end end,
      }
    `;

    if (options.mockRobloxGlobals !== false) {
      lauxlib.luaL_dostring(L, to_luastring(robloxMockLua));
    }

    const status = lauxlib.luaL_dostring(L, to_luastring(luaCode));
    const executionTimeMs = Math.round(performance.now() - startTime);

    if (status !== lua.LUA_OK) {
      let errStr = "Lua execution error";
      try {
        const err = lua.lua_tostring(L, -1);
        if (err) errStr = to_jsstring(err);
      } catch {
        errStr = "Lua runtime exception";
      }
      addLog("error", errStr);
      lua.lua_close(L);
      return {
        success: false,
        logs,
        output: logs.map((l) => `[${l.type.toUpperCase()}] ${l.message}`).join("\n"),
        error: errStr,
        executionTimeMs,
      };
    }

    addLog("info", `✓ Execution finished in ${executionTimeMs}ms`);
    lua.lua_close(L);

    return {
      success: true,
      logs,
      output: logs.map((l) => `[${l.type.toUpperCase()}] ${l.message}`).join("\n"),
      executionTimeMs,
    };
  } catch (err: unknown) {
    const executionTimeMs = Math.round(performance.now() - startTime);
    const msg = err instanceof Error ? err.message : String(err || "Sandbox initialization failed");
    addLog("error", msg);
    return {
      success: false,
      logs,
      output: `[ERROR] ${msg}`,
      error: msg,
      executionTimeMs,
    };
  }
}
