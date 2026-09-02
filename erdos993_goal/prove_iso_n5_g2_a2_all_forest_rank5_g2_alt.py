#!/usr/bin/env python3
"""Exact all-forest theorem for the A2 block in no-parent rank-five g2.

For a forest independence row a_j=i_j(F), define

  A2 = 4a0a3-3a0a4-15a0a5-6a0a6
       +12a1a2+8a1a3-19a1a4-14a1a5
       +11a2^2+18a2a3-2a2a4+6a3^2.

This replay proves A2>=0 for every finite forest.  Orders through twelve are
enumerated exactly.  From order thirteen onward, the standard factorial-ratio
high/low cones reduce the sign to exact power/Bernstein coefficient checks.

This closes only the single-row A2 block, not the coupled L2/K2 blocks or g2.
"""

from __future__ import annotations

import hashlib
import json
from math import factorial
from pathlib import Path

import sympy as sp

from prove_iso_n5_g1_h_all_forest_root import (
    KNOWN_FOREST_COUNTS,
    forest_graphs,
    poly_forest,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_a2_all_forest_exact_rank5_g2_alt_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G2_A2_ALL_FOREST_RANK5_G2_ALT"
DEPENDENCIES = {
    "prove_iso_n5_g1_h_all_forest_root.py":
        "FEE26C37D2FBF86D68DEA8C6EF6992F4AFCBCFDAD0E1BC654BF8B20A8C7D0D9D",
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row: tuple[int, ...], rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def a2_value(row: tuple[int, ...]) -> int:
    return (
        4 * at(row, 0) * at(row, 3)
        - 3 * at(row, 0) * at(row, 4)
        - 15 * at(row, 0) * at(row, 5)
        - 6 * at(row, 0) * at(row, 6)
        + 12 * at(row, 1) * at(row, 2)
        + 8 * at(row, 1) * at(row, 3)
        - 19 * at(row, 1) * at(row, 4)
        - 14 * at(row, 1) * at(row, 5)
        + 11 * at(row, 2) ** 2
        + 18 * at(row, 2) * at(row, 3)
        - 2 * at(row, 2) * at(row, 4)
        + 6 * at(row, 3) ** 2
    )


def finite_certificate() -> dict:
    rows = {}
    total = 0
    global_minimum = None
    for order in range(13):
        count = 0
        minimum = None
        witness = None
        for graph in forest_graphs(order):
            count += 1
            polynomial = tuple(poly_forest(graph))
            value = a2_value(polynomial)
            assert value >= 0
            if minimum is None or value < minimum:
                minimum = value
                witness = {
                    "graph6": __import__("networkx").to_graph6_bytes(graph, header=False).decode().strip(),
                    "independence_polynomial": polynomial,
                }
        assert count == KNOWN_FOREST_COUNTS[order]
        total += count
        global_minimum = minimum if global_minimum is None else min(global_minimum, minimum)
        rows[str(order)] = {"unlabeled_forests": count, "minimum_A2": minimum, "witness": witness}
    assert total == sum(KNOWN_FOREST_COUNTS.values())
    assert global_minimum == 0
    return {
        "orders": [0, 12],
        "unlabeled_forests": total,
        "global_minimum": global_minimum,
        "rows": rows,
        "role": "complete exact finite branch, not extrapolated",
    }


def bernstein_coefficients(expression, variable):
    degree = int(sp.degree(expression, variable))
    power = [sp.expand(expression).coeff(variable, j) for j in range(degree + 1)]
    return [
        sp.expand(sum(
            sp.Rational(sp.binomial(k, j), sp.binomial(degree, j)) * power[j]
            for j in range(k + 1)
        ))
        for k in range(degree + 1)
    ]


def positive_power_record(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    assert all(value > 0 for value in polynomial.coeffs())
    return {
        "terms": len(polynomial.terms()),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
        "coefficient_stream_sha256": hashlib.sha256(
            "".join(f"{monomial}:{value};" for monomial, value in polynomial.terms()).encode()
        ).hexdigest().upper(),
    }


def cone_certificate() -> dict:
    n = sp.Symbol("n", integer=True, positive=True)
    rho = sp.symbols("rho1:6", nonnegative=True)
    q = [sp.Integer(1), 2 * n]
    for value in rho:
        q.append(sp.expand(q[-1] * value))
    a = [q[k] / (sp.Integer(2) ** k * sp.factorial(k)) for k in range(7)]
    a2 = sp.expand(
        4 * a[0] * a[3] - 3 * a[0] * a[4] - 15 * a[0] * a[5]
        - 6 * a[0] * a[6] + 12 * a[1] * a[2] + 8 * a[1] * a[3]
        - 19 * a[1] * a[4] - 14 * a[1] * a[5] + 11 * a[2] ** 2
        + 18 * a[2] * a[3] - 2 * a[2] * a[4] + 6 * a[3] ** 2
    )
    denominator = sp.ilcm(*[coefficient.q for coefficient in sp.Poly(a2, n, *rho).coeffs()])
    assert denominator == 3840
    normalized = sp.expand(denominator * a2)
    r1, r2, r3, r4, r5 = rho
    bracket = sp.expand(
        40 * n * r1 * r2**2 - 10 * n * r1 * r2 * r3
        + 720 * n * r1 * r2 + 2640 * n * r1
        - 28 * n * r2 * r3 * r4 - 380 * n * r2 * r3
        + 1280 * n * r2 + 11520 * n
        - r2 * r3 * r4 * r5 - 30 * r2 * r3 * r4
        - 60 * r2 * r3 + 640 * r2
    )
    assert sp.expand(normalized - n * r1 * bracket) == 0
    slope = sp.diff(bracket, n)
    floor = sp.expand(bracket.subs(n, (r1 + 2) / 2))
    assert sp.expand(bracket - floor - (n - (r1 + 2) / 2) * slope) == 0

    t, d1, d2, d3, d4 = sp.symbols("t d1 d2 d3 d4", nonnegative=True)
    high_rules = {
        r5: t,
        r4: t + 1 + d4,
        r3: t + 2 + d4 + d3,
        r2: t + 3 + d4 + d3 + d2,
        r1: t + 4 + d4 + d3 + d2 + d1,
    }
    high_variables = (t, d1, d2, d3, d4)
    high_slope = positive_power_record(sp.expand(slope.subs(high_rules)), high_variables)
    high_floor = positive_power_record(sp.expand(floor.subs(high_rules)), high_variables)

    bounded_r = sp.Symbol("r", nonnegative=True)
    low_rules = {
        r5: t,
        r4: t + 1 + d4,
        r3: t + 2 + d4 + d3,
        r2: t + 4 - bounded_r + d4 + d3 + d2,
        r1: t + 4 + d4 + d3 + d2,
    }
    low_variables = (t, d2, d3, d4)
    low_records = {}
    for label, expression in (("slope", slope), ("floor_at_n_equals_half_rho1_plus_2", floor)):
        reduced = sp.expand(expression.subs(low_rules))
        assert sp.degree(reduced, bounded_r) == 2
        coefficients = bernstein_coefficients(reduced, bounded_r)
        low_records[label] = {
            "degree_in_bounded_r": 2,
            "bernstein_coefficients": [
                positive_power_record(coefficient, low_variables) for coefficient in coefficients
            ],
        }

    return {
        "ratio_identity": (
            "3840*A2=n*rho1*B, with B equal to the displayed affine-in-n bracket"
        ),
        "bracket": str(bracket),
        "order_floor": (
            "rho1=4*i2/n<=2(n-1), hence n>=(rho1+2)/2; "
            "B=B_floor+(n-(rho1+2)/2)*B_slope"
        ),
        "large_order_scope": (
            "n>=13 gives alpha>=7. Universal delta1>=0, delta2>=1 and "
            "delta1+delta2>=2, plus pinned delta3>=1 and delta4>=1, exhaust "
            "the high delta1>=1 and low 0<=delta1<=1 cones."
        ),
        "high_cone": {"slope": high_slope, "floor": high_floor},
        "low_cone": low_records,
        "all_power_and_bernstein_coefficients_strictly_positive": True,
    }


def main() -> None:
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name
    finite = finite_certificate()
    cone = cone_certificate()
    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite forest F with independence coefficients a_j, the displayed "
            "single-row functional A2(F) is nonnegative."
        ),
        "A2_definition": (
            "4a0a3-3a0a4-15a0a5-6a0a6+12a1a2+8a1a3-19a1a4-14a1a5+"
            "11a2^2+18a2a3-2a2a4+6a3^2"
        ),
        "finite_certificate": finite,
        "all_order_cone_certificate": cone,
        "dependencies": DEPENDENCIES,
        "scope": (
            "This proves only A2(A), the single-row block in the exact no-parent g2 "
            "occupation split. The coupled L2/K2 blocks, other four modes, full g2, "
            "all N5, and Problem 993 remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "finite_forests": finite["unlabeled_forests"],
        "finite_global_minimum": finite["global_minimum"],
        "high_slope_terms": cone["high_cone"]["slope"]["terms"],
        "high_floor_terms": cone["high_cone"]["floor"]["terms"],
        "low_slope_bernstein_terms": [
            row["terms"] for row in cone["low_cone"]["slope"]["bernstein_coefficients"]
        ],
        "low_floor_bernstein_terms": [
            row["terms"] for row in cone["low_cone"]["floor_at_n_equals_half_rho1_plus_2"]["bernstein_coefficients"]
        ],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
