// lib_777.jsx - STYLE 777 shared helpers (ES3, AE 26). 2026-11-11.
// Include once, then the family files: grade_777 / flash_777 / wipe_777 / type_777 / fx_777.
// Every function works in FRAMES of the comp it gets (house 777 = 24 fps; at 50/60 multiply moving transitions only).
// Layer prefixes/labels follow the house rule (CTRL_ ADJ_ TXT_ SHP_ FX_ MATTE_ VID_ IMG_ PC_).
#include "../../utils/safe_glow.jsx"
#include "pal_777.jsx"
var L7LOG = null;
function l7log(s) { try { if (L7LOG) L7LOG.writeln(s); } catch (e) {} }
function f7(c, f) { return f * c.frameDuration; }
function hx7(h) { h = h.replace("#", ""); return [parseInt(h.substr(0, 2), 16) / 255, parseInt(h.substr(2, 2), 16) / 255, parseInt(h.substr(4, 2), 16) / 255]; }
function tr7(L, n) { var m = { a: "ADBE Anchor Point", p: "ADBE Position", s: "ADBE Scale", r: "ADBE Rotate Z", o: "ADBE Opacity", ry: "ADBE Rotate Y" }; return L.property("ADBE Transform Group").property(m[n] || n); }
// in first, then out (AE 26.5 moves outPoint when inPoint is set)
function io7(L, c, a, b) {
    var keep = L.outPoint; L.inPoint = Math.max(0, f7(c, a));
    var out = (b != null) ? f7(c, b) : keep; if (out <= L.inPoint) out = c.duration; L.outPoint = out; return L;
}
// add an effect, set {index: value}; returns the effect (fetched after adding)
function fx7(L, mn, vals) {
    var P = L.property("ADBE Effect Parade");
    try { P.addProperty(mn); } catch (e) { l7log("FX FAIL " + mn + " on " + L.name + ": " + String(e.message)); return null; }
    var e = P.property(P.numProperties);
    if (vals) for (var k in vals) { try { e.property(parseInt(k, 10)).setValue(vals[k]); } catch (er) { l7log("set " + mn + "." + k + ": " + String(er.message)); } }
    return P.property(P.numProperties);
}
// hold keys on a property from [[frame, value], ...]
function hold7(pr, c, pairs) {
    for (var i = 0; i < pairs.length; i++) pr.setValueAtTime(f7(c, pairs[i][0]), pairs[i][1]);
    for (var k = 1; k <= pr.numKeys; k++) pr.setInterpolationTypeAtKey(k, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
    return pr;
}
// eased keys (influence %) or linear
function keys7(pr, c, pairs, inf) {
    for (var i = 0; i < pairs.length; i++) pr.setValueAtTime(f7(c, pairs[i][0]), pairs[i][1]);
    if (inf == null) { for (var k = 1; k <= pr.numKeys; k++) pr.setInterpolationTypeAtKey(k, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR); return pr; }
    for (var k2 = 1; k2 <= pr.numKeys; k2++) {
        var dim = 1; try { var v = pr.keyValue(k2); if (v instanceof Array && pr.propertyValueType != PropertyValueType.TwoD_SPATIAL && pr.propertyValueType != PropertyValueType.ThreeD_SPATIAL) dim = v.length; } catch (e) {}
        var ei = [], eo = []; for (var d = 0; d < dim; d++) { ei.push(new KeyframeEase(0, inf[0])); eo.push(new KeyframeEase(0, inf[1])); }
        try { pr.setTemporalEaseAtKey(k2, ei, eo); } catch (e2) { l7log("ease " + pr.name + ": " + String(e2.message)); }
    }
    return pr;
}
function adj7(c, name, a, b) { var L = c.layers.addSolid([1, 1, 1], name, c.width, c.height, 1, c.duration); L.adjustmentLayer = true; try { L.label = 3; } catch (e) {} io7(L, c, a || 0, b != null ? b : Math.round(c.duration / c.frameDuration)); return L; }
function sol7(c, col, name, a, b, w, h) { var L = c.layers.addSolid(col, name, w || c.width, h || c.height, 1, c.duration); try { L.label = 9; } catch (e) {} io7(L, c, a || 0, b != null ? b : Math.round(c.duration / c.frameDuration)); return L; }
function flash7(c, col, name, a, b) { var L = sol7(c, col, name, a, b); try { L.label = 5; } catch (e) {} return L; }
// CC Toner Pentone with a 777 palette key (pal_777.jsx)
function toner7(L, key, blend) {
    var p = PAL777[key]; if (!p) { l7log("no palette " + key); return null; }
    var e = fx7(L, "CC Toner", { 1: 3 });
    try { e.property(6).setValue(p[0]); e.property(5).setValue(p[1]); e.property(4).setValue(p[2]); e.property(3).setValue(p[3]); e.property(2).setValue(p[4]); if (blend != null) e.property(7).setValue(blend); } catch (er) { l7log("toner " + key + ": " + String(er.message)); }
    return e;
}
// mono grain with clipping ON (house rule)
function grain7(L, amt) { var e = fx7(L, "ADBE Noise", { 1: amt || 3 }); try { e.property(2).setValue(0); } catch (x) {} try { e.property(3).setValue(1); } catch (x2) {} return e; }
// rectangle mask in comp pixels
function rmask7(L, x, y, w, h, o) {
    o = o || {}; var m = L.property("ADBE Mask Parade").addProperty("ADBE Mask Atom"), s = new Shape();
    s.vertices = o.pts || [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; s.closed = true; m.property("ADBE Mask Shape").setValue(s);
    if (o.feather) m.property("ADBE Mask Feather").setValue([o.feather, o.feather]); if (o.mode) m.maskMode = o.mode; return m;
}
function rshape7(x, y, w, h) { var s = new Shape(); s.vertices = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; s.closed = true; return s; }
// layer-space mask for a footage layer from comp-space rect (assumes no rotation)
function lmask7(L, c, x, y, w, h, o) {
    var sc = tr7(L, "s").value, p = tr7(L, "p").value, a = tr7(L, "a").value;
    var lx = (x - p[0]) / (sc[0] / 100) + a[0], ly = (y - p[1]) / (sc[1] / 100) + a[1];
    return rmask7(L, lx, ly, w / (sc[0] / 100), h / (sc[1] / 100), o);
}
// shape layer helpers
function shp7(c, kind, o) {
    o = o || {}; var L = c.layers.addShape(); L.name = "SHP_" + (o.name || kind); try { L.label = 4; } catch (e) {}
    var g = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group"), v = g.property("ADBE Vectors Group"), s;
    if (kind == "rect") { s = v.addProperty("ADBE Vector Shape - Rect"); s.property("ADBE Vector Rect Size").setValue([o.w || 100, o.h || 100]); s.property("ADBE Vector Rect Roundness").setValue(o.r || 0); }
    else if (kind == "ell") { s = v.addProperty("ADBE Vector Shape - Ellipse"); s.property("ADBE Vector Ellipse Size").setValue([o.w || 100, o.h || o.w || 100]); }
    else if (kind == "star") { s = v.addProperty("ADBE Vector Shape - Star"); s.property("ADBE Vector Star Type").setValue(1); s.property("ADBE Vector Star Points").setValue(o.pts || 5); s.property("ADBE Vector Star Outer Radius").setValue(o.or || 100); s.property("ADBE Vector Star Inner Radius").setValue(o.ir || 45); }
    else if (kind == "path") { s = v.addProperty("ADBE Vector Shape - Group"); var sh = new Shape(); sh.vertices = o.pts; sh.closed = !!o.closed; s.property("ADBE Vector Shape").setValue(sh); }
    if (o.col) { var f = v.addProperty("ADBE Vector Graphic - Fill"); f.property("ADBE Vector Fill Color").setValue(o.col); }
    if (o.stroke) { var st = v.addProperty("ADBE Vector Graphic - Stroke"); st.property("ADBE Vector Stroke Color").setValue(o.scol || [1, 1, 1]); st.property("ADBE Vector Stroke Width").setValue(o.stroke); }
    tr7(L, "p").setValue([o.x != null ? o.x : c.width / 2, o.y != null ? o.y : c.height / 2]);
    return L;
}
function shpProp7(L, mn) { var v = L.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group"); for (var i = 1; i <= v.numProperties; i++) { try { var p = v.property(i).property(mn); if (p) return p; } catch (e) {} } return null; }
function shpFill7(L) { var v = L.property("ADBE Root Vectors Group").property(1).property("ADBE Vectors Group"); for (var i = 1; i <= v.numProperties; i++) if (v.property(i).matchName == "ADBE Vector Graphic - Fill") return v.property(i).property("ADBE Vector Fill Color"); return null; }
// text layer: o {font,size,col,x,y,just 0 c/1 l/2 r,track,lead}
function txt7(c, s, o) {
    o = o || {}; var L = c.layers.addText(s); L.name = "TXT_" + s.substr(0, 14); try { L.label = 2; } catch (e) {}
    var td = L.property("ADBE Text Properties").property("ADBE Text Document"), d = td.value; d.resetCharStyle();
    d.fontSize = o.size || 40; d.fillColor = o.col || [1, 1, 1]; d.applyFill = true;
    if (o.stroke) { d.applyStroke = true; d.strokeColor = o.scol || [0, 0, 0]; d.strokeWidth = o.stroke; d.strokeOverFill = !!o.over; } else d.applyStroke = false;
    try { d.font = o.font || "Helvetica-Bold"; } catch (e) {}
    d.justification = o.just == 1 ? ParagraphJustification.LEFT_JUSTIFY : (o.just == 2 ? ParagraphJustification.RIGHT_JUSTIFY : ParagraphJustification.CENTER_JUSTIFY);
    if (o.track != null) d.tracking = o.track; if (o.lead) { d.autoLeading = false; d.leading = o.lead; }
    td.setValue(d); centre7(L, o.just, o.x != null ? o.x : c.width / 2, o.y != null ? o.y : c.height / 2);
    return L;
}
function centre7(L, just, x, y) { var r = L.sourceRectAtTime(L.inPoint, false), ax = just == 1 ? r.left : (just == 2 ? r.left + r.width : r.left + r.width / 2); tr7(L, "a").setValue([ax, r.top + r.height / 2]); tr7(L, "p").setValue([x, y]); }
// set Source Text (text + font + size + colour) at a frame; keys are HOLD by nature
function tkey7(L, c, f, s, font, size, col) { var st = L.property("ADBE Text Properties").property("ADBE Text Document"); var d = st.valueAtTime(f7(c, f), false); d.text = s; if (font) { try { d.font = font; } catch (e) {} } if (size) d.fontSize = size; if (col) d.fillColor = col; st.setValueAtTime(f7(c, f), d); }
// track matte (new API first, legacy fallback)
function matte7(target, m, type) { type = type || TrackMatteType.LUMA; try { target.setTrackMatte(m, type); } catch (e) { try { m.moveBefore(target); target.trackMatteType = type; } catch (e2) { l7log("matte " + String(e2.message)); } } }
// precomp helper
function pc7(c, name, w, h, build) { var cc = app.project.items.addComp(name, w || c.width, h || c.height, 1, c.duration, 1 / c.frameDuration); try { cc.parentFolder = c.parentFolder; } catch (e) {} build(cc); var L = c.layers.add(cc); L.name = "PC_" + name; try { L.label = 10; } catch (e2) {} return L; }
// the 777 base grade on an ADJ (st_777_07): variant "violet" | "blue" | "neutral"
function fx777Base(c, variant, a, b) {
    var J = adj7(c, "ADJ_777_BASE", a, b);
    fx7(J, "ADBE Black&White", {});
    var pal = variant == "blue" ? null : "VIOLET";
    if (pal) toner7(J, pal); else fx7(J, "ADBE Tint", { 1: hx7("#06070A"), 2: hx7("#EEF1F6") });
    fx7(J, "ADBE Pro Levels2", { 7: (variant == "neutral" ? 7 : 4) / 255, 8: 236 / 255 });
    grain7(J, 3);
    return J;
}
