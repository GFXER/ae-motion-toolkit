// magazine_letters.jsx : NaughtyyJuan "Magazine Letter Text" (ransom-note word, per-letter jitter, posterize time). ES3.
// Guide: private study notes (not included)
//
// Letters: PNG cut-outs from opts.letterDir (either <dir>/A/*.png variations or <dir>/A*.png), else fallback ransom letters
// (text layer in a random font on a paper-coloured rect, like a ransom-note title). Each letter: S_Shake
// (Amplitude 0.090, Frequency 17, Tilt Rand Amp 17, own Seed) or seeded wiggle fallback, + soft Drop Shadow.
// Then all letters are precomposed and Posterize Time (tutorial 15 or 7 fps in a 30 fps comp; use 12/8 at 50-60 fps).
//
// Usage:
//   #include "magazine_letters.jsx"
//   var L = magazineWord(comp, "TUTORIAL", {letterDir: "/abs/letters", height: 300, fps: 12, center: [1080, 900], t0: 0, dur: 3});
// Returns the precomp layer. Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _mlo(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _mlLog(m) { try { $.writeln("[magazine_letters] " + m); } catch (e) {} }
function _mlRnd(seed) { var s = seed || 1; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

var ML_FONTS = ["Poppins-ExtraBold", "TimesNewRomanPS-BoldMT", "Georgia-Bold", "Impact", "Didot-Bold", "Futura-Bold", "Courier-Bold", "AmericanTypewriter-Bold"];
var ML_PAPER = [[0.96,0.94,0.88],[0.08,0.08,0.08],[0.85,0.12,0.15],[0.98,0.85,0.2],[0.2,0.35,0.75],[1,1,1]];

function _mlFindPng(dir, ch, rnd) {
    if (!dir) return null;
    var files = [], f = new Folder(dir + "/" + ch), k;
    if (f.exists) files = f.getFiles("*.png");
    if (!files.length) files = new Folder(dir).getFiles(ch + "*.png");
    if (!files.length) return null;
    return files[Math.floor(rnd() * files.length) % files.length];
}

function _mlFallbackLetter(comp, ch, h, rnd) {
    // letter precomp sized to the paper scrap, so L.source.width/height are the scrap size
    var paper = ML_PAPER[Math.floor(rnd() * ML_PAPER.length) % ML_PAPER.length];
    var ink = (paper[0] + paper[1] + paper[2] > 1.6) ? [0.05, 0.05, 0.05] : [1, 1, 1];
    var W = Math.round(h * 0.95), H = Math.round(h * 1.15);
    var pc = app.project.items.addComp("PC_LETTER_" + ch, W, H, 1, comp.duration, comp.frameRate);
    var bg = pc.layers.addSolid(paper, "SHP_PAPER_" + ch, W, H, 1, comp.duration);
    bg.label = LBL.SHAPE;
    var tl = pc.layers.addText(ch);
    var td = tl.property("ADBE Text Properties").property("ADBE Text Document"), doc = td.value;
    doc.fontSize = h * (0.75 + rnd() * 0.25); doc.fillColor = ink;
    doc.justification = ParagraphJustification.CENTER_JUSTIFY;
    try { doc.font = ML_FONTS[Math.floor(rnd() * ML_FONTS.length) % ML_FONTS.length]; } catch (e) {}
    td.setValue(doc);
    var r = tl.sourceRectAtTime(0, false);
    tl.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([r.left + r.width / 2, r.top + r.height / 2]);
    tl.property("ADBE Transform Group").property("ADBE Position").setValue([W / 2, H / 2]);
    tl.label = LBL.TEXT;
    return comp.layers.add(pc);
}

function _mlJitter(L, seed, opts) {
    var fx = L.property("ADBE Effect Parade");
    var ok = false;
    try { fx.addProperty("S_Shake"); ok = true; } catch (e) {}
    if (ok) {
        var s = L.property("ADBE Effect Parade").property(L.property("ADBE Effect Parade").numProperties);
        var setP = function (name, v) { try { s.property(name).setValue(v); } catch (e1) { _mlLog("S_Shake " + name + ": " + String(e1.message)); } };
        setP("Amplitude", _mlo(opts, "amp", 0.09));
        setP("Frequency", _mlo(opts, "freq", 17));
        setP("Seed", seed);
        try { s.property("Tilt Shake").property("Tilt Rand Amp").setValue(_mlo(opts, "tilt", 17)); } catch (e2) { setP("Tilt Rand Amp", _mlo(opts, "tilt", 17)); }
        return;
    }
    var tr = L.property("ADBE Transform Group");
    tr.property("ADBE Position").expression = "seedRandom(" + seed + ",true); wiggle(" + _mlo(opts, "freq", 17) + "," + _mlo(opts, "wigglePx", 4) + ")";
    tr.property("ADBE Rotate Z").expression = "seedRandom(" + (seed + 100) + ",true); wiggle(" + _mlo(opts, "freq", 17) + "," + _mlo(opts, "wiggleDeg", 3) + ")";
}

function _mlShadow(L, opts) {
    L.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
    var ds = L.property("ADBE Effect Parade").property(L.property("ADBE Effect Parade").numProperties);
    ds.property(2).setValue(_mlo(opts, "shadowOpacity", 45) * 2.55);   // opacity (0-255 internally)
    ds.property(3).setValue(_mlo(opts, "shadowDir", 135));
    ds.property(4).setValue(_mlo(opts, "shadowDist", 12));
    ds.property(5).setValue(_mlo(opts, "shadowSoft", 20));
}

function magazineWord(comp, word, opts) {
    var rnd = _mlRnd(_mlo(opts, "seed", 7)), h = _mlo(opts, "height", 300);
    var c = _mlo(opts, "center", [comp.width / 2, comp.height / 2]);
    var layers = [], widths = [], k, total = 0;
    for (k = 0; k < word.length; k++) {
        var ch = word.charAt(k);
        if (ch === " ") { layers.push(null); widths.push(h * 0.45); total += h * 0.45; continue; }
        var L = null, png = _mlFindPng(_mlo(opts, "letterDir", null), ch, rnd);
        if (png) {
            var it = app.project.importFile(new ImportOptions(png));
            L = comp.layers.add(it);
            L.label = LBL.STILL;
        } else {
            L = _mlFallbackLetter(comp, ch, h, rnd);
            L.label = LBL.PRECOMP;
        }
        var sc = 100 * h / L.source.height * (0.85 + rnd() * 0.3);
        L.property("ADBE Transform Group").property("ADBE Scale").setValue([sc, sc]);
        L.name = "IMG_LET_" + (k + 1) + "_" + ch;
        var w = L.source.width * sc / 100 * _mlo(opts, "overlap", 0.86);
        layers.push(L); widths.push(w); total += w;
    }
    var x = c[0] - total / 2, idxs = [];
    for (k = 0; k < layers.length; k++) {
        var LL = layers[k];
        if (LL) {
            var tr = LL.property("ADBE Transform Group");
            tr.property("ADBE Position").setValue([x + widths[k] / 2, c[1] + (rnd() - 0.5) * h * 0.18]);
            tr.property("ADBE Rotate Z").setValue((rnd() - 0.5) * 2 * _mlo(opts, "maxRot", 9));
            _mlJitter(LL, k + 1, opts);          // own seed per letter
            _mlShadow(LL, opts);
            idxs.push(LL.index);
        }
        x += widths[k];
    }
    var pc = comp.layers.precompose(idxs, "PC_MAG_" + word.replace(/[^A-Za-z0-9]/g, ""), true), top = null;
    for (k = 1; k <= comp.numLayers; k++) if (comp.layer(k).source === pc) { top = comp.layer(k); break; }
    if (!top) return null;
    top.property("ADBE Effect Parade").addProperty("ADBE Posterize Time");
    top.property("ADBE Effect Parade").property(1).property(1).setValue(_mlo(opts, "fps", 12));
    top.label = LBL.PRECOMP; top.name = "PC_MAG_" + word;
    if (opts && opts.t0 !== undefined) { top.startTime = 0; top.inPoint = opts.t0; top.outPoint = opts.t0 + _mlo(opts, "dur", 3); }
    return top;
}
