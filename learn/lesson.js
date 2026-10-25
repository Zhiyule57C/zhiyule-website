/* 知语乐 学习乐园 · one lesson and its games (demo build). */
(function () {
  'use strict';
  var user = ZYL.requireLogin();
  if (!user) return;
  ZYL.header(user);

  var D = window.ZYL_N1, esc = ZYL.esc, speak = ZYL.speak, prog = ZYL.progress(user);
  var n = +(new URLSearchParams(location.search).get('n')) || 1;
  var L = D.lessons[n - 1];
  if (!L || n > user.upTo) { location.replace('home.html'); return; }
  var unitLessons = L.review ? D.lessons.slice(L.unit[0] - 1, L.unit[1]) : [L];

  document.title = '第' + n + '课 Lesson ' + n + ' · 知语乐 ZHIYULE';
  document.getElementById('title').innerHTML = '第' + n + '课 ' + (L.review ? '复习' : '《' + esc(L.book) + '》') +
    '<span class="en">Lesson ' + n + ' · Term ' + L.term + ', week ' + L.week + (L.review ? ' · Review of lessons ' + L.unit[0] + '–' + L.unit[1] : '') + '</span>';

  if (!ZYL.hasVoice()) document.getElementById('no-voice').hidden = false;
  else setTimeout(function () {
    var vs = speechSynthesis.getVoices();
    if (vs.length && !vs.some(function (v) { return /^zh/i.test(v.lang); })) document.getElementById('no-voice').hidden = false;
  }, 1500);

  // ---------- word segmentation for tiles and tap-to-hear ----------
  var VOC = {};
  D.lessons.forEach(function (l) { l.classWords.concat(l.cards).forEach(function (w) { VOC[w] = 1; }); });
  ['你的', '小手', '白白的', '拍一拍', '动一动', '走一走', '跳一跳', '大大的', '高高的', '小小的', '圆圆的', '红红的',
   '亮亮的', '天上', '树上', '花园', '下雨', '小鱼', '小虫', '小红花', '大树', '回来', '出来', '开门', '上山', '吃饭',
   '一口', '有手', '有脚'].forEach(function (w) { VOC[w] = 1; });
  var PUNCT = /[。，！？、：；,.!?]/;
  function segment(text) {
    var out = [], i = 0;
    while (i < text.length) {
      if (PUNCT.test(text[i])) { out.push({ t: text[i], p: true, at: i }); i++; continue; }
      var len = 1;
      for (var k = 4; k > 1; k--) if (VOC[text.substr(i, k)]) { len = k; break; }
      out.push({ t: text.substr(i, len), at: i });
      i += len;
    }
    return out;
  }
  function sentences(text) { return text.split(/(?<=[。！？])/).map(function (s) { return s.trim(); }).filter(Boolean); }
  function word(w) { return D.words[w] || { py: '', en: '', pic: '' }; }

  // ---------- activities ----------
  var ACTS = L.review
    ? [['cards', '🃏', '认一认', 'Word cards'], ['memory', '🧠', '翻翻乐', 'Memory game'], ['listen', '👂', '听音找字', 'Listen & find'],
       ['read', '📖', '读小课文', 'Read along'], ['trace', '✍️', '描笔画', 'Trace']]
    : [['cards', '🃏', '认一认', 'Word cards'], ['listen', '👂', '听音找字', 'Listen & find'], ['read', '📖', '读小课文', 'Read along'],
       ['build', '🧩', '排一排', 'Build the sentence'], ['trace', '✍️', '描笔画', 'Trace']];
  var stage = document.getElementById('stage'), steps = document.getElementById('steps'), cur = 0;

  function drawSteps() {
    var got = prog.get(n);
    steps.innerHTML = ACTS.map(function (a, i) {
      return '<button role="tab" data-i="' + i + '" aria-selected="' + (i === cur) + '" class="' + (got[a[0]] ? 'got' : '') + '">' +
        '<span class="ico">' + a[1] + '</span>' + a[2] + '<span class="en">' + a[3] + '</span></button>';
    }).join('');
  }
  steps.onclick = function (e) { var b = e.target.closest('button'); if (b) open(+b.dataset.i); };

  function open(i) {
    cur = i;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    drawSteps();
    var a = ACTS[i];
    stage.innerHTML = '';
    RENDER[a[0]](stage);
    var nr = document.getElementById('next-row');
    var next = i < ACTS.length - 1
      ? '<button class="btn light" type="button" id="go-next">下一个：' + ACTS[i + 1][2] + '<span class="en">Next: ' + ACTS[i + 1][3] + '</span></button>'
      : (n < user.upTo ? '<a class="btn light" href="lesson.html?n=' + (n + 1) + '">下一课 →<span class="en">Next lesson</span></a>' : '') +
        '<a class="btn light" href="home.html">回到首页<span class="en">Back home</span></a>';
    nr.innerHTML = next;
    var g = document.getElementById('go-next');
    if (g) g.onclick = function () { open(i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    try { history.replaceState(null, '', '?n=' + n + '&a=' + a[0]); } catch (e) {}
  }

  function done(id) {
    var fresh = prog.give(n, id);
    drawSteps();
    var all = ACTS.every(function (a) { return prog.get(n)[a[0]]; });
    if (all && fresh) ZYL.reward('这一课全部完成！', 'You finished the whole lesson!');
    else ZYL.reward(fresh ? '你得到一颗星！' : '又完成啦，真棒！', fresh ? 'You earned a star!' : 'Done again, well done!');
  }

  function head(zh, en, help, helpEn) {
    return '<h2>' + zh + '<span class="en">' + en + '</span></h2><p class="help">' + help + '<span class="en">' + helpEn + '</span></p>';
  }

  var RENDER = {};

  // 认一认: tap every card to hear it.
  RENDER.cards = function (el) {
    var heard = {};
    el.innerHTML = head('认一认 字卡', 'Word cards', '点一点每张字卡，听一听。', 'Tap each card to hear it.') +
      '<div class="flash">' + L.cards.map(function (w, i) {
        var d = word(w);
        return '<button type="button" data-i="' + i + '"><span class="pic">' + (d.pic || '🔤') + '</span><span class="zh">' + esc(w) +
          '</span><span class="py">' + esc(d.py) + '</span><span class="gloss">' + esc(d.en) + '</span></button>';
      }).join('') + '</div><div class="next-row"><button class="btn light" type="button" id="play-all">🔊 全部听一遍<span class="en">Play all</span></button></div>';
    var btns = el.querySelectorAll('.flash button');
    function hear(i) {
      speak(L.cards[i]);
      btns[i].classList.add('heard');
      heard[i] = 1;
      if (Object.keys(heard).length === L.cards.length) { heard = { x: 1 }; setTimeout(function () { done('cards'); }, 900); }
    }
    btns.forEach(function (b) { b.onclick = function () { hear(+b.dataset.i); }; });
    el.querySelector('#play-all').onclick = function () {
      var i = 0;
      (function step() {
        if (i >= L.cards.length) return;
        btns.forEach(function (b) { b.style.transform = ''; });
        btns[i].style.transform = 'scale(1.06)';
        speak(L.cards[i], { onend: function () { i++; setTimeout(step, 350); } });
      })();
    };
  };

  // 听音找字: hear a word, pick the right picture card.
  RENDER.listen = function (el) {
    var known = [];
    D.lessons.forEach(function (l) { if (l.n <= Math.max(n, 1) && !l.review) l.cards.forEach(function (w) { if (known.indexOf(w) < 0) known.push(w); }); });
    var distractPool = known.length >= 3 ? known : Object.keys(D.words);
    var rounds = L.review ? 6 : 5, targets = [];
    while (targets.length < rounds) targets = targets.concat(ZYL.shuffle(L.cards));
    targets = targets.slice(0, rounds);
    var r = 0, target;
    el.innerHTML = head('听音找字', 'Listen & find', '听一听，找到对的字卡。', 'Listen, then tap the matching card.') +
      '<div class="listen-top"><button class="speak big" type="button" id="say" aria-label="再听一次 Listen again">🔊</button><span class="round" id="round"></span></div>' +
      '<div class="choices" id="choices"><button class="btn" type="button" id="start" style="grid-column:1/-1;justify-self:center">开始 Start</button></div>';
    var box = el.querySelector('#choices');
    el.querySelector('#say').onclick = function () { if (target) speak(target); };
    el.querySelector('#start').onclick = next;
    function next() {
      if (r >= rounds) { box.innerHTML = '<p style="grid-column:1/-1;text-align:center;font-size:22px">🎉 全部找到了！<span class="en">You found them all!</span></p>'; target = null; done('listen'); return; }
      target = targets[r];
      var opts = [target], pool = ZYL.shuffle(distractPool.filter(function (w) { return w !== target; }));
      opts = ZYL.shuffle(opts.concat(pool.slice(0, 2)));
      el.querySelector('#round').textContent = (r + 1) + ' / ' + rounds;
      box.innerHTML = opts.map(function (w) {
        var d = word(w);
        return '<button type="button" data-w="' + esc(w) + '"><span class="pic">' + (d.pic || '🔤') + '</span><span class="zh">' + esc(w) + '</span></button>';
      }).join('');
      box.querySelectorAll('button').forEach(function (b) {
        b.onclick = function () {
          if (b.dataset.w === target) {
            b.classList.add('right');
            box.querySelectorAll('button').forEach(function (x) { x.onclick = null; });
            speak(target);
            setTimeout(function () { r++; next(); }, 1300);
          } else {
            b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong');
            speak(target);
          }
        };
      });
      setTimeout(function () { speak(target); }, 250);
    }
  };

  // 读小课文: the home reading text with tap-to-hear and karaoke highlight.
  RENDER.read = function (el) {
    var texts = L.texts, ti = 0, timer = null;
    el.innerHTML = head('读小课文', 'Read along', '和阅读本一起读。点 ▶ 听全文，点词语听一个词。', 'Read with the reading book. Tap ▶ for the whole text, or tap a word.') +
      (texts.length > 1 ? '<div class="pager" id="pager">' + texts.map(function (t, i) { return '<button type="button" data-i="' + i + '">第' + unitLessons[i].n + '课</button>'; }).join('') + '</div>' : '') +
      '<div class="read-text" id="rt"></div><div class="read-controls">' +
      '<button class="speak big" type="button" id="play" aria-label="听全文 Play">▶</button>' +
      '<label class="toggle"><input type="checkbox" id="pyt" checked> 拼音 Pinyin</label></div>';
    var rt = el.querySelector('#rt');
    function keys(text) {
      return L.cards.filter(function (w) { return text.indexOf(w) >= 0; });
    }
    function draw() {
      var text = texts[ti], py = D.textPinyin[text] || [], ks = keys(text);
      var html = '';
      segment(text).forEach(function (s) {
        if (s.p) { html += '<span class="punct" data-at="' + s.at + '">' + s.t + '</span>'; return; }
        var isKey = ks.some(function (k) { return k.indexOf(s.t) >= 0 || s.t.indexOf(k) >= 0; });
        html += '<button type="button" class="chunk" data-t="' + esc(s.t) + '">' + s.t.split('').map(function (c, j) {
          return '<ruby data-at="' + (s.at + j) + '" class="' + (isKey ? 'key' : '') + '">' + c + '<rt>' + esc(py[s.at + j] || '') + '</rt></ruby>';
        }).join('') + '</button>';
      });
      rt.innerHTML = html;
      rt.querySelectorAll('.chunk').forEach(function (b) {
        b.onclick = function () {
          stop();
          b.querySelectorAll('ruby').forEach(function (r) { r.classList.add('on'); });
          speak(b.dataset.t, { onend: function () { b.querySelectorAll('ruby').forEach(function (r) { r.classList.remove('on'); }); } });
        };
      });
      var pg = el.querySelector('#pager');
      if (pg) pg.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', String(+b.dataset.i === ti)); });
    }
    function stop() { clearInterval(timer); rt.querySelectorAll('ruby.on').forEach(function (r) { r.classList.remove('on'); }); }
    el.querySelector('#play').onclick = function () {
      stop();
      var text = texts[ti], order = [], at = 0;
      for (var i = 0; i < text.length; i++) order.push(i);
      var rubies = rt.querySelectorAll('ruby');
      timer = setInterval(function () {
        rubies.forEach(function (r) { r.classList.remove('on'); });
        while (at < text.length && PUNCT.test(text[at])) at++;
        var r = rt.querySelector('ruby[data-at="' + at + '"]');
        if (r) r.classList.add('on');
        at++;
        if (at > text.length) clearInterval(timer);
      }, 430);
      speak(text, { rate: 0.7, onend: function () { stop(); done('read'); } });
    };
    el.querySelector('#pyt').onchange = function (e) { rt.classList.toggle('no-py', !e.target.checked); };
    var pg = el.querySelector('#pager');
    if (pg) pg.onclick = function (e) { var b = e.target.closest('button'); if (b) { stop(); ti = +b.dataset.i; draw(); } };
    draw();
  };

  // 排一排: tap the word tiles in the right order to rebuild the sentence.
  RENDER.build = function (el) {
    var list = sentences(L.texts[0]).slice(0, 3), si = 0;
    el.innerHTML = head('排一排', 'Build the sentence', '按顺序点词语，把小课文的句子排好。', 'Tap the words in order to build the sentence.') +
      '<div class="read-controls" style="margin-bottom:6px"><button class="speak" type="button" id="hear" aria-label="听句子 Hear the sentence">🔊</button><span class="round" id="sn"></span></div>' +
      '<div class="slots" id="slots"></div><div class="tiles" id="tiles"></div>';
    var slots = el.querySelector('#slots'), tilesEl = el.querySelector('#tiles');
    el.querySelector('#hear').onclick = function () { speak(list[si] || ''); };
    function load() {
      if (si >= list.length) { tilesEl.innerHTML = ''; done('build'); return; }
      var s = list[si], chunks = segment(s).filter(function (c) { return !c.p; }).map(function (c) { return c.t; });
      if (chunks.length < 2) chunks = chunks.join('').split('');
      while (chunks.length > 6) { var last = chunks.pop(); chunks[chunks.length - 1] += last; }
      var mix = ZYL.shuffle(chunks);
      for (var k = 0; k < 5 && mix.join() === chunks.join() && chunks.length > 1; k++) mix = ZYL.shuffle(chunks);
      var pos = 0, end = s.slice(-1);
      el.querySelector('#sn').textContent = '句子 ' + (si + 1) + ' / ' + list.length;
      slots.innerHTML = '';
      tilesEl.innerHTML = mix.map(function (c, i) { return '<button class="tile" type="button" data-i="' + i + '">' + esc(c) + '</button>'; }).join('');
      tilesEl.querySelectorAll('.tile').forEach(function (b) {
        b.onclick = function () {
          if (mix[+b.dataset.i] === chunks[pos]) {
            speak(chunks[pos]);
            slots.insertAdjacentHTML('beforeend', '<span class="tile placed">' + esc(chunks[pos]) + '</span>');
            b.classList.add('used'); b.onclick = null; pos++;
            if (pos === chunks.length) {
              if (PUNCT.test(end)) slots.insertAdjacentHTML('beforeend', '<span class="tile placed" style="background:none">' + end + '</span>');
              setTimeout(function () { speak(s); }, 600);
              setTimeout(function () { si++; load(); }, 1600 + 300 * s.length);
            }
          } else { b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); }
        };
      });
      setTimeout(function () { speak(s); }, 300);
    }
    load();
  };

  // 描笔画: the homework-book stroke (single stroke) or whole character, with hanzi-writer.
  RENDER.trace = function (el) {
    var tasks = unitLessons.filter(function (l) { return l.strokeChar; });
    var ti = tasks.length - 1;
    if (!tasks.length) { el.innerHTML = '<p>本课没有新笔画。</p>'; return; }
    if (!L.review) ti = 0;
    el.innerHTML = head('描笔画', 'Trace', '先看一看，再用手指描一描。和功课本一样，每次只练一笔。', 'Watch first, then trace with a finger, just like the homework book.') +
      (tasks.length > 1 ? '<div class="pick-row" id="pick">' + tasks.map(function (t, i) {
        return '<button type="button" data-i="' + i + '">' + (t.whole ? t.strokeChar : t.strokeName) + '</button>';
      }).join('') + '</div>' : '') +
      '<div class="trace-wrap"><div class="trace-box" id="tbox"><svg class="grid" viewBox="0 0 100 100" aria-hidden="true">' +
      '<rect x="1" y="1" width="98" height="98" fill="none" stroke="#efc9c4" stroke-width="1"/>' +
      '<path d="M50 1V99M1 50H99M1 1L99 99M99 1L1 99" stroke="#f3dcd8" stroke-width=".6" stroke-dasharray="2 2"/></svg><div class="writer" id="writer"></div></div>' +
      '<div class="trace-info" id="tinfo"></div></div>';
    var pick = el.querySelector('#pick');
    if (pick) pick.onclick = function (e) { var b = e.target.closest('button'); if (b) { ti = +b.dataset.i; load(); } };
    var writer;
    function load() {
      var t = tasks[ti], box = el.querySelector('#writer'), size = el.querySelector('#tbox').clientWidth;
      if (pick) pick.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', String(+b.dataset.i === ti)); });
      box.innerHTML = '';
      writer = HanziWriter.create(box, t.strokeChar, {
        width: size, height: size, padding: 18, showCharacter: false, showOutline: true,
        strokeColor: '#493f38', outlineColor: '#e6dccd', highlightColor: '#f6b73c', drawingColor: '#a3535d',
        drawingWidth: 28, strokeAnimationSpeed: 0.7, delayBetweenStrokes: 250, showHintAfterMisses: 2, leniency: 1.6,
        charDataLoader: function (c, ok) { ok(window.ZYL_HANZI[c]); }
      });
      var info = el.querySelector('#tinfo');
      if (t.whole) {
        info.innerHTML = '<div class="stroke-name">「' + t.strokeChar + '」</div><p>描一描整个字。<span class="en">Trace the whole character, stroke by stroke.</span></p>' +
          '<div class="btns"><button class="btn light" type="button" id="watch">👀 看一看 Watch</button><button class="btn" type="button" id="go">✍️ 描一描 Trace</button></div><div class="count-q" id="cq"></div>';
      } else {
        info.innerHTML = '<div class="stroke-name">' + esc(t.strokeName) + '</div><p>在「' + t.strokeChar + '」字里找到这一笔，描一描。' +
          '<span class="en">Trace the ' + esc(t.strokeEn) + ' stroke in ' + t.strokeChar + '.</span></p>' +
          '<div class="btns"><button class="btn light" type="button" id="watch">👀 看一看 Watch</button><button class="btn" type="button" id="go">✍️ 描一描 Trace</button></div>';
      }
      info.querySelector('#watch').onclick = function () {
        writer.cancelQuiz(); writer.hideCharacter();
        if (t.whole) { speak(t.strokeChar); writer.animateCharacter(); }
        else { speak(t.strokeName); writer.animateStroke(t.strokeIndex); }
      };
      info.querySelector('#go').onclick = function () {
        writer.hideCharacter();
        if (t.whole) {
          writer.quiz({ onComplete: function () { speak(t.strokeChar); setTimeout(countQ, 700); } });
        } else {
          writer.quiz({
            quizStartStrokeNum: t.strokeIndex,
            onCorrectStroke: function (d) {
              if (d.strokeNum !== t.strokeIndex) return;
              writer.cancelQuiz();
              writer.showCharacter();
              speak(t.strokeName);
              setTimeout(function () { done('trace'); }, 900);
            }
          });
        }
      };
      function countQ() {
        var k = window.ZYL_HANZI[t.strokeChar].strokes.length;
        var opts = ZYL.shuffle([k, k + 1, Math.max(1, k - 1) === k ? k + 2 : k - 1]);
        var cq = info.querySelector('#cq');
        cq.innerHTML = '<b>「' + t.strokeChar + '」有几画？</b><span class="en">How many strokes? (like “（　）画” in the homework book)</span><div class="opts">' +
          opts.map(function (o) { return '<button type="button" data-k="' + o + '">' + o + '</button>'; }).join('') + '</div>';
        cq.querySelectorAll('button').forEach(function (b) {
          b.onclick = function () {
            if (+b.dataset.k === k) { b.classList.add('right'); speak(k + '画'); setTimeout(function () { done('trace'); }, 700); }
            else { b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong'); }
          };
        });
      }
    }
    load();
  };

  // 翻翻乐 (review lessons): find pairs of the unit's word cards.
  RENDER.memory = function (el) {
    var pick = ZYL.shuffle(L.cards).slice(0, 6), deck = ZYL.shuffle(pick.concat(pick)), openCards = [], matched = 0;
    el.innerHTML = head('翻翻乐', 'Memory game', '翻开两张卡，找到一样的一对。', 'Turn over two cards to find a matching pair.') +
      '<div class="memory">' + deck.map(function (w, i) {
        var d = word(w);
        return '<button class="mem" type="button" data-i="' + i + '" aria-label="卡片 card ' + (i + 1) + '"><span class="back">🦒</span><span class="face"><span class="pic">' + (d.pic || '🔤') + '</span><span class="zh">' + esc(w) + '</span></span></button>';
      }).join('') + '</div>';
    el.querySelectorAll('.mem').forEach(function (b) {
      b.onclick = function () {
        if (openCards.length === 2 || b.classList.contains('open') || b.classList.contains('matched')) return;
        b.classList.add('open'); speak(deck[+b.dataset.i]); openCards.push(b);
        if (openCards.length < 2) return;
        var a = openCards[0], c = openCards[1];
        if (deck[+a.dataset.i] === deck[+c.dataset.i]) {
          setTimeout(function () {
            a.classList.add('matched'); c.classList.add('matched'); openCards = []; matched++;
            if (matched === pick.length) setTimeout(function () { done('memory'); }, 500);
          }, 500);
        } else setTimeout(function () { a.classList.remove('open'); c.classList.remove('open'); openCards = []; }, 1100);
      };
    });
  };

  // Parent box: ties the lesson to the reading book (家庭共读) and homework book (笔画书写).
  var hw;
  if (L.review) hw = ['复习本单元笔画，不新增。', 'Review this unit’s strokes; nothing new.'];
  else if (L.whole) hw = ['描「' + L.strokeChar + '」两个字，并写出笔画数（' + window.ZYL_HANZI[L.strokeChar].strokes.length + '画）。', 'Trace ' + L.strokeChar + ' twice and write its stroke count.'];
  else hw = ['只描「' + L.strokeChar + '」字里的' + L.strokeName + '。', 'Trace only the ' + L.strokeEn + ' stroke in ' + L.strokeChar + '.'];
  document.getElementById('tip').innerHTML =
    '<b>家长小贴士 · For parents</b>' +
    '<p style="margin:4px 0">📖 阅读本 家庭共读：' + esc(L.review ? '重读第' + L.unit[0] + '—' + L.unit[1] + '课短文' : L.texts[0]) +
    '<span class="en">Reading book: ' + (L.review ? 're-read lessons ' + L.unit[0] + '–' + L.unit[1] : 'read this short text together') + '</span></p>' +
    '<p style="margin:4px 0">✏️ 功课本：' + esc(hw[0]) + '<span class="en">Homework book: ' + esc(hw[1]) + '</span></p>' +
    '<p style="margin:4px 0">🏠 在家玩：' + esc(L.tip.zh) + '<span class="en">At home: ' + esc(L.tip.en) + '</span></p>';

  var want = new URLSearchParams(location.search).get('a');
  var start = Math.max(0, ACTS.findIndex(function (a) { return a[0] === want; }));
  open(start);
})();
