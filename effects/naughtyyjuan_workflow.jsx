// naughtyyjuan_workflow.jsx : 8bitbrain "The NaughtyyJuan Workflow" breakdown as ES3 helpers.
// Guide: private study notes (not included)
//
//   bezierEase(prop, k1, k2, x1, y1, x2, y2)   Flow-plugin cubic-bezier -> AE temporal ease on one key pair
//   speedRamp(layer, tIn, tOut, srcA, srcB)     time remap fast -> slow-mo -> fast, curve (0.14, 0.57, 0.88, 0.19), Pixel Motion blending
//   whiteSlideFlash(comp, t, frames, dir)       white solid: frame 1 full, frame 2 half off screen (3rd frame 80 % off)
//   lyricShadowGlow(textLayer, opts)            Drop Shadow 36 % / 139 deg / dist 6 / soft 32 (+ animated offset) + Deep Glow 2
//   grittyThreshold(layer, opts)                grain (S_Grain or Noise) + S_Threshold 0.59 / softness 0.623 / luma mask, blur 12
//   immersionVignette(comp, opts)               ADJ_VIGNETTE: S_Vignette (radius 1.43, rel height 0.75, edge softness 1.07, smooth 0.4)
//   appleCard(comp, "TEXT", opts)               rounded blue card, gradient ramp (light top / dark bottom), parented text, shadow,
//                                               rotation keyed with curve (0.25, 0.59, 0.81, 0.15), CC Light Sweep + glow on a precomp
//   invertMaskReveal(comp, t, frames, opts)     ADJ_INVERT with an ellipse mask whose expansion grows to full frame
// Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _njo(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _njLog(m) { try { $.writeln("[naughtyyjuan_workflow] " + m); } catch (e) {} }
function _njAdd(layer, names) {
    var p = layer.property("ADBE Effect Parade");
    for (var n = 0; n < names.length; n++) { try { p.addProperty(names[n]); return p.numProperties; } catch (e) {} }
    return 0;
}
function _njSetByName(eff, name, v) { try { eff.property(name).setValue(v); } catch (e) { _njLog(name + ": " + String(e.message)); } }

// ---- cubic-bezier -> AE ease (1D or multi-dim non-spatial; spatial props use one ease) ----
function bezierEase(prop, k1, k2, x1, y1, x2, y2) {
    var t1 = prop.keyTime(k1), t2 = prop.keyTime(k2);
    var v1 = prop.keyValue(k1), v2 = prop.keyValue(k2), dt = t2 - t1;
    var dims = 1, spatial = false;
    if (v1 instanceof Array) { dims = v1.length; }
    try { spatial = prop.isSpatial; } catch (e) {}
    var easesOut = [], easesIn = [], d, n = spatial ? 1 : dims;
    for (d = 0; d < n; d++) {
        var dv;
        if (spatial) {
            var s = 0, j; for (j = 0; j < dims; j++) s += (v2[j] - v1[j]) * (v2[j] - v1[j]);
            dv = Math.sqrt(s);
        } else {
            dv = (dims > 1) ? (v2[d] - v1[d]) : (v2 - v1);
        }
        var avg = dv / dt;
        var outSp = (x1 > 0.001) ? avg * y1 / x1 : 0, inSp = (x2 < 0.999) ? avg * (1 - y2) / (1 - x2) : 0;
        easesOut.push(new KeyframeEase(spatial ? Math.abs(outSp) : outSp, Math.max(0.1, Math.min(100, x1 * 100))));
        easesIn.push(new KeyframeEase(spatial ? Math.abs(inSp) : inSp, Math.max(0.1, Math.min(100, (1 - x2) * 100))));
    }
    prop.setInterpolationTypeAtKey(k1, prop.keyInInterpolationType(k1), KeyframeInterpolationType.BEZIER);
    prop.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.BEZIER, prop.keyOutInterpolationType(k2));
    prop.setTemporalEaseAtKey(k1, prop.keyInTemporalEase(k1), easesOut);
    prop.setTemporalEaseAtKey(k2, easesIn, prop.keyOutTemporalEase(k2));
}

// ---- speed ramp ----
function speedRamp(layer, tIn, tOut, srcA, srcB, curve) {
    var c = curve || [0.14, 0.57, 0.88, 0.19];
    layer.timeRemapEnabled = true;
    var tr = layer.property("ADBE Time Remapping");
    for (var k = tr.numKeys; k >= 1; k--) tr.removeKey(k);
    tr.setValueAtTime(tIn, srcA);
    tr.setValueAtTime(tOut, srcB);
    bezierEase(tr, 1, 2, c[0], c[1], c[2], c[3]);
    try { layer.frameBlendingType = FrameBlendingType.PIXEL_MOTION; layer.containingComp.frameBlending = true; } catch (e) {}
    return tr;
}

// ---- white slide flash ----
function whiteSlideFlash(comp, t, frames, dir) {
    var fd = comp.frameDuration, n = frames || 2, sgn = (dir === "left") ? -1 : 1;
    var s = comp.layers.addSolid([1, 1, 1], "FX_WHITE_SLIDE", comp.width, comp.height, 1, n * fd);
    s.startTime = t; s.inPoint = t; s.outPoint = t + n * fd; s.label = LBL.LIGHT;
    var p = s.property("ADBE Transform Group").property("ADBE Position"), cx = comp.width / 2, cy = comp.height / 2;
    p.setValueAtTime(t, [cx, cy]);
    p.setValueAtTime(t + fd, [cx + sgn * comp.width * 0.5, cy]);
    if (n > 2) p.setValueAtTime(t + 2 * fd, [cx + sgn * comp.width * 0.8, cy]);
    for (var k = 1; k <= p.numKeys; k++) p.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
    s.motionBlur = false;
    return s;
}

// ---- lyric text shadow + glow ----
function lyricShadowGlow(textLayer, opts) {
    var iDS = _njAdd(textLayer, ["ADBE Drop Shadow"]);
    var iDG = _njAdd(textLayer, ["S_Glow", "ADBE Glo2"]);
    var fx = textLayer.property("ADBE Effect Parade"), ds = fx.property(iDS);
    ds.property(2).setValue(_njo(opts, "opacity", 36) * 2.55);   // 0-255 internally
    ds.property(3).setValue(_njo(opts, "dir", 139));
    ds.property(5).setValue(_njo(opts, "soft", 32));
    var dist = ds.property(4), t0 = _njo(opts, "t0", textLayer.inPoint), fd = textLayer.containingComp.frameDuration;
    if (_njo(opts, "animateOffset", true)) {             // shadow offset grows as the line lands
        dist.setValueAtTime(t0, 0);
        dist.setValueAtTime(t0 + _njo(opts, "offsetF", 10) * fd, _njo(opts, "dist", 6) * 3);
        dist.setValueAtTime(t0 + _njo(opts, "offsetF", 10) * 2 * fd, _njo(opts, "dist", 6));
    } else { dist.setValue(_njo(opts, "dist", 6)); }
    if (iDG && fx.property(iDG).matchName === "ADBE Glo2") { var g = fx.property(iDG); g.property(3).setValue(60); g.property(4).setValue(0.6); }
    return textLayer;
}

// ---- gritty grain + threshold ----
function grittyThreshold(layer, opts) {
    var iG = _njAdd(layer, ["S_Grain", "ADBE Noise"]);
    var iT = _njAdd(layer, ["S_Threshold"]);
    var fx = layer.property("ADBE Effect Parade");
    var g = fx.property(iG);
    if (g.matchName === "ADBE Noise") { g.property(1).setValue(_njo(opts, "noise", 4)); g.property(2).setValue(0); g.property(3).setValue(1); }
    else { _njSetByName(g, "Intensity", 1.7); _njSetByName(g, "Size", 0.7); }
    if (iT) {
        var th = fx.property(iT);
        _njSetByName(th, "Threshold", _njo(opts, "threshold", 0.59));
        _njSetByName(th, "Softness", _njo(opts, "softness", 0.623));
        _njSetByName(th, "Blur Mask", 12);
    } else {
        var iS = _njAdd(layer, ["ADBE Threshold2"]);                 // stock fallback: hard threshold (much harsher)
        if (iS) fx.property(iS).property(1).setValue(150);
    }
    return layer;
}

// ---- vignette ----
function immersionVignette(comp, opts) {
    var a = comp.layers.addSolid([1, 1, 1], "ADJ_VIGNETTE", comp.width, comp.height, 1, comp.duration);
    a.adjustmentLayer = true; a.label = LBL.ADJ;
    var i = _njAdd(a, ["S_Vignette"]);
    if (i) {
        var v = a.property("ADBE Effect Parade").property(i);
        _njSetByName(v, "Radius", _njo(opts, "radius", 1.43));
        _njSetByName(v, "Rel Height", _njo(opts, "relHeight", 0.75));
        _njSetByName(v, "Edge Softness", 1.07);
        _njSetByName(v, "Smooth Curve", 0.4);
    } else {
        _njLog("S_Vignette missing; use a radial-ramp vignette in Multiply");
    }
    return a;
}

// ---- Apple-style card ----
function appleCard(comp, text, opts) {
    var W = _njo(opts, "w", Math.round(comp.width * 0.62)), H = _njo(opts, "h", Math.round(comp.width * 0.24));
    var pc = app.project.items.addComp("PC_APPLECARD_" + text.replace(/[^A-Za-z0-9]/g, ""), Math.round(W * 1.3), Math.round(H * 1.6), 1, comp.duration, comp.frameRate);
    var cx = pc.width / 2, cy = pc.height / 2;
    var sh = pc.layers.addShape(); sh.name = "SHP_CARD"; sh.label = LBL.SHAPE;
    var grp = sh.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
    var vg = grp.property("ADBE Vectors Group");
    var rc = vg.addProperty("ADBE Vector Shape - Rect");
    rc.property("ADBE Vector Rect Size").setValue([W, H]);
    rc.property("ADBE Vector Rect Roundness").setValue(_njo(opts, "round", H * 0.35));
    var fill = vg.addProperty("ADBE Vector Graphic - Fill");
    fill.property("ADBE Vector Fill Color").setValue(_njo(opts, "color", [0.16, 0.55, 0.95]));
    sh.property("ADBE Transform Group").property("ADBE Position").setValue([cx, cy]);
    // gradient: lighter top, darker bottom (Gradient Ramp over the shape's own alpha)
    var iR = _njAdd(sh, ["ADBE Ramp"]), iDS = _njAdd(sh, ["ADBE Drop Shadow"]);
    var fx = sh.property("ADBE Effect Parade"), r = fx.property(iR);
    r.property(1).setValue([cx, cy - H / 2]); r.property(2).setValue(_njo(opts, "top", [0.35, 0.72, 1]));
    r.property(3).setValue([cx, cy + H / 2]); r.property(4).setValue(_njo(opts, "bottom", [0.05, 0.36, 0.8]));
    var ds = fx.property(iDS); ds.property(2).setValue(35 * 2.55); ds.property(4).setValue(H * 0.06); ds.property(5).setValue(H * 0.25);
    var tl = pc.layers.addText(text); tl.label = LBL.TEXT; tl.name = "TXT_CARD";
    var td = tl.property("ADBE Text Properties").property("ADBE Text Document"), doc = td.value;
    doc.fontSize = _njo(opts, "size", H * 0.42); doc.fillColor = [1, 1, 1]; doc.justification = ParagraphJustification.CENTER_JUSTIFY;
    try { doc.font = _njo(opts, "font", "Poppins-Bold"); } catch (ef) {}
    td.setValue(doc);
    var rr = tl.sourceRectAtTime(0, false);
    tl.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([rr.left + rr.width / 2, rr.top + rr.height / 2]);
    tl.property("ADBE Transform Group").property("ADBE Position").setValue([cx, cy]);
    tl.parent = sh;                                  // parent with compensation (house rule: .parent, not setParentWithJump)
    // rotation pop with curve (0.25, 0.59, 0.81, 0.15)
    var t0 = _njo(opts, "t0", 0), fd = comp.frameDuration, rot = sh.property("ADBE Transform Group").property("ADBE Rotate Z");
    rot.setValueAtTime(t0, _njo(opts, "rotFrom", -12));
    rot.setValueAtTime(t0 + _njo(opts, "rotF", 24) * fd, 0);
    bezierEase(rot, 1, 2, 0.25, 0.59, 0.81, 0.15);
    // outer layer: CC Light Sweep (glossy) + glow
    var L = comp.layers.add(pc); L.label = LBL.PRECOMP; L.name = "PC_APPLECARD";
    var iLS = _njAdd(L, ["CC Light Sweep"]), iGL = _njAdd(L, ["S_Glow", "ADBE Glo2"]);
    if (iLS) {
        var ls = L.property("ADBE Effect Parade").property(iLS).property(1);       // Center: sweep across
        ls.setValueAtTime(t0, [-pc.width * 0.2, pc.height / 2]);
        ls.setValueAtTime(t0 + 30 * fd, [pc.width * 1.2, pc.height / 2]);
    }
    L.property("ADBE Transform Group").property("ADBE Position").setValue(_njo(opts, "pos", [comp.width / 2, comp.height / 2]));
    return L;
}

// ---- invert reveal with mask expansion ----
function invertMaskReveal(comp, t, frames, opts) {
    var fd = comp.frameDuration, n = frames || 12;
    var a = comp.layers.addSolid([1, 1, 1], "ADJ_INVERT", comp.width, comp.height, 1, comp.duration);
    a.adjustmentLayer = true; a.label = LBL.ADJ;
    a.inPoint = t; a.outPoint = t + _njo(opts, "hold", n * 3) * fd;
    _njAdd(a, ["ADBE Invert"]);
    var m = a.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
    var sh = new Shape(), cx = _njo(opts, "cx", comp.width / 2), cy = _njo(opts, "cy", comp.height / 2), r = _njo(opts, "r", comp.width * 0.08), K = 0.5523;
    sh.vertices = [[cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]];
    sh.inTangents = [[-r * K, 0], [0, -r * K], [r * K, 0], [0, r * K]];
    sh.outTangents = [[r * K, 0], [0, r * K], [-r * K, 0], [0, -r * K]];
    sh.closed = true;
    m.property("ADBE Mask Shape").setValue(sh);
    m.property("ADBE Mask Feather").setValue([_njo(opts, "feather", 40), _njo(opts, "feather", 40)]);
    var ex = m.property("ADBE Mask Offset"), full = Math.sqrt(comp.width * comp.width + comp.height * comp.height);
    ex.setValueAtTime(t, -r);
    ex.setValueAtTime(t + n * fd, full);
    bezierEase(ex, 1, 2, 0.32, 0.05, 0.35, 0.97);
    return a;
}
