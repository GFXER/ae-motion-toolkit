// c_prism_smear.jsx : "Prism Lens" smear transition (ref Video-10819 = Premiere "Prism Lens v2" pack,
// oct27 batch C) rebuilt for AE with Sapphire S_PrismLens + stock Echo/Directional Blur.
// Guide: private study notes (not included) §10819.
//
// What it looks like (25 fps demo): the subject is smeared sideways into a long soft "prism" trail
// (time echo + directional stretch, highlights bloom) for 3-5 f, then a SNAP cut to B which lands sharp.
// Variants in the demo: (a) smear-out -> sharp B (0.2-0.6 s), (b) 1 f negative/invert flashes inside a
// shot (1.1 s, 1.3 s), (c) smear + white blow-out + 1 f blue-tinted invert, then B (1.8-2.3 s, 4.0-4.3 s).
// Plugin controls shown: Intensity, Distortion Softness, Distortion Spread, Distortion Direction(s),
// "Flash Off" toggle, Chromatic Aberration -> we map: S_PrismLens amount, Echo count/decay, Directional
// Blur length/angle, Exposure flash, S_Invert/Invert 1 f.
//
// Usage:
//   #include "c_prism_smear.jsx"
//   cPrismSmear(comp, tCut, {inFrames: 8, outFrames: 4, angle: 90, flash: true, invertFrame: true});
//   Adds ADJ_prism_smear spanning [tCut - inFrames, tCut + outFrames] over both clips (A above, B below cut).
//   Defaults for 60 fps: 8 f smear build on A (accelerating), cut, 4 f fast settle on B. (Breaks our 1:2
//   rule on purpose -- this look is a snap. For house-smooth use outFrames = 2*inFrames.)
// SFX (ref): the pack demo drops the music to near-silence (-30..-55 dB, airy ~5 kHz tail) for 0.2-0.5 s
// before each smear, then the next shot lands on a low hit (-14 dB, <150 Hz). i.e. "music dropout + sub hit".
// Library: premium_oct27/batchC/whoosh_impact/mixkit__cinematic-wind-swoosh-1471.wav (-26 dB, peak on cut)
// + premium/sub_drops_booms soft boom -18 dB on B; invert frames get nothing or a -30 dB air tick.
// Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _psO(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _psP(fx, names) {
    for (var i = 0; i < names.length; i++) { try { var p = fx.property(names[i]); if (p) return p; } catch (e) {} }
    $.writeln("cPrismSmear: none of params found: " + names.join("/")); return null;
}
function _psEase(p, outInf, inInf) {
    for (var k = 1; k <= p.numKeys; k++) {
        var d = p.value instanceof Array ? p.value.length : 1;
        var eo = [], ei = [];
        for (var j = 0; j < (p.propertyValueType === PropertyValueType.TwoD_SPATIAL || p.propertyValueType === PropertyValueType.ThreeD_SPATIAL ? 1 : d); j++) {
            eo.push(new KeyframeEase(0, outInf)); ei.push(new KeyframeEase(0, inInf));
        }
        try { p.setTemporalEaseAtKey(k, ei, eo); } catch (e) {}
    }
}

function cPrismSmear(comp, tCut, opts) {
    var fd = comp.frameDuration;
    var nIn = _psO(opts, "inFrames", 8), nOut = _psO(opts, "outFrames", 4);
    var t0 = tCut - nIn * fd, t1 = tCut + nOut * fd;
    var ang = _psO(opts, "angle", 90);                     // 90 = horizontal smear
    var lenMax = _psO(opts, "length", 0.09 * comp.width);  // directional blur px

    var adj = comp.layers.addSolid([1, 1, 1], "ADJ_prism_smear", comp.width, comp.height, 1, t1 - t0);
    adj.adjustmentLayer = true; adj.label = LBL.ADJ; adj.startTime = t0; adj.moveToBeginning();
    var fxp = adj.property("ADBE Effect Parade");
    var list = ["ADBE Echo", "S_PrismLens", "ADBE Motion Blur", "ADBE Exposure2"];
    var got = [];
    for (var i = 0; i < list.length; i++) { try { fxp.addProperty(list[i]); got.push(list[i]); } catch (e) { $.writeln("cPrismSmear: no " + list[i]); } }
    function F(n) { for (var q = 0; q < got.length; q++) if (got[q] === n) return fxp.property(q + 1); return null; }

    var echo = F("ADBE Echo");
    if (echo) {
        var et = _psP(echo, ["Echo Time (seconds)"]); if (et) et.setValue(-fd);
        var en = _psP(echo, ["Number Of Echoes"]); if (en) { en.setValueAtTime(t0, 0); en.setValueAtTime(tCut, 8); en.setValueAtTime(t1, 0); }
        var ed = _psP(echo, ["Decay"]); if (ed) ed.setValue(0.78);
        var eo = _psP(echo, ["Echo Operator"]); if (eo) eo.setValue(5);   // 5 = Maximum (brightest trail)
    }
    var pl = F("S_PrismLens");
    if (pl) {
        var pa = _psP(pl, ["Amount", "Prism Amount", "Spread"]);
        if (pa) { var v0 = pa.value; pa.setValueAtTime(t0, 0); pa.setValueAtTime(tCut, (typeof v0 === "number" && v0 > 0) ? v0 * 3 : 1); pa.setValueAtTime(t1, 0); _psEase(pa, 15, 85); }
    }
    var mb = F("ADBE Motion Blur");
    if (mb) {
        var dir = _psP(mb, ["Direction"]); if (dir) dir.setValue(ang);
        var bl = _psP(mb, ["Blur Length"]);
        if (bl) { bl.setValueAtTime(t0, 0); bl.setValueAtTime(tCut, lenMax); bl.setValueAtTime(t1, 0); _psEase(bl, 10, 90); }
    }
    var ex = F("ADBE Exposure2");
    if (ex && _psO(opts, "flash", true)) {
        var e3 = ex.property(3);
        e3.setValueAtTime(t0, 0); e3.setValueAtTime(tCut - fd, 1.2); e3.setValueAtTime(tCut + 2 * fd, 0);
        _psEase(e3, 20, 80);
    }
    if (_psO(opts, "invertFrame", true)) {                 // 1 f blue-tinted negative right before the cut
        var inv = comp.layers.addSolid([1, 1, 1], "ADJ_prism_invert", comp.width, comp.height, 1, fd);
        inv.adjustmentLayer = true; inv.label = LBL.ADJ; inv.startTime = tCut - fd; inv.moveToBeginning();
        var ip = inv.property("ADBE Effect Parade");
        ip.addProperty("ADBE Invert"); ip.addProperty("ADBE Tint");
        var tint = ip.property(2);
        var mw = _psP(tint, ["Map White To"]); if (mw) mw.setValue([0.62, 0.82, 1.0]);
        var mbk = _psP(tint, ["Map Black To"]); if (mbk) mbk.setValue([0.02, 0.10, 0.35]);
    }
    return adj;
}
