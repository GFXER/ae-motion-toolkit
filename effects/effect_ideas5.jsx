// effect_ideas5.jsx : NaughtyyJuan "Effect Ideas PART 5" as ES3 helpers.
// Guide: private study notes (not included)
//
//   neonEdges(layer, [1,0.1,0.1], {glow:true})   Find Edges (invert) -> Levels (darks darker) -> Tint -> Deep Glow 2 / S_Glow / Glow
//   pixelStreak(layer, {amount:60})               Omino Diffuse stand-in: S_PixelSort horizontal (fallback Scatter + Posterize)
//   grainNitrate(comp, {noise:30, opacity:35})     FX_GRAIN_OVERLAY: grey plate + mono Noise in Overlay (blacks stay clean);
//                                                 {sapphire:true} -> S_Grain adj (FilmConvert: strength 160, sat 0, shadows down)
//   hueCycle(layer, [t1,t2], [90,-120])            Hue/Saturation master hue hold-jumps (1-frame flicks on beats)
//   textWave(layer, {height:4, width:320, speed:0.35})   subtle Wave Warp so text never sits dead still
// Black bars (CC Jaws): use black_bars_depth.jsx. Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _e5o(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _e5log(m) { try { $.writeln("[effect_ideas5] " + m); } catch (e) {} }
function _e5add(layer, names) { // add first available effect; returns its index in the parade or 0
    var p = layer.property("ADBE Effect Parade");
    for (var n = 0; n < names.length; n++) {
        try { p.addProperty(names[n]); return p.numProperties; } catch (e) {}
    }
    return 0;
}
function _e5set(eff, idx, v) { try { eff.property(idx).setValue(v); } catch (e) { _e5log("set " + idx + ": " + String(e.message)); } }

// 4) Neon edge portrait. Add every effect first, then fetch props by stored index.
function neonEdges(layer, rgb, opts) {
    var col = rgb || [1, 0.08, 0.08];
    var iFE = _e5add(layer, ["ADBE Find Edges"]);
    var iLV = _e5add(layer, ["ADBE Easy Levels2"]);
    var iTN = _e5add(layer, ["ADBE Tint"]);
    var iGL = _e5o(opts, "glow", true) ? _e5add(layer, ["S_Glow", "ADBE Glo2"]) : 0;
    var fx = layer.property("ADBE Effect Parade");
    if (iFE) { _e5set(fx.property(iFE), 1, 1); }                 // Invert ON -> white lines on black (as in tutorial)
    if (iLV) {                                                   // Curves stand-in: input black up, gamma down
        _e5set(fx.property(iLV), 3, _e5o(opts, "inBlack", 0.22));
        _e5set(fx.property(iLV), 5, _e5o(opts, "gamma", 0.7));
    }
    if (iTN) {
        _e5set(fx.property(iTN), 1, [0, 0, 0]);                  // map black to black
        _e5set(fx.property(iTN), 2, col);                        // map white to accent
        _e5set(fx.property(iTN), 3, 100);
    }
    if (iGL) {
        var g = fx.property(iGL);
        if (g.matchName === "ADBE Glo2") { _e5set(g, 2, 40); _e5set(g, 3, 60); _e5set(g, 4, 1.5); } // threshold, radius, intensity
        // Deep Glow / S_Glow: keep defaults; tune by eye (Deep Glow warning: add grain after it vs banding).
    }
    return layer;
}

// 1) Pixel streak glitch (Omino Diffuse stand-in). Animate amount on beats (0 -> amount -> 0 over 3-6 f).
function pixelStreak(layer, opts) {
    var i = _e5add(layer, ["S_PixelSort"]);
    if (i) { layer.property("ADBE Effect Parade").property(i).name = "PIXEL_STREAK"; return i; }   // set direction/threshold by eye
    var iS = _e5add(layer, ["ADBE Scatter"]);
    var iP = _e5add(layer, ["ADBE Posterize"]);
    var fx = layer.property("ADBE Effect Parade");
    if (iS) { _e5set(fx.property(iS), 1, _e5o(opts, "amount", 60)); _e5set(fx.property(iS), 2, 2); } // amount, grain = horizontal
    if (iP) { _e5set(fx.property(iP), 1, _e5o(opts, "levels", 6)); }
    return iS;
}

// 5) Grain only in mids/highlights (FilmConvert Nitrate: strength 160, saturation 0, shadow response down).
// Stock trick: 50 % grey plate + mono noise in OVERLAY mode -> overlay barely changes near-black pixels, so the
// blacks stay clean. With Sapphire, S_Grain on an adjustment layer instead (tune its shadow amount to ~0 by eye).
function grainNitrate(comp, opts) {
    if (_e5o(opts, "sapphire", false)) {
        var adj = comp.layers.addSolid([1, 1, 1], "ADJ_GRAIN", comp.width, comp.height, 1, comp.duration);
        adj.adjustmentLayer = true; adj.label = LBL.ADJ;
        if (_e5add(adj, ["S_Grain"])) return adj;
        adj.remove();
    }
    var g = comp.layers.addSolid([0.5, 0.5, 0.5], "FX_GRAIN_OVERLAY", comp.width, comp.height, 1, comp.duration);
    g.label = LBL.LIGHT;
    var i = _e5add(g, ["ADBE Noise"]);
    var n = g.property("ADBE Effect Parade").property(i);
    _e5set(n, 1, _e5o(opts, "noise", 30));      // Amount of Noise % on the grey plate
    _e5set(n, 2, 0);                            // Use Color Noise OFF (mono = saturation 0)
    _e5set(n, 3, 1);                            // Clipping ON (house rule)
    g.blendingMode = BlendingMode.OVERLAY;
    g.property("ADBE Transform Group").property("ADBE Opacity").setValue(_e5o(opts, "opacity", 35));
    return g;
}

// 3) Hue jumps. times in seconds, degs = master hue per time (hold keys, 1-frame return if opts.flick).
function hueCycle(layer, times, degs, opts) {
    var i = _e5add(layer, ["ADBE HUE SATURATION"]);
    var hp = layer.property("ADBE Effect Parade").property(i).property(3);    // Master Hue
    var fd = layer.containingComp.frameDuration, k;
    hp.setValueAtTime(0, 0);
    for (k = 0; k < times.length; k++) {
        hp.setValueAtTime(times[k], degs[k]);
        if (_e5o(opts, "flick", true)) hp.setValueAtTime(times[k] + _e5o(opts, "frames", 2) * fd, 0);
    }
    for (k = 1; k <= hp.numKeys; k++) hp.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
    return i;
}

// 6) Subtle text wave.
function textWave(layer, opts) {
    var i = _e5add(layer, ["ADBE Wave Warp"]);
    var w = layer.property("ADBE Effect Parade").property(i);
    _e5set(w, 2, _e5o(opts, "height", 4));     // Wave Height
    _e5set(w, 3, _e5o(opts, "width", 320));    // Wave Width
    _e5set(w, 5, _e5o(opts, "speed", 0.35));   // Wave Speed
    return i;
}
