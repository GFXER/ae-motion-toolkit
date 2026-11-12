// effect_ideas_p7.jsx : NaughtyyJuan "Effect Ideas For Edits PART 7" as reusable ExtendScript helpers (ES3).
// Guide: private study notes (not included)
//
//   mercuryDroplets(layer, opts)            dup layer + CC Mr. Mercury on the top copy (+ Tint, + glow)
//   typewriterText(textLayer, t0, t1)       Typewriter preset rebuilt as an animator (opacity 0, start 0->100)
//   ransomLetter(comp, footage, pos, fps)   letter PNG sequence (W1,W2,W3...) cycling stepped at fps (8-12)
//   trackingBox(comp, target, opts)         red stroke box + crosshair, loose follow, 1-2 f gaps + rotation jolts, glow
//   horizontalTurbulence(layer, tHit, opts) Turbulent Displace Horizontal, size 17, amount 0 -> 400 -> 0 (1:2 frames)
//   scatterizeOut(layer, t0, frames, opts)  CC Scatterize scatter 0 -> N + Right Twist, Flow curve
// Flow curve used in the tutorial: 0.90, 0.01, 0.06, 1.00.
// Usage: #include "effect_ideas_p7.jsx"; horizontalTurbulence(vidLayer, 12.48);
// NOTE: written 2026-10-20, NOT yet run in AE. Test once in a scratch comp before using in a build.

var EI_LBL = {
    CONTROL: (typeof LBL !== "undefined") ? LBL.CONTROL : 1,
    SHAPE: (typeof LBL !== "undefined") ? LBL.SHAPE : 4,
    LIGHT: (typeof LBL !== "undefined") ? LBL.LIGHT : 5,
    VIDEO: (typeof LBL !== "undefined") ? LBL.VIDEO : 8,
    STILL: (typeof LBL !== "undefined") ? LBL.STILL : 9
};
var EI_CURVE = [0.90, 0.01, 0.06, 1.00];

function eiLog(msg) { try { $.writeln("[effect_ideas_p7] " + msg); } catch (e) {} }
function eiSet(fx, name, v) { try { fx.property(name).setValue(v); return true; } catch (e) { eiLog(fx.name + "." + name + ": " + String(e.message)); return false; } }
// add effect by first matchName/display name that works; returns the fetched effect (re-fetched by index)
function eiAddFx(L, names) {
    var fxg = L.property("ADBE Effect Parade"), q;
    for (q = 0; q < names.length; q++) {
        try { fxg.addProperty(names[q]); return fxg.property(fxg.numProperties); } catch (e) {}
    }
    eiLog("no effect from: " + names.join(", ")); return null;
}
// fetch effect by index after all adds (adding effects invalidates earlier references)
function eiFx(L, idx) { return L.property("ADBE Effect Parade").property(idx); }
function eiIdx(L) { return L.property("ADBE Effect Parade").numProperties; }
function eiAddFxIdx(L, names) { var e = eiAddFx(L, names); return e ? eiIdx(L) : 0; }

// 1D two-key move with a Flow/CSS cubic-bezier converted to AE ease
function eiKeyCurve(prop, t0, v0, t1, v1, curve) {
    curve = curve || EI_CURVE;
    var k0 = prop.addKey(t0); prop.setValueAtKey(k0, v0);
    var k1 = prop.addKey(t1); prop.setValueAtKey(k1, v1);
    k0 = prop.nearestKeyIndex(t0); k1 = prop.nearestKeyIndex(t1);
    var slope = (v1 - v0) / (t1 - t0);
    var x1 = Math.max(curve[0], 0.001), x2 = Math.min(curve[2], 0.999);
    var oI = Math.max(0.1, Math.min(100, x1 * 100)), iI = Math.max(0.1, Math.min(100, (1 - x2) * 100));
    try {
        prop.setTemporalEaseAtKey(k0, [new KeyframeEase(0, oI)], [new KeyframeEase((curve[1] / x1) * slope, oI)]);
        prop.setTemporalEaseAtKey(k1, [new KeyframeEase(((1 - curve[3]) / (1 - x2)) * slope, iI)], [new KeyframeEase(0, iI)]);
    } catch (e) { eiLog("ease " + prop.name + ": " + String(e.message)); }
}
function eiGlow(L) {   // Deep Glow 2 (owned) -> Sapphire -> stock
    return eiAddFx(L, ["S_Glow", "ADBE Glo2"]);
}

// ---------- 1. Mr. Mercury droplets ----------
// opts: {radius:5, birth:1, longevity:2, velocity:1, gravity:1, birthSize:0.15, deathSize:0.75, producer:[x,y],
//        tint:[r,g,b] (null = none), glow:true}
function mercuryDroplets(layer, opts) {
    opts = opts || {};
    var top = layer.duplicate();
    top.name = "FX_MERCURY_" + layer.name;
    top.label = EI_LBL.LIGHT;
    var iM = eiAddFxIdx(top, ["CC Mr. Mercury"]);
    var iT = opts.tint ? eiAddFxIdx(top, ["ADBE Tint"]) : 0;
    var iG = (opts.glow === false) ? 0 : (eiGlow(top) ? eiIdx(top) : 0);
    if (iM) {
        var m = eiFx(top, iM), r = opts.radius !== undefined ? opts.radius : 5;
        eiSet(m, "Radius X", r); eiSet(m, "Radius Y", r);
        if (opts.producer) eiSet(m, "Producer", opts.producer);
        eiSet(m, "Velocity", opts.velocity !== undefined ? opts.velocity : 1.0);
        eiSet(m, "Birth Rate", opts.birth !== undefined ? opts.birth : 1.0);
        eiSet(m, "Longevity (sec)", opts.longevity !== undefined ? opts.longevity : 2.0);
        eiSet(m, "Gravity", opts.gravity !== undefined ? opts.gravity : 1.0);
        eiSet(m, "Resistance", 0);
        eiSet(m, "Blob Birth Size", opts.birthSize !== undefined ? opts.birthSize : 0.15);
        eiSet(m, "Blob Death Size", opts.deathSize !== undefined ? opts.deathSize : 0.75);
        // Animation = Explosive and Influence Map = Blob in & out are what the frame shows (check defaults in AE)
    }
    if (iT) {
        var t = eiFx(top, iT);
        try { t.property(2).setValue(opts.tint); t.property(3).setValue(60); } catch (e1) { eiLog("tint: " + String(e1.message)); }  // map white to, amount
    }
    if (iG) eiLog("glow added on " + top.name + " (tune radius/intensity by eye)");
    return top;
}

// ---------- 2. Typewriter ----------
function typewriterText(textLayer, t0, t1) {
    var anims = textLayer.property("ADBE Text Properties").property("ADBE Text Animators");
    anims.addProperty("ADBE Text Animator");
    var A = anims.property(anims.numProperties);
    A.name = "Typewriter";
    A.property("ADBE Text Animator Properties").addProperty("ADBE Text Opacity");
    A.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
    A = anims.property(anims.numProperties);                       // re-fetch after adds
    A.property("ADBE Text Animator Properties").property("ADBE Text Opacity").setValue(0);
    var sel = A.property("ADBE Text Selectors").property(1);
    try { sel.property("ADBE Text Range Advanced").property("ADBE Text Selector Smoothness").setValue(0); } catch (e) { eiLog("smoothness: " + String(e.message)); }
    var st = sel.property("ADBE Text Percent Start");
    st.setValueAtTime(t0, 0); st.setValueAtTime(t1, 100);
    try {
        st.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
        st.setInterpolationTypeAtKey(2, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
    } catch (e2) {}
    return A;
}

// ---------- 3. Ransom / magazine letter ----------
// footage = a PNG-sequence FootageItem of one letter's variants (import W1.png with sequence on).
function ransomLetter(comp, footage, pos, fps) {
    var L = comp.layers.add(footage);
    L.name = "IMG_LETTER_" + footage.name;
    L.label = EI_LBL.STILL;
    L.property("ADBE Transform Group").property("ADBE Position").setValue(pos);
    L.timeRemapEnabled = true;
    L.outPoint = comp.duration;
    var rate = fps ? fps : 12;
    L.property("ADBE Time Remapping").expression =
        "var fps=" + rate + "; var fd=thisLayer.source.frameDuration;" +
        "var n=Math.max(1,Math.round(thisLayer.source.duration/fd));" +
        "var f=Math.floor(Math.max(0,time-inPoint)*fps)%n; f*fd;";
    return L;
}

// ---------- 4. Tracking box ----------
// target: Layer to follow (its anchor via toComp, lagged) or null + opts.pos. opts: {w,h,color,stroke,lag,
//   gapEvery:[min,max] frames, gapLen:[1,2], jolt: max deg, bw: true (Tint on target), glow:true, t0, t1}
function trackingBox(comp, target, opts) {
    opts = opts || {};
    var fd = comp.frameDuration;
    var t0 = opts.t0 !== undefined ? opts.t0 : (target ? target.inPoint : 0);
    var t1 = opts.t1 !== undefined ? opts.t1 : (target ? target.outPoint : comp.duration);
    var L = comp.layers.addShape();
    L.name = "SHP_TRACKBOX";
    L.label = EI_LBL.SHAPE;
    var root = L.property("ADBE Root Vectors Group");
    var gBox = root.addProperty("ADBE Vector Group"); gBox.name = "Box";
    var gCross = root.addProperty("ADBE Vector Group"); gCross.name = "Cross";
    var vb = root.property(1).property("ADBE Vectors Group");
    vb.addProperty("ADBE Vector Shape - Rect"); vb.addProperty("ADBE Vector Graphic - Stroke");
    var vc = root.property(2).property("ADBE Vectors Group");
    vc.addProperty("ADBE Vector Shape - Rect"); vc.addProperty("ADBE Vector Shape - Rect"); vc.addProperty("ADBE Vector Graphic - Fill");
    // fetch after adds
    vb = root.property(1).property("ADBE Vectors Group"); vc = root.property(2).property("ADBE Vectors Group");
    var w = opts.w || 520, h = opts.h || 1100, col = opts.color || [1, 0, 0];
    var sw = opts.stroke || Math.max(4, Math.round(comp.height / 480));
    var cs = Math.round(Math.min(w, h) * 0.18);
    vb.property(1).property("ADBE Vector Rect Size").setValue([w, h]);
    vb.property(2).property("ADBE Vector Stroke Color").setValue(col);
    vb.property(2).property("ADBE Vector Stroke Width").setValue(sw);
    vc.property(1).property("ADBE Vector Rect Size").setValue([cs, sw]);
    vc.property(2).property("ADBE Vector Rect Size").setValue([sw, cs]);
    vc.property(3).property("ADBE Vector Fill Color").setValue(col);
    var tr = L.property("ADBE Transform Group");
    tr.property("ADBE Anchor Point").setValue([0, 0]);
    L.inPoint = t0; L.outPoint = t1;
    if (target) {
        var lag = opts.lag !== undefined ? opts.lag : 0.08;            // loose follow: "doesn't have to be perfect"
        tr.property("ADBE Position").expression =
            "var T=thisComp.layer(" + target.index + "); var lag=" + lag + ";" +
            "T.toComp(T.anchorPoint, time-lag);";
    } else {
        tr.property("ADBE Position").setValue(opts.pos || [comp.width / 2, comp.height / 2]);
    }
    // pop on with no gap, then 1-2 f gaps at random spots + small rotation jolts (hold keys)
    var op = tr.property("ADBE Opacity"), rot = tr.property("ADBE Rotate Z");
    var ge = opts.gapEvery || [6, 14], gl = opts.gapLen || [1, 2], jolt = opts.jolt !== undefined ? opts.jolt : 4;
    var t = t0 + Math.round(ge[0] + Math.random() * (ge[1] - ge[0])) * fd, guard = 0;
    op.setValueAtTime(t0, 100); rot.setValueAtTime(t0, 0);
    while (t < t1 - 2 * fd && guard < 400) {
        var len = Math.round(gl[0] + Math.random() * (gl[1] - gl[0]));
        op.setValueAtTime(t, 0);
        op.setValueAtTime(t + len * fd, 100);
        rot.setValueAtTime(t + len * fd, (Math.random() * 2 - 1) * jolt);
        t += (len + Math.round(ge[0] + Math.random() * (ge[1] - ge[0]))) * fd;
        guard++;
    }
    var k;
    for (k = 1; k <= op.numKeys; k++) { try { op.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD); } catch (e1) {} }
    for (k = 1; k <= rot.numKeys; k++) { try { rot.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD); } catch (e2) {} }
    if (opts.bw && target) {
        var iTi = eiAddFxIdx(target, ["ADBE Tint"]);
        var iBc = eiAddFxIdx(target, ["ADBE Brightness & Contrast 2"]);
        if (iBc) { try { eiFx(target, iBc).property(1).setValue(12); } catch (e3) {} }   // "curves brighter"
        if (iTi) eiLog("B&W tint on " + target.name);
    }
    if (opts.glow !== false) eiGlow(L);   // Sapphire glows clip to layer bounds: precompose if it clips
    return L;
}

// ---------- 5. Horizontal turbulence hit ----------
// opts: {amount:400, size:17, pre: frames before (default fps/30), post: frames after (default 2*pre)}
function horizontalTurbulence(layer, tHit, opts) {
    opts = opts || {};
    var comp = layer.containingComp, fd = comp.frameDuration, fps = Math.round(1 / fd);
    var pre = opts.pre ? opts.pre : Math.max(1, Math.round(fps / 30));
    var post = opts.post ? opts.post : pre * 2;                          // 1:2 house rule
    var idx = eiAddFxIdx(layer, ["ADBE Turbulent Displace"]);
    if (!idx) return null;
    var td = eiFx(layer, idx);
    eiSet(td, "Displacement", 8);          // 8 = Horizontal Displacement (7 Vertical, 9 Cross) - verify once
    eiSet(td, "Size", opts.size ? opts.size : 17);
    eiSet(td, "Complexity", 1);
    var am = td.property("Amount");
    var A = opts.amount ? opts.amount : 400;
    am.setValueAtTime(tHit - pre * fd, 0);
    am.setValueAtTime(tHit, A);
    am.setValueAtTime(tHit + post * fd, 0);
    var k;
    for (k = 1; k <= am.numKeys; k++) {
        try { am.setTemporalEaseAtKey(k, [new KeyframeEase(0, 33)], [new KeyframeEase(0, 33)]); } catch (e) {}   // easy ease
    }
    return td;
}

// ---------- 6. CC Scatterize out ----------
// opts: {scatter: 150, twist: 90 (deg, Right Twist), left: false, curve}
function scatterizeOut(layer, t0, frames, opts) {
    opts = opts || {};
    var fd = layer.containingComp.frameDuration;
    var idx = eiAddFxIdx(layer, ["CC Scatterize"]);
    if (!idx) return null;
    var sc = eiFx(layer, idx);
    var t1 = t0 + frames * fd;
    try { eiKeyCurve(sc.property("Scatter"), t0, 0, t1, opts.scatter ? opts.scatter : 150, opts.curve); } catch (e1) { eiLog("scatter: " + String(e1.message)); }
    var tw = opts.left ? "Left Twist" : "Right Twist";
    try { eiKeyCurve(sc.property(tw), t0, 0, t1, opts.twist !== undefined ? opts.twist : 90, opts.curve); } catch (e2) { eiLog("twist: " + String(e2.message)); }
    return sc;
}
