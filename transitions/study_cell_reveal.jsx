// study_cell_reveal.jsx : "The Cell Reveal" (ref Video-98115; guide private study notes).
// Colorama colour-cycle (warm preset palette) whose Cycle Repetitions 1->3 and Blend With Original 0->100 %
// over ~2 s, while Sapphire S_WipeCells wipes the layer IN (cells grow) with Seed drifting +8.
// Graph: fast start, long ease-out (out influence ~10 %, in ~90 %).
//   studyCellReveal(comp, layer, t0, o)  layer = the image/shot to reveal (sits over the previous shot)
// + Tritone (hi cream / mid orange / shadow dark red) on top gives the ref warm cycle; its Blend keyed with Colorama.
// Params: dur 2.0 s, palette (Colorama preset index, default 8 = grey ramp), hi/mid/sh tritone colours, reps [1,3], blend [0,100], seedDrift 8,
//         wipeDur (default dur*0.6), invertWipe (flip if the wipe runs the wrong way on your Sapphire build).
// Use: product/photo reveals (clean/showcase, product cards). SFX: soft glassy "cell" granular texture
//      or a low air swell, one mid click on the land; no chime/sparkle.

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

function studyCellReveal(comp, L, t0, o) {
  var dur = STU.o(o, "dur", 2.0), wd = STU.o(o, "wipeDur", dur * 0.6), reps = STU.o(o, "reps", [1, 3]), bl = STU.o(o, "blend", [0, 100]);
  function ease(p) { for (var k = 1; k <= p.numKeys; k++) p.setTemporalEaseAtKey(k, [new KeyframeEase(0, k == 1 ? 10 : 90)], [new KeyframeEase(0, k == 1 ? 10 : 90)]); }
  var c = STU.fx(L, "APC Colorama");
  var pal = STU.prm(c, "Use Preset Palette"); if (pal) { try { pal.setValue(STU.o(o, "palette", 8)); /* 8 = grey ramp cycle (tested 5..12: 5 red, 6 green, 7 blue, 8 grey, 9 hue-ish, 10 cyan) */ } catch (e) { STU.log("palette fail " + String(e.message)); } }
  var cr = STU.prm(c, "Cycle Repetitions"); if (cr) { cr.setValueAtTime(t0, reps[0]); cr.setValueAtTime(t0 + dur, reps[1]); ease(cr); }
  var bw = STU.prm(c, "Blend With Original"); if (bw) { bw.setValueAtTime(t0, bl[0]); bw.setValueAtTime(t0 + dur, bl[1]); ease(bw); }
  // warm tint of the (grey-ramp) cycle: red -> orange -> cream, faded out with the same blend keys
  var tt = STU.fx(L, "ADBE Tritone"); STU.set(tt, 1, STU.o(o, "hi", [1, 0.93, 0.8])); STU.set(tt, 2, STU.o(o, "mid", [0.95, 0.42, 0.12])); STU.set(tt, 3, STU.o(o, "sh", [0.35, 0.03, 0.03]));
  var tb = STU.prm(tt, 4); if (tb) { tb.setValueAtTime(t0, bl[0]); tb.setValueAtTime(t0 + dur, bl[1]); ease(tb); }
  var w = STU.fx(L, "S_WipeCells");
  if (STU.o(o, "dump", false)) STU.dump(w);
  var wp = STU.prm(w, "Wipe Percent") || STU.prm(w, "Percent");
  var inv = STU.o(o, "invertWipe", false);
  if (wp) { wp.setValueAtTime(t0, inv ? 0 : 100); wp.setValueAtTime(t0 + wd, inv ? 100 : 0); ease(wp); }
  var sd = STU.prm(w, "Seed"); if (sd) { var s0 = sd.value; sd.setValueAtTime(t0, s0); sd.setValueAtTime(t0 + wd, s0 + STU.o(o, "seedDrift", 8)); }
  return { colorama: c, wipe: w };
}
