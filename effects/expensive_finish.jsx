// expensive_finish.jsx : NaughtyyJuan "expensive" finish micro-stack (S_Glow -> S-curve -> Sharpen 13 [+ grain]).
// Guide: private study notes (not included)
// Curves is not scriptable, so Brightness & Contrast stands in for the S-curve. Place UNDER the GRADE layer.
//
// Usage:
//   #include "expensive_finish.jsx"
//   var L = expensiveFinish(comp, {contrast: 10, sharpen: 13, grain: 1.6, glowMix: 15});
//   opts.grain 0 = no grain (use when the grade already has grain). Returns the ADJ layer. Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _efo(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }

function expensiveFinish(comp, opts) {
    var adj = comp.layers.addSolid([1, 1, 1], "ADJ_FINISH", comp.width, comp.height, comp.pixelAspect, comp.duration);
    adj.adjustmentLayer = true; adj.label = LBL.ADJ;
    var fx = adj.property("ADBE Effect Parade");
    var saph = true;
    try { fx.addProperty("S_Glow"); } catch (e) { saph = false; $.writeln("expensiveFinish: S_Glow missing, stock Glow: " + String(e.message) + " L" + e.line); fx.addProperty("ADBE Glo2"); }
    fx.addProperty("ADBE Brightness & Contrast 2");
    fx.addProperty("ADBE Sharpen");
    var g = _efo(opts, "grain", 0);
    if (g > 0) fx.addProperty("ADBE Noise");
    // fetch AFTER all adds
    var glow = fx.property(1), bc = fx.property(2), sh = fx.property(3);
    if (saph) {
        // S_Glow param names vary by version: only the effect mix is set; tune brightness/width in the UI
        try { glow.property("Mix with Orig").setValue(1 - _efo(opts, "glowMix", 15) / 100); } catch (e2) { $.writeln("S_Glow mix: " + String(e2.message) + " L" + e2.line); }
    } else {
        glow.property(2).setValue(86);     // threshold %
        glow.property(3).setValue(90);     // radius
        glow.property(4).setValue(0.12);   // intensity
    }
    bc.property(2).setValue(_efo(opts, "contrast", 10));   // contrast
    sh.property(1).setValue(_efo(opts, "sharpen", 13));
    if (g > 0) { var nz = fx.property(4); nz.property(1).setValue(g); nz.property(2).setValue(0); nz.property(3).setValue(1); } // amount, mono, clipping ON
    return adj;
}
