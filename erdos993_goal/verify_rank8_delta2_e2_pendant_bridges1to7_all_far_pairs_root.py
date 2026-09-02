#!/usr/bin/env python3
"""Run the frozen far-pair batch engine with a distinct all-bridges report."""

from pathlib import Path

import verify_rank8_delta2_e2_pendant_short_bridge_all_far_pairs_root as frozen


ROOT = Path(__file__).resolve().parent
frozen.REPORT = ROOT / (
    "rank8_delta2_e2_pendant_bridges1to7_all_far_pairs_exact_root_20260823.json"
)


if __name__ == "__main__":
    frozen.main()
