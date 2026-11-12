// mask_3d_transition.jsx : GTR Auto "No-Plugin 3D Mask Transition" as an ES3 helper.
// Guide: private study notes (not included)
//
// A rides up and grows (CTRL null: y -0.257*H, scale 100->125); B rises from below (CTRL null: y +0.715*H -> 0,
// scale 120->100). A roto'd copy of B (subject only) sits above B and moves with it, so the subject breaks
// over A. Speed graph = sharp spike (high influence both ends). Tutorial: 50 f @59.94, keys f30 -> f80.
//
// Usage:
//   #include "mask_3d_transition.jsx"
//   var r = mask3dTransition(comp, clipA, clipB, clipBroto, tStart, 50, {peakFrac: 1/3});
//   opts: peakFrac (0.5 = symmetric spike as tutorial; 1/3 = our 1:2 rule), aRise (0.257), aScale (125),
//         bDrop (0.715), bScale (120), infOut/infIn (85/95), ramp {A:[[t,srcSec],..], B:[[t,srcSec],..]} optional.
//   clipBroto = duplicate of B with a track matte (MATTE_ from tools/matte_subject) or null.
// Returns {nullA, nullB}. Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _m3o(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }

function _m3ease(prop, k, inInf, outInf) {
    var vt = prop.propertyValueType, n = 1;
    if (vt !== PropertyValueType.TwoD_SPATIAL && vt !== PropertyValueType.ThreeD_SPATIAL && vt !== PropertyValueType.OneD) {
        n = prop.keyValue(k).length;
    }
    for (var tries = 0; tries < 2; tries++) {          // 2D-layer Scale may want 2 or 3 eases
        var a = [], b = [];
        for (var q = 0; q < n; q++) { a.push(new KeyframeEase(0, inInf)); b.push(new KeyframeEase(0, outInf)); }
        try { prop.setTemporalEaseAtKey(k, a, b); return; }
        catch (e) { if (n <= 1) { $.writeln("m3d ease: " + String(e.message) + " L" + e.line); return; } n = (n === 3) ? 2 : 3; }
    }
}

// two keys with an asymmetric "spike": the speed peak lands at peakFrac of the move
function _m3keys(prop, t0, t1, v0, v1, peakFrac, infOut, infIn) {
    prop.setValueAtTime(t0, v0); prop.setValueAtTime(t1, v1);
    var k0 = prop.nearestKeyIndex(t0), k1 = prop.nearestKeyIndex(t1);
    var o = infOut, i = infIn;
    if (peakFrac < 0.5) { o = Math.max(10, infOut * peakFrac * 2); }       // shorter run-up
    if (peakFrac > 0.5) { i = Math.max(10, infIn * (1 - peakFrac) * 2); }
    _m3ease(prop, k0, 33, o);
    _m3ease(prop, k1, i, 33);
}

function _m3ramp(layer, pts) {
    if (!pts || !pts.length) return;
    layer.timeRemapEnabled = true;
    var tr = layer.property("ADBE Time Remapping");
    for (var q = 0; q < pts.length; q++) tr.setValueAtTime(pts[q][0], pts[q][1]);
    for (var r = 1; r <= tr.numKeys; r++) _m3ease(tr, r, 60, 60);      // flat S-curves like the tutorial
}

function mask3dTransition(comp, layerA, layerB, layerBroto, tStart, durFrames, opts) {
    var fd = comp.frameDuration, W = comp.width, H = comp.height;
    var t1 = tStart + (durFrames || 50) * fd;
    var pf = _m3o(opts, "peakFrac", 1 / 3), io = _m3o(opts, "infOut", 85), ii = _m3o(opts, "infIn", 95);

    // stacking: roto above B above A
    if (layerB.index > layerA.index) layerB.moveBefore(layerA);
    if (layerBroto && layerBroto.index > layerB.index) layerBroto.moveBefore(layerB);

    // optional speed ramps (set before parenting; time remap is independent of transforms)
    var rp = _m3o(opts, "ramp", null);
    if (rp) { _m3ramp(layerA, rp.A); _m3ramp(layerB, rp.B); if (layerBroto) _m3ramp(layerBroto, rp.B); }

    var nA = comp.layers.addNull(comp.duration); nA.name = "CTRL_M3D_A"; nA.label = LBL.CONTROL;
    var nB = comp.layers.addNull(comp.duration); nB.name = "CTRL_M3D_B"; nB.label = LBL.CONTROL;
    var c = [W / 2, H / 2];
    nA.property("ADBE Transform Group").property("ADBE Position").setValue(c);
    nB.property("ADBE Transform Group").property("ADBE Position").setValue(c);
    // parent BEFORE keying (compensation uses the parent's static value)
    layerA.parent = nA; layerB.parent = nB; if (layerBroto) layerBroto.parent = nB;

    var pA = nA.property("ADBE Transform Group").property("ADBE Position");
    var sA = nA.property("ADBE Transform Group").property("ADBE Scale");
    var pB = nB.property("ADBE Transform Group").property("ADBE Position");
    var sB = nB.property("ADBE Transform Group").property("ADBE Scale");
    var aS = _m3o(opts, "aScale", 125), bS = _m3o(opts, "bScale", 120);
    _m3keys(pA, tStart, t1, c, [c[0], c[1] - H * _m3o(opts, "aRise", 0.257)], pf, io, ii);
    _m3keys(sA, tStart, t1, [100, 100, 100], [aS, aS, 100], pf, io, ii);
    _m3keys(pB, tStart, t1, [c[0], c[1] + H * _m3o(opts, "bDrop", 0.715)], c, pf, io, ii);
    _m3keys(sB, tStart, t1, [bS, bS, 100], [100, 100, 100], pf, io, ii);

    // B only exists from tStart; A can end at t1
    if (layerB.inPoint < tStart) layerB.inPoint = tStart;
    if (layerBroto) layerBroto.inPoint = layerB.inPoint;

    comp.motionBlur = true;
    var all = [layerA, layerB, nA, nB]; if (layerBroto) all.push(layerBroto);
    for (var q = 0; q < all.length; q++) { try { all[q].motionBlur = true; } catch (e) { $.writeln("m3d mb: " + String(e.message) + " L" + e.line); } }
    return {nullA: nA, nullB: nB};
}
