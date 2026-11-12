// timeremap_warp.jsx : kouzfxs "twix/time remap + warp puddle" as ES3 helpers (no Twixtor).
// Guide: private study notes (not included)
//
// flowRemap: Time Remap with the Flow curve cubic-bezier(0, .85, .27, .94) = burst then long glide,
//            Pixel Motion frame blending, optional reverse tail (N source frames back so it never goes stiff).
// warpPuddle: ADJ_WARP_n with Sapphire S_WarpPuddle (Amplitude 0 -> 0.06 in ~4 f, long decay; Frequency 1.7,
//            Rel Height 0.75, Inner Softness 96, Outer Radius/Softness max) + Transform scale bump.
//            Falls back to stock Ripple if Sapphire is missing.
//
// Usage:
//   #include "timeremap_warp.jsx"
//   flowRemap(comp, clip, 4.0, 1.20, 2.10, 80, {revSrcFrames: 3, revFrames: 8});
//   warpPuddle(comp, 4.0, {amp: 0.06, attackF: 5, decayF: 100, scale: 104});
// Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _trwo(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }

function flowRemap(comp, layer, tStart, srcA, srcB, durFrames, opts) {
    var fd = comp.frameDuration;
    var dur = (durFrames || 60) * fd, t1 = tStart + dur;
    var srcFd = (layer.source && layer.source.frameDuration) ? layer.source.frameDuration : fd;
    layer.timeRemapEnabled = true;
    var tr = layer.property("ADBE Time Remapping");
    for (var k = tr.numKeys; k >= 1; k--) tr.removeKey(k);
    tr.setValueAtTime(tStart, srcA);
    tr.setValueAtTime(t1, srcB);
    var rate = (srcB - srcA) / dur;                    // source s per comp s (average)
    // bezier (0,.85) -> out influence ~10 %, speed 8.5x avg ; (.27,.94) -> in influence 73 %, speed 0.082x avg
    tr.setTemporalEaseAtKey(1, [new KeyframeEase(0, 33)], [new KeyframeEase(rate * 8.5, 10)]);
    tr.setTemporalEaseAtKey(2, [new KeyframeEase(rate * 0.082, 73)], [new KeyframeEase(0, 50)]);
    var tEnd = t1;
    var rs = _trwo(opts, "revSrcFrames", 3);
    if (rs > 0) {
        tEnd = t1 + _trwo(opts, "revFrames", 8) * fd;
        tr.setValueAtTime(tEnd, srcB - rs * srcFd);
        tr.setTemporalEaseAtKey(2, [new KeyframeEase(rate * 0.082, 73)], [new KeyframeEase(0, 50)]);
        tr.setTemporalEaseAtKey(3, [new KeyframeEase(0, 60)], [new KeyframeEase(0, 33)]);
    }
    if (layer.outPoint < tEnd) layer.outPoint = tEnd;
    try { layer.frameBlendingType = FrameBlendingType.PIXEL_MOTION; comp.frameBlending = true; }
    catch (e) { $.writeln("flowRemap blend: " + String(e.message) + " L" + e.line); }
    return tr;
}

function _trwSet(fx, name, v) {
    var p = null;
    try { p = fx.property(name); } catch (e) { p = null; }
    if (!p) { $.writeln("warpPuddle: no param " + name); return null; }
    try { if (v !== null) p.setValue(v); } catch (e2) { $.writeln("warpPuddle set " + name + ": " + String(e2.message) + " L" + e2.line); }
    return p;
}

function _trwEnv(p, t0, tp, t2, v0, vp) {
    p.setValueAtTime(t0, v0); p.setValueAtTime(tp, vp); p.setValueAtTime(t2, v0);
    var n = (p.value instanceof Array) ? p.value.length : 1;
    var eA = [], eB = [], eC = [], eD = [];
    for (var q = 0; q < n; q++) { eA.push(new KeyframeEase(0, 33)); eB.push(new KeyframeEase(0, 60)); eC.push(new KeyframeEase(0, 20)); eD.push(new KeyframeEase(0, 85)); }
    p.setTemporalEaseAtKey(1, eA, eB);    // fast attack
    p.setTemporalEaseAtKey(2, eC, eB);    // sharp-ish peak
    p.setTemporalEaseAtKey(3, eD, eA);    // long settle
}

function warpPuddle(comp, tHit, opts) {
    var fd = comp.frameDuration;
    var n = 1;
    for (var q = 1; q <= comp.numLayers; q++) { if (comp.layer(q).name.indexOf("ADJ_WARP_") === 0) n++; }
    var aF = _trwo(opts, "attackF", 5), dF = _trwo(opts, "decayF", 100);
    var t0 = tHit - aF * fd, t2 = tHit + dF * fd;
    var adj = comp.layers.addSolid([1, 1, 1], "ADJ_WARP_" + n, comp.width, comp.height, comp.pixelAspect, comp.duration);
    adj.adjustmentLayer = true; adj.label = LBL.ADJ; adj.inPoint = t0; adj.outPoint = t2 + fd;

    var fxs = adj.property("ADBE Effect Parade");
    var saph = true;
    try { fxs.addProperty("S_WarpPuddle"); }
    catch (e) { saph = false; $.writeln("warpPuddle: no Sapphire, Ripple fallback: " + String(e.message) + " L" + e.line); fxs.addProperty("ADBE Ripple"); }
    fxs.addProperty("ADBE Geometry2");                 // all effects added; now fetch
    var w = fxs.property(1), tf = fxs.property(2);

    if (saph) {
        _trwSet(w, "Frequency", _trwo(opts, "freq", 1.7));
        _trwSet(w, "Rel Height", 0.75);
        _trwSet(w, "Inner Radius", 0);
        _trwSet(w, "Inner Softness", 96);
        _trwSet(w, "Outer Radius", 32767);
        _trwSet(w, "Outer Softness", 32767);
        _trwSet(w, "Phase Start", _trwo(opts, "phase", 0));
        var amp = _trwSet(w, "Amplitude", null);
        if (amp) _trwEnv(amp, t0, tHit, t2, 0, _trwo(opts, "amp", 0.06));
    } else {
        w.property(1).setValue(100);                   // Radius %
        w.property(5).setValue(140);                   // Wave Width
        _trwEnv(w.property(6), t0, tHit, t2, 0, _trwo(opts, "rippleH", 60)); // Wave Height
    }
    var sc = tf.property("ADBE Geometry2-0003");
    _trwEnv(sc, t0, tHit, t2, 100, _trwo(opts, "scale", 104));
    return adj;
}
