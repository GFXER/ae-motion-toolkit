# Changelog

## Unreleased

### Added

- `transitions/slat_wipe.jsx`: dark slats close over a cut and open onto the next shot.
- `transitions/stretch_cut.jsx`: pixel-stretch (CC Scale Wipe) through a cut, with an optional flip for the incoming side.
- `utils/graph_lib.jsx`: `bezierEase()`, `bezierToAE()`, `aeToBezier()` and `aeKeysToBezier()` convert between
  cubic-bezier numbers (Flow, CSS) and AE influence / speed, both ways.
- `docs/bezier_ease.md`: the conversion explained, with value and speed pictures of every ease family.
  `docs/tools/plot_eases.py` redraws them, `docs/tools/check_bezier_ease.js` checks the helpers in Node.

### Changed

- `glFam()` now throws on a curve that is not a family name or four numbers, and `bezierToAE()` (used by
  `glEaseInfo()`) throws when x1 or x2 is outside 0..1.

## v1.1.0 (2026-11-25)

Six new transitions. All are stock After Effects and scale with the comp size and frame rate. They are syntax-checked
but have not been run in AE yet (see the Status column in the README), so expect to fix small things.

### Added

- `transitions/one_two_rule.jsx`: the 1:2 timing rule as helpers (presets, spike and travel curves, one-call transition).
- `transitions/distort_transition.jsx`: lens-warp distort through a cut.
- `transitions/transform_cut.jsx`: slide, spin, zoom-through and zoom punch on one adjustment layer.
- `transitions/flash_strobe.jsx`: camera flash, flash pair, negative / white strobes, invert pre-lap.
- `transitions/checker_wipe.jsx`: checkerboard tile wipe that never moves the frame.
- `transitions/liquid_wipe.jsx`: liquid gradient wipe between two overlapping layers. Its keyed curves were also checked
  outside AE (24 to 60 fps, monotonic, no overshoot).

## v1.0.0 (2026-11-12)

Initial release: transitions, effects, camera rigs, text animation and utilities.
