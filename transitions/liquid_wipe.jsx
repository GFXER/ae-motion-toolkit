// liquid_wipe.jsx : liquid gradient wipe between two overlapping layers. Stock AE only
//   (Gradient Wipe, Turbulent Displace, Fractal Noise, Gradient Ramp). This port is not yet run in AE.
//
// What it does
//   Shot B flows in over shot A with a soft, wobbling, organic edge. The frame itself stays still, only the edge moves.
//
// How it works
//   A disabled map precomp holds a black -> white ramp (the direction of the wipe) with evolving fractal noise over it
//   (the liquid shape). Gradient Wipe on B reads that map while its completion runs 100 % -> 0 %, and Turbulent
//   Displace after it bends the moving edge. The map has to be a precomp: an effect's layer picker reads the layer
//   BEFORE its own effects, so a plain solid with Fractal Noise on it would be seen as flat black.
//
// Timing: the 1:2 rule (see one_two_rule.jsx). N frames in, the cut, 2N frames to settle. `cover` is how much of B is
//   in at the cut. The cut key has the same speed on both sides, limited so the curve can never overshoot or reverse.
//
// Recipe (values at 2160 px comp width, sizes scale with the comp)
//   Map                ramp 0 -> 1, Fractal Noise contrast 130, scale 320, evolution time*160, over the ramp at 38 %
//   Gradient Wipe      completion 100 -> 50 (cut) -> 0 %, softness 32 %, placement "Stretch Gradient to Fit"
//   Turbulent Displace amount 0 -> 55 (cut) -> 0, size 220, evolution time*120
//
// Usage
//   #include "liquid_wipe.jsx"
//   liquidWipe(comp, layerA, layerB, tCut);                          // B rises from the bottom, N = 15 f @60 (fps-scaled)
//   liquidWipe(comp, layerA, layerB, tCut, {dir: "right"});          // B enters on the left and travels right
//   liquidWipe(comp, layerA, layerB, tCut, {noise: 100, soft: 38});  // no direction: B melts through everywhere
//   liquidWipe(comp, layerA, layerB, tCut, {n: 20, displace: 90, size: 260});
//
// Needs handles: A must reach tCut + 2N frames and B must start N frames before tCut. The layers are trimmed /
//   extended for you; if the footage is too short the function throws and leaves both layers as they were.
// Use comp-sized layers (or precomps): Gradient Wipe works in B's own layer space.
// Property names are looked up in English.
//
// Options (all optional)
//   n          in-frames N at 60 fps (default 15; settle = 2N). Scaled to the comp rate unless scaleFps === false.
//   dir        the way B travels: "up" (default), "down", "left", "right"
//   cover      how much of B is in at the cut, 0.1 - 0.9 (default 0.5)
//   soft       Gradient Wipe softness in % (default 32)
//   noise      noise opacity over the ramp in % (default 38; 0 = straight soft wipe, 100 = noise only)
//   noiseScale Fractal Noise scale at 2160 wide (default 320, scaled by comp width)
//   noiseSpeed Fractal Noise evolution in degrees per second (default 160)
//   seed       start offset in degrees for the noise; change it so two wipes do not look alike (default 0)
//   displace   Turbulent Displace amount peak (default 55; 0 = off)
//   size       Turbulent Displace size at 2160 wide (default 220, scaled by comp width)
//   evoSpeed   Turbulent Displace evolution in degrees per second (default 120)
//   outInf / settleInf   ease influence (%) on the first / last key (default 75 / 92)
//   name       map comp name (default "LIQUID_MAP_<n>"), folder: FolderItem for the map comp (default project root)
// Returns {map, wipe, displace}: the map layer and the two effects (displace is null when off).

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

var LW_COUNT = 0;
var LW_MID_INF = 33;

function _lwOpt(o, k, d) { return (o && o[k] !== undefined && o[k] !== null) ? o[k] : d; }

function _lwProp(fx, name) {
    var p = fx.property(name);
    if (!p) throw new Error("liquid_wipe: '" + fx.matchName + "' has no property '" + name + "'");
    return p;
}

// Gradient Wipe shows its sliders as 0-100 % but scripting reads and writes them as 0-1.
function _lwPct(pct) { return pct / 100; }

function _lwEaseEnds(p, tm, oi, si) {
    var k0 = p.nearestKeyIndex(tm.t0), k2 = p.nearestKeyIndex(tm.t1);
    p.setTemporalEaseAtKey(k0, [new KeyframeEase(0, 33)], [new KeyframeEase(0, oi)]);
    p.setTemporalEaseAtKey(k2, [new KeyframeEase(0, si)], [new KeyframeEase(0, 33)]);
}

// a -> b (on the cut) -> c, monotonic, one speed through the cut key
function _lwTravel(p, tm, a, b, c, oi, si) {
    p.setValueAtTime(tm.t0, a);
    p.setValueAtTime(tm.tCut, b);
    p.setValueAtTime(tm.t1, c);
    _lwEaseEnds(p, tm, oi, si);
    var inf = LW_MID_INF / 100;
    var vIn = Math.abs(b - a) / (inf * (tm.tCut - tm.t0)), vOut = Math.abs(c - b) / (inf * (tm.t1 - tm.tCut));
    var v = 0.9 * Math.min(vIn, vOut) * (c < a ? -1 : 1);      // 0.9: the bezier handle stays inside the value range
    var e = [new KeyframeEase(v, LW_MID_INF)];
    p.setTemporalEaseAtKey(p.nearestKeyIndex(tm.tCut), e, e);
}

// 0 -> peak (on the cut, linear corner) -> 0
function _lwSpike(p, tm, peak, oi, si) {
    p.setValueAtTime(tm.t0, 0);
    p.setValueAtTime(tm.tCut, peak);
    p.setValueAtTime(tm.t1, 0);
    p.setInterpolationTypeAtKey(p.nearestKeyIndex(tm.tCut), KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
    _lwEaseEnds(p, tm, oi, si);
}

// Trim / extend A and B around the cut. AE clamps in / out points to the footage, so read them back.
function _lwHandles(A, B, tm) {
    var aIn = A.inPoint, aOut = A.outPoint, bIn = B.inPoint, bOut = B.outPoint, eps = tm.fd / 2;
    B.inPoint = tm.t0;
    B.outPoint = bOut;                                         // AE 26.5: inPoint first, then outPoint
    if (A.outPoint < tm.t1) A.outPoint = tm.t1;
    var okA = A.inPoint <= tm.t0 + eps && A.outPoint >= tm.t1 - eps;
    var okB = B.inPoint <= tm.t0 + eps && B.outPoint >= tm.t1 - eps;
    if (okA && okB) return;
    A.inPoint = aIn; A.outPoint = aOut;
    B.inPoint = bIn; B.outPoint = bOut;
    throw new Error("liquid_wipe: not enough footage around the cut (" + (okA ? "B" : "A") + " must cover " +
                    tm.t0.toFixed(3) + " - " + tm.t1.toFixed(3) + " s). Use a smaller n or longer clips.");
}

function _lwMap(comp, dir, opts) {
    var W = comp.width, H = comp.height, D = comp.duration;
    LW_COUNT++;
    var C = app.project.items.addComp(_lwOpt(opts, "name", "LIQUID_MAP_" + LW_COUNT), W, H, comp.pixelAspect, D, 1 / comp.frameDuration);
    if (opts && opts.folder) C.parentFolder = opts.folder;

    // B shows up where the map is white first, so white sits on the side B comes from.
    var ends = { up: [[W / 2, 0], [W / 2, H]], down: [[W / 2, H], [W / 2, 0]], right: [[W, H / 2], [0, H / 2]], left: [[0, H / 2], [W, H / 2]] }[dir];
    var R = C.layers.addSolid([0, 0, 0], "MATTE_ramp", W, H, comp.pixelAspect, D);
    R.label = LBL.MATTE;
    var rp = R.property("ADBE Effect Parade").addProperty("ADBE Ramp");
    _lwProp(rp, "Start of Ramp").setValue(ends[0]);
    _lwProp(rp, "Start Color").setValue([0, 0, 0]);
    _lwProp(rp, "End of Ramp").setValue(ends[1]);
    _lwProp(rp, "End Color").setValue([1, 1, 1]);

    var noise = _lwOpt(opts, "noise", 38);
    if (noise > 0) {
        var N = C.layers.addSolid([0, 0, 0], "MATTE_noise", W, H, comp.pixelAspect, D);
        N.label = LBL.MATTE;
        var fn = N.property("ADBE Effect Parade").addProperty("ADBE Fractal Noise");
        _lwProp(fn, "Contrast").setValue(130);
        _lwProp(fn, "Scale").setValue(_lwOpt(opts, "noiseScale", 320) * W / 2160);
        _lwProp(fn, "Evolution").expression = "time*" + _lwOpt(opts, "noiseSpeed", 160) + "+" + _lwOpt(opts, "seed", 0) + ";";
        N.property("ADBE Transform Group").property("ADBE Opacity").setValue(Math.min(100, noise));
    }

    var M = comp.layers.add(C);
    M.name = "PC_" + C.name;
    M.label = LBL.MATTE;
    M.startTime = 0;
    M.enabled = false;
    M.moveToEnd();
    return M;
}

function liquidWipe(comp, layerA, layerB, tCut, opts) {
    var dir = _lwOpt(opts, "dir", "up");
    if (dir !== "up" && dir !== "down" && dir !== "left" && dir !== "right") {
        throw new Error("liquid_wipe: unknown dir '" + dir + "' (up, down, left, right)");
    }
    var cover = _lwOpt(opts, "cover", 0.5);
    if (!(cover >= 0.1 && cover <= 0.9)) throw new Error("liquid_wipe: cover must be 0.1 - 0.9");

    var fd = comp.frameDuration;
    tCut = Math.round(tCut / fd) * fd;
    var n = _lwOpt(opts, "n", 15);
    if (_lwOpt(opts, "scaleFps", true)) n = Math.round(n * (1 / fd) / 60);
    if (n < 2) n = 2;
    var tm = { t0: tCut - n * fd, tCut: tCut, t1: tCut + 2 * n * fd, fd: fd };
    if (tm.t0 < -fd / 2) throw new Error("liquid_wipe: the cut is closer than N frames to the comp start");

    var oi = _lwOpt(opts, "outInf", 75), si = _lwOpt(opts, "settleInf", 92), wk = comp.width / 2160;
    _lwHandles(layerA, layerB, tm);
    if (layerA.index < layerB.index) layerB.moveBefore(layerA);
    var M = _lwMap(comp, dir, opts);

    // Add both effects first, then fetch properties (adding an effect invalidates earlier references).
    var fxp = layerB.property("ADBE Effect Parade");
    var disp = _lwOpt(opts, "displace", 55);
    var iGw = fxp.addProperty("ADBE Gradient Wipe").propertyIndex;
    var iTd = disp > 0 ? fxp.addProperty("ADBE Turbulent Displace").propertyIndex : 0;

    var gw = fxp.property(iGw);
    gw.name = "TR liquid wipe";
    var soft = _lwProp(gw, "Transition Softness"), done = _lwProp(gw, "Transition Completion");
    soft.setValue(_lwPct(_lwOpt(opts, "soft", 32)));
    _lwProp(gw, "Gradient Placement").setValue(3);             // 3 = Stretch Gradient to Fit
    _lwProp(gw, "Gradient Layer").setValue(M.index);
    _lwTravel(done, tm, _lwPct(100), _lwPct(100 * (1 - cover)), 0, oi, si);

    var td = null;
    if (iTd) {
        td = fxp.property(iTd);
        td.name = "TR liquid edge";
        _lwProp(td, "Size").setValue(_lwOpt(opts, "size", 220) * wk);
        _lwSpike(_lwProp(td, "Amount"), tm, disp, oi, si);
        _lwProp(td, "Evolution").expression = "time*" + _lwOpt(opts, "evoSpeed", 120) + ";";
    }
    return { map: M, wipe: gw, displace: td };
}
