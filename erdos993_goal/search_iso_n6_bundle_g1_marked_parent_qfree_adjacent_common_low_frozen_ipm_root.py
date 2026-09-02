#!/usr/bin/env python3
"""Strong adjacent certificate search for the marked-parent q-free lower."""

from __future__ import annotations

import os
from pathlib import Path

import search_iso_n6_bundle_g1_retained_isolate_qfree_adjacent_common_low_frozen_ipm_root as configured


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g1_marked_parent_qfree_lower_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_marked_parent_qfree_adjacent_common_low_frozen_ipm_search_root_20260901.json"
MARKER = "SEARCHED_EXACT_ISO_N6_BUNDLE_G1_MARKED_PARENT_QFREE_ADJACENT_COMMON_LOW_FROZEN_IPM_ROOT"
EXPECTED_INPUT_SHA256 = "8C49DEA1D1E06AE00DD8582D202220277C568D4FF45FF17A80E90C6B30BDCB9E"


def main() -> None:
    base = configured.base
    os.environ["HANDELMAN_BRANCH"] = "adjacent_u0_v0"
    base.frozen_cells = configured.enhanced_frozen_cells
    base.adjacent_common_constraints = configured.enhanced_common_constraints
    base.solve = configured.solve_with_cr7
    base.INPUT = INPUT
    base.OUTPUT = OUTPUT
    base.MARKER = MARKER
    base.EXPECTED_INPUT_SHA256 = EXPECTED_INPUT_SHA256
    base.__file__ = __file__
    base.main()


if __name__ == "__main__":
    main()
