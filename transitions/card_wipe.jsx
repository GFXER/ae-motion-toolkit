// card_wipe.jsx : Sundx "Card Wipe Transition" as an ES3 helper (stock ADBE Card Wipe, no plugins).
// Guide: private study notes (not included)
//
// Tutorial @24 fps: Completion 0 -> 100 % over f6 -> f26 (bell speed graph), rows 9 / cols 12, Flip Axis X,
// Flip Direction Random, Flip Order Top to Bottom, Timing Randomness 0.78, Transition Width 40 %;
// Position Jitter X/Y/Z 0 -> 0.25/0.40/0.67 -> 0 and X Rot Jitter 0 -> 12.5 -> 0 over the second half.
//
// Usage:
//   #include "card_wipe.jsx"
//   var fx = cardWipe(comp, clipA, clipB, tStart, 50, {});        // 60 fps = 50 f; 9:16 -> rows 16 cols 9 auto
//   opts: rows, cols, width (40), axis (1 X, 2 Y, 3 Random), dir (3 Random), order (3 Top to Bottom),
//         rand (0.78), jitter [0.25,0.40,0.67,12.5], peakFrac (0.5 = tutorial bell; 1/3 = our 1:2), seed (1)
// Params are fetched by English display name (AE in English). Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _cwo(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }

function _cwp(fx, name) {
    var p = null;
    try { p = fx.property(name); } catch (e) { p = null; }
    if (!p) $.writeln("cardWipe: param not found: " + name);
    return p;
}

function _cwSet(fx, name, v) { var p = _cwp(fx, name); if (p) { try { p.setValue(v); } catch (e) { $.writeln("cardWipe set " + name + ": " + String(e.message) + " L" + e.line); } } }

function _cwEase(p, inInf, outInf) {
    for (var k = 1; k <= p.numKeys; k++) p.setTemporalEaseAtKey(k, [new KeyframeEase(0, inInf)], [new KeyframeEase(0, outInf)]);
}

function cardWipe(comp, layerA, layerB, tStart, durFrames, opts) {
    var fd = comp.frameDuration;
    var dur = (durFrames || Math.round(0.83 / fd)) * fd;
    var t1 = tStart + dur;
    var tall = comp.height > comp.width;
    var pf = _cwo(opts, "peakFrac", 0.5);

    if (layerB.index < layerA.index) layerA.moveBefore(layerB);          // A must be above B
    if (layerB.inPoint > tStart) layerB.inPoint = tStart;

    var fx = layerA.property("ADBE Effect Parade").addProperty("ADBE Card Wipe");
    fx.name = "Card Wipe (CW)";
    _cwSet(fx, "Transition Width", _cwo(opts, "width", 40));
    _cwSet(fx, "Back Layer", layerB.index);
    _cwSet(fx, "Rows & Columns", 1);                                       // Independent
    _cwSet(fx, "Rows", _cwo(opts, "rows", tall ? 16 : 9));
    _cwSet(fx, "Columns", _cwo(opts, "cols", tall ? 9 : 12));
    _cwSet(fx, "Card Scale", 1);
    _cwSet(fx, "Flip Axis", _cwo(opts, "axis", 1));
    _cwSet(fx, "Flip Direction", _cwo(opts, "dir", 3));
    _cwSet(fx, "Flip Order", _cwo(opts, "order", 3));
    _cwSet(fx, "Timing Randomness", _cwo(opts, "rand", 0.78));
    _cwSet(fx, "Random Seed", _cwo(opts, "seed", 1));

    // completion: bell (pf 0.5) or front-loaded 1:2 (pf 1/3)
    var c = _cwp(fx, "Transition Completion");
    if (c) {
        c.setValueAtTime(tStart, 0); c.setValueAtTime(t1, 100);
        var o = 70, i = 70;
        if (pf < 0.5) { o = 40; i = 95; }
        c.setTemporalEaseAtKey(1, [new KeyframeEase(0, 33)], [new KeyframeEase(0, o)]);
        c.setTemporalEaseAtKey(2, [new KeyframeEase(0, i)], [new KeyframeEase(0, 33)]);
    }

    // jitter: 0 at 30 % -> peak at 65 % -> 0 at end (tutorial f12 / f19 / f26 of a f6..f26 move)
    var jv = _cwo(opts, "jitter", [0.25, 0.40, 0.67, 12.5]);
    var jn = ["X Jitter Amount", "Y Jitter Amount", "Z Jitter Amount", "X Rot Jitter Amount"];
    var ja = tStart + dur * 0.3, jp = tStart + dur * (pf < 0.5 ? 0.5 : 0.65);
    for (var q = 0; q < jn.length; q++) {
        var p = _cwp(fx, jn[q]);
        if (!p) continue;
        p.setValueAtTime(ja, 0); p.setValueAtTime(jp, jv[q]); p.setValueAtTime(t1, 0);
        _cwEase(p, 60, 60);
    }

    layerA.motionBlur = true; comp.motionBlur = true;
    return fx;
}
