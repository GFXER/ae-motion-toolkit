// black_bars_depth.jsx : black bars with depth (subject breaks out over the bars), ES3 helper.
// Guide: private study notes (not included)
//
// Stack (top -> bottom): MATTE_BB_n (luma matte) / VID_BB_SUBJ_n (footage dup, drop shadow, +scale)
//                        / SHP_BB_BARS_n (black solid + CC Jaws + Turbulent Displace)  [mode "jaws"]
//                        / footageLayer (BG)      [mode "tile": Motion Tile on BG + SHP_BB_BLACK_n behind]
// FicTic values: Jaws Completion 77 %, Direction 0, Height 0 %, Width 10, Shape Block; Turbulent Displace
// Amount 30, Size 20, Complexity 9, Pin All.
//
// Usage:
//   #include "black_bars_depth.jsx"
//   var r = blackBarsDepth(comp, vid, matteLayer, 3.20, {mode: "jaws", open: 77, inFrames: 7,
//                          outT: 5.10, outFrames: 14, dir: 0, rough: true, subjScale: 103});
//   matteLayer: a Vision matte (tools/matte_subject, 1080x1920) already in the comp; set to 200 % here if smaller.
// Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _bbo(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }

// ease helper: works for 1D and multi-D props (2D-layer Scale may want 2 or 3 eases)
function _bbEase(p, k, inInf, outInf) {
    var v = p.keyValue(k), n = (v instanceof Array) ? v.length : 1;
    for (var tries = 0; tries < 2; tries++) {
        var a = [], b = [];
        for (var q = 0; q < n; q++) { a.push(new KeyframeEase(0, inInf)); b.push(new KeyframeEase(0, outInf)); }
        try { p.setTemporalEaseAtKey(k, a, b); return; }
        catch (e) { if (n <= 1) { $.writeln("bb ease: " + String(e.message) + " L" + e.line); return; } n = (n === 3) ? 2 : (n === 2 ? 1 : 2); }
    }
}
// expo-out pair of keys: fast start, long settle
function _bbExpo(p, t0, t1, v0, v1) {
    p.setValueAtTime(t0, v0); p.setValueAtTime(t1, v1);
    _bbEase(p, p.nearestKeyIndex(t0), 33, 10);
    _bbEase(p, p.nearestKeyIndex(t1), 95, 33);
}
// expo-in (accelerating out)
function _bbExpoIn(p, t0, t1, v0, v1) {
    p.setValueAtTime(t0, v0); p.setValueAtTime(t1, v1);
    _bbEase(p, p.nearestKeyIndex(t0), 33, 90);
    _bbEase(p, p.nearestKeyIndex(t1), 10, 33);
}

function blackBarsDepth(comp, footageLayer, matteLayer, tIn, opts) {
    var fd = comp.frameDuration, W = comp.width, H = comp.height;
    var n = 1;
    for (var q = 1; q <= comp.numLayers; q++) { if (comp.layer(q).name.indexOf("SHP_BB_") === 0) n++; }
    var mode = _bbo(opts, "mode", "jaws");
    var open = _bbo(opts, "open", 77);                       // jaws completion (or tile output %) when bars are in
    var tA = tIn + _bbo(opts, "inFrames", 7) * fd;
    var outT = _bbo(opts, "outT", null), outF = _bbo(opts, "outFrames", 14);
    var tStart = footageLayer.inPoint, tEnd = footageLayer.outPoint;
    var res = {bg: footageLayer, bars: null, subject: null, matte: matteLayer};
    footageLayer.label = LBL.VIDEO;

    // --- bars
    if (mode === "tile") {
        var blk = comp.layers.addSolid([0, 0, 0], "SHP_BB_BLACK_" + n, W, H, comp.pixelAspect, comp.duration);
        blk.label = LBL.SHAPE; blk.inPoint = tStart; blk.outPoint = tEnd;
        blk.moveAfter(footageLayer);
        var tfx = footageLayer.property("ADBE Effect Parade");
        tfx.addProperty("ADBE Tile");
        var mt = tfx.property(tfx.numProperties);           // fetch after add (last effect)
        mt.name = "BB Motion Tile";
        var dirT = _bbo(opts, "dir", 0);
        var outP = mt.property(dirT === 90 ? 4 : 5);           // 4 Output Width (pillars), 5 Output Height (letterbox)
        _bbExpo(outP, tIn, tA, 100, open);
        if (outT !== null) _bbExpoIn(outP, outT, outT + outF * fd, open, 100);
        res.bars = blk;
    } else {
        var bars = comp.layers.addSolid([0, 0, 0], "SHP_BB_BARS_" + n, W, H, comp.pixelAspect, comp.duration);
        bars.label = LBL.SHAPE; bars.inPoint = tStart; bars.outPoint = tEnd;
        bars.moveBefore(footageLayer);
        var bfx = bars.property("ADBE Effect Parade");
        bfx.addProperty("CC Jaws");
        var rough = _bbo(opts, "rough", true);
        if (rough) bfx.addProperty("ADBE Turbulent Displace");
        var jw = bfx.property(1);                               // fetch after all adds
        jw.property(2).setValue([W / 2, H / 2]);                // Center
        jw.property(3).setValue(_bbo(opts, "dir", 0));          // Direction (0 = top/bottom, 90 = pillars)
        jw.property(4).setValue(_bbo(opts, "teeth", 0));        // Height % (0 = straight)
        jw.property(5).setValue(_bbo(opts, "width", 10));       // Width
        try { jw.property(6).setValue(_bbo(opts, "shape", 3)); } // Shape: 1 Spikes 2 RoboJaw 3 Block 4 Waves (check)
        catch (e) { $.writeln("bb jaws shape: " + String(e.message) + " L" + e.line); }
        var comp1 = jw.property(1);                             // Completion
        _bbExpo(comp1, tIn, tA, 100, open);
        if (outT !== null) _bbExpoIn(comp1, outT, outT + outF * fd, open, 100);
        if (rough) {
            var td = bfx.property(2);
            td.property(2).setValue(30);                        // Amount
            td.property(3).setValue(20);                        // Size
            td.property(5).setValue(9);                         // Complexity
        }
        res.bars = bars;
    }

    // --- subject on top: footage dup + luma matte
    var subj = footageLayer.duplicate();
    subj.name = "VID_BB_SUBJ_" + n; subj.label = LBL.VIDEO;
    // drop the BG-only Motion Tile from the copy
    var sfx = subj.property("ADBE Effect Parade");
    for (var k = sfx.numProperties; k >= 1; k--) { if (sfx.property(k).name === "BB Motion Tile") sfx.property(k).remove(); }
    subj.moveToBeginning();
    if (matteLayer) {
        matteLayer.name = "MATTE_BB_" + n; matteLayer.label = LBL.MATTE;
        if (matteLayer.width < W) matteLayer.property("ADBE Transform Group").property("ADBE Scale").setValue([200, 200]);
        matteLayer.parent = subj;                               // matte follows the subject's scale offset
        var done = false;
        try { subj.setTrackMatte(matteLayer, TrackMatteType.LUMA); done = true; }     // AE 23+
        catch (e2) { $.writeln("bb setTrackMatte fallback: " + String(e2.message) + " L" + e2.line); }
        if (!done) { matteLayer.moveBefore(subj); subj.trackMatteType = TrackMatteType.LUMA; }
    }
    sfx.addProperty("ADBE Drop Shadow");
    var ds = sfx.property(sfx.numProperties);                   // fetch after add
    ds.property(2).setValue(_bbo(opts, "shadowOpacity", 40) * 2.55);  // opacity (0-255 internally)
    ds.property(3).setValue(180);                               // direction
    ds.property(4).setValue(_bbo(opts, "shadowDist", 30));      // distance
    ds.property(5).setValue(_bbo(opts, "shadowSoft", 80));      // softness
    var ss = _bbo(opts, "subjScale", 103);
    var sc = subj.property("ADBE Transform Group").property("ADBE Scale");
    var base = sc.value;
    _bbExpo(sc, tIn, tA, base, [base[0] * ss / 100, base[1] * ss / 100]);
    res.subject = subj;
    comp.motionBlur = true; subj.motionBlur = true;
    return res;
}
