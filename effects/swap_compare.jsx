// swap_compare.jsx -> swapCompare(comp, opts)   (product colour / decal swap compare)
// One or more car "columns" side by side in 3D. Under each car: two rounded colour chips (BODY / DEKAL)
// with labels. Per column, one of two moves:
//   mode "swap": at t the two chips trade places on an arc (one over the top toward camera, one under),
//                1:2 ease (accelerate accel s, settle 2x), motion blur; labels cross-fade to the new hex at
//                mid-flight; at tReveal the car cross-reveals to imgAfter (diagonal feathered wipe or 2.5D flip).
//   mode "roll": slot-machine roll - the BODY chip rolls (through 2 in-between colours) to after.body at t,
//                the DEKAL chip rolls to after.decal at tDecal; car reveal at tReveal.
// Clean agency look: white void, rounded chips with white rim + soft shadow, Inter, accent #E20A12.
//
// Usage:
//   $.evalFile(new File(".../ae-motion-toolkit/effects/swap_compare.jsx"));
//   var R = swapCompare(comp, { columns: [ {x:560, img:"/abs/orig.png", imgAfter:"/abs/remix.png",
//            body:"#E58CB8", decal:"#F4F1F3", mode:"swap", t:1.2, header:"Honda S2000", sub:"Film",
//            subAfter:"Graphics Remix"} ] });
// The comp should have a 3D camera (works without one too).
//
// opts (all optional except columns):
//   columns[]      {x, img, imgAfter, body, decal, after:{body,decal}, mode:"swap"|"roll", t, tDecal,
//                   tReveal, reveal:"wipe"|"flip", header, sub, subAfter, tIn, carW, flipX, flipXAfter}
//                   colours = "#RRGGBB" or [r,g,b] 0-1. imgAfter optional (no reveal if missing).
//   y              car centre y (default 0.42*h)   carW (default 0.40*w)   z (default 0)
//   chip           chip size px (default 250)  chipGap (default 70)  chipDY (gap car-centre -> chip centre, default 470)
//   radius         chip roundness px (default 56)  rim px (default 10)
//   labels         ["BODY","DEKAL"]   showHex (default true)
//   accel          s accelerate (default 0.18) -> total move 3*accel (1:2 rule)
//   arc            swap arc height px (default 120)
//   accent         [r,g,b] (default #E20A12)   ink, grey
//   fonts          {black:"Inter-Black", bold:"Inter-Bold", semi:"Inter-SemiBold"}
//   headerY        header y offset from car centre (default -560)
//   float          idle float px (default 8)
// Returns {cols:[{ctrl, car, carAfter, chips:[L,L], chipComps, labels, hex, header, sub}], tEnd}

function swapCompare(comp, opts) {
  var o = opts || {};
  function d(k, v) { return (o[k] === undefined || o[k] === null) ? v : o[k]; }
  var W = comp.width, H = comp.height, FPS = comp.frameRate;
  var Y = d("y", Math.round(H * 0.42)), Z = d("z", 0);
  var CW = d("chip", 250), GAP = d("chipGap", 70), CDY = d("chipDY", 470);
  var RAD = d("radius", 56), RIM = d("rim", 10);
  var LBL = d("labels", ["BODY", "DEKAL"]), SHOWHEX = d("showHex", true);
  var ACC = d("accel", 0.18), ARC = d("arc", 120), FLOAT = d("float", 8);
  var ACCENT = d("accent", [226 / 255, 10 / 255, 18 / 255]);
  var INK = d("ink", [0.07, 0.07, 0.08]), GREY = d("grey", [0.52, 0.53, 0.55]);
  var FN = d("fonts", {}); var FBLK = FN.black || "Inter-Black", FBLD = FN.bold || "Inter-Bold", FSEMI = FN.semi || "Inter-SemiBold";
  var HDY = d("headerY", -560);

  // ---------- helpers ----------
  function col(c) {
    if (c instanceof Array) return c;
    var s = String(c).replace("#", "");
    return [parseInt(s.substr(0, 2), 16) / 255, parseInt(s.substr(2, 2), 16) / 255, parseInt(s.substr(4, 2), 16) / 255];
  }
  function hex(c) {
    if (!(c instanceof Array)) return String(c).toUpperCase();
    var s = "#";
    for (var q = 0; q < 3; q++) { var v = Math.round(c[q] * 255).toString(16).toUpperCase(); s += (v.length < 2 ? "0" : "") + v; }
    return s;
  }
  function item(x) {
    if (typeof x !== "string") return x;
    var f = new File(x);
    if (!f.exists) throw new Error("swapCompare: missing file " + x);
    for (var q = 1; q <= app.project.numItems; q++) {
      var it = app.project.item(q);
      if (it instanceof FootageItem && it.file && it.file.fsName === f.fsName) return it;
    }
    var ni = app.project.importFile(new ImportOptions(f)); ni.parentFolder = folder("30_ASSETS"); return ni;
  }
  function folder(nm) {
    for (var q = 1; q <= app.project.numItems; q++) {
      var it = app.project.item(q);
      if (it instanceof FolderItem && it.name === nm) return it;
    }
    return app.project.items.addFolder(nm);
  }
  function tr(L) { return L.property("ADBE Transform Group"); }
  function fx(L, mn) { return L.property("ADBE Effect Parade").addProperty(mn); }
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
  function expo(p, t0, a, t1, b) { var k0 = key(p, t0, a), k1 = key(p, t1, b); ez(p, k0, 0, 33, 0, 0.1); ez(p, k1, 0, 92, 0, 33); }
  // 1:2 curve as an expression snippet: accelerate the first third to 0.5, quartic settle (continuous velocity)
  function curveJS(t0, dur) {
    return "var u=Math.min(1,Math.max(0,(time-(" + t0 + "))/" + dur + "));" +
      "var s=u<1/3?0.5*Math.pow(3*u,2):0.5+0.5*(1-Math.pow(1-(u-1/3)*1.5,4));";
  }
  function rrect(c, nm, w, h, r, colr, cx, cy) {
    var L = c.layers.addShape(); L.name = nm;
    var g = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    var v = g.property("ADBE Vectors Group");
    var rc = v.addProperty("ADBE Vector Shape - Rect");
    rc.property("ADBE Vector Rect Size").setValue([w, h]);
    rc.property("ADBE Vector Rect Roundness").setValue(r);
    v.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(colr);
    tr(L).property("ADBE Anchor Point").setValue([0, 0]);
    tr(L).property("ADBE Position").setValue([cx, cy]);
    L.label = 4; return L;
  }
  function txt(c, nm, s, font, size, colr, track, just) {
    var L = c.layers.addText(s); L.name = nm;
    var p = L.property("ADBE Text Properties").property("ADBE Text Document");
    var td = p.value; td.resetCharStyle(); td.resetParagraphStyle();
    td.font = font; td.fontSize = size; td.applyFill = true; td.fillColor = colr; td.applyStroke = false;
    td.tracking = track || 0; td.justification = just || ParagraphJustification.CENTER_JUSTIFY;
    p.setValue(td);
    var r = L.sourceRectAtTime(0, false);
    tr(L).property("ADBE Anchor Point").setValue([r.left + r.width / 2, r.top + r.height / 2]);
    L.label = 2; return L;
  }
  function setTxt(L, t, s, colr) {
    var p = L.property("ADBE Text Properties").property("ADBE Text Document");
    var td = p.valueAtTime(t, false); td.text = s; if (colr) td.fillColor = colr;
    p.setValueAtTime(t, td);
  }
  function matte(L, M) {
    try { L.setTrackMatte(M, TrackMatteType.ALPHA); } catch (e1) { L.trackMatteType = TrackMatteType.ALPHA; }
  }
  // chip precomp: white rim + colour strip (matted to the inner rounded rect) + fine highlight
  function chipComp(nm, cols) {
    var P = 90, S = CW + 2 * P;
    var C = app.project.items.addComp(nm, S, S, 1, comp.duration, FPS);
    C.parentFolder = folder("20_MODULES"); C.motionBlur = true;
    C.shutterAngle = 180; C.shutterPhase = -90;
    var hl = rrect(C, "SHP_highlight", CW - 2 * RIM, CW - 2 * RIM, RAD - RIM, [1, 1, 1], S / 2, S / 2);
    var hg = hl.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group");
    hg.property("ADBE Vector Graphic - Fill").remove();
    var st = hg.addProperty("ADBE Vector Graphic - Stroke");
    st.property("ADBE Vector Stroke Color").setValue([1, 1, 1]); st.property("ADBE Vector Stroke Width").setValue(3);
    tr(hl).property("ADBE Opacity").setValue(28);
    var n = cols.length, CH = CW - 2 * RIM;
    var strip = C.layers.addShape(); strip.name = "SHP_strip"; strip.label = 4;
    for (var q = 0; q < n; q++) {
      var g = strip.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
      var v = g.property("ADBE Vectors Group");
      var rc = v.addProperty("ADBE Vector Shape - Rect");
      rc.property("ADBE Vector Rect Size").setValue([CH + 4, CH + 2]);
      rc.property("ADBE Vector Rect Position").setValue([0, q * CH]);
      v.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue(col(cols[q]));
    }
    tr(strip).property("ADBE Anchor Point").setValue([0, 0]);
    tr(strip).property("ADBE Position").setValue([S / 2, S / 2]);
    strip.motionBlur = true;
    var m = rrect(C, "MATTE_inner", CH, CH, RAD - RIM, [1, 1, 1], S / 2, S / 2); m.label = 7;
    m.moveBefore(strip); matte(strip, m);
    var rim = rrect(C, "SHP_rim", CW, CW, RAD, [1, 1, 1], S / 2, S / 2);
    rim.moveToEnd();
    hl.moveToBeginning();
    return { comp: C, strip: strip, step: CH, n: n };
  }

  var cols = o.columns || [];
  var R = { cols: [], tEnd: 0 };
  for (var ci = 0; ci < cols.length; ci++) {
    var c = cols[ci], NM = "COL" + (ci + 1);
    var X = (c.x !== undefined) ? c.x : W * (ci + 1) / (cols.length + 1);
    var T = (c.t !== undefined) ? c.t : 1.0, TIN = (c.tIn !== undefined) ? c.tIn : 0.1;
    var MODE = c.mode || "swap", DUR = 3 * ACC;
    var TREV = (c.tReveal !== undefined) ? c.tReveal : (MODE === "swap" ? T + ACC : ((c.tDecal !== undefined ? c.tDecal : T + 0.6) + ACC));
    var TDEC = (c.tDecal !== undefined) ? c.tDecal : T + 0.6;
    var CARW = c.carW || d("carW", Math.round(W * 0.40));
    var out = { chips: [], chipComps: [], labels: [], hex: [] };

    // control null (idle float + tiny Y drift)
    var ctrl = comp.layers.addNull(comp.duration); ctrl.name = "CTRL_" + NM; ctrl.threeDLayer = true; ctrl.label = 1;
    tr(ctrl).property("ADBE Position").setValue([X, Y, Z]);
    tr(ctrl).property("ADBE Position").expression = "value+[0," + FLOAT + "*Math.sin(time*1.1+" + ci * 1.7 + "),0]";
    tr(ctrl).property("ADBE Rotate Y").expression = "2.5*Math.sin(time*0.55+" + ci * 2.1 + ")";
    out.ctrl = ctrl;

    // car(s)
    var carLayer = function (src, nm, flipX) {
      var it = item(src);
      var L = comp.layers.add(it); L.name = nm; L.threeDLayer = true; L.motionBlur = true; L.label = 9;
      L.parent = ctrl;
      var sc = CARW / it.width * 100;
      tr(L).property("ADBE Position").setValue([0, 0, 0]);
      tr(L).property("ADBE Scale").setValue([flipX ? -sc : sc, sc, sc]);
      return { L: L, h: it.height * sc / 100, sc: sc };
    };
    var A = carLayer(c.img, "IMG_" + NM + "_car", c.flipX);
    out.car = A.L;
    // contact shadow
    var sh = comp.layers.addShape(); sh.name = "SHP_" + NM + "_contact"; sh.threeDLayer = true; sh.label = 4;
    var sg = sh.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
    sg.addProperty("ADBE Vector Shape - Ellipse").property("ADBE Vector Ellipse Size").setValue([CARW * 0.82, 70]);
    sg.addProperty("ADBE Vector Graphic - Fill").property("ADBE Vector Fill Color").setValue([0, 0, 0]);
    sh.parent = ctrl; tr(sh).property("ADBE Position").setValue([0, A.h * 0.40, 30]);
    tr(sh).property("ADBE Opacity").setValue(20);
    var gb = fx(sh, "ADBE Gaussian Blur 2"); gb.property(1).setValue(38); gb.property(3).setValue(1);
    sh.moveAfter(A.L);
    // intro: car rises + sharpens (expo-out)
    expo(tr(A.L).property("ADBE Position"), TIN, [0, 160, 0], TIN + 0.7, [0, 0, 0]);
    expo(tr(A.L).property("ADBE Opacity"), TIN, 0, TIN + 0.35, 100);
    var bl = fx(A.L, "ADBE Box Blur2"); expo(bl.property(1), TIN, 28, TIN + 0.5, 0);
    expo(tr(sh).property("ADBE Opacity"), TIN + 0.1, 0, TIN + 0.8, 20);

    if (c.imgAfter) {
      var B = carLayer(c.imgAfter, "IMG_" + NM + "_car_after", c.flipXAfter);
      B.L.moveBefore(A.L); out.carAfter = B.L;
      var RV = c.reveal || (MODE === "swap" ? "wipe" : "flip"), RD = 3 * ACC * 1.15;
      if (RV === "wipe") {
        var wB = fx(B.L, "ADBE Linear Wipe"), wA = fx(A.L, "ADBE Linear Wipe");
        wB = B.L.property("ADBE Effect Parade").property("ADBE Linear Wipe");
        wA = A.L.property("ADBE Effect Parade").property("ADBE Linear Wipe");
        wB.property(2).setValue(225); wB.property(3).setValue(Math.round(CARW * 0.05));
        wA.property(2).setValue(45); wA.property(3).setValue(Math.round(CARW * 0.05));
        wB.property(1).expression = curveJS(TREV, RD) + "(1-s)*100*1.06";
        wA.property(1).expression = curveJS(TREV, RD) + "s*100*1.06";
        // the new car settles 104 -> 100 with the wipe
        tr(B.L).property("ADBE Scale").expression = curveJS(TREV, RD) + "value*(1+0.04*(1-s))";
        // light sweep along the wipe edge
        try {
          var ls = fx(B.L, "CC Light Sweep");
          ls = B.L.property("ADBE Effect Parade").property("CC Light Sweep");
          var iw = B.L.source.width, ih = B.L.source.height;
          ls.property(1).expression = curveJS(TREV, RD) + "[" + (-0.2 * iw) + "+s*" + (1.4 * iw) + "," + (1.2 * ih) + "-s*" + (1.4 * ih) + "]";
          ls.property(2).setValue(-45); ls.property(4).setValue(Math.round(iw * 0.03));
          ls.property(5).expression = curveJS(TREV, RD) + "45*Math.sin(Math.PI*s)";
        } catch (eL) {}
      } else { // 2.5D flip around Y, 1:2 (accelerate to 90deg, settle back from -90)
        tr(A.L).property("ADBE Rotate Y").expression = curveJS(TREV, RD) + "s<0.5?180*s:90";
        tr(A.L).property("ADBE Opacity").expression = curveJS(TREV, RD) + "s<0.5?value:0";
        tr(B.L).property("ADBE Rotate Y").expression = curveJS(TREV, RD) + "s<0.5?-90:-180*(1-s)";
        tr(B.L).property("ADBE Opacity").expression = curveJS(TREV, RD) + "s<0.5?0:100";
      }
      R.tEnd = Math.max(R.tEnd, TREV + RD);
    }

    // chips + labels
    var BODY = col(c.body), DEC = col(c.decal), AFT = c.after || {};
    var cA, cB;
    if (MODE === "roll") {
      var mids = [[0.98, 0.84, 0.10], [0.20, 0.55, 1.0], [1.0, 0.36, 0.62], [0.32, 0.86, 0.55], [0.62, 0.36, 0.95]];
      cA = chipComp("MOD_" + NM + "_chip_body", [BODY, mids[(ci * 2) % 5], mids[(ci * 2 + 2) % 5], col(AFT.body || c.body)]);
      cB = chipComp("MOD_" + NM + "_chip_decal", [DEC, mids[(ci * 2 + 1) % 5], mids[(ci * 2 + 3) % 5], col(AFT.decal || c.decal)]);
    } else {
      cA = chipComp("MOD_" + NM + "_chip_body", [BODY]);
      cB = chipComp("MOD_" + NM + "_chip_decal", [DEC]);
    }
    var XA = -(CW + GAP) / 2, XB = (CW + GAP) / 2;
    var slots = [[XA, CDY, 0], [XB, CDY, 0]];
    var chipsC = [cA, cB];
    for (var k = 0; k < 2; k++) {
      var L = comp.layers.add(chipsC[k].comp); L.name = "PC_" + NM + "_chip_" + (k ? "decal" : "body");
      L.threeDLayer = true; L.motionBlur = true; L.label = 10; L.parent = ctrl;
      tr(L).property("ADBE Position").setValue(slots[k]);
      var ds = fx(L, "ADBE Drop Shadow");
      ds = L.property("ADBE Effect Parade").property("ADBE Drop Shadow");
      ds.property(1).setValue([0.05, 0.05, 0.08]); ds.property(2).setValue(48); ds.property(3).setValue(180);
      ds.property(4).setValue(34); ds.property(5).setValue(80);
      // pop in (small overshoot allowed on small elements)
      var tp = TIN + 0.35 + 0.08 * k, scp = tr(L).property("ADBE Scale");
      var k0 = key(scp, tp, [70, 70, 70]), k1 = key(scp, tp + 0.22, [104, 104, 104]), k2 = key(scp, tp + 0.5, [100, 100, 100]);
      ez(scp, k0, 0, 33, 0, 20); ez(scp, k1, 0, 50, 0, 50); ez(scp, k2, 0, 85, 0, 33);
      expo(tr(L).property("ADBE Opacity"), tp, 0, tp + 0.15, 100);
      if (MODE === "swap") {
        var dx = slots[1 - k][0] - slots[k][0], up = k === 0 ? 1 : -1;
        tr(L).property("ADBE Position").expression = curveJS(T, DUR) +
          "var a=Math.sin(Math.PI*s);value+[" + dx + "*s," + (-up * ARC) + "*a," + (up > 0 ? -300 : 220) + "*a]";
        tr(L).property("ADBE Rotate Z").expression = curveJS(T, DUR) + (up * -9) + "*Math.sin(Math.PI*s)";
        tr(L).property("ADBE Scale").expression = curveJS(T, DUR) + "value*(1+" + (up > 0 ? 0.10 : -0.06) + "*Math.sin(Math.PI*s))";
      } else {
        var tr0 = k === 0 ? T : TDEC, st = chipsC[k];
        st.strip.property("ADBE Transform Group").property("ADBE Position").expression = curveJS(tr0, DUR * 1.25) +
          "value-[0," + (st.step * (st.n - 1)) + "*s]";
        tr(L).property("ADBE Scale").expression = curveJS(tr0, DUR * 1.25) + "value*(1+0.07*Math.sin(Math.PI*s))";
      }
      out.chips.push(L); out.chipComps.push(chipsC[k].comp);
      // slot labels (fixed: the COLOUR moves, the slot meaning stays)
      var lb = txt(comp, "TXT_" + NM + "_lbl_" + k, LBL[k], FBLD, 54, GREY, 160);
      lb.threeDLayer = true; lb.parent = ctrl; tr(lb).property("ADBE Position").setValue([slots[k][0], CDY + CW / 2 + 80, 0]);
      expo(tr(lb).property("ADBE Opacity"), tp + 0.1, 0, tp + 0.4, 100);
      out.labels.push(lb);
      if (SHOWHEX) {
        var c0 = k === 0 ? BODY : DEC;
        var c1 = MODE === "swap" ? (k === 0 ? DEC : BODY) : col(k === 0 ? (AFT.body || c.body) : (AFT.decal || c.decal));
        var hx = txt(comp, "TXT_" + NM + "_hex_" + k, hex(c0), FSEMI, 46, [0.60, 0.61, 0.63], 60);
        hx.threeDLayer = true; hx.parent = ctrl; tr(hx).property("ADBE Position").setValue([slots[k][0], CDY + CW / 2 + 146, 0]);
        var tsw = MODE === "swap" ? T : (k === 0 ? T : TDEC), dsw = MODE === "swap" ? DUR : DUR * 1.25;
        setTxt(hx, 0, hex(c0)); setTxt(hx, tsw + dsw * 0.34, hex(c1));
        var tp2 = tp + 0.15;
        tr(hx).property("ADBE Opacity").expression = curveJS(tsw, dsw) +
          "var fi=Math.min(1,Math.max(0,(time-" + tp2 + ")/0.3));fi*100*Math.abs(Math.cos(Math.PI*Math.min(1,s*1.47)))";
        out.hex.push(hx);
      }
    }
    R.tEnd = Math.max(R.tEnd, T + DUR, TDEC + DUR * 1.25);

    // header + sub (+ red underline that grows on the reveal)
    if (c.header) {
      var hd = txt(comp, "TXT_" + NM + "_header", c.header, FBLK, c.headerSize || 112, INK, -10);
      hd.threeDLayer = true; hd.parent = ctrl; tr(hd).property("ADBE Position").setValue([0, HDY, 0]);
      expo(tr(hd).property("ADBE Position"), TIN + 0.15, [0, HDY + 50, 0], TIN + 0.75, [0, HDY, 0]);
      expo(tr(hd).property("ADBE Opacity"), TIN + 0.15, 0, TIN + 0.4, 100);
      var hb = fx(hd, "ADBE Box Blur2"); expo(hb.property(1), TIN + 0.15, 18, TIN + 0.55, 0);
      out.header = hd;
      if (c.sub) {
        var sb = txt(comp, "TXT_" + NM + "_sub", c.sub, FSEMI, c.subSize || 58, GREY, 20);
        sb.threeDLayer = true; sb.parent = ctrl; tr(sb).property("ADBE Position").setValue([0, HDY + 104, 0]);
        expo(tr(sb).property("ADBE Opacity"), TIN + 0.3, 0, TIN + 0.6, 100);
        if (c.subAfter) {
          setTxt(sb, 0, c.sub);
          setTxt(sb, TREV + ACC, c.subAfter, ACCENT);
          tr(sb).property("ADBE Opacity").expression = "var t0=" + (TREV + ACC) + ";var dd=Math.abs(time-t0);value*(dd<0.12?dd/0.12:1)";
          var ul = rrect(comp, "SHP_" + NM + "_underline", 120, 8, 4, ACCENT, 0, 0);
          ul.threeDLayer = true; ul.parent = ctrl; tr(ul).property("ADBE Position").setValue([0, HDY + 158, 0]);
          var us = tr(ul).property("ADBE Scale");
          expo(us, TREV + ACC, [0, 100, 100], TREV + ACC + 0.6, [100, 100, 100]);
        }
        out.sub = sb;
      }
    }
    R.cols.push(out);
  }
  return R;
}
