// flash_strobe.jsx : the flash family of cut accents, stock AE only. Not yet run in AE.
//   cameraFlash   real camera flash: instant on, eased decay over 5-9 f, optional exposure kick
//   flashPair     two quick flashes a few frames apart (snare / double-tap accent)
//   negStrobe     negative B/W strobe: invert + desaturate + contrast on alternate frames (or white 1 f strobes)
//   invertPrelap  1-3 f invert before the cut (+1 f after), or a 2 f invert on the cut
//   flashMaster   optional CTRL null with a "FLASH MASTER" slider that scales every flash made after it
//
// Timing notes (the frame counts below are measured at 50 fps and scaled to the comp rate, minimum 1 f)
//   A flash reads as "real" when it is ON at full strength on its first frame and then decays with a fast
//   start and a long eased tail. Fading a flash IN looks like a dissolve, not a flash. Keep bar downbeats
//   around 55 % strength and save 85-100 % for drops and the last hit; flashing every snare is clutter.
//   Negative strobes are a drop accent: use them 2-4 times per minute at most.
//
// Usage
//   #include "flash_strobe.jsx"
//   flashMaster(comp);                                  // optional, create it before the flashes
//   cameraFlash(comp, t);                               // 90 %, 7 f decay
//   cameraFlash(comp, t, {amt: 55, decay: 5});          // bar downbeat
//   cameraFlash(comp, t, {amt: 100, kick: 1.2});        // drop: flash + 1.2-stop exposure kick on the picture
//   flashPair(comp, t, {gap: 3});
//   negStrobe(comp, t, 8);                              // 8 frames, inverted on every other frame
//   negStrobe(comp, t, 6, {kind: "white"});             // white 1 f strobes, each one softer
//   invertPrelap(comp, tCut);                           // 3 f before the cut + 1 f after (one clean frame between)
//   invertPrelap(comp, tCut, {mode: "oncut"});          // 2 f starting on the cut frame
//
// Options
//   cameraFlash: amt (0-100, default 90), decay (frames @50, default 7), color ([1,1,1]), mode ("add" | "screen"),
//                kick (exposure stops on an adjustment layer, default 0 = off), name, master (true = link to the
//                FLASH MASTER slider when it exists, default true)
//   flashPair:   gap (frames @50 between the two flashes, default 3), amt (default 80), second (strength of the
//                2nd flash as a factor, default 0.7), decay (default 5) + any cameraFlash option
//   negStrobe:   kind ("neg" | "white", default "neg"), every (frames @50 between hits, default 2),
//                contrast (Brightness & Contrast, default 45), amt (white kind: first strobe %, default 85, each
//                next one 9 points softer), name
//   invertPrelap: mode ("prelap" | "oncut", default "prelap"), pre (frames before the cut, default 3), name
//   Frame counts are NOT scaled when opts.scaleFps === false.
// Every function returns the layer it made, or an array of layers.
// Sound: give each flash a shutter click or a short glass/click hit; a whoosh on a flash sounds cheap.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

var FS_MASTER = "CTRL_FLASH";

function _fsOpt(o, k, d) { return (o && o[k] !== undefined && o[k] !== null) ? o[k] : d; }

// frames given at 50 fps -> frames at the comp rate (min 1)
function _fsFr(comp, f50, opts) {
    if (_fsOpt(opts, "scaleFps", true) === false) return Math.max(1, Math.round(f50));
    return Math.max(1, Math.round(f50 * (1 / comp.frameDuration) / 50));
}

// snap a time to the start of its frame
function _fsSnap(comp, t) { var fd = comp.frameDuration; return Math.round(t / fd) * fd; }

function _fsPlace(L, tIn, tOut) {
    L.startTime = 0;
    L.inPoint = Math.max(0, tIn);          // AE 26.5: set inPoint first, then outPoint
    L.outPoint = tOut;
}

function _fsAdj(comp, name, tIn, tOut) {
    var L = comp.layers.addSolid([1, 1, 1], name, comp.width, comp.height, comp.pixelAspect, comp.duration);
    L.adjustmentLayer = true;
    L.label = LBL.ADJ;
    _fsPlace(L, tIn, tOut);
    return L;
}

// instant-on decay: linear out of the first key (full speed at once), long ease into the last
function _fsDecay(p, t0, v0, t1, v1) {
    p.setValueAtTime(t0, v0);
    p.setValueAtTime(t1, v1);
    var k0 = p.nearestKeyIndex(t0), k1 = p.nearestKeyIndex(t1);
    p.setInterpolationTypeAtKey(k0, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
    p.setInterpolationTypeAtKey(k1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
    p.setTemporalEaseAtKey(k1, [new KeyframeEase(0, 85)], [new KeyframeEase(0, 33)]);
}

function _fsLinkMaster(comp, opacity, opts) {
    if (_fsOpt(opts, "master", true) === false) return;
    var m = comp.layers.byName(FS_MASTER);
    if (!m) return;
    opacity.expression = 'value * thisComp.layer("' + FS_MASTER + '").effect("FLASH MASTER")(1) / 100';
}

// CTRL null with a FLASH MASTER slider (100 = as built). Returns the existing one if it is already there.
function flashMaster(comp) {
    var m = comp.layers.byName(FS_MASTER);
    if (m) return m;
    m = comp.layers.addNull(comp.duration);
    m.name = FS_MASTER;
    m.label = LBL.CONTROL;
    m.enabled = false;
    var s = m.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
    s.name = "FLASH MASTER";
    s.property(1).setValue(100);
    return m;
}

function cameraFlash(comp, t, opts) {
    var fd = comp.frameDuration;
    var t0 = _fsSnap(comp, t);
    var n = _fsFr(comp, _fsOpt(opts, "decay", 7), opts);
    var amt = _fsOpt(opts, "amt", 90);
    var t1 = t0 + n * fd;

    var W = comp.layers.addSolid(_fsOpt(opts, "color", [1, 1, 1]), _fsOpt(opts, "name", "FX_FLASH " + Math.round(t0 / fd)),
                                 comp.width, comp.height, comp.pixelAspect, comp.duration);
    W.label = LBL.LIGHT;
    W.blendingMode = (_fsOpt(opts, "mode", "add") === "screen") ? BlendingMode.SCREEN : BlendingMode.ADD;
    _fsPlace(W, t0, t1 + fd);
    var op = W.property("ADBE Transform Group").property("ADBE Opacity");
    _fsDecay(op, t0, amt, t1, 0);
    _fsLinkMaster(comp, op, opts);

    var kick = _fsOpt(opts, "kick", 0);
    if (kick > 0) {
        var K = _fsAdj(comp, "ADJ_FLASH_KICK " + Math.round(t0 / fd), t0, t1 + fd);
        K.moveAfter(W);
        var ex = K.property("ADBE Effect Parade").addProperty("ADBE Exposure2");
        _fsDecay(ex.property(3), t0, kick, t1, 0);              // Exposure (master), stops
        _fsLinkMaster(comp, K.property("ADBE Transform Group").property("ADBE Opacity"), opts);
        return [W, K];
    }
    return W;
}

function flashPair(comp, t, opts) {
    var fd = comp.frameDuration;
    var gap = _fsFr(comp, _fsOpt(opts, "gap", 3), opts);
    var amt = _fsOpt(opts, "amt", 80);
    var o1 = {}, o2 = {};
    if (opts) for (var k in opts) { if (opts.hasOwnProperty(k)) { o1[k] = opts[k]; o2[k] = opts[k]; } }
    o1.amt = amt; o2.amt = amt * _fsOpt(opts, "second", 0.7);
    o1.decay = o2.decay = _fsOpt(opts, "decay", 5);
    o1.name = "FX_FLASH pair A"; o2.name = "FX_FLASH pair B";
    var a = cameraFlash(comp, t, o1);
    var b = cameraFlash(comp, _fsSnap(comp, t) + gap * fd, o2);
    return [a, b];
}

function negStrobe(comp, t, nFrames, opts) {
    var fd = comp.frameDuration;
    var t0 = _fsSnap(comp, t);
    var every = _fsFr(comp, _fsOpt(opts, "every", 2), opts);
    var kind = _fsOpt(opts, "kind", "neg");
    var base = _fsOpt(opts, "name", "FX_STROBE");
    var out = [];
    if (kind !== "neg" && kind !== "white") throw new Error("flash_strobe: unknown strobe kind '" + kind + "' (neg, white)");

    for (var q = 0, i = 0; q < nFrames; q += every, i++) {
        var tq = t0 + q * fd;
        if (kind === "white") {
            var amt = Math.max(10, _fsOpt(opts, "amt", 85) - i * 9);
            out.push(cameraFlash(comp, tq, { amt: amt, decay: 1, scaleFps: false, name: base + " white +" + q,
                                             master: _fsOpt(opts, "master", true) }));
        } else {
            var I = _fsAdj(comp, base + " neg +" + q, tq, tq + fd);
            // add every effect first, then fetch properties (adding an effect invalidates earlier references)
            var fxp = I.property("ADBE Effect Parade");
            fxp.addProperty("ADBE Invert");
            fxp.addProperty("ADBE Tint");                         // Tint at 100 % = clean desaturate
            fxp.addProperty("ADBE Brightness & Contrast 2");
            fxp.property(2).property("Amount to Tint").setValue(100);
            fxp.property(3).property("Contrast").setValue(_fsOpt(opts, "contrast", 45));
            out.push(I);
        }
    }
    return out;
}

function invertPrelap(comp, tCut, opts) {
    var fd = comp.frameDuration;
    var tc = _fsSnap(comp, tCut);
    var mode = _fsOpt(opts, "mode", "prelap");
    var name = _fsOpt(opts, "name", "ADJ_INVERT");
    function inv(n, a, b) {
        var L = _fsAdj(comp, n, a, b);
        L.property("ADBE Effect Parade").addProperty("ADBE Invert");
        return L;
    }
    if (mode === "oncut") return [inv(name, tc, tc + 2 * fd)];
    if (mode !== "prelap") throw new Error("flash_strobe: unknown invert mode '" + mode + "' (prelap, oncut)");
    var pre = _fsFr(comp, _fsOpt(opts, "pre", 3), opts);
    var a = inv(name + " pre", tc - pre * fd, tc);
    var b = inv(name + " post", tc + fd, tc + 2 * fd);    // B's first frame stays clean, the second one blinks
    b.moveAfter(a);
    return [a, b];
}
