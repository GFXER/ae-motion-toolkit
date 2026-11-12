// a_silhouette_flicker.jsx : "inverted flicker" + "difference burn overlay" (ref Video-13117, talking-head
// favourite effects) and the "flash box" b-roll split. ES3 helper, stock AE only. Not yet run in AE.
// Guide: private study notes (not included) (13117).
//
// 1) silhouetteFlicker(): measured at 24 fps (10.73-10.90 s): the subject's matte is filled solid for
//    single frames while the background and captions stay untouched:  W . B W . | cut
//    (W = white silhouette, . = normal frame, B = black silhouette). 5 f total, then hard cut to the next
//    shot. Built from the Vision/Roto matte we already make (tools/matte, mattes_v2).
//    Pattern string is configurable: "W.BW." (ref), "WBWB" (harder), "W.W" (soft).
//    SFX: short static tick per filled frame (premium/glitch_digital/mixkit__short-static-noise-1456.wav
//    trimmed to 40 ms, -24 dB) + one sub on the cut. No chimes.
// 2) differenceBurn(): ref 25.21-25.38 s: a film-burn / rainbow light-leak clip on top in DIFFERENCE for
//    4-5 f -> whole frame turns thermal/false-colour (orange body, violet bg), then the leak keeps going
//    in Screen at ~60 % for 6-8 f as a rainbow streak and fades. Overlays: <asset-library> or
//    Envato light-leak packs (private study notes). Fallback without an overlay clip: an adjustment
//    layer with Colorama ("ADBE Colorama", output cycle = thermal-like ramp, set by hand) for 4 f.
//
// Usage:
//   #include "a_silhouette_flicker.jsx"
//   silhouetteFlicker(comp, plateLayer, matteLayer, tStart, {pattern:"W.BW."});
//   differenceBurn(comp, overlayFootageItem, tStart, {diffFrames:5, tailFrames:8});

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _sfo(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }

function _sfTrim(l, a, b) { l.inPoint = a; l.outPoint = b; }      // inPoint first (AE 26.5 quirk)

// one solid per filled frame, alpha from a copy of the matte (Luma matte), placed right above the plate
function silhouetteFlicker(comp, plate, matte, tStart, opts) {
    var fd = comp.frameDuration;
    var pat = _sfo(opts, "pattern", "W.BW.");
    var hold = _sfo(opts, "hold", 1);                              // frames per symbol (60 fps: use 2)
    var made = [];
    for (var s = 0; s < pat.length; s++) {
        var c = pat.charAt(s);
        if (c !== "W" && c !== "B") continue;
        var a = tStart + s * hold * fd, b = a + hold * fd;
        var col = (c === "W") ? [1, 1, 1] : [0, 0, 0];
        var sol = comp.layers.addSolid(col, "SHP_SIL_" + c + s, comp.width, comp.height, comp.pixelAspect, comp.duration);
        sol.label = LBL.SHAPE;
        var mt = matte.duplicate();
        mt.name = "MATTE_SIL_" + s;
        mt.label = LBL.MATTE;
        mt.moveBefore(plate);
        sol.moveBefore(mt);               // solid directly above its matte copy
        sol.trackMatteType = TrackMatteType.LUMA;   // AE <23: matte = layer above; AE 23+: setTrackMatte
        try { sol.setTrackMatte(mt, TrackMatteType.LUMA); } catch (e) { $.writeln("silFlicker: legacy track matte " + String(e.message)); }
        _sfTrim(sol, a, b); _sfTrim(mt, a, b);
        made.push(sol);
    }
    return made;
}

function differenceBurn(comp, overlayItem, tStart, opts) {
    var fd = comp.frameDuration;
    var nD = _sfo(opts, "diffFrames", 5), nT = _sfo(opts, "tailFrames", 8);
    var l1 = comp.layers.add(overlayItem);
    l1.name = "FX_DIFFBURN"; l1.label = LBL.LIGHT;
    l1.blendingMode = BlendingMode.DIFFERENCE;
    l1.startTime = tStart - _sfo(opts, "srcOffset", 0);
    _sfTrim(l1, tStart, tStart + nD * fd);
    var l2 = comp.layers.add(overlayItem);
    l2.name = "FX_DIFFBURN_TAIL"; l2.label = LBL.LIGHT;
    l2.blendingMode = BlendingMode.SCREEN;
    l2.startTime = l1.startTime;
    _sfTrim(l2, tStart + nD * fd, tStart + (nD + nT) * fd);
    var op = l2.property("ADBE Transform Group").property("ADBE Opacity");
    op.setValueAtTime(tStart + nD * fd, 60);
    op.setValueAtTime(tStart + (nD + nT) * fd, 0);
    return [l1, l2];
}
