#!/usr/bin/env python3
"""Fast degree-two cone screen for the six q-free leaf sign cores.

This is a deliberately small exact-generator cone.  Feasibility is promoted
only after rational symbolic replay; infeasibility obstructs only this screen.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import itertools
import json
from pathlib import Path

import numpy as np
from scipy.optimize import linprog
from scipy.sparse import csc_matrix
import sympy as sp

import search_iso_n6_bundle_g1_retained_isolate_qfree_adjacent_common_low_frozen_ipm_root as adjacent
import search_iso_n6_bundle_g1_retained_isolate_qfree_nonadjacent_common_frozen_ipm_root as nonadjacent


HERE = Path(__file__).resolve().parent
RETAINED = HERE / "iso_n6_bundle_g1_retained_isolate_coarse_q_lower_exact_root_20260901.json"
MARKED = HERE / "iso_n6_bundle_g1_marked_parent_pair_qfree_lower_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_leaf_qfree_degree2_screen_root_20260901.json"
EXPECTED_RETAINED_SHA256 = "239ED96A29102D24B205BAB4A7AD3180B60DEACF42C68C1059D061B0E0E784FE"
EXPECTED_MARKED_SHA256 = "715750BD2652F77277C79303296972A383FF08AE288CF34A1A70A9D6E5066B5F"
MARKER = "SCREENED_EXACT_GENERATORS_ISO_N6_BUNDLE_G1_LEAF_QFREE_DEGREE2_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def powers(count: int, maximum: int):
    for degree in range(maximum + 1):
        for indices in itertools.combinations_with_replacement(range(count), degree):
            result = [0] * count
            for index in indices:
                result[index] += 1
            yield tuple(result)


def terms(expression: sp.Expr, variables: tuple[sp.Symbol, ...]):
    return {
        power: sp.Rational(coefficient)
        for power, coefficient in sp.Poly(sp.expand(expression), *variables).terms()
        if coefficient != 0
    }


def shifted(values, shift):
    return {
        tuple(left + right for left, right in zip(power, shift)): coefficient
        for power, coefficient in values.items()
    }


def multiplied(left, right):
    answer = {}
    for lp, lc in left.items():
        for rp, rc in right.items():
            power = tuple(a + b for a, b in zip(lp, rp))
            answer[power] = answer.get(power, sp.Integer(0)) + lc * rc
    return {power: coefficient for power, coefficient in answer.items() if coefficient != 0}


def coordinate_variables(geometry: str):
    names = ["s"]
    for family in "ABW":
        names.extend(f"C{family}{rank}" for rank in range(2, 8))
    if geometry == "adjacent":
        names.extend(f"CR{rank}" for rank in range(2, 8))
    else:
        names.extend(f"CZ{rank}" for rank in range(3, 8))
        names.append("HX")
    return tuple(sp.Symbol(name, integer=True, nonnegative=True) for name in sorted(set(names)))


def generators(geometry: str, label: str, target: sp.Expr, variables):
    if geometry == "adjacent":
        base = adjacent.base
        base.frozen_cells = adjacent.enhanced_frozen_cells
        base.adjacent_common_constraints = adjacent.enhanced_common_constraints
    else:
        base = nonadjacent.base
        base.frozen_cells = nonadjacent.enhanced_frozen_cells
    linear, quadratic, _cubic, _quartic, frozen, equalities = base.build_constraints(
        label, target, variables, generators_only=True
    )
    return linear, quadratic, frozen, equalities


def solve(geometry: str, label: str, target: sp.Expr):
    variables = coordinate_variables(geometry)
    by_name = {str(variable): variable for variable in variables}
    target = sp.expand(target.xreplace({
        symbol: by_name[str(symbol)] for symbol in target.free_symbols
    }))
    linear, quadratic, frozen, equalities = generators(geometry, label, target, variables)
    linear_terms = [(name, terms(value, variables)) for name, value in linear]
    quadratic_terms = [(name, terms(value, variables)) for name, value in quadratic]
    frozen_terms = [(name, terms(value, variables)) for name, value in frozen]
    equality_terms = [(name, terms(value, variables)) for name, value in equalities]
    basis = tuple(sorted(powers(len(variables), 2), reverse=True))
    rows = {power: index for index, power in enumerate(basis)}
    names = []
    columns = []

    def add(name, values):
        if not values or max(map(sum, values)) > 2:
            return
        names.append(name)
        columns.append(values)

    for power in powers(len(variables), 2):
        add("monomial:" + ",".join(map(str, power)), {power: sp.Integer(1)})
    degree_one = tuple(powers(len(variables), 1))
    for name, values in linear_terms:
        for multiplier in degree_one:
            add(f"linear:{name}*" + ",".join(map(str, multiplier)), shifted(values, multiplier))
    for left in range(len(linear_terms)):
        for right in range(left, len(linear_terms)):
            add(
                f"product:{linear_terms[left][0]}*{linear_terms[right][0]}",
                multiplied(linear_terms[left][1], linear_terms[right][1]),
            )
    for name, values in quadratic_terms:
        add(f"quadratic:{name}", values)
    for name, values in frozen_terms:
        add(f"frozen:{name}", values)
    for name, values in equality_terms:
        if values and max(map(sum, values)) <= 2:
            add(f"equality:+{name}", values)
            add(f"equality:-{name}", {power: -value for power, value in values.items()})

    row_indices = []
    col_indices = []
    data = []
    for column, values in enumerate(columns):
        for power, coefficient in values.items():
            row_indices.append(rows[power])
            col_indices.append(column)
            data.append(float(coefficient))
    matrix = csc_matrix((data, (row_indices, col_indices)), shape=(len(basis), len(columns)))
    rhs = np.zeros(len(basis))
    for power, coefficient in terms(target, variables).items():
        rhs[rows[power]] = float(coefficient)
    result = linprog(
        np.zeros(len(columns)), A_eq=matrix, b_eq=rhs,
        bounds=(0, None), method="highs-ds", options={"presolve": True},
    )
    positive = []
    exact_residual = None
    if result.success:
        rational = []
        for index, value in enumerate(result.x):
            if value > 1e-9:
                coefficient = Fraction(float(value)).limit_denominator(1_000_000)
                positive.append((names[index], float(value), str(coefficient)))
                rational.append((index, sp.Rational(coefficient.numerator, coefficient.denominator)))
        reconstructed = {power: sp.Integer(0) for power in basis}
        for index, coefficient in rational:
            for power, value in columns[index].items():
                reconstructed[power] += coefficient * value
        target_terms = terms(target, variables)
        exact_residual = max(
            abs(reconstructed[power] - target_terms.get(power, 0)) for power in basis
        )
    return {
        "success": bool(result.success),
        "status": int(result.status),
        "message": result.message,
        "variables": list(map(str, variables)),
        "linear_constraints": len(linear),
        "quadratic_constraints": len(quadratic),
        "frozen_cells": len(frozen),
        "equality_constraints": len(equalities),
        "atoms": len(columns),
        "rows": len(basis),
        "positive_atoms": positive,
        "limited_denominator_exact_residual": str(exact_residual) if exact_residual is not None else None,
    }


def main() -> None:
    if sha256(RETAINED) != EXPECTED_RETAINED_SHA256:
        raise RuntimeError("retained input drift")
    if sha256(MARKED) != EXPECTED_MARKED_SHA256:
        raise RuntimeError("marked input drift")
    retained = json.loads(RETAINED.read_text(encoding="utf-8"))["branches"]
    marked = json.loads(MARKED.read_text(encoding="utf-8"))["branches"]
    jobs = [
        ("retained_adjacent", "adjacent", "adjacent_u0_v0", retained["adjacent_u0_v0"]),
        ("retained_nonadjacent", "nonadjacent", "nonadjacent_u0_v0", retained["nonadjacent_u0_v0"]),
    ]
    for geometry in ("adjacent", "nonadjacent"):
        for state in (0, 1):
            branch = f"{geometry}_t{state}_u0_v0"
            jobs.append((f"marked_{geometry}_t{state}", geometry, branch, marked[branch]))
    n = sp.Symbol("n")
    s = sp.Symbol("s", integer=True, nonnegative=True)
    results = {}
    for job, geometry, label, row in jobs:
        target = sp.expand(sp.sympify(row["lower_expression"]).subs(n, s + 8))
        results[job] = solve(geometry, label, target)
        print(job, results[job]["success"], results[job]["message"], flush=True)
    report = {
        "marker": MARKER,
        "domain": "n=8+s with nonnegative occupation coordinates",
        "results": results,
        "retained_input_sha256": sha256(RETAINED),
        "marked_input_sha256": sha256(MARKED),
        "source_sha256": sha256(Path(__file__).resolve()),
        "scope_guard": (
            "Exact replay is required before promoting any floating feasible row.  "
            "Infeasibility obstructs only this degree-two generator cone."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
