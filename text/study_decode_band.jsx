// study_decode_band.jsx : letter-decode title + letterbox band window opener (refs Video-42366 "SWITZERLAND",
// Video-54805 "a recap of AUGUST"; guide private study notes (not included) §32/§42).
//
//   studyBandWindow(comp, items, tStart, tGrow, o)  -> footage montage inside a thin horizontal band (4-6 % H),
//        hard cut every 2-3 f, then the band grows to full frame expo-out (~45 f) on the hero clip.
//   studyDecodeTitle(comp, word, t0, o)             -> red condensed caps decoding random -> final, left->right,
//        + small white kicker line above. Call AFTER studyBandWindow so the title sits on top.
// Typical: kicker t0-0.4 s, decode 18-30 f, band opens ~0.6 s after the lock, grow 1-1.5 s later.
// SFX: a quiet high tick (-27 dB, ~5 kHz, e.g. <sfx-library>/ click/tick) on every letter refresh,
//      no whoosh; a soft sub when the band reaches full frame.
// Turkish/Azerbaijani: pass the word already upper-cased in Python (i->İ); pool letters default A-Z.

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

function studyDecodeTitle(comp, word, t0, o) {
  var fd = comp.frameDuration, W = comp.width, H = comp.height;
  var size = STU.o(o, "size", Math.round(W * 0.2)), y = STU.o(o, "y", Math.round(H * 0.5 + size * 0.36)); // baseline; caps centred on H/2 = band centre
  var durF = STU.o(o, "durF", 24), refF = STU.o(o, "refreshF", 2), seed = STU.o(o, "seed", 7);
  var pool = STU.o(o, "pool", "ABCDEFGHIJKLMNOPRSTUVYZ");
  var tOut = STU.o(o, "tOut", comp.duration);
  var T = comp.layers.addText(word); T.name = "TXT_DECODE"; try { T.label = 2; } catch (e) {}
  var tdp = T.property("ADBE Text Properties").property("ADBE Text Document"); var d = tdp.value;
  d.resetCharStyle(); d.font = STU.o(o, "font", "Anton-Regular"); d.fontSize = size; d.applyFill = true; d.applyStroke = false;
  d.fillColor = STU.o(o, "color", [0.784, 0.063, 0.18]); d.tracking = STU.o(o, "tracking", 10);
  d.justification = ParagraphJustification.CENTER_JUSTIFY; tdp.setValue(d);
  STU.tr(T).property("ADBE Position").setValue([W / 2, y]);
  var esc = word.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  tdp.expression = 'var F="' + esc + '", P="' + pool + '"; var fd=thisComp.frameDuration; var dt=time-' + t0 + '; var out="";' +
    'if (dt>=0){ var n=F.length, dur=' + durF + '*fd; var k=Math.floor(dt/(fd*' + refF + ')); seedRandom(' + seed + '+k*13,true);' +
    ' for (var i=0;i<n;i++){ var c=F.charAt(i); if (c==" "){out+=" ";continue;} if (dt>=(i+1)/n*dur) out+=c; else out+=P.charAt(Math.floor(random()*P.length)); } } out;';
  STU.inout(T, Math.max(0, t0 - fd), tOut);
  var K = null, ktxt = STU.o(o, "kicker", "");
  if (ktxt) {
    var ks = STU.o(o, "kickerSize", Math.round(W * 0.045)), tk = STU.o(o, "kickerT", t0 - 0.4);
    K = comp.layers.addText(ktxt); K.name = "TXT_KICKER"; try { K.label = 2; } catch (e) {}
    var kp = K.property("ADBE Text Properties").property("ADBE Text Document"); var kd = kp.value;
    kd.resetCharStyle(); kd.font = STU.o(o, "kickerFont", "Inter-SemiBold"); kd.fontSize = ks; kd.applyFill = true; kd.applyStroke = false;
    kd.fillColor = [1, 1, 1]; kd.tracking = STU.o(o, "kickerTracking", 60); kd.justification = ParagraphJustification.CENTER_JUSTIFY; kp.setValue(kd);
    var ky = y - size * 0.86 - ks * 0.6;
    STU.tr(K).property("ADBE Position").expression = STU.EO + "var p=(time-" + tk + ")/(10*thisComp.frameDuration); [" + (W / 2) + ", " + ky + "+18*(1-eo(p))];";
    STU.tr(K).property("ADBE Opacity").expression = STU.EO + "100*eo((time-" + tk + ")/(8*thisComp.frameDuration));";
    var bl = STU.fx(K, "ADBE Gaussian Blur 2"); STU.expr(bl, 1, STU.EO + "12*(1-eo((time-" + tk + ")/(10*thisComp.frameDuration)));");
    STU.inout(K, Math.max(0, tk), tOut);
  }
  return { title: T, kicker: K, lockTime: t0 + durF * fd };
}

function studyBandWindow(comp, items, tStart, tGrow, o) {
  var fd = comp.frameDuration, W = comp.width, H = comp.height;
  var bandH = STU.o(o, "bandH", 0.05), cuts = STU.o(o, "cutF", [2, 3, 2, 2, 3]), growF = STU.o(o, "growF", 45);
  var yc = STU.o(o, "y", H / 2), tEnd = STU.o(o, "tEnd", comp.duration), hero = STU.o(o, "hero", items.length - 1);
  var openF = STU.o(o, "openF", 6);
  var pc = app.project.items.addComp(STU.o(o, "name", "PC_BAND_MONTAGE"), W, H, 1, comp.duration, comp.frameRate);
  var t = tStart, k = 0;
  while (t < tGrow - fd * 0.5) {
    var n = cuts[k % cuts.length], te = Math.min(t + n * fd, tGrow), it = items[k % items.length];
    var off = (k * 0.37) % Math.max(0.1, it.duration - 0.4);
    STU.place(pc, it, t, te, off, "VID_BAND_" + k); k++; t = te;
  }
  STU.place(pc, items[hero], tGrow, tEnd, 0, "VID_BAND_HERO");
  var P = comp.layers.add(pc); P.name = "PC_BAND_MONTAGE"; try { P.label = 10; } catch (e) {} STU.inout(P, tStart, tEnd);
  var M = comp.layers.addShape(); M.name = "MATTE_BAND"; try { M.label = 7; } catch (e) {}
  var g = STU.rect(M, "band", [W + 8, H * bandH], [0, yc - H / 2], [1, 1, 1]);
  var r = g.property("ADBE Vectors Group").property(1);
  var head = STU.EO + "var fd=thisComp.frameDuration; var a=eo((time-" + tStart + ")/(" + openF + "*fd)); var e=eo((time-" + tGrow + ")/(" + growF + "*fd)); var h0=" + (H * bandH) + ";";
  r.property("ADBE Vector Rect Size").expression = head + "[" + (W + 8) + ", h0*a+(" + (H + 8) + "-h0)*e];";
  r.property("ADBE Vector Rect Position").expression = head + "[0," + (yc - H / 2) + "*(1-e)];";
  STU.inout(M, tStart, tEnd); STU.matte(P, M, TrackMatteType.ALPHA);
  return { precomp: pc, layer: P, matte: M, fullAt: tGrow + growF * fd };
}
