// ffilm 官网脚本：语言切换 + 滚动叙事（第三版，11-20）
(function () {
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem("ffilm-lang"); } catch (e) {}
  var lang = saved || ((navigator.language || "").toLowerCase().indexOf("zh") === 0 ? "zh" : "en");
  function apply(l) {
    root.setAttribute("data-lang", l);
    root.setAttribute("lang", l === "zh" ? "zh-Hans" : "en");
    var t = document.querySelector("meta[name='title-" + l + "']");
    if (t) document.title = t.content;
  }
  apply(lang);

  // 苹果设备（Mac、iPhone、iPad）才有  字形
  if (/Mac|iPhone|iPad|iPod/.test(navigator.userAgent || "") || /Mac|iPhone|iPad/.test(navigator.platform || "")) root.classList.add("apple");

  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still) root.classList.add("still");

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var seg = function (p, a, b) { return clamp((p - a) / (b - a), 0, 1); };
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var easeOut = function (t) { return 1 - Math.pow(1 - t, 3); };
  var vw = 0, vh = 0;
  var scenes = [];

  // 场景进度：舞台吸顶期间从 0 走到 1
  function progress(el) {
    var r = el.getBoundingClientRect(), total = el.offsetHeight - vh;
    return total <= 0 ? 1 : clamp(-r.top / total, 0, 1);
  }
  function fade(el, o, dy) {
    el.style.opacity = o;
    el.style.transform = dy ? "translateY(" + dy + "px)" : "none";
    el.style.visibility = o < .002 ? "hidden" : "visible";
  }

  // 第 1 幕：底片随放大显影成正片，铺满全屏后，一道光把黑白胶片冲洗成彩色修图
  function devScene(el) {
    var photo = el.querySelector(".photo"), neg = el.querySelector(".photo .neg"), paper = el.querySelector(".photo .paper"), edit = el.querySelector(".photo .edit"),
        line = el.querySelector(".wipe-line"), head = el.querySelector(".dev-head"), shade = el.querySelector(".shade"),
        negTag = el.querySelector(".neg-tag"), capA = el.querySelector("[data-cap=a]"), capB = el.querySelector("[data-cap=b]"),
        labL = el.querySelector(".dev-label.l"), labR = el.querySelector(".dev-label.r");
    var g = {}, A = parseFloat(el.getAttribute("data-aspect")) || 0.8;   // 照片宽高比（首屏现在是 3:2 横幅）
    function layout() {
      var W, H;
      if (vw / vh > A) { W = vw; H = vw / A; } else { H = vh; W = vh * A; }
      var headBottom = head.offsetTop + head.offsetHeight;
      var room = vh - headBottom - vh * .06;              // 标题下面留给小照片的高度
      var h = clamp(room - vh * .07, vh * .26, vh * .5), w = Math.min(h * A, vw * (A > 1 ? .78 : .64));
      h = w / A;
      g = { W: W, H: H, X: (vw - W) / 2, Y: (vh - H) * .3, w: w, h: h, x: (vw - w) / 2, y: headBottom + vh * .05 };
      photo.style.width = W + "px"; photo.style.height = H + "px";
      negTag.style.top = (g.y + h + 14) + "px";
    }
    function update(p) {
      var e = ease(seg(p, .04, .36));
      var bw = g.w + (g.W - g.w) * e, s = bw / g.W;
      var bx = g.x + (g.X - g.x) * e, by = g.y + (g.Y - g.y) * e;
      photo.style.transform = "translate(" + bx + "px," + by + "px) scale(" + s + ")";
      photo.style.borderRadius = (8 * (1 - e)) / s + "px";
      // 显影：负片褪成白相纸，影像再像在显影液里一样从白纸上浮现（不经过灰糊糊的中间态）
      neg.style.opacity = 1 - seg(p, .07, .17);
      paper.style.opacity = 1 - easeOut(seg(p, .17, .36));
      fade(head, 1 - seg(p, .02, .14), -80 * seg(p, 0, .2));
      fade(negTag, 1 - seg(p, .02, .08), 0);
      shade.style.opacity = seg(p, .3, .4);
      // 冲洗：分界线从右往左走，右边露出修图
      var q = ease(seg(p, .5, .84)), wx = vw * (1 - q);
      var ex = q <= 0 ? 100 : clamp((wx - g.X) / g.W * 100, 0, 100);   // 没开始时整张都是胶片（手机上照片比屏宽）
      edit.style.clipPath = "inset(0 0 0 " + ex + "%)";
      edit.style.webkitClipPath = edit.style.clipPath;
      line.style.left = wx + "px";
      line.style.opacity = (q > 0.001 && q < 0.999) ? 1 : 0;
      fade(capA, seg(p, .36, .42) * (1 - seg(p, .47, .52)), 30 * (1 - easeOut(seg(p, .36, .42))));
      fade(capB, seg(p, .66, .74), 30 * (1 - easeOut(seg(p, .66, .74))));
      labL.style.opacity = seg(p, .38, .44);
      labR.style.opacity = seg(p, .56, .62);
    }
    return { el: el, layout: layout, update: update };
  }

  // 第 2 幕：逐字点亮（中文按字，英文按词）
  function statementScene(el) {
    var groups = [];
    el.querySelectorAll(".lit").forEach(function (p) {
      var txt = p.textContent.trim(), zh = p.getAttribute("lang") === "zh", out = [];
      p.textContent = "";
      (zh ? Array.from(txt) : txt.split(/(\s+)/)).forEach(function (t) {
        if (/^\s+$/.test(t)) { p.appendChild(document.createTextNode(t)); return; }
        var s = document.createElement("span"); s.className = "w"; s.textContent = t;
        p.appendChild(s); out.push(s);
      });
      groups.push(out);
    });
    function update(p) {
      var k = seg(p, .1, .8);
      groups.forEach(function (spans) {
        var lit = Math.round(k * spans.length);
        spans.forEach(function (s, i) { s.classList.toggle("on", i < lit); });
      });
    }
    return { el: el, layout: function () {}, update: update };
  }

  // 第 3 幕：竖着滚，胶片条横着走；下面一条细线跟着走
  function filmScene(el) {
    var track = el.querySelector(".track"), bar = el.querySelector(".scrub i"), dist = 0;
    function layout() {
      track.style.transform = "none";
      var lead = Math.max(20, (vw - Math.min(1120, vw - 48)) / 2);
      track.style.paddingLeft = lead + "px"; track.style.paddingRight = lead + "px";
      dist = Math.max(0, track.scrollWidth - vw);
      el.style.height = (vh + dist * 1.15 + vh * .4) + "px";
    }
    function update(p) {
      if (still) return;   // 减少动态：改成手动横滑
      var k = seg(p, .08, .92);
      track.style.transform = "translateX(" + (-dist * k) + "px)";
      bar.style.width = (k * 100) + "%";
    }
    return { el: el, layout: layout, update: update };
  }

  // 第 4 幕：全屏一张缩回拼图墙
  function mosaicScene(el) {
    var stage = el.querySelector(".stage"), c = el.querySelector(".tile.c"), intro = el.querySelector(".m-intro"),
        head = el.querySelector(".m-head"), others = el.querySelectorAll(".tile:not(.c)"), caps = el.querySelectorAll(".tile figcaption");
    var g = {};
    function layout() {
      c.style.transform = "none";
      var r = c.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      var cx = r.left - sr.left, cy = r.top - sr.top;
      g = { s0: Math.max(vw / r.width, vh / r.height) * 1.002, dx: vw / 2 - (cx + r.width / 2), dy: vh / 2 - (cy + r.height / 2) };
    }
    function update(p) {
      var e = ease(seg(p, .22, .66)), k = 1 - e, s = 1 + (g.s0 - 1) * k;
      c.style.transform = "translate(" + g.dx * k + "px," + g.dy * k + "px) scale(" + s + ")";
      c.style.borderRadius = (14 / s) + "px";
      fade(intro, 1 - seg(p, .1, .2), -30 * seg(p, .1, .2));
      others.forEach(function (t, i) {
        var o = seg(p, .32 + i * .05, .56 + i * .05);
        t.style.opacity = o;
        t.style.transform = "translateY(" + (60 * (1 - easeOut(o))) + "px)";
      });
      fade(head, seg(p, .52, .68), 24 * (1 - easeOut(seg(p, .52, .68))));
      caps.forEach(function (cap) { cap.style.opacity = seg(p, .72, .84); });
    }
    return { el: el, layout: layout, update: update };
  }

  // 界面截图：进入视野时从略小、略后仰浮起到正面
  function riseScene(el) {
    function update() {
      var r = el.getBoundingClientRect();
      var t = easeOut(clamp((vh - r.top) / (vh * .85), 0, 1));
      el.style.transform = "rotateX(" + (14 * (1 - t)) + "deg) scale(" + (.86 + .14 * t) + ") translateY(" + (50 * (1 - t)) + "px)";
      el.style.opacity = .3 + .7 * t;
    }
    return { el: el, layout: function () {}, update: update };
  }

  var ticking = false;
  function tick() {
    ticking = false;
    scenes.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      if (r.bottom < -vh * .5 || r.top > vh * 1.5) return;
      s.update(progress(s.el));
    });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }
  function relayout() {
    vw = window.innerWidth; vh = window.innerHeight;
    scenes.forEach(function (s) { s.layout(); });
    if (still) scenes.forEach(function (s) { s.update(1); });
    else tick();
  }

  document.addEventListener("DOMContentLoaded", function () {
    apply(lang);
    var btn = document.querySelector(".lang");
    if (btn) btn.addEventListener("click", function () {
      lang = lang === "zh" ? "en" : "zh";
      try { localStorage.setItem("ffilm-lang", lang); } catch (e) {}
      apply(lang);
      relayout();
    });

    var d = document.querySelector(".dev"); if (d) scenes.push(devScene(d));
    var st = document.querySelector(".statement"); if (st) scenes.push(statementScene(st));
    var f = document.querySelector(".filmscene"); if (f) scenes.push(filmScene(f));
    var m = document.querySelector(".mosaic"); if (m) scenes.push(mosaicScene(m));
    if (!still) document.querySelectorAll("[data-rise]").forEach(function (el) { scenes.push(riseScene(el)); });

    if (still) { var tr = document.querySelector(".track"); if (tr) tr.style.transform = "none"; }
    relayout();
    if (!still) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", function () { requestAnimationFrame(relayout); });
      window.addEventListener("load", relayout);
    }

    // 亮点：横向卡片，5 秒自动翻下一张；点圆点跳转，按钮暂停/继续；手动滑动后从当前张继续计时
    (function () {
      var track = document.querySelector(".hl-track"); if (!track) return;
      var cards = Array.prototype.slice.call(track.querySelectorAll(".hl-card"));
      var dotsBox = document.querySelector(".hl-ctrl .dots"), playBtn = document.querySelector(".hl-ctrl .play");
      var MS = 5000, idx = 0, playing = !still, timer = null, visible = false;
      root.style.setProperty("--hl-ms", MS + "ms");
      var dots = cards.map(function (c, i) {
        var b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", String(i + 1));
        b.appendChild(document.createElement("i"));
        b.addEventListener("click", function () { go(i, true); });
        dotsBox.appendChild(b); return b;
      });
      function left(i) { return cards[i].offsetLeft - cards[0].offsetLeft; }
      function mark() {
        dots.forEach(function (d, i) { d.classList.toggle("on", i === idx); d.classList.remove("run"); });
        if (playing && visible) { void dots[idx].offsetWidth; dots[idx].classList.add("run"); }
      }
      function schedule() { clearTimeout(timer); if (playing && visible) timer = setTimeout(function () { go((idx + 1) % cards.length); }, MS); }
      function go(i, user) { idx = i; track.scrollTo({ left: left(i), behavior: "smooth" }); mark(); schedule(); }
      var st = null;
      track.addEventListener("scroll", function () {
        clearTimeout(st);
        st = setTimeout(function () {   // 停下后按最近的一张对齐计数
          var x = track.scrollLeft, best = 0, bd = 1e9;
          cards.forEach(function (c, i) { var d = Math.abs(left(i) - x); if (d < bd) { bd = d; best = i; } });
          if (best !== idx) { idx = best; mark(); schedule(); }
        }, 120);
      }, { passive: true });
      playBtn.addEventListener("click", function () {
        playing = !playing; playBtn.classList.toggle("paused", !playing); mark(); schedule();
      });
      if (!playing) playBtn.classList.add("paused");
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) { visible = es[0].isIntersecting; mark(); schedule(); }, { threshold: .4 }).observe(track);
      } else { visible = true; }
      mark(); schedule();
    })();

    // Mac 界面：点下面的分页切换截图
    (function () {
      var tabs = document.querySelectorAll(".tabs button"); if (!tabs.length) return;
      tabs.forEach(function (t) {
        t.addEventListener("click", function () {
          tabs.forEach(function (x) { x.classList.toggle("on", x === t); });
          document.querySelectorAll(".views .view").forEach(function (v) { v.classList.toggle("on", v.getAttribute("data-view") === t.getAttribute("data-for")); });
        });
      });
    })();

    // 修复前后对比：拖动 / 键盘改 --pos；第一次滚到时轻轻扫一下提示可以拖（减少动态效果时不扫，一碰就停）
    document.querySelectorAll(".ba").forEach(function (ba) {
      var range = ba.querySelector(".ba-range"), touched = false, raf = 0;
      function set(v) { ba.style.setProperty("--pos", v + "%"); }
      function stop() { touched = true; cancelAnimationFrame(raf); }
      function fromX(x) { var r = ba.getBoundingClientRect(); var v = Math.min(Math.max((x - r.left) / r.width * 100, 0), 100); set(v); range.value = v; }
      range.addEventListener("input", function () { stop(); set(range.value); });
      range.addEventListener("keydown", stop);
      var drag = null;   // 鼠标按下就跟；手指要横着动了才跟（竖着划交给页面滚动，touch-action: pan-y）
      ba.addEventListener("pointerdown", function (e) {
        stop(); drag = e.pointerId; ba.setPointerCapture(e.pointerId);
        if (e.pointerType === "mouse") fromX(e.clientX);
      });
      ba.addEventListener("pointermove", function (e) { if (drag === e.pointerId) fromX(e.clientX); });
      ["pointerup", "pointercancel"].forEach(function (n) { ba.addEventListener(n, function () { drag = null; }); });
      if (still || !("IntersectionObserver" in window)) return;
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        var keys = [[0, 50], [900, 80], [2100, 22], [3000, 50]], t0 = null;   // 毫秒 → 位置
        function ease(x) { return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
        function step(ts) {
          if (touched) return;
          if (t0 === null) t0 = ts;
          var t = ts - t0, i = 1;
          while (i < keys.length - 1 && t > keys[i][0]) i++;
          var a = keys[i - 1], b = keys[i], k = Math.min(Math.max((t - a[0]) / (b[0] - a[0]), 0), 1);
          var v = a[1] + (b[1] - a[1]) * ease(k);
          set(v); range.value = v;
          if (t < keys[keys.length - 1][0]) raf = requestAnimationFrame(step);
        }
        setTimeout(function () { raf = requestAnimationFrame(step); }, 500);
      }, { threshold: .6 });
      io.observe(ba);
    });

    // 普通分节：滚到再淡入上浮
    var els = document.querySelectorAll(".reveal");
    if (still || !("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -10% 0px" });
    els.forEach(function (el) { io.observe(el); });
  });
})();
