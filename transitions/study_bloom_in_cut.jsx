// study_bloom_in_cut.jsx : "bloom-in cut" (ref Video-25718 BMW M4 / G-wagon edit; guide
// private study notes (not included) §15 + summary table #1).
// A accelerates out over 4 f (scale 100->118 %, rot 0->6 deg, cubic-in); B starts over-exposed
// (Exposure +2.5 -> 0 over 4 f, ease-out) with S_Glow 1.5 -> 0 and settles 112 -> 100 % over 9 f (expo-out).
//   studyBloomInCut(comp, A, B, tCut, o)   A ends at tCut, B starts at tCut (caller trims them)
// Params: outF 4, inF 9, expF 4, exp 2.5, glow 1.5, aScale 18, aRot 6, bScale 12, useSGlow true, shutter 360, phase 0, bypassLinear true (gamma-space exposure).
// Use: every 2-beat cut in car/product/diecast edits, event-recap drops. 1:2 rule kept (4 out / 9 in).
// SFX: music-only edits need none (cut = beat). Otherwise shutter/glass click on the cut (no whoosh).

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

function studyBloomInCut(comp, A, B, tCut, o) {
  var outF = STU.o(o, "outF", 4), inF = STU.o(o, "inF", 9), expF = STU.o(o, "expF", 4);
  var as = STU.o(o, "aScale", 18) / 100, ar = STU.o(o, "aRot", 6), bs = STU.o(o, "bScale", 12) / 100;
  var ta = tCut - outF * comp.frameDuration;
  STU.tr(A).property("ADBE Scale").expression = STU.EO + "var e=cin((time-" + ta + ")/(" + outF + "*thisComp.frameDuration)); value*(1+" + as + "*e);";
  STU.tr(A).property("ADBE Rotate Z").expression = STU.EO + "var e=cin((time-" + ta + ")/(" + outF + "*thisComp.frameDuration)); value+" + ar + "*e;";
  STU.tr(B).property("ADBE Scale").expression = STU.EO + "var e=eo((time-" + tCut + ")/(" + inF + "*thisComp.frameDuration)); value*(1+" + bs + "*(1-e));";
  var ex = STU.fx(B, "ADBE Exposure2");
  // gamma-space exposure (Bypass Linear Light Conversion ON) = Premiere/Lumetri-like "+2.5"; linear light barely lifts dark club footage
  STU.set(ex, 22, STU.o(o, "bypassLinear", true) ? 1 : 0);
  STU.expr(ex, 3, STU.EO + STU.o(o, "exp", 2.5) + "*(1-cout((time-" + tCut + ")/(" + expF + "*thisComp.frameDuration)));");
  var g = null;
  if (STU.o(o, "useSGlow", true)) {
    try {
      g = STU.fx(B, "S_Glow"); if (STU.o(o, "dump", false)) STU.dump(g);
      STU.expr(g, "Brightness", STU.EO + STU.o(o, "glow", 1.5) + "*(1-cout((time-" + tCut + ")/(" + (expF + 2) + "*thisComp.frameDuration)));");
      STU.set(g, "Threshold", STU.o(o, "threshold", 0.6)); STU.set(g, "Width", STU.o(o, "glowWidth", 0.25));
    } catch (e) { STU.log("S_Glow fail " + String(e.message)); }
  }
  A.motionBlur = true; B.motionBlur = true; comp.motionBlur = true;
  try { comp.shutterAngle = STU.o(o, "shutter", 360); comp.shutterPhase = STU.o(o, "phase", 0); } catch (e) {}  // phase 0: B's first frame isn't half-sampled before its in point
  return { exposure: ex, glow: g };
}
