// graph_lib.jsx - MEASURED ease curves as real AE keyframes (ES3).  2026-11-09
// Source: private study notes (not included) (curves measured off zine refs 72530/12275/38816
// with curve_fit.py (video-fx-tools repo), plus our house eases for comparison).
//
// Every family is a cubic bezier on NORMALISED value/time (x1,y1,x2,y2) - the same thing the AE value graph shows.
// Mapping to AE KeyframeEase (2 keys, v0 -> v1 over dur seconds, avg speed = (v1-v0)/dur):
//     key1 OUT : influence = x1*100,      speed = (y1/x1)       * avg
//     key2 IN  : influence = (1-x2)*100,  speed = ((1-y2)/(1-x2)) * avg      (negative = overshoot, AE-native)
// so a family with y1=0 and y2=1 is just "out x1*100 / in (1-x2)*100, speeds 0".
//
// API
//   glKey(prop, t0, t1, v0, v1, fam)         two keys + measured ease; v0/v1 numbers or arrays. returns prop
//   glKey3(prop, t0, tc, t1, v0, vc, v1, famA, famB)  through-cut move: key AT the cut with continuous speed
//   glExpr(fam, t0, t1, v0, v1)              expression fallback (bezier solver) - use for spatial overshoot, layers w/o keys
//   glHold(prop, times, values)              stepped hold keys (stickers / ransom letters / 2 f boil)
//   glStep(prop, fps)                        adds posterizeTime(fps) in front of the existing expression (stepped look)
//   glEaseInfo(fam, dv, dur)                 [outInfl, outSpeed, inInfl, inSpeed] for logging / Python parity
// Families: see GL_FAM below. Keep names in sync with tools/curve_fit.py FAMILIES.

var GL_FAM = {
    // --- measured on the zine refs (mean curve of each cluster, rms of the mean fit in brackets) ---
    zine_whip_entry:  [0.114, 0.625, 0.218, 0.962],  // after a cut: starts at peak speed, 72/90/97/100 % travel at 25/50/75/90 % time (0.3 %)
    zine_whip_exit:   [0.951, 0.009, 0.863, 0.374],  // into a cut: 1/6/20/49 % travel, peak speed ON the last frame (0.2 %)
    zine_snap_step:   [0.292, 0.809, 0.212, 1.039],  // 2-3 f snap zoom inside a held collage, ~2-6 % overshoot, 72/96/100/102 (0.9 %)
    through_cut_whip: [0.749, -0.092, 0.0, 1.196],   // one 2-key move spanning the cut, peak speed at ~40 % (1.8 %)
    ui_tilt_s:        [0.782, 0.16, 0.146, 1.039],   // lyric-app camera tilt/rotate, S-curve, peak 43 % (1.3 %)
    ios_scroll:       [0.384, 0.269, 0.006, 1.041],  // lyric line scroll, fast start, 1 % overshoot (1.2 %)
    droste_linear:    [0.382, 0.48, 0.653, 0.305],   // tunnel/Droste zoom keyed in %, gently accelerating (0.4 %)
    // --- reference / house curves (for A/B and old builders) ---
    expo_out:         [0.05, 0.75, 0.10, 1.0],       // house "80 % in 2-3 f"
    flow_051:         [0.51, 0.0, 0.0, 1.0],         // house Flow out 51 / in 100
    house_30_90:      [0.30, 0.0, 0.10, 1.0],        // house camera ease out 30 / in 90
    easy_ease:        [0.333, 0.0, 0.667, 1.0],      // AE F9 default
    linear:           [0.0, 0.0, 1.0, 1.0]
};

function glFam(f) { if (typeof f == "string") { if (!GL_FAM[f]) throw new Error("graph_lib: unknown family " + f); return GL_FAM[f]; } return f; }

function glEaseInfo(fam, dv, dur) {
    var b = glFam(fam), x1 = b[0], y1 = b[1], x2 = b[2], y2 = b[3], avg = dv / dur;
    var i0 = Math.max(0.001, x1), i1 = Math.max(0.001, 1 - x2);
    var s0 = (x1 > 1e-4) ? (y1 / i0) * avg : 0, s1 = ((1 - x2) > 1e-4) ? ((1 - y2) / i1) * avg : 0;
    return [Math.min(100, Math.max(0.1, i0 * 100)), s0, Math.min(100, Math.max(0.1, i1 * 100)), s1];
}

function glDims(prop) {
    var v = prop.value;
    if (prop.isSpatial) return 1;                                    // spatial: one ease along the path
    return (v instanceof Array) ? v.length : 1;
}

function glNum(v, k) { return (v instanceof Array) ? v[k] : v; }

function glPathLen(v0, v1) {
    if (!(v0 instanceof Array)) return v1 - v0;
    var s = 0; for (var k = 0; k < v0.length; k++) s += (v1[k] - v0[k]) * (v1[k] - v0[k]); return Math.sqrt(s);
}

// set the ease of key index ki: which = "out" | "in"; infl %, speeds per dim (array) -> keeps the other side untouched
function glSetSide(prop, ki, which, infl, speeds) {
    var n = glDims(prop), inE = prop.keyInTemporalEase(ki), outE = prop.keyOutTemporalEase(ki), a = [], b = [];
    for (var d = 0; d < n; d++) {
        var e = new KeyframeEase(speeds[d], infl);
        if (which == "out") { a.push(inE[d]); b.push(e); } else { a.push(e); b.push(outE[d]); }
    }
    prop.setInterpolationTypeAtKey(ki, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
    prop.setTemporalEaseAtKey(ki, a, b);
}

function glEaseSegment(prop, k1, k2, fam, v0, v1, dur) {
    v0 = prop.keyValue(k1); v1 = prop.keyValue(k2);            // real stored values (2D layers store [x,y,z] for scale)
    var n = glDims(prop), so = [], si = [], inf = null;
    for (var d = 0; d < n; d++) {
        var dv = prop.isSpatial ? Math.abs(glPathLen(v0, v1)) : (glNum(v1, d) - glNum(v0, d));
        if (Math.abs(dv) < 1e-9) dv = 1e-9;
        var e = glEaseInfo(fam, dv, dur); inf = e;
        var s0 = e[1], s1 = e[3];
        if (prop.isSpatial) { s0 = Math.abs(s0); s1 = Math.max(0, s1); }   // spatial speed is a magnitude (no overshoot -> use glExpr)
        so.push(s0); si.push(s1);
    }
    glSetSide(prop, k1, "out", inf[0], so);
    glSetSide(prop, k2, "in", inf[2], si);
}

function glKey(prop, t0, t1, v0, v1, fam) {
    var k1 = prop.addKey(t0); prop.setValueAtKey(k1, v0);
    var k2 = prop.addKey(t1); prop.setValueAtKey(k2, v1);
    k1 = prop.nearestKeyIndex(t0); k2 = prop.nearestKeyIndex(t1);
    if (prop.isSpatial) { try { prop.setSpatialTangentsAtKey(k1, [0, 0, 0], [0, 0, 0]); prop.setSpatialTangentsAtKey(k2, [0, 0, 0], [0, 0, 0]); } catch (e) {} }
    glEaseSegment(prop, k1, k2, fam, v0, v1, t1 - t0);
    return prop;
}

// key A (t0,v0) -> key C at the cut (tc,vc) -> key B (t1,v1). famA shapes A->C (use zine_whip_exit), famB shapes C->B
// (use zine_whip_entry). The cut key gets the SAME speed on both sides (continuous, no value pop) = mean of the two
// family speeds, so the graph peaks exactly on the cut frame like the reference.
function glKey3(prop, t0, tc, t1, v0, vc, v1, famA, famB) {
    var ka = prop.addKey(t0); prop.setValueAtKey(ka, v0);
    var kc = prop.addKey(tc); prop.setValueAtKey(kc, vc);
    var kb = prop.addKey(t1); prop.setValueAtKey(kb, v1);
    ka = prop.nearestKeyIndex(t0); kc = prop.nearestKeyIndex(tc); kb = prop.nearestKeyIndex(t1);
    glEaseSegment(prop, ka, kc, famA || "zine_whip_exit", v0, vc, tc - t0);
    glEaseSegment(prop, kc, kb, famB || "zine_whip_entry", vc, v1, t1 - tc);
    var n = glDims(prop), inE = prop.keyInTemporalEase(kc), outE = prop.keyOutTemporalEase(kc), a = [], b = [];
    for (var d = 0; d < n; d++) {
        var s = (inE[d].speed + outE[d].speed) / 2;
        a.push(new KeyframeEase(s, inE[d].influence)); b.push(new KeyframeEase(s, outE[d].influence));
    }
    prop.setTemporalEaseAtKey(kc, a, b);
    try { prop.setTemporalContinuousAtKey(kc, true); } catch (e) {}
    return prop;
}

function glExpr(fam, t0, t1, v0, v1) {
    var b = glFam(fam);
    function lit(v) { if (!(v instanceof Array)) return String(v); var s = []; for (var k = 0; k < v.length; k++) s.push(String(v[k])); return "[" + s.join(",") + "]"; }
    return "var x1=" + b[0] + ",y1=" + b[1] + ",x2=" + b[2] + ",y2=" + b[3] + ";" +
        "function bz(t){var lo=0,hi=1,u=t;for(var k=0;k<28;k++){u=(lo+hi)/2;var x=3*(1-u)*(1-u)*u*x1+3*(1-u)*u*u*x2+u*u*u;if(x<t)lo=u;else hi=u;}" +
        "return 3*(1-u)*(1-u)*u*y1+3*(1-u)*u*u*y2+u*u*u;}" +
        "var t=clamp((time-" + t0 + ")/(" + (t1 - t0) + "),0,1);var a=" + lit(v0) + ",b=" + lit(v1) + ";a+(b-a)*bz(t);";
}

function glHold(prop, times, values) {
    for (var k = 0; k < times.length; k++) {
        var ki = prop.addKey(times[k]); prop.setValueAtKey(ki, values[k]);
    }
    for (var j = 1; j <= prop.numKeys; j++) prop.setInterpolationTypeAtKey(j, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
    return prop;
}

function glStep(prop, fps) {
    var ex = prop.expression || "value";
    prop.expression = "posterizeTime(" + fps + ");\n" + ex;
    return prop;
}
