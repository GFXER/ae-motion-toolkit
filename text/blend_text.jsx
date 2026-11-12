// Blend-mode text that self-inverts against any background (seen in many music-edit references).
// White text + DIFFERENCE  = full invert (dark BG -> white, bright BG -> dark).      Punchy, best for big hero words.
// White text + EXCLUSION   = soft invert (mid-tones go grey, less harsh).           Default "soft" choice.
// Text + HUE / COLOR       = takes the text colour's hue, keeps BG luminance.        Tinted/ghost type, subtle.
// Tips: opacity 85-100 %; add a 1-2 px faint shadow layer UNDER in Normal mode only if readability drops on mid-grey;
//       keep it on large/bold type (thin type gets lost); motion blur on; check frames over both bright and dark shots.
function blendText(L, mode, opacity){ // mode: "diff" | "excl" | "hue" | "color"
  var m={diff:BlendingMode.DIFFERENCE, excl:BlendingMode.EXCLUSION, hue:BlendingMode.HUE, color:BlendingMode.COLOR}[mode||"excl"];
  L.blendingMode=m; L.property("ADBE Transform Group").property("ADBE Opacity").setValue(opacity||95);
  try{ L.label=2; }catch(e){}  // TEXT label (house colour system)
  return L;
}
