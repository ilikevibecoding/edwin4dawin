#!/usr/bin/env python3
"""Probe a shared-edge forest-row box for the rank-seven g4 residual.

Unlike the falsified independent extension box, each A/B/W/Z row sequence is
coupled through one edge-count parameter.  For a forest H of order h and e
edges, the number of bad k-sets lies between

  e*C(h-2,k-2)/(k-1) and e*C(h-2,k-2),

because a k-vertex induced forest contains between one and k-1 edges when it
is non-independent.  The resulting intervals are exact safe supersets.  This
script searches them; it does not certify their Bernstein signs.
"""

from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

import sympy as sp

from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    marked_geometry_branches,
)


HERE = Path(__file__).resolve().parent
RESIDUAL_REPORT = HERE / "iso_n7_bundle_g4_containment_elimination_probe_rank7_terminal_20260831.json"
OUTPUT = HERE / "iso_n7_bundle_g4_shared_edge_row_box_probe_rank7_terminal_20260831.json"
MARKER = "PROBE_ISO_N7_BUNDLE_G4_SHARED_EDGE_ROW_BOX_RANK7_TERMINAL"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(h, k):
    return sp.prod(h - offset for offset in range(k)) / sp.factorial(k)


def interval_independent_count(h, edges, k, parameter):
    bad_incidence = edges * choose_poly(h - 2, k - 2)
    lower = choose_poly(h, k) - bad_incidence
    upper = choose_poly(h, k) - bad_incidence / (k - 1)
    return sp.expand(lower + parameter * (upper - lower))


def main():
    upstream = json.loads(RESIDUAL_REPORT.read_text(encoding="utf-8"))
    assert upstream["marker"] == (
        "PROBE_EXACT_ISO_N7_BUNDLE_G4_CONTAINMENT_ELIMINATION_RANK7_TERMINAL"
    )
    symbol_names = ["n"] + [
        f"{family}{rank}" for family in "WABZ" for rank in range(2, 6)
    ]
    symbols = {name: sp.Symbol(name) for name in symbol_names}
    residual = sp.expand(
        sp.sympify(upstream["residual_expression"], locals=symbols)
    )
    n = symbols["n"]
    edge_a, edge_b, edge_c, edge_d = sp.symbols("a b c d", nonnegative=True)
    parameter_names = [
        "ea", "pa4", "pa5", "eb", "pb4", "pb5",
        "pw4", "pw5", "ez", "pz5",
    ]
    parameters = {
        name: sp.Symbol(name, nonnegative=True) for name in parameter_names
    }

    seed = 993070402
    rng = random.Random(seed)
    orders = list(range(12, 41)) + [50, 60, 80, 100, 120, 160]
    samples_per_cell = 1600
    tested = 0
    minimum = None
    negatives = []

    for order in orders:
        m = sp.Integer(order - 2)
        branches = marked_geometry_branches(m, edge_a, edge_b, edge_c, edge_d)
        for label, branch_variables, x, y, edges, z2, z3 in branches:
            hA, hB, hZ = m - x, m - y, z3
            eA = hA * parameters["ea"]
            eB = hB * parameters["eb"]
            eZ = hZ * parameters["ez"]
            replacements = {
                n: sp.Integer(order),
                symbols["A2"]: hA,
                symbols["A3"]: choose_poly(hA, 2) - eA,
                symbols["A4"]: interval_independent_count(
                    hA, eA, 3, parameters["pa4"]
                ),
                symbols["A5"]: interval_independent_count(
                    hA, eA, 4, parameters["pa5"]
                ),
                symbols["B2"]: hB,
                symbols["B3"]: choose_poly(hB, 2) - eB,
                symbols["B4"]: interval_independent_count(
                    hB, eB, 3, parameters["pb4"]
                ),
                symbols["B5"]: interval_independent_count(
                    hB, eB, 4, parameters["pb5"]
                ),
                symbols["W2"]: choose_poly(m, 2) - edges,
                symbols["W3"]: (
                    choose_poly(m, 3) - edges * (m - 2)
                    + edges**2 * edge_d / 2
                ),
                symbols["W4"]: interval_independent_count(
                    m, edges, 4, parameters["pw4"]
                ),
                symbols["W5"]: interval_independent_count(
                    m, edges, 5, parameters["pw5"]
                ),
                symbols["Z2"]: z2,
                symbols["Z3"]: z2 * hZ,
                symbols["Z4"]: z2 * (choose_poly(hZ, 2) - eZ),
                symbols["Z5"]: z2 * interval_independent_count(
                    hZ, eZ, 3, parameters["pz5"]
                ),
            }
            value = sp.factor(residual.subs(replacements, simultaneous=True))
            arguments = tuple(branch_variables) + tuple(parameters.values())
            evaluate = sp.lambdify(arguments, value, "math")
            for _sample in range(samples_per_cell):
                point = [rng.random() for _ in arguments]
                result = float(evaluate(*point))
                tested += 1
                record = {
                    "value": result,
                    "order": order,
                    "geometry": label,
                    "variables": [str(variable) for variable in arguments],
                    "point": point,
                }
                if minimum is None or result < minimum["value"]:
                    minimum = record
                if result < -1e-7 and len(negatives) < 20:
                    negatives.append(record)

    report = {
        "marker": MARKER,
        "relaxation": {
            "common_edge_count_per_category": True,
            "bad_set_incidence_interval": (
                "e*C(h-2,k-2)/(k-1) <= C(h,k)-i_k(H) "
                "<= e*C(h-2,k-2)"
            ),
            "category_edge_caps": "eA<=A2, eB<=B2, eZ<=Z3; W edge is shared marked geometry",
        },
        "search": {
            "seed": seed,
            "orders": orders,
            "samples_per_order_geometry": samples_per_cell,
            "tested_points": tested,
            "minimum": minimum,
            "negative_count_retained": len(negatives),
            "negative_witnesses": negatives,
        },
        "verdict": (
            "shared-edge row relaxation falsified" if negatives
            else "no sampled shared-edge negative; still not a theorem"
        ),
        "scope_guard": (
            "Any negative is a relaxation witness only, not a forest or g4 counterexample."
        ),
        "dependencies_sha256": {RESIDUAL_REPORT.name: sha256(RESIDUAL_REPORT)},
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "tested": tested,
        "minimum": minimum,
        "negative_count_retained": len(negatives),
        "verdict": report["verdict"],
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
