// unique_fx8.jsx : 8bitbrain "These 5 Effects Made My Edits 10x Better | Unique Effects Part 8" (ES3 helpers)
// + the depth-map source from archduchy "How to make QUALITY depth maps quickly" (NH2jxCOrsM4).
// Guides: private study notes (not included), private study notes
//
//   depthLayerReveal(comp, clip, depthLayer, t0, t1, opts)  depth map -> Levels reveal -> Extract takeover,
//                                    Colorama Ramp Gray "stacked layers" (+Phase Shift drift), Mosaic, small glow,
//                                    clean duplicate underneath, top in Classic Difference          (effect 1)
//   starPosterBW(comp, clip, opts)   white-bg cut-out -> Tint (swapped) + Threshold B/W inside a star mask over a
//                                    dark-red tinted copy, Colorama flicker ("Chair" MV look)        (effect 2)
//   keySlideEcho(comp, clipB, t0, dur, opts)  Linear Color Key reveal of the next clip + Echo adj (Minimum/
//                                    Maximum/Screen), echoes drop to 1 at the end, adj opacity 0->100 (effect 4)
//   ballActionGlow(comp, clip, t0, opts)  CC Ball Action + Colorama Ramp Green + small glow, clean dup under,
//                                    Vignette radius reveal at the head of the chain                (effect 5)
//
// depthLayer = a footage layer of a grayscale depth map (white = near), same timing as clip. The tutorial used
// aescripts Depth Scanner (we don't own it). NH2jxCOrsM4's tool is Windows+NVIDIA (TensorRT) only, so on this
// Mac a map must come from elsewhere (see guide). Without one, pass null: the helper falls back to a luma map.
// NOTE: written 2026-10-20, NOT yet run in AE. Test once in a scratch comp before using in a build.

var U8_LBL = (typeof LBL !== "undefined") ? LBL : {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10};

function _u8o(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _u8log(m) { try { $.writeln("[unique_fx8] " + m); } catch (e) {} }
function _u8err(e) { return String(e.message) + " L" + e.line; }
function _u8add(L, names) {   // add first available effect; returns its name in the parade (stable handle)
    var fx = L.property("ADBE Effect Parade"), k;
    for (k = 0; k < names.length; k++) { try { var p = fx.addProperty(names[k]); return p.name; } catch (e) {} }
    _u8log("missing effects: " + names.join(", ")); return null;
}
function _u8fx(L, nm) { return nm ? L.property("ADBE Effect Parade").property(nm) : null; }
function _u8set(fx, ids, v) {
    var k, p;
    if (!fx) return false;
    for (k = 0; k < ids.length; k++) { try { p = fx.property(ids[k]); } catch (e) { p = null; } if (p) { try { p.setValue(v); return true; } catch (e2) { _u8log("set " + ids[k] + ": " + _u8err(e2)); } } }
    _u8log("param not found: " + ids.join("/")); return false;
}
function _u8prop(fx, ids) { var k, p; if (!fx) return null; for (k = 0; k < ids.length; k++) { try { p = fx.property(ids[k]); } catch (e) { p = null; } if (p) return p; } return null; }
function _u8keys(p, ts, vs, outInf, inInf) {
    if (!p) return; var k;
    for (k = 0; k < ts.length; k++) p.setValueAtTime(ts[k], vs[k]);
    for (k = 1; k <= p.numKeys; k++) { try { var n = (p.value instanceof Array) ? p.value.length : 1, a = [], b = [], j; for (j = 0; j < n; j++) { a.push(new KeyframeEase(0, inInf || 75)); b.push(new KeyframeEase(0, outInf || 40)); } p.setTemporalEaseAtKey(k, a, b); } catch (e) {} }
}
function _u8adj(comp, name, t0, t1) {
    var a = comp.layers.addSolid([1,1,1], name, comp.width, comp.height, 1);
    a.adjustmentLayer = true; a.label = U8_LBL.ADJ; a.inPoint = t0; a.outPoint = t1; return a;
}
function _u8stripFx(L) { var fx = L.property("ADBE Effect Parade"); while (fx.numProperties > 0) fx.property(1).remove(); }

// ---- effect 1 -------------------------------------------------------------------------------------------
function depthLayerReveal(comp, clip, depthLayer, t0, t1, opts) {
    var tm = t0 + (t1 - t0) * 0.5;
    var base = clip;                               // clean clip stays underneath
    var top;
    if (depthLayer) { top = depthLayer; top.moveBefore(base); top.inPoint = t0; top.outPoint = t1; }
    else {                                         // no depth map: luma stand-in (Tint to gray)
        top = clip.duplicate(); _u8stripFx(top); top.moveBefore(base); top.inPoint = t0; top.outPoint = t1;
        _u8add(top, ["ADBE Tint"]);
        _u8log("no depth map: using a luma stand-in (weaker layering)");
    }
    top.name = "FX_DEPTHLAYERS"; top.label = U8_LBL.LIGHT;
    var nL = _u8add(top, ["ADBE Easy Levels2", "ADBE Pro Levels2"]);
    var nE = _u8add(top, ["ADBE Extract"]);
    var nC = _u8add(top, ["APC Colorama"]);
    var nM = _u8add(top, ["ADBE Mosaic"]);
    var nG = _u8add(top, ["S_Glow", "ADBE Glo2"]);
    // Levels: input white swept so the image "reveals itself" until the middle
    var lv = _u8fx(top, nL);
    _u8keys(_u8prop(lv, ["Input White", 3]), [t0, tm], [0.05, 1.0], 40, 80);
    // Extract: black point rises from the middle so it takes over by the end (values ours; panel unreadable)
    var ex = _u8fx(top, nE);
    _u8keys(_u8prop(ex, ["Black Point", 3]), [tm, t1], [0, 200], 40, 80);
    _u8set(ex, ["White Point", 4], 255);
    _u8set(ex, ["Black Softness", 5], 40);
    // Colorama: Ramp Gray + Cycle Repetitions up = stacked bands; Phase Shift drifts
    var co = _u8fx(top, nC);
    try { _u8set(co, ["Use Preset Palette"], 12); } catch (e) {}       // VERIFY: index of "Ramp Grey" in the list
    _u8set(co, ["Cycle Repetitions"], _u8o(opts, "reps", 4));
    var ph = _u8prop(co, ["Phase Shift"]); if (ph) ph.expression = "time*30";
    var mo = _u8fx(top, nM);
    _u8set(mo, [1], Math.round(comp.width / 24)); _u8set(mo, [2], Math.round(comp.height / 24)); _u8set(mo, [3], 1);   // sharp colours
    var gl = _u8fx(top, nG);
    if (gl && gl.matchName === "S_Glow") _u8set(gl, ["Mix", "Blend"], 0.12);
    top.blendingMode = BlendingMode.CLASSIC_DIFFERENCE;
    return {top: top, base: base};
}

// ---- effect 2 -------------------------------------------------------------------------------------------
// clip shot on a white/bright background. opts.star = [cx, cy, rOuter] in comp px.
function starPosterBW(comp, clip, opts) {
    var cx = _u8o(opts, "cx", comp.width / 2), cy = _u8o(opts, "cy", comp.height * 0.45), R = _u8o(opts, "r", comp.width * 0.42);
    var bg = clip.duplicate(); bg.name = "VID_STAR_BG"; bg.moveAfter(clip);
    var nT = _u8add(bg, ["ADBE Tint"]);
    _u8set(_u8fx(bg, nT), [1], [0, 0, 0]); _u8set(_u8fx(bg, nT), [2], _u8o(opts, "red", [0.45, 0.02, 0.03]));   // dark red
    // star shape layer between bg and cut-out
    var st = comp.layers.addShape(); st.name = "SHP_STAR"; st.label = U8_LBL.SHAPE; st.moveAfter(clip);
    var g = st.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    var sr = g.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Star");
    sr.property("ADBE Vector Star Type").setValue(1);
    sr.property("ADBE Vector Star Points").setValue(_u8o(opts, "points", 6));
    sr.property("ADBE Vector Star Outer Radius").setValue(R);
    sr.property("ADBE Vector Star Inner Radius").setValue(R * 0.58);
    var fl = g.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
    fl.property("ADBE Vector Fill Color").setValue(_u8o(opts, "starColor", [0.86, 0.05, 0.05]));
    st.property("ADBE Transform Group").property("ADBE Position").setValue([cx, cy]);
    // cut-out: Linear Color Key on white, then method 3 (fastest): Tint swapped + Threshold
    var nK = _u8add(clip, ["ADBE Linear Color Key2", "ADBE Linear Color Key"]);
    var nT2 = _u8add(clip, ["ADBE Tint"]);
    var nTh = _u8add(clip, ["ADBE Threshold2"]);
    var nCo = _u8o(opts, "flicker", true) ? _u8add(clip, ["APC Colorama"]) : null;
    var k = _u8fx(clip, nK);
    _u8set(k, ["Key Color", 2], [1, 1, 1]); _u8set(k, ["Matching Tolerance", 4], 0.26); _u8set(k, ["Matching Softness", 5], 0.10);
    var t = _u8fx(clip, nT2); _u8set(t, [1], [1, 1, 1]); _u8set(t, [2], [0, 0, 0]);   // swapped: dark -> white
    _u8set(_u8fx(clip, nTh), [1], _u8o(opts, "level", 128));
    if (nCo) {   // subtle colour flicker
        var c = _u8fx(clip, nCo), ph = _u8prop(c, ["Phase Shift"]);
        if (ph) ph.expression = "posterizeTime(8); random(0, 8)";
        _u8set(c, ["Blend With Original"], 0.85);
    }
    return {bg: bg, star: st, cut: clip};
}

// ---- effect 4 -------------------------------------------------------------------------------------------
// clipB sits above clipA and starts at t0. A colour key with rising tolerance eats B in, Echo smears it.
function keySlideEcho(comp, clipB, t0, dur, opts) {
    var fd = comp.frameDuration;
    var nK = _u8add(clipB, ["ADBE Linear Color Key2", "ADBE Linear Color Key"]);
    var k = _u8fx(clipB, nK);
    _u8set(k, ["Key Color", 2], _u8o(opts, "keyColor", [0.5, 0.45, 0.4]));   // "sample a random colour"
    _u8keys(_u8prop(k, ["Matching Tolerance", 4]), [t0, t0 + dur], [1.0, 0.0], 40, 85);   // fully keyed -> fully visible
    var a = _u8adj(comp, "ADJ_ECHO", t0, t0 + dur);
    a.moveBefore(clipB);
    var nE = _u8add(a, ["ADBE Echo"]);
    var e = _u8fx(a, nE);
    _u8set(e, [1], -2 * fd);                                                     // Echo Time (s)
    _u8keys(_u8prop(e, [2]), [t0, t0 + dur - fd], [_u8o(opts, "echoes", 8), 1], 40, 85);   // Number Of Echoes -> 1 at the end
    _u8set(e, [4], 0.7);                                                         // Decay
    _u8set(e, [5], _u8o(opts, "operator", 6));                                   // Echo Operator VERIFY: 1 Add 2 Max 3 Min 4 Screen 5 Composite Back 6 Composite Front 7 Blend
    _u8keys(a.property("ADBE Transform Group").property("ADBE Opacity"), [t0, t0 + 4 * fd], [0, 100], 33, 33);
    return a;
}

// ---- effect 5 -------------------------------------------------------------------------------------------
function ballActionGlow(comp, clip, t0, opts) {
    var fd = comp.frameDuration;
    var base = clip.duplicate(); base.name = "VID_CLEAN_" + clip.name; _u8stripFx(base); base.moveAfter(clip);
    var nV = _u8add(clip, ["CC Vignette"]);                     // head of the chain: reveal (stock has no Vignette)
    var nB = _u8add(clip, ["CC Ball Action"]);
    var nC = _u8add(clip, ["APC Colorama"]);
    var nG = _u8add(clip, ["S_Glow", "ADBE Glo2"]);
    var b = _u8fx(clip, nB);
    _u8set(b, ["Grid Spacing"], _u8o(opts, "grid", 8));
    _u8set(b, ["Ball Size"], _u8o(opts, "ball", 90));
    _u8set(b, ["Displace"], 89);                                  // shown on screen; Displace Property = Brightness
    _u8set(b, ["Scatter"], 0);
    var c = _u8fx(clip, nC);
    try { _u8set(c, ["Use Preset Palette"], 10); } catch (e) {}   // VERIFY: "Ramp Green"
    _u8set(c, ["Cycle Repetitions"], _u8o(opts, "reps", 3));
    var v = _u8fx(clip, nV);
    _u8keys(_u8prop(v, ["Amount", 1]), [t0, t0 + 18 * fd], [100, 0], 33, 85);     // closed -> open over 18 f
    return {top: clip, base: base};
}
