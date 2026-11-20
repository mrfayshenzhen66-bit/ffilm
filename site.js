// ffilm 官网脚本：语言切换 + 滚动叙事（第二版，11-20）
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

  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still) root.classList.add("still");

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var seg = function (p, a, b) { return clamp((p - a) / (b - a), 0, 1); };
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var vw = 0, vh = 0;
  var scenes = [];

  // 场景进度：舞台吸顶期间从 0 走到 1
  function progress(el) {
    var r = el.getBoundingClientRect(), total = el.offsetHeight - vh;
    return total <= 0 ? 1 : clamp(-r.top / total, 0, 1);
  }

  // 第 1 幕：小照片放大成全屏，再从胶片擦成修图
  function devScene(el) {
    var photo = el.querySelector(".photo"), edit = el.querySelector(".photo .edit"), line = el.querySelector(".wipe-line"),
        head = el.querySelector(".dev-head"), shade = el.querySelector(".shade"),
        capA = el.querySelector("[data-cap=a]"), capB = el.querySelector("[data-cap=b]"),
        labL = el.querySelector(".dev-label.l"), labR = el.querySelector(".dev-label.r");
    var g = {}, A = 0.8;   // 照片 4:5
    function layout() {
      var W, H;
      if (vw / vh > A) { W = vw; H = vw / A; } else { H = vh; W = vh * A; }
      var w = Math.min(vw * .62, vh * .46 * A), h = w / A;
      g = { W: W, H: H, X: (vw - W) / 2, Y: (vh - H) * .3, w: w, x: (vw - w) / 2, y: Math.max(vh * .63 - h / 2, vh - h - vh * .04) };
      if (g.y + h > vh * .98) g.y = vh * .98 - h;
      photo.style.width = W + "px"; photo.style.height = H + "px";
    }
    function update(p) {
      var e = ease(seg(p, .02, .34));
      var bw = g.w + (g.W - g.w) * e, s = bw / g.W;
      var bx = g.x + (g.X - g.x) * e, by = g.y + (g.Y - g.y) * e;
      photo.style.transform = "translate(" + bx + "px," + by + "px) scale(" + s + ")";
      photo.style.borderRadius = (12 * (1 - e)) / s + "px";
      head.style.opacity = 1 - seg(p, .03, .17);
      head.style.transform = "translateY(" + (-70 * seg(p, 0, .22)) + "px)";
      shade.style.opacity = seg(p, .26, .36);
      // 擦除：分界线从右往左走，右边露出修图
      var q = ease(seg(p, .46, .84)), wx = vw * (1 - q);
      var ex = q <= 0 ? 100 : clamp((wx - g.X) / g.W * 100, 0, 100);   // 没开始擦时整张都是胶片（手机上照片比屏幕宽，不能按屏幕边算）
      edit.style.clipPath = "inset(0 0 0 " + ex + "%)";
      edit.style.webkitClipPath = edit.style.clipPath;
      line.style.left = wx + "px";
      line.style.opacity = (q > 0.001 && q < 0.999) ? 1 : 0;
      capA.style.opacity = seg(p, .3, .38) * (1 - seg(p, .44, .5));
      capA.style.transform = "translateY(" + (24 * (1 - seg(p, .3, .38))) + "px)";
      capB.style.opacity = seg(p, .62, .72);
      capB.style.transform = "translateY(" + (24 * (1 - seg(p, .62, .72))) + "px)";
      labL.style.opacity = seg(p, .33, .4) * (1 - seg(p, .9, .96) * (q >= .999 ? 1 : 0));
      labR.style.opacity = seg(p, .5, .58);
    }
    return { el: el, layout: layout, update: update };
  }

  // 第 2 幕：逐字点亮。*星号*之间的字点亮成橙色
  function statementScene(el) {
    var groups = [];
    el.querySelectorAll(".lit").forEach(function (p) {
      var txt = p.textContent.trim(), zh = p.getAttribute("lang") === "zh", out = [], hl = false;
      p.textContent = "";
      var tokens = zh ? Array.from(txt) : txt.split(/(\s+)/);
      tokens.forEach(function (t) {
        if (t.indexOf("*") >= 0) {   // 星号切换高亮，本身不显示
          var parts = t.split("*");
          parts.forEach(function (part, i) {
            if (i > 0) hl = !hl;
            if (part) add(part);
          });
        } else add(t);
      });
      function add(t) {
        if (/^\s+$/.test(t)) { p.appendChild(document.createTextNode(t)); return; }
        var s = document.createElement("span"); s.className = "w" + (hl ? " hl" : ""); s.textContent = t;
        p.appendChild(s); out.push(s);
      }
      groups.push({ lang: zh ? "zh" : "en", spans: out });
    });
    function update(p) {
      var k = seg(p, .08, .82);
      groups.forEach(function (gr) {
        var n = gr.spans.length, lit = Math.round(k * n);
        gr.spans.forEach(function (s, i) { s.classList.toggle("on", i < lit); });
      });
    }
    return { el: el, layout: function () {}, update: update };
  }

  // 第 3 幕：竖着滚，胶片条横着走
  function filmScene(el) {
    var track = el.querySelector(".track"), dist = 0;
    function layout() {
      track.style.transform = "none";
      var lead = Math.max(18, (vw - Math.min(1180, vw - 48)) / 2);
      track.style.paddingLeft = lead + "px"; track.style.paddingRight = lead + "px";
      dist = Math.max(0, track.scrollWidth - vw);
      el.style.height = (vh + dist * 1.1 + vh * .35) + "px";
    }
    function update(p) {
      if (still) return;   // 减少动态：不随滚动走，改成手动横滑
      track.style.transform = "translateX(" + (-dist * seg(p, .08, .94)) + "px)";
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
      var e = ease(seg(p, .2, .66)), k = 1 - e;
      c.style.transform = "translate(" + g.dx * k + "px," + g.dy * k + "px) scale(" + (1 + (g.s0 - 1) * k) + ")";
      c.style.borderRadius = (10 / (1 + (g.s0 - 1) * k)) + "px";
      intro.style.opacity = 1 - seg(p, .1, .22);
      others.forEach(function (t, i) {
        var o = seg(p, .3 + i * .05, .54 + i * .05);
        t.style.opacity = o;
        t.style.transform = "translateY(" + (50 * (1 - o)) + "px)";
      });
      head.style.opacity = seg(p, .5, .66);
      caps.forEach(function (cap) { cap.style.opacity = seg(p, .7, .82); });
    }
    return { el: el, layout: layout, update: update };
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

    if (still) {
      // 减少动态：拼图墙、胶片条直接停在最终状态，胶片条可横向滑动
      var tr = document.querySelector(".track"); if (tr) tr.style.transform = "none";
    }
    relayout();
    if (!still) {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", function () { requestAnimationFrame(relayout); });
      window.addEventListener("load", relayout);   // 图片到位后尺寸可能变
    }

    // 普通分节：滚到再淡入
    var els = document.querySelectorAll(".reveal");
    if (still || !("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  });
})();
