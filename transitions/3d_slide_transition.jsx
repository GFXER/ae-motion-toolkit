// 3d_slide_transition.jsx : Adobe Simplified "3D Slide Transition Like the Pro Editors" as an ES3 helper.
// Guide: private study notes (not included)
//
// Clip B waits one frame-height above (or below) clip A AND deeper in Z (3D layers, default camera).
// A master CTRL null slides the whole stack vertically so B lands full frame; B's own CTRL null comes
// forward in Z (depth -> 0) in the same move, so B grows ~0.79 -> 1.0 while A slides out flat.
// A's base layer fades 100 -> 0 so B (behind it in Z) shows through; A's roto'd subject (fgA) stays
// on top, slides out with the rig and gets Fast Box Blur 0 -> 5 px (@1080) = focus shift to B.
// Motion Tile (output 200 %, mirror edges) on the BASE layers hides the clip edges; an ADJ_ layer with
// CC Force Motion Blur (defaults) on top. Speed graph = spike whose peak sits ON the beat (t).
//
// House adaptation (1:2 rule): 3 keys per moving property: t-N (speed 0) -> t (peak speed, value at 1/3
// of the move) -> t+2N (speed 0, long tail). Values are continuous through t (no flips, no overshoot).
//
// Usage:
//   #include "layer_labels.jsx"          // optional (LBL)
//   #include "3d_slide_transition.jsx"
//   var r = slide3dTransition(comp, clipA, clipB, 4.20, {
//       N: 15,            // frames accelerating out (60 fps: 15, big 20; 50 fps: 12/17; 30: 8/10; 24: 6/8)
//       fgA: clipA_roto,  // duplicate of A with a track matte (MATTE_ from tools/matte_subject), or null
//       fgAMatte: null,   // the matte layer itself, if separate (gets parented + 3D too)
//       dir: 1,           // +1 = content slides DOWN (B waits above, as the tutorial); -1 = slides UP
//       gapK: 1.0,        // vertical gap in comp heights
//       depthK: 0.37,     // B's starting Z depth in comp widths (tutorial 400 @1080 = 0.37)
//       tileOut: 200,     // Motion Tile output width/height %
//       blurMax: 5,       // Fast Box Blur radius on fgA at t (scaled by comp.width/1080)
//       outInf: 75, midInf: 20, inInf: 80,  // eases (start out / peak both sides / end in)
//       fadeEndN: 1.0,    // A base opacity reaches 0 at t + fadeEndN*N
//       forceMB: true     // ADJ_ CC Force Motion Blur over the stack
//   });
//   Chain a 3rd clip: call again with clipA = previous clipB, a new t; the helper reuses nothing, it makes
//   a new CTRL_SLIDE3D_MASTER_n that parents the previous master (tutorial "ghost mommy 2"), so moves stack.
//   Optional speed ramp around the beat: slide3dSpeedRamp(layer, t, N, {slow: 0.6, fast: 2.6}).
// Returns {master, ctrlA, ctrlB, adj}. Layers must already cover [t-N, t+2N] (helper does not trim).
// NOTE: written 2026-10-29, NOT yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _s3o(o, k, d) { return (o && o[k] !== undefined && o[k] !== null) ? o[k] : d; }
function _s3log(m) { try { $.writeln("[slide3d] " + m); } catch (e) {} }

// number of ease entries a property wants
function _s3dim(prop) {
    var vt = prop.propertyValueType;
    if (vt === PropertyValueType.TwoD_SPATIAL || vt === PropertyValueType.ThreeD_SPATIAL || vt === PropertyValueType.OneD) return 1;
    if (vt === PropertyValueType.TwoD) return 2;
    if (vt === PropertyValueType.ThreeD) return 3;
    return 1;
}
function _s3arr(n, speed, inf) { var a = [], q; for (q = 0; q < n; q++) a.push(new KeyframeEase(speed, inf)); return a; }

// distance between two values (scalar or array) -> used for the peak speed along the path
function _s3dist(a, b) {
    if (!(a instanceof Array)) return Math.abs(b - a);
    var s = 0, q; for (q = 0; q < a.length; q++) s += (b[q] - a[q]) * (b[q] - a[q]);
    return Math.sqrt(s);
}
function _s3lerp(a, b, f) {
    if (!(a instanceof Array)) return a + (b - a) * f;
    var r = [], q; for (q = 0; q < a.length; q++) r.push(a[q] + (b[q] - a[q]) * f);
    return r;
}

// 3 keys: t0 (speed 0) -> t1 (peak, value at 1/3) -> t2 (speed 0). N : 2N spacing = house 1:2 rule.
// Peak speed = 2x the average speed of either half (both halves have the same average speed).
function _s3spike(prop, t0, t1, t2, v0, v2, outInf, midInf, inInf) {
    var frac = (t1 - t0) / (t2 - t0);
    var v1 = _s3lerp(v0, v2, frac);
    prop.setValueAtTime(t0, v0); prop.setValueAtTime(t1, v1); prop.setValueAtTime(t2, v2);
    var k0 = prop.nearestKeyIndex(t0), k1 = prop.nearestKeyIndex(t1), k2 = prop.nearestKeyIndex(t2);
    var n = _s3dim(prop), D = _s3dist(v0, v2), pk = 2 * D / (t2 - t0), j, k;
    var spatial = (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL);
    for (k = k0; k <= k2; k++) {
        try { prop.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER); } catch (e0) {}
        if (spatial) {
            try { prop.setSpatialAutoBezierAtKey(k, false); prop.setSpatialContinuousAtKey(k, false);
                  var z = (prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) ? [0, 0, 0] : [0, 0];
                  prop.setSpatialTangentsAtKey(k, z, z); prop.setRovingAtKey(k, false); } catch (e1) { _s3log("spatial: " + String(e1.message) + " L" + e1.line); }
        }
    }
    // per-dimension speed for non-spatial arrays (e.g. Scale): component share of the move
    var pkArr = [];
    if (n > 1) { for (j = 0; j < n; j++) pkArr.push(2 * Math.abs(v2[j] - v0[j]) / (t2 - t0)); }
    try {
        prop.setTemporalEaseAtKey(k0, _s3arr(n, 0, 33), _s3arr(n, 0, outInf));
        if (n > 1) {
            var a = [], b = [];
            for (j = 0; j < n; j++) { a.push(new KeyframeEase(pkArr[j] * (v2[j] < v0[j] ? -1 : 1), midInf)); b.push(new KeyframeEase(pkArr[j] * (v2[j] < v0[j] ? -1 : 1), midInf)); }
            prop.setTemporalEaseAtKey(k1, a, b);
        } else {
            var sg = (!(v0 instanceof Array) && v2 < v0) ? -1 : 1;     // spatial speed is always positive
            prop.setTemporalEaseAtKey(k1, _s3arr(1, sg * pk, midInf), _s3arr(1, sg * pk, midInf));
        }
        prop.setTemporalEaseAtKey(k2, _s3arr(n, 0, inInf), _s3arr(n, 0, 33));
        prop.setTemporalContinuousAtKey(k1, true);
    } catch (e2) { _s3log("ease: " + String(e2.message) + " L" + e2.line); }
}

// two keys with a plain ease (opacity / blur): out-influence on the first, in-influence on the second
function _s3ease2(prop, t0, t1, v0, v1, outInf, inInf) {
    prop.setValueAtTime(t0, v0); prop.setValueAtTime(t1, v1);
    var k0 = prop.nearestKeyIndex(t0), k1 = prop.nearestKeyIndex(t1), n = _s3dim(prop);
    try { prop.setTemporalEaseAtKey(k0, _s3arr(n, 0, 33), _s3arr(n, 0, outInf));
          prop.setTemporalEaseAtKey(k1, _s3arr(n, 0, inInf), _s3arr(n, 0, 33)); } catch (e) { _s3log("ease2: " + String(e.message) + " L" + e.line); }
}

function _s3null(comp, name) {
    var N = comp.layers.addNull(comp.duration);
    N.name = name; N.label = LBL.CONTROL; N.threeDLayer = true; N.enabled = false;
    var tr = N.property("ADBE Transform Group");
    tr.property("ADBE Anchor Point").setValue([50, 50, 0]);          // null source is 100x100: pivot at centre
    tr.property("ADBE Position").setValue([comp.width / 2, comp.height / 2, 0]);
    return N;
}

// Motion Tile on a base layer (add the effect first, then fetch its props: §7)
function _s3tile(L, out) {
    try {
        var fx = L.property("ADBE Effect Parade").addProperty("ADBE Tile");
        fx = L.property("ADBE Effect Parade").property(L.property("ADBE Effect Parade").numProperties);
        fx.property(4).setValue(out);      // Output Width
        fx.property(5).setValue(out);      // Output Height
        fx.property(6).setValue(1);        // Mirror Edges
    } catch (e) { _s3log("tile " + L.name + ": " + String(e.message) + " L" + e.line); }
}

var _S3_COUNT = 0;

function slide3dTransition(comp, layerA, layerB, t, params) {
    var p = params || {};
    var fps = comp.frameRate, W = comp.width, H = comp.height, k;
    var N = _s3o(p, "N", Math.round(fps / 4));                           // 15 @60, 12-13 @50
    var tA = t - N / fps, tC = t, tB = t + 2 * N / fps;
    var dir = _s3o(p, "dir", 1), gap = _s3o(p, "gapK", 1.0) * H, depth = _s3o(p, "depthK", 0.37) * W;
    var outInf = _s3o(p, "outInf", 75), midInf = _s3o(p, "midInf", 20), inInf = _s3o(p, "inInf", 80);
    var fgA = _s3o(p, "fgA", null), fgAM = _s3o(p, "fgAMatte", null);
    var res = {master: null, ctrlA: null, ctrlB: null, adj: null};
    _S3_COUNT++;
    try {
        if (layerB.inPoint > tA + 0.001) _s3log("WARNING: " + layerB.name + " starts after t-N; extend it");
        var A = [layerA], B = [layerB];
        if (fgA) A.push(fgA);
        if (fgAM) A.push(fgAM);
        // all moving layers 3D (Classic 3D sorts by Z: B at +depth renders behind A automatically)
        for (k = 0; k < A.length; k++) A[k].threeDLayer = true;
        for (k = 0; k < B.length; k++) B[k].threeDLayer = true;

        // controllers. If A is already in a previous slide rig, its top master becomes the child of the new master.
        var ctrlA = null, top = layerA;
        while (top.parent) top = top.parent;
        if (top !== layerA) { ctrlA = top; }                              // chained call: reuse the rig
        else {
            ctrlA = _s3null(comp, "CTRL_SLIDE3D_A_" + _S3_COUNT);
            for (k = 0; k < A.length; k++) if (!A[k].parent) A[k].parent = ctrlA;   // .parent keeps visual placement
        }
        var ctrlB = _s3null(comp, "CTRL_SLIDE3D_B_" + _S3_COUNT);
        layerB.parent = ctrlB;
        var master = _s3null(comp, "CTRL_SLIDE3D_MASTER_" + _S3_COUNT);
        ctrlA.parent = master; ctrlB.parent = master;                     // parent BEFORE keying (§7)

        // B waits one gap above (dir +1) and deeper in Z; ctrlB local = comp-centre value read back + offset
        var PB = ctrlB.property("ADBE Transform Group").property("ADBE Position");
        var b0 = PB.value;
        var bStart = [b0[0], b0[1] - dir * gap, b0[2] + depth], bEnd = [b0[0], b0[1] - dir * gap, b0[2]];
        PB.setValue(bStart);
        _s3spike(PB, tA, tC, tB, bStart, bEnd, outInf, midInf, inInf);     // Z depth -> 0 (B grows into frame)

        var PM = master.property("ADBE Transform Group").property("ADBE Position");
        var m0 = PM.value, mEnd = [m0[0], m0[1] + dir * gap, m0[2]];
        _s3spike(PM, tA, tC, tB, m0, mEnd, outInf, midInf, inInf);         // the slide itself, peak on the beat

        // A base fades so B shows through (tutorial: linear -> Easy Ease + speed curve, influence ~68)
        var fadeEnd = tC + _s3o(p, "fadeEndN", 1.0) * N / fps;
        _s3ease2(layerA.property("ADBE Transform Group").property("ADBE Opacity"), tA, fadeEnd, 100, 0, 68, 68);

        // Motion Tile on BASE layers only (never on the roto layer)
        var tileOut = _s3o(p, "tileOut", 200);
        _s3tile(layerA, tileOut); _s3tile(layerB, tileOut);

        // focus shift: Fast Box Blur on A's subject, 0 -> 5 px @1080 at the beat, then holds
        if (fgA) {
            try {
                var fp = fgA.property("ADBE Effect Parade");
                fp.addProperty("ADBE Box Blur2");
                var bb = fp.property(fp.numProperties);
                bb.property(2).setValue(3);                                // Iterations 3 (tutorial default)
                _s3ease2(bb.property(1), tA, tC, 0, _s3o(p, "blurMax", 5) * W / 1080, 75, 85);
            } catch (e3) { _s3log("box blur: " + String(e3.message) + " L" + e3.line); }
            fgA.label = LBL.VIDEO; if (fgAM) fgAM.label = LBL.MATTE;
        }

        // motion blur: CC Force Motion Blur adjustment (defaults) + layer MB switches
        if (_s3o(p, "forceMB", true)) {
            var adj = comp.layers.addSolid([1, 1, 1], "ADJ_SLIDE3D_MB_" + _S3_COUNT, W, H, 1, comp.duration);
            adj.adjustmentLayer = true; adj.label = LBL.ADJ;
            adj.startTime = 0; adj.inPoint = Math.max(0, tA - N / fps); adj.outPoint = tB + N / fps;   // inPoint first (§7)
            try { adj.property("ADBE Effect Parade").addProperty("CC Force Motion Blur"); } catch (e4) { _s3log("CC FMB: " + String(e4.message) + " L" + e4.line); }
            adj.moveToBeginning();
            res.adj = adj;
        }
        for (k = 0; k < A.length; k++) { try { A[k].motionBlur = true; } catch (e5) {} }
        try { layerB.motionBlur = true; } catch (e6) {}

        // keep the roto subject above everything of B in the stack (same-Z ties fall back to layer order)
        if (fgA) { try { fgA.moveBefore(layerB); if (fgAM) fgAM.moveBefore(fgA); } catch (e7) {} }

        res.master = master; res.ctrlA = ctrlA; res.ctrlB = ctrlB;
        _s3log("built at t=" + t + " N=" + N + "f gap=" + gap + " depth=" + depth);
    } catch (e) { _s3log("ERROR: " + String(e.message) + " L" + e.line); }
    return res;
}

// Optional: bake a speed ramp around the beat into Time Remap (tutorial: 3 time-remap moves per clip,
// fastest exactly on the marker). Rate = slow outside, rises over N frames to `fast` at t, decays over 2N.
// srcStart = source time at layer.inPoint (default: current Time Remap value there).
function slide3dSpeedRamp(layer, t, N, opts) {
    try {
        var comp = layer.containingComp, fps = comp.frameRate, dt = 1 / fps;
        var slow = _s3o(opts, "slow", 0.6), fast = _s3o(opts, "fast", 2.6);
        var src = layer.source, srcMax = (src && src.duration) ? src.duration - dt : 1e9;
        layer.timeRemapEnabled = true;
        var TR = layer.property("ADBE Time Remapping");
        var s = _s3o(opts, "srcStart", TR.valueAtTime(layer.inPoint, false));
        while (TR.numKeys > 0) TR.removeKey(TR.numKeys);
        var a = t - N * dt, b = t + 2 * N * dt;
        var rate = function (x) {
            var g = 0, u;
            if (x > a && x <= t) { u = (x - a) / (t - a); g = u * u * (3 - 2 * u); }
            else if (x > t && x < b) { u = (x - t) / (b - t); g = 1 - u * u * (3 - 2 * u); }
            return slow + (fast - slow) * g;
        };
        var times = [], vals = [], x = layer.inPoint;
        times.push(x); vals.push(Math.min(s, srcMax));
        // linear stretch up to the window, then per-frame inside it
        if (a > x) { s += slow * (a - x); x = a; times.push(x); vals.push(Math.min(s, srcMax)); }
        while (x < b && x < layer.outPoint) { s += rate(x + dt / 2) * dt; x += dt; times.push(x); vals.push(Math.min(s, srcMax)); }
        if (layer.outPoint > x) { s += slow * (layer.outPoint - x); times.push(layer.outPoint); vals.push(Math.min(s, srcMax)); }
        TR.setValuesAtTimes(times, vals);
        for (var k = 1; k <= TR.numKeys; k++) TR.setInterpolationTypeAtKey(k, KeyframeInterpolationType.LINEAR);
        if (s > srcMax) _s3log("speed ramp on " + layer.name + " runs past the source end; lower slow/fast");
    } catch (e) { _s3log("speed ramp: " + String(e.message) + " L" + e.line); }
}
