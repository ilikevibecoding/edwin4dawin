#!/usr/bin/env python3
"""Exact large-parent proof for the ell=1,2 small-broom g2 k-index 1 cells.

For the exact two-mark deletion partition

    W=A,
    P=A+xB,
    V=A+xC,
    E=A+xB+xC+epsilon*x^2D,

the rank-1/rank-2 forest coefficients, and rank 3 of A, are replaced by
their exact edge/wedge formulas.  Every remaining high-rank coefficient is
linear in every monomial.  Positive occurrences are replaced by the average
of the coefficientwise path floor and the edge-union floor; negative
occurrences are replaced by the average of the edge-multiplicity and
two-term Bonferroni upper bounds.  These are respectively valid lower and
upper bounds.

After n=|A|=11+t and the same deliberately loose normalized forest-statistic
box used by the frozen g1 proof, every exact tensor-Bernstein control has
nonnegative t-coefficients.  This proves the two k-index-1 Newton cells for
both marked-vertex geometries whenever the parent order is at least 13.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows
from derive_iso_n5_g2_internal_ordinary_broom_factor_rank5_g2_alt import ordinary_expression
from probe_iso_n5_g2_internal_ordinary_origin_bernstein_root import build_face


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_internal_ordinary_small_k1_large_parent_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_SMALL_K1_LARGE_PARENT_ROOT"
CUTOFF_A_ORDER = 11
THETA = sp.Rational(1, 2)
LAMBDA_FLOOR = sp.Rational(1, 2)
TARGETS = ((1, 1), (2, 1))

DEPENDENCIES = {
    "probe_iso_n5_g2_internal_ordinary_origin_bernstein_root.py":
        "E7ECD01C45DDAA25B3FB1E7FCFF361AEFEF5EE33F31A5996BD1CE7EE048A5373",
    "derive_iso_n5_g1_internal_endpoint_broom_parameters_root.py":
        "2582BFF4BBA40A2B11D27AB5A3256D291271EB45BF61827D60EC5ADB220B2879",
    "derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root.py":
        "8ED18D7C3116B83527A08471B0820319FFBB134E4FDA086070AB760F1F122E6B",
    "derive_iso_n5_g2_internal_ordinary_broom_factor_rank5_g2_alt.py":
        "4618E651DBFF34BB519BF5CB3454523A82341F278170F6C100222C95AF3FA5F0",
    "explore_rank4_three_halves_grouped.py":
        "0F700C716739ABEF49DB90C9890C3218186F680E7CA71DC81A82249BC9951AFA",
    "prove_iso_n5_g1_internal_ordinary_diagonal2_large_order_root.py":
        "66270072D0BF8F34E7ADC4102A47F3DE0CE00D6430F4B91108CB6CE76C3D9CA6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def target_form(ell: int, k_index: int):
    expression, rows = ordinary_expression()
    k = sp.symbols("k", integer=True, nonnegative=True)
    xrow, urow, yrow, zrow = child_rows(ell, k)
    rules = {}
    for rank in range(1, 7):
        rules.update({
            rows["X"][rank]: xrow[rank], rows["U"][rank]: urow[rank],
            rows["Y"][rank]: yrow[rank], rows["Z"][rank]: zrow[rank],
        })
    degrees, cells = tensor_binomial(sp.expand(expression.subs(rules)), (k,))
    assert degrees == (5,)
    return cells[(k_index,)], rows


def main() -> None:
    actual_dependencies = {name: sha256(HERE / name) for name in DEPENDENCIES}
    assert actual_dependencies == DEPENDENCIES
    target_reports = []
    total_controls = total_power_coefficients = 0
    global_minimum = None
    for ell, k_index in TARGETS:
        form, rows = target_form(ell, k_index)
        faces = [
            build_face(
                form, rows, epsilon, THETA, LAMBDA_FLOOR, CUTOFF_A_ORDER
            )
            for epsilon in (0, 1)
        ]
        assert all(face["negative_power_coefficients"] == 0 for face in faces)
        for face in faces:
            minimum = sp.Rational(face["minimum_power_coefficient"])
            assert minimum >= 0
            global_minimum = minimum if global_minimum is None else min(global_minimum, minimum)
            total_controls += face["bernstein_controls"]
            total_power_coefficients += face["power_coefficients"]
        target_reports.append({"ell": ell, "k_index": k_index, "faces": faces})

    report = {
        "marker": MARKER,
        "theorem": (
            "For ell=1 and ell=2, every internal-spine ordinary-parent g2 "
            "k-index-1 Newton form is nonnegative on both marked-vertex "
            "geometries whenever |A|>=11, equivalently parent order N>=13."
        ),
        "targets": [list(target) for target in TARGETS],
        "cutoff_A_order": CUTOFF_A_ORDER,
        "cutoff_parent_order": 13,
        "negative_upper_blend_theta": str(THETA),
        "positive_lower_path_blend_lambda": str(LAMBDA_FLOOR),
        "proof_bounds": {
            "path_floor": (
                "Every m-vertex forest satisfies i_r >= C(m-r+1,r), by "
                "leaf-deletion induction and Pascal's identity."
            ),
            "edge_union_floor": (
                "i_r >= C(m,r)-e*C(m-2,r-2), by the union bound over edges."
            ),
            "edge_multiplicity_upper": (
                "Each bad r-set contains at most C(r,2) edges."
            ),
            "bonferroni_upper": (
                "Two-term inclusion-exclusion over edge events, separating "
                "incident and disjoint edge pairs."
            ),
            "convexity": (
                "The average of two lower bounds is a lower bound and the "
                "average of two upper bounds is an upper bound."
            ),
        },
        "normalized_constraints": [
            "0<=|B|,|C|,|D|<=|A|",
            "0<=e(A)<=|A| and 0<=e(R)<=|R| for R=B,C,D",
            "0<=wedges(A)<=e(A)^2/2",
        ],
        "targets_detail": target_reports,
        "aggregate_Bernstein_controls": total_controls,
        "aggregate_power_coefficients": total_power_coefficients,
        "negative_power_coefficients": 0,
        "global_minimum_power_coefficient": str(global_minimum),
        "dependencies_sha256": DEPENDENCIES,
        "status": "exact all-parent large-order theorem for the two named cells",
        "scope": (
            "Only internal-spine ordinary-parent g2 at ell=1,2 and Newton "
            "k-index 1 for parent order N>=13. The seven k-index-0 small "
            "forms, parent orders N<=12, other gates, and Erdos Problem 993 "
            "remain separate."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "targets": report["targets"],
        "aggregate_Bernstein_controls": total_controls,
        "aggregate_power_coefficients": total_power_coefficients,
        "negative_power_coefficients": 0,
        "global_minimum_power_coefficient": str(global_minimum),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
