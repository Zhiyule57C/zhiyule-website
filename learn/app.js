/* 知语乐 学习乐园 · shared helpers (demo build).
   DEMO ONLY: accounts and progress live in this browser. A production version needs a
   real sign-in service and a server-side progress store (see learn/README.md). */
(function () {
  'use strict';

  // Demo accounts. `upTo` = last lesson the class has had in the centre, so later lessons stay locked.
  var ACCOUNTS = {
    'n1-demo': { pw: '2027', name: '小乐', nameEn: 'Xiao Le', cls: 'N1', upTo: 8 },
    'n1-term3': { pw: '2027', name: '小语', nameEn: 'Xiao Yu', cls: 'N1', upTo: 29 },
    'teacher': { pw: 'zhiyule', name: '老师预览', nameEn: 'Teacher preview', cls: 'N1', upTo: 48, teacher: true }
  };
  var SESSION_KEY = 'zyl-learn-session';

  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(key) || 'null');
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { return null; }
  }

  function login(id, pw) {
    id = String(id || '').trim().toLowerCase();
    var acc = ACCOUNTS[id];
    if (!acc || acc.pw !== String(pw || '').trim()) return false;
    store(SESSION_KEY, { id: id, at: Date.now() });
    return true;
  }

  function current() {
    var s = store(SESSION_KEY);
    if (!s || !ACCOUNTS[s.id]) return null;
    var a = ACCOUNTS[s.id];
    return { id: s.id, name: a.name, nameEn: a.nameEn, cls: a.cls, upTo: a.upTo, teacher: !!a.teacher };
  }

  function requireLogin() {
    var u = current();
    if (!u) location.replace('index.html');
    return u;
  }

  function logout() { store(SESSION_KEY, null); location.href = 'index.html'; }

  function progress(user) {
    var key = 'zyl-learn-progress-' + user.id;
    var p = store(key) || {};
    return {
      get: function (n) { return p[n] || {}; },
      stars: function (n) { var o = p[n] || {}; return Object.keys(o).length; },
      total: function () { var t = 0; for (var k in p) t += Object.keys(p[k]).length; return t; },
      give: function (n, activity) {
        p[n] = p[n] || {};
        var fresh = !p[n][activity];
        p[n][activity] = Date.now();
        store(key, p);
        return fresh;
      }
    };
  }

  // Mandarin text-to-speech. Production should use recorded teacher audio instead.
  var voice = null, active = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    var vs = speechSynthesis.getVoices();
    voice = vs.filter(function (v) { return /^zh[-_]CN/i.test(v.lang); })[0] ||
            vs.filter(function (v) { return /^zh/i.test(v.lang) && !/HK|TW/i.test(v.lang); })[0] ||
            vs.filter(function (v) { return /^zh/i.test(v.lang); })[0] || null;
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }
  function speak(text, opts) {
    opts = opts || {};
    // onend runs once: from the voice, or from a timer when the device has no working voice.
    // A new call silently drops the previous call's onend.
    if (active) active();
    var ended = false, finish = function () { if (ended) return; ended = true; active = null; if (opts.onend) opts.onend(); };
    var fallback = setTimeout(finish, 900 + 450 * String(text).length);
    active = function () { ended = true; clearTimeout(fallback); };
    if (!('speechSynthesis' in window)) return null;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    if (voice) u.voice = voice;
    u.rate = opts.rate || 0.75;
    u.pitch = 1.1;
    u.onend = function () { clearTimeout(fallback); finish(); };
    if (opts.onboundary) u.onboundary = opts.onboundary;
    speechSynthesis.speak(u);
    return u;
  }
  function hasVoice() { return 'speechSynthesis' in window; }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function header(user) {
    var el = document.getElementById('top');
    if (!el) return;
    el.innerHTML =
      '<div class="demo-bar">Demo 测试版 · 仅供内部预览 <span lang="en">Demo build · internal preview only</span></div>' +
      '<div class="top"><div class="wrap">' +
      '<a class="logo" href="home.html"><img src="../assets/brand-logo-vector.svg" alt="知语乐 ZHIYULE" width="1280" height="480"></a>' +
      '<div class="title">学习乐园<span class="en">Learning Garden</span></div><div class="spacer"></div>' +
      (user ? '<span class="chip">🌱 ' + esc(user.name) + ' · ' + esc(user.cls) + '</span>' +
        '<button class="link-btn" type="button" id="logout">退出 Log out</button>' : '') +
      '</div></div>';
    var lo = document.getElementById('logout');
    if (lo) lo.onclick = logout;
  }

  function reward(title, en, onClose) {
    var r = document.getElementById('reward');
    if (!r) {
      r = document.createElement('div');
      r.id = 'reward';
      r.className = 'reward';
      document.body.appendChild(r);
    }
    r.innerHTML = '<div class="box" role="dialog" aria-modal="true"><div class="big-star">⭐</div>' +
      '<img src="img/giraffe.webp" alt="" width="360" height="468">' +
      '<h2>' + esc(title) + '<span class="en">' + esc(en) + '</span></h2>' +
      '<button class="btn" type="button">好的 OK</button></div>';
    r.hidden = false;
    var b = r.querySelector('button');
    b.focus();
    b.onclick = function () { r.hidden = true; if (onClose) onClose(); };
  }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  window.ZYL = { login: login, current: current, requireLogin: requireLogin, logout: logout, progress: progress,
    speak: speak, hasVoice: hasVoice, esc: esc, header: header, reward: reward, shuffle: shuffle };
})();
