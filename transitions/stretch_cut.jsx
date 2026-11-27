// stretch_cut.jsx : pixel-stretch transition, stock AE (CC Scale Wipe). Not yet run in AE.
//   stretchCut   one adjustment layer over the cut: shot A smears out from a line across the frame, the cut happens
//                at full smear, and shot B is pulled back out of the same smear
//
// How it works
//   CC Scale Wipe takes one line of pixels (through Center, at right angles to Direction) and stretches it across
//   the frame on the Direction side. On an adjustment layer it acts on whatever is below, so A and B can stay
//   ordinary clips with a hard cut between them. At full stretch both shots are just streaks of the same colours,
//   which hides the cut. An optional Directional Blur along the same axis softens the streak edges.
//
// Timing (frames are given at 60 fps and scaled to the comp rate, minimum 1 f)
//   1:2 rule: n frames accelerating into the cut, 2n frames settling out of it.
//   Stretch 0 -> peak (on the cut frame) -> 0. The cut key has a short influence, so the smear peaks sharply
//   instead of pausing; the first key eases out at 82 %, the last settles at 94 % (long tail).
//
// Direction
//   dir is CC Scale Wipe's Direction in degrees (90 = the stretch runs to the right, 270 = left, 0 = up, 180 = down).
//   flipB: true turns the direction 180 deg on the cut frame (hold keys), so A smears one way and B unrolls from
//   the other side. Leave it off for a single continuous sweep.
//
// Usage
//   #include "stretch_cut.jsx"
//   stretchCut(comp, tCut);                                   // stretch right, n = 12 f @60, peak 100
//   stretchCut(comp, tCut, {dir: 0, n: 9});                   // vertical smear, faster
//   stretchCut(comp, tCut, {center: [0.5, 0.35], peak: 70});  // stretch from a line above the middle, softer
//   stretchCut(comp, tCut, {flipB: true, blur: 0});           // A goes right, B comes back from the left
//
// Options (all optional)
//   n          frames into the cut at 60 fps (default 12; settle = 2n). Scaled to the comp rate unless scaleFps === false.
//   peak       Stretch at the cut (default 100; clamped to -100..100, the CC Scale Wipe range)
//   dir        Direction in degrees (default 90)
//   flipB      true = Direction + 180 on B's side of the cut (default false)
//   center     stretch line position as a fraction of the comp [x, y] (default [0.5, 0.5])
//   blur       Directional Blur length peak at 1080 wide, scaled to comp width (default 40; 0 = off)
//   outInf / cutInf / settleInf   ease influence (%) on the first / cut / last key (default 82 / 12 / 94)
//   name       layer name (default "ADJ_TR_stretch")
//   label      layer label colour index (default 3 = Aqua, adjustment)
// Returns the adjustment layer.

function _scOpt(o, k, d) { return (o && o[k] !== undefined && o[k] !== null) ? o[k] : d; }

// three keys: base -> peak (on the cut) -> base, 1:2 eases
function _scSpike(p, t0, tCut, t1, base, peak, outInf, cutInf, settleInf) {
    p.setValueAtTime(t0, base);
    p.setValueAtTime(tCut, peak);
    p.setValueAtTime(t1, base);
    var k0 = p.nearestKeyIndex(t0), kc = p.nearestKeyIndex(tCut), k1 = p.nearestKeyIndex(t1);
    p.setTemporalEaseAtKey(k0, [new KeyframeEase(0, outInf)], [new KeyframeEase(0, outInf)]);
    p.setTemporalEaseAtKey(kc, [new KeyframeEase(0, cutInf)], [new KeyframeEase(0, cutInf)]);
    p.setTemporalEaseAtKey(k1, [new KeyframeEase(0, settleInf)], [new KeyframeEase(0, settleInf)]);
}

function stretchCut(comp, tCut, opts) {
    var fd = comp.frameDuration, sk = comp.width / 1080;
    var n60 = _scOpt(opts, "n", 12);
    var n = Math.max(1, Math.round(_scOpt(opts, "scaleFps", true) === false ? n60 : n60 / fd / 60));
    tCut = Math.round(tCut / fd) * fd;
    var d = n * fd, t0 = Math.max(0, tCut - d), t1 = Math.min(comp.duration - fd, tCut + 2 * d);
    if (t0 >= tCut || t1 <= tCut) throw new Error("stretchCut: the cut at " + tCut + " s has no room inside the comp");

    var peak = Math.max(-100, Math.min(100, _scOpt(opts, "peak", 100)));
    var dir = _scOpt(opts, "dir", 90), cen = _scOpt(opts, "center", [0.5, 0.5]);
    var blur = _scOpt(opts, "blur", 40) * sk;
    var oI = _scOpt(opts, "outInf", 82), cI = _scOpt(opts, "cutInf", 12), sI = _scOpt(opts, "settleInf", 94);

    var L = comp.layers.addSolid([1, 1, 1], "ADJ_TR_stretch", comp.width, comp.height, comp.pixelAspect, comp.duration);
    L.adjustmentLayer = true;
    L.name = _scOpt(opts, "name", "ADJ_TR_stretch");
    L.label = _scOpt(opts, "label", 3);
    L.inPoint = t0;                                               // AE 26.5: inPoint first, then outPoint
    L.outPoint = Math.min(comp.duration, t1 + fd);

    var P = L.property("ADBE Effect Parade");
    var sw = P.addProperty("CC Scale Wipe");
    sw.property(2).setValue([cen[0] * comp.width, cen[1] * comp.height]);
    var D = sw.property(3);
    if (_scOpt(opts, "flipB", false)) {
        D.setValueAtTime(t0, dir);
        D.setValueAtTime(tCut, dir + 180);
        D.setInterpolationTypeAtKey(1, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
        D.setInterpolationTypeAtKey(2, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
    } else {
        D.setValue(dir);
    }
    _scSpike(sw.property(1), t0, tCut, t1, 0, peak, oI, cI, sI);

    if (blur > 0) {
        var mb = P.addProperty("ADBE Motion Blur");               // Directional Blur, same axis as the stretch
        mb.property(1).setValue(dir);
        _scSpike(mb.property(2), t0, tCut, t1, 0, blur, oI, cI, sI);
    }
    return L;
}
