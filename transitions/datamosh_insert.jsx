// datamosh_insert.jsx : place a REAL datamosh clip (made by datamosh.py (video-fx-tools repo)) over a cut. ES3.
// Guide: private study notes (not included)
//
// datamosh.py concatenates A + B, drops the I-frame at the cut and repeats P-frames (bloom), then re-encodes to ProRes.
// This helper imports that .mov and lays it over the comp so its cut frame lands on tCut. The mosh clip covers
// preF frames before the cut (clean A, hidden under nothing) and postF frames after it (the mosh), then hands off
// to the live B layer underneath with a hard cut (or a 2 f opacity blend if opts.blendF).
//
// Usage:
//   #include "datamosh_insert.jsx"
//   var L = datamoshInsert(comp, "/abs/mosh_A_B.mov", 4.0, 1.20, {preF: 2, postF: 18, blendF: 0});
//     4.0  = cut time in the comp, 1.20 = duration of clip A inside the mosh file (= --a clip length)
// Returns the layer. Not yet run in AE.

if (typeof LBL === "undefined") { var LBL = {CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15}; }

function _dmo(o, k, d) { return (o && o[k] !== undefined) ? o[k] : d; }

function datamoshInsert(comp, filePath, tCut, aDur, opts) {
    var f = new File(filePath);
    if (!f.exists) { try { $.writeln("[datamosh_insert] missing " + filePath); } catch (e) {} return null; }
    var it = app.project.importFile(new ImportOptions(f));
    var L = comp.layers.add(it);
    var fd = comp.frameDuration;
    L.startTime = tCut - aDur;                     // mosh file's cut frame lands on tCut
    L.inPoint = tCut - _dmo(opts, "preF", 2) * fd;
    L.outPoint = tCut + _dmo(opts, "postF", 18) * fd;
    L.name = "VID_MOSH_" + Math.round(tCut / fd);
    L.label = LBL.VIDEO;
    var bf = _dmo(opts, "blendF", 0);
    if (bf > 0) {
        var op = L.property("ADBE Transform Group").property("ADBE Opacity");
        op.setValueAtTime(L.outPoint - bf * fd, 100);
        op.setValueAtTime(L.outPoint, 0);
    }
    // the moshed file has 25-30 fps step + ProRes: interpret to the comp fps only if the user rendered it at comp fps
    try { it.mainSource.conformFrameRate = _dmo(opts, "fps", 0) || it.mainSource.nativeFrameRate; } catch (e2) {}
    return L;
}
