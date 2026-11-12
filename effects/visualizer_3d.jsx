// visualizer_3d.jsx : Kam "3D visualizer" scene (GLB model + custom LCD screen comp + env light + DOF), ES3.
// Guide: private study notes (not included)
// Needs AE 24+ (GLB import, environment light). Import the .glb yourself (importFile) and pass its layer.
//
// Usage:
//   #include "visualizer_3d.jsx"
//   var r = visualizer3d(comp, glbLayer, screenComp, {tReveal: 0, revealSec: 2.5, focus: 860, blur: 135,
//                        ampLayer: "CTRL_AUDIO"});   // ampLayer optional: null with a Slider named "AMP"
// Returns {cam, light, screen}. Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _v3o(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }

function _v3lcd(screenComp) {           // grid overlay INSIDE the screen comp (Grid replaces pixels otherwise)
    var g = screenComp.layers.addSolid([0, 0, 0], "SHP_LCD_GRID", screenComp.width, screenComp.height, 1, screenComp.duration);
    g.label = LBL.SHAPE; g.blendingMode = BlendingMode.ADD;
    g.property("ADBE Transform Group").property("ADBE Opacity").setValue(50);
    var fx = g.property("ADBE Effect Parade");
    fx.addProperty("ADBE Grid");
    var gr = fx.property(1);
    try { gr.property(2).setValue(2); }                                   // Size From: Width Slider
    catch (e) { $.writeln("v3 grid size-from: " + String(e.message) + " L" + e.line); }
    try { gr.property(4).setValue(6); gr.property(6).setValue(1.5); gr.property(8).setValue([0.5, 0.5, 0.5]); } // width, border, grey
    catch (e2) { $.writeln("v3 grid params: " + String(e2.message) + " L" + e2.line); }
}

function visualizer3d(comp, modelLayer, screenComp, opts) {
    var W = comp.width, H = comp.height, fd = comp.frameDuration;
    var c = [W / 2, H / 2];
    if (modelLayer) { modelLayer.threeDLayer = true; modelLayer.label = LBL.STILL; if (modelLayer.name.indexOf("IMG_") !== 0) modelLayer.name = "IMG_" + modelLayer.name; }

    // camera: 2-node, 28 mm (36 mm film) + DOF
    var cam = comp.layers.addCamera("CTRL_CAM_V3D", c);
    cam.label = LBL.CONTROL;
    var co = cam.property("ADBE Camera Options Group");
    co.property("ADBE Camera Zoom").setValue(W * 28 / 36);
    co.property("ADBE Camera Depth of Field").setValue(1);
    co.property("ADBE Camera Focus Distance").setValue(_v3o(opts, "focus", 860));
    co.property("ADBE Camera Aperture").setValue(_v3o(opts, "aperture", 40));
    co.property("ADBE Camera Blur Level").setValue(_v3o(opts, "blur", 135));

    // environment light with a Y-rotation reveal (dark angle -> hero angle)
    var light = comp.layers.addLight("CTRL_LIGHT_ENV", c);
    light.label = LBL.CONTROL;
    try { light.lightType = LightType.ENVIRONMENT; }
    catch (e) { $.writeln("v3 env light needs AE 24+: " + String(e.message) + " L" + e.line); }
    var t0 = _v3o(opts, "tReveal", 0), t1 = t0 + _v3o(opts, "revealSec", 2.5);
    try {
        var ry = light.property("ADBE Transform Group").property("ADBE Rotate Y");
        ry.setValueAtTime(t0, _v3o(opts, "darkY", 140)); ry.setValueAtTime(t1, _v3o(opts, "heroY", 0));
        ry.setTemporalEaseAtKey(1, [new KeyframeEase(0, 33)], [new KeyframeEase(0, 60)]);
        ry.setTemporalEaseAtKey(2, [new KeyframeEase(0, 90)], [new KeyframeEase(0, 33)]);
    } catch (e3) { $.writeln("v3 light rot: " + String(e3.message) + " L" + e3.line); }

    // screen comp as a 3D layer aligned to the model (orientation axis swap: last value -> middle)
    _v3lcd(screenComp);
    var scr = comp.layers.add(screenComp);
    scr.threeDLayer = true; scr.label = LBL.PRECOMP; scr.name = "PC_SCREEN";
    var tg = scr.property("ADBE Transform Group");
    if (modelLayer) {
        var mt = modelLayer.property("ADBE Transform Group");
        var mp = mt.property("ADBE Position").value, mo = mt.property("ADBE Orientation").value;
        tg.property("ADBE Position").setValue([mp[0], mp[1], mp[2] - _v3o(opts, "zPop", 6)]);   // nudge in front of the glass
        tg.property("ADBE Orientation").setValue(_v3o(opts, "orientFix", true) ? [mo[0], mo[2], mo[1]] : mo);
    }
    var ss = _v3o(opts, "screenScale", 20);
    tg.property("ADBE Scale").setValue([ss, ss, ss]);

    var fx = scr.property("ADBE Effect Parade");
    fx.addProperty("ADBE Exposure2");
    var sg = true;
    try { fx.addProperty("S_Glow"); } catch (e4) { sg = false; fx.addProperty("ADBE Glo2"); }
    var hasScan = true;
    try { fx.addProperty("S_ScanLines"); } catch (e5) { hasScan = false; $.writeln("v3: no S_ScanLines, Grid only: " + String(e5.message) + " L" + e5.line); }
    var ex = fx.property(1).property(3);                       // fetch after adds
    ex.setValue(-0.35);
    if (!sg) { fx.property(2).property(2).setValue(80); fx.property(2).property(3).setValue(60); fx.property(2).property(4).setValue(0.4); }
    if (hasScan) { try { fx.property(3).property("Mocha Opacity").setValue(0.3); } catch (e6) { $.writeln("v3 scan: " + String(e6.message) + " L" + e6.line); } }

    // optional audio drive (our add-on): CTRL null with Slider "AMP" (0..30 from Convert Audio to Keyframes or a script)
    var al = _v3o(opts, "ampLayer", null);
    if (al) {
        var amp = 'thisComp.layer("' + al + '").effect("AMP")("Slider")';
        ex.expression = "linear(" + amp + ", 0, 30, -0.35, 0.25)";
        tg.property("ADBE Scale").expression = "s = value[0]*linear(" + amp + ", 0, 30, 1, 1.03); [s, s, s]";
    }
    comp.motionBlur = true;
    return {cam: cam, light: light, screen: scr};
}
