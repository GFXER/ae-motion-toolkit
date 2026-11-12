// noahsocold_mv.jsx : Jay Sia "How to Edit like NOAHSOCOLD (Full Music Video Breakdown)", BabyTron "Kill The Noise".
// Guide: private study notes (not included)   (part 2 = private study notes,
// addendum helpers = noahsocold_fx.jsx; warp puddle = timeremap_warp.jsx; datamosh = motion_mosh.jsx / datamosh_insert.jsx)
//
//   slowmoBreak(comp, clip, t0, opts)          Timewarp speed 100 -> 5 in 20 f (@30) + liquid puddle + flash on the
//                                              speed-back-up. The "breathing room" moment after a crazy section.
//   collageStrip(comp, src, t0, opts)          4 f rectangle chunks (one time-reversed), Tritone grey-blue + Posterize +
//                                              grain, scale bumps every 5 f, time-stretched 140 %
//   tickerStrip(comp, str, y, t0, t1, opts)    black band + repeated Arial Black text scrolling ("commercial strip")
//   moneyFace(comp, bill, faceSrc, tFace, opts) freeze-frame face, feathered ellipse, Tritone money tint, onto a bill
//   crtCard3D(comp, layers, opts)              precompose -> CRT look -> 3D card turned on Y (CRT seen at an angle)
//   ghostOverlay(comp, clip, opts)             scaled-up B/W crunchy duplicate at low opacity over the clip
//   psyDisplace(comp, layer, mapLayer, opts)   stock Displacement Map from a psychedelic/noise clip, very subtle
//
// Tutorial numbers at 1920x1080 / ~30 fps; pixels scale by comp.width/1920, frames by fps/30.
// NOTE: written 2026-10-20, NOT yet run in AE. Test once in a scratch comp before using in a build.

var NM_LBL = (typeof LBL !== "undefined") ? LBL : {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10};

function _nmo(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _nmlog(m) { try { $.writeln("[noahsocold_mv] " + m); } catch (e) {} }
function _nmerr(e) { return String(e.message) + " L" + e.line; }
function _nmK(comp) { return comp.width / 1920; }
function _nmF(comp, f30) { return f30 / 30; }   // seconds (same duration at any fps)
function _nmadd(L, names) { var fx = L.property("ADBE Effect Parade"), k; for (k = 0; k < names.length; k++) { try { return fx.addProperty(names[k]).name; } catch (e) {} } _nmlog("missing: " + names.join(", ")); return null; }
function _nmfx(L, n) { return n ? L.property("ADBE Effect Parade").property(n) : null; }
function _nmset(fx, ids, v) { var k, p; if (!fx) return false; for (k = 0; k < ids.length; k++) { try { p = fx.property(ids[k]); } catch (e) { p = null; } if (p) { try { p.setValue(v); return true; } catch (e2) { _nmlog("set " + ids[k] + ": " + _nmerr(e2)); } } } _nmlog("param not found: " + ids.join("/")); return false; }
function _nmprop(fx, ids) { var k, p; if (!fx) return null; for (k = 0; k < ids.length; k++) { try { p = fx.property(ids[k]); } catch (e) { p = null; } if (p) return p; } return null; }
function _nmease(p, outInf, inInf) { var k; if (!p) return; for (k = 1; k <= p.numKeys; k++) { try { p.setTemporalEaseAtKey(k, [new KeyframeEase(0, inInf)], [new KeyframeEase(0, outInf)]); } catch (e) {} } }
function _nmTritone(L, mid) {
    var n = _nmadd(L, ["ADBE Tritone"]), t = _nmfx(L, n);
    if (t) { t.property(1).setValue([1, 1, 1]); t.property(2).setValue(mid); t.property(3).setValue([0, 0, 0]); }
    return t;
}
function _nmGrit(L, levels, grain) {   // Posterize + mono noise (clipping ON, private study notes) = "ugly" photocopy grit
    var nP = _nmadd(L, ["ADBE Posterize"]), nN = _nmadd(L, ["ADBE Noise"]);
    _nmset(_nmfx(L, nP), [1], levels);
    var n = _nmfx(L, nN); _nmset(n, [1], grain); _nmset(n, [2], 0); _nmset(n, [3], 1);   // amount, colour off, clipping on
}

// 1) slow-mo break -------------------------------------------------------------------------------------------
function slowmoBreak(comp, clip, t0, opts) {
    var dur = _nmo(opts, "holdSec", 2.0);
    var nT = _nmadd(clip, ["ADBE Timewarp"]);
    var tw = _nmfx(clip, nT);
    _nmset(tw, ["Method", 1], 3);                                   // Pixel Motion (VERIFY index: 1 Whole 2 Mix 3 Pixel Motion)
    var sp = _nmprop(tw, ["Speed", 3]);
    if (sp) {
        sp.setValueAtTime(t0, 100); sp.setValueAtTime(t0 + _nmF(comp, 20), _nmo(opts, "slow", 5));
        sp.setValueAtTime(t0 + dur, _nmo(opts, "slow", 5)); sp.setValueAtTime(t0 + dur + _nmF(comp, 8), 100);
        _nmease(sp, 33, 75);
    }
    // liquid puddle: S_WarpPuddle if present (see timeremap_warp.jsx warpPuddle for the tuned envelope), else stock
    var nW = _nmadd(clip, ["S_WarpPuddle", "ADBE Turbulent Displace"]);
    var w = _nmfx(clip, nW);
    if (w && w.matchName === "ADBE Turbulent Displace") {
        _nmset(w, [2], 7); _nmset(w, [3], 100 * _nmK(comp));       // tutorial: amount 7, size ~100
        var ev = _nmprop(w, [6]); if (ev) ev.expression = "time*90";
    } else if (w) { _nmset(w, ["Amplitude", "Amount"], 0.03); }
    // camera-flash when it speeds back up: exposure spike on an adjustment layer, instant on, 6 f eased decay
    var a = comp.layers.addSolid([1,1,1], "ADJ_FLASH", comp.width, comp.height, 1);
    a.adjustmentLayer = true; a.label = NM_LBL.ADJ; a.moveToBeginning();
    var tf = t0 + dur; a.inPoint = tf - comp.frameDuration; a.outPoint = tf + _nmF(comp, 10);
    var nE = _nmadd(a, ["ADBE Exposure2"]), ex = _nmprop(_nmfx(a, nE), [3]);
    if (ex) { ex.setValueAtTime(tf, 2.2); ex.setValueAtTime(tf + _nmF(comp, 6), 0); _nmease(ex, 10, 70); }
    return {flash: a};
}

// 2) collage strip -------------------------------------------------------------------------------------------
// src = video layer. Creates a precomp-free stack of masked chunks; precompose afterwards if you need it nested.
function collageStrip(comp, src, t0, opts) {
    var k = _nmK(comp), fd = comp.frameDuration, n = _nmo(opts, "cells", 4), made = [], i;
    var cw = comp.width / n, ch = _nmo(opts, "height", comp.height * 0.28), cy = _nmo(opts, "y", comp.height * 0.5);
    for (i = 0; i < n; i++) {
        var L = src.duplicate(); L.name = "VID_COLLAGE_" + (i + 1); L.label = NM_LBL.VIDEO;
        L.startTime = t0 - src.inPoint + src.startTime - i * 4 * fd;    // each cell shows a different 4 f slice
        L.inPoint = t0; L.outPoint = t0 + _nmo(opts, "dur", 1.2);
        if (i % 2 === 1) { try { L.timeRemapEnabled = true; var tr = L.property("ADBE Time Remapping"); var a0 = tr.valueAtTime(L.inPoint, false), a1 = tr.valueAtTime(L.outPoint, false); while (tr.numKeys) tr.removeKey(1); tr.setValueAtTime(L.inPoint, a1); tr.setValueAtTime(L.outPoint, a0); } catch (e) { _nmlog("reverse: " + _nmerr(e)); } }
        var m = L.property("ADBE Mask Parade").addProperty("ADBE Mask Atom"), s = new Shape();
        var x0 = i * cw + 6 * k, x1 = (i + 1) * cw - 6 * k;
        s.vertices = [[x0, cy - ch / 2], [x1, cy - ch / 2], [x1, cy + ch / 2], [x0, cy + ch / 2]]; s.closed = true;
        m.property("ADBE Mask Shape").setValue(s);
        _nmTritone(L, _nmo(opts, "mid", [0.42, 0.50, 0.60]));          // grey-blue midtone
        _nmGrit(L, _nmo(opts, "posterize", 9), _nmo(opts, "grain", 4));
        // scale bumps every 5 f (hold keys): 100 -> 104 -> 100 ...
        var sc = L.property("ADBE Transform Group").property("ADBE Scale"), f, b = 0;
        L.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([(x0 + x1) / 2, cy]);
        L.property("ADBE Transform Group").property("ADBE Position").setValue([(x0 + x1) / 2, cy]);
        for (f = 0; f * 5 * fd < L.outPoint - t0; f++) {
            sc.setValueAtTime(t0 + f * 5 * fd, (b++ % 2) ? [104, 104] : [100, 100]);
        }
        for (f = 1; f <= sc.numKeys; f++) sc.setInterpolationTypeAtKey(f, KeyframeInterpolationType.HOLD);
        made.push(L);
    }
    _nmlog("collageStrip: precompose the cells and set Time Stretch 140 % for the tutorial's slower pace");
    return made;
}

// 3) ticker strip --------------------------------------------------------------------------------------------
function tickerStrip(comp, str, y, t0, t1, opts) {
    var k = _nmK(comp), h = _nmo(opts, "h", 70 * k);
    var band = comp.layers.addSolid([0,0,0], "SHP_TICKER_BAND", comp.width, Math.round(h), 1);
    band.label = NM_LBL.SHAPE; band.inPoint = t0; band.outPoint = t1;
    band.property("ADBE Transform Group").property("ADBE Position").setValue([comp.width / 2, y]);
    var rep = _nmo(opts, "repeat", 8), txt = "", i;
    for (i = 0; i < rep; i++) txt += str + "  ";
    var T = comp.layers.addText(txt); T.name = "TXT_TICKER"; T.label = NM_LBL.TEXT; T.inPoint = t0; T.outPoint = t1;
    var tdp = T.property("ADBE Text Properties").property("ADBE Text Document"), td = tdp.value;
    td.font = _nmo(opts, "font", "Arial-Black"); td.fontSize = h * 0.62; td.fillColor = _nmo(opts, "color", [1, 1, 1]);
    td.justification = ParagraphJustification.LEFT_JUSTIFY; tdp.setValue(td);
    var r = T.sourceRectAtTime(t0, false), p = T.property("ADBE Transform Group").property("ADBE Position");
    var yb = y + h * 0.22;
    p.setValueAtTime(t0, [0, yb]); p.setValueAtTime(t1, [-(r.width / 2), yb]);   // linear scroll, half its width
    return {band: band, text: T};
}

// 4) money face ----------------------------------------------------------------------------------------------
// bill = still of a bank note (pack asset), faceSrc = video layer with a clear face; tFace = source time to freeze.
function moneyFace(comp, bill, faceSrc, tFace, opts) {
    var F = faceSrc.duplicate(); F.name = "IMG_MONEYFACE"; F.label = NM_LBL.STILL; F.moveBefore(bill);
    try { F.timeRemapEnabled = true; var tr = F.property("ADBE Time Remapping"); while (tr.numKeys) tr.removeKey(1); tr.setValue(tFace); } catch (e) { _nmlog("freeze: " + _nmerr(e)); }
    var c = _nmo(opts, "center", [comp.width / 2, comp.height / 2]), rx = _nmo(opts, "rx", 260 * _nmK(comp)), ry = _nmo(opts, "ry", 330 * _nmK(comp));
    var m = F.property("ADBE Mask Parade").addProperty("ADBE Mask Atom"), s = new Shape(), K = 0.5523;
    s.vertices = [[c[0], c[1] - ry], [c[0] + rx, c[1]], [c[0], c[1] + ry], [c[0] - rx, c[1]]];
    s.inTangents = [[-rx * K, 0], [0, -ry * K], [rx * K, 0], [0, ry * K]];
    s.outTangents = [[rx * K, 0], [0, ry * K], [-rx * K, 0], [0, -ry * K]];
    s.closed = true;
    m.property("ADBE Mask Shape").setValue(s);
    m.property("ADBE Mask Feather").setValue([40 * _nmK(comp), 40 * _nmK(comp)]);
    F.property("ADBE Transform Group").property("ADBE Opacity").setValue(_nmo(opts, "opacity", 82));
    _nmTritone(F, _nmo(opts, "money", [0.52, 0.60, 0.44]));            // "ugly money tone"
    return F;
}

// 5) CRT card at an angle -----------------------------------------------------------------------------------
function crtCard3D(comp, layers, opts) {
    var idx = [], i;
    for (i = 0; i < layers.length; i++) idx.push(layers[i].index);
    var pc = comp.layers.precompose(idx, _nmo(opts, "name", "PC_CRT_CARD"), true);
    var L = comp.layer(Math.min.apply(null, idx));                      // the new precomp layer takes the top slot
    L.label = NM_LBL.PRECOMP;
    // CRT: Crates CRT Factory if it loads (tutorial used his Emulation FX at 70-100 %), else stock scanlines
    var nC = _nmadd(L, ["CRT Factory", "CRTFactory"]);
    if (!nC) {
        var nV = _nmadd(L, ["ADBE Venetian Blinds"]), nB = _nmadd(L, ["ADBE Gaussian Blur 2"]), nG = _nmadd(L, ["ADBE Glo2"]);
        var v = _nmfx(L, nV); _nmset(v, [1], 0.30); _nmset(v, [2], 90); _nmset(v, [3], 6 * _nmK(comp)); _nmset(v, [4], 2);   // completion, direction, width, feather
        _nmset(_nmfx(L, nB), [1], 1.5);
        var g = _nmfx(L, nG); _nmset(g, [2], 70); _nmset(g, [3], 20); _nmset(g, [4], 0.5);
    }
    L.threeDLayer = true;
    var o = L.property("ADBE Transform Group").property("ADBE Orientation");
    o.setValue([0, _nmo(opts, "yaw", 24), 0]);
    L.property("ADBE Transform Group").property("ADBE Scale").setValue([_nmo(opts, "scale", 115), _nmo(opts, "scale", 115), 100]);
    return L;
}

// 6) ghost overlay ------------------------------------------------------------------------------------------
function ghostOverlay(comp, clip, opts) {
    var G = clip.duplicate(); G.name = "FX_GHOST_" + clip.name; G.label = NM_LBL.LIGHT; G.moveBefore(clip);
    var fx = G.property("ADBE Effect Parade"); while (fx.numProperties) fx.property(1).remove();
    var nH = _nmadd(G, ["ADBE HUE SATURATION"]), nB = _nmadd(G, ["ADBE Brightness & Contrast 2"]);
    _nmGrit(G, _nmo(opts, "posterize", 7), _nmo(opts, "grain", 5));
    var nU = _nmadd(G, ["ADBE Unsharp Mask2", "ADBE Unsharp Mask"]);
    _nmset(_nmfx(G, nH), ["Master Saturation", 4], -100);
    var b = _nmfx(G, nB); _nmset(b, [1], 15); _nmset(b, [2], 45);
    var u = _nmfx(G, nU); _nmset(u, [1], 120); _nmset(u, [2], 6);
    var s = _nmo(opts, "scale", 108);
    G.property("ADBE Transform Group").property("ADBE Scale").setValue([s, s]);
    G.property("ADBE Transform Group").property("ADBE Opacity").setValue(_nmo(opts, "opacity", 35));
    return G;
}

// 7) psychedelic displacement --------------------------------------------------------------------------------
function psyDisplace(comp, layer, mapLayer, opts) {
    mapLayer.enabled = false; mapLayer.name = "MATTE_PSY_MAP"; mapLayer.label = NM_LBL.MATTE;
    var n = _nmadd(layer, ["ADBE Displacement Map"]), d = _nmfx(layer, n);
    _nmset(d, [1], mapLayer.index);                                   // Displacement Map Layer
    var amt = _nmo(opts, "amount", 12) * _nmK(comp);                  // "really really subtle"
    _nmset(d, [3], amt); _nmset(d, [5], amt);                          // max horizontal / vertical displacement
    _nmset(d, [6], 3);                                                 // Displacement Map Behavior: Stretch Map to Fit (VERIFY)
    _nmset(d, [7], 1);                                                 // Edge Behavior: Wrap Pixels Around
    return d;
}
