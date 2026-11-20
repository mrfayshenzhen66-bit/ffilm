// 语言：记住上次选择；没选过就按浏览器语言（中文 → 中文，其余 → 英文）
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
  document.addEventListener("DOMContentLoaded", function () {
    apply(lang);
    var btn = document.querySelector(".lang");
    if (btn) btn.addEventListener("click", function () {
      lang = lang === "zh" ? "en" : "zh";
      try { localStorage.setItem("ffilm-lang", lang); } catch (e) {}
      apply(lang);
    });

    // 对比图：按住拖动，或用方向键
    document.querySelectorAll(".compare").forEach(function (box) {
      var dragging = false;
      function set(p) { p = Math.max(0, Math.min(100, p)); box.style.setProperty("--pos", p + "%"); box.setAttribute("aria-valuenow", Math.round(p)); }
      function at(x) { var r = box.getBoundingClientRect(); set((x - r.left) / r.width * 100); }
      box.addEventListener("pointerdown", function (e) { dragging = true; box.setPointerCapture(e.pointerId); at(e.clientX); });
      box.addEventListener("pointermove", function (e) { if (dragging) at(e.clientX); });
      box.addEventListener("pointerup", function () { dragging = false; });
      box.addEventListener("pointercancel", function () { dragging = false; });
      box.addEventListener("keydown", function (e) {
        var v = parseFloat(box.getAttribute("aria-valuenow") || "50");
        if (e.key === "ArrowLeft") { set(v - 5); e.preventDefault(); }
        if (e.key === "ArrowRight") { set(v + 5); e.preventDefault(); }
      });
    });

    // 滚到再淡入
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  });
})();
