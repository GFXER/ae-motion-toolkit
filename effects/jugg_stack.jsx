// jugg_stack.jsx : naevisvfx "jugg edit" look as an ES3 helper (stock + Sapphire only).
// Guide: private study notes (not included) -> "naevisvfx jugg-edit stack" (values are our defaults;
// the reference showed effect names only).
//
// Usage:
//   #include "jugg_stack.jsx"
//   juggStack(comp, [2.10, 4.35, 6.60], {hitFrames: 5, blur: 30});
// Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _jgo(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }

function _jgTry(fx, mn) {
    try { fx.addProperty(mn); return true; }
    catch (e) { $.writeln("juggStack: missing " + mn + ": " + String(e.message) + " L" + e.line); return false; }
}

function juggStack(comp, hitTimes, opts) {
    var fd = comp.frameDuration;
    // 1) base look: Minimax jitter + glow
    var base = comp.layers.addSolid([1, 1, 1], "ADJ_JUGG", comp.width, comp.height, comp.pixelAspect, comp.duration);
    base.adjustmentLayer = true; base.label = LBL.ADJ;
    var bfx = base.property("ADBE Effect Parade");
    bfx.addProperty("ADBE Minimax");
    var hasGlow = _jgTry(bfx, "S_Glow");
    var mm = bfx.property(1);                                         // fetch after adds
    mm.property(2).expression = "Math.max(0, Math.min(3, Math.round(wiggle(12, 2))))"; // radius jitter
    if (hasGlow) bfx.property(2).enabled = true;

    // 2) per-hit layers: S_Shake + radial zoom blur + S_Flicker, hitFrames long
    var hf = _jgo(opts, "hitFrames", 5), out = [];
    for (var h = 0; h < hitTimes.length; h++) {
        var t = hitTimes[h];
        var L = comp.layers.addSolid([1, 1, 1], "ADJ_JUGG_HIT_" + (h + 1), comp.width, comp.height, comp.pixelAspect, comp.duration);
        L.adjustmentLayer = true; L.label = LBL.ADJ;
        L.inPoint = t; L.outPoint = t + hf * fd;
        var fx = L.property("ADBE Effect Parade");
        _jgTry(fx, "S_Shake");
        var hasRB = _jgTry(fx, "CC Radial Fast Blur");
        _jgTry(fx, "S_Flicker");
        // fetch after adds: animate the radial blur amount from blur -> 0 over the hit
        if (hasRB) {
            for (var q = 1; q <= fx.numProperties; q++) {
                if (fx.property(q).matchName === "CC Radial Fast Blur") {
                    var amt = fx.property(q).property(2);                  // Amount
                    amt.setValueAtTime(t, _jgo(opts, "blur", 30));
                    amt.setValueAtTime(t + hf * fd, 0);
                    amt.setTemporalEaseAtKey(2, [new KeyframeEase(0, 85)], [new KeyframeEase(0, 33)]);
                }
            }
        }
        out.push(L);
    }
    return {base: base, hits: out};
}
