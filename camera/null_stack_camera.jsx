// null_stack_camera.jsx : NaughtyyJuan stacked-null 2D "camera" (ES3).
// Guide: private study notes (not included)
//
// One null per move; the NEW null becomes the PARENT of the previous null; each move starts before the
// previous one lands (overlap) -> no dead zones. Ease = Flow (0.51,0,0,1) ~ out-influence 51 / in-influence 100.
// Tutorial: ~1.5 s per move @30 fps, ~0.3-0.4 s overlap, rot -15.2 / +5 deg, comp MB 180 / 0 / 16 / 128.
//
// Usage:
//   #include "layer_labels.jsx"      // optional
//   #include "null_stack_camera.jsx"
//   var nulls = nullStackCamera(comp, [cardA, cardB, cardC, txt1], [
//       {t: 0.0, dur: 1.5, target: cardB, zoom: 2.2, rot: -15},
//       {        dur: 1.5, target: cardC, zoom: 2.0, rot: 5},     // t omitted -> starts overlap s before prev ends
//       {        dur: 1.2, target: null,  zoom: 1.0, rot: 0}       // target null -> back to the full layout
//   ], {overlap: 0.35, outInf: 51, inInf: 100});
// Target centre = target layer's Position (layer must be unparented, or parented only to the chain).
// Returns the array of nulls. NOTE: written 2026-10-20, NOT yet run in AE.

var NSC_LBL_CONTROL = (typeof LBL !== "undefined" && LBL.CONTROL) ? LBL.CONTROL : 1;
function _nscOpt(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _nscLog(m) { try { $.writeln("[null_stack_camera] " + m); } catch (e) {} }

// 2D similarity about the comp centre c: x -> s*R(r)*(x - c) + c + d
function _nscRot(deg, x, y) { var a = deg * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a); return [x * cs - y * sn, x * sn + y * cs]; }
function _nscApply(M, c, p) { var v = _nscRot(M.r, p[0] - c[0], p[1] - c[1]); return [M.s * v[0] + c[0] + M.d[0], M.s * v[1] + c[1] + M.d[1]]; }

function _nscEase(prop, outInf, inInf) {
    var n = prop.numKeys, dim = 1, v = prop.keyValue(1);
    if (v instanceof Array) dim = (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) ? 1 : v.length;
    var eOut = [], eIn = [], j;
    for (j = 0; j < dim; j++) { eOut.push(new KeyframeEase(0, outInf)); eIn.push(new KeyframeEase(0, inInf)); }
    prop.setTemporalEaseAtKey(n - 1, prop.keyInTemporalEase(n - 1), eOut);
    prop.setTemporalEaseAtKey(n, eIn, prop.keyOutTemporalEase(n));
}

function nullStackCamera(comp, layers, moves, opts) {
    var c = [comp.width / 2, comp.height / 2];
    var overlap = _nscOpt(opts, "overlap", 0.35), outInf = _nscOpt(opts, "outInf", 51), inInf = _nscOpt(opts, "inInf", 100);
    var nulls = [], W = [], prevEnd = 0, k, i;
    // comp motion blur like the tutorial
    try { comp.motionBlur = true; comp.shutterAngle = _nscOpt(opts, "shutter", 180); comp.shutterPhase = 0;
          comp.motionBlurSamplesPerFrame = 16; comp.motionBlurAdaptiveSampleLimit = 128; } catch (e0) { _nscLog("mb: " + String(e0.message) + " L" + e0.line); }
    for (k = 0; k < layers.length; k++) { try { layers[k].motionBlur = true; } catch (e1) {} }

    for (i = 0; i < moves.length; i++) {
        var mv = moves[i];
        var t0 = (mv.t !== undefined) ? mv.t : Math.max(0, prevEnd - overlap);
        var dur = _nscOpt(mv, "dur", 1.5), s = _nscOpt(mv, "zoom", 1), r = _nscOpt(mv, "rot", 0);
        // world-space point to bring to centre (through the chain built so far)
        var q = c;
        if (mv.target) {
            var p = mv.target.property("ADBE Transform Group").property("ADBE Position").valueAtTime(t0, false);
            q = [p[0], p[1]];
            for (k = 0; k < W.length; k++) q = _nscApply(W[k], c, q);
        }
        // total zoom/rot already applied by the chain
        var accS = 1, accR = 0;
        for (k = 0; k < W.length; k++) { accS *= W[k].s; accR += W[k].r; }
        var ms = s / accS, mr = r - accR;   // this null only adds the remainder
        var dv = _nscRot(mr, q[0] - c[0], q[1] - c[1]);
        var d = [-ms * dv[0] + _nscOpt(mv, "dx", 0), -ms * dv[1] + _nscOpt(mv, "dy", 0)];

        var N = comp.layers.addNull(comp.duration);
        N.name = "CTRL_CAM_" + (i + 1); N.label = NSC_LBL_CONTROL; N.enabled = false;
        var tr = N.property("ADBE Transform Group");
        tr.property("ADBE Anchor Point").setValue([50, 50]);    // null source is 100x100: pivot at its centre
        tr.property("ADBE Position").setValue(c);
        // parent BEFORE keying: first null takes the layers, every later null takes the previous null
        if (i === 0) { for (k = 0; k < layers.length; k++) { if (!layers[k].parent) layers[k].parent = N; } }
        else { nulls[i - 1].parent = N; }

        var P = tr.property("ADBE Position"), S = tr.property("ADBE Scale"), R = tr.property("ADBE Rotate Z");
        P.setValueAtTime(t0, c);                     P.setValueAtTime(t0 + dur, [c[0] + d[0], c[1] + d[1]]);
        S.setValueAtTime(t0, [100, 100]);            S.setValueAtTime(t0 + dur, [100 * ms, 100 * ms]);
        R.setValueAtTime(t0, 0);                     R.setValueAtTime(t0 + dur, mr);
        try { _nscEase(P, outInf, inInf); _nscEase(S, outInf, inInf); _nscEase(R, outInf, inInf); }
        catch (e2) { _nscLog("ease: " + String(e2.message) + " L" + e2.line); }

        // chain order: the newest null is applied LAST (outermost)
        W.push({s: ms, r: mr, d: d});
        nulls.push(N);
        prevEnd = t0 + dur;
    }
    return nulls;
}
