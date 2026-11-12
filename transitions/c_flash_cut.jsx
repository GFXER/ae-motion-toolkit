// c_flash_cut.jsx : "Flash Cut" transition (ref Video-40953, oct27 batch C). The roto'd subject of clip A
// strobes as a solid white glowing silhouette for single frames just before a hard cut to B, then a 2-4 f
// luma dissolve lands B. Guide: private study notes (not included) §40953.
//
// Tutorial (30 fps): Roto Brush the subject, razor the shot into single frames around the cut, on the chosen
// frames put Fill (white, opacity 100) on the roto copy + Deep Glow 2 (Exponential, Screen, radius 1000,
// exposure 0.25) -- Deep Glow is a third-party plugin, we use S_Glow (or stock Glow) instead. Measured
// pattern in the demo: silhouette ON at cut-6 f and cut-2 f (1 f each), sometimes a 3rd at cut-1 f; cut;
// tutorial then adds Sapphire S_DissolveLuma over the cut (2-4 f).
//
// Usage:
//   #include "c_flash_cut.jsx"
//   cFlashCut(comp, rotoA, layerB, tCut, {pattern: [-6, -2]});
//   rotoA = roto'd precomp of clip A (alpha = subject).  layerB = incoming clip (already starts at tCut).
//   opts: pattern (frames relative to tCut that flash; at 60 fps default [-12,-11,-4,-3] = 2 f flashes),
//         glowRadius (px, default 0.26*H), glowGain, dissolveFrames (3; 0 = hard cut), useSapphire (true)
// House rules: Fill at opacity 0 still blanks a layer -> we toggle the WHOLE layer opacity (hold keys),
// never Fill opacity. Fill/glow are added first, params fetched after (refs invalidate).
// SFX (ref): each silhouette flash = a short bright camera-flash "tick" (~4-5 kHz transient, -24 dB under
// music); the cut gets a low thump. Library: premium/camera_shutter_flash/mixkit__camera-shutter-hard-click-1430.wav
// (-26 dB, pitch +3 st for the 2nd flash) + premium/cinematic_impacts_hits (soft) -18 dB on the cut.
// Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _fcO(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _fcSet(fx, names, v) {
    for (var i = 0; i < names.length; i++) {
        try { var p = fx.property(names[i]); if (p) { p.setValue(v); return true; } } catch (e) {}
    }
    $.writeln("cFlashCut: none of params found: " + names.join("/"));
    return false;
}

function cFlashCut(comp, rotoA, layerB, tCut, opts) {
    var fd = comp.frameDuration;
    var fps = Math.round(1 / fd);
    var defPat = (fps >= 50) ? [-12, -11, -4, -3] : [-6, -2];
    var pat = _fcO(opts, "pattern", defPat);
    var useS = _fcO(opts, "useSapphire", true);

    var sil = rotoA.duplicate();
    sil.name = "FX_flashcut_silhouette"; sil.label = LBL.LIGHT;
    sil.moveToBeginning();
    sil.blendingMode = BlendingMode.SCREEN;
    var fxp = sil.property("ADBE Effect Parade");
    fxp.addProperty("ADBE Fill");
    var glowName = "ADBE Glo2";
    try { if (useS) { fxp.addProperty("S_Glow"); glowName = "S_Glow"; } else { fxp.addProperty("ADBE Glo2"); } }
    catch (e) { fxp.addProperty("ADBE Glo2"); glowName = "ADBE Glo2"; }
    var fill = fxp.property(1), glow = fxp.property(2);
    _fcSet(fill, ["Color"], [1, 1, 1]);
    if (glowName === "S_Glow") {
        _fcSet(glow, ["Brightness"], _fcO(opts, "glowGain", 1.6));
        _fcSet(glow, ["Width"], _fcO(opts, "glowRadius", 0.26 * comp.height) / 10);   // S_Glow width ~ px/10
    } else {
        _fcSet(glow, ["Glow Radius"], _fcO(opts, "glowRadius", 0.26 * comp.height));
        _fcSet(glow, ["Glow Intensity"], _fcO(opts, "glowGain", 1.6));
        _fcSet(glow, ["Glow Operation"], 3);                                            // Screen
    }

    // opacity strobe: hold keys, 100 on the pattern frames, 0 elsewhere
    var op = sil.property("ADBE Transform Group").property("ADBE Opacity");
    var first = pat[0], last = pat[pat.length - 1];
    for (var f = first - 1; f <= last + 1; f++) {
        var on = false;
        for (var j = 0; j < pat.length; j++) if (pat[j] === f) on = true;
        op.setValueAtTime(tCut + f * fd, on ? 100 : 0);
    }
    for (var k = 1; k <= op.numKeys; k++) op.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
    sil.inPoint = tCut + (first - 1) * fd;
    sil.outPoint = tCut;

    // luma dissolve onto B (S_DissolveLuma on the outgoing layer; fallback: B opacity ramp)
    var df = _fcO(opts, "dissolveFrames", 3);
    if (df > 0) {
        var done = false;
        if (useS) {
            try {
                var dl = rotoA.property("ADBE Effect Parade").addProperty("S_DissolveLuma");
                dl = rotoA.property("ADBE Effect Parade").property(rotoA.property("ADBE Effect Parade").numProperties);
                _fcSet(dl, ["Back"], layerB.index);
                var pr = dl.property("Dissolve Percent") || dl.property("Dissolve Amount");
                if (pr) { pr.setValueAtTime(tCut - df * fd, 0); pr.setValueAtTime(tCut, 1); done = true; }
            } catch (e) { $.writeln("cFlashCut S_DissolveLuma: " + String(e.message) + " L" + e.line); }
        }
        if (!done) {
            if (layerB.inPoint > tCut - df * fd) layerB.inPoint = tCut - df * fd;
            var ob = layerB.property("ADBE Transform Group").property("ADBE Opacity");
            ob.setValueAtTime(tCut - df * fd, 0); ob.setValueAtTime(tCut, 100);
        }
    }
    return sil;
}
