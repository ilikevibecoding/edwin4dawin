#!/usr/bin/env python3
"""Replay the affine blend-interval probe for the final (0,0) cell."""

from pathlib import Path

import probe_iso_n5_g1_internal_ordinary_low01_theta_interval_root as probe


probe.CELL = (0, 0)
probe.OUTPUT = (
    Path(__file__).resolve().parent
    / "iso_n5_g1_internal_ordinary_low00_theta_interval_probe_root_20260830.json"
)
probe.MARKER = "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LOW00_THETA_INTERVAL_ROOT"


if __name__ == "__main__":
    probe.main()
