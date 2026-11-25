// slat_wipe.jsx : dark vertical slats close over a cut and open onto the next shot, stock AE. Not yet run in AE.
//   slatWipe   one solid with Venetian Blinds: the slats grow until the frame is covered, the cut happens under
//              full cover, then they thin out again while the whole set drifts sideways
//
// Why it works
//   The footage is never moved or scaled, so faces and text stay where they are. The drift keeps its direction and
//   its speed through the cut, so the close and the open read as one sweep instead of a shutter that stops.
//
// Timing (frames are given at 30 fps and scaled to the comp rate, minimum 1 f)
//   1:2 rule: n frames to close, accelerating into the cut; 2n frames to open, fast start and long settle.
//   Transition Completion 100 -> 0 -> 100, fully covered on the cut frame.
//
// Usage
//   #include "slat_wipe.jsx"
//   slatWipe(comp, tCut);                                    // 6 f close, 12 f open, 80 px slats at 1080 wide
//   slatWipe(comp, tCut, {n: 10, width: 140});
//   slatWipe(comp, tCut, {col: [0.95,0.94,0.92], dir: -1});  // paper slats, drifting right
//   slatWipe(comp, tCut, {angle: 90});                       // horizontal slats, same sideways drift
//
// Options
//   n (frames @30 to close, default 6), width (slat px at 1080 wide, scaled to comp width, default 80),
//   col (0-1 RGB, default near-black), drift (px at 1080 wide travelled on each side of the cut, default 60),
//   dir (1 = drifts left, -1 = drifts right), blur (Directional Blur length at 1080 wide, default 30, 0 = none),
//   angle (Venetian Blinds direction, default 0 = vertical slats), name, scaleFps (false = use n as given)
// Returns the slat layer.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _swOpt(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }

function slatWipe(comp, tCut, opts) {
    var fd = comp.frameDuration, sk = comp.width / 1080;
    var n30 = _swOpt(opts, "n", 6);
    var n = Math.max(1, Math.round(_swOpt(opts, "scaleFps", true) === false ? n30 : n30 / fd / 30));
    tCut = Math.round(tCut / fd) * fd;
    var d = n * fd, t0 = tCut - d, t1 = tCut + 2 * d;
    var drift = _swOpt(opts, "drift", 60) * sk, dir = _swOpt(opts, "dir", 1), blur = _swOpt(opts, "blur", 30) * sk;

    // wide enough that neither the drift nor the blurred edge shows inside the frame
    var w = Math.ceil(comp.width + 2 * (drift + 2 * blur) + 4);
    var S = comp.layers.addSolid(_swOpt(opts, "col", [0.03, 0.03, 0.04]), "FX_SLATS", w, comp.height, comp.pixelAspect, comp.duration);
    S.name = _swOpt(opts, "name", "FX_SLATS");
    S.label = LBL.SHAPE;
    S.inPoint = Math.max(0, t0);                                  // AE 26.5: inPoint first, then outPoint
    S.outPoint = Math.min(comp.duration, t1 + fd);

    var P = S.property("ADBE Effect Parade"), vb = P.addProperty("ADBE Venetian Blinds");
    vb.property(2).setValue(_swOpt(opts, "angle", 0));
    vb.property(3).setValue(_swOpt(opts, "width", 80) * sk);
    vb.property(4).setValue(0);
    var c = vb.property(1);
    c.setValueAtTime(t0, 100); c.setValueAtTime(tCut, 0); c.setValueAtTime(t1, 100);
    c.setTemporalEaseAtKey(1, [new KeyframeEase(0, 80)], [new KeyframeEase(0, 80)]);
    c.setTemporalEaseAtKey(2, [new KeyframeEase(0, 10)], [new KeyframeEase(0, 10)]);
    c.setTemporalEaseAtKey(3, [new KeyframeEase(0, 85)], [new KeyframeEase(0, 85)]);

    if (drift !== 0) {
        var p = S.property("ADBE Transform Group").property("ADBE Position"), cx = comp.width / 2, cy = comp.height / 2;
        p.setValueAtTime(t0, [cx + dir * drift, cy]);
        p.setValueAtTime(tCut, [cx, cy]);
        p.setValueAtTime(t1, [cx - dir * drift, cy]);
        var v = 1.5 * Math.abs(drift) / d;                        // same speed on both sides of the cut key
        p.setTemporalEaseAtKey(1, [new KeyframeEase(0, 80)], [new KeyframeEase(0, 80)]);
        p.setTemporalEaseAtKey(2, [new KeyframeEase(v, 33)], [new KeyframeEase(v, 20)]);
        p.setTemporalEaseAtKey(3, [new KeyframeEase(0, 85)], [new KeyframeEase(0, 85)]);
    }
    if (blur > 0) {
        var mb = P.addProperty("ADBE Motion Blur");               // Directional Blur
        mb.property(1).setValue(90);
        mb.property(2).setValue(blur);
    }
    return S;
}
