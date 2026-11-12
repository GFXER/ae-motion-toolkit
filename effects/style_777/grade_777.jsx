// grade_777.jsx - STYLE 777 grade family (needs lib_777.jsx). Frames are comp frames.
// st_777_01 grade cycle, st_777_02 mono stutter, st_777_03 negative toggle, t431 threshold toggle, st_777_06 step fps,
// st_777_08 red pass, st_777_09 phase scrub, t401 grade-cycle wipe, t402 map fade, t408 haze lift, t415 bloom bridge,
// t417 ramp-roll cut, t418 thermal pass-through.

// one ADJ per look; returns {look: layer}
function g777Looks(c, looks, a, b) {
    var out = {};
    for (var i = 0; i < looks.length; i++) {
        var k = looks[i], L;
        if (k == "white") { L = flash7(c, [1, 1, 1], "FX_G_WHITE", a, b); }
        else {
            L = adj7(c, "ADJ_G_" + k.toUpperCase(), a, b);
            if (k == "red") toner7(L, "RED_MONO");
            else if (k == "blue") toner7(L, "BLUE_MONO");
            else if (k == "cyan") toner7(L, "CYAN_DUO");
            else if (k == "cobalt") toner7(L, "COBALT");
            else if (k == "crimson") toner7(L, "CRIMSON");
            else if (k == "blue4048") toner7(L, "BLUE_4048");
            else if (k == "red4048") toner7(L, "RED_4048");
            else if (k == "heat") toner7(L, "HEAT");
            else if (k == "bloom") { toner7(L, "BLOOM_86308"); }
            else if (k == "lav") { fx7(L, "ADBE Pro Levels2", { 7: 120 / 255 }); fx7(L, "ADBE Tint", { 1: hx7("#946F8D"), 2: hx7("#F2EFF6") }); }
            else if (k == "bw") { fx7(L, "ADBE Black&White", {}); toner7(L, "VIOLET"); }
            else if (k == "neg") { fx7(L, "ADBE Black&White", {}); fx7(L, "ADBE Invert", {}); }
            else if (k == "negc") { fx7(L, "ADBE Invert", {}); }
            else if (k == "thr") { fx7(L, "ADBE Threshold2", { 1: 0.5 }); }
            else if (k == "natural") { fx7(L, "ADBE Pro Levels2", { 7: 4 / 255 }); }
        }
        out[k] = L;
    }
    return out;
}
// bake hold-key opacity so exactly one look (or none = "natural"/base) is on per event: list [[frame, look], ...]
function g777Bake(c, layers, list, endF) {
    for (var k in layers) {
        var pr = tr7(layers[k], "o"), pairs = [[0, 0]];
        for (var i = 0; i < list.length; i++) pairs.push([list[i][0], list[i][1] == k ? 100 : 0]);
        if (endF != null) pairs.push([endF, 0]);
        hold7(pr, c, pairs);
    }
}
// st_777_01: grade cycle; list [[f, look]] with looks red|bw|blue|neg|thr|white|natural (natural = all off)
function fx777GradeCycle(c, list, o) {
    o = o || {}; var looks = o.looks || ["red", "bw", "blue", "neg", "thr", "white"];
    var Ls = g777Looks(c, looks, o.a || 0, o.b);
    g777Bake(c, Ls, list, o.endF); return Ls;
}
// helper: build a 74047-style cycle list from a kick grid (white on kicks, other looks on hats, natural runs between bursts)
function fx777CycleList(f0, f1, kickEvery, burstLen, gap) {
    var mix = ["red", "bw", "thr", "blue", "red", "bw", "neg", "red", "blue", "bw"], out = [], f = f0, m = 0, last = "";
    while (f < f1) {
        for (var i = 0; i < burstLen && f < f1; i++, f++) {
            var lk = ((f - f0) % kickEvery == 0) ? "white" : mix[m++ % mix.length];
            if (lk == last) lk = mix[m++ % mix.length]; out.push([f, lk]); last = lk;
        }
        out.push([f, "natural"]); last = "natural"; f += gap;
    }
    return out;
}
// st_777_02: mono-tint stutter on hats: list [[f, look, len]]
function fx777MonoStutter(c, list, o) {
    o = o || {}; var used = {}, looks = [], ev = [];
    for (var i = 0; i < list.length; i++) { if (!used[list[i][1]]) { used[list[i][1]] = 1; looks.push(list[i][1]); } ev.push([list[i][0], list[i][1]]); ev.push([list[i][0] + (list[i][2] || 1), "natural"]); }
    var Ls = g777Looks(c, looks, o.a || 0, o.b); g777Bake(c, Ls, ev); return Ls;
}
// st_777_03 / t431: toggle a look in blocks [[f0, f1], ...]; kind neg|negc|thr|bw
function fx777Toggle(c, kind, blocks, o) {
    o = o || {}; var Ls = g777Looks(c, [kind], o.a || 0, o.b), ev = [];
    for (var i = 0; i < blocks.length; i++) { ev.push([blocks[i][0], kind]); ev.push([blocks[i][1], "natural"]); }
    g777Bake(c, Ls, ev); return Ls[kind];
}
function t777ThresholdToggle(c, blocks, o) { return fx777Toggle(c, "thr", blocks, o); }
// st_777_06: stepped footage (Posterize Time on the footage/precomp layer only)
function fx777Step(L, fps) { return fx7(L, "ADBE Posterize Time", { 1: fps || 12 }); }
// st_777_08: red pass (desaturate all but reds, highs capped ~170, violet shadows)
function fx777RedPass(c, a, b, o) {
    o = o || {}; var J = adj7(c, "ADJ_777_REDPASS", a, b);
    fx7(J, "ADBE Leave Color", { 1: 100, 2: o.col || hx7("#C8202A"), 3: o.tol || 22, 4: 12, 5: 2 });
    fx7(J, "ADBE Pro Levels2", { 7: 4 / 255, 8: 170 / 255, 6: 0.9 });
    fx7(J, "ADBE Tint", { 1: hx7("#0C0610"), 2: [1, 1, 1], 3: 25 });
    grain7(J, 3); return J;
}
// st_777_09: gradient-map phase scrub: palette via CC Toner + Hue/Sat master hue hold-stepped per kick (Colorama Output Cycle is not scriptable)
function fx777PhaseScrub(c, kicks, o) {
    o = o || {}; var J = adj7(c, "ADJ_777_PHASE", o.a || 0, o.b), pal = PAL777[o.pal || "CRIMSON"];
    var e = toner7(J, o.pal || "CRIMSON"), idx = [6, 5, 4, 3, 2], h = 0;
    var pairs = [[], [], [], [], []];
    for (var s = 0; s < 5; s++) pairs[s].push([0, pal[s]]);
    for (var i = 0; i < kicks.length; i++) { h += (o.step || 43); for (s = 0; s < 5; s++) pairs[s].push([kicks[i], hue7(pal[s], h)]); }
    for (s = 0; s < 5; s++) hold7(e.property(idx[s]), c, pairs[s]);
    return J;
}
// rotate an RGB colour's hue by deg (HSL)
function hue7(rgb, deg) {
    var r = rgb[0], g = rgb[1], b = rgb[2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
    if (d > 0) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx == r ? (g - b) / d + (g < b ? 6 : 0) : (mx == g ? (b - r) / d + 2 : (r - g) / d + 4); h /= 6; }
    h = (h + deg / 360) % 1; if (h < 0) h += 1;
    function f(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }
    if (s == 0) return [l, l, l]; var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)];
}
// t402: colour fade into a gradient map (no cut) over n frames
function t777MapFade(c, f, pal, n, o) {
    o = o || {}; var J = adj7(c, "ADJ_777_MAPFADE_" + pal, f, o.b); toner7(J, pal);
    keys7(tr7(J, "o"), c, [[f, 0], [f + (n || 4), 100]]); return J;
}
// t408: haze lift (lavender); f = peak frame; inF frames in (1-2), outF frames out (ease)
function t777HazeLift(c, f, o) {
    o = o || {}; var inF = o.inF || 1, outF = o.outF || 5, J = adj7(c, "ADJ_777_HAZE", f - inF, f + outF + 1);
    fx7(J, "ADBE Pro Levels2", { 7: 120 / 255, 8: 0.95 });
    fx7(J, "ADBE Tint", { 1: hx7(o.deep ? "#4D485E" : "#946F8D"), 2: hx7("#F2EFF6") });
    var op = tr7(J, "o"); op.setValueAtTime(f7(c, f - inF), 0); op.setValueAtTime(f7(c, f), 100); op.setValueAtTime(f7(c, f + outF), 0);
    op.setInterpolationTypeAtKey(1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
    try { op.setTemporalEaseAtKey(2, [new KeyframeEase(0, 10)], [new KeyframeEase(0, 85)]); op.setTemporalEaseAtKey(3, [new KeyframeEase(0, 60)], [new KeyframeEase(0, 10)]); } catch (e) {}
    return J;
}
// t415: B&W > colour bloom bridge; bwAdj = the B&W base ADJ (its out point is set to f); f = bloom frame; drop cut at f+2
function t777BloomBridge(c, f, bwAdj) {
    if (bwAdj) bwAdj.outPoint = f7(c, f);
    var J = adj7(c, "ADJ_777_BLOOM", f, f + 1); toner7(J, "BLOOM_86308");
    var g = safeGlow(J, { thr: 40, rad: 50, inten: 0.8 });
    return J;
}
// t417: ramp-roll cut at frame cut: A map rolls in 2 f before, B map rolls out 4 f after
function t777RampRoll(c, cut, palA, palB) {
    var A = adj7(c, "ADJ_777_ROLL_A_" + palA, cut - 3, cut); toner7(A, palA); keys7(tr7(A, "o"), c, [[cut - 3, 0], [cut - 1, 100]]);
    var B = adj7(c, "ADJ_777_ROLL_B_" + palB, cut, cut + 5); toner7(B, palB); keys7(tr7(B, "o"), c, [[cut, 100], [cut + 4, 0]]);
    return [A, B];
}
// t418: thermal pass-through around a cut
function t777ThermalPass(c, cut, n) {
    n = n || 4; var J = adj7(c, "ADJ_777_THERMAL", cut - n, cut + n + 1); toner7(J, "HEAT");
    keys7(tr7(J, "o"), c, [[cut - n, 0], [cut, 100], [cut + n, 0]]);
    var lv = fx7(J, "ADBE Pro Levels2", {}); keys7(lv.property(6), c, [[cut - 1, 1], [cut, 1.35], [cut + 1, 1]]);
    return J;
}
// t401: grade-cycle wipe: B (layer above A) is revealed by a Linear Wipe over n frames while the cycle runs over both
function t777GradeCycleWipe(c, B, f, n, list) {
    var w = fx7(B, "ADBE Linear Wipe", { 2: 90, 3: 0 }); keys7(w.property(1), c, [[f, 100], [f + n, 0]]);
    return fx777GradeCycle(c, list, {});
}
