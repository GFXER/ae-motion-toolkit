// motion_mosh.jsx : yuhhta "Motion Mosh Transition" rebuilt from effects we own (ES3, no Red Giant Universe).
// Guide: private study notes (not included)
//
// Tutorial (20 fps): ADJ layer over both clips, Opacity 0 -> 100 -> 0 over 5 f + 10 f (peak = cut), with
// Glitchify + Signal (chroma loss) + Motion Mosh; 3-4 one-frame slivers of B laid over A before the cut.
// Ours: ADJ_MOSH_n = Displacement Map (map = PC_MOSH_MAP_n: B diff B-1f, macroblocked, grey-biased)
//       + Tint (chroma loss) + Exposure (darker) [+ Sapphire S_DigitalDamage if installed].
//
// Usage:
//   #include "motion_mosh.jsx"
//   var r = motionMosh(comp, clipA, clipB, cutSeconds, 45, {});   // 60 fps: 15 f in -> 30 f out (1:2)
//   opts: inFrac (1/3), dispPct (7 = % of comp width), blocks (32 across), tint (55), expo (-0.5),
//         slivers (3, 0 = none; needs handles on B), sapphire (true), name suffix (auto).
// Returns {adj, map, slivers[]}. Not yet run in AE: check frames with aerender first.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _moshOpt(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }

function _moshCount(comp) {
    var n = 0;
    for (var q = 1; q <= comp.numLayers; q++) { if (comp.layer(q).name.indexOf("ADJ_MOSH_") === 0) n++; }
    return n + 1;
}

// Motion-vector stand-in: |B(t) - B(t-1f)|, macroblocked, boosted, + 50 % grey so a static area = no shift.
function _moshMapComp(comp, layerB, n, blocks) {
    var fd = comp.frameDuration;
    var mc = app.project.items.addComp("PC_MOSH_MAP_" + n, comp.width, comp.height, comp.pixelAspect, comp.duration, comp.frameRate);
    var src = layerB.source;
    var late = mc.layers.add(src);              // delayed copy (bottom)
    late.stretch = layerB.stretch; late.startTime = layerB.startTime + fd; late.name = "VID_B_DELAY";
    var now = mc.layers.add(src);               // current copy (top), Difference
    now.stretch = layerB.stretch; now.startTime = layerB.startTime; now.name = "VID_B_NOW";
    now.blendingMode = BlendingMode.DIFFERENCE;
    late.label = LBL.VIDEO; now.label = LBL.VIDEO;
    var a = mc.layers.addSolid([1, 1, 1], "ADJ_BLOCKS", mc.width, mc.height, 1, mc.duration);
    a.adjustmentLayer = true; a.label = LBL.ADJ;
    var fx = a.property("ADBE Effect Parade");
    fx.addProperty("ADBE Mosaic");
    fx.addProperty("ADBE Exposure2");           // add all effects first, THEN fetch params
    var mo = fx.property(1), ex = fx.property(2);
    mo.property(1).setValue(blocks);
    mo.property(2).setValue(Math.max(1, Math.round(blocks * mc.height / mc.width)));
    mo.property(3).setValue(1);                 // sharp colours
    ex.property(3).setValue(3.0);               // amplify small differences
    var g = mc.layers.addSolid([0.5, 0.5, 0.5], "SHP_GREY_BIAS", mc.width, mc.height, 1, mc.duration);
    g.blendingMode = BlendingMode.ADD; g.label = LBL.SHAPE;
    return mc;
}

function motionMosh(comp, layerA, layerB, tCut, durFrames, opts) {
    var fd = comp.frameDuration;
    var n = _moshCount(comp);
    var dur = durFrames || Math.round(0.75 / fd);
    var inF = Math.max(2, Math.round(dur * _moshOpt(opts, "inFrac", 1 / 3)));
    var outF = Math.max(inF * 2, dur - inF);
    var t0 = tCut - inF * fd, t2 = tCut + outF * fd;
    var res = {adj: null, map: null, slivers: []};

    // 1) slivers of B over the end of A (1 f each at cut-2, -4, -6 f)
    var ns = _moshOpt(opts, "slivers", 3);
    for (var s = 1; s <= ns; s++) {
        var d = layerB.duplicate();
        d.inPoint = tCut - (2 * s) * fd; d.outPoint = d.inPoint + fd;
        d.name = "VID_MOSH_SLIVER_" + n + "_" + s; d.label = LBL.VIDEO;
        if (layerA.index < d.index) d.moveBefore(layerA);
        res.slivers.push(d);
    }

    // 2) displacement map precomp (hidden layer in the main comp)
    var map = null;
    if (layerB.source instanceof AVItem) {
        var mc = _moshMapComp(comp, layerB, n, _moshOpt(opts, "blocks", 32));
        map = comp.layers.add(mc);
        map.name = "MATTE_MOSH_MAP_" + n; map.label = LBL.MATTE; map.enabled = false;
        map.startTime = 0; map.inPoint = t0; map.outPoint = t2;
    }
    res.map = map;

    // 3) the ADJ layer
    var adj = comp.layers.addSolid([1, 1, 1], "ADJ_MOSH_" + n, comp.width, comp.height, comp.pixelAspect, comp.duration);
    adj.adjustmentLayer = true; adj.label = LBL.ADJ;
    adj.inPoint = t0; adj.outPoint = t2;
    var top = layerA.index < layerB.index ? layerA : layerB;
    for (var k = 0; k < res.slivers.length; k++) { if (res.slivers[k].index < top.index) top = res.slivers[k]; }
    adj.moveBefore(top);

    var fx = adj.property("ADBE Effect Parade");
    var hasDM = (map !== null);
    if (hasDM) fx.addProperty("ADBE Displacement Map");
    fx.addProperty("ADBE Tint");
    fx.addProperty("ADBE Exposure2");
    var hasSaph = false;
    if (_moshOpt(opts, "sapphire", true)) {
        try { fx.addProperty("S_DigitalDamage"); hasSaph = true; }
        catch (e) { $.writeln("motionMosh: no S_DigitalDamage: " + String(e.message) + " L" + e.line); }
    }
    // fetch AFTER all adds
    var idx = 1;
    if (hasDM) {
        var dm = fx.property(idx++);
        var px = comp.width * _moshOpt(opts, "dispPct", 7) / 100;
        dm.property(1).setValue(map.index);     // map layer
        dm.property(2).setValue(5);             // horizontal: Luminance
        dm.property(3).setValue(px);
        dm.property(4).setValue(1);             // vertical: Red (blocky, decorrelated)
        dm.property(5).setValue(px * 0.6);
        dm.property(6).setValue(2);             // map behaviour: Stretch
        dm.property(7).setValue(1);             // edge behaviour: wrap pixels (no black edges)
    }
    var tn = fx.property(idx++);
    tn.property(3).setValue(_moshOpt(opts, "tint", 55));   // chroma loss
    var ex = fx.property(idx++);
    ex.property(3).setValue(_moshOpt(opts, "expo", -0.5)); // "more dark"
    if (hasSaph) fx.property(idx).name = "S_DigitalDamage (tune)";

    // 4) opacity 0 -> 100 (accelerating) -> 0 (long eased tail); everything rides this curve
    var op = adj.property("ADBE Transform Group").property("ADBE Opacity");
    op.setValueAtTime(t0, 0); op.setValueAtTime(tCut, 100); op.setValueAtTime(t2, 0);
    op.setTemporalEaseAtKey(1, [new KeyframeEase(0, 33)], [new KeyframeEase(0, 75)]);
    op.setTemporalEaseAtKey(2, [new KeyframeEase(0, 20)], [new KeyframeEase(0, 20)]);
    op.setTemporalEaseAtKey(3, [new KeyframeEase(0, 85)], [new KeyframeEase(0, 33)]);

    res.adj = adj;
    return res;
}
