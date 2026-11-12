// study_glitch_slices.jsx : horizontal slice bands filled with FOREIGN textures, reshuffled every 2-3 f
// (ref Video-98127 moto edit; private study notes).
//
//   studyGlitchPlates(comp, srcItems, t0, dur, o) -> builds 3 procedural/foreign plates (orange-cyan fractal
//        texture, kaleido of a clip, radial sunburst) and returns their layers (add the next shot yourself).
//   studyGlitchSlices(comp, plates, t0, dur, o)   -> every plate gets an expression-driven band matte;
//        each step (stepF frames) every band picks a random plate (or none = base shows through).
// Params: bands 8, stepF 2 (=16ths at ~160 BPM @30), minH 0.04, maxH 0.15 (of H), gap 0.35 (chance a band is
//        empty), jitter 30 px horizontal per step, seed.
// Use: 0.5-2.5 s bursts on intros / drops (fast, fast/diecast, trendy glitch). Never on dialogue.
// SFX: a glitch tick on EVERY reshuffle step (same grid, -26 dB) + soft sub slams on picture slams (-8 dB).
//      No whoosh involved, so it also fits no-whoosh projects.

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

function studyGlitchPlates(comp, srcItems, t0, dur, o) {
  var W = comp.width, H = comp.height, out = [], L, f;
  // 1 fractal texture tinted orange / cyan / purple
  L = STU.solid(comp, [0, 0, 0], "FX_GLITCH_TEX"); try { L.label = 5; } catch (e) {}
  f = STU.fx(L, "ADBE Fractal Noise"); STU.set(f, "Fractal Type", 9); STU.set(f, "Contrast", 260); STU.set(f, "Complexity", 3);
  STU.set(f, "Uniform Scaling", false); STU.set(f, "Scale Width", 900); STU.set(f, "Scale Height", 60);
  STU.expr(f, "Evolution", "Math.floor(time*15)*47;");
  f = STU.fx(L, "ADBE Tritone"); STU.set(f, 1, [1, 0.62, 0.12]); STU.set(f, 2, [0.05, 0.75, 0.95]); STU.set(f, 3, [0.25, 0.02, 0.35]);
  STU.inout(L, t0, t0 + dur); out.push(L);
  // 2 kaleido of a clip (mirror pattern)
  if (srcItems.length > 0) {
    L = STU.place(comp, srcItems[0], t0, t0 + dur, 0.3, "FX_GLITCH_KALEIDO");
    f = STU.fx(L, "CC Kaleida"); STU.set(f, "Size", 35);
    f = STU.fx(L, "ADBE HUE SATURATION"); try { f.property(4).setValue(140); } catch (e) {}
    out.push(L);
  }
  // 3 radial sunburst (stretched noise -> polar)
  L = STU.solid(comp, [0, 0, 0], "FX_GLITCH_SUNBURST"); try { L.label = 5; } catch (e) {}
  f = STU.fx(L, "ADBE Fractal Noise"); STU.set(f, "Contrast", 300); STU.set(f, "Brightness", -20);
  STU.set(f, "Uniform Scaling", false); STU.set(f, "Scale Width", 18); STU.set(f, "Scale Height", 4000); STU.expr(f, "Evolution", "time*900;");
  f = STU.fx(L, "ADBE Polar Coordinates"); STU.set(f, 1, 1); STU.set(f, 2, 1);
  f = STU.fx(L, "ADBE Tritone"); STU.set(f, 1, [1, 0.95, 0.75]); STU.set(f, 2, [0.95, 0.35, 0.55]); STU.set(f, 3, [0.08, 0.02, 0.2]);
  STU.inout(L, t0, t0 + dur); out.push(L);
  return out;
}

function studyGlitchSlices(comp, plates, t0, dur, o) {
  var N = STU.o(o, "bands", 8), stepF = STU.o(o, "stepF", 2), minH = STU.o(o, "minH", 0.04), maxH = STU.o(o, "maxH", 0.15);
  var gap = STU.o(o, "gap", 0.35), jit = STU.o(o, "jitter", 30), seed = STU.o(o, "seed", 11), P = plates.length, W = comp.width, H = comp.height;
  var mattes = [];
  for (var pi = 0; pi < P; pi++) {
    var M = comp.layers.addShape(); M.name = "MATTE_SLICES_" + pi; try { M.label = 7; } catch (e) {}
    for (var k = 0; k < N; k++) {
      var g = STU.rect(M, "band" + k, [W + 80, 10], [0, 0], [1, 1, 1]);
      var r = g.property("ADBE Vectors Group").property(1);
      var core = "var fd=thisComp.frameDuration; var st=Math.floor((time-" + t0 + ")/(fd*" + stepF + ")); seedRandom(" + seed + "+st*131+" + k + "*17,true);" +
        "var h=" + H + "*(" + minH + "+random()*" + (maxH - minH) + "); var y=random()*" + H + "; var r=random(); var ch=(r<" + gap + ")?-1:Math.floor((r-" + gap + ")/" + (1 - gap) + "*" + P + ");";
      r.property("ADBE Vector Rect Size").expression = core + "[" + (W + 80) + ", (ch==" + pi + ")?h:0];";
      r.property("ADBE Vector Rect Position").expression = core + "[0, y-" + (H / 2) + "];";
    }
    STU.inout(M, t0, t0 + dur);
    STU.tr(plates[pi]).property("ADBE Position").expression = "var fd=thisComp.frameDuration; var st=Math.floor((time-" + t0 + ")/(fd*" + stepF + ")); seedRandom(" + (seed + 999) + "+st*7+" + pi + ",true); value+[(random()-0.5)*" + (2 * jit) + ",0];";
    STU.matte(plates[pi], M, TrackMatteType.ALPHA); mattes.push(M);
  }
  return { mattes: mattes, steps: Math.ceil(dur / (comp.frameDuration * stepF)) };
}
