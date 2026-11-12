// noahsocold_fx.jsx : the NEW noahsocold-style techniques from the 2026-10-20 addendum (ES3 ExtendScript).
// Guide: private study notes (not included) -> "Addendum 2026-10-20 (1CQgJiD2oGU, TT_zdf_M_zE, FncdoRgDesI)"
//
//   ghostTrail(comp, cutLayer, t0, opts)      liquid ghost trail behind a roto'd subject (1CQgJiD2oGU)
//                                             opts.mode "time" (Time Displacement, tutorial favourite) | "turb" (Turbulent Displace)
//   blurPulse(comp, t0, t1, opts)             Fast Box Blur 0 <-> peak every 2 f texture pulse (TT_zdf_M_zE #1)
//   mirrorFlicker(comp, srcs, t0, pattern, opts)  one-framer A/B flicker + mirrored half-frame insert + 8 f exposure flash (TT #2)
//   xrayGrunge(comp, t0, dur, opts)           Glow -> Invert -> Tint -> mono Noise -> Levels -> Gaussian (TT #3)
//   eyeFlicker(comp, src, frames, opts)       eye-locked freeze-frame "picture flicker" + eye-cutout collage (FncdoRgDesI)
//
// All tutorial numbers were taken at 1920x1080 / 30 fps. Helpers scale pixels by comp.width/1920 (k) and
// frames by comp fps/30 (so 18 f @30 = 36 f @60). Pass opts to override.
// Usage:  #include "layer_labels.jsx" (optional)   #include "noahsocold_fx.jsx"
//   var g = ghostTrail(comp, PC_cutout, 4.0, {mode: "time", tint: [1, 0.54, 0.12]});
//   blurPulse(comp, 2.0, 3.2);
//   mirrorFlicker(comp, [clipA, clipB, clipC], 6.0, "ABABMBMB", {mirrorSrc: 2, side: "R", flash: true});
//   xrayGrunge(comp, 10.0, 1.5);
//   eyeFlicker(comp, footLayer, [{t: 3.20, ex: 960, ey: 420, rot: -4, d: 180}, ...], {target: [1080, 1500], eyeDist: 420});
// NOTE: written 2026-10-20, NOT yet run in AE. Test once in a scratch comp before using in a build.
// Dropdown indices marked VERIFY are guesses; nsDrop() first tries the label through propertyParameters.

var NS_LBL = {
    CONTROL: (typeof LBL !== "undefined" && LBL.CONTROL) ? LBL.CONTROL : 1,
    ADJ: (typeof LBL !== "undefined" && LBL.ADJ) ? LBL.ADJ : 3,
    FX: (typeof LBL !== "undefined" && LBL.FX) ? LBL.FX : 5,
    MATTE: (typeof LBL !== "undefined" && LBL.MATTE) ? LBL.MATTE : 7,
    VID: (typeof LBL !== "undefined" && LBL.VID) ? LBL.VID : 8,
    PC: (typeof LBL !== "undefined" && LBL.PC) ? LBL.PC : 10
};

function nsLog(msg) { try { $.writeln("[noahsocold_fx] " + msg); } catch (e) {} }
function nsFps(comp) { return 1 / comp.frameDuration; }
function nsK(comp) { return comp.width / 1920; }               // pixel scale vs the 1080p tutorials
function nsF(comp, f30) { return (f30 / 30); }                  // tutorial frames @30 -> seconds (same duration at any fps)
function nsFx(L, mn) {
    try { return L.property("ADBE Effect Parade").addProperty(mn); }
    catch (e) { nsLog("addProperty failed " + mn + ": " + String(e.message) + " L" + e.line); return null; }
}
// re-fetch an effect by name AFTER all effects were added (adding effects invalidates old references)
function nsGet(L, fx) { return L.property("ADBE Effect Parade").property(fx.name); }
// property by display name list, then by index fallback
function nsProp(fx, names, idx) {
    var q, p = null;
    for (q = 0; q < names.length; q++) { try { p = fx.property(names[q]); } catch (e) { p = null; } if (p) return p; }
    if (idx) { try { return fx.property(idx); } catch (e2) {} }
    nsLog("prop not found: " + names[0]); return null;
}
function nsSet(fx, names, idx, v) {
    var p = nsProp(fx, names, idx);
    if (!p) return null;
    try { p.setValue(v); } catch (e) { nsLog("set failed " + names[0] + ": " + String(e.message) + " L" + e.line); }
    return p;
}
// dropdown by label (AE propertyParameters), else 1-based fallback index
function nsDrop(p, label, fallback) {
    if (!p) return;
    var q, lst = null;
    try { lst = p.propertyParameters; } catch (e) { lst = null; }
    if (lst) {
        for (q = 0; q < lst.length; q++) {
            if (String(lst[q]).toLowerCase() === String(label).toLowerCase()) { p.setValue(q + 1); return; }
        }
    }
    try { p.setValue(fallback); } catch (e2) { nsLog("dropdown failed " + label + ": " + String(e2.message)); }
}
function nsEaseArr(n, spd, inf) { var a = [], q; for (q = 0; q < n; q++) a.push(new KeyframeEase(spd, inf)); return a; }
function nsEase(p, k, inf) {
    var dims = [1, 2, 3], d;
    for (d = 0; d < dims.length; d++) {
        try { p.setTemporalEaseAtKey(k, nsEaseArr(dims[d], 0, inf), nsEaseArr(dims[d], 0, inf)); return; } catch (e) {}
    }
}
// keys: times[] / vals[]; ease "easy" (33.33 % = AE Easy Ease, as in all three tutorials) | "linear" | "hold"
function nsKeys(p, times, vals, ease) {
    if (!p) return;
    var q, k;
    for (q = 0; q < times.length; q++) {
        k = p.addKey(times[q]); p.setValueAtKey(k, vals[q]);
        if (ease === "hold") p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
        else if (ease === "linear") p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
        else nsEase(p, k, 33.333);
    }
}
function nsAdj(comp, name, t0, dur) {
    var L = comp.layers.addSolid([1, 1, 1], name, comp.width, comp.height, 1, Math.max(dur, comp.frameDuration));
    L.adjustmentLayer = true; L.startTime = 0; L.inPoint = t0; L.outPoint = t0 + dur; L.label = NS_LBL.ADJ;
    return L;
}

// ---------------------------------------------------------------------------------------------------
// 1) GHOST TRAIL (1CQgJiD2oGU). Noise maps are baked into precomps, so the Time Displacement /
//    Displacement Map "Effects & Masks" source setting (not scriptable) is not needed.
// ---------------------------------------------------------------------------------------------------
function nsNoiseMapComp(comp, name, dur, posterizeLevels) {
    var mc = app.project.items.addComp(name, comp.width, comp.height, 1, dur, nsFps(comp));
    var s = mc.layers.addSolid([0, 0, 0], "SHP_FRACTAL_NOISE", comp.width, comp.height, 1, dur);
    var fn = nsFx(s, "ADBE Fractal Noise");
    var pz = posterizeLevels ? nsFx(s, "ADBE Posterize") : null;
    fn = nsGet(s, fn);
    nsDrop(nsProp(fn, ["Fractal Type"], 1), "Smeary", 12);            // VERIFY fallback index
    nsDrop(nsProp(fn, ["Noise Type"], 2), "Spline", 4);
    nsSet(fn, ["Contrast"], 0, 370);
    nsSet(fn, ["Brightness"], 0, 50);
    try { fn.property("Transform").property("Scale").setValue(150); } catch (e) { nsSet(fn, ["Scale"], 0, 150); }
    nsKeys(nsProp(fn, ["Evolution"], 0), [0, dur], [0, 360], "easy");   // one full cycle over the clip
    if (pz) { pz = nsGet(s, pz); nsSet(pz, ["Level"], 1, posterizeLevels); }
    return mc;
}
// cutLayer must be a PRECOMP of the roto cutout (tutorial: feather 10, shift edge -35; ours: matte_subject +
// 1 px Simple Choker inside the precomp). A layer that relies on a track matte loses it when duplicated.
function ghostTrail(comp, cutLayer, t0, opts) {
    opts = opts || {};
    var mode = opts.mode || "time";
    var k = nsK(comp);
    var dur = opts.dur || (cutLayer.outPoint - t0);
    var ramp = (mode === "time") ? nsF(comp, 18) : nsF(comp, 10);      // 18 f / 10 f @30 build-in
    if (opts.ramp) ramp = opts.ramp;
    // maps
    var m1c = nsNoiseMapComp(comp, "PC_GHOST_NOISE_" + cutLayer.index, comp.duration, 0);
    var m1 = comp.layers.add(m1c); m1.enabled = false; m1.name = "MATTE_GHOST_NOISE"; m1.label = NS_LBL.MATTE;
    var m2 = null;
    if (mode === "time") {
        var m2c = nsNoiseMapComp(comp, "PC_GHOST_NOISE_POST_" + cutLayer.index, comp.duration, 5);
        m2 = comp.layers.add(m2c); m2.enabled = false; m2.name = "MATTE_GHOST_NOISE_POST"; m2.label = NS_LBL.MATTE;
    }
    // ghost = duplicate of the cutout, BELOW the clean cutout
    var g = cutLayer.duplicate(); g.moveAfter(cutLayer); g.name = "FX_GHOST_TRAIL"; g.label = NS_LBL.FX;
    g.inPoint = t0; g.outPoint = t0 + dur;
    var t1 = t0 + ramp;
    var e1, fmb, ech, dm, tt;
    if (mode === "time") {
        e1 = nsFx(g, "ADBE Time Displacement");
    } else {
        e1 = nsFx(g, "ADBE Turbulent Displace");
    }
    fmb = nsFx(g, "CC Force Motion Blur");
    ech = nsFx(g, "ADBE Echo");
    dm = nsFx(g, "ADBE Displacement Map");
    if (mode === "time" && opts.tint !== false) tt = nsFx(g, "ADBE Tritone");
    // fetch after all adds
    e1 = nsGet(g, e1); fmb = nsGet(g, fmb); ech = nsGet(g, ech); dm = nsGet(g, dm); if (tt) tt = nsGet(g, tt);
    if (mode === "time") {
        nsSet(e1, ["Time Displacement Layer"], 1, m1.index);
        nsKeys(nsProp(e1, ["Max Displacement Time [sec]", "Max Displacement Time"], 2), [t0, t1], [0, 1], "easy");
        nsSet(e1, ["Time Resolution [fps]", "Time Resolution"], 3, 12);   // 12 fps = the stepped "liquid" look
    } else {
        nsDrop(nsProp(e1, ["Displacement"], 1), "Cross Displacement", 9); // VERIFY fallback index
        nsSet(e1, ["Size"], 3, 100 * k);
        nsKeys(nsProp(e1, ["Amount"], 2), [t0, t0 + dur], [0, 100 * k], "easy");
        nsKeys(nsProp(e1, ["Evolution"], 6), [t0, t0 + dur], [0, 360], "easy");
    }
    // CC Force Motion Blur: samples 16, shutter 360 (render heavy with Time Displacement!)
    nsSet(fmb, ["Motion Blur Samples"], 0, 16);
    nsSet(fmb, ["Override Shutter Angle"], 0, 1);
    nsSet(fmb, ["Shutter Angle"], 0, 360);
    // Echo  (1 time, 2 number, 3 start intensity, 4 decay, 5 operator)
    if (mode === "time") {
        nsDrop(nsProp(ech, ["Echo Operator"], 5), "Maximum", 2);
        nsKeys(nsProp(ech, ["Number Of Echoes", "Number of Echoes"], 2), [t0, t1], [0, 5], "easy");
        nsSet(ech, ["Decay"], 4, 0.60);
    } else {
        nsSet(ech, ["Echo Time (seconds)", "Echo Time"], 1, -0.015);
        nsDrop(nsProp(ech, ["Echo Operator"], 5), "Composite In Front", 6);
        nsKeys(nsProp(ech, ["Number Of Echoes", "Number of Echoes"], 2), [t0, t1], [0, 8], "easy");
    }
    // Displacement Map: horizontal only, 0 -> 100 px (time) / 50 px (turb) at 1080p
    nsSet(dm, ["Displacement Map Layer"], 1, (m2 ? m2 : m1).index);
    nsSet(dm, ["Max Vertical Displacement"], 5, 0);
    nsKeys(nsProp(dm, ["Max Horizontal Displacement"], 3), [t0, t1], [0, (mode === "time" ? 100 : 50) * k], "easy");
    nsSet(dm, ["Expand Output"], 8, 1);
    // Tritone: midtones bright orange, Blend With Original 100 -> 0 % over the ramp
    if (tt) {
        var mid = opts.tint || [1.0, 0.55, 0.12];
        nsSet(tt, ["Midtones"], 2, mid);
        nsKeys(nsProp(tt, ["Blend With Original"], 4), [t0, t1], [100, 0], "easy");
    }
    return g;
}

// ---------------------------------------------------------------------------------------------------
// 2) BLUR PULSE (TT #1): Fast Box Blur radius 0 / 15 (1080p) alternating every 2 f, all keys Easy Ease.
// ---------------------------------------------------------------------------------------------------
function blurPulse(comp, t0, t1, opts) {
    opts = opts || {};
    var peak = (opts.peak !== undefined) ? opts.peak : 15 * nsK(comp);
    var step = (opts.stepF30 || 2) / 30;                         // 2 f @30 (= 4 f @60)
    var L = nsAdj(comp, "ADJ_BLUR_PULSE", t0, t1 - t0);
    var bb = nsFx(L, "ADBE Box Blur2"); bb = nsGet(L, bb);
    nsSet(bb, ["Repeat Edge Pixels"], 0, 1);
    var ts = [], vs = [], t = t0, on = false;
    while (t <= t1 + 0.0001) { ts.push(t); vs.push(on ? peak : 0); on = !on; t += step; }
    nsKeys(nsProp(bb, ["Blur Radius"], 1), ts, vs, "easy");
    return L;
}

// ---------------------------------------------------------------------------------------------------
// 3) MIRROR FLICKER (TT #2). srcs = [layerA, layerB, layerC...] already placed on the timeline (live).
//    pattern chars: "A","B","C"... = 1-step slice of that source; "M" = mirrored half-frame of srcs[opts.mirrorSrc]
//    (subject must sit on one half of the frame: rectangle mask on that half + a horizontally flipped copy).
//    One step = 1 f @30 by default (opts.stepF = frames at comp fps; at 50/60 fps use 2 f so it still reads).
//    Ends with an 8 f (@30) Exposure 2.5 -> 0 flash adjustment layer into whatever follows.
// ---------------------------------------------------------------------------------------------------
function nsHalfMask(L, side) {
    var w = L.source.width, h = L.source.height;
    var m = L.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
    var sh = new Shape();
    var x0 = (side === "L") ? 0 : w / 2, x1 = (side === "L") ? w / 2 : w;
    sh.vertices = [[x0, 0], [x1, 0], [x1, h], [x0, h]]; sh.closed = true;
    m.property("ADBE Mask Shape").setValue(sh);
    return m;
}
function mirrorFlicker(comp, srcs, t0, pattern, opts) {
    opts = opts || {};
    var fd = comp.frameDuration;
    var stepF = opts.stepF || Math.max(1, Math.round(nsFps(comp) / 30));
    var step = stepF * fd;
    var mirrorSrc = srcs[(opts.mirrorSrc !== undefined) ? opts.mirrorSrc : srcs.length - 1];
    var side = opts.side || "R";
    var made = [], q, ch, idx, a, b, s, ts;
    for (q = 0; q < pattern.length; q++) {
        ch = pattern.charAt(q);
        ts = t0 + q * step;
        if (ch === "M") {
            a = mirrorSrc.duplicate(); a.name = "VID_FLK_" + q + "_M"; nsHalfMask(a, side);
            b = a.duplicate(); b.name = "VID_FLK_" + q + "_Mflip";
            s = b.property("ADBE Transform Group").property("ADBE Scale").value;
            b.property("ADBE Transform Group").property("ADBE Scale").setValue([-s[0], s[1], s.length > 2 ? s[2] : 100]);
            a.inPoint = ts; a.outPoint = ts + step; b.inPoint = ts; b.outPoint = ts + step;
            a.moveToBeginning(); b.moveToBeginning(); a.label = NS_LBL.VID; b.label = NS_LBL.VID;
            made.push(a); made.push(b);
        } else {
            idx = ch.charCodeAt(0) - 65;                           // "A" -> 0
            if (idx < 0 || idx >= srcs.length) continue;
            a = srcs[idx].duplicate(); a.name = "VID_FLK_" + q + "_" + ch;
            a.inPoint = ts; a.outPoint = ts + step; a.moveToBeginning(); a.label = NS_LBL.VID;
            made.push(a);
        }
    }
    if (opts.flash !== false) {
        var tf = t0 + pattern.length * step, fl = nsF(comp, 8);
        var L = nsAdj(comp, "ADJ_FLK_FLASH", tf, fl); L.moveToBeginning();
        var ex = nsFx(L, "ADBE Exposure2"); ex = nsGet(L, ex);
        nsKeys(ex.property(3), [tf, tf + fl], [opts.flashStops || 2.5, 0], "easy");
        made.push(L);
    }
    return made;
}

// ---------------------------------------------------------------------------------------------------
// 4) X-RAY GRUNGE (TT #3) adjustment stack. Curves (not scriptable as data) -> Pro Levels pulls
//    highlights and shadows down a little, same intent.
// ---------------------------------------------------------------------------------------------------
function xrayGrunge(comp, t0, dur, opts) {
    opts = opts || {};
    var k = nsK(comp);
    var L = nsAdj(comp, "ADJ_XRAY_GRUNGE", t0, dur);
    var gl = nsFx(L, "ADBE Glo2"), iv = nsFx(L, "ADBE Invert"), tn = nsFx(L, "ADBE Tint"),
        nz = nsFx(L, "ADBE Noise"), lv = nsFx(L, "ADBE Pro Levels2"), gb = nsFx(L, "ADBE Gaussian Blur 2");
    gl = nsGet(L, gl); iv = nsGet(L, iv); tn = nsGet(L, tn); nz = nsGet(L, nz); lv = nsGet(L, lv); gb = nsGet(L, gb);
    nsSet(gl, ["Glow Radius"], 0, 120 * k);
    nsSet(gl, ["Glow Intensity"], 0, opts.glowInt || 0.4);         // "decrease intensity" -> textured bloom
    nsSet(tn, ["Amount to Tint"], 3, 100);                          // B&W
    nsSet(nz, ["Amount of Noise"], 1, 10);
    nsSet(nz, ["Use Color Noise"], 2, 0);
    nsSet(nz, ["Clipping"], 3, 1);                                  // house rule: clipping ON
    lv.property("ADBE Pro Levels2-0004").setValue(0.03);            // in-black: shadows down a touch
    try { lv.property("ADBE Pro Levels2-0008").setValue(0.90); } catch (e) {}   // out-white: highlights down a touch (VERIFY id)
    nsSet(gb, ["Blurriness"], 1, 3 * k);
    nsSet(gb, ["Repeat Edge Pixels"], 0, 1);
    return L;
}

// ---------------------------------------------------------------------------------------------------
// 5) EYE FLICKER (FncdoRgDesI). frames: [{t, ex, ey, rot, d}] in SOURCE pixels, from Python
//    (Vision landmarks: eye midpoint ex/ey, eye-line roll rot in deg, inter-pupil distance d).
//    Each entry = a 3 f @30 freeze, anchored on the eyes, levelled (rotation -rot), scaled so d -> opts.eyeDist.
//    CC RepeTile (Unfold) fills the exposed edges. From the 2nd freeze on, an eye-strip cutout of that frame
//    (mask, drop shadow) is stacked over the LAST freeze -> collage. Then everything is precomposed, Exposure
//    wiggle(12,2) flickers it and Transform scale 100 -> 107 % pushes in on the eye point.
// ---------------------------------------------------------------------------------------------------
function nsFreeze(src, srcT, t0, dur) {
    var L = src.duplicate();
    L.timeRemapEnabled = true;
    var tr = L.property("ADBE Time Remapping");
    while (tr.numKeys > 0) tr.removeKey(1);
    tr.setValue(srcT);
    L.startTime = t0; L.inPoint = t0; L.outPoint = t0 + dur;
    return L;
}
function nsEyeAlign(L, f, target, eyeDist, baseScale) {
    var T = L.property("ADBE Transform Group");
    var sc = baseScale * (f.d ? eyeDist / f.d : 1) * 100;
    T.property("ADBE Anchor Point").setValue([f.ex, f.ey]);
    T.property("ADBE Position").setValue(target);
    T.property("ADBE Scale").setValue([sc, sc]);
    T.property("ADBE Rotate Z").setValue(-(f.rot || 0));
}
function eyeFlicker(comp, src, frames, opts) {
    opts = opts || {};
    var hold = nsF(comp, opts.holdF30 || 3);
    var target = opts.target || [comp.width / 2, comp.height * 0.42];
    var eyeDist = opts.eyeDist || comp.width * 0.2;
    var base = opts.baseScale || 1.0;
    var t0 = opts.t0 || 0, q, f, L, rt, cut, m, sh, ds, made = [], cuts = [];
    var lastT = t0 + (frames.length - 1) * hold;
    for (q = 0; q < frames.length; q++) {
        f = frames[q];
        L = nsFreeze(src, f.t, t0 + q * hold, hold); L.name = "VID_EYE_" + q; L.label = NS_LBL.VID;
        nsEyeAlign(L, f, target, eyeDist, base);
        rt = nsFx(L, "CC RepeTile"); rt = nsGet(L, rt);
        nsSet(rt, ["Expand Right"], 1, comp.width); nsSet(rt, ["Expand Left"], 2, comp.width);
        nsSet(rt, ["Expand Down"], 3, comp.height); nsSet(rt, ["Expand Up"], 4, comp.height);
        nsDrop(nsProp(rt, ["Tiling"], 5), "Unfold", 4);              // VERIFY fallback index
        made.push(L);
        if (q >= 1 && opts.collage !== false) {
            cut = nsFreeze(src, f.t, lastT, hold); cut.name = "VID_EYECUT_" + q; cut.label = NS_LBL.VID;
            nsEyeAlign(cut, f, target, eyeDist, base);
            // small offset so the stacked strips read as a collage (our addition; tutorial relies on imperfect alignment)
            var T = cut.property("ADBE Transform Group");
            var jx = ((q % 2) ? 1 : -1) * eyeDist * 0.06 * q, jy = ((q % 3) - 1) * eyeDist * 0.05;
            T.property("ADBE Position").setValue([target[0] + jx, target[1] + jy]);
            T.property("ADBE Rotate Z").setValue(-(f.rot || 0) + ((q % 2) ? 3 : -3));
            m = cut.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
            sh = new Shape();
            var hw = (f.d || 100) * 1.1, hh = (f.d || 100) * 0.38;
            sh.vertices = [[f.ex - hw, f.ey - hh], [f.ex + hw, f.ey - hh], [f.ex + hw, f.ey + hh], [f.ex - hw, f.ey + hh]];
            sh.closed = true; m.property("ADBE Mask Shape").setValue(sh);
            ds = nsFx(cut, "ADBE Drop Shadow"); ds = nsGet(cut, ds);
            nsSet(ds, ["Opacity"], 2, 60); nsSet(ds, ["Distance"], 4, 10 * nsK(comp)); nsSet(ds, ["Softness"], 5, 25 * nsK(comp));
            cuts.push(cut);
        }
    }
    // stacking: freezes in time order, cutouts above
    for (q = 0; q < made.length; q++) made[q].moveToBeginning();
    for (q = 0; q < cuts.length; q++) cuts[q].moveToBeginning();
    var all = made.concat(cuts), ids = [];
    for (q = 0; q < all.length; q++) ids.push(all[q].index);
    var pcomp = comp.layers.precompose(ids, "PC_PICTURE_FLICKER", true);
    var P = null;
    for (q = 1; q <= comp.numLayers; q++) { if (comp.layer(q).source === pcomp) { P = comp.layer(q); break; } }
    if (!P) { nsLog("precomp layer not found"); return null; }
    P.label = NS_LBL.PC; P.name = "PC_PICTURE_FLICKER";
    var ex = nsFx(P, "ADBE Exposure2"); ex = nsGet(P, ex);
    ex.property(3).expression = "wiggle(" + (opts.wigFreq || 12) + "," + (opts.wigAmt || 2) + ")";
    var PT = P.property("ADBE Transform Group");
    PT.property("ADBE Anchor Point").setValue(target); PT.property("ADBE Position").setValue(target);
    var ta = t0, tb = t0 + frames.length * hold;
    nsKeys(PT.property("ADBE Scale"), [ta, tb], [[100, 100], [opts.push || 107, opts.push || 107]], "easy");
    return P;
}
