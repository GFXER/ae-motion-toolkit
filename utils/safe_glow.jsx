// ---------------------------------------------------------------- safeGlow (2026-11-09) ----
// Stock Glow ("ADBE Glo2") is NOT loadable in this AE 26 install ("Can not add a property").
// safeGlow(layer, {thr, rad, inten, colA, colB, name}) tries, in order:
//   1 ADBE Glo2  (stock values as given: thr %, rad px, inten)
//   2 S_Glow     (Sapphire, mapped + restrained: Threshold = thr/100, Glow Width = rad*0.8 px clamp 4..160,
//                 Brightness = inten*0.6 clamp 0.05..1.2, Color = colA)
//   3 PC_CratesGlow (Luma Threshold = thr, Size = rad*10 clamp 100..2000, Intensity = inten*60 clamp 10..150)
//   else skip + log.  PEDG2 (Deep Glow 2) is a separate paid plugin; add it explicitly where a real Deep Glow is wanted.
// Returns the effect (or null). Kind-aware setters: sgSet(fx, {thr,rad,inten,colA,colB}), sgInten(fx) (intensity
// property), sgMapI(fx, v) (maps a Glo2 intensity value to that effect's scale, for keyframes). ES3, ASCII only.
// Other libraries may carry an identical copy (whichever loads last wins).
function sgLog(s) { try { $.writeln("safeGlow: " + s); } catch (e) {} try { if (typeof hmLog == "function") hmLog("safeGlow: " + s); } catch (e2) {} }
function sgClamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function sgKind(fx) { if (!fx) return ""; var m = ""; try { m = fx.matchName; } catch (e) {} return m; }
function sgP(fx, re) { // find a property of an effect by name regex (first match)
    for (var j = 1; j <= fx.numProperties; j++) { var p = fx.property(j); try { if (re.test(p.name) && p.propertyValueType != PropertyValueType.NO_VALUE) return p; } catch (e) {} }
    return null;
}
function sgSetP(fx, re, v) { var p = sgP(fx, re); if (!p) { sgLog("no prop " + re + " on " + sgKind(fx)); return; } try { p.setValue(v); } catch (e) { sgLog("set " + re + " fail: " + String(e.message) + " L" + e.line); } }
function sgMapI(fx, v) {
    var k = sgKind(fx);
    if (k == "S_Glow") return sgClamp(v * 0.6, 0.05, 1.2);
    if (k == "PC_CratesGlow") return sgClamp(v * 60, 10, 150);
    return v;
}
function sgInten(fx) {
    var k = sgKind(fx);
    if (k == "ADBE Glo2") return fx.property("Glow Intensity");
    if (k == "S_Glow") return sgP(fx, /^Brightness$/);
    if (k == "PC_CratesGlow") return sgP(fx, /^Intensity$/);
    return null;
}
function sgSet(fx, o) {
    if (!fx) return fx; o = o || {}; var k = sgKind(fx);
    if (k == "ADBE Glo2") {
        try { if (o.thr != null) fx.property("Glow Threshold").setValue(o.thr); if (o.rad != null) fx.property("Glow Radius").setValue(o.rad); if (o.inten != null) fx.property("Glow Intensity").setValue(o.inten);
              if (o.colA != null) { fx.property("Glow Colors").setValue(2); fx.property("Color A").setValue(o.colA); fx.property("Color B").setValue(o.colB != null ? o.colB : o.colA); } }
        catch (e) { sgLog("Glo2 set fail: " + String(e.message) + " L" + e.line); }
    } else if (k == "S_Glow") {
        if (o.thr != null) sgSetP(fx, /^Threshold$/, sgClamp(o.thr / 100, 0, 1));
        if (o.rad != null) sgSetP(fx, /^(Glow )?Width$/, sgClamp(o.rad * 0.8, 4, 160));
        if (o.inten != null) sgSetP(fx, /^Brightness$/, sgMapI(fx, o.inten));
        if (o.colA != null) sgSetP(fx, /^Color$/, o.colA);
        sgSetP(fx, /^Expand Borders$/, 1);                // S_Glow clips to layer bounds otherwise (text layers)
    } else if (k == "PC_CratesGlow") {
        if (o.thr != null) sgSetP(fx, /^Luma Threshold$/, sgClamp(o.thr, 0, 100));
        if (o.rad != null) sgSetP(fx, /^Size$/, sgClamp(o.rad * 10, 100, 2000));
        if (o.inten != null) sgSetP(fx, /^Intensity$/, sgMapI(fx, o.inten));
    }
    return fx;
}
function safeGlow(L, o) {
    o = o || {}; var P = L.property("ADBE Effect Parade"), order = ["ADBE Glo2", "S_Glow", "PC_CratesGlow"], fx = null;
    for (var q = 0; q < order.length && !fx; q++) {
        try { fx = P.addProperty(order[q]); } catch (e) { fx = null; }
    }
    if (!fx) { sgLog("no glow effect available on " + L.name + " -> skipped"); return null; }
    fx = P.property(P.numProperties);                      // fresh ref
    if (o.name) { try { fx.name = o.name; } catch (e2) {} fx = P.property(P.numProperties); }
    if (sgKind(fx) == "S_Glow") sgSet(fx, { thr: 60, rad: 50, inten: 1 });   // restrained base (S_Glow default Brightness 2 is far too hot)
    if (sgKind(fx) == "PC_CratesGlow") sgSet(fx, { thr: 60, rad: 50, inten: 1 });
    sgSet(fx, o);
    return P.property(P.numProperties);
}
// ---------------------------------------------------------------- /safeGlow ----
