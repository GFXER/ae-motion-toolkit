// b_card_hook.jsx : the "effect-tutorial reel" hook used by 8 of 10 batch-B refs (asadov.fx style),
// plus the white blur-dip exit. Guide: private study notes (not included) ("house hook").
//
// Measured (30 fps):
//   - BG: blurred paper/concrete texture (or neon warped grid), slow drift.
//   - 1 or 2 video cards (BEFORE top / AFTER bottom), 3D layers, Y/X rot wobble +-6..10 deg, slow sine (period ~3 s),
//     thin white stroke (3-4 px), soft shadow.
//   - Opener: card starts at scale ~300 % with lens bulge (Optics Compensation 60 -> 0) and lands in 0.75 s expo-out.
//   - App icon (Ae/Pr cube PNG) flies in from the left with Y-spin 180 -> 0 in 6 f, holds ~0.6 s, flies out right 6 f.
//   - Exit: 2-3 f to WHITE with Camera Lens Blur 0 -> 40, cut, the next shot (screen recording) settles from blur
//     in 4 f, its own card tilted ~8 deg and drifting (never flat).
//   - Hook music: beat drops out 0.25-0.45 s right before the white dip (silence pocket), restarts on the cut.
//
// Usage: #include "b_card_hook.jsx"
//   cardWobble(cardLayer, {amp:8, period:3});
//   bulgeLand(comp, cardLayer, 0, 0.75);
//   whiteBlurDip(comp, tCut, {outF:3, inF:4});
// Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }
function _cho(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _chEase(p, outInf, inInf) { for (var k = 1; k <= p.numKeys; k++) p.setTemporalEaseAtKey(k, [new KeyframeEase(0, inInf)], [new KeyframeEase(0, outInf)]); }

function cardWobble(card, opts) {
    var a = _cho(opts, "amp", 8), per = _cho(opts, "period", 3);
    card.threeDLayer = true;
    var tr = card.property("ADBE Transform Group");
    tr.property("ADBE Rotate Y").expression = a + "*Math.sin(time*2*Math.PI/" + per + ")";
    tr.property("ADBE Rotate X").expression = (a * 0.6) + "*Math.cos(time*2*Math.PI/" + (per * 1.3) + ")";
    tr.property("ADBE Rotate Z").expression = "-3 + 1.5*Math.sin(time*2*Math.PI/" + (per * 1.7) + ")";
    var st = card.property("ADBE Layer Styles");
    try { st.addProperty("strokeEffect/enabled"); } catch (e) {}   // white 3 px stroke via Layer Styles (probe in AE)
    var ds = card.property("ADBE Effect Parade").addProperty("ADBE Drop Shadow");
    ds = card.property("ADBE Effect Parade").property(card.property("ADBE Effect Parade").numProperties);
    try { ds.property("Opacity").setValue(60); ds.property("Distance").setValue(30); ds.property("Softness").setValue(80); } catch (e) {}
    return card;
}

// big -> 100 % with lens bulge relaxing (expo-out: out 0 / in 90)
function bulgeLand(comp, card, t0, dur) {
    var sc = card.property("ADBE Transform Group").property("ADBE Scale");
    var b = sc.value;
    sc.setValueAtTime(t0, [b[0] * 3, b[1] * 3, b.length > 2 ? b[2] * 3 : 100]);
    sc.setValueAtTime(t0 + dur, b);
    _chEase(sc, 10, 92);
    var fxp = card.property("ADBE Effect Parade");
    fxp.addProperty("ADBE Optics Compensation");
    var oc = fxp.property(fxp.numProperties);
    var fov = oc.property(1);                                       // Field Of View
    fov.setValueAtTime(t0, 60); fov.setValueAtTime(t0 + dur, 0); _chEase(fov, 10, 92);
    try { oc.property(2).setValue(1); } catch (e) {}                 // Reverse Lens Distortion = bulge
}

// white blur dip through a cut: outF frames up to white+blur, inF frames settling (keep 1:2-ish)
function whiteBlurDip(comp, tCut, opts) {
    var fd = comp.frameDuration, o = _cho(opts, "outF", 3) * fd, i = _cho(opts, "inF", 4) * fd;
    var adj = comp.layers.addSolid([1, 1, 1], "ADJ_WHITE_DIP", comp.width, comp.height, 1, o + i);
    adj.adjustmentLayer = true; adj.startTime = tCut - o; adj.label = LBL.ADJ;
    var fxp = adj.property("ADBE Effect Parade");
    fxp.addProperty("ADBE Camera Lens Blur"); fxp.addProperty("ADBE Exposure2");
    var lb = fxp.property(1).property(1), ex = fxp.property(2).property(3);   // Blur Radius ; Exposure (probe)
    lb.setValueAtTime(tCut - o, 0); lb.setValueAtTime(tCut, 40); lb.setValueAtTime(tCut + i, 0);
    ex.setValueAtTime(tCut - o, 0); ex.setValueAtTime(tCut, 3.5); ex.setValueAtTime(tCut + i, 0);
    _chEase(lb, 85, 85); _chEase(ex, 85, 85);
    return adj;
}
