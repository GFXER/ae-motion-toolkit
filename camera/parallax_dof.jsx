// parallax_dof.jsx : 2.5D parallax camera rig + depth of field + rack focus (ES3). Not yet run in AE.
// Guide: private study notes (not included) (Blizzard "Warbringers: Azshara" study)
//
// Usage:
//   #include "layer_labels.jsx"            // optional (LBL fallback below)
//   #include "parallax_dof.jsx"
//   var rig = parallaxRig(comp, {
//       zoom: 3600,                 // camera zoom (px); D (distance to z=0) defaults to zoom -> z=0 reads 100 %
//       dist: 3600,                 // camera distance to the hero plane z=0
//       layers: [ {layer: L1, z: -900}, {layer: L2, z: 0}, {layer: L3, z: 1800} ],  // depth spread + scale comp
//       dof: true, focusTarget: subjLayer, aperture: 40, blurLevel: 100, focusOffset: 0,
//       iris: {roundness: 100, highlightGain: 30, highlightThreshold: 240},        // optional, best effort
//       move: {t0: 0, t1: 10, from: [0,0,0], to: [-160,0,140], easeOut: 40, easeIn: 40}  // rig null offset (truck/push)
//   });
//   rackFocus(rig, cardLayer, 4.0, 4.6);           // rack subject -> card in 0.6 s (ease out 20 / in 85)
//   rackFocus(rig, subjLayer, 9.0, 9.7);           // and back (targets are reused, not duplicated)
//   var px = dofBlurPx(40, 100, 3600, 2000, 2320); // CoC estimate for baking fake DOF (Gaussian) in builders
// Returns rig = {comp, cam, ctrl, dist, zoom}. Animate rig.ctrl (truck/push), never the camera itself.
// Camera looks down +z from z=-dist; layers with z>0 are behind the hero plane.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _pdO(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _pdLog(s) { try { $.writeln("parallax_dof: " + s); } catch (e) {} }
function _pdTr(l) { return l.property("ADBE Transform Group"); }

// approx. AE thin-lens circle of confusion in px (aperture px, blurLevel %, zoom px, focus dist F, layer dist d)
function dofBlurPx(aperture, blurLevel, zoom, F, d) {
    if (d <= 0 || F <= 0) return 0;
    return aperture * (blurLevel / 100) * Math.abs(d - F) / d * zoom / F;
}

// push layers to depth z keeping their designed screen size/position at camera distance D (comp-centred camera)
function spreadDepth(comp, items, D) {
    var cx = comp.width / 2, cy = comp.height / 2, n, it, L, tr, p, s, k;
    for (n = 0; n < items.length; n++) {
        it = items[n]; L = it.layer;
        try {
            L.threeDLayer = true;
            tr = _pdTr(L);
            k = (D + it.z) / D;
            if (k <= 0.05) { _pdLog(L.name + " z too close to camera, skipped"); continue; }
            p = tr.property("ADBE Position").value;
            s = tr.property("ADBE Scale").value;
            if (it.compensate !== false) {
                tr.property("ADBE Position").setValue([cx + (p[0] - cx) * k, cy + (p[1] - cy) * k, it.z]);
                tr.property("ADBE Scale").setValue([s[0] * k, s[1] * k, s[2] * k]);
            } else {
                tr.property("ADBE Position").setValue([p[0], p[1], it.z]);
            }
        } catch (e) { _pdLog("spread " + L.name + ": " + String(e.message) + " L" + e.line); }
    }
}

function _pdEase(prop, outInf, inInf) {
    var n = prop.numKeys, j, dims, a, b, q;
    for (j = 1; j <= n; j++) {
        try {
            prop.setInterpolationTypeAtKey(j, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
            dims = (prop.propertyValueType === PropertyValueType.TwoD_SPATIAL || prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL) ? 1 :
                   (prop.value instanceof Array ? prop.value.length : 1);
            a = []; b = [];
            for (q = 0; q < dims; q++) { a.push(new KeyframeEase(0, inInf)); b.push(new KeyframeEase(0, outInf)); }
            prop.setTemporalEaseAtKey(j, a, b);
        } catch (e) { _pdLog("ease: " + String(e.message) + " L" + e.line); }
    }
}

// focus expression: distance along the camera axis to target #round(slider) with linear blend between targets
function _pdFocusExpr(rig) {
    var s = "var r=thisComp.layer(" + rig.ctrlNameLit + ");\n";
    s += "var T=[" + rig.targets.join(",") + "];\n";
    s += "function dd(n){ var t=thisComp.layer(T[n]); var v=t.toWorld(t.anchorPoint)-toWorld([0,0,0]); return dot(v,normalize(toWorldVec([0,0,1]))); }\n";
    s += "var f=clamp(r.effect(\"Focus Target\")(\"Slider\").value,0,T.length-1); var a=Math.floor(f), b=Math.min(a+1,T.length-1);\n";
    s += "var d=(a==b)?dd(a):linear(f-a,0,1,dd(a),dd(b));\n";
    s += "Math.max(1, d + r.effect(\"Focus Offset\")(\"Slider\").value);";
    return s;
}

function _pdLit(str) { return "\"" + String(str).replace(/\\/g, "\\\\").replace(/"/g, "\\\"") + "\""; }

function _pdTargetIndex(rig, layer) {
    var lit = _pdLit(layer.name), n;
    for (n = 0; n < rig.targets.length; n++) if (rig.targets[n] === lit) return n;
    rig.targets.push(lit);
    return rig.targets.length - 1;
}

function _pdApplyFocus(rig) {
    try { rig.cam.property("ADBE Camera Options Group").property("ADBE Camera Focus Distance").expression = _pdFocusExpr(rig); }
    catch (e) { _pdLog("focus expr: " + String(e.message) + " L" + e.line); }
}

function parallaxRig(comp, opts) {
    var W = comp.width, H = comp.height;
    var zoom = _pdO(opts, "zoom", Math.round(W * 1.5));
    var D = _pdO(opts, "dist", zoom);
    var nm = _pdO(opts, "name", "CTRL_CAM_RIG");
    var rig = {comp: comp, zoom: zoom, dist: D, targets: [], ctrlNameLit: _pdLit(nm)};

    // control null (3D) carries the move + DOF sliders
    var ctrl = comp.layers.addNull(comp.duration);
    ctrl.name = nm; ctrl.threeDLayer = true; ctrl.label = LBL.CONTROL;
    _pdTr(ctrl).property("ADBE Position").setValue([W / 2, H / 2, 0]);
    var fxs = ctrl.property("ADBE Effect Parade");
    var e1 = fxs.addProperty("ADBE Slider Control"); e1.name = "Focus Target";
    var e2 = fxs.addProperty("ADBE Slider Control"); e2.name = "Focus Offset";
    rig.ctrl = ctrl;

    // one-node camera parented to the null (parent BEFORE keying the null)
    var cam = comp.layers.addCamera(_pdO(opts, "camName", "CTRL_CAM"), [W / 2, H / 2]);
    cam.autoOrient = AutoOrientType.NO_AUTO_ORIENT;
    cam.label = LBL.CONTROL;
    _pdTr(cam).property("ADBE Position").setValue([W / 2, H / 2, -D]);
    cam.parent = ctrl;
    _pdTr(cam).property("ADBE Position").setValue([0, 0, -D]);     // local to the null at its rest pose
    var co = cam.property("ADBE Camera Options Group");
    co.property("ADBE Camera Zoom").setValue(zoom);
    rig.cam = cam;

    var dof = _pdO(opts, "dof", true);
    try {
        co.property("ADBE Camera Depth of Field").setValue(dof ? 1 : 0);
        co.property("ADBE Camera Focus Distance").setValue(D);
        co.property("ADBE Camera Aperture").setValue(_pdO(opts, "aperture", 40));
        co.property("ADBE Camera Blur Level").setValue(_pdO(opts, "blurLevel", 100));
    } catch (e) { _pdLog("dof: " + String(e.message) + " L" + e.line); }

    var iris = _pdO(opts, "iris", null);
    if (iris) {
        var im = [["ADBE Iris Roundness", "roundness"], ["ADBE Iris Rotation", "rotation"], ["ADBE Iris Aspect Ratio", "aspect"],
                  ["ADBE Iris Highlight Gain", "highlightGain"], ["ADBE Iris Highlight Threshold", "highlightThreshold"],
                  ["ADBE Iris Shape", "shape"]];
        var q;
        for (q = 0; q < im.length; q++) {
            if (iris[im[q][1]] === undefined) continue;
            try { co.property(im[q][0]).setValue(iris[im[q][1]]); }
            catch (e3) { _pdLog("iris " + im[q][0] + ": " + String(e3.message) + " L" + e3.line); }
        }
    }

    e2.property(1).setValue(_pdO(opts, "focusOffset", 0));
    var ft = _pdO(opts, "focusTarget", null);
    if (dof && ft) { _pdTargetIndex(rig, ft); e1.property(1).setValue(0); _pdApplyFocus(rig); }

    var layers = _pdO(opts, "layers", null);
    if (layers) spreadDepth(comp, layers, D);

    // truck/push on the null: offsets from the comp centre, eased (influence %)
    var mv = _pdO(opts, "move", null);
    if (mv) {
        var pp = _pdTr(ctrl).property("ADBE Position");
        var f0 = mv.from || [0, 0, 0], f1 = mv.to || [0, 0, 0];
        pp.setValueAtTime(mv.t0, [W / 2 + f0[0], H / 2 + f0[1], f0[2]]);
        pp.setValueAtTime(mv.t1, [W / 2 + f1[0], H / 2 + f1[1], f1[2]]);
        _pdEase(pp, _pdO(mv, "easeOut", 40), _pdO(mv, "easeIn", 40));
    }
    return rig;
}

// rack focus to `target` between t0 and t1 (fast-out / slow-settle). opts: {easeOut:20, easeIn:85, apertureBoost:0.3}
function rackFocus(rig, target, t0, t1, opts) {
    var sl = rig.ctrl.property("ADBE Effect Parade").property("Focus Target").property(1);
    var fromIdx = sl.valueAtTime(t0, false);
    var toIdx = _pdTargetIndex(rig, target);
    _pdApplyFocus(rig);                       // rebuild expression with the (possibly) new target list
    sl.setValueAtTime(t0, fromIdx);
    sl.setValueAtTime(t1, toIdx);
    var k0 = sl.nearestKeyIndex(t0), k1 = sl.nearestKeyIndex(t1);
    try {
        sl.setInterpolationTypeAtKey(k0, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
        sl.setInterpolationTypeAtKey(k1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
        sl.setTemporalEaseAtKey(k0, [new KeyframeEase(0, 33)], [new KeyframeEase(0, _pdO(opts, "easeOut", 20))]);
        sl.setTemporalEaseAtKey(k1, [new KeyframeEase(0, _pdO(opts, "easeIn", 85))], [new KeyframeEase(0, 33)]);
    } catch (e) { _pdLog("rack ease: " + String(e.message) + " L" + e.line); }

    var boost = _pdO(opts, "apertureBoost", 0);
    if (boost > 0) {                          // lens "breathing": aperture swells during the rack
        try {
            var ap = rig.cam.property("ADBE Camera Options Group").property("ADBE Camera Aperture");
            var a0 = ap.valueAtTime(t0, false);
            ap.setValueAtTime(t0, a0);
            ap.setValueAtTime(t0 + (t1 - t0) * 0.45, a0 * (1 + boost));
            ap.setValueAtTime(t1 + (t1 - t0) * 0.5, a0);
        } catch (e2) { _pdLog("rack aperture: " + String(e2.message) + " L" + e2.line); }
    }
    return toIdx;
}

// defocus transition on an ADJ layer (Camera Lens Blur): 0 -> peak in nOut frames, cut at tCut, peak -> 0 in 2*nOut (1:2 rule)
function defocusTransition(comp, tCut, nOut, peak) {
    var fd = comp.frameDuration;
    var adj = comp.layers.addSolid([1, 1, 1], "ADJ_DEFOCUS_TR", comp.width, comp.height, 1, comp.duration);
    adj.adjustmentLayer = true; adj.label = LBL.ADJ;
    adj.inPoint = Math.max(0, tCut - nOut * fd - fd); adj.outPoint = tCut + 2 * nOut * fd + fd;
    var lb = adj.property("ADBE Effect Parade").addProperty("ADBE Camera Lens Blur");
    var r = adj.property("ADBE Effect Parade").property(1).property(1);   // fetch after adding (refs invalidate)
    r.setValueAtTime(tCut - nOut * fd, 0);
    r.setValueAtTime(tCut, peak || 45);
    r.setValueAtTime(tCut + 2 * nOut * fd, 0);
    _pdEase(r, 33, 80);
    return adj;
}
