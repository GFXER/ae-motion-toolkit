// one_two_rule.jsx : the "1:2" transition timing rule as reusable ES3 helpers.
// Stock AE only (CC Flo Motion, Camera Lens Blur, Transform; optional chromatic aberration). Not yet run in AE.
//
// The rule
//   A transition is N frames ACCELERATING out of shot A, the cut, then 2N frames SETTLING into shot B.
//   The fastest moment (speed peak) sits on the cut, so the eye never sees the edit frame clearly.
//   Values stay continuous through the cut: no jumps, no sign flips (a spin keeps turning the same way).
//   Long settle tails: the settle key uses a high ease influence (85-95 %) so B "lands" softly.
//
// Presets (frames at 60 fps; scaled to the comp frame rate unless opts.scaleFps === false)
//   "items"  12 -> 24   small beats, list items
//   "normal" 15 -> 30   default section transition
//   "big"    20 -> 40   big moments, section changes
//   At 30 fps "normal" becomes 8 -> 16 (rounded), at 24 fps 6 -> 12, at 50 fps 13 -> 26.
//
// Two curve shapes
//   spike  : base -> peak (on the cut) -> base.   Use for scale punch, blur, flo amount, aberration.
//   travel : from -> mid (on the cut) -> to, monotonic, with the SAME speed on both sides of the cut key.
//            Use for spins, slides and pushes on an adjustment layer (with Motion Tile mirror under it).
//
// Usage
//   #include "one_two_rule.jsx"
//   var tm = oneTwoTimes(comp, tCut, "normal");          // {t0, tCut, t1, nOut, nIn}
//   oneTwoSpike(someProp, tCut, comp, "big", 0, 30);      // key any property as a 1:2 spike
//   oneTwoTravel(rotProp, tCut, comp, "normal", 0, 360);  // continuous spin, speed peak on the cut
//   var adj = oneTwoTransition(comp, tCut, "normal", {scale:108, flo:3, blur:26, ca:0, spin:0});
//
// oneTwoTransition() options (all optional)
//   scale      Transform scale peak in % (default 108; keep <= ~110)
//   flo        CC Flo Motion amount peak (default 3; 0 = off). Knots: opts.floKnots [[x,y],[x,y]],
//              default top-centre / bottom-centre outside the frame so faces are not warped.
//   blur       Camera Lens Blur radius peak (default 26 at 2160 wide, scaled by comp width; 0 = off)
//   ca         chromatic aberration peak, needs a CA plugin matchName in opts.caMatch (default 0 = off)
//   spin       total degrees of rotation through the cut (travel curve; 0 = off). Add Motion Tile
//              (mirror edges) on the layers underneath, or the frame corners show.
//   slideX/Y   total px of travel through the cut (travel curve; 0 = off), same Motion Tile note.
//   shutter    Transform shutter angle (default 200); comp motion blur must be on to see it.
//   name       layer name (default "ADJ_TR_1x2")
//   Returns the adjustment layer.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

var ONE_TWO_PRESETS = { items: 12, normal: 15, big: 20 };   // N at 60 fps; settle is always 2N

// Ease influences (percent). OUT_INF = how long the move "leans" before accelerating away from A,
// SETTLE_INF = the long tail into B.
var ONE_TWO_OUT_INF = 75;
var ONE_TWO_SETTLE_INF = 92;
var ONE_TWO_MID_INF = 33;          // travel curve: influence on each side of the cut key
var ONE_TWO_PEAK_MUL = 2.4;        // travel curve: cut speed = average speed x this (house curves 2-3.6x)

function _otOpt(o, k, d) { return (o && o[k] !== undefined && o[k] !== null) ? o[k] : d; }

// Out-frames for a preset name or a number, scaled from 60 fps to the comp rate.
function oneTwoFrames(comp, preset, opts) {
    var n = (typeof preset === "number") ? preset : ONE_TWO_PRESETS[preset];
    if (n === undefined) throw new Error("one_two_rule: unknown preset '" + preset + "' (items|normal|big or a number)");
    if (_otOpt(opts, "scaleFps", true)) {
        var fps = 1 / comp.frameDuration;
        n = Math.round(n * fps / 60);
    }
    if (n < 2) n = 2;
    return n;
}

// Timing of a 1:2 transition around tCut (seconds).
function oneTwoTimes(comp, tCut, preset, opts) {
    var fd = comp.frameDuration;
    var n = oneTwoFrames(comp, preset, opts);
    return { t0: tCut - n * fd, tCut: tCut, t1: tCut + 2 * n * fd, nOut: n, nIn: 2 * n };
}

// Number of ease entries a property expects (spatial props take a single ease).
function _otDims(p) {
    var spatial = (p.propertyValueType === PropertyValueType.TwoD_SPATIAL || p.propertyValueType === PropertyValueType.ThreeD_SPATIAL);
    if (spatial) return 1;
    var v = p.value;
    return (v instanceof Array) ? v.length : 1;
}

function _otEase(dims, speed, inf) {
    var a = [];
    for (var d = 0; d < dims; d++) a.push(new KeyframeEase(speed, inf));
    return a;
}

// Spike: base -> peak on the cut -> base. base/peak may be numbers or arrays matching the property.
function oneTwoSpike(prop, tCut, comp, preset, base, peak, opts) {
    var tm = oneTwoTimes(comp, tCut, preset, opts);
    prop.setValueAtTime(tm.t0, base);
    prop.setValueAtTime(tm.tCut, peak);
    prop.setValueAtTime(tm.t1, base);
    var k0 = prop.nearestKeyIndex(tm.t0), k1 = prop.nearestKeyIndex(tm.tCut), k2 = prop.nearestKeyIndex(tm.t1);
    var dims = _otDims(prop);
    prop.setInterpolationTypeAtKey(k0, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
    prop.setInterpolationTypeAtKey(k1, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
    prop.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
    prop.setTemporalEaseAtKey(k0, _otEase(dims, 0, _otOpt(opts, "outInf", ONE_TWO_OUT_INF)), _otEase(dims, 0, _otOpt(opts, "outInf", ONE_TWO_OUT_INF)));
    prop.setTemporalEaseAtKey(k2, _otEase(dims, 0, _otOpt(opts, "settleInf", ONE_TWO_SETTLE_INF)), _otEase(dims, 0, _otOpt(opts, "settleInf", ONE_TWO_SETTLE_INF)));
    return tm;
}

// Travel: from -> (cut) -> to, monotonic, continuous speed through the cut key.
// 1/3 of the distance is covered in the N out-frames, 2/3 in the 2N settle frames, so the average speed is
// the same on both sides and the explicit cut-key speed keeps the curve smooth (no kink, no sign flip).
// from/to: numbers for 1-D props, arrays for multi-dim / spatial props.
function oneTwoTravel(prop, tCut, comp, preset, from, to, opts) {
    var tm = oneTwoTimes(comp, tCut, preset, opts);
    var isArr = (from instanceof Array);
    var mid, dist, d;
    if (isArr) {
        mid = []; dist = 0;
        for (d = 0; d < from.length; d++) {
            mid.push(from[d] + (to[d] - from[d]) / 3);
            dist += (to[d] - from[d]) * (to[d] - from[d]);
        }
        dist = Math.sqrt(dist);
    } else {
        mid = from + (to - from) / 3;
        dist = Math.abs(to - from);
    }
    prop.setValueAtTime(tm.t0, from);
    prop.setValueAtTime(tm.tCut, mid);
    prop.setValueAtTime(tm.t1, to);
    var k0 = prop.nearestKeyIndex(tm.t0), k1 = prop.nearestKeyIndex(tm.tCut), k2 = prop.nearestKeyIndex(tm.t1);
    var dims = _otDims(prop);
    var avg = dist / (tm.t1 - tm.t0);                      // units per second
    var vPeak = avg * _otOpt(opts, "peakMul", ONE_TWO_PEAK_MUL);
    var spatial = (dims === 1 && isArr);
    var midInf = _otOpt(opts, "midInf", ONE_TWO_MID_INF);
    var midEase;
    if (spatial || !isArr) {
        // 1-D: signed speed so the direction is kept; spatial: speed is a magnitude along the path
        var sv = (!isArr && to < from) ? -vPeak : vPeak;
        midEase = _otEase(1, sv, midInf);
    } else {
        // separated multi-dim (e.g. non-spatial arrays): per-dimension signed speed
        midEase = [];
        for (d = 0; d < dims; d++) {
            var comp_v = (dist > 0) ? vPeak * (to[d] - from[d]) / dist : 0;
            midEase.push(new KeyframeEase(comp_v, midInf));
        }
    }
    prop.setInterpolationTypeAtKey(k0, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
    prop.setInterpolationTypeAtKey(k1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
    prop.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
    prop.setTemporalEaseAtKey(k0, _otEase(dims, 0, _otOpt(opts, "outInf", ONE_TWO_OUT_INF)), _otEase(dims, 0, _otOpt(opts, "outInf", ONE_TWO_OUT_INF)));
    prop.setTemporalEaseAtKey(k1, midEase, midEase);
    prop.setTemporalEaseAtKey(k2, _otEase(dims, 0, _otOpt(opts, "settleInf", ONE_TWO_SETTLE_INF)), _otEase(dims, 0, _otOpt(opts, "settleInf", ONE_TWO_SETTLE_INF)));
    if (spatial) { try { prop.setSpatialAutoBezierAtKey(k1, false); prop.setSpatialContinuousAtKey(k1, true); } catch (eS) {} }
    return tm;
}

// Full adjustment-layer transition across a cut: Transform punch (+ optional spin/slide),
// CC Flo Motion, Camera Lens Blur and optional chromatic aberration, all on one 1:2 clock.
function oneTwoTransition(comp, tCut, preset, opts) {
    var tm = oneTwoTimes(comp, tCut, preset, opts);
    var fd = comp.frameDuration;
    var cx = comp.width / 2, cy = comp.height / 2;
    var scale = _otOpt(opts, "scale", 108);
    var flo = _otOpt(opts, "flo", 3);
    var blur = _otOpt(opts, "blur", 26 * comp.width / 2160);
    var ca = _otOpt(opts, "ca", 0);
    var caMatch = _otOpt(opts, "caMatch", "");
    var spin = _otOpt(opts, "spin", 0);
    var slideX = _otOpt(opts, "slideX", 0), slideY = _otOpt(opts, "slideY", 0);

    var adj = comp.layers.addSolid([1, 1, 1], _otOpt(opts, "name", "ADJ_TR_1x2"), comp.width, comp.height, comp.pixelAspect, comp.duration);
    adj.adjustmentLayer = true;
    adj.label = LBL.ADJ;
    adj.startTime = 0;
    adj.inPoint = tm.t0 - fd;              // AE 26.5: set inPoint first, then outPoint
    adj.outPoint = tm.t1 + fd;

    // Add every effect first, then fetch properties (adding effects invalidates earlier references).
    var fxp = adj.property("ADBE Effect Parade");
    var iTr = fxp.addProperty("ADBE Geometry2").propertyIndex;
    var iFlo = 0, iLb = 0, iCa = 0;
    if (flo > 0) { try { iFlo = fxp.addProperty("CC Flo Motion").propertyIndex; } catch (eF) { iFlo = 0; } }
    if (blur > 0) { try { iLb = fxp.addProperty("ADBE Camera Lens Blur").propertyIndex; } catch (eB) { iLb = 0; } }
    if (ca > 0 && caMatch) { try { iCa = fxp.addProperty(caMatch).propertyIndex; } catch (eC) { iCa = 0; } }

    var tr = fxp.property(iTr);
    tr.property("ADBE Geometry2-0001").setValue([cx, cy]);           // anchor
    tr.property("ADBE Geometry2-0002").setValue([cx, cy]);           // position
    tr.property("ADBE Geometry2-0009").setValue(0);                  // use comp shutter: off
    tr.property("ADBE Geometry2-0010").setValue(_otOpt(opts, "shutter", 200));
    if (scale !== 100) oneTwoSpike(tr.property("ADBE Geometry2-0003"), tCut, comp, preset, 100, scale, opts);
    if (spin !== 0) oneTwoTravel(tr.property("ADBE Geometry2-0007"), tCut, comp, preset, 0, spin, opts);
    if (slideX !== 0 || slideY !== 0) oneTwoTravel(tr.property("ADBE Geometry2-0002"), tCut, comp, preset, [cx, cy], [cx + slideX, cy + slideY], opts);

    if (iFlo) {
        var fl = fxp.property(iFlo);
        var knots = _otOpt(opts, "floKnots", [[cx, -comp.height * 0.1], [cx, comp.height * 1.12]]);
        fl.property("CC Flo Motion-0002").setValue(knots[0]);
        fl.property("CC Flo Motion-0004").setValue(knots[1]);
        oneTwoSpike(fl.property("CC Flo Motion-0003"), tCut, comp, preset, 0, flo, opts);   // knot 1 amount
    }
    if (iLb) oneTwoSpike(fxp.property(iLb).property(1), tCut, comp, preset, 0, blur, opts);
    if (iCa) oneTwoSpike(fxp.property(iCa).property(_otOpt(opts, "caParam", 1)), tCut, comp, preset, 0, ca, opts);
    return adj;
}
