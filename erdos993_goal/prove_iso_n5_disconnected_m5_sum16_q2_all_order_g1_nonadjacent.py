#!/usr/bin/env python3
"""Exact all-order q=2 theorem for disconnected-M5 unique sum16.

The finite and easy-row branches are replayed from the frozen partial q=2
certificate.  For |H|>=13 and Newton rows R0,R1,R2, the proof retains the
actual induced-deletion coupling H<=P0:

    h4<=x4,  h5<=x5.

Together with the exact q=2 mode orders/edge counts, the edge-union floor on
h3, and the pinned high/low forest-ratio dichotomy for P0, this gives twelve
strictly positive sparse tensor-Bernstein/simplex certificates (two component
modes, two ratio sectors, three rows).  Thus every Newton row is nonnegative.

This theorem is only the q=2 active-root face of unique sum16.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import sympy as sp

from probe_iso_n5_disconnected_m5_sum16_q2_component_newton_g1_nonadjacent import (
    generic_newton_rows,
)
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import (
    coefficient_rows_hash,
    polynomial_hash,
    shift_and_simplex_homogenize,
    tensor_bernstein_sparse,
)
from prove_iso_n5_disconnected_m5_sum16_q2_partial_g1_nonadjacent import (
    finite_certificate,
    large_order_easy_rows,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum16_q2_all_order_exact_g1_nonadjacent_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM16_Q2_ALL_ORDER_G1_NONADJACENT"
DEPENDENCIES = {
    "probe_iso_n5_disconnected_m5_sum16_q2_component_newton_g1_nonadjacent.py":
        "B938A7416091632E8725B34A029FA3F9260163CDD57CD6334C71D91A11435F59",
    "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py":
        "079C32D829AA91F29B539B869FA57C946BE0DD101AE06E6B5A80A41207AECD31",
    "prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent.py":
        "D911393AB0C386CC8CEAE2F3C78A34430F76307EB5BF298FCEB4E06374C37489",
    "prove_iso_n5_disconnected_m5_sum16_q2_partial_g1_nonadjacent.py":
        "4537C2343144DE9D8CF0A876D1D1884DCAA8E0372CD9F4321B07763172485569",
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
}

EXPECTED = {
    "distinct": {
        "high": [
            (6949, [5], 6, 3621, sp.Rational(6, 5)),
            (3634, [5], 6, 2060, sp.Rational(4, 5)),
            (1880, [4], 5, 1535, sp.Integer(1)),
        ],
        "low": [
            (5881, [5, 2], 18, 4092, sp.Rational(12, 5)),
            (3082, [5, 2], 18, 2655, sp.Rational(4, 5)),
            (1692, [4, 1], 10, 1312, sp.Integer(1)),
        ],
    },
    "shared": {
        "high": [
            (7035, [5], 6, 3621, sp.Rational(6, 5)),
            (3637, [5], 6, 2060, sp.Rational(4, 5)),
            (1866, [4], 5, 1535, sp.Integer(1)),
        ],
        "low": [
            (5912, [5, 2], 18, 4092, sp.Rational(12, 5)),
            (3078, [5, 2], 18, 2655, sp.Rational(4, 5)),
            (1688, [4, 1], 10, 1312, sp.Integer(1)),
        ],
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coupled_lower_rows(mode, x, h, rows):
    e = sp.symbols("e", integer=True, nonnegative=True)
    order = e + (2 if mode == "distinct" else 1)
    substitutions = {
        x[1]: order,
        x[2]: choose(order, 2) - e,
        h[1]: e,
        h[2]: choose(e, 2) - (e - 2),
    }
    h3_floor = choose(e, 3) - (e - 2) * (e - 2)
    expected_h_coefficients = [
        (x[1] + 8 * x[3], -2 * x[2], -6 * x[1]),
        (8 * x[2] + 1, -2 * x[1], sp.Integer(-6)),
        (8 * x[1], sp.Integer(-2), sp.Integer(0)),
    ]
    lowered = []
    coefficient_report = []
    for row_index in range(3):
        raw_actual = tuple(sp.factor(rows[row_index].coeff(h[rank])) for rank in (3, 4, 5))
        assert all(
            sp.expand(left - right) == 0
            for left, right in zip(raw_actual, expected_h_coefficients[row_index])
        )
        expression = sp.expand(rows[row_index].subs(substitutions))
        actual = tuple(sp.factor(expression.coeff(h[rank])) for rank in (3, 4, 5))
        # x1,x2,x3 are nonnegative.  Therefore the h3 coefficient is positive,
        # while h4,h5 have nonpositive coefficients.  H is induced in P0.
        lowered.append(sp.expand(expression.subs({
            h[3]: h3_floor,
            h[4]: x[4],
            h[5]: x[5],
        })))
        coefficient_report.append({
            "newton_row": row_index,
            "coefficients_of_h3_h4_h5": [str(value) for value in actual],
        })
    return e, order, lowered, coefficient_report


def ratio_cone(mode, sector, e, order, x, lowered):
    w, alpha = sp.symbols(f"{mode}_{sector}_w {mode}_{sector}_alpha", nonnegative=True)
    rho1_fixed = sp.factor(4 * (choose(order, 2) - e) / order)
    rho5 = 2 * (order - 5) * w
    excess = rho1_fixed - rho5 - 4
    if sector == "high":
        z = sp.symbols(f"{mode}_high_z0:4", nonnegative=True)
        rho4 = rho5 + 1 + excess * z[3]
        rho3 = rho4 + 1 + excess * z[2]
        rho2 = rho3 + 1 + excess * z[1]
        rho1 = rho2 + 1 + excess * z[0]
        cubes = (w,)
        cone = "delta1,delta2,delta3,delta4>=1"
    else:
        z = sp.symbols(f"{mode}_low_z0:3", nonnegative=True)
        rho4 = rho5 + 1 + excess * z[2]
        rho3 = rho4 + 1 + excess * z[1]
        rho2 = rho3 + 2 - alpha + excess * z[0]
        rho1 = rho2 + alpha
        cubes = (w, alpha)
        cone = "delta1=alpha in [0,1], delta2>=2-alpha, delta3,delta4>=1"
    assert sp.factor(rho1 - rho1_fixed - excess * (sum(z) - 1)) == 0

    product = 1
    coefficient_substitutions = {}
    for rank, rho in zip(range(2, 7), (rho1, rho2, rho3, rho4, rho5)):
        product *= rho
        coefficient_substitutions[x[rank]] = (
            order * product / (2 ** (rank - 1) * sp.factorial(rank))
        )
    assert sp.factor(
        coefficient_substitutions[x[2]].subs(z[-1], 1 - sum(z[:-1]))
        - (choose(order, 2) - e)
    ) == 0

    scalar_denominators = (1440, 480, 24)
    reports = []
    for row_index, (lower, scalar) in enumerate(zip(lowered, scalar_denominators)):
        expression = lower.subs(coefficient_substitutions)
        numerator, denominator = sp.fraction(sp.together(expression))
        assert sp.expand(denominator - scalar * order**3) == 0
        polynomial = sp.Poly(numerator, e, *cubes, *z)
        cube_degrees, bernstein_rows = tensor_bernstein_sparse(
            polynomial, len(cubes)
        )
        homogeneous, total_terms, minimum = shift_and_simplex_homogenize(
            bernstein_rows, len(z)
        )
        actual = (
            len(polynomial.terms()),
            cube_degrees,
            len(bernstein_rows),
            total_terms,
            minimum,
        )
        assert actual == EXPECTED[mode][sector][row_index], (
            mode, sector, row_index, actual, EXPECTED[mode][sector][row_index]
        )
        reports.append({
            "newton_row": row_index,
            "positive_denominator": str(sp.factor(denominator)),
            "numerator_power_terms": len(polynomial.terms()),
            "numerator_power_hash": polynomial_hash(polynomial),
            "cube_variables": [str(variable) for variable in cubes],
            "cube_bernstein_degrees": cube_degrees,
            "cube_bernstein_rows": len(bernstein_rows),
            "simplex_variables": len(z),
            "nonzero_homogeneous_coefficients": total_terms,
            "minimum_homogeneous_coefficient": str(minimum),
            "ordered_homogeneous_coefficient_hash": coefficient_rows_hash(homogeneous),
        })
    return {
        "cone": cone,
        "rho_definition": "rho_j=2(j+1)x_(j+1)/x_j",
        "rho1_edge_identity": str(rho1_fixed),
        "rho5_extension_ceiling": "rho5<=2(N-5)",
        "parameterization": (
            "rho5=2(N-5)w; the remaining excess rho1-rho5-4 is "
            "distributed on the displayed simplex"
        ),
        "rows": reports,
    }


def hard_certificate(x, h, rows):
    report = {}
    for mode in ("distinct", "shared"):
        e, order, lowered, coefficient_report = coupled_lower_rows(mode, x, h, rows)
        report[mode] = {
            "P0_order": str(order),
            "P0_edges": "e",
            "H_order_edges": "e vertices and e-2 edges",
            "H_coefficient_signs": coefficient_report,
            "coupled_substitutions": (
                "h3>=C(e,3)-(e-2)^2 by the edge-union bound; "
                "h4<=x4 and h5<=x5 because H is an induced subforest of P0"
            ),
            "high": ratio_cone(mode, "high", e, order, x, lowered),
            "low": ratio_cone(mode, "low", e, order, x, lowered),
        }
    return report


def main():
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name
    x, h, rows = generic_newton_rows()
    finite = finite_certificate(x, h, rows)
    assert finite["ordered_marked_component_pairs"] == {
        "distinct": 30449,
        "shared": 30449,
    }
    easy = large_order_easy_rows(x, h, rows)
    hard = hard_certificate(x, h, rows)
    report = {
        "marker": MARKER,
        "theorem": (
            "Every q=2 active rooted pair has nonnegative disconnected-M5 "
            "unique Psi interval sum16."
        ),
        "exact_q2_geometry": {
            "distinct_selected_vertices": (
                "P=(1+x)^t(A1+xG1)(A2+xG2), H=A1A2, Gi=Ai-wi, t=s-2"
            ),
            "one_shared_selected_vertex": (
                "P=(1+x)^t(A1A2+xG1G2), H=A1A2, Gi=Ai-wi, t=s-1"
            ),
            "exhaustiveness": "The positive selected degrees summing 2 are 1+1 or 2.",
        },
        "newton_expansion": {
            "identity": "2*sum16=sum_{j=0}^6 R_j*binom(t,j)",
            "R0_through_R6": [str(sp.factor(row)) for row in rows],
        },
        "finite_H_order_at_most_12": finite,
        "large_order_R3_through_R6": easy,
        "large_order_R0_through_R2_coupled_ratio_certificate": hard,
        "coverage": (
            "The finite branch covers e<=12.  For e>=13, the edge-union "
            "certificate proves R3,...,R6 and the induced-deletion/ratio "
            "certificate proves R0,R1,R2 in both modes.  Since binom(t,j)>=0, "
            "the exact Newton expansion proves sum16>=0."
        ),
        "remaining_obligation": (
            "Unique sum16 still requires q>=3 away from the separately proved "
            "q=e star boundary; sums14 and15 also remain in the disconnected M5 block."
        ),
        "scope": (
            "Exact q=2 active-root theorem for unique sum16 only.  No claim for "
            "q>=3, all disconnected M5, M5+3C5, connected-nonadjacent M5, g1, "
            "N5, or Erdos Problem 993."
        ),
        "pinned_dependencies": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(raw, encoding="utf-8", newline="\n")
    os.replace(temporary, OUTPUT)
    print(json.dumps({
        "marker": MARKER,
        "finite_row_checks": sum(finite["newton_row_checks"].values()),
        "hard_branches": 12,
        "hard_homogeneous_terms": sum(
            row["nonzero_homogeneous_coefficients"]
            for mode in hard.values()
            for sector in ("high", "low")
            for row in mode[sector]["rows"]
        ),
        "source_sha256": report["source_sha256"],
        "report_sha256": sha256(OUTPUT),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
