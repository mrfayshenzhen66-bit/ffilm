# 重新生成网页标题字体子集：网页文字有改动（尤其新加了汉字）后运行  python3 fonts/make-font.py
# 来源：本机 ~/Library/Fonts/NotoSerifSC.ttf（思源宋体，SIL OFL 1.1），固定 600 字重，家族名改为 ffilm Serif。
import re, html, pathlib
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset
here = pathlib.Path(__file__).resolve().parent.parent
chars = set()
for f in ["index.html", "privacy.html", "support.html"]:
    t = (here / f).read_text(encoding="utf-8")
    t = re.sub(r"<script.*?</script>|<style.*?</style>", "", t, flags=re.S)
    chars |= set(html.unescape(re.sub(r"<[^>]+>", " ", t)))
chars |= set(chr(c) for c in range(0x20, 0x7f)) | set("，。、；：？！“”‘’（）《》——…·「」【】0123456789")
src = TTFont(str(pathlib.Path.home() / "Library/Fonts/NotoSerifSC.ttf"))
inst = instancer.instantiateVariableFont(src, {"wght": 600}, updateFontNames=False)
for rec in inst["name"].names:
    if rec.nameID in (1, 4, 16, 21): rec.string = "ffilm Serif"
    if rec.nameID in (2, 17, 22): rec.string = "SemiBold"
    if rec.nameID == 6: rec.string = "ffilmSerif-SemiBold"
opts = subset.Options(); opts.flavor = "woff2"; opts.layout_features = ["*"]; opts.name_IDs = ["*"]; opts.name_languages = ["*"]; opts.notdef_outline = True
sub = subset.Subsetter(opts); sub.populate(text="".join(chars)); sub.subset(inst)
inst.flavor = "woff2"; inst.save(str(here / "fonts/ffilm-serif-600.woff2"))
print(len(chars), "字 →", (here / "fonts/ffilm-serif-600.woff2").stat().st_size // 1024, "KB")
