// study_flash_box.jsx : "flash box" = show examples while talking (ref Video-52042 effect 1; guide
// private study notes §40). The presenter shrinks (expo-out) from full frame into a rounded window on the
// RIGHT over a dark starfield; the LEFT window plays a B-roll slideshow that hard-cuts every 8 f with a 1 f
// exposure flash on each swap. Caption can sit between/under the windows.
//   studyFlashBox(comp, presenterItem, presenterOff, brollItems, t0, t1, o)
// Params: cutF 8, flashF 1, flashExp 2.2, winW 0.46*W, aspect 1.25 (4:5), y 0.45*H, gap 0.04*W, round 34 (@1080),
//         shrinkF 14, faceY (0..1, vertical crop point in the presenter window, default 0.38).
// Use: talking-head/ad + facecam "examples" sections. Never cover the face: the window shows the whole face.
// SFX: a soft click/shutter on each B-roll swap (-26 dB), one low "settle" thud when the presenter lands.

// ---- STU helpers (shared by every study_*.jsx; guarded, identical copy in each file) ----
if (typeof STU === "undefined") { var STU = {}; }
if (!STU.ok) {
  STU.ok = true;
  STU.o = function (o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; };
  STU.log = function (s) { try { if (typeof log === "function") log(s); else $.writeln(s); } catch (e) {} };
  STU.fx = function (L, mn) { return L.property("ADBE Effect Parade").addProperty(mn); };
  STU.tr = function (L) { return L.property("ADBE Transform Group"); };
  // find an effect param by matchName / exact display name / name substring; logs the param list when missing
  STU.prm = function (fx, key) {
    if (typeof key === "number") return fx.property(key);
    var k = String(key).toLowerCase(), j, q;
    for (j = 1; j <= fx.numProperties; j++) { q = fx.property(j); if (q.matchName.toLowerCase() === k || q.name.toLowerCase() === k) return q; }
    for (j = 1; j <= fx.numProperties; j++) { q = fx.property(j); if (q.name.toLowerCase().indexOf(k) >= 0) return q; }
    var names = []; for (j = 1; j <= fx.numProperties; j++) names.push(fx.property(j).name);
    STU.log("STU.prm: no '" + key + "' in " + fx.matchName + " [" + names.join("|") + "]"); return null;
  };
  STU.set = function (fx, key, v) { var q = STU.prm(fx, key); if (q) { try { q.setValue(v); } catch (e) { STU.log("STU.set " + key + " fail: " + String(e.message)); } } return q; };
  STU.expr = function (fx, key, s) { var q = STU.prm(fx, key); if (q) { try { q.expression = s; } catch (e) { STU.log("STU.expr " + key + " fail: " + String(e.message)); } } return q; };
  STU.dump = function (fx) { var n = []; for (var j = 1; j <= fx.numProperties; j++) n.push(j + ":" + fx.property(j).name); STU.log(fx.matchName + " -> " + n.join(" | ")); };
  STU.hold = function (prop, kv) {
    for (var j = 0; j < kv.length; j++) prop.setValueAtTime(kv[j][0], kv[j][1]);
    for (var k = 1; k <= prop.numKeys; k++) prop.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
  };
  // AE 26.5: setting inPoint moves outPoint -> always in first, then out
  STU.inout = function (L, a, b) { L.inPoint = a; L.outPoint = b; };
  STU.solid = function (comp, col, name) { return comp.layers.addSolid(col, name, comp.width, comp.height, 1, comp.duration); };
  STU.adj = function (comp, name) { var L = STU.solid(comp, [1, 1, 1], name); L.adjustmentLayer = true; try { L.label = 3; } catch (e) {} return L; };
  STU.cover = function (L, w, h) {
    var s = Math.max(w / L.source.width, h / L.source.height) * 100;
    STU.tr(L).property("ADBE Scale").setValue([s, s]); STU.tr(L).property("ADBE Position").setValue([w / 2, h / 2]);
  };
  // ping-pong time remap so short clips never go blank; off = source offset (s)
  STU.loop = function (L, off) {
    L.timeRemapEnabled = true;
    L.property("ADBE Time Remapping").expression = "var d=thisLayer.source.duration-0.06; var t=time-thisLayer.inPoint+" + (off || 0) + "; t=t%(2*d); t>d?2*d-t:t;";
  };
  // add a footage item to comp, cover-fit, looped, trimmed to [a,b)
  STU.place = function (comp, item, a, b, off, name) {
    var L = comp.layers.add(item); STU.cover(L, comp.width, comp.height);
    STU.loop(L, off || 0); L.startTime = 0; STU.inout(L, a, b); if (name) L.name = name; try { L.label = 8; } catch (e) {} return L;
  };
  STU.EO = "function eo(p){p=Math.max(0,Math.min(1,p));return p>=1?1:1-Math.pow(2,-10*p);} function cin(p){p=Math.max(0,Math.min(1,p));return p*p*p;} function cout(p){p=Math.max(0,Math.min(1,p));return 1-Math.pow(1-p,3);} ";
  // add a rectangle group (+fill) to a shape layer; returns the group
  STU.rect = function (S, name, size, pos, col, round) {
    var g = S.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"); g.name = name;
    var c = g.property("ADBE Vectors Group");
    c.addProperty("ADBE Vector Shape - Rect"); c.addProperty("ADBE Vector Graphic - Fill");
    var r = c.property(1); r.property("ADBE Vector Rect Size").setValue(size); r.property("ADBE Vector Rect Position").setValue(pos);
    if (round) r.property("ADBE Vector Rect Roundness").setValue(round);
    c.property(2).property("ADBE Vector Fill Color").setValue(col || [1, 1, 1]);
    return S.property("ADBE Root Vectors Group").property(S.property("ADBE Root Vectors Group").numProperties);
  };
  STU.matte = function (L, M, type) { M.moveBefore(L); L.trackMatteType = type || TrackMatteType.ALPHA; };
}
// ---- end STU helpers ----

function studyFlashBox(comp, presenterItem, presenterOff, broll, t0, t1, o) {
  var fd = comp.frameDuration, W = comp.width, H = comp.height, sc = W / 1080;
  var ww = Math.round(STU.o(o, "winW", 0.46) * W), wh = Math.round(ww * STU.o(o, "aspect", 1.25)), gap = STU.o(o, "gap", 0.04) * W;
  var cy = STU.o(o, "y", 0.45) * H, rnd = STU.o(o, "round", 34) * sc, shF = STU.o(o, "shrinkF", 14), cutF = STU.o(o, "cutF", 8);
  var xR = W / 2 + gap / 2 + ww / 2, xL = W / 2 - gap / 2 - ww / 2;
  // starfield BG
  var BG = STU.solid(comp, [0, 0, 0], "IMG_FLASHBOX_STARS"); try { BG.label = 9; } catch (e) {}
  var f = STU.fx(BG, "ADBE Fractal Noise"); STU.set(f, "Contrast", 900); STU.set(f, "Brightness", -440); STU.set(f, "Scale", 9 * sc);
  STU.set(f, "Complexity", 1); STU.expr(f, "Evolution", "time*20;");
  try { f = STU.fx(BG, "S_Glow"); STU.set(f, "Brightness", 1.4); STU.set(f, "Glow Width", 0.05); } catch (e) { STU.log("stars glow skipped " + String(e.message)); }
  STU.inout(BG, t0, t1);
  // presenter window comp
  var pp = app.project.items.addComp("PC_FLASHBOX_PRESENTER", ww, wh, 1, comp.duration, comp.frameRate);
  var PL = pp.layers.add(presenterItem); STU.loop(PL, presenterOff); PL.startTime = 0; STU.inout(PL, 0, comp.duration);
  var s = Math.max(ww / presenterItem.width, wh / presenterItem.height) * 100; STU.tr(PL).property("ADBE Scale").setValue([s, s]);
  var fy = STU.o(o, "faceY", 0.38), ph = presenterItem.height * s / 100;
  STU.tr(PL).property("ADBE Position").setValue([ww / 2, Math.min(ph / 2, Math.max(wh - ph / 2, wh * 0.5 + (0.5 - fy) * (ph - wh)))]);
  var M1 = pp.layers.addShape(); M1.name = "MATTE_ROUND"; STU.rect(M1, "r", [ww, wh], [0, 0], [1, 1, 1], rnd); STU.matte(PL, M1, TrackMatteType.ALPHA);
  // broll window comp
  var bp = app.project.items.addComp("PC_FLASHBOX_BROLL", ww, wh, 1, comp.duration, comp.frameRate);
  var t = t0 + shF * 0.5 * fd, k = 0;
  while (t < t1 - fd * 0.5) {
    var it = broll[k % broll.length], te = Math.min(t1, t + cutF * fd);
    var BL = STU.place(bp, it, t, te, (k * 0.29) % Math.max(0.1, it.duration - 0.5), "VID_BROLL_" + k); k++; t = te;
  }
  var FA = STU.adj(bp, "ADJ_SWAP_FLASH"); var ex = STU.fx(FA, "ADBE Exposure2");
  STU.set(ex, 22, 1); STU.expr(ex, 3, "var fd=thisComp.frameDuration; var k=Math.round((time-" + (t0 + shF * 0.5 * fd) + ")/fd); (k>=0 && (k%" + cutF + ")<" + STU.o(o, "flashF", 1) + ")?" + STU.o(o, "flashExp", 2.2) + ":0;");
  var M2 = bp.layers.addShape(); M2.name = "MATTE_ROUND"; STU.rect(M2, "r", [ww, wh], [0, 0], [1, 1, 1], rnd);
  // matte everything below by a precomp-wide alpha: precompose content first
  var inner = []; for (var i = 2; i <= bp.numLayers; i++) inner.push(i);
  var sub = bp.layers.precompose(inner, "PC_FLASHBOX_BROLL_CUTS", true); var SL = bp.layer(2); STU.matte(SL, bp.layer(1), TrackMatteType.ALPHA);
  // place in main comp
  var B = comp.layers.add(bp); B.name = "PC_FLASHBOX_BROLL"; try { B.label = 10; } catch (e) {} STU.inout(B, t0, t1);
  var tb = t0 + shF * 0.5 * fd;
  STU.tr(B).property("ADBE Position").setValue([xL, cy]);
  STU.tr(B).property("ADBE Scale").expression = STU.EO + "var e=eo((time-" + tb + ")/(12*thisComp.frameDuration)); var v=80+20*e; [v,v];";
  STU.tr(B).property("ADBE Opacity").expression = STU.EO + "100*eo((time-" + tb + ")/(5*thisComp.frameDuration));";
  var P = comp.layers.add(pp); P.name = "PC_FLASHBOX_PRESENTER"; try { P.label = 10; } catch (e) {} STU.inout(P, t0, t1);
  var s0 = Math.max(W / ww, H / wh) * 100;
  STU.tr(P).property("ADBE Scale").expression = STU.EO + "var e=eo((time-" + t0 + ")/(" + shF + "*thisComp.frameDuration)); var v=" + s0 + "+(100-" + s0 + ")*e; [v,v];";
  STU.tr(P).property("ADBE Position").expression = STU.EO + "var e=eo((time-" + t0 + ")/(" + shF + "*thisComp.frameDuration)); [" + (W / 2) + "+(" + (xR - W / 2) + ")*e, " + (H / 2) + "+(" + (cy - H / 2) + ")*e];";
  var ds = STU.fx(P, "ADBE Drop Shadow"); STU.set(ds, "Opacity", 0.55 * 255); STU.set(ds, "Distance", 18 * sc); STU.set(ds, "Softness", 60 * sc);
  ds = STU.fx(B, "ADBE Drop Shadow"); STU.set(ds, "Opacity", 0.55 * 255); STU.set(ds, "Distance", 18 * sc); STU.set(ds, "Softness", 60 * sc);
  P.motionBlur = true; B.motionBlur = true;
  return { presenter: P, broll: B, bg: BG };
}
