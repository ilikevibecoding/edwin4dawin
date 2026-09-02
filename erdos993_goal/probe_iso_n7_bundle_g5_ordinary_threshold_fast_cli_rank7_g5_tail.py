#!/usr/bin/env python3
"""Parameterized fast exact ordinary-parent g5 cone reconnaissance."""

from __future__ import annotations

import argparse
from pathlib import Path

import probe_iso_n7_bundle_g5_interval_edge_cone_rank7_g5_tail as base
import probe_iso_n7_bundle_g5_ordinary_containment_cone_rank7_g5_tail as ordinary
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("threshold", type=int)
    args = parser.parse_args()
    assert args.threshold >= 8
    base.THRESHOLD = args.threshold
    ordinary.THRESHOLD = args.threshold
    ordinary.OUTPUT = (
        Path(__file__).resolve().parent
        / f"iso_n7_bundle_g5_ordinary_threshold{args.threshold}_fast_probe_rank7_g5_tail_20260831.json"
    )
    ordinary.MARKER = (
        f"PROBE_EXACT_ISO_N7_BUNDLE_G5_ORDINARY_THRESHOLD{args.threshold}_FAST_RANK7_G5_TAIL"
    )
    ordinary.bernstein_summary = fast_summary
    ordinary.main()


if __name__ == "__main__":
    main()
