#!/usr/bin/env python3
"""Falsify or support the independent-row box for rank-seven bundle g4.

Starting from the valid containment/high-rank residual, parameterize A/B/W/Z
rows 3..5 only by their separate consecutive-extension caps.  The marked edge
geometry is the exact five-branch forest relaxation used by the frozen N6-g4
certificate.  A negative point disproves this *relaxation*, not the theorem.
"""

from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

import sympy as sp

from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    marked_geometry_branches,
    substitute_edge_geometry,
)


HERE = Path(__file__).resolve().parent
RESIDUAL_REPORT = HERE / "iso_n7_bundle_g4_containment_elimination_probe_rank7_terminal_20260831.json"
OUTPUT = HERE / "iso_n7_bundle_g4_independent_row_box_probe_rank7_terminal_20260831.json"
MARKER = "PROBE_ISO_N7_BUNDLE_G4_INDEPENDENT_ROW_BOX_RANK7_TERMINAL"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    upstream = json.loads(RESIDUAL_REPORT.read_text(encoding="utf-8"))
    assert upstream["marker"] == (
        "PROBE_EXACT_ISO_N7_BUNDLE_G4_CONTAINMENT_ELIMINATION_RANK7_TERMINAL"
    )
    symbol_names = ["n"] + [
        f"{family}{rank}" for family in "WABZ" for rank in range(2, 6)
    ]
    symbols = {
        name: sp.Symbol(name, integer=True, nonnegative=True)
        for name in symbol_names
    }
    expression = sp.expand(
        sp.sympify(upstream["residual_expression"], locals=symbols)
    )
    n = symbols["n"]
    W = {rank: symbols[f"W{rank}"] for rank in range(2, 6)}
    A = {rank: symbols[f"A{rank}"] for rank in range(2, 6)}
    B = {rank: symbols[f"B{rank}"] for rank in range(2, 6)}
    Z = {rank: symbols[f"Z{rank}"] for rank in range(2, 6)}

    box_names = [
        "pa3", "pa4", "pa5", "pb3", "pb4", "pb5",
        "pw4", "pw5", "pz4", "pz5",
    ]
    box = {name: sp.Symbol(name, nonnegative=True) for name in box_names}
    row_caps = {
        # A_k=i_(k-1)(H_A) for an induced forest H_A of exact order A2;
        # likewise for B.  Use those exact category orders, not ambient n.
        A[3]: (A[2] - 1) * A[2] * box["pa3"] / 2,
        B[3]: (B[2] - 1) * B[2] * box["pb3"] / 2,
        W[4]: (n - 5) * W[3] * box["pw4"] / 4,
        Z[4]: (n - 3) * Z[3] * box["pz4"] / 2,
    }
    row_caps.update({
        A[4]: (A[2] - 2) * row_caps[A[3]] * box["pa4"] / 3,
        B[4]: (B[2] - 2) * row_caps[B[3]] * box["pb4"] / 3,
        W[5]: (n - 6) * row_caps[W[4]] * box["pw5"] / 5,
        Z[5]: (n - 4) * row_caps[Z[4]] * box["pz5"] / 3,
    })
    row_caps.update({
        A[5]: (A[2] - 3) * row_caps[A[4]] * box["pa5"] / 4,
        B[5]: (B[2] - 3) * row_caps[B[4]] * box["pb5"] / 4,
    })
    boxed = sp.expand(expression.subs(row_caps, simultaneous=True))

    edge_a, edge_b, edge_c, edge_d = sp.symbols("a b c d", nonnegative=True)
    seed = 993070401
    rng = random.Random(seed)
    samples_per_cell = 2000
    orders = list(range(6, 31)) + [40, 60, 80, 120]
    tested = 0
    negatives = []
    minimum = None
    for order in orders:
        for branch in marked_geometry_branches(
            sp.Integer(order - 2), edge_a, edge_b, edge_c, edge_d
        ):
            label, variables, value = substitute_edge_geometry(
                boxed, n, sp.Integer(order), branch
            )
            arguments = tuple(variables) + tuple(box.values())
            evaluate = sp.lambdify(arguments, value, "math")
            for sample in range(samples_per_cell):
                point = [rng.random() for _ in arguments]
                result = float(evaluate(*point))
                tested += 1
                if minimum is None or result < minimum["value"]:
                    minimum = {
                        "value": result,
                        "order": order,
                        "geometry": label,
                        "variables": [str(variable) for variable in arguments],
                        "point": point,
                    }
                if result < -1e-7 and len(negatives) < 20:
                    negatives.append({
                        "value": result,
                        "order": order,
                        "geometry": label,
                        "variables": [str(variable) for variable in arguments],
                        "point": point,
                    })

    report = {
        "marker": MARKER,
        "relaxation": {
            "row_caps": {str(key): str(value) for key, value in row_caps.items()},
            "edge_geometry": "five exhaustive marked-neighbour forest branches",
            "meaning": (
                "Each higher row varies independently inside its extension cap; "
                "this is a safe superset but discards forest-row coupling."
            ),
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
            "independent-row relaxation falsified" if negatives
            else "no sampled relaxation negative; still not a theorem"
        ),
        "scope_guard": (
            "A negative point is not a forest counterexample and does not refute g4; "
            "it only shows that independent row caps lose essential coupling."
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
