// a_flicker_inserts.jsx : single-frame insert grammar from oct27 batch A (refs Video-1532 Moscow night-car
// edit, Video-73338 photographer hook, Video-9363 streetwear brand film). ES3, stock AE. Not yet run in AE.
// Guide: private study notes (not included).
//
// One adjustment layer per insert, held for N frames (hold keys, no eases) - these are CUT effects:
//   "I"  invert frame        : ADBE Invert (73338 hook: every 2nd-3rd shot gets 1-2 f negative; 1532 3.88 s)
//   "U"  ultramarine frame   : Tint black->#05021A white->#3B2BFF + Exposure +0.6 (1532: 1 f deep-blue
//                              ghost of the NEXT shot between cuts, 3.59/3.72/3.88/4.09/4.51 s)
//   "K"  black gap           : solid black 1-2 f between cuts (1532: 3.76, 3.97, 4.05 s; reads as a stutter)
//   "W"  white overexposure  : Exposure +4 1 f then +1.5 1 f (9363 3.12 s, 5.62 s; 87443 2.67 s w/ vignette)
//   "R"  red solid frame     : solid #7A0A1E 1 f (1532 10.78 s, on a snare)
// crtOff(): 1532 4.51-4.68 s: picture squashes to a horizontal line (scale Y 100 -> 2 % in 2 f, a bright
//   1-2 px line holds 1 f, then X 100 -> 0 in 1 f) + Glow; = old TV switch-off. Use as a section ender.
// SFX per insert (house rules: no beeps/chimes):
//   I/U  -> 30-60 ms static tick, premium/glitch_digital/mixkit__short-static-noise-1456.wav -26 dB
//   K    -> nothing (silence gap in the SFX bed sells the stutter)
//   W    -> camera shutter (premium/camera_shutter_flash/mixkit__camera-shutter-hard-click-1430.wav -22) or
//           air hit (premium_oct27/batchA/whip_smear/mixkit__quick-hit-through-air-2142.wav -20)
//   CRT  -> premium/transitions_swells/mixkit__static-whoosh-1454.wav reversed tail + sub
//           (premium/cinematic_impacts_hits/mixkit__knocking-sub-bass-2300.wav -18), line on the sub.
//
// Usage:
//   #include "a_flicker_inserts.jsx"
//   flickerInserts(comp, [[t, "I", 1], [t2, "U", 1], [t3, "K", 2]]);
//   crtOff(comp, t);

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _fiHex(h) { return [parseInt(h.substr(1, 2), 16) / 255, parseInt(h.substr(3, 2), 16) / 255, parseInt(h.substr(5, 2), 16) / 255]; }

function _fiLayer(comp, name, a, b, adjust, col) {
    var l = comp.layers.addSolid(col || [1, 1, 1], name, comp.width, comp.height, comp.pixelAspect, comp.duration);
    if (adjust) { l.adjustmentLayer = true; l.label = LBL.ADJ; } else { l.label = LBL.LIGHT; }
    l.inPoint = a; l.outPoint = b;       // inPoint first (AE 26.5)
    return l;
}

function flickerInserts(comp, list) {
    var fd = comp.frameDuration, out = [];
    for (var n = 0; n < list.length; n++) {
        var t = list[n][0], kind = list[n][1], fr = list[n][2] || 1;
        var a = t, b = t + fr * fd, l = null, fxp;
        try {
            if (kind === "I") {
                l = _fiLayer(comp, "ADJ_INV_" + n, a, b, true);
                l.property("ADBE Effect Parade").addProperty("ADBE Invert");
            } else if (kind === "U") {
                l = _fiLayer(comp, "ADJ_BLUE_" + n, a, b, true);
                fxp = l.property("ADBE Effect Parade");
                fxp.addProperty("ADBE Tint"); fxp.addProperty("ADBE Exposure2");
                fxp.property(1).property(1).setValue(_fiHex("#05021A"));
                fxp.property(1).property(2).setValue(_fiHex("#3B2BFF"));
                fxp.property(2).property(3).setValue(0.6);
            } else if (kind === "K") {
                l = _fiLayer(comp, "SHP_BLACK_" + n, a, b, false, [0, 0, 0]);
            } else if (kind === "W") {
                l = _fiLayer(comp, "ADJ_WHITE_" + n, a, b, true);
                fxp = l.property("ADBE Effect Parade");
                fxp.addProperty("ADBE Exposure2");
                var e = fxp.property(1).property(3);
                e.setValueAtTime(a, 4); e.setValueAtTime(a + fd, 1.5);
                for (var q = 1; q <= e.numKeys; q++) e.setInterpolationTypeAtKey(q, KeyframeInterpolationType.HOLD);
            } else if (kind === "R") {
                l = _fiLayer(comp, "SHP_RED_" + n, a, b, false, _fiHex("#7A0A1E"));
            }
        } catch (err) { $.writeln("flickerInserts " + kind + ": " + String(err.message) + " L" + err.line); }
        if (l) out.push(l);
    }
    return out;
}

function crtOff(comp, t) {
    var fd = comp.frameDuration;
    var l = _fiLayer(comp, "ADJ_CRT_OFF", t, t + 6 * fd, true);
    var fxp = l.property("ADBE Effect Parade");
    fxp.addProperty("ADBE Geometry2"); (function (P) { try { return P.addProperty("ADBE Glo2"); } catch (e) {} var g = P.addProperty("S_Glow"); g = P.property(P.numProperties); for (var j = 1; j <= g.numProperties; j++) { var p = g.property(j); try { if (p.name == "Brightness") p.setValue(0.6); else if (p.name == "Threshold") p.setValue(0.6); else if (p.name == "Glow Width") p.setValue(40); else if (p.name == "Expand Borders") p.setValue(1); } catch (e2) {} } return g; })(fxp);   // Glo2 missing in AE 26 -> restrained S_Glow (2026-11-09)
    var tr = fxp.property(1);
    tr.property(3).setValue(false);                    // Uniform Scale off
    // by index (Transform effect: 1 anchor, 2 position, 3 uniform, 4 scale height, 5 scale width) - probe names once
    var sh = tr.property(4);                           // Scale Height
    var sw = tr.property(5);                           // Scale Width
    sh.setValueAtTime(t, 100); sh.setValueAtTime(t + 2 * fd, 2);
    sw.setValueAtTime(t + 3 * fd, 100); sw.setValueAtTime(t + 4 * fd, 0);
    var g = fxp.property(2);
    try { g.property("Glow Intensity").setValue(2); g.property("Glow Radius").setValue(30 * comp.width / 1080); } catch (e) {}
    // the area outside the squashed picture is empty = comp background; keep comp bg black.
    return l;
}
