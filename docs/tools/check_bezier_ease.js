// Node check for the bezier <-> AE ease helpers in utils/graph_lib.jsx (no After Effects needed).
//   node docs/tools/check_bezier_ease.js
// 1. bezierToAE -> aeToBezier gives the original four numbers back for every family.
// 2. A fake AE property with two keys: bezierEase writes the ease, aeKeysToBezier reads the same curve back,
//    for 1D, 2D (per dimension) and spatial properties, and the speeds scale with distance and duration.
// 3. Bad input throws (x outside 0..1, missing keys).
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ctx = {
    Math,
    KeyframeEase: function (speed, influence) { this.speed = speed; this.influence = influence; },
    KeyframeInterpolationType: { BEZIER: 6613, HOLD: 6614 },
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "..", "utils", "graph_lib.jsx"), "utf8"), ctx);

let fails = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; console.log("FAIL", msg); } }
function near(a, b, eps) { return Math.abs(a - b) <= (eps || 1e-9); }
// arrays made inside the script's context, so `instanceof Array` in graph_lib sees them as arrays (like AE does)
const A = (...xs) => vm.runInContext("[" + xs.join(",") + "]", ctx);

// fake property: keys = [{t, v}], eases stored per key
function fakeProp(keys, spatial) {
    const dims = Array.isArray(keys[0].v) && !spatial ? keys[0].v.length : 1;
    const flat = () => Array.from({ length: dims }, () => new ctx.KeyframeEase(0, 33.333));
    const k = keys.map((x) => ({ t: x.t, v: x.v, in: flat(), out: flat() }));
    return {
        isSpatial: !!spatial, value: keys[0].v, get numKeys() { return k.length; },
        keyTime: (i) => k[i - 1].t, keyValue: (i) => k[i - 1].v,
        keyInTemporalEase: (i) => k[i - 1].in, keyOutTemporalEase: (i) => k[i - 1].out,
        setInterpolationTypeAtKey() {},
        setTemporalEaseAtKey(i, a, b) { k[i - 1].in = a; k[i - 1].out = b; },
        _k: k,
    };
}

// 1. round trip on every family (influence is not clamped for any of them except linear)
for (const name of Object.keys(ctx.GL_FAM)) {
    if (name === "linear") continue;
    const b = ctx.GL_FAM[name], r = ctx.bezierToAE(b), back = ctx.aeToBezier(r[0], r[1], r[2], r[3]);
    ok(back.every((v, i) => near(v, b[i], 1e-9)), `round trip ${name}: ${back}`);
}
const lin = ctx.bezierToAE("linear");
ok(near(lin[0], 0.1) && near(lin[2], 0.1) && lin[1] === 0 && lin[3] === 0, "linear clamps to 0.1 % / speed 0");

// glEaseInfo still returns real speeds (ratio x average speed)
const gi = ctx.glEaseInfo("expo_out", 200, 0.5), br = ctx.bezierToAE("expo_out");
ok(near(gi[1], br[1] * 400) && near(gi[3], br[3] * 400) && gi[0] === br[0], "glEaseInfo = bezierToAE x avg");

// 2. write + read back through a fake property
const curve = [0.29, 0.81, 0.21, 1.04];
const p1 = fakeProp([{ t: 1, v: 10 }, { t: 1.5, v: 310 }]);
ctx.bezierEase(p1, 1, null, curve);                       // k2 defaults to k1 + 1
ok(near(p1._k[0].out[0].influence, 29) && near(p1._k[1].in[0].influence, 79), "influence = x1 / 1-x2");
ok(near(p1._k[0].out[0].speed, (0.81 / 0.29) * 600, 1e-6), "1D out speed = y1/x1 x avg");
ok(near(p1._k[1].in[0].speed, (-0.04 / 0.79) * 600, 1e-6), "1D in speed negative (overshoot)");
ok(ctx.aeKeysToBezier(p1, 1, 2).every((v, i) => near(v, curve[i], 1e-9)), "1D read back");
ok(p1._k[0].in[0].influence === 33.333 && p1._k[1].out[0].influence === 33.333, "other sides untouched");

// same curve, different distance and duration -> same bezier back
const p2 = fakeProp([{ t: 0, v: A(0, 100) }, { t: 2, v: A(-50, 900) }]);
ctx.bezierEase(p2, 1, 2, curve);
for (const d of [0, 1]) ok(ctx.aeKeysToBezier(p2, 1, 2, d).every((v, i) => near(v, curve[i], 1e-9)), `2D dim ${d} read back`);
ok(p2._k[0].out[0].speed < 0 && p2._k[0].out[1].speed > 0, "2D speeds keep the sign of each dimension");

// spatial: magnitude along the path, no negative speeds
const p3 = fakeProp([{ t: 0, v: A(0, 0) }, { t: 1, v: A(300, 400) }], true);
ctx.bezierEase(p3, 1, 2, "zine_whip_entry");
ok(near(p3._k[0].out[0].speed, ctx.bezierToAE("zine_whip_entry")[1] * 500, 1e-6), "spatial uses path length");
ctx.bezierEase(p3, 1, 2, curve);
ok(p3._k[1].in[0].speed === 0, "spatial overshoot clamps to 0 (use glExpr)");

// still segment -> null
ok(ctx.aeKeysToBezier(fakeProp([{ t: 0, v: 5 }, { t: 1, v: 5 }]), 1, 2) === null, "still segment returns null");

// 3. errors
function throws(fn) { try { fn(); return false; } catch (e) { return true; } }
ok(throws(() => ctx.bezierToAE([1.2, 0, 0.5, 1])), "x1 > 1 throws");
ok(throws(() => ctx.bezierToAE([0.2, 0, -0.1, 1])), "x2 < 0 throws");
ok(throws(() => ctx.bezierEase(fakeProp([{ t: 0, v: 0 }]), 1)), "one key throws");
ok(throws(() => ctx.bezierEase(p1, 1, 2, "no_such_family")), "unknown family throws");
ok(throws(() => ctx.bezierEase(p1, 1, 2)), "missing curve throws");
ok(throws(() => ctx.bezierEase(p1, 1, 2, [0.2, 0.5, 1])), "3-number curve throws");

console.log(`${checks - fails}/${checks} checks pass`);
process.exit(fails ? 1 : 0);
