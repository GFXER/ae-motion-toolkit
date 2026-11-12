// card_flip_silhouette_v2.jsx  -> cardTurnReveal(comp, opts)   (product-card turn + flip reveal, v2)
// 1. TURN: the blister card rotates 180deg IN PLANE (Rotation Z) around its centre, 1:2 ease
//    (accelerate turnAccel s, settle 2x, overshoot <=3deg), scale breathe 100->94->104, motion blur,
//    soft shadow follows.
// 2. HOLD upside-down (clean; the ghost film car is printed in the card art): only a very subtle
//    constant scale drift + idle float.
// 3. FLIP: at flipAt the (upside-down) card flips 180deg around Y (2.5D, 1:2 ease); the back face is
//    the movie still of the film car as an upright rounded photo card (+ optional title / caption pill).
//
// Usage:
//   $.evalFile(new File(".../ae-motion-toolkit/effects/card_flip_silhouette_v2.jsx"));
//   var R = cardTurnReveal(comp, {front:"/abs/r2_audi.png", still:"/abs/audi_r8.jpg", t:0.6,
//            caption:"Furious 7 \u00B7 Audi R8"});
// The comp needs a 3D camera (falls back to the default comp view if none).
//
// opts:
//   front, still   FootageItem or abs path (front = card PNG with alpha; still = film still)
//   name           suffix for layer/comp names (default "CARD")
//   t              turn start (s, default 0.5)
//   turnAccel      accelerate phase s (default 0.35); settle = 2x
//   turnOvershoot  deg, <=3 (default 2.5)
//   dir            "cw" | "ccw" (default "cw")
//   breathe        [mid, end] scale % during the turn (default [94,104])
//   holdDur        s from turn end to flip (default 1.0); flipAt overrides (absolute time)
//   flipAt         absolute time of the 2.5D flip (default turnEnd + holdDur)
//   flipAccel      s to 90deg (default 0.2); settle 2x; flipOvershoot deg (default 3)
//   drift          % extra scale drifted over the hold (default 1.5)
//   cardW          card width on screen px at z=0 (default 0.6*comp.width)
//   pos            [x,y,z] card centre (default comp centre)
//   float          idle float px (default 10; 0 = off)
//   stillFit       "framed" (default: blurred still bg + full-width photo) | "cover"
//   stillFocusX    0..1 horizontal focus of the still crop (default 0.5)
//   photoAspect    W/H of the photo window in "framed" mode (default 1.2)
//   title          bold white line above the photo ("" = none, framed mode)
//   caption        caption pill text ("" = none); font (default "Poppins-SemiBold"), titleFont ("Poppins-Bold")
//   shadow         true/false (default true); shadowOpacity (default 34)
// Returns {ctrl, turn, front, back, frontComp, backComp, shadows, turnEnd, flipAt, flipEnd}

function cardTurnReveal(comp, opts) {
  var o = opts || {};
  function d(k, v) { return (o[k] === undefined || o[k] === null) ? v : o[k]; }
  var NAME = d("name", "CARD");
  var T = d("t", 0.5), TA = d("turnAccel", 0.35), TS = 2 * TA;
  var TOV = Math.min(3, Math.max(0, d("turnOvershoot", 2.5)));
  var DIR = (d("dir", "cw") === "ccw") ? -1 : 1;
  var BR = d("breathe", [94, 104]);
  var TEND = T + TA + TS;
  var FAT = (o.flipAt !== undefined && o.flipAt !== null) ? o.flipAt : TEND + d("holdDur", 1.0);
  var FA = d("flipAccel", 0.2), FS = 2 * FA, FOV = Math.min(4, Math.max(0, d("flipOvershoot", 3)));
  var FEND = FAT + FA + FS;
  var CW = d("cardW", Math.round(comp.width * 0.6));
  var POS = d("pos", [comp.width / 2, comp.height / 2, 0]);
  var FLOAT = d("float", 10);
  var FONT = d("font", "Poppins-SemiBold"), TFONT = d("titleFont", "Poppins-Bold");

  function item(x) {
    if (typeof x !== "string") return x;
    var f = new File(x);
    if (!f.exists) throw new Error("cardTurnReveal: missing file " + x);
    for (var q = 1; q <= app.project.numItems; q++) {
      var it = app.project.item(q);
      if (it instanceof FootageItem && it.file && it.file.fsName === f.fsName) return it;
    }
    return app.project.importFile(new ImportOptions(f));
  }
  function folder(nm) {
    for (var q = 1; q <= app.project.numItems; q++) {
      var it = app.project.item(q);
      if (it instanceof FolderItem && it.name === nm) return it;
    }
    return app.project.items.addFolder(nm);
  }
  function tr(L) { return L.property("ADBE Transform Group"); }
  function ez(p, k, si, ii, so, oi) {
    var v = p.value, n0 = (v instanceof Array && !p.isSpatial) ? v.length : 1;
    var tries = [n0, 1, 2, 3];
    for (var q = 0; q < tries.length; q++) {
      var a = [], b = [];
      for (var j = 0; j < tries[q]; j++) { a.push(new KeyframeEase(si, ii)); b.push(new KeyframeEase(so, oi)); }
      try { p.setTemporalEaseAtKey(k, a, b); return; } catch (eE) {}
    }
  }
  function key(p, t, v) { p.setValueAtTime(t, v); return p.nearestKeyIndex(t); }
  function expo(p, t0, a, t1, b) {   // fast start, long settle
    var k0 = key(p, t0, a), k1 = key(p, t1, b);
    ez(p, k0, 0, 33, 0, 0.1); ez(p, k1, 0, 92, 0, 33);
  }
  function smooth(p, t0, a, t1, b, inf) {   // ease in/out
    var k0 = key(p, t0, a), k1 = key(p, t1, b);
    ez(p, k0, 0, 33, 0, inf || 70); ez(p, k1, 0, inf || 70, 0, 33);
  }
  function fx(L, mn) { return L.property("ADBE Effect Parade").addProperty(mn); }
  function efx(L, i) { return L.property("ADBE Effect Parade").property(i); }
  function rrect(c, nm, w, h, r, col, cx, cy) {
    var L = c.layers.addShape(); L.name = nm;
    var g = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    var v = g.property("ADBE Vectors Group");
    var rc = v.addProperty("ADBE Vector Shape - Rect");
    rc.property("ADBE Vector Rect Size").setValue([w, h]);
    rc.property("ADBE Vector Rect Roundness").setValue(r);
    v.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(col);
    tr(L).property("ADBE Anchor Point").setValue([0, 0]);
    tr(L).property("ADBE Position").setValue([cx, cy]);
    L.label = 4; return L;
  }
  function txt(c, nm, s, font, size, col, track, cx, cy) {
    var L = c.layers.addText(s); L.name = nm;
    var p = L.property("ADBE Text Properties").property("ADBE Text Document");
    var td = p.value; td.resetCharStyle(); td.resetParagraphStyle();
    td.font = font; td.fontSize = size; td.applyFill = true; td.fillColor = col; td.applyStroke = false;
    td.tracking = track; td.justification = ParagraphJustification.CENTER_JUSTIFY;
    p.setValue(td);
    var r = L.sourceRectAtTime(0, false);
    tr(L).property("ADBE Anchor Point").setValue([r.left + r.width / 2, r.top + r.height / 2]);
    tr(L).property("ADBE Position").setValue([cx, cy]);
    L.label = 2; return L;
  }
  function rectMask(L, x0, y0, x1, y1, feather, mode) {
    var m = L.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
    var sh = new Shape(); sh.vertices = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; sh.closed = true;
    m.property("ADBE Mask Shape").setValue(sh);
    m.property("ADBE Mask Feather").setValue([feather, feather]);
    m.maskMode = mode; return m;
  }

  var fItem = item(o.front), sItem = item(o.still);
  var k = CW / fItem.width;
  var BW = Math.round(fItem.width * k), BH = Math.round(fItem.height * k);
  var CN = "CTRL_" + NAME, TN = "CTRL_turn_" + NAME;
  var RAD = Math.round(CW * 0.05);
  var mods = null; try { mods = folder("20_MODULES"); } catch (e0) {}

  comp.motionBlur = true; comp.shutterAngle = 180; comp.shutterPhase = -90;
  try { comp.motionBlurSamplesPerFrame = 16; comp.motionBlurAdaptiveSampleLimit = 128; } catch (e1) {}

  // ---------------- FRONT precomp: card (upright image space) ----------------
  var FC = app.project.items.addComp("PC_cardFront_" + NAME, BW, BH, 1, comp.duration, comp.frameRate);
  if (mods) FC.parentFolder = mods;
  var card = FC.layers.add(fItem); card.name = "IMG_card";
  tr(card).property("ADBE Anchor Point").setValue([fItem.width / 2, fItem.height / 2]);
  tr(card).property("ADBE Position").setValue([BW / 2, BH / 2]);
  tr(card).property("ADBE Scale").setValue([k * 100, k * 100]);
  card.label = 9;
  // ---------------- BACK precomp: movie still as a rounded photo card ----------------
  var BC = app.project.items.addComp("PC_stillCard_" + NAME, BW, BH, 1, comp.duration, comp.frameRate);
  if (mods) BC.parentFolder = mods;
  var FIT = d("stillFit", "framed");
  var cover = Math.max(BW / sItem.width, BH / sItem.height) * 100;
  var bgS = BC.layers.add(sItem); bgS.name = "IMG_still_bg"; bgS.label = 9;
  var fxX = d("stillFocusX", 0.5);
  var coverX = BW / 2 + (0.5 - fxX) * (sItem.width * cover / 100 - BW);
  tr(bgS).property("ADBE Position").setValue([coverX, BH / 2]);
  if (FIT === "cover") {
    smooth(tr(bgS).property("ADBE Scale"), FAT, [cover * 1.06, cover * 1.06], FEND + 2.0, [cover, cover], 40);
  } else {
    tr(bgS).property("ADBE Scale").setValue([cover * 1.15, cover * 1.15]);
    fx(bgS, "ADBE Gaussian Blur 2"); efx(bgS, 1).property(1).setValue(Math.round(CW * 0.05));
    try { efx(bgS, 1).property(3).setValue(1); } catch (e5) {}
    fx(bgS, "ADBE Exposure2"); efx(bgS, 2).property(3).setValue(-1.6);
    // photo window: aspect photoAspect (W/H), the still cover-fits it (focus stillFocusX)
    var PA = d("photoAspect", 1.2);
    var PW = BW * 0.88, PH = Math.min(PW / PA, BH * 0.7), PY = BH * 0.48;
    var ps = Math.max(PW / sItem.width, PH / sItem.height) * 100;
    var PX = BW / 2 + (0.5 - fxX) * (sItem.width * ps / 100 - PW);
    var ph = BC.layers.add(sItem); ph.name = "IMG_still"; ph.label = 9;
    tr(ph).property("ADBE Position").setValue([PX, PY]);
    smooth(tr(ph).property("ADBE Scale"), FAT, [ps * 1.08, ps * 1.08], FEND + 2.0, [ps * 1.0, ps * 1.0], 40);
    var pm = rrect(BC, "MATTE_still", PW, PH, Math.round(CW * 0.03), [1, 1, 1], BW / 2, PY);
    pm.moveBefore(ph); ph.setTrackMatte(pm, TrackMatteType.ALPHA); pm.label = 7;
    // fixed frame for the photo (the image drifts inside it)
    var TTL = d("title", "");
    if (TTL !== "") {
      var tt = txt(BC, "TXT_title", TTL, TFONT, Math.round(CW * 0.075), [1, 1, 1], 0, BW / 2, PY - PH / 2 - CW * 0.09);
      var tr0 = tt.sourceRectAtTime(0, false);
      var tf = Math.min(100, BW * 0.86 / Math.max(1, tr0.width) * 100);
      tr(tt).property("ADBE Scale").setValue([tf, tf]);
      expo(tr(tt).property("ADBE Opacity"), FAT + FA + 0.15, 0, FAT + FA + 0.6, 100);
    }
  }
  var CAP = d("caption", "");
  if (CAP !== "") {
    var cy = (FIT === "cover") ? BH * 0.88 : Math.min(BH * 0.92, BH * 0.48 + Math.min(BW * 0.88 / d("photoAspect", 1.2), BH * 0.7) / 2 + CW * 0.1);
    var ct = txt(BC, "TXT_caption", CAP, FONT, Math.round(CW * 0.05), [0.07, 0.07, 0.08], 20, BW / 2, cy);
    var cr = ct.sourceRectAtTime(0, false);
    var cf = Math.min(100, BW * 0.74 / Math.max(1, cr.width) * 100);
    tr(ct).property("ADBE Scale").setValue([cf, cf]);
    var pw = cr.width * cf / 100 + CW * 0.07, phh = cr.height * cf / 100 + CW * 0.04;
    var pill = rrect(BC, "SHP_caption_pill", pw, phh, phh / 2, [1, 1, 1], BW / 2, cy);
    pill.moveAfter(ct);
    var t0c = FAT + FA + 0.25;
    expo(tr(pill).property("ADBE Scale"), t0c, [70, 70], t0c + 0.5, [100, 100]);
    expo(tr(pill).property("ADBE Opacity"), t0c, 0, t0c + 0.3, 100);
    expo(tr(ct).property("ADBE Opacity"), t0c + 0.08, 0, t0c + 0.4, 100);
    expo(tr(ct).property("ADBE Position"), t0c + 0.08, [BW / 2, cy + CW * 0.012], t0c + 0.5, [BW / 2, cy]);
  }
  // rounded card corners: stencil on top
  var stc = rrect(BC, "MATTE_card_corners", BW, BH, RAD, [1, 1, 1], BW / 2, BH / 2);
  stc.blendingMode = BlendingMode.STENCIL_ALPHA; stc.label = 7;

  // ---------------- MAIN comp rig ----------------
  var ctrl = comp.layers.addNull(comp.duration); ctrl.name = CN; ctrl.source.name = CN;
  ctrl.threeDLayer = true; ctrl.label = 1;
  var cT = tr(ctrl);
  cT.property("ADBE Anchor Point").setValue([50, 50, 0]);
  var turn = comp.layers.addNull(comp.duration); turn.name = TN; turn.source.name = TN;
  turn.threeDLayer = true; turn.label = 1;
  turn.parent = ctrl;   // parent FIRST, then set local values (parenting compensates)
  tr(turn).property("ADBE Anchor Point").setValue([50, 50, 0]);
  tr(turn).property("ADBE Position").setValue([50, 50, 0]);

  // TURN: rotation Z, 1:2, continuous through 90deg
  var rz = tr(turn).property("ADBE Rotate Z");
  var VZ = 90 / TA * 1.9;
  key(rz, T, 0); key(rz, T + TA, 90 * DIR);
  if (TOV > 0.05) {
    key(rz, T + TA + TS * 0.62, (180 + TOV) * DIR); key(rz, TEND + TS * 0.3, 180 * DIR);
    ez(rz, 1, 0, 33, 0, 68); ez(rz, 2, VZ, 30, VZ, 22); ez(rz, 3, 0, 75, 0, 55); ez(rz, 4, 0, 75, 0, 33);
  } else {
    key(rz, TEND, 180 * DIR);
    ez(rz, 1, 0, 33, 0, 68); ez(rz, 2, VZ, 30, VZ, 22); ez(rz, 3, 0, 88, 0, 33);
  }

  // SCALE: breathe on the turn, very subtle constant drift during the hold, back to 100 through the flip
  var DRIFT = d("drift", 1.5);   // % extra scale over the hold
  var sc = cT.property("ADBE Scale");
  var SH = BR[1] + DRIFT;
  key(sc, T, [100, 100, 100]); key(sc, T + TA, [BR[0], BR[0], 100]); key(sc, TEND, [BR[1], BR[1], 100]);
  key(sc, Math.max(TEND + 0.05, FAT), [SH, SH, 100]); key(sc, FEND + 0.15, [100, 100, 100]);
  ez(sc, 1, 0, 33, 0, 60); ez(sc, 2, 0, 50, 0, 40); ez(sc, 3, 0, 70, 0, 10); ez(sc, 4, 0, 10, 0, 40); ez(sc, 5, 0, 85, 0, 33);
  // POSITION: lift toward camera on the flip
  var cp = cT.property("ADBE Position");
  key(cp, FAT, POS); key(cp, FAT + FA, [POS[0], POS[1] - 30, POS[2] - 220]); key(cp, FEND + 0.15, POS);
  ez(cp, 1, 0, 33, 0, 40); ez(cp, 2, 0, 40, 0, 40); ez(cp, 3, 0, 85, 0, 33);
  if (FLOAT) cp.expression = "value + [0, " + FLOAT + "*Math.sin(time*1.2), 0]";
  // FLIP: rotation Y on the outer null (world vertical axis), 1:2
  var ry = cT.property("ADBE Rotate Y");
  var VY = 90 / FA * 1.9;
  key(ry, FAT, 0); key(ry, FAT + FA, 90);
  if (FOV > 0.05) {
    key(ry, FAT + FA + FS * 0.62, 180 + FOV); key(ry, FEND + FS * 0.35, 180);
    ez(ry, 1, 0, 33, 0, 68); ez(ry, 2, VY, 30, VY, 22); ez(ry, 3, 0, 75, 0, 55); ez(ry, 4, 0, 75, 0, 33);
  } else {
    key(ry, FEND, 180);
    ez(ry, 1, 0, 33, 0, 68); ez(ry, 2, VY, 30, VY, 22); ez(ry, 3, 0, 88, 0, 33);
  }
  if (FLOAT) ry.expression = "value + 2*Math.sin(time*0.8)";

  var FACE = "var n=toWorldVec([0,0,1]); var p=toWorld(anchorPoint); var c;" +
             "try{c=thisComp.activeCamera.toWorld([0,0,0]);}catch(e){c=[thisComp.width/2,thisComp.height/2,-2666.7];}" +
             "var v=sub(c,p); (dot(n,v)<0)?value:0;";
  var SHADE = "var r=thisComp.layer('" + CN + "').transform.yRotation*Math.PI/180; var s=Math.sin(r); -0.8*s*s;";

  var front = comp.layers.add(FC); front.name = "PC_cardFront_" + NAME; front.threeDLayer = true;
  front.startTime = 0; front.parent = turn; front.label = 10; front.motionBlur = true;
  tr(front).property("ADBE Anchor Point").setValue([BW / 2, BH / 2, 0]);
  tr(front).property("ADBE Position").setValue([50, 50, -1]);
  tr(front).property("ADBE Opacity").expression = FACE;
  fx(front, "ADBE Exposure2"); efx(front, 1).property(3).expression = SHADE;

  // back: child of the OUTER null, pre-rotated Y 180 -> upright and unmirrored after the flip
  var back = comp.layers.add(BC); back.name = "PC_stillCard_" + NAME; back.threeDLayer = true;
  back.startTime = 0; back.parent = ctrl; back.label = 10; back.motionBlur = true;
  tr(back).property("ADBE Anchor Point").setValue([BW / 2, BH / 2, 0]);
  tr(back).property("ADBE Position").setValue([50, 50, 1]);
  tr(back).property("ADBE Rotate Y").setValue(180);
  tr(back).property("ADBE Opacity").expression = FACE;
  fx(back, "ADBE Exposure2"); efx(back, 1).property(3).expression = SHADE;
  back.moveBefore(front);

  // ---------------- soft shadows: follow position/scale, turn with Z, squash with |cos Y| ----------------
  var shadows = [];
  if (d("shadow", true)) {
    var SOP = d("shadowOpacity", 34);
    var specs = [["FX_shadow_soft_" + NAME, 0.2, 1.0, 0.14, 520], ["FX_shadow_tight_" + NAME, 0.04, 0.55, 0.03, 140]];
    for (var si = 0; si < specs.length; si++) {
      var sp = specs[si];
      var sh = rrect(comp, sp[0], BW * 0.95, BH * 0.96, RAD, [0.12, 0.12, 0.14], 0, 0);
      sh.threeDLayer = true; sh.label = 5; sh.motionBlur = true;
      fx(sh, "ADBE Gaussian Blur 2"); efx(sh, 1).property(1).setValue(Math.round(CW * sp[1]));
      try { efx(sh, 1).property(3).setValue(0); } catch (e6) {}
      var sT = tr(sh);
      sT.property("ADBE Position").expression =
        "var C=thisComp.layer('" + CN + "'); var p=C.toWorld([50,50,0]); p+[0," + Math.round(CW * sp[3]) + "," + sp[4] + "];";
      sT.property("ADBE Rotate Z").expression = "thisComp.layer('" + TN + "').transform.zRotation";
      sT.property("ADBE Scale").expression =
        "var C=thisComp.layer('" + CN + "'); var r=C.transform.yRotation*Math.PI/180; var s=C.transform.scale[0]*1.03;" +
        "var dz=" + POS[2] + "-C.toWorld([50,50,0])[2]; var g=1+dz/2600;" +
        "var z=thisComp.layer('" + TN + "').transform.zRotation*Math.PI/180; var q=Math.max(0.04,Math.abs(Math.cos(r)));" +
        "[s*g*(1-(1-q)*Math.abs(Math.cos(z))), s*g*(1-(1-q)*Math.abs(Math.sin(z))), 100]";
      sT.property("ADBE Opacity").expression =
        "var C=thisComp.layer('" + CN + "'); var r=C.transform.yRotation*Math.PI/180;" +
        "var dz=" + POS[2] + "-C.toWorld([50,50,0])[2];" +
        (SOP * sp[2]) + "*(0.55+0.45*Math.abs(Math.cos(r)))*Math.max(0.5,1-dz/900)";
      shadows.push(sh);
    }
    for (var sj = 0; sj < shadows.length; sj++) shadows[sj].moveAfter(front);
  }
  return { ctrl: ctrl, turn: turn, front: front, back: back, frontComp: FC, backComp: BC, shadows: shadows,
           turnEnd: TEND, flipAt: FAT, flipEnd: FEND };
}
