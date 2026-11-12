// ui_shape_morph.jsx : NaughtyyJuan "Apple Style UI Shape Morphing" as a reusable ExtendScript helper (ES3).
// Guide: private study notes (not included)
//
// Idea: ONE rounded-rectangle shape layer morphs between UI states by keying the Rect PATH Size (W/H unlinked)
// + Roundness + Fill Color (never non-uniform layer scale: it squashes the corners). Content (icons/text) lives
// in child nulls under a main null and is scaled/moved/faded on the SAME frames with the SAME curve.
// Curve from his Flow panel: cubic-bezier 0.90,0.01,0.06,1.00 (steep S). Motion blur on.
//
// Usage:
//   #include "ui_shape_morph.jsx"
//   var card = uiCard(comp, {w: 360, h: 360, round: 90, color: [1,1,1], pos: [1080, 2900], name: "PLAYER"});
//   var gMain = uiGroup(comp, [card, icoPlay, txtTitle, imgCover], "MAIN");             // scales whole UI
//   var gAir  = uiGroup(comp, [icoAir, txtAir], "AIRPLAY", gMain);
//   uiMorph(card, 2.0, 30, {w: 1700, h: 1500, round: 70, color: [0.12,0.12,0.13]});    // 30 f @60 = 0.5 s
//   uiMoveGroup(gAir, 2.0, 30, 110, [1080, 2600]);                                       // same frames
//   uiFade([icoAir, txtAir], 2.0, 30, 100, 0);
//   var st = uiStencilRound(coverPrecomp, 120); uiKey1(st.round, 2.0, 120, 2.5, 60);     // cover less round
// Circle: round >= min(w,h)/2 (AE clamps). Colours are [r,g,b] 0..1.
// NOTE: written 2026-10-20, NOT yet run in AE. Test once in a scratch comp before using in a build.

var UM_LBL_CONTROL = (typeof LBL !== "undefined" && LBL.CONTROL) ? LBL.CONTROL : 1;
var UM_LBL_SHAPE = (typeof LBL !== "undefined" && LBL.SHAPE) ? LBL.SHAPE : 4;
var UM_LBL_MATTE = (typeof LBL !== "undefined" && LBL.MATTE) ? LBL.MATTE : 7;
var UM_CURVE = [0.90, 0.01, 0.06, 1.00];          // Flow "morph" curve from the tutorial
var UM_CURVE_EXPO = [0.00, 0.68, 0.45, 0.99];     // intro/expo-out curve seen at 1:35

function umLog(msg) { try { $.writeln("[ui_shape_morph] " + msg); } catch (e) {} }
function umClampInf(v) { return Math.max(0.1, Math.min(100, v)); }
function umIsArr(v) { return (v instanceof Array) || (typeof v === "object" && v !== null && v.length !== undefined); }
function umToArr(v) { if (umIsArr(v)) { var a = [], q; for (q = 0; q < v.length; q++) a.push(v[q]); return a; } return [v]; }

// Convert a Flow/CSS cubic-bezier (x1,y1,x2,y2) into AE ease for one segment of one dimension.
// slope = (v1 - v0) / dur  (units per second)
function umBezierEase(curve, slope) {
    var x1 = Math.max(curve[0], 0.001), y1 = curve[1], x2 = Math.min(curve[2], 0.999), y2 = curve[3];
    var outInf = umClampInf(x1 * 100), inInf = umClampInf((1 - x2) * 100);
    var outSpd = (y1 / x1) * slope, inSpd = ((1 - y2) / (1 - x2)) * slope;
    return {outE: new KeyframeEase(outSpd, outInf), inE: new KeyframeEase(inSpd, inInf)};
}

// Key prop from its current value at t0 to v1 at t0+frames with a bezier curve. Handles 1D, multi-D, spatial, colour.
function umKeyCurve(prop, t0, frames, v1, curve) {
    var comp = null;
    try { comp = prop.propertyGroup(prop.propertyDepth).containingComp; } catch (e0) {}
    var fd = comp ? comp.frameDuration : (1 / 60);
    var t1 = t0 + frames * fd, dur = t1 - t0;
    curve = curve || UM_CURVE;
    var v0 = prop.valueAtTime(t0, false);
    var k0 = prop.addKey(t0); prop.setValueAtKey(k0, v0);
    var k1 = prop.addKey(t1); prop.setValueAtKey(k1, v1);
    k0 = prop.nearestKeyIndex(t0); k1 = prop.nearestKeyIndex(t1);
    try {
        prop.setInterpolationTypeAtKey(k0, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
        prop.setInterpolationTypeAtKey(k1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
    } catch (e1) {}
    var a0 = umToArr(v0), a1 = umToArr(v1), d, outs = [], ins = [], e;
    var spatial = false;
    try { spatial = prop.isSpatial; } catch (e2) {}
    if (spatial) {                                   // spatial: one scalar path speed
        var dist = 0;
        for (d = 0; d < a0.length; d++) dist += (a1[d] - a0[d]) * (a1[d] - a0[d]);
        e = umBezierEase(curve, Math.sqrt(dist) / dur);
        outs = [e.outE]; ins = [e.inE];
        var z0 = [0, 0, 0].slice(0, a0.length);     // straight path between the two keys
        try { prop.setSpatialTangentsAtKey(k0, z0, z0); prop.setSpatialTangentsAtKey(k1, z0, z0); } catch (e3) {}
    } else {
        for (d = 0; d < a0.length; d++) {
            e = umBezierEase(curve, (a1[d] - a0[d]) / dur);
            outs.push(e.outE); ins.push(e.inE);
        }
    }
    var ok = false;
    try { prop.setTemporalEaseAtKey(k0, outs, outs); ok = true; } catch (e4) {}
    if (ok) { try { prop.setTemporalEaseAtKey(k1, ins, ins); } catch (e5) { ok = false; } }
    if (!ok) {                                       // colour / odd dims: fall back to 1 ease with speed 0
        var o1 = [new KeyframeEase(0, umClampInf(curve[0] * 100))];
        var i1 = [new KeyframeEase(0, umClampInf((1 - curve[2]) * 100))];
        try { prop.setTemporalEaseAtKey(k0, i1, o1); prop.setTemporalEaseAtKey(k1, i1, o1); }
        catch (e6) { umLog("ease failed on " + prop.name + ": " + String(e6.message)); }
    }
    return [k0, k1];
}
// simple 2-key helper with explicit values (e.g. stencil roundness)
function uiKey1(prop, tA, vA, tB, vB, curve) {
    var k = prop.addKey(tA); prop.setValueAtKey(k, vA);
    var comp = null;
    try { comp = prop.propertyGroup(prop.propertyDepth).containingComp; } catch (e) {}
    var fd = comp ? comp.frameDuration : (1 / 60);
    return umKeyCurve(prop, tA, Math.round((tB - tA) / fd), vB, curve);
}

function umRectProps(card) {
    var g = card.property("ADBE Root Vectors Group").property(1);
    var vg = g.property("ADBE Vectors Group");
    var rect = null, fill = null, i2;
    for (i2 = 1; i2 <= vg.numProperties; i2++) {
        var p = vg.property(i2);
        if (p.matchName === "ADBE Vector Shape - Rect" && !rect) rect = p;
        if (p.matchName === "ADBE Vector Graphic - Fill" && !fill) fill = p;
    }
    return {
        size: rect.property("ADBE Vector Rect Size"),
        round: rect.property("ADBE Vector Rect Roundness"),
        rpos: rect.property("ADBE Vector Rect Position"),
        color: fill ? fill.property("ADBE Vector Fill Color") : null
    };
}

// uiCard(comp, opts) -> SHP_UI_<name> shape layer: one group, Rect path + Fill, anchor = centre
function uiCard(comp, opts) {
    opts = opts || {};
    var L = comp.layers.addShape();
    L.name = "SHP_UI_" + (opts.name ? opts.name : "CARD");
    L.label = UM_LBL_SHAPE;
    var root = L.property("ADBE Root Vectors Group");
    var g = root.addProperty("ADBE Vector Group");
    g.name = "UI Card";
    var vg = g.property("ADBE Vectors Group");
    vg.addProperty("ADBE Vector Shape - Rect");
    vg.addProperty("ADBE Vector Graphic - Fill");
    var P = umRectProps(L);                          // fetch AFTER all adds
    P.size.setValue([opts.w || 360, opts.h || 360]);
    P.round.setValue(opts.round !== undefined ? opts.round : 90);
    if (P.color) P.color.setValue(opts.color || [1, 1, 1]);
    var tr = L.property("ADBE Transform Group");
    tr.property("ADBE Anchor Point").setValue([0, 0]);
    tr.property("ADBE Position").setValue(opts.pos || [comp.width / 2, comp.height / 2]);
    try { L.motionBlur = true; comp.motionBlur = true; } catch (e) {}
    return L;
}

// uiMorph(card, t0, frames, state, curve): state {w,h,round,color,pos}; missing fields stay as they are
function uiMorph(card, t0, frames, state, curve) {
    try {
        var P = umRectProps(card);
        var cur = P.size.valueAtTime(t0, false);
        if (state.w !== undefined || state.h !== undefined)
            umKeyCurve(P.size, t0, frames, [state.w !== undefined ? state.w : cur[0], state.h !== undefined ? state.h : cur[1]], curve);
        if (state.round !== undefined) umKeyCurve(P.round, t0, frames, state.round, curve);
        if (state.color && P.color) {
            var c = state.color; umKeyCurve(P.color, t0, frames, [c[0], c[1], c[2], 1], curve);
        }
        if (state.pos) umKeyCurve(card.property("ADBE Transform Group").property("ADBE Position"), t0, frames, state.pos, curve);
    } catch (e) { umLog("uiMorph: " + String(e.message) + " L" + e.line); }
    return card;
}

// uiGroup(comp, layers, name, parentNull) -> CTRL_UI_<name> null at the layers' centre; parent BEFORE keys
function uiGroup(comp, layers, name, parentNull) {
    var N = comp.layers.addNull();
    N.name = "CTRL_UI_" + (name || "GROUP");
    N.label = UM_LBL_CONTROL;
    N.startTime = 0; N.inPoint = 0; N.outPoint = comp.duration;
    var cx = 0, cy = 0, n = 0, q;
    for (q = 0; q < layers.length; q++) {
        try { var p = layers[q].property("ADBE Transform Group").property("ADBE Position").value; cx += p[0]; cy += p[1]; n++; } catch (e) {}
    }
    var tr = N.property("ADBE Transform Group");
    tr.property("ADBE Anchor Point").setValue([50, 50]);  // null source is 100x100
    tr.property("ADBE Position").setValue(n ? [cx / n, cy / n] : [comp.width / 2, comp.height / 2]);
    if (parentNull) N.parent = parentNull;
    for (q = 0; q < layers.length; q++) { try { layers[q].parent = N; } catch (e2) { umLog("parent: " + String(e2.message)); } }
    return N;
}
function uiMoveGroup(N, t0, frames, scalePct, pos, curve) {
    var tr = N.property("ADBE Transform Group");
    if (scalePct !== undefined && scalePct !== null) umKeyCurve(tr.property("ADBE Scale"), t0, frames, [scalePct, scalePct], curve);
    if (pos) umKeyCurve(tr.property("ADBE Position"), t0, frames, pos, curve);
    return N;
}
function uiFade(layers, t0, frames, from, to, curve) {
    var q;
    for (q = 0; q < layers.length; q++) {
        var op = layers[q].property("ADBE Transform Group").property("ADBE Opacity");
        try { op.setValueAtTime(t0, from); umKeyCurve(op, t0, frames, to, curve); } catch (e) { umLog("fade: " + String(e.message)); }
    }
}

// Rounded corners on an image precomp (album cover): shape layer on top in Stencil Alpha.
// Returns {layer, size, round} so the caller can key roundness on the same frames as the morph.
function uiStencilRound(precomp, round) {
    var L = uiCard(precomp, {w: precomp.width, h: precomp.height, round: round || 60, color: [1, 1, 1], name: "STENCIL"});
    L.name = "MATTE_UI_STENCIL"; L.label = UM_LBL_MATTE;
    L.moveToBeginning();
    try { L.blendingMode = BlendingMode.STENCIL_ALPHA; } catch (e) { umLog("stencil: " + String(e.message)); }
    var P = umRectProps(L);
    return {layer: L, size: P.size, round: P.round};
}
