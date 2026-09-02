#!/usr/bin/env python3
"""Strong cone search for the nonadjacent deleted marked-parent core."""

from __future__ import annotations

import os
from pathlib import Path

import sympy as sp

import search_iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_frozen_ipm_root as configured


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g1_marked_parent_pair_qfree_lower_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_marked_parent_pair_t0_nonadjacent_common_frozen_ipm_search_root_20260901.json"
MARKER = "SEARCHED_EXACT_ISO_N6_BUNDLE_G1_MARKED_PARENT_PAIR_T0_NONADJACENT_COMMON_FROZEN_IPM_ROOT"
EXPECTED_INPUT_SHA256 = "715750BD2652F77277C79303296972A383FF08AE288CF34A1A70A9D6E5066B5F"
_base_solve = configured.base.solve


def solve_with_full_coordinates(label, target):
    cb2 = sp.Symbol("CB2", integer=True, nonnegative=True)
    cz3 = sp.Symbol("CZ3", integer=True, nonnegative=True)
    augmented = sp.Add(
        target,
        sp.Mul(sp.Integer(0), cb2, evaluate=False),
        sp.Mul(sp.Integer(0), cz3, evaluate=False),
        evaluate=False,
    )
    return _base_solve(label, augmented)


def main() -> None:
    base = configured.base
    os.environ["HANDELMAN_BRANCH"] = "nonadjacent_t0_u0_v0"
    base.frozen_cells = configured.enhanced_frozen_cells
    base.solve = solve_with_full_coordinates
    base.INPUT = INPUT
    base.OUTPUT = OUTPUT
    base.MARKER = MARKER
    base.EXPECTED_INPUT_SHA256 = EXPECTED_INPUT_SHA256
    base.__file__ = __file__
    base.main()


if __name__ == "__main__":
    main()
