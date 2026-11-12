// collage_face_pop.jsx : Motion Media "Easy COLLAGE Effect in After Effects (Underground Method)" (ES3).
// Guide: private study notes (not included)
//
// A frozen, roto'd face pops onto a frozen environment plate as a stop-motion staircase of 1-3 frame copies:
// first a masked bottom slice, the mask climbs to reveal the full face, scale steps 100 -> 120 % (with a -3 deg
// nudge) and back to 100 %. Slow 100 -> 105 % Transform zoom on an adjustment layer, dust overlay in Screen.
//
// Usage:
//   #include "layer_labels.jsx"     // optional
//   #include "collage_face_pop.jsx"
//   // faceStill = a layer (precomp) holding the roto'd face, already frozen (Roto Brush feather 20, shift edge -30)
//   // bgStill   = a frozen environment plate (Time > Freeze Frame)
//   var r = collageFacePop(comp, faceStill, bgStill, t0, {dustFile: ".../dust.png", step: 1});
//   // step = frame multiplier: 1 for 24/25/30 fps comps (tutorial), 2 for 50/60 fps
// NOTE: written 2026-10-20, NOT yet run in AE. Test once in a scratch comp before using in a build.

var CFP_LBL = (typeof LBL !== "undefined") ? LBL : {ADJ:3,SHAPE:4,LIGHT:5,STILL:9,PRECOMP:10};

// the tutorial sequence: frames, scale %, rotation deg, mask reveal (0 = bottom slice only, 1 = no mask)
var CFP_SEQ = [
    {f: 3, s: 100, r: 0,  m: 0.35},   // starts 2 f after the plate; bottom of the face only
    {f: 2, s: 105, r: 0,  m: 0.60},
    {f: 3, s: 110, r: 0,  m: 0.85},   // "almost reveals the face"
    {f: 2, s: 115, r: 0,  m: 1.00},   // mask deleted
    {f: 2, s: 120, r: 0,  m: 1.00},
    {f: 3, s: 120, r: -3, m: 1.00},   // subtle rotation nudge
    {f: 2, s: 115, r: -3, m: 1.00},
    {f: 3, s: 110, r: -3, m: 1.00},
    {f: 2, s: 105, r: -3, m: 1.00},
    {f: 1, s: 100, r: -3, m: 1.00}    // back to original scale
];

function _cfpo(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _cfplog(m) { try { $.writeln("[collage_face_pop] " + m); } catch (e) {} }

function _cfpMask(L, reveal) {   // rectangular mask covering the bottom `reveal` fraction of the layer bounds
    var r = L.sourceRectAtTime(0, false);
    var top = r.top + r.height * (1 - reveal), m = L.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
    var s = new Shape();
    s.vertices = [[r.left - 10, top], [r.left + r.width + 10, top + r.height * 0.06], [r.left + r.width + 10, r.top + r.height + 10], [r.left - 10, r.top + r.height + 10]];
    s.closed = true;   // slightly slanted top edge, like the hand-drawn pen mask
    m.property("ADBE Mask Shape").setValue(s);
    m.property("ADBE Mask Feather").setValue([4, 4]);
}

function collageFacePop(comp, faceStill, bgStill, t0, opts) {
    var fd = comp.frameDuration, step = _cfpo(opts, "step", 1), k, t = t0 + 2 * step * fd, made = [];
    faceStill.enabled = false;
    for (k = 0; k < CFP_SEQ.length; k++) {
        var q = CFP_SEQ[k], L = faceStill.duplicate();
        L.enabled = true; L.name = "IMG_FACEPOP_" + (k + 1); L.label = CFP_LBL.STILL;
        L.inPoint = t; L.outPoint = t + q.f * step * fd;
        var tr = L.property("ADBE Transform Group");
        tr.property("ADBE Scale").setValue([q.s, q.s]);
        tr.property("ADBE Rotate Z").setValue(q.r);
        if (q.m < 1) _cfpMask(L, q.m);
        var fx = L.property("ADBE Effect Parade");   // B&C punch (tutorial: B&C up + Curves highlights up/shadows down)
        var bc = fx.addProperty("ADBE Brightness & Contrast 2");
        bc.property(1).setValue(12); bc.property(2).setValue(18);
        made.push(L); t = L.outPoint;
    }
    // a final hold: the last copy stays until opts.holdTo (or the plate's out point)
    made[made.length - 1].outPoint = _cfpo(opts, "holdTo", bgStill.outPoint);
    // slow zoom: adjustment Transform 100 -> 105, eased, keys pulled 1 f inside the clip
    var a = comp.layers.addSolid([1,1,1], "ADJ_SLOWZOOM", comp.width, comp.height, 1);
    a.adjustmentLayer = true; a.label = CFP_LBL.ADJ; a.inPoint = t0; a.outPoint = made[made.length - 1].outPoint;
    a.moveToBeginning();
    a.property("ADBE Effect Parade").addProperty("ADBE Geometry2");
    var sc = a.property("ADBE Effect Parade").property(1).property("ADBE Geometry2-0003");
    sc.setValueAtTime(t0 - fd, 100); sc.setValueAtTime(a.outPoint + fd, 105);
    var e = [new KeyframeEase(0, 33)];
    sc.setTemporalEaseAtKey(1, e, e); sc.setTemporalEaseAtKey(2, e, e);
    // dust overlay, Screen
    var dust = null, df = _cfpo(opts, "dustFile", null);
    if (df) {
        try {
            var it = app.project.importFile(new ImportOptions(new File(df)));
            dust = comp.layers.add(it); dust.name = "FX_DUST"; dust.label = CFP_LBL.LIGHT;
            dust.blendingMode = BlendingMode.SCREEN; dust.inPoint = t0; dust.outPoint = a.outPoint; dust.moveToBeginning();
            var sx = Math.max(comp.width / it.width, comp.height / it.height) * 105;
            dust.property("ADBE Transform Group").property("ADBE Scale").setValue([sx, sx]);
        } catch (e2) { _cfplog("dust: " + String(e2.message) + " L" + e2.line); }
    }
    return {copies: made, zoom: a, dust: dust};
}
