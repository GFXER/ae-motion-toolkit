// sfx_cue_sheet.jsx : NaughtyyJuan sound-design rules -> CSV cue sheet for our OFFLINE mix (ES3).
// Guide: private study notes (not included)
//
// Rules encoded: swoosh PEAK sits on the transition midpoint; tick on the frame text appears;
// hit on scale slams / impacts; one cue per comp marker (hit). Levels follow <asset-library>
// Python reads the CSV and places/layers/pitch-varies the library files (AE audio levels do not apply).
//
// Usage:
//   #include "sfx_cue_sheet.jsx"
//   sfxCueSheet(app.project.activeItem, "/abs/path/cues.csv", {minGap: 0.10, slam: 140});
// opts: minGap (s) drops cues closer than this in the same category; slam = scale % jump that counts as a hit;
//       trRegex (default /^(ADJ_)?TR/i), textTick true/false, markerHits true/false, tag "education" lowers all dB by 4.
// Returns the number of cues. NOTE: written 2026-10-20, NOT yet run in AE.

function _scsOpt(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _scsLog(m) { try { $.writeln("[sfx_cue_sheet] " + m); } catch (e) {} }

function _scsKeyRange(prop) { // [tFirst, tLast] of a keyed property, or null
    if (!prop || !prop.canVaryOverTime || prop.numKeys < 2) return null;
    return [prop.keyTime(1), prop.keyTime(prop.numKeys)];
}

function _scsFirstKeyedRange(layer) { // look through Transform + effects for the first keyed range
    var best = null, grp, p, a, b, e, q;
    try {
        grp = layer.property("ADBE Transform Group");
        for (a = 1; a <= grp.numProperties; a++) {
            p = grp.property(a); var r = _scsKeyRange(p);
            if (r && (!best || r[0] < best[0])) best = r;
        }
        var fx = layer.property("ADBE Effect Parade");
        for (b = 1; fx && b <= fx.numProperties; b++) {
            e = fx.property(b);
            for (q = 1; q <= e.numProperties; q++) {
                try { var r2 = _scsKeyRange(e.property(q)); if (r2 && (!best || r2[0] < best[0])) best = r2; } catch (ie) {}
            }
        }
    } catch (err) { _scsLog("range " + layer.name + ": " + String(err.message) + " L" + err.line); }
    return best;
}

function sfxCueSheet(comp, outPath, opts) {
    if (!comp || !(comp instanceof CompItem)) { _scsLog("no comp"); return 0; }
    var minGap = _scsOpt(opts, "minGap", 0.10), slam = _scsOpt(opts, "slam", 140);
    var trRe = _scsOpt(opts, "trRegex", /^(ADJ_)?TR/i);
    var quiet = (_scsOpt(opts, "tag", "") === "education") ? -4 : 0;
    var DB = {swoosh: -24, tick: -30, hit: -16, glitch: -26}; // README-based starting points (offline mix decides)
    var cues = [], k, L, r, mid;

    for (k = 1; k <= comp.numLayers; k++) {
        L = comp.layer(k);
        if (!L.enabled && !L.adjustmentLayer) continue;
        // 1) transitions: swoosh centred on the key midpoint (the "moment of change")
        if (trRe.test(L.name)) {
            r = _scsFirstKeyedRange(L);
            if (r) { mid = (r[0] + r[1]) / 2; cues.push([mid, "swoosh", L.name, DB.swoosh + quiet, "peak on midpoint; len " + (r[1] - r[0]).toFixed(2) + "s"]); }
            continue;
        }
        // 2) text appears: tick on the in-point (or first opacity key)
        if (_scsOpt(opts, "textTick", true) && L instanceof TextLayer) {
            var op = L.property("ADBE Transform Group").property("ADBE Opacity");
            var tt = (op.numKeys > 0) ? op.keyTime(1) : L.inPoint;
            cues.push([Math.max(tt, 0), "tick", L.name, DB.tick + quiet, "type appears"]);
        }
        // 3) scale slams: a key-to-key jump bigger than `slam` % -> hit at the landing key
        try {
            var sc = L.property("ADBE Transform Group").property("ADBE Scale");
            for (var s = 2; s <= sc.numKeys; s++) {
                var d = Math.abs(sc.keyValue(s)[0] - sc.keyValue(s - 1)[0]);
                if (d >= slam) cues.push([sc.keyTime(s), "hit", L.name, DB.hit + quiet, "scale jump " + Math.round(d) + "%"]);
            }
        } catch (se) {}
    }
    // 4) comp markers = hits (your beat/impact markers)
    if (_scsOpt(opts, "markerHits", true)) {
        try {
            var mk = comp.markerProperty;
            for (var m = 1; m <= mk.numKeys; m++) cues.push([mk.keyTime(m), "hit", "marker:" + mk.keyValue(m).comment, DB.hit + quiet, "comp marker"]);
        } catch (me) {}
    }
    // sort by time (ES3 sort with comparator is fine) and thin per category
    cues.sort(function (a, b) { return a[0] - b[0]; });
    var last = {}, out = [], c;
    for (c = 0; c < cues.length; c++) {
        var cat = cues[c][1];
        if (last[cat] !== undefined && cues[c][0] - last[cat] < minGap) continue;
        last[cat] = cues[c][0]; out.push(cues[c]);
    }
    var f = new File(outPath);
    f.encoding = "UTF-8";
    if (!f.open("w")) { _scsLog("cannot write " + outPath); return 0; }
    f.writeln("t,frame,category,layer,db,note");
    for (c = 0; c < out.length; c++) {
        var row = out[c];
        f.writeln(row[0].toFixed(3) + "," + Math.round(row[0] * comp.frameRate) + "," + row[1] + ",\"" +
                  String(row[2]).replace(/"/g, "'") + "\"," + row[3] + ",\"" + row[4] + "\"");
    }
    f.close();
    _scsLog(out.length + " cues -> " + outPath);
    return out.length;
}
