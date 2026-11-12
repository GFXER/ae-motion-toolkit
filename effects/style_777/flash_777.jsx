// flash_777.jsx - STYLE 777 flash / light family (needs lib_777.jsx). Frames are comp frames.
// st_777_04 flash kit, st_777_05 exposure flicker, st_777_21 dark strobe, t403 zoom-white, t404 grey bridge, t407 film burn,
// t410 leak burn, t414 pre-drop ladder, t416 defocus exit, t424 diagonal light, t425 exposure settle, t429 bass gap, t430 cigarette burn.

// st_777_04: kind white|grey|lightgrey|phone|dbl|lighter ; o.next = layer for dbl ; o.xy for lighter
function fx777Flash(c, f, kind, o) {
    o = o || {}; var n = o.n || (kind == "lightgrey" ? 2 : (kind == "lighter" ? 4 : 1)), L;
    if (kind == "white") L = flash7(c, [1, 1, 1], "FX_WHITE_f" + f, f, f + n);
    else if (kind == "grey") L = flash7(c, hx7("#8C8C8E"), "FX_GREY_f" + f, f, f + n);
    else if (kind == "lightgrey") L = flash7(c, hx7("#E8E8EA"), "FX_LIGHTGREY_f" + f, f, f + n);
    else if (kind == "phone") {
        L = adj7(c, "ADJ_PHONEFLASH_f" + f, f, f + n);
        fx7(L, "ADBE Exposure2", { 3: 2.2, 22: 1 }); fx7(L, "ADBE Pro Levels2", { 4: 0.02, 6: 1.25 }); fx7(L, "ADBE HUE SATURATION", { 4: -35 });
    } else if (kind == "dbl") {
        L = o.next.duplicate(); L.name = "FX_DBLEXPO_f" + f; io7(L, c, f, f + n); L.blendingMode = BlendingMode.ADD; tr7(L, "o").setValue(60); L.moveToBeginning();
    } else if (kind == "lighter") {
        L = adj7(c, "ADJ_LIGHTER_f" + f, f, f + n); var e = fx7(L, "ADBE Exposure2", { 22: 1 });
        keys7(e.property(3), c, [[f, 0], [f + 1, 3], [f + 2, 5], [f + 3, 1.5]], [30, 30]);
        if (o.xy) { var m = rmask7(L, o.xy[0] - c.width * 0.45, o.xy[1] - c.width * 0.45, c.width * 0.9, c.width * 0.9, { feather: c.width * 0.35 }); }
    }
    return L;
}
// st_777_05: exposure flicker: list [[f, stops]]
function fx777ExpFlicker(c, list, a, b) { var J = adj7(c, "ADJ_EXPFLICKER", a, b); var e = fx7(J, "ADBE Exposure2", { 22: 1 }); hold7(e.property(3), c, list); return J; }
// st_777_21: dark strobe: black gap [f0, f0+n) with dim colour flickers on list [[f, hex, opacity]]
function fx777DarkStrobe(c, f0, n, list) {
    var B = sol7(c, [0, 0, 0], "FX_BLACKGAP", f0, f0 + n), out = [B];
    for (var i = 0; i < list.length; i++) { var S = flash7(c, hx7(list[i][1]), "FX_DIM_f" + list[i][0], list[i][0], list[i][0] + 1); tr7(S, "o").setValue(list[i][2] || 18); out.push(S); }
    return out;
}
// t403: radial zoom-blur into white: blur frame f, white f+1, cut at f+2. xy = vanishing point
function t777ZoomWhite(c, f, xy) {
    var J = adj7(c, "ADJ_ZOOMBLUR_f" + f, f - 1, f + 1);
    var r = fx7(J, "CC Radial Blur", { 1: 6, 3: 70, 4: xy || [c.width / 2, c.height / 2] }); keys7(r.property(2), c, [[f - 1, 30], [f, 80]]);
    var e = fx7(J, "ADBE Exposure2", { 22: 1 }); keys7(e.property(3), c, [[f - 1, 0.5], [f, 2]]);
    var W = flash7(c, [1, 1, 1], "FX_WHITE_f" + (f + 1), f + 1, f + 2); return [J, W];
}
// t404: grey blur bridge n frames from f over the running footage (freeze = layer to freeze at f)
function t777GreyBridge(c, f, n, freezeL) {
    if (freezeL) { var D = freezeL.duplicate(); D.name = "VID_FREEZE_f" + f; var srcT = f7(c, f) - D.startTime; D.timeRemapEnabled = true; D.property("ADBE Time Remapping").expression = String(srcT); io7(D, c, f, f + n); D.moveToBeginning(); }
    var J = adj7(c, "ADJ_GREYBRIDGE_f" + f, f, f + n);
    fx7(J, "ADBE Motion Blur", { 1: 90, 2: 250 * c.width / 1080 }); fx7(J, "ADBE HUE SATURATION", { 4: -100 }); fx7(J, "ADBE Pro Levels2", { 6: 1.2, 7: 40 / 255, 8: 200 / 255 });
    return J;
}
// t407: film-burn ignition 2-3 f (magenta > cream)
function t777FilmBurn(c, f, n) {
    n = n || 3; var S = flash7(c, [1, 1, 1], "FX_FILMBURN_f" + f, f, f + n); S.blendingMode = BlendingMode.SCREEN;
    var g = fx7(S, "ADBE Ramp", { 1: [c.width * 0.15, c.height * 0.2], 3: [c.width * 0.9, c.height * 0.95], 5: 2 });
    hold7(g.property(2), c, [[f, hx7("#9A2A6A")], [f + 1, hx7("#E9A07A")], [f + 2, hx7("#F4E7D0")]]);
    hold7(g.property(4), c, [[f, hx7("#2A0A20")], [f + 1, hx7("#B0306A")], [f + 2, hx7("#F4E7D0")]]);
    var nz = fx7(S, "ADBE Fractal Noise", { 4: 160, 10: 18, 30: 35, 31: 6 }); try { nz.property(24).expression = "time*4000"; } catch (e) {}
    hold7(tr7(S, "o"), c, [[f, 80], [f + 1, 100], [f + 2, 100]]);
    return S;
}
// t410: light-leak burn to white, ease-in over n f, last frame white
function t777LeakBurn(c, f, n, o) {
    o = o || {}; n = n || 3; var S = flash7(c, [1, 1, 1], "FX_LEAK_f" + f, f - n, f + 1); S.blendingMode = BlendingMode.SCREEN;
    fx7(S, "ADBE Ramp", { 1: o.xy || [c.width * 0.85, c.height * 0.3], 2: hx7("#FFB060"), 3: [o.xy ? o.xy[0] - c.width : -c.width * 0.2, c.height * 0.9], 4: [0, 0, 0], 5: 2 });
    keys7(tr7(S, "o"), c, [[f - n, 0], [f - 1, 100]], [85, 10]); keys7(tr7(S, "s"), c, [[f - n, [80, 80]], [f, [150, 150]]], [85, 10]);
    var W = flash7(c, [1, 1, 1], "FX_WHITE_f" + f, f, f + 1); return [S, W];
}
// t414: pre-drop ladder from f0: black 5 > smear 1 > black 1 > grey 1 > white 1 ; drop at f0+9. o.drop = drop layer for ghost flicker
function t777PreDropLadder(c, f0, o) {
    o = o || {}; var out = [];
    if (o.ghost && o.drop) { // 86308 ghost flicker-in on the 5 black frames
        var G = o.drop.duplicate(); G.name = "VID_GHOST_f" + f0; io7(G, c, f0, f0 + 5); G.moveToBeginning(); hold7(tr7(G, "o"), c, [[f0, 0], [f0 + 1, 15], [f0 + 2, 0], [f0 + 3, 40], [f0 + 4, 100]]);
        var Bk = sol7(c, [0, 0, 0], "FX_BLACK_LADDER", f0, f0 + 5); Bk.moveAfter(G); out.push(G);
    } else out.push(sol7(c, [0, 0, 0], "FX_BLACK_LADDER", f0, f0 + 5));
    if (o.drop) { var Sm = o.drop.duplicate(); Sm.name = "VID_SMEARSRC_f" + (f0 + 5); io7(Sm, c, f0 + 5, f0 + 6); Sm.moveToBeginning(); }
    var J = adj7(c, "ADJ_SMEAR_f" + (f0 + 5), f0 + 5, f0 + 6); fx7(J, "ADBE Motion Blur", { 1: 90, 2: 200 * c.width / 1080 }); out.push(J);
    out.push(sol7(c, [0, 0, 0], "FX_BLACK_1", f0 + 6, f0 + 7));
    out.push(flash7(c, hx7("#8C8C8E"), "FX_GREY", f0 + 7, f0 + 8));
    out.push(flash7(c, [1, 1, 1], "FX_WHITE", f0 + 8, f0 + 9));
    return out;
}
// t416: defocus exit (Camera Lens Blur 0 > 60 ease-in over n f) on a layer (logo/precomp/footage)
function t777DefocusExit(c, L, f, n, o) {
    o = o || {}; var e = fx7(L, "ADBE Camera Lens Blur", { 3: 2, 17: 30, 18: 0.7, 21: 0 });
    keys7(e.property(1), c, [[f, 0], [f + (n || 12), (o.max || 60) * c.width / 1080]], [10, 85]);
    if (o.fade) keys7(tr7(L, "o"), c, [[f + n - 3, 100], [f + n, 0]]);
    return e;
}
// t424: diagonal light-wipe frame at f, B dim at f+1
function t777DiagLight(c, f, B) {
    var S = flash7(c, [1, 1, 1], "FX_DIAGLIGHT_f" + f, f, f + 1), w = c.width, h = c.height;
    rmask7(S, 0, 0, 0, 0, { pts: [[w * 0.05, 0], [w * 0.7, 0], [w * 0.95, h], [w * 0.3, h]], feather: 24 * w / 1080 });
    if (B) { var e = fx7(B, "ADBE Exposure2", { 22: 1 }); hold7(e.property(3), c, [[f + 1, -1.2], [f + 2, 0]]); }
    return S;
}
// t425: exposure-settle entry on layer B from frame f over n
function t777ExposureSettle(c, B, f, n) { var e = fx7(B, "ADBE Exposure2", { 22: 1 }); keys7(e.property(3), c, [[f, 4], [f + (n || 4), 0]], [10, 90]); return e; }
// t429: bass-gap blackout: gaps [[f0, f1]] (f1 = bass re-entry = cut), next = layer that starts at f1 (ghost flicker in the last 5 f)
function t777BassGap(c, gaps, nexts) {
    var out = [];
    for (var i = 0; i < gaps.length; i++) {
        var a = gaps[i][0], b = gaps[i][1]; out.push(sol7(c, [0, 0, 0], "FX_BASSGAP_f" + a, a, b));
        if (nexts && nexts[i]) { var G = nexts[i].duplicate(); G.name = "VID_GHOSTIN_f" + a; io7(G, c, b - 5, b); G.moveToBeginning(); hold7(tr7(G, "o"), c, [[b - 5, 0], [b - 4, 15], [b - 3, 0], [b - 2, 40], [b - 1, 100]]); out.push(G); }
    }
    return out;
}
// t430: cigarette-burn marker (red frame + black disc top-right) at f
function t777CigBurn(c, f) {
    var R = flash7(c, hx7("#C0141C"), "FX_CIGBURN_f" + f, f, f + 1);
    var D = shp7(c, "ell", { name: "CIGDISC", w: c.height * 0.18, h: c.height * 0.18, col: [0, 0, 0], x: c.width * 0.78, y: c.height * 0.18 }); io7(D, c, f, f + 1);
    return [R, D];
}
