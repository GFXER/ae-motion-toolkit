// checker_wipe.jsx : checkerboard tile wipe through a cut, stock AE shape layers only. Not yet run in AE.
//   checkerWipe   square tiles spin in along a diagonal wave until the frame is covered, the cut happens under
//                 full cover, then the tiles spin out in the same order to reveal the next shot
//
// Why it works
//   The frame never moves: no push, no zoom, no geometry on the footage. That keeps it safe for talking-heads
//   and documentary cuts where a moving frame would misalign faces or text. Tiles alternate two colours (ink /
//   paper) with an optional third accent colour on a sparse pattern, so the cover reads as a graphic, not a
//   blackout. Odd tiles start a little later than even ones, so the wave looks woven instead of a flat sweep.
//
// Timing (frames are given at 30 fps and scaled to the comp rate, minimum 1 f)
//   n   = frames per wave (default 16 @30). Cover wave runs from the cut - n, reveal wave from the cut.
//   Each tile animates over 45 % of a wave; its delay is 55 % of the wave times its diagonal position, plus
//   18 % for odd tiles. Every tile is fully grown (100 %) by the cut frame and fully gone by cut + n.
//   Scale 0 -> 100 with rotation -90 -> 0 (in), then 100 -> 0 with 0 -> 90 (out): ease-out in, ease-in out.
//
// Usage
//   #include "checker_wipe.jsx"
//   checkerWipe(comp, tCut);                                         // 16 f waves, 135 px tiles at 1080 wide
//   checkerWipe(comp, tCut, {n: 12, cell: 180});
//   checkerWipe(comp, tCut, {a: [0.07,0.07,0.07], b: [0.95,0.94,0.92], accent: [0.89,0.12,0.12]});
//   checkerWipe(comp, tCut, {accent: null});                          // two colours only
//   checkerWipe(comp, tCut, {dir: "tr"});                             // wave starts top-right
//
// Options
//   n (frames @30 per wave, default 16), cell (tile px at 1080 wide, scaled to comp width, default 135),
//   a / b (tile colours, 0-1 RGB, defaults near-black / off-white), accent (0-1 RGB or null, default red),
//   accentEvery (1 accent tile per this many, default 23), dir ("tl" | "tr" | "bl" | "br", where the wave
//   starts, default "tl"), name, scaleFps (false = use n as given, no fps scaling)
// Returns the precomp layer. The precomp goes into the project root unless opts.folder (a FolderItem) is set.
// Sound: one soft click per wave, or a short paper/card flutter; no whoosh (the frame does not move).

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

var CW_COUNT = 0;

function _cwOpt(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }

function _cwFr(comp, f30, opts) {
    if (_cwOpt(opts, "scaleFps", true) === false) return Math.max(1, Math.round(f30));
    return Math.max(1, Math.round(f30 * (1 / comp.frameDuration) / 30));
}

function _cwSnap(comp, t) { var fd = comp.frameDuration; return Math.round(t / fd) * fd; }

// one filled square shape layer centred on (x, y)
function _cwTile(C, size, col, x, y) {
    var L = C.layers.addShape();
    L.name = "SHP_CHK";
    L.label = LBL.SHAPE;
    var g = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    var v = g.property("ADBE Vectors Group");
    v.addProperty("ADBE Vector Shape - Rect").property("ADBE Vector Rect Size").setValue([size, size]);
    v.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(col);
    var tr = L.property("ADBE Transform Group");
    tr.property("ADBE Anchor Point").setValue([0, 0]);
    tr.property("ADBE Position").setValue([x, y]);
    return L;
}

// two keys with ease: kind 1 = ease-out (fast start, long settle), kind 2 = ease-in (slow start, fast end)
function _cwKeys(p, t0, t1, v0, v1, kind) {
    p.setValueAtTime(t0, v0);
    p.setValueAtTime(t1, v1);
    var k0 = p.nearestKeyIndex(t0), k1 = p.nearestKeyIndex(t1);
    var dims = (v0 instanceof Array) ? v0.length : 1, e0 = [], e1 = [];
    var inf0 = (kind === 1) ? 10 : 80, inf1 = (kind === 1) ? 85 : 10;
    for (var i = 0; i < dims; i++) { e0.push(new KeyframeEase(0, inf0)); e1.push(new KeyframeEase(0, inf1)); }
    p.setTemporalEaseAtKey(k0, e0, e0);
    p.setTemporalEaseAtKey(k1, e1, e1);
}

function checkerWipe(comp, tCut, opts) {
    CW_COUNT++;
    var fd = comp.frameDuration;
    tCut = _cwSnap(comp, tCut);
    var n = _cwFr(comp, _cwOpt(opts, "n", 16), opts), d = n * fd;
    var cell = Math.round(_cwOpt(opts, "cell", 135) * comp.width / 1080);
    var cols = Math.ceil(comp.width / cell), rows = Math.ceil(comp.height / cell), maxk = Math.max(1, cols + rows - 2);
    var cA = _cwOpt(opts, "a", [0.07, 0.07, 0.07]), cB = _cwOpt(opts, "b", [0.95, 0.94, 0.92]);
    var acc = _cwOpt(opts, "accent", [0.89, 0.12, 0.12]), every = _cwOpt(opts, "accentEvery", 23);
    var dir = _cwOpt(opts, "dir", "tl");
    var pre = 2 * fd, len = pre + 2 * d + 2 * fd, tc = pre + d;          // tc = the cut inside the precomp
    var name = _cwOpt(opts, "name", "CHECKER_" + CW_COUNT);
    var C = app.project.items.addComp(name, comp.width, comp.height, comp.pixelAspect, len, 1 / fd);
    if (opts && opts.folder) C.parentFolder = opts.folder;

    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            var cc = (dir === "tr" || dir === "br") ? (cols - 1 - c) : c;
            var rr = (dir === "bl" || dir === "br") ? (rows - 1 - r) : r;
            var par = (r + c) % 2;
            var isAcc = acc && ((r * 7 + c * 3) % every === 0);
            var col = isAcc ? acc : (par ? cA : cB);
            var L = _cwTile(C, cell + 2, col, c * cell + cell / 2, r * cell + cell / 2);   // +2 px: no hairline gaps
            var k = (cc + rr) / maxk;
            var dl = k * d * 0.55 + par * d * 0.18, din = d * 0.45;
            if (dl + din > d) dl = d - din;                                // fully covered on the cut frame
            var tr = L.property("ADBE Transform Group");
            var sc = tr.property("ADBE Scale"), ro = tr.property("ADBE Rotate Z");
            sc.setValue([0, 0]);
            _cwKeys(sc, pre + dl, pre + dl + din, [0, 0], [100, 100], 1);
            _cwKeys(sc, tc + dl, tc + dl + din, [100, 100], [0, 0], 2);
            _cwKeys(ro, pre + dl, pre + dl + din, -90, 0, 1);
            _cwKeys(ro, tc + dl, tc + dl + din, 0, 90, 2);
        }
    }

    var P = comp.layers.add(C);
    P.name = "PC_" + name;
    P.label = LBL.PRECOMP;
    P.startTime = tCut - tc;
    P.inPoint = Math.max(0, tCut - tc);                                    // AE 26.5: inPoint first, then outPoint
    P.outPoint = tCut - tc + len;
    return P;
}
