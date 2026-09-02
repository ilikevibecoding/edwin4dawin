#!/usr/bin/env python3
"""Diagnostic reuse of the diagonal-2 half-blend cone on h+k<=1."""

from pathlib import Path

import prove_iso_n5_g1_internal_ordinary_diagonal2_large_order_root as base


HERE = Path(__file__).resolve().parent
base.CELLS = ((0, 0), (0, 1), (1, 0))
base.OUTPUT = HERE / "iso_n5_g1_internal_ordinary_low3_half_blend_probe_root_20260830.json"
base.MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LOW3_HALF_BLEND_ROOT"


if __name__ == "__main__":
    base.main()
