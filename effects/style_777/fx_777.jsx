// fx_777.jsx - STYLE 777 inserts / layout / light effects (needs lib_777.jsx). Frames are comp frames.
// st_777_10 crimson bed, _11 roto matte flash, _12 X-ray strobe, _13 censor clock, _14 blinds, _15 pixel logo, _17 camcorder,
// _18 scope, _19 window montage, _20 fixed tag, _22 neon, _23 halftone, _24 band, _25 insert salvo, _26 grid4.

// st_777_10: crimson fold-edge gradient bed (69649): returns the precomp layer (CC Toner CRIMSON on top). o.raw = no toner (matte use)
function fx777CrimsonBed(c, o) {
    o = o || {}; var W = c.width, H = c.height;
    var L = pc7(c, "GRAD_SRC_" + (o.tag || "A"), W, H, function (cc) {
        sol7(cc, [0, 0, 0], "IMG_BLACK", 0, null);
        for (var k = 0; k < 2; k++) {
            var S = shp7(cc, "star", { name: "STAR" + k, pts: 5, or: W * (k ? 0.8 : 1.05), ir: W * (k ? 0.8 : 1.05) * 0.29, col: k ? [0.8, 0.8, 0.8] : [1, 1, 1], x: k ? W * 1.02 : W * 0.02, y: k ? H * 0.92 : H * 0.14 });
            tr7(S, "r").expression = (k ? "-" : "") + "time*10.3 + " + (k ? 40 : 0); if (k) { S.blendingMode = BlendingMode.LIGHTEN; tr7(S, "o").setValue(85); }
            fx7(S, "ADBE Box Blur2", { 1: W * 0.07, 2: 3, 4: 1 });
            fx7(S, "ADBE Wave Warp", { 1: 1, 2: W * 0.03, 3: H / 3, 4: 90, 5: 0.3 });
            fx7(S, "ADBE Bulge", { 1: W * 0.5, 2: H * 0.4, 3: [W * 0.62, H * 0.5], 4: 0.9 });
        }
        var lv = adj7(cc, "ADJ_LEVELS", 0, null); fx7(lv, "ADBE Pro Levels2", { 6: 0.55, 8: 250 / 255 });
    });
    if (!o.raw) toner7(L, o.pal || "CRIMSON");
    return L;
}
// st_777_11: roto matte flash: white fill of the subject (matte = luma matte footage layer factory) on frames list [[f, n]]
function fx777RotoFlash(c, mkMatte, list) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
        var S = flash7(c, [1, 1, 1], "FX_ROTOWHITE_f" + list[i][0], list[i][0], list[i][0] + (list[i][1] || 1)); var M = mkMatte(c); M.name = "MATTE_ROTO_f" + list[i][0]; io7(M, c, list[i][0], list[i][0] + (list[i][1] || 1)); M.moveBefore(S); matte7(S, M, TrackMatteType.LUMA); out.push(S);
    }
    return out;
}
// st_777_12: silhouette X-ray strobe over [f0, f0+n): even frames = black silhouette, odd = x-ray (edges inverted) inside the matte; white blob behind
function fx777XrayStrobe(c, foot, mkMatte, f0, n) {
    var W = c.width, H = c.height;
    var blob = shp7(c, "ell", { name: "XRAY_BLOB", w: W * 0.7, h: W * 0.8, col: [1, 1, 1], x: W / 2, y: H * 0.45 }); io7(blob, c, f0, f0 + n); fx7(blob, "ADBE Gaussian Blur 2", { 1: 60 });
    var X = foot.duplicate(); X.name = "VID_XRAY"; io7(X, c, f0, f0 + n); X.moveToBeginning();
    fx7(X, "ADBE Black&White", {}); fx7(X, "ADBE Find Edges", { 1: 0 }); fx7(X, "ADBE Pro Levels2", { 4: 0.1, 5: 0.6 }); toner7(X, "CYAN_DUO");
    var Bk = sol7(c, [0, 0, 0], "FX_SILHOUETTE", f0, f0 + n); Bk.moveAfter(X); var M2 = mkMatte(c); io7(M2, c, f0, f0 + n); M2.moveBefore(Bk); matte7(Bk, M2, TrackMatteType.LUMA);
    var pairs = []; for (var f = f0; f < f0 + n; f++) pairs.push([f, ((f - f0) % 2 == 0) ? 0 : 100]); hold7(tr7(X, "o"), c, pairs);
    var M = mkMatte(c); io7(M, c, f0, f0 + n); M.moveBefore(X); matte7(X, M, TrackMatteType.LUMA);
    return X;
}
// st_777_13: censor-bar colour clock: rect [x,y,w,h]; colour every `every` frames; drop = frame where it fills the frame (2 f)
function fx777CensorClock(c, rect, f0, f1, every, drop) {
    var cols = ["#FF2D8A", "#C0168A", "#1F2A8C", "#E01818"], S = shp7(c, "rect", { name: "CENSOR", w: rect[2], h: rect[3], col: hx7(cols[0]), x: rect[0], y: rect[1] }); io7(S, c, f0, f1);
    var pairs = [], k = 0, ev = every || [3, 2, 5, 2, 4]; for (var f = f0; f < f1; k++) { pairs.push([f, hx7(cols[k % cols.length])]); f += ev[k % ev.length]; }
    hold7(shpFill7(S), c, pairs);
    if (drop) { var sz = shpProp7(S, "ADBE Vector Rect Size"); keys7(sz, c, [[drop, [rect[2], rect[3]]], [drop + 2, [c.width * 1.1, c.height * 1.1]]]); keys7(tr7(S, "p"), c, [[drop, [rect[0], rect[1]]], [drop + 2, [c.width / 2, c.height / 2]]]); }
    return S;
}
// st_777_14: venetian-blind light bars over a silhouette matte, tint per frame
function fx777Blinds(c, mkMatte, f0, n) {
    var S = flash7(c, [1, 1, 1], "FX_BLINDS", f0, f0 + n); fx7(S, "ADBE Venetian Blinds", { 1: 55, 2: 0, 3: 18 * c.width / 540 });
    var tint = fx7(S, "ADBE Fill", { 3: [1, 1, 1] }), cols = ["#3A4AA0", "#8B2AA1", "#873257", "#E8E8EA"], pairs = []; for (var f = f0; f < f0 + n; f++) pairs.push([f, hx7(cols[(f - f0) % cols.length])]);
    hold7(tint.property(3), c, pairs);
    var p = tr7(S, "p"); p.expression = "value + [0, (time*" + (c.height * 0.15) + ")%" + (36 * c.width / 540) + "]";
    if (mkMatte) { var M = mkMatte(c); io7(M, c, f0, f0 + n); M.moveBefore(S); matte7(S, M, TrackMatteType.LUMA); }
    return S;
}
// st_777_15: pixel assembly logotype (layer L): Mosaic 40 > 1 in hold steps over n f (8 fps), 2 f digital damage, 1 f bloom out at f0+n
function fx777PixelLogo(c, L, f0, n) {
    var m = fx7(L, "ADBE Mosaic", { 3: 1 }), pairs = [], steps = [6, 12, 24, 60, 540]; for (var i = 0; i < steps.length; i++) pairs.push([f0 + Math.round(i * n / (steps.length - 1)), steps[i]]);
    hold7(m.property(1), c, pairs); hold7(m.property(2), c, pairs);
    var dd = fx7(L, "S_DigitalDamage", {}); if (dd) hold7(dd.property(22), c, [[f0, 1], [f0 + 3, 0]]);
    var g = safeGlow(L, { thr: 50, rad: 60, inten: 0.0 }); if (g) { try { var ip = sgInten(g); hold7(ip, c, [[f0, 0], [f0 + n, 2.5], [f0 + n + 1, 0]]); } catch (e) {} }
    return L;
}
// st_777_17: camcorder OSD 4:3 inset over a footage layer L
function fx777Camcorder(c, L, f0, f1, o) {
    o = o || {}; var W = c.width, H = c.height, iw = W * 0.86, ih = iw * 3 / 4, x0 = (W - iw) / 2, y0 = (H - ih) / 2;
    lmask7(L, c, x0, y0, iw, ih); fx7(L, "CC Lens", { 2: 160, 3: 95 });
    var sz = H * 0.022, out = [];
    var t = [["PLAY ▶", x0 + iw * 0.06, y0 + ih * 0.1, 1], ["AUTO", x0 + iw * 0.94, y0 + ih * 0.1, 2], [o.time || "AM 2:41", x0 + iw * 0.06, y0 + ih * 0.88, 1], [o.date || "NOV. 11 2026", x0 + iw * 0.94, y0 + ih * 0.88, 2]];
    for (var i = 0; i < t.length; i++) { var T = txt7(c, t[i][0], { font: "IBMPlexMono-Bold", size: sz, x: t[i][1], y: t[i][2], just: t[i][3] }); fx7(T, "ADBE Drop Shadow", { 2: 255, 4: 2, 5: 0 }); io7(T, c, f0, f1); out.push(T); }
    var rec = shp7(c, "ell", { name: "REC", w: sz * 0.7, col: hx7("#E01818"), x: x0 + iw * 0.06 + sz * 5.2, y: y0 + ih * 0.1 }); io7(rec, c, f0, f1); tr7(rec, "o").expression = "Math.floor(time*2)%2*100";
    return out;
}
// st_777_18: oscilloscope carrier line driven by an audio layer (aud) or a sine (no audio)
function fx777Scope(c, aud, f0, f1, o) {
    o = o || {}; var S = sol7(c, [0, 0, 0], "FX_SCOPE", f0, f1); S.blendingMode = BlendingMode.SCREEN;
    if (aud) { fx7(S, "ADBE AudWave", { 1: aud.index, 2: [0, c.height * (o.y || 0.5)], 3: [c.width, c.height * (o.y || 0.5)], 5: 260, 6: c.height * 0.12, 7: 60, 9: 2.5, 10: 0.2, 12: [1, 1, 1, 1], 13: [1, 1, 1, 1], 15: 2 }); }
    var g = safeGlow(S, { thr: 40, rad: 12, inten: 0.6 });
    return S;
}
// st_777_19: window montage: fixed centred window over BG layers swapped every `step` f (BG list already placed); window = eye/product layer
function fx777WindowMontage(c, win, bgs, f0, step, o) {
    o = o || {}; var W = c.width, H = c.height, ww = o.w || W * 0.5, wh = o.h || W * 0.28;
    for (var i = 0; i < bgs.length; i++) io7(bgs[i], c, f0 + i * step, f0 + (i + 1) * step + (i == bgs.length - 1 ? (o.holdLast || 6) : 0));
    win.moveToBeginning(); lmask7(win, c, W / 2 - ww / 2, H / 2 - wh / 2, ww, wh);
    var fr = shp7(c, "rect", { name: "WIN_STROKE", w: ww, h: wh, stroke: 2 * W / 540, scol: hx7("#141418") }); io7(fr, c, f0, null);
    return fr;
}
// st_777_20: fixed tag over crowd/black alternation (layers already alternating); returns tag
function fx777FixedTag(c, s, num, o) {
    o = o || {}; var T = txt7(c, s, { font: "Arial-BoldItalicMT", size: c.height * 0.03, y: o.y || c.height * 0.5 });
    var N = txt7(c, num, { font: "Anton-Regular", size: c.height * 0.05, col: [0, 0, 0], stroke: 2.5, scol: hx7("#E8E85A"), over: true, y: (o.y || c.height * 0.5) + c.height * 0.05 });
    var td = N.property("ADBE Text Properties").property("ADBE Text Document"), d = td.value; d.applyFill = false; td.setValue(d);
    var g = safeGlow(N, { thr: 30, rad: 18, inten: 0.8 }); return [T, N];
}
// st_777_22: neon outline logo (text or shape): yellow 6 px stroke + white 2 px core + soft glow; flicker on at f0
function fx777Neon(c, s, f0, f1, o) {
    o = o || {}; var size = o.size || c.height * 0.09;
    var Y = txt7(c, s, { font: o.font || "Arial-BoldItalicMT", size: size, col: [0, 0, 0], stroke: 9 * c.width / 540, scol: hx7("#E8E85A"), over: true, y: o.y }); Y.name = "TXT_NEON_Y";
    var td = Y.property("ADBE Text Properties").property("ADBE Text Document"), d = td.value; d.applyFill = false; td.setValue(d);
    var Wc = Y.duplicate(); Wc.name = "TXT_NEON_CORE"; var td2 = Wc.property("ADBE Text Properties").property("ADBE Text Document"), d2 = td2.value; d2.strokeColor = [1, 1, 1]; d2.strokeWidth = 3 * c.width / 540; td2.setValue(d2);
    var P = pc7(c, "NEON_" + s.substr(0, 6), c.width, c.height, function (cc) { var a = Y.copyToComp(cc); var b = Wc.copyToComp(cc); });
    Y.remove(); Wc.remove(); io7(P, c, f0, f1);
    safeGlow(P, { thr: 20, rad: 40, inten: 1.6 }); safeGlow(P, { thr: 20, rad: 12, inten: 1.0 });
    hold7(tr7(P, "o"), c, [[f0, 100], [f0 + 1, 20], [f0 + 2, 100], [f0 + 4, 40], [f0 + 5, 100]]);
    return P;
}
// st_777_23: halftone cobalt flood (ADJ) for frames [f, f+n)
function fx777Halftone(c, f, n) { var J = adj7(c, "ADJ_HALFTONE_COBALT", f, f + (n || 2)); fx7(J, "S_HalfToneColor", { 23: 60, 26: 6 }); fx7(J, "ADBE Black&White", {}); toner7(J, "COBALT"); return J; }
// st_777_24: 16:9 band on the 9:16 page (scale footage to comp width, centred)
function fx777Band(c, L, y) { var s = 100 * c.width / L.source.width; tr7(L, "s").setValue([s, s]); tr7(L, "p").setValue([c.width / 2, y || c.height / 2]); return L; }
// st_777_25: insert salvo: list of [kind, frames] kinds static|xray|cobalt|grid|white|black|layer(L) ; returns end frame
function fx777Salvo(c, f0, list) {
    var f = f0, W = c.width, H = c.height;
    for (var i = 0; i < list.length; i++) {
        var k = list[i][0], n = list[i][1], L;
        if (k == "static") { L = sol7(c, [0.5, 0.5, 0.5], "FX_INS_STATIC", f, f + n); var nz = fx7(L, "ADBE Fractal Noise", { 1: 1, 2: 1, 4: 280, 10: 5 }); try { nz.property(24).expression = "time*3000"; } catch (e) {} fx7(L, "ADBE Venetian Blinds", { 1: 35, 3: 3 }); }
        else if (k == "cobalt") L = sol7(c, hx7("#0E2A3F"), "FX_INS_COBALT", f, f + n);
        else if (k == "white") L = flash7(c, [1, 1, 1], "FX_INS_WHITE", f, f + n);
        else if (k == "black") L = sol7(c, [0, 0, 0], "FX_INS_BLACK", f, f + n);
        else if (k == "grid") { L = sol7(c, [0, 0, 0], "FX_INS_GRID", f, f + n); fx7(L, "ADBE Grid", { 4: W / 6, 6: 1.5, 12: [0.85, 0.85, 0.9], 13: 70 }); var cr = shp7(c, "path", { name: "CROSS", pts: [[-W * 0.3, 0], [W * 0.3, 0]], stroke: 2, scol: hx7("#E0202A") }); io7(cr, c, f, f + n); var cr2 = shp7(c, "path", { name: "CROSS2", pts: [[0, -W * 0.3], [0, W * 0.3]], stroke: 2, scol: hx7("#E0202A") }); io7(cr2, c, f, f + n); }
        else if (k == "xray") { L = list[i][2]; io7(L, c, f, f + n); L.moveToBeginning(); fx7(L, "ADBE Black&White", {}); fx7(L, "ADBE Find Edges", { 1: 1 }); fx7(L, "ADBE Pro Levels2", { 4: 0.05, 5: 0.5 }); toner7(L, "CYAN_DUO"); }
        else if (k == "layer") { L = list[i][2]; io7(L, c, f, f + n); L.moveToBeginning(); }
        f += n;
    }
    return f;
}
// st_777_26: 4-up montage grid: 4 layers into quadrants (2 px gutters), title on top
function fx777Grid4(c, Ls, f0, f1) {
    var W = c.width, H = c.height, gh = W * 9 / 16, y0 = H / 2 - gh / 2, g = 2;
    for (var i = 0; i < 4; i++) {
        var L = Ls[i], s = tr7(L, "s").value[0] / 2; tr7(L, "s").setValue([s, s]);
        var x = (i % 2) * W / 2 + W / 4, y = y0 + Math.floor(i / 2) * gh / 2 + gh / 4; tr7(L, "p").setValue([x, y]); io7(L, c, f0, f1);
        lmask7(L, c, x - W / 4 + g, y - gh / 4 + g, W / 2 - 2 * g, gh / 2 - 2 * g);
    }
}
