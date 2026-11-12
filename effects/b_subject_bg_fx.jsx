// b_subject_bg_fx.jsx : subject stays clean, the BACKGROUND (or a halo copy) gets the effect.
// Refs: Video-53144 "speed-chroma background", Video-77576 "trippy background", Video-2953 "aura effect",
//       Video-9788 "mixed effect". Guide: private study notes (not included)
//
// All four share one stack: VID_BG (effect) < subject cut-out (Vision/Roto matte) on top.
//   speedChroma(): BG dup -> Directional Blur (dir 90, length 60-120) + S_BlurChroma (fallback PC/ stock RGB split),
//                  dup set to Linear Light ~70 % over the sharp BG; subject untouched on top.
//   trippyHalo():  subject dup BEHIND subject -> Echo (-1 f, 8 echoes, decay 0.8, Maximum) + Turbulent Displace
//                  (evolving) + Colorama hue cycle (Screen) => rainbow smoke flames rising off the body; BG sat -60.
//   auraGlow():    roto'd part (hands) dup in Screen -> S_GlowAura (green) ; fallback Glo2 x2 + Turbulent Displace.
//   mixedFill():   images/clips stepped every 2 f INSIDE the subject matte, Color Dodge over the subject.
//
// Usage: #include "b_subject_bg_fx.jsx" then e.g. speedChroma(comp, bgLayer, {len:90});
// Sapphire params are not probed: check fx.property(i).name first. Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }
function _sbo(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _sbSet(fx, name, v) { try { var p = fx.property(name); if (p) p.setValue(v); else $.writeln("subjBG: no param " + name); } catch (e) { $.writeln("subjBG " + name + ": " + String(e.message) + " L" + e.line); } }
function _sbAdd(layer, mn, fallback) {
    var fxp = layer.property("ADBE Effect Parade"), f = null;
    try { f = fxp.addProperty(mn); } catch (e) { f = null; }
    if (!f && fallback) { try { f = fxp.addProperty(fallback); } catch (e2) { f = null; } }
    return f ? fxp.property(fxp.numProperties) : null;   // fresh reference
}

function speedChroma(comp, bg, opts) {
    var d = bg.duplicate(); d.name = "VID_BG_SPEEDCHROMA"; d.label = LBL.VIDEO; d.moveBefore(bg);
    var db = _sbAdd(d, "ADBE Motion Blur");               // Directional Blur
    _sbSet(db, "Direction", _sbo(opts, "angle", 90)); _sbSet(db, "Blur Length", _sbo(opts, "len", 90));
    var ch = _sbAdd(d, "S_BlurChroma", "PC_ChromaticAberration");
    if (ch && ch.matchName === "PC_ChromaticAberration") { try { ch.property(1).setValue(_sbo(opts, "ca", 25)); } catch (e) {} }
    _sbAdd(d, "ADBE Vibrance"); _sbSet(d.property("ADBE Effect Parade").property("ADBE Vibrance"), "Vibrance", 40);
    d.blendingMode = BlendingMode.LINEAR_LIGHT;
    d.property("ADBE Transform Group").property("ADBE Opacity").setValue(_sbo(opts, "op", 70));
    // ref: the streak breathes with the car, so key Blur Length 40 -> 120 -> 70 over the shot if wanted
    return d;
}

function trippyHalo(comp, subj, bg, opts) {
    if (bg) { var hs = _sbAdd(bg, "ADBE HUE SATURATION"); try { hs.property(4).setValue(-60); } catch (e) {} }  // master sat (index may differ; probe)
    var h = subj.duplicate(); h.name = "FX_TRIPPY_HALO"; h.label = LBL.LIGHT; h.moveAfter(subj);
    h.blendingMode = BlendingMode.SCREEN;
    var ec = _sbAdd(h, "ADBE Echo");
    _sbSet(ec, "Echo Time (seconds)", -comp.frameDuration * _sbo(opts, "lag", 2));
    _sbSet(ec, "Number Of Echoes", _sbo(opts, "echoes", 8));
    _sbSet(ec, "Starting Intensity", 1); _sbSet(ec, "Decay", 0.8);
    _sbSet(ec, "Echo Operator", 3);                     // Maximum
    var td = _sbAdd(h, "ADBE Turbulent Displace");
    _sbSet(td, "Amount", _sbo(opts, "amount", 70)); _sbSet(td, "Size", 90);
    try { td.property("Evolution").expression = "time*300"; } catch (e) {}
    var ca = _sbAdd(h, "APC Colorama");
    try { ca.property(1).property(1).expression = "time*120"; } catch (e) { $.writeln("colorama phase: probe index"); }  // Input Phase -> hue cycle
    var gl = _sbAdd(h, "S_Glow", "ADBE Glo2");
    // upward drift like flames: Transform effect offset rising slowly
    var tr = _sbAdd(h, "ADBE Geometry2");
    try { tr.property("ADBE Geometry2-0002").expression = "value + [0, -40*Math.sin(time*2)-30]"; } catch (e) {}
    return h;
}

function auraGlow(comp, part, opts) {
    var a = part.duplicate(); a.name = "FX_AURA"; a.label = LBL.LIGHT; a.moveBefore(part);
    a.blendingMode = BlendingMode.SCREEN;
    var col = _sbo(opts, "color", [0.55, 1, 0.2]);
    var f = _sbAdd(a, "S_GlowAura", null);
    if (!f) {                                             // stock fallback: fill -> displace -> double glow
        var fl = _sbAdd(a, "ADBE Fill"); _sbSet(fl, "Color", col);
        var td = _sbAdd(a, "ADBE Turbulent Displace"); _sbSet(td, "Amount", 40); _sbSet(td, "Size", 60);
        try { td.property("Evolution").expression = "time*360"; } catch (e) {}
        var bl = _sbAdd(a, "ADBE Gaussian Blur 2"); _sbSet(bl, "Blurriness", 25);
        var g1 = _sbAdd(a, "ADBE Glo2"); _sbSet(g1, "Glow Radius", 60); _sbSet(g1, "Glow Intensity", 1.5);
    }
    return a;
}

// items: array of FootageItems; stepFrames 2 (ref: images at 2-frame duration, nested, Fill Frame)
function mixedFill(comp, subjMatte, items, tIn, tOut, opts) {
    var step = _sbo(opts, "stepFrames", 2) * comp.frameDuration, out = [], t = tIn, k = 0;
    while (t < tOut && items.length) {
        var L = comp.layers.add(items[k % items.length]); L.startTime = t; L.inPoint = t; L.outPoint = Math.min(t + step, tOut);
        L.name = "IMG_MIX_" + k; L.label = LBL.STILL; L.blendingMode = BlendingMode.COLOR_DODGE;
        var m = subjMatte.duplicate(); m.name = "MATTE_MIX_" + k; m.label = LBL.MATTE;
        m.inPoint = L.inPoint; m.outPoint = L.outPoint; m.moveBefore(L);
        try { L.setTrackMatte(m, TrackMatteType.ALPHA); } catch (e) { L.trackMatteType = TrackMatteType.ALPHA; }
        out.push(L); t += step; k++;
    }
    return out;   // tip: precomp these into PC_MIXED (one matte) for a lighter project
}
