// c_scan_flash.jsx : "Scan Flash" transition (ref Video-57339, oct27 batch C) as an ES3 helper. Stock AE only
// (+ optional S_Glow). Guide: private study notes (not included) §57339.
//
// Tutorial recipe (25 fps, 1080x1920 comp; scaled here by comp height):
//   1. Precomp video / isolated object (roto'd subject), make it 8 frames long, freeze the last frame.
//   2. MATTE comp: 4 white rectangles, height ~580 px @1920 (= 0.302 H), stacked to cover the screen,
//      each layer offset by 2 f (bottom bar first), adjustment layer with Fast Box Blur on top.
//      -> used as ALPHA matte for the incoming video (B is revealed bar by bar, bottom -> top).
//   3. SCAN comp = duplicate of MATTE, every bar trimmed to 2 f -> one bright band scanning upward.
//   4. INVERT comp = duplicate, first bar 3 f, the others offset by 1 f.
//   5. SCAN + INVERT above the video, video (subject) as ALPHA matte for them, SCAN blend = Screen.
//   6. Adjustment under SCAN: Invert + Tritone (blueish) + Glow intensity 0.1, INVERT comp as its alpha matte.
//   Seen in the demo (@25): f0 white block bottom, f2 white + blue-invert block, f4 blue-invert, f6 full
//   inverted blue/white frame, f8 clean B. Total 8 f (= 13 f @50, 16 f @60).
//
// Usage:
//   #include "c_scan_flash.jsx"
//   cScanFlash(comp, subjectLayer, tStart, {frames: 16});   // subjectLayer = roto'd precomp of B (alpha)
//   opts: frames (8 @25 -> scaled to comp fps if omitted), bars (4), blur (20 @1920 -> scaled),
//         tri [hi, mid, shadow] RGB 0-1 (default blueish), glow (0.1), bottomUp (true)
// SFX (ref): music dropout ~0.3 s before, then a short bright digital "scan" sweep + soft sub hit on the full
// invert frame. Library: premium_oct27/batchC/scan_electric/mixkit__data-scaner-2847.wav (-24 dB, trimmed
// to 0.25 s) + premium/sub_drops_booms (soft) -20 dB. No chime/sparkle.
// Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _sfO(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _sfSet(fx, name, v) {
    try { var p = fx.property(name); if (p) p.setValue(v); else $.writeln("cScanFlash: no param " + name); }
    catch (e) { $.writeln("cScanFlash " + name + ": " + String(e.message) + " L" + e.line); }
}
function _sfMatte(layer, matte, type) {               // AE 23+: setTrackMatte; older: trackMatteType
    try { layer.setTrackMatte(matte, type); return; } catch (e) {}
    matte.moveBefore(layer);
    layer.trackMatteType = (type === TrackMatteType.ALPHA_INVERTED) ? TrackMatteType.ALPHA_INVERTED : TrackMatteType.ALPHA;
}

// builds a bars comp: n white bars, each starting startStep*k frames later, lasting len frames (len<=0 -> to end)
function _sfBars(name, comp, nFrames, n, startStep, firstLen, len, blurPx, bottomUp) {
    var fd = comp.frameDuration;
    var c = app.project.items.addComp(name, comp.width, comp.height, 1, nFrames * fd, 1 / fd);
    var barH = comp.height * 0.302;
    var slot = comp.height / n;
    for (var k = 0; k < n; k++) {
        var row = bottomUp ? (n - 1 - k) : k;
        var s = c.layers.addShape(); s.name = "SHP_bar" + (k + 1); s.label = LBL.SHAPE;
        var g = s.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        var rect = g.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Rect");
        rect.property("ADBE Vector Rect Size").setValue([comp.width * 1.1, Math.max(barH, slot)]);
        var fill = g.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue([1, 1, 1]);
        s.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width / 2, slot * (row + 0.5)]);
        // INVERT variant: bar1 lasts firstLen, later bars start after it, offset by startStep each
        var tIn = (k === 0 ? 0 : ((firstLen > 0 ? firstLen - startStep : 0) + k * startStep)) * fd;
        var dur = (k === 0 && firstLen > 0) ? firstLen : len;
        s.inPoint = tIn;                                   // AE 26.5: set inPoint first, then outPoint
        s.outPoint = (dur > 0) ? Math.min(tIn + dur * fd, c.duration) : c.duration;
    }
    var adj = c.layers.addSolid([1, 1, 1], "ADJ_boxblur", c.width, c.height, 1, c.duration);
    adj.adjustmentLayer = true; adj.label = LBL.ADJ;
    var bb = adj.property("ADBE Effect Parade").addProperty("ADBE Box Blur2");
    _sfSet(bb, "Blur Radius", blurPx);
    _sfSet(bb, "Iterations", 3);
    return c;
}

function cScanFlash(comp, subjectLayer, tStart, opts) {
    var fd = comp.frameDuration;
    var fpsScale = (1 / fd) / 25;
    var nF = _sfO(opts, "frames", Math.round(8 * fpsScale));
    var n = _sfO(opts, "bars", 4);
    var step = Math.max(1, Math.round(2 * fpsScale));
    var blur = _sfO(opts, "blur", 20) * comp.height / 1920;
    var up = _sfO(opts, "bottomUp", true);
    var tri = _sfO(opts, "tri", [[0.88, 0.95, 1.0], [0.20, 0.45, 0.95], [0.02, 0.04, 0.12]]);

    var cMatte = _sfBars("PC_SCANFLASH_MATTE", comp, nF, n, step, 0, 0, blur, up);
    var cScan = _sfBars("PC_SCANFLASH_SCAN", comp, nF, n, step, 0, step, blur, up);
    var cInv = _sfBars("PC_SCANFLASH_INVERT", comp, nF, n, Math.max(1, Math.round(fpsScale)),
                       Math.round(3 * fpsScale), Math.max(1, Math.round(fpsScale)), blur, up);

    // B revealed through the MATTE bars
    var lMatte = comp.layers.add(cMatte); lMatte.name = "MATTE_scanbars"; lMatte.label = LBL.MATTE;
    lMatte.startTime = tStart;
    _sfMatte(subjectLayer, lMatte, TrackMatteType.ALPHA);

    // invert/tritone/glow adjustment, limited by INVERT comp
    var adj = comp.layers.addSolid([1, 1, 1], "ADJ_scan_invert", comp.width, comp.height, 1, nF * fd);
    adj.adjustmentLayer = true; adj.label = LBL.ADJ; adj.startTime = tStart;
    var fxp = adj.property("ADBE Effect Parade");
    fxp.addProperty("ADBE Invert");
    var tt = fxp.addProperty("ADBE Tritone");
    var gl = (function (P) { try { return P.addProperty("ADBE Glo2"); } catch (e) {} var g = P.addProperty("S_Glow"); g = P.property(P.numProperties); for (var j = 1; j <= g.numProperties; j++) { var p = g.property(j); try { if (p.name == "Brightness") p.setValue(0.6); else if (p.name == "Threshold") p.setValue(0.6); else if (p.name == "Glow Width") p.setValue(40); else if (p.name == "Expand Borders") p.setValue(1); } catch (e2) {} } return g; })(fxp);   // Glo2 missing in AE 26 -> restrained S_Glow (2026-11-09)
    tt = fxp.property(2); gl = fxp.property(3);           // re-fetch after adding (refs invalidate)
    _sfSet(tt, "Highlights", tri[0]); _sfSet(tt, "Midtones", tri[1]); _sfSet(tt, "Shadows", tri[2]);
    _sfSet(gl, "Glow Intensity", _sfO(opts, "glow", 0.1));
    var lInv = comp.layers.add(cInv); lInv.name = "MATTE_scan_invert"; lInv.label = LBL.MATTE; lInv.startTime = tStart;
    _sfMatte(adj, lInv, TrackMatteType.ALPHA);

    // white scanning band, only inside the subject, Screen
    var lScan = comp.layers.add(cScan); lScan.name = "FX_scan_band"; lScan.label = LBL.LIGHT; lScan.startTime = tStart;
    lScan.blendingMode = BlendingMode.SCREEN;
    var subDup = subjectLayer.duplicate(); subDup.name = "MATTE_subject_for_scan"; subDup.label = LBL.MATTE;
    _sfMatte(lScan, subDup, TrackMatteType.ALPHA);
    return {matte: lMatte, scan: lScan, invert: adj};
}
