#!/usr/bin/env python3
"""Exact Sturm refinement of the ordinary-parent g5 cone from order 11."""

from pathlib import Path

import probe_iso_n7_bundle_g5_interval_edge_cone_rank7_g5_tail as base
import probe_iso_n7_bundle_g5_ordinary_containment_cone_rank7_g5_tail as ordinary
from probe_iso_n7_bundle_g5_threshold11_sturm_rank7_g5_tail import sturm_summary


def main():
    base.THRESHOLD = 11
    ordinary.THRESHOLD = 11
    ordinary.OUTPUT = (
        Path(__file__).resolve().parent
        / "iso_n7_bundle_g5_ordinary_threshold11_sturm_probe_rank7_g5_tail_20260831.json"
    )
    ordinary.MARKER = (
        "PROBE_EXACT_ISO_N7_BUNDLE_G5_ORDINARY_THRESHOLD11_STURM_RANK7_G5_TAIL"
    )
    ordinary.bernstein_summary = sturm_summary
    ordinary.main()


if __name__ == "__main__":
    main()
