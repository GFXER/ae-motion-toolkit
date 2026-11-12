// expensive_fx8.jsx : NaughtyyJuan "Effect Ideas part 8" (8 effects that look expensive) as helpers (ES3).
// Guide: private study notes (not included)
//
// Usage:
//   #include "expensive_fx8.jsx"
//   raysText(titleLayer, {length: 1.0, bright: 1.9});           // S_Rays (fallback CC Light Burst 2.5 on a dup below)
//   var bg = fillSolid(comp, [1,1,1], "SHP_BG_FILL");           // Apple-style plain bg, colour stays editable
//   fourColorGradient(logoLayer);                               // Instagram yellow/orange/pink/purple
//   deepGlowSafe(textLayer, {grain: 1.5});                      // Deep Glow (or S_Glow) + grain vs banding
//   ringPulse(comp, [1080, 1920], 2.0, {radius: 420, stroke: 22, color: [1,0.45,0.1]});
//   gridOverlay(comp, {cell: 18, border: 5, blur: 3, opacity: 25});
//   addBounce(iconLayer, "scale", {amp: 0.06, freq: 3.2, decay: 7});
//   numberCounter(statText, 0, 1250000, 1.0, 2.2, {prefix: "", suffix: " TL", sep: "."});
// Rules: add all effects first, THEN fetch props. NOTE: written 2026-10-20, NOT yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }
function _x8o(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _x8log(m) { try { $.writeln("[expensive_fx8] " + m); } catch (e) {} }
function _x8set(fxProp, name, v) { try { fxProp.property(name).setValue(v); return true; } catch (e) { _x8log("set " + name + ": " + String(e.message) + " L" + e.line); return false; } }
function _x8ease(prop, k, inf) { // KeyframeEase array sized to the property's dimensions (spatial = 1)
    var v = prop.keyValue(k), n = 1, a = [], j;
    if (v instanceof Array && prop.propertyValueType !== PropertyValueType.TwoD_SPATIAL && prop.propertyValueType !== PropertyValueType.ThreeD_SPATIAL) n = v.length;
    for (j = 0; j < n; j++) a.push(new KeyframeEase(0, inf));
    prop.setTemporalEaseAtKey(k, a, a);
}
function _x8tryAdd(parade, names) { // returns the added effect's index or 0
    for (var n = 0; n < names.length; n++) {
        try { parade.addProperty(names[n]); return parade.numProperties; } catch (e) {}
    }
    return 0;
}

// 1) S_Rays on a text/logo layer (rays follow the layer, take its colour)
function raysText(layer, opts) {
    var fx = layer.property("ADBE Effect Parade");
    var idx = _x8tryAdd(fx, ["S_Rays"]);
    if (idx) {
        var r = fx.property(idx);
        _x8set(r, "Rays Length", _x8o(opts, "length", 1.0));
        _x8set(r, "Rays Brightness", _x8o(opts, "bright", 1.9));
        var c = layer.containingComp;
        _x8set(r, "Center XY", _x8o(opts, "center", [c.width / 2, c.height / 2]));
        return layer;
    }
    // fallback (his free version): duplicate, effect on the BOTTOM copy, longer rays, lower intensity
    var dup = layer.duplicate(); dup.moveAfter(layer); dup.name = "FX_" + layer.name + "_BURST"; dup.label = LBL.LIGHT;
    var dfx = dup.property("ADBE Effect Parade");
    var bi = _x8tryAdd(dfx, ["CC Light Burst 2.5"]);
    if (bi) { var b = dfx.property(bi); _x8set(b, "Ray Length", _x8o(opts, "burstLen", 120)); _x8set(b, "Intensity", _x8o(opts, "burstInt", 60)); }
    return dup;
}

// 2) Solid + Fill (colour stays editable / animatable)
function fillSolid(comp, rgb, name) {
    var s = comp.layers.addSolid([0.5, 0.5, 0.5], name || "SHP_BG_FILL", comp.width, comp.height, comp.pixelAspect, comp.duration);
    s.moveToEnd(); s.label = LBL.SHAPE;
    var fx = s.property("ADBE Effect Parade"); fx.addProperty("ADBE Fill");
    if (!_x8set(fx.property(1), "ADBE Fill-0002", rgb || [1, 1, 1])) _x8set(fx.property(1), "Color", rgb || [1, 1, 1]);
    return s;
}

// 3) 4-Color Gradient (default = Instagram logo colours). Points spread over the layer's bounds.
function fourColorGradient(layer, colors) {
    var cols = colors || [[1, 0.83, 0.2], [0.98, 0.33, 0.2], [0.87, 0.16, 0.48], [0.51, 0.2, 0.71]];
    var fx = layer.property("ADBE Effect Parade"); fx.addProperty("ADBE 4ColorGradient");
    var g = fx.property(fx.numProperties);
    var rc = layer.sourceRectAtTime(layer.containingComp.time, false);
    var pts = [[rc.left, rc.top + rc.height], [rc.left + rc.width, rc.top + rc.height], [rc.left + rc.width, rc.top], [rc.left, rc.top]];
    for (var q = 0; q < 4; q++) {
        try { g.property(1 + q * 2).setValue(pts[q]); g.property(2 + q * 2).setValue(cols[q]); } catch (e) { _x8log("4cg " + String(e.message) + " L" + e.line); }
    }
    return g;
}

// 4) Deep Glow with banding guard (grain after the glow). Falls back to S_Glow, then stock Glow.
function deepGlowSafe(layer, opts) {
    var fx = layer.property("ADBE Effect Parade");
    var idx = _x8tryAdd(fx, ["S_Glow", "ADBE Glo2"]);
    var gr = _x8o(opts, "grain", 1.5);
    if (gr > 0) fx.addProperty("ADBE Noise");
    if (idx) {
        var g = fx.property(idx);
        if (g.matchName === "ADBE Glo2") { g.property(2).setValue(80); g.property(3).setValue(60); g.property(4).setValue(0.4); }
        else { _x8set(g, "Exposure", _x8o(opts, "exposure", 0.6)); _x8set(g, "Radius", _x8o(opts, "radius", 300)); }
    }
    if (gr > 0) { var nz = fx.property(fx.numProperties); nz.property(1).setValue(gr); nz.property(2).setValue(0); nz.property(3).setValue(1); } // mono, clipping ON
    return layer;
}

// 5) Ring pulse: stroke ellipse, scale 0 -> 100, opacity 100 -> 0; a second bigger/thicker ring a few frames later
function ringPulse(comp, pos, t, opts) {
    var rings = _x8o(opts, "rings", 2), off = _x8o(opts, "offset", 4) / comp.frameRate, dur = _x8o(opts, "dur", 0.6);
    var rad = _x8o(opts, "radius", 400), stw = _x8o(opts, "stroke", 20), col = _x8o(opts, "color", [1, 1, 1]);
    var out = [];
    for (var n = 0; n < rings; n++) {
        var L = comp.layers.addShape(); L.name = "SHP_RING_" + (n + 1); L.label = LBL.SHAPE; L.motionBlur = true;
        var grp = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        var vs = grp.property("ADBE Vectors Group");
        var el = vs.addProperty("ADBE Vector Shape - Ellipse");
        el.property("ADBE Vector Ellipse Size").setValue([rad * 2 * (1 + 0.15 * n), rad * 2 * (1 + 0.15 * n)]);
        var st = vs.addProperty("ADBE Vector Graphic - Stroke");
        st.property("ADBE Vector Stroke Color").setValue(col);
        st.property("ADBE Vector Stroke Width").setValue(stw * (1 + 0.6 * n));
        var tr = L.property("ADBE Transform Group");
        tr.property("ADBE Position").setValue(pos);
        var t0 = t + n * off, sc = tr.property("ADBE Scale"), op = tr.property("ADBE Opacity");
        sc.setValueAtTime(t0, [0, 0]); sc.setValueAtTime(t0 + dur, [100, 100]);
        op.setValueAtTime(t0, 100);    op.setValueAtTime(t0 + dur, 0);
        try { // expo-out feel: fast start, long settle
            _x8ease(sc, 1, 10); _x8ease(sc, 2, 85); _x8ease(op, 2, 85);
        } catch (e) { _x8log("ring ease " + String(e.message) + " L" + e.line); }
        L.inPoint = t0; L.outPoint = t0 + dur + 0.05;
        out.push(L);
    }
    return out;
}

// 6) Grid overlay = LED / digital screen texture
function gridOverlay(comp, opts) {
    var s = comp.layers.addSolid([0, 0, 0], "FX_GRID", comp.width, comp.height, comp.pixelAspect, comp.duration);
    s.label = LBL.LIGHT;
    var fx = s.property("ADBE Effect Parade");
    fx.addProperty("ADBE Grid"); fx.addProperty("ADBE Gaussian Blur 2");
    var g = fx.property(1), bl = fx.property(2);
    var cx = comp.width / 2, cy = comp.height / 2, cell = _x8o(opts, "cell", 18);
    _x8set(g, "Anchor", [cx, cy]);
    _x8set(g, "Corner", [cx + cell, cy + cell]);   // Size From default = Corner Point
    _x8set(g, "Border", _x8o(opts, "border", 5));
    _x8set(g, "Color", [0, 0, 0]);
    bl.property(1).setValue(_x8o(opts, "blur", 3));
    s.blendingMode = _x8o(opts, "mode", BlendingMode.OVERLAY);
    s.property("ADBE Transform Group").property("ADBE Opacity").setValue(_x8o(opts, "opacity", 25));
    return s;
}

// 7) Bounce (Bouncer stand-in): inertial bounce after the last key of scale/position/rotation
function addBounce(layer, which, opts) {
    var map = {scale: "ADBE Scale", position: "ADBE Position", rotation: "ADBE Rotate Z"};
    var p = layer.property("ADBE Transform Group").property(map[which || "scale"]);
    var amp = _x8o(opts, "amp", 0.06), freq = _x8o(opts, "freq", 3.2), decay = _x8o(opts, "decay", 7);
    p.expression =
        "var amp=" + amp + ",freq=" + freq + ",decay=" + decay + ";\n" +
        "var n=0; if(numKeys>0){n=nearestKey(time).index; if(key(n).time>time) n--;}\n" +
        "if(n>0){var t=time-key(n).time; var v=velocityAtTime(key(n).time-thisComp.frameDuration/10);\n" +
        "value+v*amp*Math.sin(freq*t*2*Math.PI)/Math.exp(decay*t);}else{value;}";
    return p;
}

// 8) Number counter (his preset's expression; sep "." for Turkish)
function numberCounter(textLayer, from, to, t0, t1, opts) {
    var fx = textLayer.property("ADBE Effect Parade"); fx.addProperty("ADBE Slider Control");
    var sl = fx.property(fx.numProperties); sl.name = "Slider Control";
    var v = sl.property(1);
    v.setValueAtTime(t0, from); v.setValueAtTime(t1, to);
    try { _x8ease(v, 1, 33); _x8ease(v, 2, 90); } catch (e) { _x8log("counter ease " + String(e.message) + " L" + e.line); }
    var pre = _x8o(opts, "prefix", ""), suf = _x8o(opts, "suffix", ""), sep = _x8o(opts, "sep", ",");
    textLayer.property("ADBE Text Properties").property("ADBE Text Document").expression =
        "prefix = \"" + pre + "\";\nsuffix = \"" + suf + "\";\n" +
        "num = effect(\"Slider Control\")(\"Slider\").value.toFixed(0);\n" +
        "function addCommas(x){ return x.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, \"" + sep + "\"); }\n" +
        "prefix + addCommas(num) + suffix;";
    return sl;
}
