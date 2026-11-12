// a_blur_flash.jsx : "Blur Flash" cut transition (ref Video-34404, motionpulse AE tutorial) as an ES3 helper.
// Guide: private study notes (not included) (34404). Stock AE (+ optional S_Glow). Not yet run in AE.
//
// Tutorial recipe (25 fps): adjustment layer 4 f long, CENTERED on the cut (2 f on A, 2 f on B).
//   Directional Blur (ADBE Motion Blur): Direction 0 deg (vertical smear), Blur Length 3 keys 0 -> 300 -> 0
//   (first / middle / last frame of the layer), graph = sharp spike (ease-in to the peak, ease-out after:
//   influence ~80 % on both sides, i.e. fast in, fast out, peak held on the cut).
//   Blend mode of the ADJUSTMENT LAYER = Screen -> the smeared copy is screened over the clean frame,
//   so the cut blooms bright (highlights streak to the frame edges). Optional: a grunge/dust overlay on top.
// Seen in the demo on every hard cut of a Matrix edit; the bright frame lands exactly on the cut frame.
//
// House scaling: 4 f @25 = 160 ms -> 6 f @30/@24 ~ 8 f @50, 10 f @60 (we keep the 1:2 idea by putting
// the peak 1/3 in: peakFrac 0.34). Length 300 is for 1080 wide; scale by comp width / 1080 (4K = 600).
// SFX: in the ref the flash sits on music hits; ours = short air whoosh peak on the cut + soft sub
// (<sfx-library>/whoosh.wav -18 dB +
//  a short bass hit -20 dB). No-whoosh projects: a shutter click instead.
//
// Usage:
//   #include "a_blur_flash.jsx"
//   blurFlash(comp, tCut, {frames:10, dir:0, length:600, screen:true, glow:false, peakFrac:0.5});

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _bfo(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }

function _bfEase(p, inf) {
    for (var k = 1; k <= p.numKeys; k++) p.setTemporalEaseAtKey(k, [new KeyframeEase(0, inf)], [new KeyframeEase(0, inf)]);
}

function blurFlash(comp, tCut, opts) {
    var fd = comp.frameDuration;
    var n = _bfo(opts, "frames", Math.round(0.16 / fd));          // 4 f @25
    if (n < 3) n = 3;
    var peakFrac = _bfo(opts, "peakFrac", 0.5);                    // 0.5 = tutorial (centered), 0.34 = 1:2
    var len = _bfo(opts, "length", 300 * comp.width / 1080);
    var dir = _bfo(opts, "dir", 0);                                // 0 = vertical streaks, 90 = horizontal
    var t0 = tCut - n * peakFrac * fd;
    var t1 = t0 + n * fd;
    var tp = tCut;

    var adj = comp.layers.addSolid([1, 1, 1], "ADJ_BLURFLASH", comp.width, comp.height, comp.pixelAspect, comp.duration);
    adj.adjustmentLayer = true;
    adj.label = LBL.ADJ;
    adj.startTime = 0;
    adj.inPoint = t0;                     // AE 26.5: set inPoint first, then outPoint
    adj.outPoint = t1;
    if (_bfo(opts, "screen", true)) adj.blendingMode = BlendingMode.SCREEN;

    var fxp = adj.property("ADBE Effect Parade");
    fxp.addProperty("ADBE Motion Blur");                           // Directional Blur
    if (_bfo(opts, "glow", false)) { try { fxp.addProperty("S_Glow"); } catch (e) { fxp.addProperty("ADBE Glo2"); } }
    // fetch AFTER all effects are added (adding invalidates earlier refs)
    var db = fxp.property(1);
    db.property(1).setValue(dir);                                  // Direction
    var bl = db.property(2);                                       // Blur Length
    bl.setValueAtTime(t0, 0);
    bl.setValueAtTime(tp, len);
    bl.setValueAtTime(t1 - fd, 0);
    _bfEase(bl, 80);
    return adj;
}
