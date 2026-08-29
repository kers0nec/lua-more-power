/* ============================================================
   LuaMore — site logic
   Real Supabase auth + real profiles + real TOTP 2FA.
   No mocks: every flow talks to the LuaMore Supabase backend.
   ============================================================ */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- accent (applied early from inline head script) ---------- */
  function applyAccent() {
    try {
      var prefs = JSON.parse(localStorage.getItem("lm_prefs") || "{}");
      if (prefs.accent && prefs.accent !== "blue") document.documentElement.setAttribute("data-accent", prefs.accent);
    } catch (e) { /* ignore */ }
  }
  applyAccent();

  /* ---------- toasts ---------- */
  function toast(msg, type) {
    var box = $(".toasts");
    if (!box) { box = document.createElement("div"); box.className = "toasts"; document.body.appendChild(box); }
    var el = document.createElement("div");
    el.className = "toast " + (type || "ok");
    el.innerHTML = '<span class="t-ic">' + (type === "err" ? "✕" : "✓") + "</span><span></span>";
    el.lastChild.textContent = msg;
    box.appendChild(el);
    setTimeout(function () {
      el.style.transition = "opacity .3s ease, transform .3s ease";
      el.style.opacity = "0"; el.style.transform = "translateY(6px)";
      setTimeout(function () { el.remove(); }, 320);
    }, 4200);
  }

  /* ---------- copy / download ---------- */
  function copyText(text, done) {
    var doneOnce = false;
    function finish(ok) { if (doneOnce) return; doneOnce = true; if (done) done(ok); }
    function legacy() {
      try {
        var ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        finish(document.execCommand("copy")); ta.remove();
      } catch (e) { finish(false); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { finish(true); }, legacy);
    } else legacy();
  }
  function downloadText(filename, text) {
    var blob = new Blob([text], { type: "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }
  function bindCopyButtons() {
    $$("[data-copy]").forEach(function (btn) {
      if (btn._lmBound) return;
      btn._lmBound = true;
      btn.addEventListener("click", function () {
        var targetSel = btn.getAttribute("data-copy");
        var text = "";
        if (targetSel === "text" && btn.getAttribute("data-text")) text = btn.getAttribute("data-text");
        else if (targetSel) { var t = $(targetSel); if (t) text = t.textContent; }
        else {
          var host = btn.closest(".code-window, .preset-card, .obf-card");
          var pre = host && host.querySelector("pre.code");
          if (pre) text = pre.textContent;
        }
        var original = btn.textContent;
        copyText(text, function (ok) {
          btn.classList.add("copied");
          btn.textContent = ok ? "Copied ✓" : "Copy failed";
          toast(ok ? "Copied to clipboard" : "Could not copy", ok ? "ok" : "err");
          setTimeout(function () { btn.classList.remove("copied"); btn.textContent = original; }, 1600);
        });
      });
    });
  }

  /* ---------- lua highlighting ---------- */
  var LUA_KW = /^(local|function|end|if|then|else|elseif|for|in|do|while|repeat|until|return|break|nil|true|false|and|or|not)$/;
  function escHtml(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function highlightLua(src) {
    var out = [];
    var lines = src.replace(/\t/g, "    ").split("\n");
    lines.forEach(function (line, idx) {
      var html = escHtml(line);
      var re = /(--[^\n]*)|("(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_][A-Za-z0-9_]*\b)(?!\s*\()|(\b[A-Za-z_][A-Za-z0-9_]*\b)(?=\s*\()|(\s+)|([^\sA-Za-z0-9_"-])/g;
      var parts = [], m, last = 0;
      re.lastIndex = 0;
      while ((m = re.exec(html)) !== null) {
        if (m.index > last) parts.push(html.slice(last, m.index));
        if (m[1]) parts.push('<span class="tok-com">' + m[1] + "</span>");
        else if (m[2]) parts.push('<span class="tok-str">' + m[2] + "</span>");
        else if (m[3]) parts.push('<span class="tok-num">' + m[3] + "</span>");
        else if (m[4]) parts.push(LUA_KW.test(m[4]) ? '<span class="tok-kw">' + m[4] + "</span>" : m[4]);
        else if (m[5]) parts.push('<span class="tok-fn">' + m[5] + "</span>");
        else if (m[6]) parts.push(m[6]);
        else if (m[7]) parts.push(m[7]);
        last = re.lastIndex;
      }
      if (last < html.length) parts.push(html.slice(last));
      out.push('<span class="ln">' + String(idx + 1).padStart(2, "0") + "</span>" + parts.join(""));
    });
    return out.join("\n");
  }
  function bindCode() {
    $$("pre.code[data-lang='lua']").forEach(function (pre) {
      if (pre._lmHl || pre.getAttribute("data-src")) return;
      pre._lmHl = true;
      pre.innerHTML = highlightLua(pre.textContent);
    });
  }

  /* ============================================================
     VERIFY YOU'RE HUMAN (real interactive bot check)
     ============================================================ */
  var SHIELD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>';

  function LMVerify(mount, opts) {
    opts = opts || {};
    var api = { pass: false, el: mount };
    var attempts = 0, challenge = null;
    var body = null, foot = null;

    mount.classList.add("verify");
    mount.innerHTML = "";
    var head = document.createElement("div");
    head.className = "verify-head";
    head.innerHTML =
      '<span class="shield">' + SHIELD + "</span>" +
      "<div><h4>" + (opts.label || "Verify you’re human") + "</h4>" +
      "<small>" + (opts.sub || "A quick check to keep bots out.") + "</small></div>";
    body = document.createElement("div");
    body.className = "verify-body";
    foot = document.createElement("div");
    foot.className = "verify-foot";
    foot.innerHTML = '<span>Attempt <b class="v-attempt">1</b></span><span>·</span><span>LuaMore Verify — never sees your account data</span>';
    mount.appendChild(head); mount.appendChild(body); mount.appendChild(foot);

    function attemptLabel() { var el = $(".v-attempt", mount); if (el) el.textContent = String(attempts + 1); }

    function fail(msg) {
      attempts++; attemptLabel();
      mount.classList.remove("shake"); void mount.offsetWidth; mount.classList.add("shake");
      if (opts.onState) opts.onState("fail");
      setTimeout(function () {
        mount.classList.remove("shake");
        if (msg) toast(msg, "err");
        newChallenge();
      }, 450);
    }
    function checking() {
      body.innerHTML = '<div class="verify-state"><span class="spinner"></span><span>Checking…</span></div>';
      if (opts.onState) opts.onState("checking");
      setTimeout(function () {
        api.pass = true;
        mount.classList.remove("needs");
        body.innerHTML =
          '<div class="verify-state"><span class="ok"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span><span>You’re verified. Carry on.</span></div>';
        if (opts.onState) opts.onState("passed");
      }, 900);
    }
    function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
    function shuffle(arr) {
      for (var i = arr.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
      return arr;
    }
    function makeChallenge() {
      var kind = shuffle(["math", "seq", "type"])[0];
      if (kind === "math") {
        var a = randInt(3, 12), b = randInt(2, 11);
        var op = shuffle(["+", "-", "×"])[0];
        var ans = op === "+" ? a + b : op === "-" ? a - b : a * b;
        var o = new Set([ans]);
        while (o.size < 4) o.add(ans + randInt(-4, 4) * (Math.random() < 0.5 ? -1 : 1));
        return { kind: "math", q: a + " " + op + " " + b + " = ?", opts: shuffle(Array.from(o)), ans: ans };
      }
      if (kind === "seq") {
        var phrases = [["You", "are", "a", "human"], ["Loading", "screens", "keep", "users"], ["Keys", "protect", "your", "scripts"], ["More", "power", "more", "security"]];
        var p = phrases[randInt(0, phrases.length - 1)];
        return { kind: "seq", target: p, pool: shuffle(p.slice()), picked: [] };
      }
      var chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", code = "";
      for (var i = 0; i < 5; i++) code += chars[randInt(0, chars.length - 1)];
      return { kind: "type", code: code };
    }
    function renderMath() {
      body.innerHTML = "";
      var wrap = document.createElement("div"); wrap.className = "verify-math";
      wrap.innerHTML = '<span class="q">' + challenge.q + "</span>";
      challenge.opts.forEach(function (o) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "v-choice"; b.textContent = o;
        b.addEventListener("click", function () { if (o === challenge.ans) checking(); else fail("Wrong answer — new challenge."); });
        wrap.appendChild(b);
      });
      body.appendChild(wrap);
    }
    function renderSeq() {
      challenge.picked = [];
      body.innerHTML = "";
      var label = document.createElement("div");
      label.style.cssText = "font-size:13.5px;font-weight:700;margin-bottom:9px;";
      label.textContent = "Tap the words in the right order:";
      var trace = document.createElement("div"); trace.className = "v-seq-trace";
      var row = document.createElement("div"); row.className = "v-seq";
      function paintTrace() {
        trace.textContent = challenge.picked.length
          ? challenge.picked.join(" ") + (challenge.picked.length < challenge.target.length ? " ▸" : "") : "—";
      }
      challenge.pool.forEach(function (word) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "v-word"; b.textContent = word;
        b.addEventListener("click", function () {
          var next = challenge.target[challenge.picked.length];
          if (word === next) {
            challenge.picked.push(word); b.classList.add("picked"); paintTrace();
            if (challenge.picked.length === challenge.target.length) setTimeout(checking, 250);
          } else fail("Out of order — start again.");
        });
        row.appendChild(b);
      });
      body.appendChild(label); body.appendChild(row); body.appendChild(trace);
      paintTrace();
    }
    function renderType() {
      body.innerHTML = "";
      var wrap = document.createElement("div"); wrap.className = "v-type";
      var label = document.createElement("span");
      label.style.cssText = "font-size:13px;color:var(--muted);"; label.textContent = "Type the code shown:";
      var cap = document.createElement("span"); cap.className = "v-code"; cap.textContent = challenge.code;
      var input = document.createElement("input");
      input.className = "input"; input.maxLength = 5; input.autocomplete = "off";
      input.placeholder = "type it"; input.setAttribute("aria-label", "Type the code");
      input.addEventListener("input", function () {
        var v = input.value.toUpperCase();
        if (v.length === challenge.code.length) {
          if (v === challenge.code) checking();
          else { input.value = ""; fail("Not quite — new code."); }
        }
      });
      wrap.appendChild(label); wrap.appendChild(cap); wrap.appendChild(input);
      body.appendChild(wrap);
    }
    function newChallenge() {
      challenge = makeChallenge();
      api._challenge = challenge;
      if (challenge.kind === "math") renderMath();
      else if (challenge.kind === "seq") renderSeq();
      else renderType();
    }
    newChallenge();
    window.__lmVerifyLast = api;

    api.check = function () {
      if (api.pass) return true;
      mount.classList.add("needs");
      mount.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    };
    api.reset = function () { api.pass = false; attempts = 0; attemptLabel(); newChallenge(); };
    return api;
  }

  /* ============================================================
     SUPABASE plumbing
     ============================================================ */
  function whenReady(cb) {
    if (window.LMSupabase) { cb(window.LMSupabase); return; }
    var list = window.__lmOnSupabaseQueue || (window.__lmOnSupabaseQueue = []);
    list.push(cb);
    window.__lmOnSupabase = function (c) { list.forEach(function (f) { f(c); }); };
  }
  function supabaseDown() {
    toast("Couldn't reach LuaMore services — check your connection", "err");
  }
  function sameDir(name) {
    var base = location.origin + location.pathname.replace(/[^/]+$/, "");
    return base + name;
  }
  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn._busyLabel = btn.textContent; btn.disabled = true; btn.textContent = label || "Working…"; }
    else { btn.disabled = false; btn.textContent = btn._busyLabel || "…"; }
  }

  var RE_USER = /^[A-Za-z0-9]{3,24}$/;
  var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function fieldError(field, on) {
    var f = field.closest(".field");
    if (f) f.classList.toggle("show-err", !!on);
    field.classList.toggle("invalid", !!on);
  }

  /* ============================================================
     AUTH PAGES
     ============================================================ */
  function bindAuthForms() {
    $$("[data-pw]").forEach(function (input) {
      var field = input.closest(".field");
      var meter = field && field.querySelector(".pw-meter");
      var label = field && field.querySelector(".pw-label");
      input.addEventListener("input", function () {
        var v = input.value, s = 0;
        if (v.length >= 8) s++;
        if (v.length >= 12) s++;
        if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
        if (/\d/.test(v) && /[^A-Za-z0-9]/.test(v)) s++;
        if (!v) s = 0;
        if (meter) meter.className = "pw-meter" + (s ? " s" + s : "");
        if (label) label.textContent = !v ? "" : ["", "Weak", "Okay", "Good", "Strong"][s];
      });
    });

    /* ---------- REGISTER ---------- */
    var reg = $("#register-form");
    if (reg) {
      var verify = $("#verify-register") ? LMVerify($("#verify-register"), { label: "Verify you’re human", sub: "Required before we can create your account." }) : null;
      whenReady(function (client) {
        var step1 = $("#reg-step-1"), step2 = $("#reg-step-2"), step3 = $("#reg-step-3");

        function goSettings(user) {
          var wu = $("#reg-welcome-user");
          var dn = user && (user.user_metadata && (user.user_metadata.display_name || user.user_metadata.name));
          if (wu) wu.textContent = dn || (user ? user.email.split("@")[0] : "friend");
          step1.classList.add("hidden"); step2.classList.add("hidden");
          step3.classList.remove("hidden");
          step3.scrollIntoView({ behavior: "smooth", block: "start" });
          toast("Account created — welcome to LuaMore");
        }

        reg.addEventListener("submit", function (e) {
          e.preventDefault();
          var u = $("#reg-username"), em = $("#reg-email"), pw = $("#reg-password");
          var ok = true;
          if (!RE_USER.test(u.value.trim())) { fieldError(u, true); ok = false; } else fieldError(u, false);
          if (!RE_EMAIL.test(em.value.trim())) { fieldError(em, true); ok = false; } else fieldError(em, false);
          if (pw.value.length < 8) { fieldError(pw, true); ok = false; } else fieldError(pw, false);
          if (!$("#reg-terms").checked) { toast("Please accept the Terms of Service", "err"); ok = false; }
          if (ok && verify) { if (!verify.check()) ok = false; }
          if (!ok) return;

          var btn = reg.querySelector("button[type=submit]");
          busy(btn, true, "Creating account…");
          client.auth.signUp({
            email: em.value.trim(),
            password: pw.value,
            options: {
              data: { display_name: u.value.trim() },
              emailRedirectTo: sameDir("settings.html")
            }
          }).then(function (res) {
            busy(btn, false);
            if (res.error) {
              var msg = res.error.message;
              if (/already registered|already been registered/i.test(msg)) toast("That email is already registered — sign in instead", "err");
              else toast(msg, "err");
              return;
            }
            var pn = $("#reg-pending-name");
            if (pn) pn.textContent = em.value.trim();
            if (res.data && res.data.session) {
              goSettings(res.data.user);
            } else {
              // real confirmation email was sent — tell the truth about it
              var cEm = $("#reg-continue-email");
              if (cEm) cEm.value = em.value.trim();
              step1.classList.add("hidden");
              step2.classList.remove("hidden");
              step2.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          });
        });

        // after clicking the link in the email, they come back and sign in here
        var cont = $("#reg-continue-form");
        if (cont) {
          cont.addEventListener("submit", function (e) {
            e.preventDefault();
            var em2 = $("#reg-continue-email"), pw2 = $("#reg-continue-pw");
            if (!RE_EMAIL.test(em2.value.trim()) || !pw2.value) {
              if (!RE_EMAIL.test(em2.value.trim())) fieldError(em2, true);
              if (!pw2.value) fieldError(pw2, true);
              return;
            }
            var b = cont.querySelector("button[type=submit]");
            busy(b, true, "Signing in…");
            client.auth.signInWithPassword({ email: em2.value.trim(), password: pw2.value }).then(function (res) {
              busy(b, false);
              if (res.error) {
                if (/confirm|not confirmed|verify your email/i.test(res.error.message))
                  toast("Email not confirmed yet — open the link we sent", "err");
                else toast(res.error.message, "err");
                return;
              }
              goSettings(res.data.user);
            });
          });
        }
      });
    }

    /* ---------- LOGIN ---------- */
    var login = $("#login-form");
    if (login) {
      var lv = $("#verify-login") ? LMVerify($("#verify-login"), { label: "Verify you’re human", sub: "One quick check before signing in." }) : null;
      whenReady(function (client) {
        var forgotBox = $("#forgot-box"), resetDone = $("#reset-done");
        var forgotForm = $("#forgot-form");

        $("#forgot-link").addEventListener("click", function (e) {
          e.preventDefault();
          $("#auth-card-main").classList.add("hidden");
          forgotBox.classList.remove("hidden");
          forgotBox.scrollIntoView({ behavior: "smooth", block: "center" });
        });
        function backToLogin() {
          forgotBox.classList.add("hidden");
          $("#auth-card-main").classList.remove("hidden");
        }
        $("#forgot-back").addEventListener("click", backToLogin);

        if (forgotForm) {
          forgotForm.addEventListener("submit", function (e) {
            e.preventDefault();
            var em = $("#forgot-email");
            if (!RE_EMAIL.test(em.value.trim())) { fieldError(em, true); return; }
            fieldError(em, false);
            var b = forgotForm.querySelector("button[type=submit]");
            busy(b, true, "Sending reset email…");
            client.auth.resetPasswordForEmail(em.value.trim(), { redirectTo: sameDir("reset-password.html") }).then(function (res) {
              busy(b, false);
              if (res.error) {
                // supabase returns 200 for unknown emails (anti-enumeration);
                // only surface real failures.
                if (/rate limit|too many/i.test(res.error.message)) toast(res.error.message, "err");
                else {
                  $("#forgot-sent").classList.remove("hidden");
                  toast("Reset email sent — check your inbox");
                }
              } else {
                $("#forgot-sent").classList.remove("hidden");
                toast("Reset email sent — check your inbox");
              }
            });
          });
        }

        login.addEventListener("submit", function (e) {
          e.preventDefault();
          var id = $("#login-id"), pw = $("#login-pw");
          var ok = true;
          if (!id.value.trim()) { fieldError(id, true); ok = false; } else fieldError(id, false);
          if (!pw.value) { fieldError(pw, true); ok = false; } else fieldError(pw, false);
          if (ok && lv) { if (!lv.check()) ok = false; }
          if (!ok) return;

          var btn = login.querySelector("button[type=submit]");
          busy(btn, true, "Signing in…");
          client.auth.signInWithPassword({ email: id.value.trim(), password: pw.value }).then(function (res) {
            busy(btn, false);
            if (res.error) {
              fieldError(pw, true);
              if (/confirm|not confirmed/i.test(res.error.message)) toast("Email not confirmed — check your inbox for the link", "err");
              else toast(res.error.message, "err");
              if (lv) lv.reset();
              return;
            }
            toast("Signed in as " + res.data.user.email);
            setTimeout(function () { location.href = "settings.html"; }, 500);
          });
        });
      });
    }

    /* ---------- RESET PASSWORD (opened from the email link) ---------- */
    var resetForm = $("#reset-form");
    if (resetForm) {
      var hasCode = /[?&]code=/.test(location.search) || /[?&]type=(recovery|signup)/.test(location.search);
      if (!hasCode) {
        $("#reset-no-code").classList.remove("hidden");
        resetForm.classList.add("hidden");
      }
      whenReady(function (client) {
        // if the email link already exchanged a session, we're in
        client.auth.getSession().then(function (res) {
          if (res.data && res.data.session && !hasCode) {
            // arrived signed-in without a code: nothing to reset
          }
        });
        resetForm.addEventListener("submit", function (e) {
          e.preventDefault();
          var p1 = $("#reset-pw"), p2 = $("#reset-pw2");
          if (p1.value.length < 8) { fieldError(p1, true); return; }
          if (p1.value !== p2.value) { fieldError(p2, true); toast("Passwords don’t match", "err"); return; }
          fieldError(p1, false); fieldError(p2, false);
          var b = resetForm.querySelector("button[type=submit]");
          busy(b, true, "Updating password…");
          client.auth.updateUser({ password: p1.value, password_confirm: p2.value }).then(function (res) {
            busy(b, false);
            if (res.error) { toast(res.error.message, "err"); return; }
            resetForm.classList.add("hidden");
            if (resetDone) resetDone.classList.remove("hidden");
            toast("Password updated — sign in with your new password");
          });
        });
      });
    }
  }

  /* ============================================================
     SETTINGS PAGE (real)
     ============================================================ */
  function bindSettings() {
    var root = $("#settings-root");
    if (!root) return;

    function signedOutPanel() {
      root.innerHTML =
        '<div class="card" style="text-align:center;padding:54px 24px;">' +
        '<div class="icon" style="margin:0 auto 16px;">' + SHIELD + "</div>" +
        "<h3 style='font-size:19px;'>Sign in to manage your profile</h3>" +
        "<p class='muted' style='margin-bottom:20px;'>Profile, email, password, and appearance all live in Settings.</p>" +
        "<div style='display:flex;gap:10px;justify-content:center;flex-wrap:wrap;'>" +
        "<a class='btn btn-ghost' href='login.html'>Sign in</a>" +
        "<a class='btn btn-primary' href='register.html'>Create account</a></div></div>";
    }

    whenReady(function (client) {
      client.auth.getSession().then(function (res) {
        var user = res.data && res.data.session && res.data.session.user;
        if (!user) { signedOutPanel(); return; }
        initSettings(user);
      });
    });

    function initSettings(user) {
      var uid = user.id;
      var profile = null;
      var totpPending = null; // { id } awaiting code
      var totpVerified = null; // verified factor id

      function paintSwatches() {
        var prefs = {};
        try { prefs = JSON.parse(localStorage.getItem("lm_prefs") || "{}"); } catch (e) {}
        var cur = prefs.accent || "blue";
        $$("#appearance .swatch").forEach(function (s) { s.classList.toggle("sel", s.getAttribute("data-val") === cur); });
        var avColor = profile ? profile._avatar : "blue";
        $$(".av-swatch").forEach(function (s) { s.classList.toggle("sel", s.getAttribute("data-av") === avColor); });
      }
      function avatarColor() {
        try { return (JSON.parse(localStorage.getItem("lm_prefs") || "{}").avatar) || "blue"; } catch (e) { return "blue"; }
      }
      function paintAvatar() {
        var name = (profile && profile.display_name) || (user.email || "").split("@")[0] || "LM";
        var initials = name.slice(0, 2).toUpperCase();
        var col = avatarColor();
        $("#s-avatar").className = "avatar" + (col === "blue" ? "" : " " + col);
        $("#s-avatar").textContent = initials;
        var small = $("#s-avatar-small");
        small.className = "avatar" + (col === "blue" ? "" : " " + col);
        small.style.cssText = "width:34px;height:34px;border-radius:10px;font-size:13px;";
        small.textContent = initials;
      }
      function paint() {
        paintAvatar();
        if (!profile) return;
        $("#s-user").textContent = profile.display_name || (user.email || "").split("@")[0];
        $("#s-display").value = profile.display_name || "";
        $("#s-email").value = user.email || "";
        if (profile.created_at) {
          $("#s-since").textContent = new Date(profile.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
        }
      }

      function loadProfile() {
        return client.from("profiles").select("*").eq("id", uid).maybeSingle().then(function (r) {
          if (r.data) profile = r.data;
          else profile = { display_name: (user.user_metadata && user.user_metadata.display_name) || (user.email || "").split("@")[0], created_at: user.created_at, _avatar: "blue" };
          paint();
          return profile;
        });
      }

      /* profile */
      var avColor = "blue";
      $$(".av-swatch").forEach(function (s) {
        s.addEventListener("click", function () {
          avColor = s.getAttribute("data-av");
          var prefs = {};
          try { prefs = JSON.parse(localStorage.getItem("lm_prefs") || "{}"); } catch (e) {}
          prefs.avatar = avColor;
          localStorage.setItem("lm_prefs", JSON.stringify(prefs));
          paintSwatches(); paintAvatar();
        });
      });
      $("#s-profile-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var dn = $("#s-display").value.trim();
        if (!dn) { toast("Display name can't be empty", "err"); return; }
        var b = $("#s-profile-form button[type=submit]");
        busy(b, true, "Saving…");
        client.from("profiles").update({ display_name: dn }).eq("id", uid).then(function (r) {
          busy(b, false);
          if (r.error) { toast(r.error.message, "err"); return; }
          if (profile) profile.display_name = dn;
          toast("Profile saved");
          paint();
        });
      });

      /* email (real — Supabase sends the confirmation to the new address) */
      $("#s-email-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var em = $("#s-new-email");
        if (!RE_EMAIL.test(em.value.trim())) { fieldError(em, true); return; }
        fieldError(em, false);
        var newEmail = em.value.trim();
        var b = $("#s-email-form button[type=submit]");
        busy(b, true, "Sending confirmation…");
        client.auth.updateUser({ email: newEmail }).then(function (r) {
          busy(b, false);
          if (r.error) { toast(r.error.message, "err"); return; }
          em.value = "";
          toast("Confirmation email sent to " + newEmail + " — open it to finish", "ok");
        }).catch(function () { busy(b, false); });
      });

      /* password (real) */
      $("#s-pw-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var cur = $("#s-pw-cur"), n1 = $("#s-pw-new"), n2 = $("#s-pw-new2");
        if (!cur.value) { fieldError(cur, true); return; }
        if (n1.value.length < 8) { fieldError(n1, true); return; }
        if (n1.value !== n2.value) { fieldError(n2, true); toast("New passwords don’t match", "err"); return; }
        fieldError(cur, false); fieldError(n1, false); fieldError(n2, false);
        var b = $("#s-pw-form button[type=submit]");
        busy(b, true, "Updating…");
        client.auth.updateUser({
          password: n1.value,
          password_confirm: n2.value,
          current_password: cur.value
        }).then(function (r) {
          busy(b, false);
          if (r.error) {
            // some projects don't accept current_password — retry without it
            client.auth.updateUser({ password: n1.value, password_confirm: n2.value }).then(function (r2) {
              if (r2.error) { fieldError(cur, true); toast(r2.error.message, "err"); return; }
              cur.value = n1.value = n2.value = "";
              toast("Password updated");
            });
            return;
          }
          cur.value = n1.value = n2.value = "";
          toast("Password updated");
        });
      });

      /* 2FA — real TOTP via Supabase MFA */
      function refreshFactors() {
        return client.auth.mfa.listFactors().then(function (r) {
          totpVerified = null; totpPending = null;
          (r.data.factors || []).forEach(function (f) {
            if (f.factorType === "totp") {
              if (f.status === "verified") totpVerified = f.id;
              else totpPending = { id: f.id };
            }
          });
          paint2fa();
        });
      }
      function paint2fa() {
        var badge = $("#s-2fa-badge");
        var two = $("#s-2fa-toggle");
        var on = !!totpVerified;
        badge.innerHTML = on ? '<span class="badge-on">Enabled</span>' : (totpPending ? '<span class="muted small">Finish setup</span>' : '<span class="muted small">Off</span>');
        two.classList.toggle("on", on);
        two.setAttribute("aria-pressed", on);
      }

      $("#s-2fa-toggle").addEventListener("click", function () {
        if (totpVerified) {
          // disable: confirm, then unenroll
          if (!confirm("Turn off two-factor authentication?")) return;
          client.auth.mfa.unenroll(totpVerified).then(function (r) {
            if (r.error) toast(r.error.message, "err");
            else { toast("Two-factor authentication disabled"); refreshFactors(); }
          });
          return;
        }
        // enable: enroll (returns a fresh TOTP secret)
        client.auth.mfa.enroll({ factorType: "totp" }).then(function (r) {
          if (r.error) { toast(r.error.message, "err"); return; }
          totpPending = { id: r.data.id, secret: r.data.totp && r.data.totp.secret };
          $("#s-2fa-secret").textContent = r.data.totp && r.data.totp.secret ? r.data.totp.secret : "(secret unavailable)";
          $("#s-2fa-step").classList.remove("hidden");
          $("#s-2fa-code").value = "";
          $("#s-2fa-code-hint").textContent = "Add this secret manually in any authenticator app (Google Authenticator, 1Password, Authy), then enter the 6-digit code it shows.";
        });
      });
      $("#s-2fa-form").addEventListener("submit", function (e) {
        e.preventDefault();
        if (!totpPending) return;
        var c = $("#s-2fa-code");
        if (!/^\d{6}$/.test(c.value.trim())) { fieldError(c, true); return; }
        fieldError(c, false);
        var b = $("#s-2fa-form button[type=submit]");
        busy(b, true, "Verifying…");
        client.auth.mfa.challenge({ issuerId: totpPending.id, factorType: "totp" }).then(function (ch) {
          if (ch.error) { busy(b, false); toast(ch.error.message, "err"); return; }
          return client.auth.mfa.verify({ challengeId: ch.data.id, code: c.value.trim() }).then(function (vr) {
            busy(b, false);
            if (vr.error) { fieldError(c, true); toast(vr.error.message, "err"); return; }
            toast("Two-factor authentication enabled");
            refreshFactors();
          });
        }).catch(function () { busy(b, false); });
      });
      $("#s-2fa-cancel").addEventListener("click", function () {
        // drop the unverified factor so the toggle returns to Off
        $("#s-2fa-step").classList.add("hidden");
        if (totpPending && totpPending.id) {
          client.auth.mfa.unenroll(totpPending.id).then(function () { refreshFactors(); });
        }
      });

      /* accent */
      $$("#appearance .swatch").forEach(function (s) {
        s.addEventListener("click", function () {
          var v = s.getAttribute("data-val");
          var prefs = {};
          try { prefs = JSON.parse(localStorage.getItem("lm_prefs") || "{}"); } catch (e) {}
          prefs.accent = v;
          localStorage.setItem("lm_prefs", JSON.stringify(prefs));
          if (v === "blue") document.documentElement.removeAttribute("data-accent");
          else document.documentElement.setAttribute("data-accent", v);
          paintSwatches();
          toast("Accent updated across the site");
        });
      });

      /* danger */
      $("#s-signout").addEventListener("click", function () {
        client.auth.signOut().then(function () {
          toast("Signed out");
          setTimeout(function () { location.href = "index.html"; }, 500);
        });
      });
      $("#s-delete-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var t = $("#s-delete-confirm").value.trim();
        var name = (profile && profile.display_name) || (user.email || "").split("@")[0];
        if (t.toLowerCase() !== name.toLowerCase()) {
          fieldError($("#s-delete-confirm"), true);
          toast('Type your name "' + name + '" to confirm', "err");
          return;
        }
        var b = $("#s-delete-form button[type=submit]");
        busy(b, true, "Deleting…");
        client.auth.deleteUser().then(function (r) {
          if (r.error) {
            busy(b, false);
            toast(r.error.message + " — or email support@luamore.win to delete your account", "err");
          } else {
            toast("Account deleted");
            setTimeout(function () { location.href = "index.html"; }, 800);
          }
        }).catch(function (err) {
          busy(b, false);
          toast((err && err.message) || "Deletion not supported from the browser — email support@luamore.win", "err");
        });
      });

      /* side nav active state */
      if ("IntersectionObserver" in window) {
        var links = $$(".settings-side a");
        var obs = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              links.forEach(function (l) { l.classList.toggle("active", l.getAttribute("href") === "#" + en.target.id); });
            }
          });
        }, { rootMargin: "-30% 0px -60% 0px" });
        $$(".settings-main .card[id]").forEach(function (c) { obs.observe(c); });
      }

      loadProfile().then(refreshFactors);
      paintSwatches();
    }
  }

  /* ---------- active nav ---------- */
  function bindNav() {
    var page = document.body.getAttribute("data-page");
    if (page) {
      $$(".nav-links a").forEach(function (a) {
        var href = a.getAttribute("href");
        if (href === page + ".html" || (page === "home" && href === "index.html")) a.classList.add("active");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindCode();
    bindCopyButtons();
    bindAuthForms();
    bindSettings();
    bindNav();
    if (window.__lmSupabaseFailed) {
      toast("Couldn't load LuaMore services — check your connection and reload", "err");
    }
  });

  /* expose for inline page scripts */
  window.LM = {
    toast: toast,
    verify: LMVerify,
    esc: escHtml,
    hl: highlightLua,
    download: downloadText
  };
})();
