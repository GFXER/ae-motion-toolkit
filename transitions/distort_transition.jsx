// distort_transition.jsx : lens-warp "distort" transition through a hard cut, on one adjustment layer.
// Stock AE only (Motion Tile, Transform, Optics Compensation, Turbulent Displace, CC Radial Fast Blur). Not yet run in AE.
//
// What it does
//   Shot A bulges out through a wide-angle lens, wobbles, smears radially and punches in; the cut lands on the
//   strongest frame; shot B arrives already warped and settles back to a clean frame. Timing follows the 1:2 rule
//   (see one_two_rule.jsx): N frames accelerating out, the cut, 2N frames settling in.
//
// Recipe (values at 2160 px comp width; sizes scale with the comp, timings with the frame rate)
//   Motion Tile          output 300 % x 300 %, mirror edges on  (so scaled/rotated edges never show black)
//   Transform scale      100 -> 116 | 116 -> 100     (A pushes in, B starts at the same size: no pop at the cut)
//   Transform rotation   0 -> +5    | -5 -> 0       (A turns clockwise out, B keeps turning clockwise in:
//                                                    the VALUE jumps at the cut but the DIRECTION never flips)
//   Optics Compensation  FOV 0 -> 70 -> 0            (barrel bulge, peak on the cut)
//   Turbulent Displace   amount 0 -> 50 -> 0, size 100, evolution time*720 (wobble)
//   CC Radial Fast Blur  amount 0 -> 18 -> 0, centre = comp centre (zoom smear)
//   Transform shutter    300 (comp motion blur must be on to see it)
//
// Usage
//   #include "distort_transition.jsx"
//   var adj = distortTransition(comp, tCut);                         // default: N = 15 f at 60 fps (fps-scaled)
//   var adj = distortTransition(comp, tCut, {n: 20, strength: 0.7}); // bigger window, gentler warp
//   var adj = distortTransition(comp, tCut, {rot: 0, blur: 0});      // bulge + wobble only
//
// Options (all optional)
//   n          out-frames N at 60 fps (default 15; settle = 2N). Scaled to the comp rate unless scaleFps === false.
//   strength   multiplier on every peak below (default 1). 0.5-0.7 reads as "subtle", 1.3 as "aggressive".
//   scale      Transform scale peak in % (default 116)
//   rot        rotation in degrees on each side of the cut (default 5; negative = counter-clockwise; 0 = off)
//   fov        Optics Compensation FOV peak (default 70; 0 = off)
//   displace   Turbulent Displace amount peak (default 50; 0 = off)
//   size       Turbulent Displace size at 2160 wide (default 100, scaled by comp width)
//   evoSpeed   Turbulent Displace evolution in degrees per second (default 720)
//   blur       CC Radial Fast Blur amount peak (default 18; 0 = off)
//   tile       Motion Tile output % (default 300; 0 = no Motion Tile, then keep scale/rot small)
//   shutter    Transform shutter angle (default 300)
//   outInf / settleInf   ease influence (%) on the first / last key (default 82 / 94: long settle tail)
//   name       layer name (default "ADJ_TR_distort")
//   label      layer label colour index (default 3 = Aqua, adjustment)
// Returns the adjustment layer. Throws if a stock effect is missing (they ship with AE).

function _dtOpt(o, k, d) { return (o && o[k] !== undefined && o[k] !== null) ? o[k] : d; }

function _dtDims(p) {
    var spatial = (p.propertyValueType === PropertyValueType.TwoD_SPATIAL || p.propertyValueType === PropertyValueType.ThreeD_SPATIAL);
    if (spatial) return 1;
    var v = p.value;
    return (v instanceof Array) ? v.length : 1;
}

function _dtEaseKey(p, k, inInf, outInf) {
    var dims = _dtDims(p), a = [], b = [];
    for (var d = 0; d < dims; d++) { a.push(new KeyframeEase(0, inInf)); b.push(new KeyframeEase(0, outInf)); }
    p.setTemporalEaseAtKey(k, a, b);
}

// base -> peak (on the cut, linear corner) -> base
function _dtSpike(p, tm, base, peak, oi, si) {
    p.setValueAtTime(tm.t0, base);
    p.setValueAtTime(tm.tCut, peak);
    p.setValueAtTime(tm.t1, base);
    var k0 = p.nearestKeyIndex(tm.t0), k1 = p.nearestKeyIndex(tm.tCut), k2 = p.nearestKeyIndex(tm.t1);
    p.setInterpolationTypeAtKey(k1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
    _dtEaseKey(p, k0, 33, oi);
    _dtEaseKey(p, k2, si, 33);
}

// a -> b just before the cut, c on the cut -> d. The segment between the two cut keys is one tick long
// (a hidden 1 ms ramp), so the value jumps exactly on the edit and both sides stay eased.
function _dtJump(p, tm, a, b, c, d, oi, si) {
    var tick = Math.min(0.001, tm.fd / 4);
    p.setValueAtTime(tm.t0, a);
    p.setValueAtTime(tm.tCut - tick, b);
    p.setValueAtTime(tm.tCut, c);
    p.setValueAtTime(tm.t1, d);
    var k0 = p.nearestKeyIndex(tm.t0), k3 = p.nearestKeyIndex(tm.t1);
    for (var k = k0 + 1; k < k3; k++) p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
    _dtEaseKey(p, k0, 33, oi);
    _dtEaseKey(p, k3, si, 33);
}

function _dtSet(fx, name, v) {
    var p = fx.property(name);
    if (!p) throw new Error("distort_transition: '" + fx.matchName + "' has no property '" + name + "'");
    p.setValue(v);
    return p;
}

function distortTransition(comp, tCut, opts) {
    var fd = comp.frameDuration;
    var n = _dtOpt(opts, "n", 15);
    if (_dtOpt(opts, "scaleFps", true)) n = Math.round(n * (1 / fd) / 60);
    if (n < 2) n = 2;
    var tm = { t0: tCut - n * fd, tCut: tCut, t1: tCut + 2 * n * fd, fd: fd, nOut: n, nIn: 2 * n };

    var k = _dtOpt(opts, "strength", 1);
    var wk = comp.width / 2160;
    var scale = 100 + (_dtOpt(opts, "scale", 116) - 100) * k;
    var rot = _dtOpt(opts, "rot", 5) * k;
    var fov = _dtOpt(opts, "fov", 70) * k;
    var disp = _dtOpt(opts, "displace", 50) * k;
    var size = _dtOpt(opts, "size", 100) * wk;
    var blur = _dtOpt(opts, "blur", 18) * k;
    var tile = _dtOpt(opts, "tile", 300);
    var oi = _dtOpt(opts, "outInf", 82), si = _dtOpt(opts, "settleInf", 94);
    var cx = comp.width / 2, cy = comp.height / 2;

    var L = comp.layers.addSolid([1, 1, 1], _dtOpt(opts, "name", "ADJ_TR_distort"), comp.width, comp.height, comp.pixelAspect, comp.duration);
    L.adjustmentLayer = true;
    L.label = _dtOpt(opts, "label", 3);
    L.startTime = 0;
    L.inPoint = Math.max(0, tm.t0 - fd);      // AE 26.5: set inPoint first, then outPoint
    L.outPoint = tm.t1 + fd;

    // Add every effect first, then fetch properties (adding an effect invalidates earlier references).
    var fxp = L.property("ADBE Effect Parade");
    var iTile = tile > 0 ? fxp.addProperty("ADBE Tile").propertyIndex : 0;
    var iTr = fxp.addProperty("ADBE Geometry2").propertyIndex;
    var iOc = fov > 0 ? fxp.addProperty("ADBE Optics Compensation").propertyIndex : 0;
    var iTd = disp > 0 ? fxp.addProperty("ADBE Turbulent Displace").propertyIndex : 0;
    var iRb = blur > 0 ? fxp.addProperty("CC Radial Fast Blur").propertyIndex : 0;

    if (iTile) {
        var mt = fxp.property(iTile);
        _dtSet(mt, "Output Width", tile);
        _dtSet(mt, "Output Height", tile);
        _dtSet(mt, "Mirror Edges", 1);
    }

    var tr = fxp.property(iTr);
    tr.property("ADBE Geometry2-0001").setValue([cx, cy]);       // anchor
    tr.property("ADBE Geometry2-0002").setValue([cx, cy]);       // position
    tr.property("ADBE Geometry2-0009").setValue(0);              // use comp shutter: off
    tr.property("ADBE Geometry2-0010").setValue(_dtOpt(opts, "shutter", 300));
    if (scale !== 100) _dtJump(tr.property("ADBE Geometry2-0003"), tm, 100, scale, scale, 100, oi, si);
    if (rot !== 0) _dtJump(tr.property("ADBE Geometry2-0007"), tm, 0, rot, -rot, 0, oi, si);

    if (iOc) _dtSpike(fxp.property(iOc).property(1), tm, 0, fov, oi, si);      // prop 1 = Field of View

    if (iTd) {
        var td = fxp.property(iTd);
        _dtSet(td, "Size", size);
        _dtSpike(td.property("Amount"), tm, 0, disp, oi, si);
        td.property("Evolution").expression = "time*" + _dtOpt(opts, "evoSpeed", 720) + ";";
    }

    if (iRb) {
        var rb = fxp.property(iRb);
        rb.property(1).setValue([cx, cy]);                              // centre
        _dtSpike(rb.property(2), tm, 0, blur, oi, si);                  // amount
    }
    return L;
}
