#!/usr/bin/env python3
"""Parameterized fast exact reconnaissance for the rank-seven g5 cone."""

from __future__ import annotations

import argparse
from pathlib import Path

import probe_iso_n7_bundle_g5_interval_edge_cone_rank7_g5_tail as base
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("threshold", type=int)
    args = parser.parse_args()
    assert args.threshold >= 8
    base.THRESHOLD = args.threshold
    base.OUTPUT = (
        Path(__file__).resolve().parent
        / f"iso_n7_bundle_g5_threshold{args.threshold}_fast_probe_rank7_g5_tail_20260831.json"
    )
    base.MARKER = (
        f"PROBE_EXACT_ISO_N7_BUNDLE_G5_THRESHOLD{args.threshold}_FAST_RANK7_G5_TAIL"
    )
    base.bernstein_summary = fast_summary
    base.main()


if __name__ == "__main__":
    main()
