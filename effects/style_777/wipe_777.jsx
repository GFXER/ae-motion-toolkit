// wipe_777.jsx - STYLE 777 wipe / layout transitions (needs lib_777.jsx). Frames are comp frames.
// t400 bar wipe, t405 column wipe, t406 half-white, t409 band slice, t411 placeholder slap, t412 staircase letterbox,
// t413 strip conveyor, t419 gradient matte reveal, t421 burst wipe, t422 screen step zoom, t423 squeeze-left,
// t426 concentric staircase, t427 cylinder spin, t428 window stack, st_777_16 letterbox ratio.

// t400: title > pill > bar > line split at frame f (8 f). o.B = next layer (lens blur rack); o.carry = alpha-matte B inside the bar (idea 4)
function t777BarWipe(c, f, o) {
    o = o || {}; var W = c.width, H = c.height, cy = o.y || H / 2, tw = o.tw || W * 0.55;
    var S = shp7(c, "rect", { name: "BAR", w: tw, h: 70 * W / 1080, col: [1, 0, 0], y: cy }); io7(S, c, f, f + 8);
    var g = fx7(S, "ADBE Ramp", { 1: [0, cy], 2: hx7("#C01020"), 3: [W, cy], 4: hx7("#FF2A35") });
    var sz = shpProp7(S, "ADBE Vector Rect Size");
    var k = [[f, [tw, 70 * W / 1080]], [f + 2, [W * 0.35, 70 * W / 1080]], [f + 4, [W * 1.02, H * 0.12]], [f + 6, [W * 1.02, H * 0.015]], [f + 8, [W * 1.02, H * 0.015]]];
    keys7(sz, c, k, [10, 90]);
    // line split: the line opens from the centre (mask subtract grows) f+6..f+8
    var m = rmask7(S, 0, 0, 0, 0, { pts: [[-2, -H], [2, -H], [2, H], [-2, H]], mode: MaskMode.SUBTRACT });
    var mp = m.property("ADBE Mask Shape"); mp.setValueAtTime(f7(c, f + 6), rshape7(-1, -H, 2, 2 * H)); mp.setValueAtTime(f7(c, f + 8), rshape7(-W * 0.55, -H, W * 1.1, 2 * H));
    if (o.B) {
        var e = fx7(o.B, "ADBE Camera Lens Blur", {}); keys7(e.property(1), c, [[f + 2, 30 * W / 1080], [f + 7, 0]], [30, 80]);
        if (o.carry) { // idea 4: B rides inside the bar, then opens full frame when the line splits
            var Bf = o.B.duplicate(); Bf.name = o.B.name + "_FULL"; io7(Bf, c, f + 8, null);
            var M = S.duplicate(); M.name = "MATTE_BAR"; io7(o.B, c, f + 2, f + 8); M.moveBefore(o.B); matte7(o.B, M, TrackMatteType.ALPHA); S.enabled = false;
            var e2 = fx7(Bf, "ADBE Camera Lens Blur", {}); }
    }
    return S;
}
// t405: column wipe; Bs = 3 layers (already placed, above A), step frames between columns, n frames per column wipe
function t777ColumnWipe(c, f, Bs, step, n) {
    var W = c.width, cw = W / Bs.length;
    for (var i = 0; i < Bs.length; i++) {
        var B = Bs[i]; lmask7(B, c, i * cw, 0, cw, c.height);
        io7(B, c, f + i * step, null);
        var w = fx7(B, "ADBE Linear Wipe", { 2: 180, 3: 0 }); keys7(w.property(1), c, [[f + i * step, 100], [f + i * step + n, 0]]);
    }
}
// t406: half-white block wipe f..f+3 (bottom half 2 f, top half 1 f, then off over B)
function t777HalfWhite(c, f) {
    var W = c.width, H = c.height, S = flash7(c, [1, 1, 1], "FX_HALFWHITE_f" + f, f, f + 3);
    var m = rmask7(S, 0, H / 2, W, H / 2), mp = m.property("ADBE Mask Shape");
    hold7(mp, c, [[f, rshape7(0, H / 2, W, H / 2)], [f + 2, rshape7(0, 0, W, H / 2)]]);
    return S;
}
// t409: band slice: duplicate L with a time offset, a band mask (10 % H at y), pushed y+6 for n frames
function t777BandSlice(c, L, f, o) {
    o = o || {}; var n = o.n || 4, out = [], bands = o.bands || [[o.y || c.height * 0.45, o.h || c.height * 0.1, o.off || -8]];
    for (var i = 0; i < bands.length; i++) {
        var D = L.duplicate(); D.name = "VID_SLICE_f" + f + "_" + i; D.startTime = D.startTime + f7(c, bands[i][2]); io7(D, c, f, f + n); D.moveToBeginning();
        lmask7(D, c, -c.width, bands[i][0], 3 * c.width, bands[i][1]); var p = tr7(D, "p").value; tr7(D, "p").setValue([p[0], p[1] + 6 * c.width / 1080]); out.push(D);
    }
    return out;
}
// t411: placeholder slap at f: blank card 1 f (+1 f crimson if o.grad layer given), then photo layer fills the same rotated rect
function t777PlaceholderSlap(c, f, photo, o) {
    o = o || {}; var w = o.w || c.width * 0.62, h = o.h || c.width * 0.8, x = o.x || c.width / 2, y = o.y || c.height / 2, r = o.rot || -6, nb = o.blank || 1;
    var card = shp7(c, "rect", { name: "PLACEHOLDER", w: w, h: h, col: hx7("#EDEBE6"), x: x, y: y }); tr7(card, "r").setValue(r); io7(card, c, f, f + nb);
    fx7(card, "ADBE Drop Shadow", { 2: 120, 4: 10 * c.width / 1080, 5: 18 * c.width / 1080 });
    var g0 = f + nb;
    if (o.grad) { var G = o.grad; G.moveToBeginning(); io7(G, c, g0, g0 + 1); var gm = card.duplicate(); gm.name = "MATTE_SLAP_G"; io7(gm, c, g0, g0 + 1); gm.moveBefore(G); matte7(G, gm, TrackMatteType.ALPHA); g0 += 1; }
    var pm = card.duplicate(); pm.name = "MATTE_SLAP"; io7(pm, c, g0, o.end || Math.round(c.duration / c.frameDuration));
    fx7(pm, "ADBE Roughen Edges", { 1: 1, 3: 6 * c.width / 1080, 6: 40 });
    photo.moveToBeginning(); io7(photo, c, g0, o.end || null); pm.moveBefore(photo); matte7(photo, pm, TrackMatteType.ALPHA);
    var sh = card.duplicate(); sh.name = "SHP_SLAP_SHADOW"; io7(sh, c, g0, o.end || Math.round(c.duration / c.frameDuration)); sh.moveAfter(photo);
    return [card, photo];
}
// t412: staircase letterbox collapse from f0 (3 steps: 6 f move eased / 6 f hold) to a line, then black. o.reopen = [frame, layer] band reopen
function t777StairLetterbox(c, f0, o) {
    o = o || {}; var W = c.width, H = c.height, win = o.win || H, steps = o.steps || [0.62, 0.3, 0.012], end = o.end || (f0 + 36 + 6);
    var T = sol7(c, [0, 0, 0], "FX_LB_TOP", f0, end, W, H), B = sol7(c, [0, 0, 0], "FX_LB_BOT", f0, end, W, H);
    var cy = o.cy || H / 2, pairsT = [[f0, [W / 2, cy - win / 2 - H / 2]]], pairsB = [[f0, [W / 2, cy + win / 2 + H / 2]]], f = f0;
    for (var i = 0; i < steps.length; i++) { var h = win * steps[i]; pairsT.push([f + 6, [W / 2, cy - h / 2 - H / 2]]); pairsB.push([f + 6, [W / 2, cy + h / 2 + H / 2]]); if (i < steps.length - 1) { pairsT.push([f + 12, pairsT[pairsT.length - 1][1]]); pairsB.push([f + 12, pairsB[pairsB.length - 1][1]]); } f += 12; }
    pairsT.push([f - 6 + 2, [W / 2, cy - H / 2]]); pairsB.push([f - 6 + 2, [W / 2, cy + H / 2]]);
    keys7(tr7(T, "p"), c, pairsT, [85, 85]); keys7(tr7(B, "p"), c, pairsB, [85, 85]);
    return { top: T, bot: B, clicks: [f0, f0 + 12, f0 + 24], black: f - 4 };
}
// band reopen (idea 17 / 42366 band reveal): mask on layer L grows from a line at y to full band over n frames, stepped 2 f
function t777BandReveal(c, L, f, n, o) {
    o = o || {}; var W = c.width, y = o.y || c.height / 2, full = o.full || c.height;
    var M = shp7(c, "rect", { name: "BANDMATTE", w: W * 1.2, h: 4, col: [1, 1, 1], y: y }); io7(M, c, f, Math.round(c.duration / c.frameDuration));
    var pairs = []; for (var k = 0; k <= n; k += 2) pairs.push([f + k, [W * 1.2, 4 + (full - 4) * Math.pow(k / n, 1.7)]]);
    hold7(shpProp7(M, "ADBE Vector Rect Size"), c, pairs); io7(L, c, f, null); M.moveBefore(L); matte7(L, M, TrackMatteType.ALPHA);
    return M;
}
// t413 strip conveyor, t419 gradient matte reveal, t421 burst wipe, t422 screen step zoom, t423 squeeze-left,
// t426 concentric staircase, t427 cylinder spin, t428 window stack, st_777_16 letterbox ratio.

// t400: title > pill > bar > line split at frame f (8 f). o.B = next layer (lens blur rack); o.carry = alpha-matte B inside the bar (idea 4)
function t777BarWipe(c, f, o) {
    o = o || {}; var W = c.width, H = c.height, cy = o.y || H / 2, tw = o.tw || W * 0.55;
    var S = shp7(c, "rect", { name: "BAR", w: tw, h: 70 * W / 1080, col: [1, 0, 0], y: cy }); io7(S, c, f, f + 8);
    var g = fx7(S, "ADBE Ramp", { 1: [0, cy], 2: hx7("#C01020"), 3: [W, cy], 4: hx7("#FF2A35") });
    var sz = shpProp7(S, "ADBE Vector Rect Size");
    var k = [[f, [tw, 70 * W / 1080]], [f + 2, [W * 0.35, 70 * W / 1080]], [f + 4, [W * 1.02, H * 0.12]], [f + 6, [W * 1.02, H * 0.015]], [f + 8, [W * 1.02, H * 0.015]]];
    keys7(sz, c, k, [10, 90]);
    // line split: the line opens from the centre (mask subtract grows) f+6..f+8
    var m = rmask7(S, 0, 0, 0, 0, { pts: [[-2, -H], [2, -H], [2, H], [-2, H]], mode: MaskMode.SUBTRACT });
    var mp = m.property("ADBE Mask Shape"); mp.setValueAtTime(f7(c, f + 6), rshape7(-1, -H, 2, 2 * H)); mp.setValueAtTime(f7(c, f + 8), rshape7(-W * 0.55, -H, W * 1.1, 2 * H));
    if (o.B) {
        var e = fx7(o.B, "ADBE Camera Lens Blur", {}); keys7(e.property(1), c, [[f + 2, 30 * W / 1080], [f + 7, 0]], [30, 80]);
        if (o.carry) { // idea 4: B rides inside the bar, then opens full frame when the line splits
            var Bf = o.B.duplicate(); Bf.name = o.B.name + "_FULL"; io7(Bf, c, f + 8, null);
            var M = S.duplicate(); M.name = "MATTE_BAR"; io7(o.B, c, f + 2, f + 8); M.moveBefore(o.B); matte7(o.B, M, TrackMatteType.ALPHA); S.enabled = false;
            var e2 = fx7(Bf, "ADBE Camera Lens Blur", {}); }
    }
    return S;
}
// t405: column wipe; Bs = 3 layers (already placed, above A), step frames between columns, n frames per column wipe
function t777ColumnWipe(c, f, Bs, step, n) {
    var W = c.width, cw = W / Bs.length;
    for (var i = 0; i < Bs.length; i++) {
        var B = Bs[i]; lmask7(B, c, i * cw, 0, cw, c.height);
        io7(B, c, f + i * step, null);
        var w = fx7(B, "ADBE Linear Wipe", { 2: 180, 3: 0 }); keys7(w.property(1), c, [[f + i * step, 100], [f + i * step + n, 0]]);
    }
}
// t406: half-white block wipe f..f+3 (bottom half 2 f, top half 1 f, then off over B)
function t777HalfWhite(c, f) {
    var W = c.width, H = c.height, S = flash7(c, [1, 1, 1], "FX_HALFWHITE_f" + f, f, f + 3);
    var m = rmask7(S, 0, H / 2, W, H / 2), mp = m.property("ADBE Mask Shape");
    hold7(mp, c, [[f, rshape7(0, H / 2, W, H / 2)], [f + 2, rshape7(0, 0, W, H / 2)]]);
    return S;
}
// t409: band slice: duplicate L with a time offset, a band mask (10 % H at y), pushed y+6 for n frames
function t777BandSlice(c, L, f, o) {
    o = o || {}; var n = o.n || 4, out = [], bands = o.bands || [[o.y || c.height * 0.45, o.h || c.height * 0.1, o.off || -8]];
    for (var i = 0; i < bands.length; i++) {
        var D = L.duplicate(); D.name = "VID_SLICE_f" + f + "_" + i; D.startTime = D.startTime + f7(c, bands[i][2]); io7(D, c, f, f + n); D.moveToBeginning();
        lmask7(D, c, -c.width, bands[i][0], 3 * c.width, bands[i][1]); var p = tr7(D, "p").value; tr7(D, "p").setValue([p[0], p[1] + 6 * c.width / 1080]); out.push(D);
    }
    return out;
}
// t411: placeholder slap at f: blank card 1 f (+1 f crimson if o.grad layer given), then photo layer fills the same rotated rect
function t777PlaceholderSlap(c, f, photo, o) {
    o = o || {}; var w = o.w || c.width * 0.62, h = o.h || c.width * 0.8, x = o.x || c.width / 2, y = o.y || c.height / 2, r = o.rot || -6, nb = o.blank || 1;
    var card = shp7(c, "rect", { name: "PLACEHOLDER", w: w, h: h, col: hx7("#EDEBE6"), x: x, y: y }); tr7(card, "r").setValue(r); io7(card, c, f, f + nb);
    fx7(card, "ADBE Drop Shadow", { 2: 120, 4: 10 * c.width / 1080, 5: 18 * c.width / 1080 });
    var g0 = f + nb;
    if (o.grad) { var G = o.grad; G.moveToBeginning(); io7(G, c, g0, g0 + 1); var gm = card.duplicate(); gm.name = "MATTE_SLAP_G"; io7(gm, c, g0, g0 + 1); gm.moveBefore(G); matte7(G, gm, TrackMatteType.ALPHA); g0 += 1; }
    var pm = card.duplicate(); pm.name = "MATTE_SLAP"; io7(pm, c, g0, o.end || Math.round(c.duration / c.frameDuration));
    fx7(pm, "ADBE Roughen Edges", { 1: 1, 3: 6 * c.width / 1080, 6: 40 });
    photo.moveToBeginning(); io7(photo, c, g0, o.end || null); pm.moveBefore(photo); matte7(photo, pm, TrackMatteType.ALPHA);
    var sh = card.duplicate(); sh.name = "SHP_SLAP_SHADOW"; io7(sh, c, g0, o.end || Math.round(c.duration / c.frameDuration)); sh.moveAfter(photo);
    return [card, photo];
}
// t412: staircase letterbox collapse from f0 (3 steps: 6 f move eased / 6 f hold) to a line, then black. o.reopen = [frame, layer] band reopen
function t777StairLetterbox(c, f0, o) {
    o = o || {}; var W = c.width, H = c.height, win = o.win || H, steps = o.steps || [0.62, 0.3, 0.012], end = o.end || (f0 + 36 + 6);
    var T = sol7(c, [0, 0, 0], "FX_LB_TOP", f0, end, W, H), B = sol7(c, [0, 0, 0], "FX_LB_BOT", f0, end, W, H);
    var cy = o.cy || H / 2, pairsT = [[f0, [W / 2, cy - win / 2 - H / 2]]], pairsB = [[f0, [W / 2, cy + win / 2 + H / 2]]], f = f0;
    for (var i = 0; i < steps.length; i++) { var h = win * steps[i]; pairsT.push([f + 6, [W / 2, cy - h / 2 - H / 2]]); pairsB.push([f + 6, [W / 2, cy + h / 2 + H / 2]]); if (i < steps.length - 1) { pairsT.push([f + 12, pairsT[pairsT.length - 1][1]]); pairsB.push([f + 12, pairsB[pairsB.length - 1][1]]); } f += 12; }
    pairsT.push([f - 6 + 2, [W / 2, cy - H / 2]]); pairsB.push([f - 6 + 2, [W / 2, cy + H / 2]]);
    keys7(tr7(T, "p"), c, pairsT, [85, 85]); keys7(tr7(B, "p"), c, pairsB, [85, 85]);
    return { top: T, bot: B, clicks: [f0, f0 + 12, f0 + 24], black: f - 4 };
}
// band reopen (idea 17 / 42366 band reveal): mask on layer L grows from a line at y to full band over n frames, stepped 2 f
function t777BandReveal(c, L, f, n, o) {
    o = o || {}; var W = c.width, y = o.y || c.height / 2, full = o.full || c.height, m = lmask7(L, c, -W, y - 1, 3 * W, 2), mp = m.property("ADBE Mask Shape"), pairs = [];
    var sc = tr7(L, "s").value, p = tr7(L, "p").value, a = tr7(L, "a").value;
    for (var k = 0; k <= n; k += 2) { var h = 4 + (full - 4) * Math.pow(k / n, 1.7); var ly = (y - h / 2 - p[1]) / (sc[1] / 100) + a[1], lx = (-W - p[0]) / (sc[0] / 100) + a[0]; pairs.push([f + k, rshape7(lx, ly, 3 * W / (sc[0] / 100), h / (sc[1] / 100))]); }
    hold7(mp, c, pairs); return m;
}
// t413: strip conveyor: layers enter from the left one per `step` frames (n-frame ease-out slide), pushing earlier strips right
function t777StripConveyor(c, f0, Ls, step, n) {
    var W = c.width, sw = W / Ls.length; step = step || 6; n = n || 5;
    for (var i = 0; i < Ls.length; i++) {
        var L = Ls[i]; io7(L, c, f0 + i * step, null);
        var a = tr7(L, "a").value, s = tr7(L, "s").value[0] / 100, y = tr7(L, "p").value[1];
        rmask7(L, a[0] - sw / 2 / s, -10000, sw / s, 30000);
        var pairs = [[f0 + i * step, [-sw / 2, y]], [f0 + i * step + n, [sw / 2, y]]];
        for (var j = i + 1; j < Ls.length; j++) { var t = f0 + j * step; pairs.push([t, [sw / 2 + (j - 1 - i) * sw, y]], [t + n, [sw / 2 + (j - i) * sw, y]]); }
        keys7(tr7(L, "p"), c, pairs, [10, 90]);
    }
}
// t419: gradient matte reveal: B with a luma matte = matteL (a star gradient precomp); Levels input black 255 > 0 over n f
function t777GradMatteReveal(c, B, matteL, f, n) {
    matteL.moveBefore(B); io7(matteL, c, f, null); io7(B, c, f, null); matte7(B, matteL, TrackMatteType.LUMA);
    var lv = fx7(matteL, "ADBE Pro Levels2", {}); keys7(lv.property(4), c, [[f, 0.9], [f + n, 0]], [10, 85]); keys7(lv.property(5), c, [[f, 1], [f + n, 0.05]], [10, 85]);
    return lv;
}
// t421: jagged comic-burst white wipe (n f) at f
function t777BurstWipe(c, f, n) {
    n = n || 5; var S = shp7(c, "star", { name: "BURST", pts: 16, or: c.height * 0.75, ir: c.height * 0.46, col: [1, 1, 1] }); io7(S, c, f, f + n);
    keys7(tr7(S, "s"), c, [[f, [0, 0]], [f + n - 1, [170, 170]]], [80, 10]); keys7(tr7(S, "r"), c, [[f, 0], [f + n, 8]]);
    return S;
}
// t422: screen step zoom: A shrinks into an OS window in hold steps, B appears inside a screen rect and grows back in hold steps
function t777ScreenStepZoom(c, A, B, f0, o) {
    o = o || {}; var W = c.width, H = c.height, ws = [100, 72, 52, 36, 36], out = [];
    var N = c.layers.addNull(); N.name = "CTRL_WIN"; try { N.label = 1; } catch (e) {} tr7(N, "a").setValue([0, 0]); tr7(N, "p").setValue([W / 2, H / 2]);
    var bw = W * 0.92, bh = bw * 9 / 16;
    var bar = shp7(c, "rect", { name: "WIN_BAR", w: bw, h: 26 * W / 1080, col: hx7("#1A2CC0"), x: W / 2, y: H / 2 - bh / 2 - 13 * W / 1080 });
    var box = shp7(c, "rect", { name: "WIN_CLOSE", w: 20 * W / 1080, h: 18 * W / 1080, col: hx7("#D0D0D0"), x: W / 2 + bw / 2 - 16 * W / 1080, y: H / 2 - bh / 2 - 13 * W / 1080 });
    var fr = shp7(c, "rect", { name: "WIN_FRAME", w: bw + 4, h: bh + 4, stroke: 3 * W / 1080, scol: hx7("#C0C0C0"), x: W / 2, y: H / 2 });
    var parts = [A, bar, box, fr]; for (var i = 0; i < parts.length; i++) { parts[i].parent = N; }
    io7(bar, c, f0, f0 + 6); io7(box, c, f0, f0 + 6); io7(fr, c, f0, f0 + 6);
    var sp = []; for (i = 0; i < ws.length; i++) sp.push([f0 + i, [ws[i], ws[i]]]); hold7(tr7(N, "s"), c, sp);
    hold7(tr7(N, "p"), c, [[f0, [W / 2, H / 2]], [f0 + 3, [W * 0.42, H * 0.47]], [f0 + 4, [W * 0.36, H * 0.44]], [f0 + 5, [W * 0.30, H * 0.42]]]);
    // echo trail: 3 ghost copies of the window frame at older positions (drag echo)
    for (i = 1; i <= 3; i++) { var gh = fr.duplicate(); gh.name = "WIN_ECHO" + i; gh.parent = null; io7(gh, c, f0 + 3 + i - 1, f0 + 6); tr7(gh, "o").setValue(70 - i * 18); }
    // B inside the screen, hold-step zoom back in
    io7(B, c, f0 + 6, null); var bs = tr7(B, "s").value[0], zs = [0.3, 0.45, 0.65, 0.85, 1.0], zp = [];
    for (i = 0; i < zs.length; i++) zp.push([f0 + 6 + i, [bs * zs[i], bs * zs[i]]]); hold7(tr7(B, "s"), c, zp);
    return N;
}
// t423: squeeze-left reframe at f (1 f, hold): layer L to 70 % width, anchored left
function t777SqueezeLeft(c, L, f, o) { // the whole picture is squeezed into the left k of the frame (anamorphic), 1 f hold
    o = o || {}; var s = tr7(L, "s").value, p = tr7(L, "p").value, a = tr7(L, "a").value, k = o.k || 0.7;
    var nsx = 100 * k * c.width / L.source.width;
    hold7(tr7(L, "s"), c, [[f - 1, [s[0], s[1]]], [f, [nsx, s[1]]]]);
    hold7(tr7(L, "p"), c, [[f - 1, p], [f, [a[0] * nsx / 100, p[1]]]]);
}
// t426 concentric staircase, t427 cylinder spin, t428 window stack, st_777_16 letterbox ratio.

// t400: title > pill > bar > line split at frame f (8 f). o.B = next layer (lens blur rack); o.carry = alpha-matte B inside the bar (idea 4)
function t777BarWipe(c, f, o) {
    o = o || {}; var W = c.width, H = c.height, cy = o.y || H / 2, tw = o.tw || W * 0.55;
    var S = shp7(c, "rect", { name: "BAR", w: tw, h: 70 * W / 1080, col: [1, 0, 0], y: cy }); io7(S, c, f, f + 8);
    var g = fx7(S, "ADBE Ramp", { 1: [0, cy], 2: hx7("#C01020"), 3: [W, cy], 4: hx7("#FF2A35") });
    var sz = shpProp7(S, "ADBE Vector Rect Size");
    var k = [[f, [tw, 70 * W / 1080]], [f + 2, [W * 0.35, 70 * W / 1080]], [f + 4, [W * 1.02, H * 0.12]], [f + 6, [W * 1.02, H * 0.015]], [f + 8, [W * 1.02, H * 0.015]]];
    keys7(sz, c, k, [10, 90]);
    // line split: the line opens from the centre (mask subtract grows) f+6..f+8
    var m = rmask7(S, 0, 0, 0, 0, { pts: [[-2, -H], [2, -H], [2, H], [-2, H]], mode: MaskMode.SUBTRACT });
    var mp = m.property("ADBE Mask Shape"); mp.setValueAtTime(f7(c, f + 6), rshape7(-1, -H, 2, 2 * H)); mp.setValueAtTime(f7(c, f + 8), rshape7(-W * 0.55, -H, W * 1.1, 2 * H));
    if (o.B) {
        var e = fx7(o.B, "ADBE Camera Lens Blur", {}); keys7(e.property(1), c, [[f + 2, 30 * W / 1080], [f + 7, 0]], [30, 80]);
        if (o.carry) { // idea 4: B rides inside the bar, then opens full frame when the line splits
            var Bf = o.B.duplicate(); Bf.name = o.B.name + "_FULL"; io7(Bf, c, f + 8, null);
            var M = S.duplicate(); M.name = "MATTE_BAR"; io7(o.B, c, f + 2, f + 8); M.moveBefore(o.B); matte7(o.B, M, TrackMatteType.ALPHA); S.enabled = false;
            var e2 = fx7(Bf, "ADBE Camera Lens Blur", {}); }
    }
    return S;
}
// t405: column wipe; Bs = 3 layers (already placed, above A), step frames between columns, n frames per column wipe
function t777ColumnWipe(c, f, Bs, step, n) {
    var W = c.width, cw = W / Bs.length;
    for (var i = 0; i < Bs.length; i++) {
        var B = Bs[i]; lmask7(B, c, i * cw, 0, cw, c.height);
        io7(B, c, f + i * step, null);
        var w = fx7(B, "ADBE Linear Wipe", { 2: 180, 3: 0 }); keys7(w.property(1), c, [[f + i * step, 100], [f + i * step + n, 0]]);
    }
}
// t406: half-white block wipe f..f+3 (bottom half 2 f, top half 1 f, then off over B)
function t777HalfWhite(c, f) {
    var W = c.width, H = c.height, S = flash7(c, [1, 1, 1], "FX_HALFWHITE_f" + f, f, f + 3);
    var m = rmask7(S, 0, H / 2, W, H / 2), mp = m.property("ADBE Mask Shape");
    hold7(mp, c, [[f, rshape7(0, H / 2, W, H / 2)], [f + 2, rshape7(0, 0, W, H / 2)]]);
    return S;
}
// t409: band slice: duplicate L with a time offset, a band mask (10 % H at y), pushed y+6 for n frames
function t777BandSlice(c, L, f, o) {
    o = o || {}; var n = o.n || 4, out = [], bands = o.bands || [[o.y || c.height * 0.45, o.h || c.height * 0.1, o.off || -8]];
    for (var i = 0; i < bands.length; i++) {
        var D = L.duplicate(); D.name = "VID_SLICE_f" + f + "_" + i; D.startTime = D.startTime + f7(c, bands[i][2]); io7(D, c, f, f + n); D.moveToBeginning();
        lmask7(D, c, -c.width, bands[i][0], 3 * c.width, bands[i][1]); var p = tr7(D, "p").value; tr7(D, "p").setValue([p[0], p[1] + 6 * c.width / 1080]); out.push(D);
    }
    return out;
}
// t411: placeholder slap at f: blank card 1 f (+1 f crimson if o.grad layer given), then photo layer fills the same rotated rect
function t777PlaceholderSlap(c, f, photo, o) {
    o = o || {}; var w = o.w || c.width * 0.62, h = o.h || c.width * 0.8, x = o.x || c.width / 2, y = o.y || c.height / 2, r = o.rot || -6, nb = o.blank || 1;
    var card = shp7(c, "rect", { name: "PLACEHOLDER", w: w, h: h, col: hx7("#EDEBE6"), x: x, y: y }); tr7(card, "r").setValue(r); io7(card, c, f, f + nb);
    fx7(card, "ADBE Drop Shadow", { 2: 120, 4: 10 * c.width / 1080, 5: 18 * c.width / 1080 });
    var g0 = f + nb;
    if (o.grad) { var G = o.grad; G.moveToBeginning(); io7(G, c, g0, g0 + 1); var gm = card.duplicate(); gm.name = "MATTE_SLAP_G"; io7(gm, c, g0, g0 + 1); gm.moveBefore(G); matte7(G, gm, TrackMatteType.ALPHA); g0 += 1; }
    var pm = card.duplicate(); pm.name = "MATTE_SLAP"; io7(pm, c, g0, o.end || Math.round(c.duration / c.frameDuration));
    fx7(pm, "ADBE Roughen Edges", { 1: 1, 3: 6 * c.width / 1080, 6: 40 });
    photo.moveToBeginning(); io7(photo, c, g0, o.end || null); pm.moveBefore(photo); matte7(photo, pm, TrackMatteType.ALPHA);
    var sh = card.duplicate(); sh.name = "SHP_SLAP_SHADOW"; io7(sh, c, g0, o.end || Math.round(c.duration / c.frameDuration)); sh.moveAfter(photo);
    return [card, photo];
}
// t412: staircase letterbox collapse from f0 (3 steps: 6 f move eased / 6 f hold) to a line, then black. o.reopen = [frame, layer] band reopen
function t777StairLetterbox(c, f0, o) {
    o = o || {}; var W = c.width, H = c.height, win = o.win || H, steps = o.steps || [0.62, 0.3, 0.012], end = o.end || (f0 + 36 + 6);
    var T = sol7(c, [0, 0, 0], "FX_LB_TOP", f0, end, W, H), B = sol7(c, [0, 0, 0], "FX_LB_BOT", f0, end, W, H);
    var cy = o.cy || H / 2, pairsT = [[f0, [W / 2, cy - win / 2 - H / 2]]], pairsB = [[f0, [W / 2, cy + win / 2 + H / 2]]], f = f0;
    for (var i = 0; i < steps.length; i++) { var h = win * steps[i]; pairsT.push([f + 6, [W / 2, cy - h / 2 - H / 2]]); pairsB.push([f + 6, [W / 2, cy + h / 2 + H / 2]]); if (i < steps.length - 1) { pairsT.push([f + 12, pairsT[pairsT.length - 1][1]]); pairsB.push([f + 12, pairsB[pairsB.length - 1][1]]); } f += 12; }
    pairsT.push([f - 6 + 2, [W / 2, cy - H / 2]]); pairsB.push([f - 6 + 2, [W / 2, cy + H / 2]]);
    keys7(tr7(T, "p"), c, pairsT, [85, 85]); keys7(tr7(B, "p"), c, pairsB, [85, 85]);
    return { top: T, bot: B, clicks: [f0, f0 + 12, f0 + 24], black: f - 4 };
}
// band reopen (idea 17 / 42366 band reveal): mask on layer L grows from a line at y to full band over n frames, stepped 2 f
function t777BandReveal(c, L, f, n, o) {
    o = o || {}; var W = c.width, y = o.y || c.height / 2, full = o.full || c.height;
    var M = shp7(c, "rect", { name: "BANDMATTE", w: W * 1.2, h: 4, col: [1, 1, 1], y: y }); io7(M, c, f, Math.round(c.duration / c.frameDuration));
    var pairs = []; for (var k = 0; k <= n; k += 2) pairs.push([f + k, [W * 1.2, 4 + (full - 4) * Math.pow(k / n, 1.7)]]);
    hold7(shpProp7(M, "ADBE Vector Rect Size"), c, pairs); io7(L, c, f, null); M.moveBefore(L); matte7(L, M, TrackMatteType.ALPHA);
    return M;
}
// t413 strip conveyor, t419 gradient matte reveal, t421 burst wipe, t422 screen step zoom, t423 squeeze-left,
// t426 concentric staircase, t427 cylinder spin, t428 window stack, st_777_16 letterbox ratio.

// t400: title > pill > bar > line split at frame f (8 f). o.B = next layer (lens blur rack); o.carry = alpha-matte B inside the bar (idea 4)
function t777BarWipe(c, f, o) {
    o = o || {}; var W = c.width, H = c.height, cy = o.y || H / 2, tw = o.tw || W * 0.55;
    var S = shp7(c, "rect", { name: "BAR", w: tw, h: 70 * W / 1080, col: [1, 0, 0], y: cy }); io7(S, c, f, f + 8);
    var g = fx7(S, "ADBE Ramp", { 1: [0, cy], 2: hx7("#C01020"), 3: [W, cy], 4: hx7("#FF2A35") });
    var sz = shpProp7(S, "ADBE Vector Rect Size");
    var k = [[f, [tw, 70 * W / 1080]], [f + 2, [W * 0.35, 70 * W / 1080]], [f + 4, [W * 1.02, H * 0.12]], [f + 6, [W * 1.02, H * 0.015]], [f + 8, [W * 1.02, H * 0.015]]];
    keys7(sz, c, k, [10, 90]);
    // line split: the line opens from the centre (mask subtract grows) f+6..f+8
    var m = rmask7(S, 0, 0, 0, 0, { pts: [[-2, -H], [2, -H], [2, H], [-2, H]], mode: MaskMode.SUBTRACT });
    var mp = m.property("ADBE Mask Shape"); mp.setValueAtTime(f7(c, f + 6), rshape7(-1, -H, 2, 2 * H)); mp.setValueAtTime(f7(c, f + 8), rshape7(-W * 0.55, -H, W * 1.1, 2 * H));
    if (o.B) {
        var e = fx7(o.B, "ADBE Camera Lens Blur", {}); keys7(e.property(1), c, [[f + 2, 30 * W / 1080], [f + 7, 0]], [30, 80]);
        if (o.carry) { // idea 4: B rides inside the bar, then opens full frame when the line splits
            var Bf = o.B.duplicate(); Bf.name = o.B.name + "_FULL"; io7(Bf, c, f + 8, null);
            var M = S.duplicate(); M.name = "MATTE_BAR"; io7(o.B, c, f + 2, f + 8); M.moveBefore(o.B); matte7(o.B, M, TrackMatteType.ALPHA); S.enabled = false;
            var e2 = fx7(Bf, "ADBE Camera Lens Blur", {}); }
    }
    return S;
}
// t405: column wipe; Bs = 3 layers (already placed, above A), step frames between columns, n frames per column wipe
function t777ColumnWipe(c, f, Bs, step, n) {
    var W = c.width, cw = W / Bs.length;
    for (var i = 0; i < Bs.length; i++) {
        var B = Bs[i]; lmask7(B, c, i * cw, 0, cw, c.height);
        io7(B, c, f + i * step, null);
        var w = fx7(B, "ADBE Linear Wipe", { 2: 180, 3: 0 }); keys7(w.property(1), c, [[f + i * step, 100], [f + i * step + n, 0]]);
    }
}
// t406: half-white block wipe f..f+3 (bottom half 2 f, top half 1 f, then off over B)
function t777HalfWhite(c, f) {
    var W = c.width, H = c.height, S = flash7(c, [1, 1, 1], "FX_HALFWHITE_f" + f, f, f + 3);
    var m = rmask7(S, 0, H / 2, W, H / 2), mp = m.property("ADBE Mask Shape");
    hold7(mp, c, [[f, rshape7(0, H / 2, W, H / 2)], [f + 2, rshape7(0, 0, W, H / 2)]]);
    return S;
}
// t409: band slice: duplicate L with a time offset, a band mask (10 % H at y), pushed y+6 for n frames
function t777BandSlice(c, L, f, o) {
    o = o || {}; var n = o.n || 4, out = [], bands = o.bands || [[o.y || c.height * 0.45, o.h || c.height * 0.1, o.off || -8]];
    for (var i = 0; i < bands.length; i++) {
        var D = L.duplicate(); D.name = "VID_SLICE_f" + f + "_" + i; D.startTime = D.startTime + f7(c, bands[i][2]); io7(D, c, f, f + n); D.moveToBeginning();
        lmask7(D, c, -c.width, bands[i][0], 3 * c.width, bands[i][1]); var p = tr7(D, "p").value; tr7(D, "p").setValue([p[0], p[1] + 6 * c.width / 1080]); out.push(D);
    }
    return out;
}
// t411: placeholder slap at f: blank card 1 f (+1 f crimson if o.grad layer given), then photo layer fills the same rotated rect
function t777PlaceholderSlap(c, f, photo, o) {
    o = o || {}; var w = o.w || c.width * 0.62, h = o.h || c.width * 0.8, x = o.x || c.width / 2, y = o.y || c.height / 2, r = o.rot || -6, nb = o.blank || 1;
    var card = shp7(c, "rect", { name: "PLACEHOLDER", w: w, h: h, col: hx7("#EDEBE6"), x: x, y: y }); tr7(card, "r").setValue(r); io7(card, c, f, f + nb);
    fx7(card, "ADBE Drop Shadow", { 2: 120, 4: 10 * c.width / 1080, 5: 18 * c.width / 1080 });
    var g0 = f + nb;
    if (o.grad) { var G = o.grad; G.moveToBeginning(); io7(G, c, g0, g0 + 1); var gm = card.duplicate(); gm.name = "MATTE_SLAP_G"; io7(gm, c, g0, g0 + 1); gm.moveBefore(G); matte7(G, gm, TrackMatteType.ALPHA); g0 += 1; }
    var pm = card.duplicate(); pm.name = "MATTE_SLAP"; io7(pm, c, g0, o.end || Math.round(c.duration / c.frameDuration));
    fx7(pm, "ADBE Roughen Edges", { 1: 1, 3: 6 * c.width / 1080, 6: 40 });
    photo.moveToBeginning(); io7(photo, c, g0, o.end || null); pm.moveBefore(photo); matte7(photo, pm, TrackMatteType.ALPHA);
    var sh = card.duplicate(); sh.name = "SHP_SLAP_SHADOW"; io7(sh, c, g0, o.end || Math.round(c.duration / c.frameDuration)); sh.moveAfter(photo);
    return [card, photo];
}
// t412: staircase letterbox collapse from f0 (3 steps: 6 f move eased / 6 f hold) to a line, then black. o.reopen = [frame, layer] band reopen
function t777StairLetterbox(c, f0, o) {
    o = o || {}; var W = c.width, H = c.height, win = o.win || H, steps = o.steps || [0.62, 0.3, 0.012], end = o.end || (f0 + 36 + 6);
    var T = sol7(c, [0, 0, 0], "FX_LB_TOP", f0, end, W, H), B = sol7(c, [0, 0, 0], "FX_LB_BOT", f0, end, W, H);
    var cy = o.cy || H / 2, pairsT = [[f0, [W / 2, cy - win / 2 - H / 2]]], pairsB = [[f0, [W / 2, cy + win / 2 + H / 2]]], f = f0;
    for (var i = 0; i < steps.length; i++) { var h = win * steps[i]; pairsT.push([f + 6, [W / 2, cy - h / 2 - H / 2]]); pairsB.push([f + 6, [W / 2, cy + h / 2 + H / 2]]); if (i < steps.length - 1) { pairsT.push([f + 12, pairsT[pairsT.length - 1][1]]); pairsB.push([f + 12, pairsB[pairsB.length - 1][1]]); } f += 12; }
    pairsT.push([f - 6 + 2, [W / 2, cy - H / 2]]); pairsB.push([f - 6 + 2, [W / 2, cy + H / 2]]);
    keys7(tr7(T, "p"), c, pairsT, [85, 85]); keys7(tr7(B, "p"), c, pairsB, [85, 85]);
    return { top: T, bot: B, clicks: [f0, f0 + 12, f0 + 24], black: f - 4 };
}
// band reopen (idea 17 / 42366 band reveal): mask on layer L grows from a line at y to full band over n frames, stepped 2 f
function t777BandReveal(c, L, f, n, o) {
    o = o || {}; var W = c.width, y = o.y || c.height / 2, full = o.full || c.height, m = lmask7(L, c, -W, y - 1, 3 * W, 2), mp = m.property("ADBE Mask Shape"), pairs = [];
    var sc = tr7(L, "s").value, p = tr7(L, "p").value, a = tr7(L, "a").value;
    for (var k = 0; k <= n; k += 2) { var h = 4 + (full - 4) * Math.pow(k / n, 1.7); var ly = (y - h / 2 - p[1]) / (sc[1] / 100) + a[1], lx = (-W - p[0]) / (sc[0] / 100) + a[0]; pairs.push([f + k, rshape7(lx, ly, 3 * W / (sc[0] / 100), h / (sc[1] / 100))]); }
    hold7(mp, c, pairs); return m;
}
// t413: strip conveyor: layers enter from the left one per `step` frames (n-frame ease-out slide), pushing earlier strips right
function t777StripConveyor(c, f0, Ls, step, n) {
    var W = c.width, sw = W / Ls.length; step = step || 6; n = n || 5;
    for (var i = 0; i < Ls.length; i++) {
        var L = Ls[i]; io7(L, c, f0 + i * step, null);
        var a = tr7(L, "a").value, s = tr7(L, "s").value[0] / 100, y = tr7(L, "p").value[1];
        rmask7(L, a[0] - sw / 2 / s, -10000, sw / s, 30000);
        var pairs = [[f0 + i * step, [-sw / 2, y]], [f0 + i * step + n, [sw / 2, y]]];
        for (var j = i + 1; j < Ls.length; j++) { var t = f0 + j * step; pairs.push([t, [sw / 2 + (j - 1 - i) * sw, y]], [t + n, [sw / 2 + (j - i) * sw, y]]); }
        keys7(tr7(L, "p"), c, pairs, [10, 90]);
    }
}
// t419: gradient matte reveal: B with a luma matte = matteL (a star gradient precomp); Levels input black 255 > 0 over n f
function t777GradMatteReveal(c, B, matteL, f, n) {
    matteL.moveBefore(B); io7(matteL, c, f, null); io7(B, c, f, null); matte7(B, matteL, TrackMatteType.LUMA);
    var lv = fx7(matteL, "ADBE Pro Levels2", {}); keys7(lv.property(4), c, [[f, 0.9], [f + n, 0]], [10, 85]); keys7(lv.property(5), c, [[f, 1], [f + n, 0.05]], [10, 85]);
    return lv;
}
// t421: jagged comic-burst white wipe (n f) at f
function t777BurstWipe(c, f, n) {
    n = n || 5; var S = shp7(c, "star", { name: "BURST", pts: 16, or: c.height * 0.75, ir: c.height * 0.46, col: [1, 1, 1] }); io7(S, c, f, f + n);
    keys7(tr7(S, "s"), c, [[f, [0, 0]], [f + n - 1, [170, 170]]], [80, 10]); keys7(tr7(S, "r"), c, [[f, 0], [f + n, 8]]);
    return S;
}
// t422: screen step zoom: A shrinks into an OS window in hold steps, B appears inside a screen rect and grows back in hold steps
function t777ScreenStepZoom(c, A, B, f0, o) {
    o = o || {}; var W = c.width, H = c.height, ws = [100, 72, 52, 36, 36], out = [];
    var N = c.layers.addNull(); N.name = "CTRL_WIN"; try { N.label = 1; } catch (e) {} tr7(N, "a").setValue([0, 0]); tr7(N, "p").setValue([W / 2, H / 2]);
    var bw = W * 0.92, bh = bw * 9 / 16;
    var bar = shp7(c, "rect", { name: "WIN_BAR", w: bw, h: 26 * W / 1080, col: hx7("#1A2CC0"), x: W / 2, y: H / 2 - bh / 2 - 13 * W / 1080 });
    var box = shp7(c, "rect", { name: "WIN_CLOSE", w: 20 * W / 1080, h: 18 * W / 1080, col: hx7("#D0D0D0"), x: W / 2 + bw / 2 - 16 * W / 1080, y: H / 2 - bh / 2 - 13 * W / 1080 });
    var fr = shp7(c, "rect", { name: "WIN_FRAME", w: bw + 4, h: bh + 4, stroke: 3 * W / 1080, scol: hx7("#C0C0C0"), x: W / 2, y: H / 2 });
    var parts = [A, bar, box, fr]; for (var i = 0; i < parts.length; i++) { parts[i].parent = N; }
    io7(bar, c, f0, f0 + 6); io7(box, c, f0, f0 + 6); io7(fr, c, f0, f0 + 6);
    var sp = []; for (i = 0; i < ws.length; i++) sp.push([f0 + i, [ws[i], ws[i]]]); hold7(tr7(N, "s"), c, sp);
    hold7(tr7(N, "p"), c, [[f0, [W / 2, H / 2]], [f0 + 3, [W * 0.42, H * 0.47]], [f0 + 4, [W * 0.36, H * 0.44]], [f0 + 5, [W * 0.30, H * 0.42]]]);
    // echo trail: 3 ghost copies of the window frame at older positions (drag echo)
    for (i = 1; i <= 3; i++) { var gh = fr.duplicate(); gh.name = "WIN_ECHO" + i; gh.parent = null; io7(gh, c, f0 + 3 + i - 1, f0 + 6); tr7(gh, "o").setValue(70 - i * 18); }
    // B inside the screen, hold-step zoom back in
    io7(B, c, f0 + 6, null); var bs = tr7(B, "s").value[0], zs = [0.3, 0.45, 0.65, 0.85, 1.0], zp = [];
    for (i = 0; i < zs.length; i++) zp.push([f0 + 6 + i, [bs * zs[i], bs * zs[i]]]); hold7(tr7(B, "s"), c, zp);
    return N;
}
// t423: squeeze-left reframe at f (1 f, hold): layer L to 70 % width, anchored left
function t777SqueezeLeft(c, L, f, o) {
    o = o || {}; var s = tr7(L, "s").value, p = tr7(L, "p").value, a = tr7(L, "a").value, src = L.source, lw = src.width * s[0] / 100;
    var left = p[0] - (a[0]) * s[0] / 100; var ns = s[0] * (o.k || 0.7);
    hold7(tr7(L, "s"), c, [[f - 1, [s[0], s[1]]], [f, [ns, s[1]]]]);
    hold7(tr7(L, "p"), c, [[f - 1, p], [f, [left + a[0] * ns / 100 - (o.dx || 0), p[1]]]]);
}
// t426: concentric staircase: list [[layer, cx, cy]] (source px of the round centre) 1 f each from f0
function t777Concentric(c, f0, list, holdLast) {
    for (var i = 0; i < list.length; i++) {
        var L = list[i][0], s = tr7(L, "s").value[0] / 100; io7(L, c, f0 + i, f0 + i + (i == list.length - 1 ? (holdLast || 4) : 1));
        tr7(L, "a").setValue([list[i][1], list[i][2]]); tr7(L, "p").setValue([c.width / 2, c.height / 2]);
    }
}
// t427: cylinder page spin + defocus-in: L (3D) Y rotation stepped at 12 fps over n f, lens blur 40 > 0 on the last 6 f
function t777CylinderSpin(c, L, f0, n, o) {
    o = o || {}; n = n || 14; L.threeDLayer = true; var ry = tr7(L, "ry"); keys7(ry, c, [[f0, -360], [f0 + n, 0]], [20, 90]);
    ry.expression = "posterizeTime(12); value"; tr7(L, "s").expression = "posterizeTime(12); value";
    fx7(L, "ADBE Optics Compensation", { 1: 30 });
    var e = fx7(L, "ADBE Camera Lens Blur", {}); keys7(e.property(1), c, [[f0 + n - 6, 40 * c.width / 1080], [f0 + n, 0]], [20, 85]);
}
// t428: player-window stack: Ls = footage layers; window i appears at f0+i (no animation); returns chrome layers
function t777WindowStack(c, f0, Ls, o) {
    o = o || {}; var W = c.width, out = [];
    for (var i = 0; i < Ls.length; i++) {
        var L = Ls[i], s = (o.scale || 0.5), sc = tr7(L, "s").value[0] * s; tr7(L, "s").setValue([sc, sc]);
        var x = W * (0.3 + 0.08 * i), y = c.height * (0.28 + 0.07 * i); tr7(L, "p").setValue([x, y]); io7(L, c, f0 + i, o.end || null);
        var w = L.source.width * sc / 100, h = L.source.height * sc / 100;
        var bar = shp7(c, "rect", { name: "WINBAR" + i, w: w, h: 14 * W / 540, col: hx7("#1A2CC0"), x: x, y: y - h / 2 - 7 * W / 540 }); io7(bar, c, f0 + i, o.end || null);
        var cb = shp7(c, "rect", { name: "WINX" + i, w: 11 * W / 540, h: 10 * W / 540, col: hx7("#D4D0C8"), x: x + w / 2 - 9 * W / 540, y: y - h / 2 - 7 * W / 540 }); io7(cb, c, f0 + i, o.end || null);
        out.push(bar, cb);
    }
    return out;
}
// st_777_16: letterbox ratio per shot: list [[frame, ratio]] ratio = picture W/H (2.35, 1.85, 1.33 = 4:3 inset)
function fx777Ratio(c, list) {
    var W = c.width, H = c.height, T = sol7(c, [0, 0, 0], "FX_RATIO_TOP"), B = sol7(c, [0, 0, 0], "FX_RATIO_BOT"), pt = [], pb = [];
    for (var i = 0; i < list.length; i++) { var h = Math.min(H, W / list[i][1]); pt.push([list[i][0], [W / 2, H / 2 - h / 2 - H / 2]]); pb.push([list[i][0], [W / 2, H / 2 + h / 2 + H / 2]]); }
    hold7(tr7(T, "p"), c, pt); hold7(tr7(B, "p"), c, pb); return [T, B];
}
