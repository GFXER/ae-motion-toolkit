// study_expensive_dark.jsx : "expensive dark" grade = compressed highlights, NOT crushed blacks
// (ref Video-89220 night gym vlog; guide private study notes colour looks). Lumetri can't be scripted,
// so: Shadow/Highlight (highlights -45, shadows +10) -> Exposure -0.4 -> Levels (out white .82, out black .015,
// gamma .96) -> Vibrance (sat -12) -> warm Photo Filter 4. Target stats: L99 ~ 135-170, < 5 % pixels below 4.
//   studyExpensiveDark(comp, o) -> adjustment layer ADJ_EXPENSIVE_DARK (whole comp; trim it yourself)
// (matchName is "ADBE ShadowHighlight", no slash; if it fails, falls back to Levels-only compression.)
// Params: exposure -0.4, highlights 45, shadows 10, outWhite 0.82, outBlack 0.015, gamma 0.96, sat -12, warm 4.
// Check: python3 grade_match.py (video-fx-tools) <ref> <render>. Use: night vlogs, event recaps.

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

function studyExpensiveDark(comp, o) {
  var L = STU.adj(comp, STU.o(o, "name", "ADJ_EXPENSIVE_DARK")), f;
  try { f = STU.fx(L, "ADBE ShadowHighlight"); STU.set(f, "Auto Amounts", false); STU.set(f, "Shadow Amount", STU.o(o, "shadows", 10)); STU.set(f, "Highlight Amount", STU.o(o, "highlights", 45)); }
  catch (e) { STU.log("Shadow/Highlight not addable here (" + String(e.message) + "), Levels-only highlight compression"); }
  f = STU.fx(L, "ADBE Exposure2"); STU.set(f, 3, STU.o(o, "exposure", -0.4));
  f = STU.fx(L, "ADBE Pro Levels2"); if (STU.o(o, "dump", false)) STU.dump(f);
  STU.set(f, "Output White", STU.o(o, "outWhite", 0.82)); STU.set(f, "Output Black", STU.o(o, "outBlack", 0.015)); STU.set(f, "Gamma", STU.o(o, "gamma", 0.96));
  f = STU.fx(L, "ADBE Vibrance"); STU.set(f, "Saturation", STU.o(o, "sat", -12)); STU.set(f, "Vibrance", STU.o(o, "vib", 6));
  f = STU.fx(L, "ADBE Photo Filter"); STU.set(f, "Density", STU.o(o, "warm", 4));
  return L;
}
