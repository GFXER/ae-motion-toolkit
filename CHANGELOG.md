# Changelog

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
