// a_ink_halo.jsx : "InkHalo" look (ref Video-69423, AE preset demo) + its 2 f white burn-in. ES3, not yet run in AE.
// Guide: private study notes (not included) (69423).
//
// What the ref shows (30 fps): a dark, moody B/W shot (silhouette on a hill, stormy sky). At 1.47 s the
// frame blows out to white for 2 f (exposure ramp, not a cut), then lands on the look:
//   - luminance is INVERTED (sky becomes pale pink/white, the silhouette stays black because it is masked
//     / keyed back), i.e. a negative print on paper,
//   - every dark blob of the inverted image is filled with a DEEP RED + fine dark halftone dot screen and a
//     soft red/salmon halo bleeding 10-20 px outside it ("ink halo"),
//   - edges get a thin dark ink outline, slight paper grain. Holds ~4 s with a slow push.
// AE build (all stock + Sapphire):
//   ADJ on top of the plate:
//     1 Invert (ADBE Invert, Channel RGB; Blend With Original keyed 100 -> 0 for the pop)  [or S_Invert]
//     2 Levels (ADBE Easy Levels2): input black 0.18, input white 0.92, gamma 0.85 -> crisp paper whites
//     3 Tint (ADBE Tint): map black -> #3A0508 (ink red-black), map white -> #F4E4E6 (pink paper), 100 %
//     4 S_HalfTone on a DUPLICATE ADJ with a luma key (only darks): dot size ~4 px @1080, angle 45,
//       blended Multiply at 55 % -> dots only inside the red blobs
//     5 Glow (ADBE Glo2) threshold 35 %, radius 18 (x comp.width/1080), intensity 0.8, colours A&B
//       = #C81E2C / #FF8A80 with "Glow Colors = A & B" -> the red halo around blobs
//   Subject: keep the original silhouette above (Vision matte) so the person stays solid black.
//   Burn-in: Exposure (ADBE Exposure2) 0 -> +3.5 over 2 f on the ADJ, then +3.5 -> 0 over 2 f while the
//   look's opacity goes 0 -> 100 on the same frames.
// SFX: the ref has none (music only). Ours: soft sub hit + air texture on the white frame
// (premium/cinematic_impacts_hits/mixkit__short-bass-hit-2299.wav -20 dB +
//  premium_oct27/batchA/whip_smear/mixkit__deep-air-woosh-2604.wav -26 dB, peak on the white frame).
//
// Usage:  #include "a_ink_halo.jsx"   inkHalo(comp, tIn, tOut, {burn:true});

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _iho(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _ihHex(h) { return [parseInt(h.substr(1, 2), 16) / 255, parseInt(h.substr(3, 2), 16) / 255, parseInt(h.substr(5, 2), 16) / 255]; }

function _ihSet(fx, name, v) {
    var p = null;
    try { p = fx.property(name); } catch (e) { p = null; }
    if (!p) { $.writeln("inkHalo: param not found: " + name); return null; }
    try { p.setValue(v); } catch (e2) { $.writeln("inkHalo set " + name + ": " + String(e2.message) + " L" + e2.line); }
    return p;
}

function inkHalo(comp, tIn, tOut, opts) {
    var fd = comp.frameDuration, k = comp.width / 1080;
    var adj = comp.layers.addSolid([1, 1, 1], "ADJ_INKHALO", comp.width, comp.height, comp.pixelAspect, comp.duration);
    adj.adjustmentLayer = true; adj.label = LBL.ADJ;
    adj.inPoint = tIn - 2 * fd; adj.outPoint = tOut;

    var fxp = adj.property("ADBE Effect Parade");
    fxp.addProperty("ADBE Invert");
    fxp.addProperty("ADBE Easy Levels2");
    fxp.addProperty("ADBE Tint");
    (function (P) { try { return P.addProperty("ADBE Glo2"); } catch (e) {} var g = P.addProperty("S_Glow"); g = P.property(P.numProperties); for (var j = 1; j <= g.numProperties; j++) { var p = g.property(j); try { if (p.name == "Brightness") p.setValue(0.6); else if (p.name == "Threshold") p.setValue(0.6); else if (p.name == "Glow Width") p.setValue(40); else if (p.name == "Expand Borders") p.setValue(1); } catch (e2) {} } return g; })(fxp);   // Glo2 missing in AE 26 -> restrained S_Glow (2026-11-09)
    fxp.addProperty("ADBE Exposure2");
    // refs only after all adds
    var lv = fxp.property(2), tn = fxp.property(3), gl = fxp.property(4), ex = fxp.property(5);
    _ihSet(lv, "Input Black", 0.18); _ihSet(lv, "Input White", 0.92); _ihSet(lv, "Gamma", 0.85);
    _ihSet(tn, "Map Black To", _ihHex(_iho(opts, "ink", "#3A0508")));
    _ihSet(tn, "Map White To", _ihHex(_iho(opts, "paper", "#F4E4E6")));
    _ihSet(gl, "Glow Threshold", 35); _ihSet(gl, "Glow Radius", 18 * k); _ihSet(gl, "Glow Intensity", 0.8);
    _ihSet(gl, "Color A", _ihHex("#C81E2C")); _ihSet(gl, "Color B", _ihHex("#FF8A80"));
    // Glow Colors dropdown = A & B Colors (2) ; Glow Operation stays Add
    _ihSet(gl, "Glow Colors", 2);

    if (_iho(opts, "burn", true)) {
        var e = ex.property(3);                    // Exposure (Master)
        e.setValueAtTime(tIn - 2 * fd, 0); e.setValueAtTime(tIn, 3.5); e.setValueAtTime(tIn + 2 * fd, 0);
        // the look itself pops in under the white frame
        var tnAmt = tn.property(3);                // Amount to Tint 0 -> 100 under the flash
        tnAmt.setValueAtTime(tIn - fd, 0); tnAmt.setValueAtTime(tIn + fd, 100);
        var blend = fxp.property(1).property(2);   // Invert: Blend With Original 100 -> 0
        blend.setValueAtTime(tIn - fd, 100); blend.setValueAtTime(tIn + fd, 0);
    }
    // halftone layer (Sapphire), darks only - optional
    if (_iho(opts, "halftone", true)) {
        try {
            var ht = comp.layers.addSolid([1, 1, 1], "ADJ_INKHALO_DOTS", comp.width, comp.height, comp.pixelAspect, comp.duration);
            ht.adjustmentLayer = true; ht.label = LBL.ADJ;
            ht.inPoint = tIn; ht.outPoint = tOut;
            ht.blendingMode = BlendingMode.MULTIPLY;
            ht.property("ADBE Transform Group").property("ADBE Opacity").setValue(55);
            ht.property("ADBE Effect Parade").addProperty("S_HalfTone");
            $.writeln("inkHalo: S_HalfTone added - probe its params (dot size ~4 px @1080, angle 45) before keying");
        } catch (e3) { $.writeln("inkHalo halftone: " + String(e3.message) + " L" + e3.line); }
    }
    return adj;
}
