# ae-motion-toolkit

A library of reusable After Effects ExtendScript (JSX) helpers for motion design and video editing:
transitions, effects/looks, camera rigs, text animation, measured ease curves and small utilities.
They were written for 9:16 vertical edits (2160x3840) but take sizes from the comp they get.

Everything is plain ES3 ExtendScript (no JSON, no `let`, no `Array.indexOf`), effects are added by matchName,
and each file is a set of functions you call from your own build script. Most files began as
re-builds of public tutorials and reference edits; the tutorial authors are credited in each file header.

## Install / use

1. Clone or download this repo anywhere, e.g. `~/Projects/ae-motion-toolkit`.
2. Either run a file directly via **File > Scripts > Run Script File...**, or load it from your own script:

```js
$.evalFile(new File("~/Projects/ae-motion-toolkit/utils/layer_labels.jsx"));
$.evalFile(new File("~/Projects/ae-motion-toolkit/utils/safe_glow.jsx"));
$.evalFile(new File("~/Projects/ae-motion-toolkit/transitions/card_wipe.jsx"));
app.beginSuppressDialogs();
var comp = app.project.activeItem;
// cardWipe(comp, layerA, layerB, tStart, durFrames, opts);  see the usage block at the top of each file
```

`#include "relative/path.jsx"` also works (paths resolve relative to the including file).
Each file starts with a usage block listing its functions and options.

## Requirements

- After Effects 2026 (written against 26.x; most helpers should work on older versions).
- Some helpers use third-party plugins and fall back to stock effects where noted:
  - **Boris FX Sapphire** (`S_*` effects: S_Glow, S_WarpPuddle, S_PrismLens, S_DissolveLuma, S_Shake, ...).
  - **Magic Bullet** (Red Giant) for some grade helpers.
  - ProductionCrate / Crates effects (`PC_*`) in a few fallbacks.
  Missing plugins make the affected call throw or log and skip; check the header of each file.
- `utils/sapphire_effects.tsv` lists Sapphire effect names -> matchNames, and
  `utils/other_effects_matchnames.tsv` lists other plugin effects -> matchNames (useful for scripting).

## Snippets

"tested in AE 26.5" means the helper has been run in real builds; "untested" means it is written and
syntax-checked but has not been run in AE yet, so expect to fix small things.

| Snippet | What it does | Status |
|---|---|---|
| `transitions/3d_slide_transition.jsx` | 3D slide transition: clips on 3D nulls, master null slides the stack, roto subject focus shift | untested |
| `transitions/a_blur_flash.jsx` | Blur-flash cut: blur + exposure spike through a hard cut | untested |
| `transitions/a_flicker_inserts.jsx` | Single-frame insert grammar (1 f flashes / inserts before a cut) | untested |
| `transitions/a_silhouette_flicker.jsx` | Inverted silhouette flicker + difference burn overlay | untested |
| `transitions/b_burn_transition.jsx` | Film-burn style transition rebuilt for AE | untested |
| `transitions/c_flash_cut.jsx` | Flash cut: roto subject strobes as a white glowing silhouette before the cut | untested |
| `transitions/c_prism_smear.jsx` | Prism-lens smear transition (S_PrismLens + Echo / Directional Blur) | untested |
| `transitions/c_scan_flash.jsx` | Scan-flash transition (stock AE, optional S_Glow) | untested |
| `transitions/card_wipe.jsx` | Card Wipe transition (stock Card Wipe, randomised flips + jitter) | untested |
| `transitions/checker_wipe.jsx` | Checkerboard tile wipe: tiles spin in on a woven diagonal wave, cut under full cover, spin out to reveal B; the frame never moves (safe for talking-heads), 2 colours + sparse accent, 4 start corners, fps/size scaled, stock shape layers | untested |
| `transitions/datamosh_insert.jsx` | Places a real datamosh clip (from video-fx-tools/datamosh.py) over a cut | untested |
| `transitions/distort_transition.jsx` | Lens-warp distort through a cut: Optics bulge + Turbulent wobble + radial smear + scale/rot jump, 1:2 timing, `strength` knob, stock AE | untested |
| `transitions/flash_strobe.jsx` | Flash family: real camera flash (instant on, eased decay, exposure kick), flash pair, negative B/W / white strobes, invert pre-lap, FLASH MASTER slider; fps-scaled, stock AE | untested |
| `transitions/liquid_wipe.jsx` | Liquid gradient wipe: B flows in over A through an evolving noise + ramp map with a wobbling soft edge, the frame stays still; 4 directions or a directionless melt, 1:2 timing without overshoot, checks for footage handles, stock AE | untested |
| `transitions/mask_3d_transition.jsx` | No-plugin 3D mask transition: A pushes up, B rises with a roto break-out | untested |
| `transitions/motion_mosh.jsx` | Fake datamosh through a cut (Displacement Map + macroblock map), no Universe | untested |
| `transitions/one_two_rule.jsx` | The 1:2 timing rule: presets 12->24 / 15->30 / 20->40 (fps-scaled), spike + continuous travel curves, one-call adjustment-layer transition | untested |
| `transitions/transform_cut.jsx` | Motion through the cut on one adjustment layer: slide (4 directions, seamless tile + directional blur), spin, zoom-through, zoom punch; 1:2 timing, comp-size scaled, stock AE | untested |
| `transitions/null_transition.jsx` | Null transitions: next shot as a tilted corner card swung to full frame | untested |
| `transitions/study_bloom_in_cut.jsx` | Bloom-in cut: glow bloom on the incoming shot, 1:2 timing | untested |
| `transitions/study_cell_reveal.jsx` | Colorama colour-cycle "cell" reveal for product/photo cards | tested in AE 26.5 |
| `transitions/study_difference_burn.jsx` | Procedural film burn in Difference mode for 2-4 f on a jump cut | untested |
| `transitions/study_glitch_slices.jsx` | Horizontal slice bands filled with foreign textures, reshuffled every 2-3 f | untested |
| `transitions/study_luma_dissolve.jsx` | Speed-ramp per clip + S_DissolveLuma at the speed peak | untested |
| `transitions/study_scan_flash_v2.jsx` | Scan flash v2 (safe glow fallback + extra passes) | untested |
| `transitions/timeremap_warp.jsx` | Flow-curve time remap + warp puddle helpers (no Twixtor) | untested |
| `effects/a_ink_halo.jsx` | Ink-halo look + 2 f white burn-in | untested |
| `effects/b_card_hook.jsx` | "Effect tutorial" card hook + white blur-dip exit | untested |
| `effects/b_echo_trail.jsx` | Echo trail effect + threshold highlight glow | untested |
| `effects/b_subject_bg_fx.jsx` | Subject stays clean, background (or halo copy) gets the effect | untested |
| `effects/black_bars_depth.jsx` | Black bars with depth: subject breaks out over CC Jaws / Motion Tile bars | untested |
| `effects/c_crt_print.jsx` | CRT-print look: gradient map through a halftone dot screen + scanlines | untested |
| `effects/card_flip_silhouette_v2.jsx` | Product card turns 180 deg, holds, then 2.5D flips to a photo on the back | tested in AE 26.5 |
| `effects/collage_face_pop.jsx` | Collage face pop: frozen roto face staircase on a frozen plate | untested |
| `effects/depth_scan.jsx` | Depth-scan / point-cloud look (CC Ball Action + scan pulse), stock AE | untested |
| `effects/effect_ideas5.jsx` | Neon edges, pixel streaks, grain plate, hue flicks, wave-warp text | untested |
| `effects/effect_ideas_p6.jsx` | Tritone duotone, Change to Color swaps, Fill-on-duplicate, infinite zoom, etc. | untested |
| `effects/effect_ideas_p7.jsx` | Mercury droplets, typewriter, ransom letters, tracking box, turbulence hit, scatterize | untested |
| `effects/expensive_finish.jsx` | Finish micro-stack: S_Glow -> S-curve -> Sharpen (+ grain) | untested |
| `effects/expensive_fx8.jsx` | 8 "expensive" effects: rays text, fills, 4-colour gradient, glow, ring pulse, LED grid, bounce, counter | untested |
| `effects/jugg_stack.jsx` | "Jugg edit" look stack (stock + Sapphire) | untested |
| `effects/naughtyyjuan_workflow.jsx` | Speed ramps, 1 f flashes, lyric shadow + glow, grit, vignette, Apple card, mask reveal | untested |
| `effects/noahsocold_fx.jsx` | Music-video techniques: collage strips, ticker, CRT card, ghost overlays, etc. | untested |
| `effects/noahsocold_mv.jsx` | Full music-video breakdown helpers: timewarp, warp, grit, CRT card, B/W ghost | untested |
| `effects/study_expensive_dark.jsx` | "Expensive dark" grade: compressed highlights, blacks not crushed | untested |
| `effects/study_flash_box.jsx` | Flash box: presenter shrinks into a rounded window while examples show | untested |
| `effects/swap_compare.jsx` | Product colour / decal swap compare with animated colour chips | tested in AE 26.5 |
| `effects/unique_fx8.jsx` | Depth-map reveals, Colorama bands, tint-swap, colour-key + Echo, ball-action glow | untested |
| `effects/visualizer_3d.jsx` | 3D device scene: GLB model + screen comp + env light + DOF | untested |
| `camera/null_stack_camera.jsx` | Stacked-null 2D camera (one null per move, overlapping eases) | untested |
| `camera/parallax_dof.jsx` | 2.5D parallax rig + depth of field + rack focus + defocus transition | untested |
| `camera/smooth_3d_camera.jsx` | Smooth 3D camera on stacked 3D nulls, never fully stops | untested |
| `text/blend_text.jsx` | Self-inverting blend-mode text (Difference / Exclusion / Hue / Color) | tested in AE 26.5 |
| `text/chrome_3d_text.jsx` | Chrome 3D text with stock Advanced 3D extrusion + HDRI (no Element 3D) | untested |
| `text/magazine_letters.jsx` | Ransom-note magazine letters with per-letter shake + posterize time | untested |
| `text/pixel_morph_text.jsx` | Word-per-cut text that melts via stacked Pixel Motion Blur | untested |
| `text/study_decode_band.jsx` | Letter-decode title + letterbox band window opener | untested |
| `text/ui_shape_morph.jsx` | Apple-style UI shape morph (one rounded rect morphs between states) | untested |
| `utils/graph_lib.jsx` | Measured ease-curve families applied as real AE keyframes (glKey, glKey3, glExpr, ...) | untested |
| `utils/layer_labels.jsx` | Layer colour-label system (LBL.*, autoLabel, labelComp, labelProject) | tested in AE 26.5 |
| `utils/perception_guides.jsx` | Composition guide layers + a text "cheap look" audit report | untested |
| `utils/safe_glow.jsx` | safeGlow(): stock Glow -> S_Glow -> Crates Glow fallback chain | tested in AE 26.5 |
| `utils/sfx_cue_sheet.jsx` | Writes a CSV SFX cue list from comp markers/layers for an offline mix | untested |
| `effects/style_777/flash_777.jsx` | "777" style kit: Flash / light family: white/grey flashes, flicker, strobes, film burn | untested |
| `effects/style_777/fx_777.jsx` | "777" style kit: Inserts, layout and light effects (blinds, halftone, neon, grids, ...) | untested |
| `effects/style_777/grade_777.jsx` | "777" style kit: Grade flips, mono stutter, negative toggle, step fps, gradient-map fades | untested |
| `effects/style_777/lib_777.jsx` | "777" style kit: Shared helpers (include first; pulls in safe_glow + palettes) | untested |
| `effects/style_777/pal_777.jsx` | "777" style kit: Gradient-map / CC Toner palettes | untested |
| `effects/style_777/type_777.jsx` | "777" style kit: Decode, scramble, font-cycle and micro/giant type helpers | untested |
| `effects/style_777/wipe_777.jsx` | "777" style kit: Bar / column / band / staircase wipes, letterbox ratio changes | untested |

## Conventions

- Layer names use prefixes `CTRL_ TXT_ ADJ_ SHP_ FX_ MATTE_ VID_ IMG_ PC_ GUIDE_ AUD_` and colour labels from
  `utils/layer_labels.jsx`.
- Many transitions follow a 1:2 timing rule: N frames accelerating out, 2N frames settling in, with values
  continuous through the cut. `transitions/one_two_rule.jsx` packages it as reusable helpers.
- Stock Glow (`ADBE Glo2`) may be missing in some AE 26 installs; helpers call `safeGlow()` where possible.

## License

MIT, see [LICENSE](LICENSE).
