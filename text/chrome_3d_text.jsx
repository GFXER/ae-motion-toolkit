// chrome_3d_text.jsx : NaughtyyJuan "3D Text Tutorial" (Element 3D chrome text) rebuilt with STOCK AE 2026.
// Guide: private study notes (not included)
// Element 3D is NOT installed here (only ElementLicense.license in Plug-ins/VideoCopilot), so this uses the
// Advanced 3D renderer: extruded + beveled text layer, metal/reflective material, environment light (HDRI),
// a key light, a 28 mm camera, and his animation (world-scale pop + per-letter spin + spread + X-flip) and
// finish (duplicate + Deep Glow + S-curve).
// NOTE: written 2026-10-20, NOT yet run in AE. Property matchNames for Geometry/Material options and
// LightLayer.lightSource are AE 24+ and wrapped in try/catch; check the log on first run.
//
// Usage:
//   #include "layer_labels.jsx"     // optional
//   #include "chrome_3d_text.jsx"
//   var hdr = app.project.importFile(new ImportOptions(new File("~/Assets/hdri/polyhaven_studio_small_09_2k.hdr")));
//   var r = chrome3dText(comp, "TUTORIAL", {font: "Poppins-ExtraBold", size: 420, t0: 0.3,
//                                         extrude: 90, bevel: 10, hdr: hdr, gold: [1.0, 0.72, 0.25]});
//   // r.text, r.camera, r.envLight, r.keyLight, r.glow (duplicate)

var C3T_LBL = (typeof LBL !== "undefined") ? LBL : {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,STILL:9,PRECOMP:10};

function _c3o(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _c3log(m) { try { $.writeln("[chrome_3d_text] " + m); } catch (e) {} }
function _c3set(group, mn, v) {
    try { group.property(mn).setValue(v); return true; }
    catch (e) { _c3log("set " + mn + ": " + String(e.message) + " L" + e.line); return false; }
}
function _c3ease(prop, outInf, inInf) {
    var k;
    for (k = 1; k <= prop.numKeys; k++) {
        try {
            var n = (prop.value instanceof Array && !prop.isSpatial) ? prop.value.length : 1, a = [], b = [], j;
            for (j = 0; j < n; j++) { a.push(new KeyframeEase(0, inInf)); b.push(new KeyframeEase(0, outInf)); }
            prop.setTemporalEaseAtKey(k, a, b);
        } catch (e) { _c3log("ease " + prop.name + ": " + String(e.message) + " L" + e.line); }
    }
}

function _c3renderer(comp) {
    var k, rs = comp.renderers;
    for (k = 0; k < rs.length; k++) { if (String(rs[k]).toLowerCase().indexOf("advanced") >= 0) { comp.renderer = rs[k]; return rs[k]; } }
    for (k = 0; k < rs.length; k++) { if (String(rs[k]).indexOf("Ernst") >= 0) { comp.renderer = rs[k]; return rs[k]; } }  // Cinema 4D renderer
    _c3log("no Advanced 3D / C4D renderer in: " + rs.join(", "));
    return comp.renderer;
}

function chrome3dText(comp, str, opts) {
    var fps = 1 / comp.frameDuration, fd = comp.frameDuration;
    var t0 = _c3o(opts, "t0", 0.3);
    var cx = comp.width / 2, cy = comp.height / 2;
    _c3renderer(comp);

    // 1) text: bold font (he: "bold so it reads"), 3D, extruded + beveled ---------------------------------
    var T = comp.layers.addText(str);
    T.name = "TXT_3D_" + str; T.label = C3T_LBL.TEXT;
    var td = T.property("ADBE Text Properties").property("ADBE Text Document").value;
    td.font = _c3o(opts, "font", "Poppins-ExtraBold"); td.fontSize = _c3o(opts, "size", 420);
    td.fillColor = _c3o(opts, "fill", [0.82, 0.83, 0.86]); td.applyFill = true; td.applyStroke = false;
    td.justification = ParagraphJustification.CENTER_JUSTIFY;
    T.property("ADBE Text Properties").property("ADBE Text Document").setValue(td);
    T.threeDLayer = true;
    var r = T.sourceRectAtTime(0, false);
    T.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([r.left + r.width / 2, r.top + r.height / 2, 0]);
    T.property("ADBE Transform Group").property("ADBE Position").setValue([cx, cy, 0]);
    try {
        var geo = T.property("ADBE Extrsn Options Group");
        _c3set(geo, "ADBE Bevel Styles", 4);                          // 1 none 2 angular 3 concave 4 convex
        _c3set(geo, "ADBE Bevel Depth", _c3o(opts, "bevel", 10));     // E3D Bevel 2: expand 0.34 / size 0.5 / 3 segments
        _c3set(geo, "ADBE Hole Bevel Depth", 100);                    // % of bevel inside counters
        _c3set(geo, "ADBE Extrsn Depth", _c3o(opts, "extrude", 90));  // he extrudes thick ("fatter")
    } catch (e) { _c3log("geometry options: " + String(e.message) + " L" + e.line); }
    try {
        var mat = T.property("ADBE Material Options Group");           // chrome: metal + sharp reflections
        _c3set(mat, "ADBE Casts Shadows", 1);
        _c3set(mat, "ADBE Specular Coefficient", 85);
        _c3set(mat, "ADBE Shininess Coefficient", 90);
        _c3set(mat, "ADBE Metal Coefficient", 100);
        _c3set(mat, "ADBE Reflection Coefficient", 90);
        _c3set(mat, "ADBE Glossiness Coefficient", 92);
        _c3set(mat, "ADBE Fresnel Coefficient", 40);
    } catch (e2) { _c3log("material options: " + String(e2.message) + " L" + e2.line); }

    // 2) camera 28 mm (as in the tutorial) ----------------------------------------------------------------
    var cam = comp.layers.addCamera("CTRL_CAM_3DTXT", [cx, cy]);
    cam.autoOrient = AutoOrientType.NO_AUTO_ORIENT; cam.label = C3T_LBL.CONTROL;
    var zoom = 28 / 36 * comp.width;
    cam.property("ADBE Camera Options Group").property("ADBE Camera Zoom").setValue(zoom);
    cam.property("ADBE Transform Group").property("ADBE Position").setValue([cx, cy, -zoom]);

    // 3) lighting: environment (HDRI = his "environment" + "360" render preset) + warm key (his gold light) --
    var env = comp.layers.addLight("CTRL_LIGHT_ENV", [cx, cy]);
    env.label = C3T_LBL.CONTROL;
    try { env.lightType = LightType.ENVIRONMENT; } catch (e3) { _c3log("env light needs AE 24+: " + String(e3.message) + " L" + e3.line); }
    if (opts && opts.hdr) {
        var hl = comp.layers.add(opts.hdr); hl.name = "IMG_HDRI"; hl.enabled = false; hl.label = C3T_LBL.STILL;
        try { env.lightSource = hl; } catch (e4) { _c3log("set Environment light Source to IMG_HDRI by hand: " + String(e4.message) + " L" + e4.line); }
    }
    try { env.property("ADBE Light Options Group").property("ADBE Light Intensity").setValue(_c3o(opts, "envIntensity", 110)); } catch (e5) {}
    var key = comp.layers.addLight("CTRL_LIGHT_KEY", [cx, cy]);
    key.label = C3T_LBL.CONTROL; key.lightType = LightType.POINT;
    key.property("ADBE Transform Group").property("ADBE Position").setValue([cx + comp.width * 0.35, cy - comp.height * 0.25, -600]);
    try {
        var lo = key.property("ADBE Light Options Group");
        lo.property("ADBE Light Color").setValue(_c3o(opts, "gold", [1.0, 0.72, 0.25]));   // "yellow-goldish, a bit more orange"
        lo.property("ADBE Light Intensity").setValue(60);
        lo.property("ADBE Light Casts Shadows").setValue(1);
    } catch (e6) { _c3log("key light: " + String(e6.message) + " L" + e6.line); }

    // 4) animation ---------------------------------------------------------------------------------------
    var tr = T.property("ADBE Transform Group");
    // a) world-scale pop 0 -> 100 (he: World Scale key, bring to 0, easy ease + steep graph). 24 f @60
    var sc = tr.property("ADBE Scale"), tPop = t0 + 24 * fd * (fps / 60);
    sc.setValueAtTime(t0, [0, 0, 0]); sc.setValueAtTime(tPop, [100, 100, 100]);
    _c3ease(sc, 75, 99);                                                // Flow (0.00,0.75,0.00,0.99)-like expo-out
    // b) X-rotation flip (he: World Transform X Rotation key + graph, then sped it up)
    var rx = tr.property("ADBE Rotate X"), tFlip = t0 + 36 * fd * (fps / 60);
    rx.setValueAtTime(t0, -180); rx.setValueAtTime(tFlip, 0);
    _c3ease(rx, 50, 100);
    // c) per-letter spin + spread (his Particle Replicator multi-object rotation + X displace): text animator
    try {
        var an = T.property("ADBE Text Properties").property("ADBE Text Animators").addProperty("ADBE Text Animator");
        an.name = "ANIM_LETTERS";
        var ap = an.property("ADBE Text Animator Properties");
        ap.addProperty("ADBE Text Rotation");                              // Z
        ap.addProperty("ADBE Text Rotate Y");
        ap.addProperty("ADBE Text Tracking Amount");
        var rotZ = ap.property("ADBE Text Rotation"), rotY = ap.property("ADBE Text Rotate Y"), trk = ap.property("ADBE Text Tracking Amount");
        var tEnd = t0 + 54 * fd * (fps / 60);
        rotY.setValueAtTime(t0, 90); rotY.setValueAtTime(tEnd, 0);
        rotZ.setValueAtTime(t0, -12); rotZ.setValueAtTime(tEnd, 0);
        trk.setValueAtTime(t0, 60); trk.setValueAtTime(tEnd, 0);          // letters close in ("starts opening" reversed)
        _c3ease(rotY, 50, 100); _c3ease(rotZ, 50, 100); _c3ease(trk, 50, 100);
        // per-character 3D must be on for Rotate Y per letter
        try { T.property("ADBE Text Properties").property("ADBE Text More Options").property("ADBE Text Enable Per-char 3D").setValue(1); } catch (e7) {}
        var sel = an.property("ADBE Text Selectors").addProperty("ADBE Text Selector");
        var adv = sel.property("ADBE Text Range Advanced");
        adv.property("ADBE Text Range Shape").setValue(3);                 // ramp up
        adv.property("ADBE Text Selector Smoothness").setValue(100);
        var off = sel.property("ADBE Text Percent Offset");
        off.setValueAtTime(t0, -100); off.setValueAtTime(tEnd, 100);       // letters settle one after another
        _c3ease(off, 33, 85);
    } catch (e8) { _c3log("letter animator: " + String(e8.message) + " L" + e8.line); }
    T.motionBlur = true; comp.motionBlur = true;

    // 5) finish: duplicate on top + Deep Glow + S-curve (Curves can't be scripted -> B&C contrast stand-in) -
    var G = T.duplicate(); G.name = "FX_GLOW_" + str; G.label = C3T_LBL.LIGHT; G.blendingMode = BlendingMode.SCREEN;
    var fx = G.property("ADBE Effect Parade"), names = ["S_Glow", "ADBE Glo2"], k, used = "";
    for (k = 0; k < names.length; k++) { try { fx.addProperty(names[k]); used = names[k]; break; } catch (e9) {} }
    fx.addProperty("ADBE Brightness & Contrast 2");
    try { fx.property(2).property(2).setValue(25); } catch (e10) {}        // contrast
    G.property("ADBE Transform Group").property("ADBE Opacity").setValue(_c3o(opts, "glowOpacity", 55));
    _c3log("glow: " + used + " (tune radius/exposure by eye: keep it subtle)");

    return {text: T, camera: cam, envLight: env, keyLight: key, glow: G};
}
