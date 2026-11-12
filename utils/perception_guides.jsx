// perception_guides.jsx : NaughtyyJuan "this is why your edits look cheap" rules as guides + a QC audit (ES3).
// Guide: private study notes (not included)
//
// perceptionGuides(comp, opts): GUIDE_ shape layers (guideLayer = true, never rendered):
//   eye line at 44 % (talking-head eyes "slightly above the middle"), caption band 54-60 % ("slightly below"),
//   middle line, and the platform dead zones from private study notes.
// cheapAudit(comp, logPath): text report of "cheap" signals:
//   - font families used across the comp tree (> 2 = warning: one family + one accent max)
//   - text layers with a drop shadow (shadow implies a surface; floating text -> glow or nothing)
//   - layers with more than opts.maxFx effects ("do I need this effect or am I bored?")
//   - text whose bounds enter the dead zones (approximate: ignores parents/3D)
// Usage:
//   #include "perception_guides.jsx"
//   perceptionGuides(comp, {platform: "reels"});
//   cheapAudit(comp, "~/Projects/my_edit/cheap_audit.txt", {platform: "reels", maxFx: 4});
// NOTE: written 2026-10-20, NOT yet run in AE.

var PG_LBL_GUIDE = (typeof LBL !== "undefined" && LBL.GUIDE) ? LBL.GUIDE : 12;

// dead zones as fractions of the frame: top, bottom, side, right column width + the y fraction it starts at
var PG_ZONES = {
    reels:  {top: 0.14, bottom: 0.35, side: 0.06, right: 0.11, rightFrom: 0.55},
    tiktok: {top: 0.13, bottom: 0.25, side: 0.06, right: 0.22, rightFrom: 0.60},
    shorts: {top: 0.15, bottom: 0.35, side: 0.06, right: 0.18, rightFrom: 0.55}
};
var PG_EYE = 0.44, PG_CAP0 = 0.54, PG_CAP1 = 0.60;

function pgLog(msg) { try { $.writeln("[perception_guides] " + msg); } catch (e) {} }
function pgZones(opts) { var p = (opts && opts.platform) ? opts.platform : "reels"; return PG_ZONES[p] ? PG_ZONES[p] : PG_ZONES.reels; }

// one filled (or stroked) rectangle shape layer in comp coordinates
function pgRect(comp, name, x, y, w, h, color, opacity, strokeOnly) {
    var L = comp.layers.addShape();
    L.name = "GUIDE_" + name;
    var vg = L.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group").property("ADBE Vectors Group");
    vg.addProperty("ADBE Vector Shape - Rect");
    vg.addProperty(strokeOnly ? "ADBE Vector Graphic - Stroke" : "ADBE Vector Graphic - Fill");
    var rect = vg.property(1), paint = vg.property(2);           // fetch after adds
    rect.property("ADBE Vector Rect Size").setValue([w, h]);
    rect.property("ADBE Vector Rect Position").setValue([0, 0]);
    if (strokeOnly) {
        paint.property("ADBE Vector Stroke Color").setValue(color);
        paint.property("ADBE Vector Stroke Width").setValue(Math.max(2, Math.round(comp.height / 960)));
    } else {
        paint.property("ADBE Vector Fill Color").setValue(color);
    }
    var tr = L.property("ADBE Transform Group");
    tr.property("ADBE Anchor Point").setValue([0, 0]);
    tr.property("ADBE Position").setValue([x + w / 2, y + h / 2]);
    tr.property("ADBE Opacity").setValue(opacity);
    L.guideLayer = true;
    L.label = PG_LBL_GUIDE;
    L.locked = true;
    return L;
}

function perceptionGuides(comp, opts) {
    var Z = pgZones(opts), W = comp.width, H = comp.height, out = [];
    var lineH = Math.max(4, Math.round(H / 640));
    try {
        out.push(pgRect(comp, "DEAD_TOP", 0, 0, W, H * Z.top, [1, 0, 0], 25));
        out.push(pgRect(comp, "DEAD_BOTTOM", 0, H * (1 - Z.bottom), W, H * Z.bottom, [1, 0, 0], 25));
        out.push(pgRect(comp, "DEAD_LEFT", 0, 0, W * Z.side, H, [1, 0, 0], 15));
        out.push(pgRect(comp, "DEAD_RIGHT", W * (1 - Z.side), 0, W * Z.side, H, [1, 0, 0], 15));
        out.push(pgRect(comp, "DEAD_UI_COLUMN", W * (1 - Z.right), H * Z.rightFrom, W * Z.right, H * (1 - Z.rightFrom), [1, 0.3, 0], 25));
        out.push(pgRect(comp, "MIDDLE", 0, H / 2 - lineH / 2, W, lineH, [1, 1, 1], 40));
        out.push(pgRect(comp, "EYE_LINE_44", 0, H * PG_EYE - lineH / 2, W, lineH, [1, 0, 0], 90));
        out.push(pgRect(comp, "CAPTION_BAND_54_60", W * Z.side, H * PG_CAP0, W * (1 - 2 * Z.side), H * (PG_CAP1 - PG_CAP0), [0, 0.8, 1], 100, true));
    } catch (e) { pgLog("guides: " + String(e.message) + " L" + e.line); }
    return out;
}

// ---------- audit ----------
function pgHasShadow(L) {
    var fx = L.property("ADBE Effect Parade"), q;
    if (!fx) return false;
    for (q = 1; q <= fx.numProperties; q++) {
        var m = fx.property(q).matchName;
        if (m === "ADBE Drop Shadow" || m === "S_DropShadow" || m === "ADBE Radial Shadow") return true;
    }
    try { if (L.property("ADBE Layer Styles").property("dropShadow/enabled").enabled) return true; } catch (e) {}
    return false;
}
function pgTextBounds(L, t) {
    // approximate comp-space bounds (no parent / 3D compensation)
    var r = L.sourceRectAtTime(t, false);
    var tr = L.property("ADBE Transform Group");
    var p = tr.property("ADBE Position").valueAtTime(t, false);
    var a = tr.property("ADBE Anchor Point").valueAtTime(t, false);
    var s = tr.property("ADBE Scale").valueAtTime(t, false);
    var sx = s[0] / 100, sy = s[1] / 100;
    var x0 = p[0] + (r.left - a[0]) * sx, y0 = p[1] + (r.top - a[1]) * sy;
    return {x0: x0, y0: y0, x1: x0 + r.width * sx, y1: y0 + r.height * sy};
}
function pgWalk(comp, visit, depth, seen) {
    if (depth > 6) return;
    var q;
    for (q = 1; q <= comp.numLayers; q++) {
        var L = comp.layer(q);
        visit(L, comp, depth);
        try {
            if (L.source && (L.source instanceof CompItem)) {
                var id = "c" + L.source.id;
                if (!seen[id]) { seen[id] = true; pgWalk(L.source, visit, depth + 1, seen); }
            }
        } catch (e) {}
    }
}

function cheapAudit(comp, logPath, opts) {
    opts = opts || {};
    var Z = pgZones(opts), maxFx = opts.maxFx ? opts.maxFx : 4;
    var fams = {}, famList = [], lines = [], warn = 0;
    pgWalk(comp, function (L, C, depth) {
        var tag = C.name + " > " + L.name;
        try {
            var fx = L.property("ADBE Effect Parade");
            if (fx && fx.numProperties > maxFx) { lines.push("FX     " + tag + ": " + fx.numProperties + " effects (> " + maxFx + ")"); warn++; }
        } catch (e1) {}
        if (!(L instanceof TextLayer) || L.guideLayer) return;
        try {
            var td = L.property("ADBE Text Properties").property("ADBE Text Document").value;
            var fam = td.fontFamily ? td.fontFamily : td.font;
            if (!fams[fam]) { fams[fam] = true; famList.push(fam); }
        } catch (e2) {}
        if (pgHasShadow(L)) { lines.push("SHADOW " + tag + ": drop shadow - is there a surface behind it?"); warn++; }
        if (depth === 0) {   // only main-comp text is checked against the frame
            try {
                var t = Math.max(L.inPoint, Math.min(L.outPoint - C.frameDuration, (L.inPoint + L.outPoint) / 2));
                var b = pgTextBounds(L, t), W = C.width, H = C.height;
                var hit = [];
                if (b.y0 < H * Z.top) hit.push("top");
                if (b.y1 > H * (1 - Z.bottom)) hit.push("bottom");
                if (b.x0 < W * Z.side) hit.push("left");
                if (b.x1 > W * (1 - Z.side)) hit.push("right");
                if (b.x1 > W * (1 - Z.right) && b.y1 > H * Z.rightFrom) hit.push("UI column");
                if (hit.length) { lines.push("ZONE   " + tag + ": enters " + hit.join(", ") + " dead zone"); warn++; }
            } catch (e3) { lines.push("ZONE   " + tag + ": bounds failed " + String(e3.message)); }
        }
    }, 0, {});
    var head = [];
    head.push("cheapAudit " + comp.name + "  platform=" + (opts.platform || "reels") + "  " + (new Date()).toString());
    head.push("FONTS  " + famList.length + " families: " + famList.join(" | ") + (famList.length > 2 ? "   <-- WARNING > 2" : ""));
    if (famList.length > 2) warn++;
    var txt = head.concat(lines).concat(["WARNINGS " + warn]).join("\n");
    if (logPath) {
        try { var f = new File(logPath); f.encoding = "UTF-8"; f.open("w"); f.write(txt); f.close(); }
        catch (e4) { pgLog("write: " + String(e4.message)); }
    }
    pgLog(txt);
    return warn;
}
