// study_difference_burn.jsx : procedural film-burn overlay in DIFFERENCE mode for 2-4 f on a jump cut
// (ref Video-52042 effect 3; guide private study notes §40). No burn footage needed:
// Fractal Noise (turbulent, animated fast) -> Tritone (orange / purple / black) -> Fast Box Blur, blend Difference.
// Black areas leave the picture untouched, the orange/purple blobs flip into thermal / psychedelic colours.
//   studyDifferenceBurn(comp, tCut, o)  -> overlay from tCut - preF to tCut + frames - preF
// Params: frames 3, preF 1, hi [1,.55,.1], mid [.55,.1,.85], sh [0,0,0], blur 40 (@1080), scale 500, seed.
// Use: talking-head jump cuts (1 per 8-10 s max), event-recap cuts (not on faces' key moments).
// SFX: short filmy crackle / tape stop flick at -22 dB; no whoosh.

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

function studyDifferenceBurn(comp, tCut, o) {
  var fd = comp.frameDuration, fr = STU.o(o, "frames", 3), pre = STU.o(o, "preF", 1), sc = comp.width / 1080;
  var L = STU.solid(comp, [0, 0, 0], STU.o(o, "name", "FX_BURN_DIFF")); try { L.label = 5; } catch (e) {}
  var f = STU.fx(L, "ADBE Fractal Noise"); STU.set(f, "Fractal Type", 9); STU.set(f, "Noise Type", 3);
  STU.set(f, "Contrast", STU.o(o, "contrast", 170)); STU.set(f, "Brightness", STU.o(o, "brightness", -10));
  STU.set(f, "Scale", STU.o(o, "scale", 500) * sc); STU.set(f, "Complexity", 4);
  STU.expr(f, "Evolution", "time*2400+" + (STU.o(o, "seed", 3) * 90) + ";");
  STU.expr(f, "Offset Turbulence", "[thisComp.width*0.5+" + (STU.o(o, "seed", 3) * 160) + "+time*900, thisComp.height*0.5-time*1400];");
  f = STU.fx(L, "ADBE Tritone"); STU.set(f, 1, STU.o(o, "hi", [1, 0.55, 0.1])); STU.set(f, 2, STU.o(o, "mid", [0.55, 0.1, 0.85])); STU.set(f, 3, STU.o(o, "sh", [0, 0, 0]));
  f = STU.fx(L, "ADBE Box Blur2"); STU.set(f, 1, STU.o(o, "blur", 40) * sc); STU.set(f, 2, 2);
  L.blendingMode = BlendingMode.DIFFERENCE;
  STU.inout(L, tCut - pre * fd, tCut + (fr - pre) * fd);
  return L;
}
