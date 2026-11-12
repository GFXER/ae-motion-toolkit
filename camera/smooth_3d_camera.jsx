// smooth_3d_camera.jsx : NaughtyyJuan "Smooth 3D Camera Movements" as an ES3 helper.
// Guide: private study notes (not included)
// 3D sibling of null_stack_camera.jsx (2D tour, QmXThvJSwCY) and null_transition.jsx (atkaex).
//
// Idea: 3D words spread in X/Y/Z, each slightly rotated. A one-node camera (28 mm) is parented to a 3D null.
// Every move to the next word gets its OWN new 3D null; the new null becomes the PARENT of the previous null,
// and its keys START while the previous move is still settling (~60-70 % through it). So the camera never
// stops ("no stop in between" = his definition of smooth). Ease = Flow (0.50, 0.00, 0.00, 1.00)
// ~ out-influence 50 / in-influence 100, speed 0, on the VALUE graph (Position: Separate Dimensions).
// Motion blur on the real layers ("do not forget motion blur").
//
// Usage:
//   #include "layer_labels.jsx"     // optional
//   #include "smooth_3d_camera.jsx"
//   var words = [tLike, tAnd, tSubscribe, tPls];           // 3D layers already placed in space
//   var rig = smooth3dCamera(comp, words, {t0: 0.2, dur: 0.9, overlapFrac: 0.35, mm: 28, dof: false});
//   // rig.camera, rig.nulls[]   (nulls[0] = CTRL_CAM_0 holds the camera; each later null parents the previous)
//   // Or hand-made moves (like the tutorial, aligned by eye), deltas in world units/degrees:
//   smooth3dMoves(comp, rig, [{dur: 0.9, dx: 600, dy: -200, dz: 400, rx: 8, ry: 9, rz: 0}, ...]);
//
// Caveat (he says it too, 8:04): stacked rotations drift because each new null rotates the whole chain about
// the previous target. Keep per-word rotations small (<= 15 deg, mostly one axis) or fix by eye afterwards.
// NOTE: written 2026-10-20, NOT yet run in AE. Test once in a scratch comp before using in a build.

var S3C_LBL_CONTROL = (typeof LBL !== "undefined" && LBL.CONTROL) ? LBL.CONTROL : 1;

function _s3cOpt(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _s3cLog(m) { try { $.writeln("[smooth_3d_camera] " + m); } catch (e) {} }

function _s3cEase(prop, outInf, inInf) {
    var k, n, e0, e1, dims;
    for (k = 1; k <= prop.numKeys; k++) {
        try {
            dims = (prop.propertyValueType === PropertyValueType.ThreeD_SPATIAL || prop.propertyValueType === PropertyValueType.TwoD_SPATIAL) ? 1 : (prop.value instanceof Array ? prop.value.length : 1);
            e0 = []; e1 = [];
            for (n = 0; n < dims; n++) { e0.push(new KeyframeEase(0, inInf)); e1.push(new KeyframeEase(0, outInf)); }
            prop.setInterpolationTypeAtKey(k, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
            prop.setTemporalEaseAtKey(k, e0, e1);
            if (prop.isSpatial) { prop.setSpatialAutoBezierAtKey(k, false); prop.setSpatialTangentsAtKey(k, [0, 0, 0], [0, 0, 0]); }
        } catch (e) { _s3cLog("ease " + prop.name + " k" + k + ": " + String(e.message) + " L" + e.line); }
    }
}

function _s3cWorld(L, t) { // world position + rotation of an UNPARENTED 3D layer (targets)
    var tr = L.property("ADBE Transform Group");
    var p = tr.property("ADBE Position").valueAtTime(t, false);
    return {p: [p[0], p[1], (p.length > 2 ? p[2] : 0)],
            r: [tr.property("ADBE Rotate X").valueAtTime(t, false) + tr.property("ADBE Orientation").valueAtTime(t, false)[0],
                tr.property("ADBE Rotate Y").valueAtTime(t, false) + tr.property("ADBE Orientation").valueAtTime(t, false)[1],
                tr.property("ADBE Rotate Z").valueAtTime(t, false) + tr.property("ADBE Orientation").valueAtTime(t, false)[2]]};
}

function _s3cNewNull(comp, name, pivot) {
    var n = comp.layers.addNull(comp.duration);
    n.name = name; n.threeDLayer = true; n.label = S3C_LBL_CONTROL;
    var tr = n.property("ADBE Transform Group");
    tr.property("ADBE Anchor Point").setValue(pivot);   // null sits ON the current target: rotations pivot around it
    tr.property("ADBE Position").setValue(pivot);
    return n;
}

// key one move on a fresh null: pivot (current target) -> pivot + d, rotation 0 -> r
function _s3cKeyMove(rig, pivot, d, r, t0, dur, opts) {
    var comp = rig.comp, k = rig.nulls.length;
    var n = _s3cNewNull(comp, "CTRL_CAM_" + k, pivot);
    rig.nulls[k - 1].parent = n;               // the NEW null parents the previous one (parent before keying)
    var tr = n.property("ADBE Transform Group"), t1 = t0 + dur;
    var P = tr.property("ADBE Position");
    P.setValueAtTime(t0, pivot);
    P.setValueAtTime(t1, [pivot[0] + d[0], pivot[1] + d[1], pivot[2] + d[2]]);
    var names = ["ADBE Rotate X", "ADBE Rotate Y", "ADBE Rotate Z"], a;
    for (a = 0; a < 3; a++) {
        if (Math.abs(r[a]) < 0.001) continue;
        tr.property(names[a]).setValueAtTime(t0, 0);
        tr.property(names[a]).setValueAtTime(t1, r[a]);
        _s3cEase(tr.property(names[a]), _s3cOpt(opts, "outInf", 50), _s3cOpt(opts, "inInf", 100));
    }
    _s3cEase(P, _s3cOpt(opts, "outInf", 50), _s3cOpt(opts, "inInf", 100));
    rig.nulls.push(n);
    rig.tEnd = t1; rig.lastDur = dur;
    return n;
}

// targets: 3D layers (unparented). Camera starts framing targets[0]; one move per following target.
function smooth3dCamera(comp, targets, opts) {
    var fps = 1 / comp.frameDuration;
    var t0 = _s3cOpt(opts, "t0", 0.2), dur = _s3cOpt(opts, "dur", 0.9), ov = _s3cOpt(opts, "overlapFrac", 0.35);
    var mm = _s3cOpt(opts, "mm", 28);
    var zoom = mm / 36 * comp.width;            // 36 mm film width (AE default, horizontal)
    var dist = _s3cOpt(opts, "distance", zoom);
    var w0 = _s3cWorld(targets[0], 0);

    var cam = comp.layers.addCamera("CTRL_CAM", [comp.width / 2, comp.height / 2]);
    cam.autoOrient = AutoOrientType.NO_AUTO_ORIENT;   // one-node camera
    cam.label = S3C_LBL_CONTROL;
    var co = cam.property("ADBE Camera Options Group");
    co.property("ADBE Camera Zoom").setValue(zoom);
    if (_s3cOpt(opts, "dof", false)) {
        co.property("ADBE Camera Depth of Field").setValue(1);
        co.property("ADBE Camera Focus Distance").setValue(dist);
        co.property("ADBE Camera Aperture").setValue(_s3cOpt(opts, "aperture", 40));
    }
    var base = _s3cNewNull(comp, "CTRL_CAM_0", w0.p);
    var bt = base.property("ADBE Transform Group");
    bt.property("ADBE Rotate X").setValue(w0.r[0]); bt.property("ADBE Rotate Y").setValue(w0.r[1]); bt.property("ADBE Rotate Z").setValue(w0.r[2]);
    // camera in front of target 0, in the null's LOCAL space (anchor = position = target 0), so it inherits the
    // target's rotation: setParentWithJump = no compensation, then local values.
    cam.setParentWithJump(base);
    cam.property("ADBE Transform Group").property("ADBE Position").setValue([w0.p[0], w0.p[1], w0.p[2] - dist]);

    var rig = {comp: comp, camera: cam, nulls: [base], tEnd: t0, lastDur: 0};
    var k, tStart = t0, prev = w0;
    for (k = 1; k < targets.length; k++) {
        var w = _s3cWorld(targets[k], 0);
        if (k > 1) tStart = rig.tEnd - rig.lastDur * ov;    // start while the previous move is still settling
        _s3cKeyMove(rig, prev.p, [w.p[0] - prev.p[0], w.p[1] - prev.p[1], w.p[2] - prev.p[2]],
                    [w.r[0] - prev.r[0], w.r[1] - prev.r[1], w.r[2] - prev.r[2]], tStart, dur, opts);
        prev = w;
    }
    _s3cMotionBlur(comp, targets);
    _s3cLog("rig: " + rig.nulls.length + " nulls, ends " + Math.round(rig.tEnd * fps) + " f");
    return rig;
}

// hand-made moves appended to an existing rig (the tutorial aligns each word by eye)
function smooth3dMoves(comp, rig, moves, opts) {
    var k, pivot = rig.nulls[rig.nulls.length - 1].property("ADBE Transform Group").property("ADBE Position").valueAtTime(rig.tEnd, false);
    var ov = _s3cOpt(opts, "overlapFrac", 0.35);
    for (k = 0; k < moves.length; k++) {
        var m = moves[k], dur = _s3cOpt(m, "dur", 0.9);
        var tS = (m.t !== undefined) ? m.t : rig.tEnd - rig.lastDur * ov;
        _s3cKeyMove(rig, [pivot[0], pivot[1], pivot[2]], [_s3cOpt(m, "dx", 0), _s3cOpt(m, "dy", 0), _s3cOpt(m, "dz", 0)],
                    [_s3cOpt(m, "rx", 0), _s3cOpt(m, "ry", 0), _s3cOpt(m, "rz", 0)], tS, dur, opts);
        pivot = [pivot[0] + _s3cOpt(m, "dx", 0), pivot[1] + _s3cOpt(m, "dy", 0), pivot[2] + _s3cOpt(m, "dz", 0)];
    }
    return rig;
}

function _s3cMotionBlur(comp, layers) {
    var k;
    comp.motionBlur = true;
    try { comp.shutterAngle = 180; comp.shutterPhase = -90; comp.motionBlurSamplesPerFrame = 16; comp.motionBlurAdaptiveSampleLimit = 128; } catch (e) {}
    for (k = 0; k < layers.length; k++) { try { layers[k].motionBlur = true; } catch (e2) {} }
}
