// effect_ideas_p6.jsx : NaughtyyJuan "Effect Ideas For Edits PART 6" as ES3 helpers.
// Guide: private study notes (not included)
// NOTE: written 2026-10-20, NOT yet run in AE. Test once in a scratch comp before using in a build.
// Sapphire / Crates parameter names are set by display name through epSet() (tries several spellings,
// logs misses) because we could not probe them while AE was rendering.
//
// Usage:
//   #include "layer_labels.jsx"            // optional (LBL fallback below)
//   #include "effect_ideas_p6.jsx"
//   tritoneLook(layer, [1,1,1], [0.12,0.35,0.95], [0,0,0], 12);     // 3-tone grade + soft S_Glow
//   colorSwap(layer, [0.10,0.45,0.95], [0.20,0.95,0.30], 30);         // Change to Color (blue car -> green)
//   var m = fillDup(layer, [0,0,0]);                                  // duplicate + Fill = instant matte/solid
//   heatHaze(comp, [x,y,w,h], t0, t1);                                // masked Turbulent Displace adj (Uni.HeatWave stand-in)
//   longShadow(textLayer, 135, 600, [0,0,0]);                         // Crates Long Shadow, stock fallback
//   infiniteZoom(layer, t0, t1, 0, 3);                                // S_InfiniteZoom keyed
//   lunaMoon(comp, t0, dur, [cx,cy], 600);                            // S_Luna on a black solid
//   digitalDamageHit(layer, t, 6);                                    // S_DigitalDamage burst, n frames
//   polaroidCard(comp, layer, 0.62);                                  // Uni.Photo2 stand-in (white card)

var EP_LBL = (typeof LBL !== "undefined") ? LBL : {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10};

function epLog(m) { try { $.writeln("[effect_ideas_p6] " + m); } catch (e) {} }
function epErr(e) { return String(e.message) + " L" + e.line; }

// set the first matching property (by display name or matchName) on an effect; returns true on success
function epSet(fx, names, val) {
    var k, p;
    for (k = 0; k < names.length; k++) {
        try { p = fx.property(names[k]); } catch (e) { p = null; }
        if (p) { try { p.setValue(val); return true; } catch (e2) { epLog("set " + names[k] + ": " + epErr(e2)); } }
    }
    epLog("param not found: " + names.join("/"));
    return false;
}
function epProp(fx, names) {
    var k, p;
    for (k = 0; k < names.length; k++) { try { p = fx.property(names[k]); } catch (e) { p = null; } if (p) return p; }
    return null;
}
// add the first effect that exists; returns its index in the parade or 0
function epAdd(layer, matchNames) {
    var fxs = layer.property("ADBE Effect Parade"), k;
    for (k = 0; k < matchNames.length; k++) {
        try { fxs.addProperty(matchNames[k]); return fxs.numProperties; } catch (e) {}
    }
    epLog("none of these effects exist: " + matchNames.join(", "));
    return 0;
}
function epFx(layer, idx) { return layer.property("ADBE Effect Parade").property(idx); }

// 1) Tritone (highlights / midtones / shadows) + optional S_Glow mix % (0 = off). Tutorial: white / blue / black.
function tritoneLook(layer, hi, mid, sh, glowMix) {
    var iT = epAdd(layer, ["ADBE Tritone"]);
    var iG = (glowMix && glowMix > 0) ? epAdd(layer, ["S_Glow", "ADBE Glo2"]) : 0;   // add all first, then fetch
    if (iT) {
        var t = epFx(layer, iT);
        t.property(1).setValue(hi); t.property(2).setValue(mid); t.property(3).setValue(sh);
        t.property(4).setValue(0);                    // Blend With Original 0 %
    }
    if (iG) {
        var g = epFx(layer, iG);
        if (g.matchName === "S_Glow") epSet(g, ["Mix", "Blend"], glowMix / 100);
        else { g.property(2).setValue(80); g.property(3).setValue(60); g.property(4).setValue(0.4); }
    }
    return layer;
}

// 2) Change to Color: From (picked colour) -> To. tolHue in % (tutorial tightened Hue tolerance, Softness 50).
function colorSwap(layer, fromRGB, toRGB, tolHue) {
    var i = epAdd(layer, ["ADBE Change To Color"]);
    if (!i) return null;
    var c = epFx(layer, i);
    epSet(c, ["From"], fromRGB);
    epSet(c, ["To"], toRGB);
    epSet(c, ["Hue"], (tolHue === undefined ? 30 : tolHue) / 100);   // Tolerance > Hue (0-1 internally; check)
    epSet(c, ["Softness"], 0.5);
    return c;
}

// 3) "Fill" trick: duplicate a clip and fill it with a flat colour (faster than a new solid, keeps timing/trim).
function fillDup(layer, rgb) {
    var d = layer.duplicate();
    d.name = "SHP_FILL_" + layer.name;
    var fxs = d.property("ADBE Effect Parade");
    while (fxs.numProperties > 0) fxs.property(1).remove();
    fxs.addProperty("ADBE Fill");
    fxs.property(1).property("ADBE Fill-0002").setValue(rgb);   // Color
    d.label = EP_LBL.SHAPE;
    return d;
}

// 4) Heat haze (Uni.HeatWave stand-in): masked, feathered adjustment with Turbulent Displace drifting up.
function heatHaze(comp, rect, t0, t1) {
    var a = comp.layers.addSolid([1,1,1], "ADJ_HEAT", comp.width, comp.height, 1);
    a.adjustmentLayer = true; a.label = EP_LBL.ADJ;
    a.inPoint = t0; a.outPoint = t1;
    var m = a.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
    var s = new Shape(), x = rect[0], y = rect[1], w = rect[2], h = rect[3];
    s.vertices = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; s.closed = true;
    m.property("ADBE Mask Shape").setValue(s);
    m.property("ADBE Mask Feather").setValue([w * 0.2, h * 0.2]);
    var fxs = a.property("ADBE Effect Parade");
    fxs.addProperty("ADBE Turbulent Displace");
    var td = fxs.property(1);
    td.property(2).setValue(6);                       // Amount (subtle)
    td.property(3).setValue(40);                      // Size
    td.property(6).expression = "time*220";           // Evolution: shimmer
    td.property(4).expression = "[value[0], value[1] - time*180]";   // Offset: rises like hot air
    return a;
}

// 5) Long shadow: Crates Long Shadow if present (tutorial: Uni.LongShadow, Angle ~135, black), else stacked dups.
function longShadow(layer, angleDeg, len, rgb) {
    var i = epAdd(layer, ["Crates Long Shadow", "CratesLongShadow", "Long Shadow"]);
    if (i) {
        var f = epFx(layer, i);
        epSet(f, ["Angle", "Direction"], angleDeg);
        epSet(f, ["Length", "Distance"], len);
        epSet(f, ["Color", "Shadow Color"], rgb);
        return f;
    }
    // stock fallback: N filled duplicates stepped along the angle (good for text/logos; precompose after)
    var n = 30, k, a = angleDeg * Math.PI / 180, step = len / n, comp = layer.containingComp;
    var p0 = layer.property("ADBE Transform Group").property("ADBE Position").value;
    for (k = n; k >= 1; k--) {
        var d = fillDup(layer, rgb);
        d.name = "SHP_LSHADOW_" + k;
        d.property("ADBE Transform Group").property("ADBE Position").setValue([p0[0] + Math.cos(a) * step * k, p0[1] + Math.sin(a) * step * k]);
        d.moveAfter(layer);
    }
    return null;
}

// 6) S_InfiniteZoom keyed from z0 to z1 (tutorial keyed the zoom/"shrink per level" for a trippy tunnel).
function infiniteZoom(layer, t0, t1, z0, z1) {
    var i = epAdd(layer, ["S_InfiniteZoom"]);
    if (!i) return null;
    var f = epFx(layer, i);
    var p = epProp(f, ["Zoom", "Zoom Amount"]);
    if (p) { p.setValueAtTime(t0, z0); p.setValueAtTime(t1, z1); }
    else epLog("S_InfiniteZoom: Zoom param not found");
    epSet(f, ["Shrink Per Level", "Shrink per Level", "Shrink"], 0.6);
    return f;
}

// 7) S_Luna: procedural moon (phase, rotation, bumpiness, glow). On its own black solid, Screen blend.
function lunaMoon(comp, t0, dur, center, size) {
    var s = comp.layers.addSolid([0,0,0], "FX_LUNA", comp.width, comp.height, 1, dur);
    s.startTime = t0; s.label = EP_LBL.LIGHT; s.blendingMode = BlendingMode.SCREEN;
    var i = epAdd(s, ["S_Luna"]);
    if (!i) return s;
    var f = epFx(s, i);
    epSet(f, ["Center", "Moon Center"], center);
    epSet(f, ["Size", "Radius", "Moon Size"], size);
    var r = epProp(f, ["Rotate", "Rotation", "Moon Rotation"]);
    if (r) r.expression = "time*4";                    // slow spin
    return s;
}

// 8) S_DigitalDamage burst: Intensity keyed 0 -> 1 -> 0 over nFr frames centred on t (glitch accent on a beat).
function digitalDamageHit(layer, t, nFr) {
    var i = epAdd(layer, ["S_DigitalDamage"]);
    if (!i) return null;
    var f = epFx(layer, i), fd = layer.containingComp.frameDuration;
    var p = epProp(f, ["Intensity", "Amount"]);
    if (p) {
        var h = Math.max(1, Math.round(nFr / 2));
        p.setValueAtTime(t - h * fd, 0); p.setValueAtTime(t, 1); p.setValueAtTime(t + h * fd, 0);
        var k; for (k = 1; k <= p.numKeys; k++) p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.LINEAR);
    }
    epSet(f, ["Seed"], Math.floor(Math.random() * 1000));
    return f;
}

// 9) Polaroid card (Uni.Photo2 stand-in): white rounded card behind the clip, clip masked into the window.
//    For real paper use the licensed polaroid packs (<asset-library>) or your own paper textures.
function polaroidCard(comp, layer, scaleFrac) {
    var W = comp.width * scaleFrac, H = W * 1.21, cx = comp.width / 2, cy = comp.height / 2;
    var card = comp.layers.addShape(); card.name = "SHP_POLAROID"; card.label = EP_LBL.SHAPE;
    var g = card.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    var rc = g.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Rect");
    rc.property("ADBE Vector Rect Size").setValue([W, H]);
    rc.property("ADBE Vector Rect Roundness").setValue(W * 0.01);
    var fl = g.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
    fl.property("ADBE Vector Fill Color").setValue([0.97, 0.96, 0.93]);
    card.property("ADBE Transform Group").property("ADBE Position").setValue([cx, cy]);
    card.moveAfter(layer);
    var win = W * 0.88, top = cy - H / 2 + W * 0.06;
    var m = layer.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
    var s = new Shape();
    s.vertices = [[cx - win / 2, top], [cx + win / 2, top], [cx + win / 2, top + win], [cx - win / 2, top + win]]; s.closed = true;
    m.property("ADBE Mask Shape").setValue(s);
    var fxs = card.property("ADBE Effect Parade");
    fxs.addProperty("ADBE Drop Shadow");
    var ds = fxs.property(1);
    ds.property("ADBE Drop Shadow-0002").setValue(115); // opacity: 0-255 internally (115 = 45 %)
    ds.property("ADBE Drop Shadow-0004").setValue(18);  // distance
    ds.property("ADBE Drop Shadow-0005").setValue(40);  // softness
    return card;
}
