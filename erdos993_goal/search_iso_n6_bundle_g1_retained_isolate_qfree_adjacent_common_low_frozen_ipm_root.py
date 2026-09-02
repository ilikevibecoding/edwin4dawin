#!/usr/bin/env python3
"""Adjacent cone with all G2--G10 cells on the common-compatible minor."""

from __future__ import annotations

import os
from pathlib import Path

import sympy as sp

import search_iso_n6_bundle_g1_retained_isolate_qfree_adjacent_common_compatible_ipm_root as base
from derive_iso_n6_bundle_g1_adjacent_common_frozen_cells_root import adjacent_common_frozen_cells
from derive_iso_n6_bundle_g1_adjacent_common_low_frozen_cells_root import (
    adjacent_common_low_constraints,
    adjacent_common_low_frozen_cells,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_qfree_adjacent_common_low_frozen_ipm_search_root_20260901.json"
MARKER = "SEARCHED_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_QFREE_ADJACENT_COMMON_LOW_FROZEN_IPM_ROOT"


_base_frozen_cells = base.frozen_cells
_base_common_constraints = base.adjacent_common_constraints
_base_solve = base.solve


def enhanced_frozen_cells(label, variables):
    cells = _base_frozen_cells(label, variables)
    if label.startswith("adjacent"):
        cells.extend(adjacent_common_frozen_cells(variables))
        cells.extend(adjacent_common_low_frozen_cells(variables))
    return cells


def enhanced_common_constraints(names, s):
    linear, quadratic, cubic, quartic = _base_common_constraints(names, s)
    extra_linear, extra_quadratic = adjacent_common_low_constraints(names, s)
    linear.extend(extra_linear)
    quadratic.extend(extra_quadratic)
    return linear, quadratic, cubic, quartic


def solve_with_cr7(label, target):
    cr7 = sp.Symbol("CR7", integer=True, nonnegative=True)
    # Preserve CR7 in free_symbols until the imported solver fixes its variable
    # tuple; the zero term then disappears from every polynomial coefficient.
    augmented = sp.Add(
        target,
        sp.Mul(sp.Integer(0), cr7, evaluate=False),
        evaluate=False,
    )
    return _base_solve(label, augmented)


def main() -> None:
    os.environ["HANDELMAN_BRANCH"] = "adjacent_u0_v0"
    base.frozen_cells = enhanced_frozen_cells
    base.adjacent_common_constraints = enhanced_common_constraints
    base.solve = solve_with_cr7
    base.OUTPUT = OUTPUT
    base.MARKER = MARKER
    base.__file__ = __file__
    base.main()


if __name__ == "__main__":
    main()
