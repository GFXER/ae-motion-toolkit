// study_scan_flash_v2.jsx : Scan Flash v2 = c_scan_flash.jsx (OCT27 kit, ref 57339) + what the 2026-11 study of
// Video-71947 adds (private study notes):
//   - S_Glow fallback: stock Glow (ADBE Glo2) is missing from app.effects on this AE 26 install, so c_scan_flash.jsx
//     throws "Can not add a property ADBE Glo2" (tested 2026-11-09). v2 tries Glo2 then S_Glow.
//   - 71947 blue tritone defaults (white / #4FA8FF / #06204A).
//   - flashFrames (1): one full-frame inverted tritone frame on B's first frame after the scan (8 f scan + 1 f flash).
// Usage: studyScanFlashV2(comp, subjectLayerB, tStart, {frames 10 @30, bars 4, blur 20, bottomUp true, tri, glow 0.1,
//        flashFrames 1, flashGlow 0.4}). subjectLayerB = B's roto'd subject (alpha). Cut to the full B at tStart+frames.
// SFX: shutter/glass click on the scan start (~0.2 s before the cut), soft sub on the flash frame; no whoosh.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _sf2O(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _sf2Set(fx, name, v) {
    try { var p = fx.property(name); if (p) p.setValue(v); else $.writeln("studyScanFlashV2: no param " + name); }
    catch (e) { $.writeln("studyScanFlashV2 " + name + ": " + String(e.message) + " L" + e.line); }
}
function _sf2Matte(layer, matte, type) {               // AE 23+: setTrackMatte; older: trackMatteType
    try { layer.setTrackMatte(matte, type); return; } catch (e) {}
    matte.moveBefore(layer);
    layer.trackMatteType = (type === TrackMatteType.ALPHA_INVERTED) ? TrackMatteType.ALPHA_INVERTED : TrackMatteType.ALPHA;
}

// builds a bars comp: n white bars, each starting startStep*k frames later, lasting len frames (len<=0 -> to end)
function _sf2Bars(name, comp, nFrames, n, startStep, firstLen, len, blurPx, bottomUp) {
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
    _sf2Set(bb, "Blur Radius", blurPx);
    _sf2Set(bb, "Iterations", 3);
    return c;
}


// stock Glow (ADBE Glo2) is NOT in app.effects on this AE 26 install (2026-11-09) -> try it, fall back to S_Glow
function _sf2Glow(fxp, amt) {
    try { var g = fxp.addProperty("ADBE Glo2"); g = fxp.property(fxp.numProperties); _sf2Set(g, "Glow Intensity", amt); return g; } catch (e) {}
    try { var s = fxp.addProperty("S_Glow"); s = fxp.property(fxp.numProperties); _sf2Set(s, "Brightness", amt * 4); _sf2Set(s, "Glow Width", 0.15); return s; } catch (e2) {}
    return null;
}

function studyScanFlashV2(comp, subjectLayer, tStart, opts) {
    var fd = comp.frameDuration;
    var fpsScale = (1 / fd) / 25;
    var nF = _sf2O(opts, "frames", Math.round(8 * fpsScale));
    var n = _sf2O(opts, "bars", 4);
    var step = Math.max(1, Math.round(2 * fpsScale));
    var blur = _sf2O(opts, "blur", 20) * comp.height / 1920;
    var up = _sf2O(opts, "bottomUp", true);
    var tri = _sf2O(opts, "tri", [[1, 1, 1], [0.31, 0.66, 1.0], [0.024, 0.125, 0.29]]);   // 71947: white / #4FA8FF / #06204A

    var cMatte = _sf2Bars("PC_SCANFLASH2_MATTE", comp, nF, n, step, 0, 0, blur, up);
    var cScan = _sf2Bars("PC_SCANFLASH2_SCAN", comp, nF, n, step, 0, step, blur, up);
    var cInv = _sf2Bars("PC_SCANFLASH2_INVERT", comp, nF, n, Math.max(1, Math.round(fpsScale)),
                       Math.round(3 * fpsScale), Math.max(1, Math.round(fpsScale)), blur, up);

    // B revealed through the MATTE bars
    var lMatte = comp.layers.add(cMatte); lMatte.name = "MATTE_scanbars"; lMatte.label = LBL.MATTE;
    lMatte.startTime = tStart;
    _sf2Matte(subjectLayer, lMatte, TrackMatteType.ALPHA);

    // invert/tritone/glow adjustment, limited by INVERT comp
    var adj = comp.layers.addSolid([1, 1, 1], "ADJ_scan_invert", comp.width, comp.height, 1, nF * fd);
    adj.adjustmentLayer = true; adj.label = LBL.ADJ; adj.startTime = tStart;
    var fxp = adj.property("ADBE Effect Parade");
    fxp.addProperty("ADBE Invert");
    var tt = fxp.addProperty("ADBE Tritone");
    tt = fxp.property(2);
    _sf2Set(tt, "Highlights", tri[0]); _sf2Set(tt, "Midtones", tri[1]); _sf2Set(tt, "Shadows", tri[2]);
    _sf2Glow(fxp, _sf2O(opts, "glow", 0.1));
    var lInv = comp.layers.add(cInv); lInv.name = "MATTE_scan_invert"; lInv.label = LBL.MATTE; lInv.startTime = tStart;
    _sf2Matte(adj, lInv, TrackMatteType.ALPHA);

    // white scanning band, only inside the subject, Screen
    var lScan = comp.layers.add(cScan); lScan.name = "FX_scan_band"; lScan.label = LBL.LIGHT; lScan.startTime = tStart;
    lScan.blendingMode = BlendingMode.SCREEN;
    var subDup = subjectLayer.duplicate(); subDup.name = "MATTE_subject_for_scan"; subDup.label = LBL.MATTE;
    _sf2Matte(lScan, subDup, TrackMatteType.ALPHA);
    // 71947: one full-frame inverted blue tritone frame right after the scan (on B's first frame)
    var flash = null, ff = _sf2O(opts, "flashFrames", 1);
    if (ff > 0) {
        flash = comp.layers.addSolid([1, 1, 1], "ADJ_scan_flash_frame", comp.width, comp.height, 1, ff * fd);
        flash.adjustmentLayer = true; flash.label = LBL.ADJ; flash.startTime = tStart + nF * fd;
        var fp = flash.property("ADBE Effect Parade"); fp.addProperty("ADBE Invert"); fp.addProperty("ADBE Tritone");
        var t2 = fp.property(2); _sf2Set(t2, "Highlights", tri[0]); _sf2Set(t2, "Midtones", tri[1]); _sf2Set(t2, "Shadows", tri[2]);
        _sf2Glow(fp, _sf2O(opts, "flashGlow", 0.4));
    }
    return {matte: lMatte, scan: lScan, invert: adj, flash: flash};
}
