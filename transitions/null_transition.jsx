// null_transition.jsx : atkaex "Null Transitions" as a reusable ExtendScript helper (ES3).
// Guide: private study notes (not included)
//
// Idea: every layer of a short segment is parented to a CTRL_ null. The NEXT shot sits in the frame as a
// small rotated "card" (Motion Tile + mirror around it). On the beat the null is keyed from identity to the
// inverse of that card's transform, so the card swings/zooms to full frame. Symmetric S-curve, ~50/50
// influence, speed 0 ("don't make it steep"). Chain: the next null becomes the PARENT of the previous one.
//
// Tutorial numbers (1080x1080, 60 fps, beats every ~37.5 f):
//   Null1 f9 -> f45 : X/Y 540,540 -> 1939,947 | scale 100 -> 259 % | rot 0 -> -23 deg   (beat 2 = f37)
//   Null2 f40 -> f77: pos 540,540 -> -613,540 | scale 100 -> 225 % | rot 0 -> +28 deg   (beat 3 = f75)
//   -> move 36 f, starts ~28 f before the beat, lands ~2-8 f after it; chained nulls overlap 5-6 f.
//
// Usage (after #include "layer_labels.jsx" is optional; LBL fallback below):
//   #include "null_transition.jsx"
//   placeCard(comp, clipB, "tl", 38.6, 23);                     // B card top-left, 38.6 %, +23 deg
//   addMotionTile(clipB, 400, true);                             // fill around the card (keep <= 1000)
//   var n1 = nullTransition(comp, [clipA, clipAroto, clipB, clipBroto], t0, 36, "align", {target: clipB});
//   placeCard(comp, clipC, "tr", 44, -28);  clipC.parent = n1;   // parent C to n1 (as in the tutorial)
//   var n2 = nullTransition(comp, [clipC], t1, 36, "align", {target: clipC, chain: n1});
//   blurMoBookend(clipA, 0, 13, 0.61, 1.0, "out");               // S_BlurMoCurves zoom-out entry
//   blurMoBookend(clipC, tEnd - 13/60, 13, 1.0, 0.745, "in");     // zoom-in exit
// Types: "align" (tutorial), "zoom", "spin", "slide", "whip". opts below. Returns the null layer.
// NOTE: written 2026-10-15, NOT yet run in AE. Test once in a scratch comp before using in a build.

var NT_LBL_CONTROL = (typeof LBL !== "undefined" && LBL.CONTROL) ? LBL.CONTROL : 1;
var NT_COUNT = 0;

function ntLog(msg) { try { $.writeln("[null_transition] " + msg); } catch (e) {} }

// ---------- 2D similarity transforms: x -> s*R(r)*x + t  (AE: y down, +rot = clockwise) ----------
function ntRot(deg, x, y) {
    var a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return [x * c - y * s, x * s + y * c];
}
function ntSim(s, r, tx, ty) { return {s: s, r: r, tx: tx, ty: ty}; }
function ntCompose(A, B) { // A after B
    var bt = ntRot(A.r, B.tx, B.ty);
    return ntSim(A.s * B.s, A.r + B.r, A.s * bt[0] + A.tx, A.s * bt[1] + A.ty);
}
function ntInverse(A) {
    var t = ntRot(-A.r, A.tx, A.ty);
    return ntSim(1 / A.s, -A.r, -t[0] / A.s, -t[1] / A.s);
}
function ntPos(L, t) {
    var tr = L.property("ADBE Transform Group"), p = tr.property("ADBE Position");
    if (p.dimensionsSeparated) {
        return [tr.property("ADBE Position_0").valueAtTime(t, false), tr.property("ADBE Position_1").valueAtTime(t, false)];
    }
    var v = p.valueAtTime(t, false); return [v[0], v[1]];
}
// local transform of one layer (into its parent's space) at time t
function ntLocalSim(L, t) {
    var tr = L.property("ADBE Transform Group");
    var p = ntPos(L, t);
    var a = tr.property("ADBE Anchor Point").valueAtTime(t, false);
    var k = tr.property("ADBE Scale").valueAtTime(t, false)[0] / 100;   // uniform scale assumed (x)
    var r = tr.property("ADBE Rotate Z").valueAtTime(t, false);
    var ra = ntRot(r, a[0], a[1]);
    return ntSim(k, r, p[0] - k * ra[0], p[1] - k * ra[1]);
}
// world transform (walks the parent chain; `stopAt` is treated as identity)
function ntWorldSim(L, t, stopAt) {
    var M = ntLocalSim(L, t), P = L.parent, guard = 0;
    while (P && P !== stopAt && guard < 32) { M = ntCompose(ntLocalSim(P, t), M); P = P.parent; guard++; }
    return M;
}
function ntWrapDeg(d) { while (d > 180) d -= 360; while (d <= -180) d += 360; return d; }

// ---------- easing ----------
function ntEaseArr(n, speed, infl) { var a = [], q; for (q = 0; q < n; q++) a.push(new KeyframeEase(speed, infl)); return a; }
function ntSetEase(prop, k, inSpd, inInf, outSpd, outInf) {
    var dims = [3, 2, 1], d;                     // Scale needs 3 on 2D layers, spatial/1D props need 1
    for (d = 0; d < dims.length; d++) {
        try { prop.setTemporalEaseAtKey(k, ntEaseArr(dims[d], inSpd, inInf), ntEaseArr(dims[d], outSpd, outInf)); return true; }
        catch (e) {}
    }
    ntLog("ease failed on " + prop.name + " key " + k); return false;
}
// two-key move with tutorial S-curve: speed 0 both ends, influence `infl` (50 = handles meet in the middle)
function ntKey2(prop, t0, v0, t1, v1, infl) {
    var k0 = prop.addKey(t0); prop.setValueAtKey(k0, v0);
    var k1 = prop.addKey(t1); prop.setValueAtKey(k1, v1);
    k0 = prop.nearestKeyIndex(t0); k1 = prop.nearestKeyIndex(t1);
    try { prop.setInterpolationTypeAtKey(k0, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER); } catch (e1) {}
    try { prop.setInterpolationTypeAtKey(k1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER); } catch (e2) {}
    ntSetEase(prop, k0, 0, infl, 0, infl);
    ntSetEase(prop, k1, 0, infl, 0, infl);
}
// cubic-bezier(x1,y1,x2,y2) (Flow extension numbers) on a 1D two-key move
function ntKeyBezier1D(prop, t0, v0, t1, v1, x1, y1, x2, y2) {
    var D = t1 - t0, dv = v1 - v0;
    var ox = Math.max(x1, 0.01), ix = Math.max(1 - x2, 0.01);
    var k0 = prop.addKey(t0); prop.setValueAtKey(k0, v0);
    var k1 = prop.addKey(t1); prop.setValueAtKey(k1, v1);
    k0 = prop.nearestKeyIndex(t0); k1 = prop.nearestKeyIndex(t1);
    var outSpd = Math.abs((y1 / ox) * dv / D), inSpd = Math.abs(((1 - y2) / ix) * dv / D);
    try {
        prop.setTemporalEaseAtKey(k0, [new KeyframeEase(0, 33)], [new KeyframeEase(outSpd, Math.min(100, Math.max(0.1, ox * 100)))]);
        prop.setTemporalEaseAtKey(k1, [new KeyframeEase(inSpd, Math.min(100, Math.max(0.1, ix * 100)))], [new KeyframeEase(0, 33)]);
    } catch (e) { ntLog("bezier ease failed: " + String(e.message) + " L" + e.line); }
}

// ---------- helpers for the card setup ----------
// put the incoming clip as a small rotated card in a corner ("I usually go for the top ones")
function placeCard(comp, L, corner, scalePct, rotDeg) {
    var W = comp.width, H = comp.height;
    var fx = (corner === "tr" || corner === "br") ? 0.80 : 0.20;
    var fy = (corner === "bl" || corner === "br") ? 0.82 : 0.18;
    var tr = L.property("ADBE Transform Group");
    var p = tr.property("ADBE Position");
    if (p.dimensionsSeparated) {
        tr.property("ADBE Position_0").setValue(W * fx); tr.property("ADBE Position_1").setValue(H * fy);
    } else { p.setValue([W * fx, H * fy]); }
    tr.property("ADBE Scale").setValue([scalePct, scalePct]);
    tr.property("ADBE Rotate Z").setValue(rotDeg);
}
// Motion Tile around the card. Output % (tutorial 400; never > 1000; use 300-400 on 2160x3840)
function addMotionTile(L, outPct, mirror) {
    var fxg = L.property("ADBE Effect Parade");
    var mt = fxg.addProperty("ADBE Tile");
    mt = fxg.property(fxg.numProperties);              // re-fetch after addProperty
    var o = Math.min(outPct || 400, 1000);
    try { mt.property("Output Width").setValue(o); mt.property("Output Height").setValue(o); } catch (e1) { ntLog("tile out: " + String(e1.message)); }
    try { mt.property("Mirror Edges").setValue(mirror === false ? 0 : 1); } catch (e2) { ntLog("tile mirror: " + String(e2.message)); }
    return mt;
}
// Sapphire S_BlurMoCurves bookend. dir "out" = entry zoom-out (Flow 0.00,0.51,0.30,0.99),
// "in" = exit zoom-in (Flow 0.51,0.01,1.00,0.50). Tutorial: out 0.61->1.0 over 13 f; in 1.0->0.745.
function blurMoBookend(L, t0, frames, zFrom, zTo, dir, centerXY) {
    var comp = L.containingComp, fd = comp.frameDuration;
    var fxg = L.property("ADBE Effect Parade");
    fxg.addProperty("S_BlurMoCurves");
    var bm = fxg.property(fxg.numProperties);
    var z = null;
    try { z = bm.property("Z Dist"); } catch (e1) {}
    if (!z) { ntLog("S_BlurMoCurves: Z Dist not found"); return bm; }
    if (centerXY) { try { bm.property("Center XY").setValue(centerXY); } catch (e2) {} }
    if (dir === "in") ntKeyBezier1D(z, t0, zFrom, t0 + frames * fd, zTo, 0.51, 0.01, 1.00, 0.50);
    else ntKeyBezier1D(z, t0, zFrom, t0 + frames * fd, zTo, 0.00, 0.51, 0.30, 0.99);
    return bm;
}

// ---------- main ----------
// nullTransition(comp, layers, tIn, durFrames, type, opts)
//  comp      CompItem
//  layers    Array of Layers to parent to the new null (parented BEFORE any key; .parent = keeps placement)
//  tIn       seconds, start of the move (tutorial: ~28 f before the beat)
//  durFrames move length in comp frames (tutorial 36 @60 fps; 30 @50; 18 @30)
//  type      "align" | "zoom" | "spin" | "slide" | "whip"
//  opts      {
//    target:     Layer the move lands on full-frame ("align"; read at tIn+dur, world transform)
//    landScale:  % the target lands at (default 100)
//    end:        explicit end values {x, y, scale, rot} (overrides type maths; e.g. tutorial 1939,947,259,-23)
//    scale, rot: for zoom/spin (defaults zoom 250/0, spin 140/-25)
//    dx, dy:     for slide/whip (default dx = comp.width)
//    focus:      [x,y] point zoomed into (zoom/spin; default comp centre)
//    influence:  ease influence % (default 50 = "drag handles to the centre"; whip 75)
//    chain:      previous null; it is parented under the new one (tutorial: Null1 -> Null2)
//    fadeLayer, fadeAt, fadeFrames: opacity 0->100 on the incoming base (default 3 f at fadeLayer.inPoint)
//    shutter:    comp shutter angle (default 180; leave RSMB 1-1.25 for the precomp)
//    name:       null name suffix
//  }
function nullTransition(comp, layers, tIn, durFrames, type, opts) {
    opts = opts || {};
    try {
        var fd = comp.frameDuration, W = comp.width, H = comp.height;
        var C = [W / 2, H / 2];
        var t1 = tIn + durFrames * fd;
        var infl = opts.influence ? opts.influence : (type === "whip" ? 75 : 50);
        NT_COUNT++;

        // 1) null: anchor = position = comp centre -> local space == comp space, so parenting
        //    compensation is a zero offset and the pivot is the frame centre.
        var N = comp.layers.addNull();
        N.name = "CTRL_NULLTR_" + (opts.name ? opts.name : ("" + NT_COUNT));
        N.label = NT_LBL_CONTROL;
        N.startTime = 0; N.inPoint = 0; N.outPoint = comp.duration;
        var tr = N.property("ADBE Transform Group");
        tr.property("ADBE Anchor Point").setValue(C);
        tr.property("ADBE Position").setValue(C);

        // 2) end values (computed BEFORE parenting; new null is identity so it does not matter)
        var ex = C[0], ey = C[1], es = 100, er = 0;
        if (opts.end) {
            ex = opts.end.x; ey = opts.end.y; es = opts.end.scale; er = opts.end.rot;
        } else if (type === "align") {
            if (!opts.target) throw new Error("align needs opts.target");
            var Mc = ntWorldSim(opts.target, t1, N);
            var a = opts.target.property("ADBE Transform Group").property("ADBE Anchor Point").valueAtTime(t1, false);
            var ls = (opts.landScale ? opts.landScale : 100) / 100;
            var Tg = ntSim(ls, 0, C[0] - ls * a[0], C[1] - ls * a[1]);     // target: anchor at centre, upright
            var Nm = ntCompose(Tg, ntInverse(Mc));                         // null map = Target o Card^-1
            var rc = ntRot(Nm.r, C[0], C[1]);
            es = Nm.s * 100; er = ntWrapDeg(Nm.r);
            ex = Nm.tx + Nm.s * rc[0]; ey = Nm.ty + Nm.s * rc[1];          // P = t + s*R*C (pivot C)
        } else if (type === "zoom" || type === "spin") {
            es = opts.scale ? opts.scale : (type === "zoom" ? 250 : 140);
            er = (opts.rot !== undefined) ? opts.rot : (type === "zoom" ? 0 : -25);
            var f = opts.focus ? opts.focus : C;
            var d = ntRot(er, f[0] - C[0], f[1] - C[1]);
            ex = C[0] - (es / 100) * d[0]; ey = C[1] - (es / 100) * d[1];  // focus point lands at centre
        } else if (type === "slide" || type === "whip") {
            ex = C[0] - ((opts.dx !== undefined) ? opts.dx : W);
            ey = C[1] - ((opts.dy !== undefined) ? opts.dy : 0);
        } else {
            throw new Error("unknown type " + type);
        }

        // 3) parent first (tutorial order), keep visual placement
        var q;
        for (q = 0; q < layers.length; q++) {
            if (layers[q] === N) continue;
            layers[q].parent = N;
            try { layers[q].motionBlur = true; } catch (e3) {}
        }
        if (opts.chain) { opts.chain.parent = N; }

        // 4) keys: Position separated into X/Y (as in the tutorial), Scale, Rotation
        tr.property("ADBE Position").dimensionsSeparated = true;
        var px = tr.property("ADBE Position_0"), py = tr.property("ADBE Position_1");
        ntKey2(px, tIn, C[0], t1, ex, infl);
        ntKey2(py, tIn, C[1], t1, ey, infl);
        ntKey2(tr.property("ADBE Scale"), tIn, [100, 100, 100], t1, [es, es, 100], infl);
        ntKey2(tr.property("ADBE Rotate Z"), tIn, 0, t1, er, infl);

        // 5) optional opacity 0->100 on the incoming base clip (~3 f before the beat)
        if (opts.fadeLayer) {
            var fa = (opts.fadeAt !== undefined) ? opts.fadeAt : opts.fadeLayer.inPoint;
            var ff = opts.fadeFrames ? opts.fadeFrames : 3;
            var op = opts.fadeLayer.property("ADBE Transform Group").property("ADBE Opacity");
            ntKey2(op, fa, 0, fa + ff * fd, 100, 33);
        }

        // 6) motion blur
        comp.motionBlur = true;
        var sh = opts.shutter ? opts.shutter : 180;
        comp.shutterAngle = sh; comp.shutterPhase = -sh / 2;

        ntLog(N.name + " " + type + " end x=" + ex.toFixed(1) + " y=" + ey.toFixed(1) + " s=" + es.toFixed(1) + " r=" + er.toFixed(1));
        return N;
    } catch (e) {
        ntLog("ERROR " + String(e.message) + " L" + e.line);
        return null;
    }
}
