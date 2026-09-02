#!/usr/bin/env python3
"""Exact-shift probe for the nonadjacent/no-neighbour rank-seven g4 branch.

When neither mark has a neighbour in W=C-{u,v}, the marked categories are not
independent: A_k=B_k=W_(k-1), and Z_k=W_(k-2).  This script enforces those
identities in the valid containment/high-rank residual, then probes a single
shared-edge forest box for W2..W5.  It is not yet a theorem certificate.
"""

from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
RESIDUAL_REPORT = HERE / "iso_n7_bundle_g4_containment_elimination_probe_rank7_terminal_20260831.json"
OUTPUT = HERE / "iso_n7_bundle_g4_sum0_exact_shift_probe_rank7_terminal_20260831.json"
MARKER = "PROBE_ISO_N7_BUNDLE_G4_SUM0_EXACT_SHIFT_RANK7_TERMINAL"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(h, k):
    return sp.prod(h - offset for offset in range(k)) / sp.factorial(k)


def interval_count(h, edges, k, parameter):
    incidence = edges * choose_poly(h - 2, k - 2)
    lower = choose_poly(h, k) - incidence
    upper = choose_poly(h, k) - incidence / (k - 1)
    return sp.expand(lower + parameter * (upper - lower))


def main():
    upstream = json.loads(RESIDUAL_REPORT.read_text(encoding="utf-8"))
    names = ["n"] + [f"{family}{rank}" for family in "WABZ" for rank in range(2, 6)]
    symbols = {name: sp.Symbol(name) for name in names}
    residual = sp.expand(sp.sympify(upstream["residual_expression"], locals=symbols))
    n = symbols["n"]
    W = {rank: symbols[f"W{rank}"] for rank in range(2, 6)}
    shift = {}
    for rank in range(2, 6):
        previous = n - 2 if rank == 2 else W[rank - 1]
        shift[symbols[f"A{rank}"]] = previous
        shift[symbols[f"B{rank}"]] = previous
    shift.update({
        symbols["Z2"]: 1,
        symbols["Z3"]: n - 2,
        symbols["Z4"]: W[2],
        symbols["Z5"]: W[3],
    })
    exact_shift_residual = sp.factor(residual.subs(shift))

    edge_fraction, wedge_fraction, subtree3_fraction, p5 = sp.symbols(
        "edge_fraction wedge_fraction subtree3_fraction p5", nonnegative=True
    )
    m = n - 2
    edges = (m - 1) * edge_fraction
    # Convexity of degrees gives Omega=sum_v C(d_v,2)>=2e^2/m-e.
    # The expression may be negative for small e, which only enlarges the box;
    # for the high-edge obstruction it supplies the essential exact floor.
    wedge_lower = 2 * edges**2 / m - edges
    wedge_upper = edges**2 / 2
    wedge_count = wedge_lower + wedge_fraction * (wedge_upper - wedge_lower)
    bad4_incidence = edges * choose_poly(m - 2, 2)
    bad5_incidence = edges * choose_poly(m - 2, 3)
    bad5_wedge_incidence = wedge_count * choose_poly(m - 3, 2)
    # Exact four-set inclusion-exclusion, with the universal coupling
    # 2*T4<=Omega*e for connected three-edge subtrees.
    subtree3_count = wedge_count * edges * subtree3_fraction / 2
    bad4 = (
        bad4_incidence - wedge_count * (m - 4)
        - edges * (edges - 1) / 2 + subtree3_count
    )
    bad4_branches = (("exact_B4_relaxed_T4",),)
    boxed_branches = []
    row_boxes = {}
    for (branch_label,) in bad4_branches:
        lower_candidates = {
            "incidence": bad5_incidence / 4,
            "shadow": (m - 4) * bad4 / 5,
            # For every nonempty five-vertex forest with r edges, omega
            # adjacent edge pairs, and b bad four-subsets,
            # b-2r+(5/6)omega<=1 (nine local forest types, exact).
            "strong": (
                (m - 4) * bad4 - 2 * bad5_incidence
                + sp.Rational(5, 6) * bad5_wedge_incidence
            ),
        }
        candidate_boxes = {}
        candidate_expressions = []
        for lower_kind, bad5_lower in lower_candidates.items():
            bad5 = bad5_lower + p5 * (bad5_incidence - bad5_lower)
            row_box = {
                W[2]: choose_poly(m, 2) - edges,
                W[3]: choose_poly(m, 3) - edges * (m - 2) + wedge_count,
                W[4]: choose_poly(m, 4) - bad4,
                W[5]: choose_poly(m, 5) - bad5,
            }
            candidate_boxes[lower_kind] = {
                str(key): str(value) for key, value in row_box.items()
            }
            candidate_expressions.append(
                sp.factor(exact_shift_residual.subs(row_box, simultaneous=True))
            )
        row_boxes[branch_label] = candidate_boxes
        boxed_branches.append((branch_label, tuple(candidate_expressions)))

    rng = random.Random(993070403)
    orders = list(range(8, 61)) + [80, 100, 140, 200, 300]
    samples_per_order = 12000
    arguments = (edge_fraction, wedge_fraction, subtree3_fraction, p5)
    tested = 0
    minimum = None
    negatives = []
    for bad4_branch, boxed_candidates in boxed_branches:
        for order in orders:
            evaluators = [
                sp.lambdify(arguments, sp.factor(boxed.subs(n, order)), "math")
                for boxed in boxed_candidates
            ]
            for _sample in range(samples_per_order):
                point = [rng.random() for _ in arguments]
                # The true B5 floor is the maximum of all three rigorous
                # lower bounds.  The residual is increasing in B5 on this
                # branch, so the corresponding boxed value is their maximum.
                result = max(float(evaluate(*point)) for evaluate in evaluators)
                tested += 1
                record = {
                    "value": result,
                    "order": order,
                    "bad4_branch": bad4_branch,
                    "point": point,
                }
                if minimum is None or result < minimum["value"]:
                    minimum = record
                if result < -1e-7 and len(negatives) < 20:
                    negatives.append(record)

    report = {
        "marker": MARKER,
        "exact_category_shift": {
            "A_k": "W_(k-1)",
            "B_k": "W_(k-1)",
            "Z_k": "W_(k-2)",
            "reason": "both marks are nonadjacent and have no neighbours in W",
        },
        "exact_shift_residual": str(exact_shift_residual),
        "shared_edge_boxes": row_boxes,
        "bad_set_coupling": (
            "B4 uses exact four-set inclusion-exclusion and 2*T4<=Omega*e. "
            "The numerical probe takes the exact maximum of the valid lower "
            "bounds I5/4, (m-4)B4/5, and (m-4)B4-2I5+(5/6)J5; "
            "the last bound is the exact five-vertex forest-type inequality."
        ),
        "search": {
            "seed": 993070403,
            "orders": orders,
            "samples_per_order": samples_per_order,
            "tested_points": tested,
            "minimum": minimum,
            "negative_count_retained": len(negatives),
            "negative_witnesses": negatives,
        },
        "verdict": (
            "sum0 shared-edge relaxation falsified" if negatives
            else "no sampled sum0 negative; still not a theorem"
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
