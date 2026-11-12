// study_luma_dissolve.jsx : speed-ramp (fast-slow-fast) per clip + Sapphire S_DissolveLuma at the SPEED PEAK
// (ref Video-23280 desk-setup BTS; guide private study notes (not included) §12 + table #2).
//   studyRampRemap(L, a, b, srcStart, o)  -> Time Remap expression: speed vPeak at a and b, vMid in the middle
//        (v(u) = vMid + (vPeak-vMid)*(2u-1)^2, integrated); needs src length (b-a)*(vMid+(vPeak-vMid)/3).
//   studyLumaDissolve(comp, B, tCut, o)   -> S_DissolveLuma on the upper layer B, Dissolve Percent 100->0 over 8 f centred
//        on tCut (B must start 4 f before tCut, A must end 4 f after). Bright parts of B come through first.
// Params: vPeak 4.0, vMid 0.3, frames 8, softness 0.3, blend ("FRAME_MIX" default; "PIXEL_MOTION" = smoother, slower).
// Use: product B-roll, desk/product close-ups, showcase. SFX: none needed on music edits; else a soft air swell.

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

function studyRampRemap(L, a, b, srcStart, o) {
  var vp = STU.o(o, "vPeak", 4.0), vm = STU.o(o, "vMid", 0.3);
  L.timeRemapEnabled = true;
  L.property("ADBE Time Remapping").expression = "var a=" + a + ", b=" + b + ", D=b-a; var u=Math.max(0,Math.min(1,(time-a)/D));" +
    "var F=" + vm + "*u+(" + (vp - vm) + ")*(Math.pow(2*u-1,3)+1)/6; var t=" + srcStart + "+D*F + (time>b?(time-b)*" + vp + ":0) + (time<a?(time-a)*" + vp + ":0);" +
    "Math.max(0, Math.min(thisLayer.source.duration-0.04, t));";
  var bt = STU.o(o, "blend", "FRAME_MIX");
  try { L.frameBlendingType = (bt == "PIXEL_MOTION") ? FrameBlendingType.PIXEL_MOTION : FrameBlendingType.FRAME_MIX; L.containingComp.frameBlending = true; } catch (e) {}
  return L;
}

function studyLumaDissolve(comp, B, tCut, o) {
  var fr = STU.o(o, "frames", 8), fd = comp.frameDuration, t0 = tCut - fr / 2 * fd, t1 = tCut + fr / 2 * fd;
  var d = STU.fx(B, "S_DissolveLuma"); if (STU.o(o, "dump", false)) STU.dump(d);
  var p = STU.prm(d, "Dissolve Percent") || STU.prm(d, "Percent") || STU.prm(d, "Amount");
  var top = STU.o(o, "max", 100);
  if (p) {
    p.setValueAtTime(t0, STU.o(o, "invert", false) ? 0 : top); p.setValueAtTime(t1, STU.o(o, "invert", false) ? top : 0); // Sapphire: 100 = B gone, 0 = B fully on
    p.setTemporalEaseAtKey(1, [new KeyframeEase(0, 33)], [new KeyframeEase(0, 33)]); p.setTemporalEaseAtKey(2, [new KeyframeEase(0, 80)], [new KeyframeEase(0, 80)]);
  }
  STU.set(d, "Softness", STU.o(o, "softness", 0.3));
  return d;
}
