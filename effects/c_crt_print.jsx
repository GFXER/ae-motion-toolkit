// c_crt_print.jsx : "CRT Print" look (ref Video-33340, oct27 batch C): footage becomes a 5-tone
// violet/cyan/white gradient map printed through a coarse square halftone dot screen, with faint scanlines,
// plus the "apply" hit (exposure blow-out -> 2 f electric invert frame -> settle).
// Guide: private study notes (not included) §33340.
//
// Measured look (frame 5.2 s): shadows pure black-navy, darktones deep violet #2A00C8, mids #7B2CFF,
// brights cyan #18C8FF, highlights pink-white #FFE6FF. Dot screen ~8 px cells @720 wide (= 24 px @2160),
// 45 deg-ish diamond grid, dots grow in shadows (classic halftone). Light horizontal scanline banding.
// Apply hit @30 fps: f0 normal, f+1 exposure +1 (yellow-hot), f+2 magenta over-saturated, f+3..4 full
// electric/inverted frame (cyan/blue lightning BG), f+5 settled look.
//
// Usage:
//   #include "c_crt_print.jsx"
//   var adj = cCrtPrint(comp, tOn, {cell: 24});          // adjustment layer over everything from tOn
//   opts: cell (dot size px @2160 wide, 24), tones [5 RGB 0-1], scan (true), hit (true), angle (45)
// Order on the ADJ: CC Toner (Pentone) -> Posterize (8) -> S_HalfToneColor (fallback S_HalfTone)
// -> S_ScanLines (faint) -> Unsharp. Params by display name; missing ones are logged, not fatal.
// CHECK in AE: CC Toner "Tones" menu index for Pentone, S_HalfTone* param names (dot size / angle / shape).
// SFX (ref 33340): apply = low boom (+11 dB jump, <120 Hz) on f+1, then an electric crackle/zap tail
// (~4 kHz) over the lightning frames. Library: premium/glitch_digital/mixkit__static-electric-crackles-1455.wav
// (-24 dB, 0.4 s) + premium_oct27/batchC/scan_electric/mixkit__machine-activation-short-3180.wav (-22 dB)
// + a soft sub from premium/sub_drops_booms at -18 dB. No sparkle.
// Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _crO(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _crSet(fx, names, v) {
    for (var i = 0; i < names.length; i++) {
        try { var p = fx.property(names[i]); if (p) { p.setValue(v); return p; } } catch (e) {}
    }
    $.writeln("cCrtPrint: none of params found: " + names.join("/"));
    return null;
}
function _crHex(h) { return [parseInt(h.substr(1, 2), 16) / 255, parseInt(h.substr(3, 2), 16) / 255, parseInt(h.substr(5, 2), 16) / 255]; }

function cCrtPrint(comp, tOn, opts) {
    var fd = comp.frameDuration;
    var fps = Math.round(1 / fd);
    var k30 = fps / 30;
    var tones = _crO(opts, "tones", [_crHex("#FFE6FF"), _crHex("#18C8FF"), _crHex("#7B2CFF"), _crHex("#2A00C8"), _crHex("#02000C")]);
    var cell = _crO(opts, "cell", 24) * comp.width / 2160;

    var adj = comp.layers.addSolid([1, 1, 1], "ADJ_crt_print", comp.width, comp.height, 1, comp.duration - tOn);
    adj.adjustmentLayer = true; adj.label = LBL.ADJ; adj.startTime = tOn; adj.moveToBeginning();
    var fxp = adj.property("ADBE Effect Parade");
    var names = ["CC Toner", "ADBE Posterize", "S_HalfToneColor", "S_ScanLines", "ADBE Unsharp Mask2"];
    var added = [];
    for (var i = 0; i < names.length; i++) {
        if (names[i] === "S_ScanLines" && !_crO(opts, "scan", true)) continue;
        try { fxp.addProperty(names[i]); added.push(names[i]); }
        catch (e) {
            if (names[i] === "S_HalfToneColor") { try { fxp.addProperty("S_HalfTone"); added.push("S_HalfTone"); } catch (e2) {} }
            else $.writeln("cCrtPrint: cannot add " + names[i]);
        }
    }
    for (var j = 0; j < added.length; j++) {               // fetch params only after all effects exist
        var fx = fxp.property(j + 1), n = added[j];
        if (n === "CC Toner") {
            _crSet(fx, ["Tones"], 2);                      // 1 Duotone, 2 Pentone? (menu: Duotone/Tritone/Pentone) -> check
            _crSet(fx, ["Highlights"], tones[0]); _crSet(fx, ["Brights"], tones[1]);
            _crSet(fx, ["Midtones"], tones[2]); _crSet(fx, ["Darktones"], tones[3]); _crSet(fx, ["Shadows"], tones[4]);
        } else if (n === "ADBE Posterize") {
            _crSet(fx, ["Level"], 8);
        } else if (n === "S_HalfToneColor" || n === "S_HalfTone") {
            _crSet(fx, ["Dot Size", "Frequency"], cell);
            _crSet(fx, ["Angle", "Rotate"], _crO(opts, "angle", 45));
            _crSet(fx, ["Dot Shape", "Shape"], 2);         // square/diamond if available
            _crSet(fx, ["Mix with Orig", "Mix"], 0.15);
        } else if (n === "S_ScanLines") {
            _crSet(fx, ["Lines Freq", "Frequency"], comp.height / 6);
            _crSet(fx, ["Mix with Orig", "Mix"], 0.85);   // faint
        } else if (n === "ADBE Unsharp Mask2") {
            _crSet(fx, ["Amount"], 40); _crSet(fx, ["Radius"], 1.5);
        }
    }

    if (_crO(opts, "hit", true)) {                         // the apply hit
        var hit = comp.layers.addSolid([1, 1, 1], "ADJ_crt_hit", comp.width, comp.height, 1, Math.round(6 * k30) * fd);
        hit.adjustmentLayer = true; hit.label = LBL.ADJ; hit.startTime = tOn; hit.moveToBeginning();
        var hp = hit.property("ADBE Effect Parade");
        hp.addProperty("ADBE Exposure2"); hp.addProperty("ADBE Invert"); hp.addProperty("ADBE HUE SATURATION");
        var ex = hp.property(1).property(3);               // Exposure (house note: prop 3)
        ex.setValueAtTime(tOn, 0);
        ex.setValueAtTime(tOn + Math.round(1 * k30) * fd, 1.0);
        ex.setValueAtTime(tOn + Math.round(2 * k30) * fd, 1.6);
        ex.setValueAtTime(tOn + Math.round(5 * k30) * fd, 0);
        var inv = hp.property(2).property(2);              // Blend With Original (100 = off)
        inv.setValueAtTime(tOn, 100);
        inv.setValueAtTime(tOn + Math.round(3 * k30) * fd, 0);
        inv.setValueAtTime(tOn + Math.round(5 * k30) * fd, 100);
        for (var q = 1; q <= inv.numKeys; q++) inv.setInterpolationTypeAtKey(q, KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
    }
    return adj;
}
