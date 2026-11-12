// House layer colour-label system (set by every builder). AE label index -> purpose.
// 1 Red=CONTROL (nulls, CAM_CTRL, cameras, controllers)   2 Yellow=TEXT / typography
// 3 Aqua=ADJUSTMENT (grade, look, TR transition adj)      4 Pink=SHAPES / cards / UI graphics
// 5 Lavender=LIGHT FX overlays (flashes, glints, leaks, flares)
// 7 Sea Foam=MATTES / track mattes / roto                  8 Blue=VIDEO footage
// 9 Green=STILLS / plates / generated images              10 Purple=PRECOMPS
// 12 Brown=GUIDE / reference (guide layer, never rendered) 15 Sandstone=AUDIO / music / SFX
// Comps in the project panel: 10 Purple main, 8 Blue shot comps, 4 Pink modules/graphics.
var LBL={CONTROL:1,TEXT:2,ADJ:3,SHAPE:4,LIGHT:5,MATTE:7,VIDEO:8,STILL:9,PRECOMP:10,GUIDE:12,AUDIO:15};
function autoLabel(L){ // pick a label from the layer type; call after building a comp
  try{
    if(L instanceof CameraLayer||L instanceof LightLayer||L.nullLayer){L.label=LBL.CONTROL;return;}
    if(L.guideLayer){L.label=LBL.GUIDE;return;}
    if(L.adjustmentLayer){L.label=LBL.ADJ;return;}
    if(L instanceof TextLayer){L.label=LBL.TEXT;return;}
    if(L instanceof ShapeLayer){L.label=LBL.SHAPE;return;}
    if(L.isTrackMatte){L.label=LBL.MATTE;return;}
    var s=L.source; if(!s) return;
    if(s instanceof CompItem){L.label=LBL.PRECOMP;return;}
    if(s.mainSource instanceof SolidSource){L.label=LBL.SHAPE;return;}
    if(!s.hasVideo && s.hasAudio){L.label=LBL.AUDIO;return;}
    if(s.mainSource && s.mainSource.isStill){L.label=LBL.STILL;return;}
    if(s.hasVideo){L.label=LBL.VIDEO;}
  }catch(e){}
}
function labelComp(C){for(var k=1;k<=C.numLayers;k++)autoLabel(C.layer(k));}
function labelProject(){for(var k=1;k<=app.project.numItems;k++){var it=app.project.item(k);if(it instanceof CompItem)labelComp(it);}}
// Override by purpose where the type is ambiguous: light-FX overlays -> L.label=LBL.LIGHT; matte solids -> LBL.MATTE.
