// b_burn_transition.jsx : "burn transition" (ref Video-22812, Premiere tutorial rebuilt for AE).
// Guide: private study notes (not included) (22812)
//
// Ref recipe: fire/burn overlay clip (black bg) on top of the cut, start ~0.25 s before it.
//   1) B gets the overlay as a LUMA track matte -> B is revealed where the fire is bright (fire "eats" A).
//   2) a 2nd copy of the overlay sits on top in Screen (or Color Dodge) so the flame edge glows.
//   Burn lasts ~1.1 s (ref 0.75 -> 1.875 s @30), fire tinted purple/orange to match the grade.
// Two modes:
//   overlay  : pass a fire/burn FootageItem (Envato packs in <asset-library>) -> exact ref method
//   procedural (no overlay): Fractal Noise matte with an animated Levels sweep = spreading burn, plus a hot-edge
//            band (narrow Levels + Colorama/Tint + Glow, Add). Sapphire S_FilmBurnTransition is a 1-effect alt.
//
// Usage:
//   #include "b_burn_transition.jsx"
//   burnTransition(comp, layerA, layerB, tCut, {overlay: fireItem, lead: 0.25, dur: 1.1, tint: [0.75,0.2,1]});
//   burnTransition(comp, layerA, layerB, tCut, {dur: 1.0});            // procedural
// Ease 1:2 (fast start, long settle) on the sweep. Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _bto(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _btSet(fx, name, v) { try { var p = fx.property(name); if (p) p.setValue(v); else $.writeln("burn: no param " + name); } catch (e) { $.writeln("burn " + name + ": " + String(e.message) + " L" + e.line); } }
function _btMatte(layer, matte, luma) {
    try { layer.setTrackMatte(matte, luma ? TrackMatteType.LUMA : TrackMatteType.ALPHA); return; } catch (e) {}
    matte.moveBefore(layer); layer.trackMatteType = luma ? TrackMatteType.LUMA : TrackMatteType.ALPHA;   // pre-2023
}
function _btEase(p, outInf, inInf) { for (var k = 1; k <= p.numKeys; k++) p.setTemporalEaseAtKey(k, [new KeyframeEase(0, inInf)], [new KeyframeEase(0, outInf)]); }

function burnTransition(comp, A, B, tCut, opts) {
    var lead = _bto(opts, "lead", 0.25), dur = _bto(opts, "dur", 1.1);
    var t0 = tCut - lead, t1 = t0 + dur;
    var tint = _bto(opts, "tint", [0.75, 0.2, 1]);
    if (B.index > A.index) B.moveBefore(A);          // B above A, revealed through the matte
    if (B.inPoint > t0) B.inPoint = t0;
    var ov = _bto(opts, "overlay", null), matte, glow;

    if (ov) {
        matte = comp.layers.add(ov); matte.startTime = t0; matte.name = "MATTE_BURN"; matte.label = LBL.MATTE;
        matte.moveBefore(B);
        _btMatte(B, matte, true);
        glow = comp.layers.add(ov); glow.startTime = t0; glow.name = "FX_BURN_EDGE"; glow.label = LBL.LIGHT;
        glow.moveBefore(B); glow.blendingMode = BlendingMode.SCREEN;
        var tn = glow.property("ADBE Effect Parade").addProperty("ADBE Tint");
        _btSet(tn, "Map White To", tint); _btSet(tn, "Amount to Tint", 45);
        glow.outPoint = Math.min(glow.outPoint, t1 + 0.2);
        return {matte: matte, glow: glow};
    }

    // procedural: noise solid -> Levels sweep (black->white spreading blobs)
    matte = comp.layers.addSolid([0, 0, 0], "MATTE_BURN", comp.width, comp.height, 1, dur + 0.3);
    matte.startTime = t0; matte.label = LBL.MATTE; matte.moveBefore(B);
    var fxp = matte.property("ADBE Effect Parade");
    fxp.addProperty("ADBE Fractal Noise"); fxp.addProperty("ADBE Easy Levels2");
    var fn = fxp.property(1), lv = fxp.property(2);
    _btSet(fn, "Contrast", 160); _btSet(fn, "Complexity", 5);
    try { fn.property("Transform").property("Scale").setValue(260); } catch (e) {}
    try { fn.property("Evolution").expression = "time*240"; } catch (e) {}
    var ib = lv.property("Input Black"), iw = lv.property("Input White");
    ib.setValueAtTime(t0, 1.0); ib.setValueAtTime(t1, 0.0);
    iw.setValueAtTime(t0, 1.0); iw.setValueAtTime(t1, 0.06);
    _btEase(ib, 85, 33); _btEase(iw, 85, 33);         // ~1:2 feel: quick bite, long settle
    _btMatte(B, matte, true);

    // hot edge: duplicate matte -> narrow band -> tint -> glow, Add
    glow = matte.duplicate(); glow.name = "FX_BURN_EDGE"; glow.label = LBL.LIGHT;
    glow.moveBefore(B); glow.blendingMode = BlendingMode.ADD; glow.enabled = true;
    var gp = glow.property("ADBE Effect Parade");
    gp.addProperty("ADBE Easy Levels2"); gp.addProperty("ADBE Tint"); (function (P) { try { return P.addProperty("ADBE Glo2"); } catch (e) {} var g = P.addProperty("S_Glow"); g = P.property(P.numProperties); for (var j = 1; j <= g.numProperties; j++) { var p = g.property(j); try { if (p.name == "Brightness") p.setValue(0.6); else if (p.name == "Threshold") p.setValue(0.6); else if (p.name == "Glow Width") p.setValue(40); else if (p.name == "Expand Borders") p.setValue(1); } catch (e2) {} } return g; })(gp);   // Glo2 missing in AE 26 -> restrained S_Glow (2026-11-09)
    var band = gp.property(3), t2 = gp.property(4), g2 = gp.property(5);
    _btSet(band, "Gamma", 0.35);                      // keeps only the transition band bright
    _btSet(t2, "Map Black To", [0, 0, 0]); _btSet(t2, "Map White To", tint);
    _btSet(g2, "Glow Threshold", 30); _btSet(g2, "Glow Radius", 60); _btSet(g2, "Glow Intensity", 1.6);
    var op = glow.property("ADBE Transform Group").property("ADBE Opacity");
    op.setValueAtTime(t0, 0); op.setValueAtTime(t0 + dur * 0.25, 100); op.setValueAtTime(t1, 0);
    return {matte: matte, glow: glow};
}
