// transform_cut.jsx : the four classic "motion through the cut" transitions on one adjustment layer:
//   slide (left / right / up / down), spin, zoom-through and zoom-punch.
// Stock AE only (Motion Tile, Transform, optional Directional Blur / CC Radial Fast Blur / Exposure). Not yet run in AE.
//
// How it works
//   An adjustment layer above the cut carries Motion Tile (so moved / scaled / rotated edges never show black) and a
//   Transform effect with motion blur. The move follows the 1:2 rule (see one_two_rule.jsx): N frames accelerating
//   out of shot A, the hard cut, 2N frames settling into shot B. Two key shapes are used:
//     travel : base -> 1/3 of the distance ON the cut -> full distance. Speed is the same on both sides of the cut,
//              and a full comp width/height of travel on a seamless Motion Tile lands back on a clean frame.
//     jump   : A side ramps base -> peak, the value jumps on the cut, B side ramps from its own value back to base.
//              Used for spin (+45 | -45: the direction of rotation never flips) and zoom-through (165 % | 62 %).
//
// Recipes (values at a 2160 x 3840 comp; distances scale with the comp, timings with the frame rate)
//   slide right   position x: c -> c + W/3 (cut) -> c + W,   Motion Tile 300 %, mirror OFF, Directional Blur 0 -> 60 -> 0
//   slide up      position y: c -> c - H/3 (cut) -> c - H,   same as above with the blur at 0 deg
//   spin          rotation 0 -> +45 | -45 -> 0, scale 100 -> 122 | 122 -> 100, Motion Tile mirror ON
//   zoomthru      scale 100 -> 165 | 62 -> 100 (A dives in, B arrives from far away), CC Radial Fast Blur 0 -> 30 -> 0
//   zoom          short punch: scale 100 -> 175 | 62 -> 100 in a tighter window (n defaults to 9 @60) + 2 f exposure kick
//   Transform shutter 300, keys eased out 80-82 % / settle 92-94 % (long tail). Comp motion blur must be on.
//
// Note on taste: the spin / zoom defaults are the punchy music-edit values. For clean or education work keep the
// scale peak <= ~110 % (opts.scale) and the spin <= 20 deg (opts.rot).
//
// Usage
//   #include "transform_cut.jsx"
//   transformCut(comp, tCut, "slide");                          // slide right, N = 15 f @60 (fps-scaled)
//   transformCut(comp, tCut, "slide", {dir: "up", n: 12});      // push up, faster
//   transformCut(comp, tCut, "spin",  {rot: -30, scale: 112});  // counter-clockwise, gentler
//   transformCut(comp, tCut, "zoomthru", {blur: 0});
//   transformCut(comp, tCut, "zoom");
//
// Options (all optional)
//   n          out-frames N at 60 fps (default 15, zoom 9; settle = 2N). Scaled to the comp rate unless scaleFps === false.
//   dir        slide direction: "right" (default), "left", "up", "down"
//   rot        spin degrees on each side of the cut (default 45; negative = counter-clockwise)
//   scale      spin scale peak in % (default 122); zoomthru / zoom: A-side peak (default 165 / 175)
//   scaleIn    zoomthru / zoom: B-side start scale in % (default 62)
//   blur       slide: Directional Blur length peak (default 60 at 2160 wide); zoomthru: CC Radial Fast Blur peak
//              (default 30); 0 = off
//   kick       zoom: Exposure kick in stops for 2 f around the cut (default 1.0; 0 = off)
//   tile       Motion Tile output % (default 300)
//   shutter    Transform shutter angle (default 300)
//   outInf / settleInf   ease influence (%) on the first / last key (default 82 / 94)
//   name       layer name (default "ADJ_TR_<type>")
//   label      layer label colour index (default 3 = Aqua, adjustment)
// Returns the adjustment layer. Throws on an unknown type.

function _tcOpt(o, k, d) { return (o && o[k] !== undefined && o[k] !== null) ? o[k] : d; }

function _tcDims(p) {
    if (p.propertyValueType === PropertyValueType.TwoD_SPATIAL || p.propertyValueType === PropertyValueType.ThreeD_SPATIAL) return 1;
    var v = p.value;
    return (v instanceof Array) ? v.length : 1;
}

function _tcEase(p, k, inInf, outInf) {
    var dims = _tcDims(p), a = [], b = [];
    for (var d = 0; d < dims; d++) { a.push(new KeyframeEase(0, inInf)); b.push(new KeyframeEase(0, outInf)); }
    p.setTemporalEaseAtKey(k, a, b);
}

// a -> b (on the cut, linear corner) -> c
function _tcTravel(p, tm, a, b, c, oi, si) {
    p.setValueAtTime(tm.t0, a);
    p.setValueAtTime(tm.tCut, b);
    p.setValueAtTime(tm.t1, c);
    var k0 = p.nearestKeyIndex(tm.t0), k1 = p.nearestKeyIndex(tm.tCut), k2 = p.nearestKeyIndex(tm.t1);
    p.setInterpolationTypeAtKey(k1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
    _tcEase(p, k0, 33, oi);
    _tcEase(p, k2, si, 33);
}

// a -> b just before the cut, c on the cut -> d (hidden 1-tick ramp, so the value jumps exactly on the edit)
function _tcJump(p, tm, a, b, c, d, oi, si) {
    var tick = Math.min(0.001, tm.fd / 4);
    p.setValueAtTime(tm.t0, a);
    p.setValueAtTime(tm.tCut - tick, b);
    p.setValueAtTime(tm.tCut, c);
    p.setValueAtTime(tm.t1, d);
    var k0 = p.nearestKeyIndex(tm.t0), k3 = p.nearestKeyIndex(tm.t1);
    for (var k = k0 + 1; k < k3; k++) p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
    _tcEase(p, k0, 33, oi);
    _tcEase(p, k3, si, 33);
}

function _tcSet(fx, name, v) {
    var p = fx.property(name);
    if (!p) throw new Error("transform_cut: '" + fx.matchName + "' has no property '" + name + "'");
    p.setValue(v);
    return p;
}

function transformCut(comp, tCut, type, opts) {
    var TYPES = { slide: 1, spin: 1, zoomthru: 1, zoom: 1 };
    if (!TYPES[type]) throw new Error("transform_cut: unknown type '" + type + "' (slide, spin, zoomthru, zoom)");

    var fd = comp.frameDuration;
    var n = _tcOpt(opts, "n", type === "zoom" ? 9 : 15);
    if (_tcOpt(opts, "scaleFps", true)) n = Math.round(n * (1 / fd) / 60);
    if (n < 2) n = 2;
    var tm = { t0: tCut - n * fd, tCut: tCut, t1: tCut + 2 * n * fd, fd: fd };

    var W = comp.width, H = comp.height, cx = W / 2, cy = H / 2, wk = W / 2160;
    var oi = _tcOpt(opts, "outInf", 82), si = _tcOpt(opts, "settleInf", 94);
    var dir = _tcOpt(opts, "dir", "right");
    var tile = _tcOpt(opts, "tile", 300);
    var mirror = (type !== "slide");               // slides need a seamless tile, everything else mirrors
    var blur = _tcOpt(opts, "blur", type === "slide" ? 60 : (type === "zoomthru" ? 30 : 0));
    if (type === "slide") blur *= wk;
    var kick = (type === "zoom") ? _tcOpt(opts, "kick", 1.0) : 0;

    var L = comp.layers.addSolid([1, 1, 1], _tcOpt(opts, "name", "ADJ_TR_" + type), W, H, comp.pixelAspect, comp.duration);
    L.adjustmentLayer = true;
    L.label = _tcOpt(opts, "label", 3);
    L.startTime = 0;
    L.inPoint = Math.max(0, tm.t0 - fd);           // AE 26.5: set inPoint first, then outPoint
    L.outPoint = tm.t1 + fd;

    // Add every effect first, then fetch properties (adding an effect invalidates earlier references).
    var fxp = L.property("ADBE Effect Parade");
    var iTile = tile > 0 ? fxp.addProperty("ADBE Tile").propertyIndex : 0;
    var iTr = fxp.addProperty("ADBE Geometry2").propertyIndex;
    var iDb = (type === "slide" && blur > 0) ? fxp.addProperty("ADBE Motion Blur").propertyIndex : 0;    // Directional Blur
    var iRb = (type === "zoomthru" && blur > 0) ? fxp.addProperty("CC Radial Fast Blur").propertyIndex : 0;
    var iEx = kick > 0 ? fxp.addProperty("ADBE Exposure2").propertyIndex : 0;

    if (iTile) {
        var mt = fxp.property(iTile);
        _tcSet(mt, "Output Width", tile);
        _tcSet(mt, "Output Height", tile);
        _tcSet(mt, "Mirror Edges", mirror ? 1 : 0);
    }

    var tr = fxp.property(iTr);
    tr.property("ADBE Geometry2-0001").setValue([cx, cy]);       // anchor
    tr.property("ADBE Geometry2-0002").setValue([cx, cy]);       // position
    tr.property("ADBE Geometry2-0009").setValue(0);              // use comp shutter: off
    tr.property("ADBE Geometry2-0010").setValue(_tcOpt(opts, "shutter", 300));
    var P = tr.property("ADBE Geometry2-0002"), S = tr.property("ADBE Geometry2-0003"), R = tr.property("ADBE Geometry2-0007");

    if (type === "slide") {
        var dx = 0, dy = 0;
        if (dir === "right") dx = W; else if (dir === "left") dx = -W;
        else if (dir === "up") dy = -H; else if (dir === "down") dy = H;
        else throw new Error("transform_cut: unknown dir '" + dir + "' (right, left, up, down)");
        _tcTravel(P, tm, [cx, cy], [cx + dx / 3, cy + dy / 3], [cx + dx, cy + dy], oi, si);
        if (iDb) {
            var db = fxp.property(iDb);
            db.property(1).setValue(dy === 0 ? 90 : 0);              // direction: 90 = horizontal smear
            _tcTravel(db.property(2), tm, 0, blur, 0, oi, si);       // blur length peaks on the cut
        }
    } else if (type === "spin") {
        var rot = _tcOpt(opts, "rot", 45), sp = _tcOpt(opts, "scale", 122);
        _tcJump(R, tm, 0, rot, -rot, 0, oi, si);
        if (sp !== 100) _tcJump(S, tm, 100, sp, sp, 100, oi, si);
    } else {                                                          // zoomthru / zoom
        var sOut = _tcOpt(opts, "scale", type === "zoom" ? 175 : 165), sIn = _tcOpt(opts, "scaleIn", 62);
        _tcJump(S, tm, 100, sOut, sIn, 100, oi, si);
        if (iRb) {
            var rb = fxp.property(iRb);
            rb.property(1).setValue([cx, cy]);                       // centre
            _tcTravel(rb.property(2), tm, 0, blur, 0, oi, si);       // amount
        }
        if (iEx) {
            var ex = fxp.property(iEx).property(3);                  // Exposure (master)
            ex.setValueAtTime(tCut - 2 * fd, 0);
            ex.setValueAtTime(tCut, kick);
            ex.setValueAtTime(tCut + 2 * fd, 0);
        }
    }
    return L;
}
