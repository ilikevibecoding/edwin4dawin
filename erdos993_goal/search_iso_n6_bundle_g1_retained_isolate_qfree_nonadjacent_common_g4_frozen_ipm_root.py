#!/usr/bin/env python3
"""Nonadjacent retained-isolate cone with common-minor G4--G10 cells."""

from __future__ import annotations

import os
from pathlib import Path

import sympy as sp

import search_iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_frozen_ipm_root as configured
from derive_iso_n6_bundle_g1_nonadjacent_common_g4_frozen_cells_root import (
    nonadjacent_common_g4_constraints,
    nonadjacent_common_g4_frozen_cells,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_g4_frozen_ipm_search_root_20260901.json"
MARKER = "SEARCHED_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_QFREE_NONADJACENT_COMMON_G4_FROZEN_IPM_ROOT"

base = configured.base
_base_build_constraints = base.build_constraints
_base_solve = base.solve


def enhanced_frozen_cells(label, variables):
    cells = configured.enhanced_frozen_cells(label, variables)
    if not label.startswith("adjacent"):
        cells.extend(nonadjacent_common_g4_frozen_cells(variables))
    return cells


def enhanced_build_constraints(label, target, variables, generators_only=False):
    if not generators_only:
        raise RuntimeError("the sparse solver must request generator lists")
    linear, quadratic, cubic, quartic, frozen, equalities = _base_build_constraints(
        label, target, variables, generators_only=True
    )
    if not label.startswith("adjacent"):
        names = {str(variable): variable for variable in variables}
        extra_linear, extra_quadratic = nonadjacent_common_g4_constraints(names, names["s"])
        linear.extend(extra_linear)
        quadratic.extend(extra_quadratic)
    return linear, quadratic, cubic, quartic, frozen, equalities


def solve_with_cr6(label, target):
    cr6 = sp.Symbol("CR6", integer=True, nonnegative=True)
    augmented = sp.Add(
        target, sp.Mul(sp.Integer(0), cr6, evaluate=False), evaluate=False
    )
    return _base_solve(label, augmented)


def main() -> None:
    os.environ["HANDELMAN_BRANCH"] = "nonadjacent_u0_v0"
    base.frozen_cells = enhanced_frozen_cells
    base.build_constraints = enhanced_build_constraints
    base.solve = solve_with_cr6
    base.OUTPUT = OUTPUT
    base.MARKER = MARKER
    base.__file__ = __file__
    base.main()


if __name__ == "__main__":
    main()
