// pixel_morph_text.jsx : NaughtyyJuan "1-click text morph" = stacked Pixel Motion Blur on nested precomps (ES3).
// Guide: private study notes (not included)
//
// Hard-cut word layers -> precompose -> Pixel Motion Blur (Shutter Control Manual, Angle 250, Samples 30,
// Vector Detail 20) -> precompose again -> same effect ... N times (tutorial ~4). Optical flow between two
// different words on the cut makes one word melt into the next.
//
// Usage:
//   #include "layer_labels.jsx"          // optional
//   #include "pixel_morph_text.jsx"
//   var ws = wordCutLayers(comp, ["MORPH","LIKE","AND","SUBSCRIBE"], 1.0, [14,10,12,24], {font:"Poppins-ExtraBold", size:260});
//   var top = pixelMorphText(comp, ws, 4, {angle:250, samples:30, detail:20, name:"PC_MORPH"});
// Returns the outermost precomp layer (in comp). Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _pmo(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }
function _pmLog(m) { try { $.writeln("[pixel_morph_text] " + m); } catch (e) {} }

// Pixel Motion Blur matchName is not verified yet: try candidates, then the English display name.
var PM_MATCHNAMES = ["ADBE Pixel Motion Blur", "ADBE PixelMotionBlur", "Pixel Motion Blur"];

function addPixelMotionBlur(layer, angle, samples, detail) {
    var fx = layer.property("ADBE Effect Parade"), e = null, k;
    for (k = 0; k < PM_MATCHNAMES.length && !e; k++) {
        try { if (fx.canAddProperty(PM_MATCHNAMES[k])) e = fx.addProperty(PM_MATCHNAMES[k]); } catch (er) {}
    }
    if (!e) { _pmLog("Pixel Motion Blur not found"); return null; }
    var idx = e.propertyIndex;                       // re-fetch after add (refs invalidate)
    e = layer.property("ADBE Effect Parade").property(idx);
    // params by index: 1 Shutter Control (1 Automatic, 2 Manual), 2 Shutter Angle, 3 Shutter Samples, 4 Vector Detail
    try { e.property(1).setValue(2); } catch (e1) { _pmLog("shutter control: " + String(e1.message)); }
    try { e.property(2).setValue(angle); } catch (e2) {}
    try { e.property(3).setValue(samples); } catch (e3) {}
    try { e.property(4).setValue(detail); } catch (e4) {}
    return e;
}

// Build centred hard-cut word layers. frames: number or array (per word), at comp fps.
function wordCutLayers(comp, words, t0, frames, opts) {
    var out = [], t = t0, fd = comp.frameDuration, w;
    for (w = 0; w < words.length; w++) {
        var nf = (frames instanceof Array) ? frames[w] : frames;
        var L = comp.layers.addText(words[w]);
        var td = L.property("ADBE Text Properties").property("ADBE Text Document");
        var doc = td.value;
        doc.fontSize = _pmo(opts, "size", 220);
        doc.fillColor = _pmo(opts, "color", [1, 1, 1]);
        doc.justification = ParagraphJustification.CENTER_JUSTIFY;
        try { doc.font = _pmo(opts, "font", "Poppins-ExtraBold"); } catch (ef) {}
        td.setValue(doc);
        var r = L.sourceRectAtTime(t, false);
        L.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([r.left + r.width / 2, r.top + r.height / 2]);
        L.property("ADBE Transform Group").property("ADBE Position").setValue(_pmo(opts, "pos", [comp.width / 2, comp.height / 2]));
        L.inPoint = t; L.outPoint = t + nf * fd;
        L.name = "TXT_W" + (w + 1) + "_" + words[w];
        L.label = LBL.TEXT;
        out.push(L);
        t += nf * fd;
    }
    return out;
}

function pixelMorphText(comp, layers, nests, opts) {
    var angle = _pmo(opts, "angle", 250), samples = _pmo(opts, "samples", 30), detail = _pmo(opts, "detail", 20);
    var base = _pmo(opts, "name", "PC_MORPH"), idxs = [], k;
    for (k = 0; k < layers.length; k++) idxs.push(layers[k].index);
    var pc = comp.layers.precompose(idxs, base + "_0", true);
    pc.motionBlur = false;
    var L = comp.selectedLayers.length ? comp.selectedLayers[0] : null;
    if (!L) { for (k = 1; k <= comp.numLayers; k++) if (comp.layer(k).source === pc) { L = comp.layer(k); break; } }
    for (var n = 1; n <= (nests || 4); n++) {
        addPixelMotionBlur(L, angle, samples, detail);
        L.name = base + "_" + n; L.label = LBL.PRECOMP;
        if (n === nests) break;
        var inner = comp.layers.precompose([L.index], base + "_" + n, true);  // "comp the comp", move attributes
        L = null;
        for (k = 1; k <= comp.numLayers; k++) if (comp.layer(k).source === inner) { L = comp.layer(k); break; }
        if (!L) { _pmLog("lost layer after precompose " + n); return null; }
    }
    return L;
}
