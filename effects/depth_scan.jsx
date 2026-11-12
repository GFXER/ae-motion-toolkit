// depth_scan.jsx : Yeat "Flytroit"-style green depth-scan / point-cloud look (ES3 ExtendScript).
// Guide: private study notes (not included)   (tutorial: YouTube y5lbLCtChuM, 1920x1080 @29.97)
//
// Stack (on a PRECOMP of the footage, order matters):
//   CC Ball Action  grid spacing 2, ball size 50, displace 77 -> 148, twist angle -12 -> +3 (keyed through the shot)
//   Exposure        0 -> 1 stop over a few frames + loopOut("cycle")  = repeating scan pulse
//   Glow            threshold 72.9 %, radius 50, intensity 1
//   Tint            black -> black, white -> neon green
//   CC Lens         size 187, convergence 72 (fisheye bulge, centred)
//
// Usage:
//   #include "layer_labels.jsx" (optional)   #include "depth_scan.jsx"
//   depthScan(comp, PC_shot, {t0: 2.0, t1: 4.5});                       // tutorial values, scaled to comp size
//   depthScan(comp, PC_car,  {t0: 0, t1: 3, color: [1, 0.45, 0.1], grid: 4, pulseF30: 6});   // warm orange
//   depthScanReveal(comp, PC_shot, liveLayer, tCut, {beats: [..]});      // scan -> live hand-off on a beat (our addition)
// NOTE: written 2026-10-20, NOT yet run in AE. Test once in a scratch comp before using in a build.
// Render cost: grid spacing 2 on a 2160x3840 layer = ~2 M balls. Default here = 2 * (width/1920) rounded,
// i.e. 4 on our 4K vertical comps, which keeps the same ball count per image as the tutorial.

var DS_LBL_PC = (typeof LBL !== "undefined" && LBL.PC) ? LBL.PC : 10;
var DS_LBL_ADJ = (typeof LBL !== "undefined" && LBL.ADJ) ? LBL.ADJ : 3;

function dsLog(msg) { try { $.writeln("[depth_scan] " + msg); } catch (e) {} }
function dsFx(L, mn) {
    try { return L.property("ADBE Effect Parade").addProperty(mn); }
    catch (e) { dsLog("addProperty failed " + mn + ": " + String(e.message) + " L" + e.line); return null; }
}
function dsGet(L, fx) { return fx ? L.property("ADBE Effect Parade").property(fx.name) : null; }
function dsProp(fx, names, idx) {
    var q, p = null;
    if (!fx) return null;
    for (q = 0; q < names.length; q++) { try { p = fx.property(names[q]); } catch (e) { p = null; } if (p) return p; }
    if (idx) { try { return fx.property(idx); } catch (e2) {} }
    dsLog("prop not found: " + names[0]); return null;
}
function dsSet(fx, names, idx, v) {
    var p = dsProp(fx, names, idx);
    if (p) { try { p.setValue(v); } catch (e) { dsLog("set failed " + names[0] + ": " + String(e.message) + " L" + e.line); } }
    return p;
}
function dsDrop(p, label, fallback) {
    if (!p) return;
    var q, lst = null;
    try { lst = p.propertyParameters; } catch (e) { lst = null; }
    if (lst) { for (q = 0; q < lst.length; q++) { if (String(lst[q]).toLowerCase() === label.toLowerCase()) { p.setValue(q + 1); return; } } }
    try { p.setValue(fallback); } catch (e2) { dsLog("dropdown failed " + label); }
}
function dsEase(p, k, inf) {
    var dims = [1, 2, 3], d, q, a;
    for (d = 0; d < dims.length; d++) {
        a = []; for (q = 0; q < dims[d]; q++) a.push(new KeyframeEase(0, inf));
        try { p.setTemporalEaseAtKey(k, a, a); return; } catch (e) {}
    }
}
function dsKeys(p, times, vals, inf) {
    if (!p) return;
    var q, k;
    for (q = 0; q < times.length; q++) { k = p.addKey(times[q]); p.setValueAtKey(k, vals[q]); dsEase(p, k, inf || 33.333); }
}

// opts: t0, t1 (scan keys span), grid, ballSize, displace [a,b], twist [a,b], keys [[t, displace, twist], ...],
//       pulseF30 (exposure ramp length in frames @30, default 4), pulseStops (1), color [r,g,b] (neon green),
//       glowThr (72.9), glowRad (50 * k), glowInt (1), lensSize (187), lensConv (72), lens (true)
function depthScan(comp, L, opts) {
    opts = opts || {};
    var k = comp.width / 1920;
    var t0 = (opts.t0 !== undefined) ? opts.t0 : L.inPoint;
    var t1 = (opts.t1 !== undefined) ? opts.t1 : L.outPoint;
    var ba = dsFx(L, "CC Ball Action"), ex = dsFx(L, "ADBE Exposure2"), gl = dsFx(L, "ADBE Glo2"),
        tn = dsFx(L, "ADBE Tint"), ln = (opts.lens === false) ? null : dsFx(L, "CC Lens");
    ba = dsGet(L, ba); ex = dsGet(L, ex); gl = dsGet(L, gl); tn = dsGet(L, tn); ln = dsGet(L, ln);
    // CC Ball Action
    dsSet(ba, ["Grid Spacing"], 0, opts.grid || Math.max(2, Math.round(2 * k)));
    dsSet(ba, ["Ball Size"], 0, opts.ballSize || 50);
    var keys = opts.keys;
    if (!keys) {
        var dA = opts.displace || [77, 148], tA = opts.twist || [-12, 3];
        keys = [[t0, dA[0], tA[0]], [t1, dA[1], tA[1]]];
    }
    var pd = dsProp(ba, ["Displace"], 0), pt = dsProp(ba, ["Twist Angle"], 0), q, tt = [], dv = [], tv = [];
    for (q = 0; q < keys.length; q++) { tt.push(keys[q][0]); dv.push(keys[q][1]); tv.push(keys[q][2]); }
    dsKeys(pd, tt, dv); dsKeys(pt, tt, tv);
    // Exposure pulse: 0 -> 1 stop over pulseF30 frames, then loopOut("cycle") repeats it (sawtooth strobe)
    var pe = ex.property(3), pl = (opts.pulseF30 || 4) / 30;
    var k1 = pe.addKey(t0); pe.setValueAtKey(k1, 0);
    var k2 = pe.addKey(t0 + pl); pe.setValueAtKey(k2, (opts.pulseStops !== undefined) ? opts.pulseStops : 1);
    pe.expression = 'loopOut("cycle")';
    // Glow
    dsSet(gl, ["Glow Threshold"], 0, opts.glowThr || 72.9);
    dsSet(gl, ["Glow Radius"], 0, opts.glowRad || 50 * k);
    dsSet(gl, ["Glow Intensity"], 0, opts.glowInt || 1);
    // Tint
    dsSet(tn, ["Map Black To"], 1, [0, 0, 0]);
    dsSet(tn, ["Map White To"], 2, opts.color || [0.33, 1.0, 0.25]);
    dsSet(tn, ["Amount to Tint"], 3, 100);
    // CC Lens (centre = comp centre)
    if (ln) {
        dsSet(ln, ["Center"], 1, [comp.width / 2, comp.height / 2]);
        dsSet(ln, ["Size"], 2, opts.lensSize || 187);
        dsSet(ln, ["Convergence"], 3, (opts.lensConv !== undefined) ? opts.lensConv : 72);
    }
    L.label = DS_LBL_PC;
    return L;
}

// Our addition (not in the tutorial): scan -> live hand-off. scanLayer = depth-scanned precomp above liveLayer.
// Over the last beat the scan "collapses": displace 148 -> 0 and ball size 50 -> 100 (balls merge into the
// image) in 12 f @30 (24 f @60), then a 2 f opacity cut to live on tCut with a 6 f Exposure +1.5 -> 0 flash.
function depthScanReveal(comp, scanLayer, liveLayer, tCut, opts) {
    opts = opts || {};
    var ba = scanLayer.property("ADBE Effect Parade").property("CC Ball Action");
    if (!ba) { dsLog("run depthScan first"); return null; }
    var tA = tCut - 12 / 30;
    var pd = dsProp(ba, ["Displace"], 0), pb = dsProp(ba, ["Ball Size"], 0);
    dsKeys(pd, [tA, tCut], [pd.valueAtTime(tA, false), 0], 80);
    dsKeys(pb, [tA, tCut], [pb.valueAtTime(tA, false), 100], 80);
    var op = scanLayer.property("ADBE Transform Group").property("ADBE Opacity");
    dsKeys(op, [tCut - 2 * comp.frameDuration, tCut], [100, 0], 33.333);
    var fl = comp.layers.addSolid([1, 1, 1], "ADJ_SCAN_FLASH", comp.width, comp.height, 1, 6 / 30);
    fl.adjustmentLayer = true; fl.startTime = tCut; fl.label = DS_LBL_ADJ;
    var e = dsFx(fl, "ADBE Exposure2"); e = dsGet(fl, e);
    dsKeys(e.property(3), [tCut, tCut + 6 / 30], [opts.flashStops || 1.5, 0], 70);
    if (liveLayer) { try { fl.moveBefore(scanLayer); } catch (er) {} }
    return fl;
}
