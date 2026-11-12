// b_echo_trail.jsx : "trail effect" (ref Video-88571, AE tutorial) + "wave threshold" cyan highlight glow.
// Guide: private study notes (not included) (88571)
//
// What the ref does (30 fps): roto the subject (Roto Brush, feather ~10, contrast 80 %, shift edge -20 %),
// freeze, precomp. Duplicate the roto layer 6-7 times, each copy slid later on the timeline by ~2-3 f,
// anchor at the FEET, scale 100 -> 85 % and opacity 100 -> 10..30 % across the stack (furthest copy smallest
// and faintest), so the ghosts trail behind + shrink toward the floor. "Wave Threshold" preset = cyan glow
// only on the brightest parts (hands/face): threshold-ish Levels -> Tint navy->cyan -> Glow.
//
// Usage:
//   #include "b_echo_trail.jsx"
//   var ghosts = echoTrail(comp, rotoPrecompLayer, {copies:7, lagFrames:3, feet:[1080,3500]});
//   opts: copies (7), lagFrames (3), scaleEnd (85), opStart (70), opEnd (12), feet [x,y] comp px (anchor),
//         cyan [r,g,b] 0-1 ([0.25,0.85,1]), thresh (0.72 = Levels input black), glow (true), blend ("SCREEN"|"NORMAL")
// Labels: ghosts = Purple (precomp dup). Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _eto(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _etSet(fx, name, v) { try { var p = fx.property(name); if (p) p.setValue(v); else $.writeln("echoTrail: no param " + name); } catch (e) { $.writeln("echoTrail " + name + ": " + String(e.message) + " L" + e.line); } }

// cyan "wave threshold" look on one layer (add all effects first, then set params)
function waveThreshold(layer, opts) {
    var fxp = layer.property("ADBE Effect Parade");
    var lv = fxp.addProperty("ADBE Easy Levels2");
    var tn = fxp.addProperty("ADBE Tint");
    var gl = null;
    if (_eto(opts, "glow", true)) {
        try { gl = fxp.addProperty("S_Glow"); } catch (e) { gl = null; }
        if (!gl) gl = fxp.addProperty("ADBE Glo2");
    }
    lv = fxp.property(fxp.numProperties - (gl ? 2 : 1));   // re-fetch after adding (refs invalidate)
    tn = fxp.property(fxp.numProperties - (gl ? 1 : 0));
    _etSet(lv, "Input Black", _eto(opts, "thresh", 0.72));
    _etSet(lv, "Gamma", 0.8);
    var c = _eto(opts, "cyan", [0.25, 0.85, 1]);
    _etSet(tn, "Map Black To", [0.02, 0.05, 0.12]);
    _etSet(tn, "Map White To", c);
    if (gl && gl.matchName === "ADBE Glo2") {
        _etSet(gl, "Glow Threshold", 45); _etSet(gl, "Glow Radius", 40); _etSet(gl, "Glow Intensity", 1.4);
    }
    // Sapphire S_Glow params are not probed yet: check names with property(i).name before keying.
    return layer;
}

function echoTrail(comp, src, opts) {
    var n = _eto(opts, "copies", 7), lag = _eto(opts, "lagFrames", 3) * comp.frameDuration;
    var sEnd = _eto(opts, "scaleEnd", 85), o0 = _eto(opts, "opStart", 70), o1 = _eto(opts, "opEnd", 12);
    var feet = _eto(opts, "feet", null);
    var out = [];
    // anchor at feet so shrink goes toward the floor (keep visual position)
    function anchorFeet(L) {
        if (!feet) return;
        var tr = L.property("ADBE Transform Group");
        var pos = tr.property("ADBE Position").value, anc = tr.property("ADBE Anchor Point").value;
        var sc = tr.property("ADBE Scale").value[0] / 100;
        var dx = (feet[0] - pos[0]) / sc, dy = (feet[1] - pos[1]) / sc;
        tr.property("ADBE Anchor Point").setValue([anc[0] + dx, anc[1] + dy]);
        tr.property("ADBE Position").setValue([feet[0], feet[1]]);
    }
    anchorFeet(src);
    for (var k = n; k >= 1; k--) {               // furthest ghost first (lowest)
        var d = src.duplicate();
        d.name = "PC_GHOST_" + k;
        d.label = LBL.PRECOMP;
        d.moveAfter(src);
        var keepOut = d.outPoint;
        d.startTime = d.startTime + k * lag;      // delayed copy = trails behind the live pose
        try { d.outPoint = keepOut; } catch (e) {}
        var f = k / n;
        var s = 100 - (100 - sEnd) * f;
        var base = src.property("ADBE Transform Group").property("ADBE Scale").value;
        d.property("ADBE Transform Group").property("ADBE Scale").setValue([base[0] * s / 100, base[1] * s / 100]);
        d.property("ADBE Transform Group").property("ADBE Opacity").setValue(o0 + (o1 - o0) * f);
        if (_eto(opts, "blend", "SCREEN") === "SCREEN") d.blendingMode = BlendingMode.SCREEN;
        waveThreshold(d, opts);
        out.push(d);
    }
    // hero keeps its colour; light cyan pass on the hero hands only
    var hi = src.duplicate(); hi.name = "FX_WAVE_THRESH"; hi.label = LBL.LIGHT; hi.blendingMode = BlendingMode.SCREEN;
    hi.moveBefore(src); waveThreshold(hi, opts);
    out.push(hi);
    return out;
}
