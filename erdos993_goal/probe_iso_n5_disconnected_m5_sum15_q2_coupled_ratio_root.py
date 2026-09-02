#!/usr/bin/env python3
"""Exact coupled high/low ratio probe for q=2 sum15 rows R0,R1."""

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n5_disconnected_m5_sum15_q2_coarse_root import generic_rows
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import (
    coefficient_rows_hash,
    polynomial_hash,
    shift_and_simplex_homogenize,
    tensor_bernstein_sparse,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum15_q2_coupled_ratio_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_DISCONNECTED_M5_SUM15_Q2_COUPLED_RATIO_ROOT"


def lower_rows(mode, x, h, rows):
    e = sp.symbols("e", integer=True, nonnegative=True)
    order = e + (2 if mode == "distinct" else 1)
    substitutions = {
        x[1]: order,
        x[2]: choose(order, 2) - e,
        h[1]: e,
        h[2]: choose(e, 2) - (e - 2),
    }
    expected = [
        (3 * x[2], -5 * x[1]),
        (3 * x[1], sp.Integer(-5)),
    ]
    h3_floor = choose(e, 3) - (e - 2) ** 2
    lowered = []
    signs = []
    for index in range(2):
        coefficients = tuple(
            sp.factor(rows[index].coeff(h[rank])) for rank in (3, 4)
        )
        assert all(
            sp.expand(left - right) == 0
            for left, right in zip(coefficients, expected[index])
        )
        expression = sp.expand(rows[index].subs(substitutions).subs({
            h[3]: h3_floor,
            h[4]: x[4],
        }))
        lowered.append(expression)
        signs.append([str(value.subs(substitutions)) for value in coefficients])
    return e, order, lowered, signs


def cone(mode, sector, e, order, x, lowers):
    alpha = sp.symbols(f"{mode}_{sector}_alpha", nonnegative=True)
    z = sp.symbols(f"{mode}_{sector}_z0:4", nonnegative=True)
    rho1_fixed = sp.factor(4 * (choose(order, 2) - e) / order)
    budget = rho1_fixed - 3
    rho4 = budget * z[0]
    rho3 = rho4 + 1 + budget * z[1]
    if sector == "high":
        rho2 = rho3 + 1 + budget * z[2]
        rho1 = rho2 + 1 + budget * z[3]
        cubes = ()
    else:
        rho2 = rho3 + 2 - alpha + budget * z[2]
        rho1 = rho2 + alpha + budget * z[3]
        cubes = (alpha,)
    assert sp.factor(rho1 - rho1_fixed - budget * (sum(z) - 1)) == 0
    product = 1
    substitutions = {}
    for rank, rho in zip(range(2, 6), (rho1, rho2, rho3, rho4)):
        product *= rho
        substitutions[x[rank]] = (
            order * product / (2 ** (rank - 1) * sp.factorial(rank))
        )
    assert sp.factor(
        substitutions[x[2]].subs(z[-1], 1 - sum(z[:-1]))
        - (choose(order, 2) - e)
    ) == 0
    reports = []
    for index, lower in enumerate(lowers):
        expression = sp.together(lower.subs(substitutions))
        numerator, denominator = sp.fraction(expression)
        denominator = sp.factor(denominator)
        polynomial = sp.Poly(numerator, e, *cubes, *z)
        degrees, bernstein = tensor_bernstein_sparse(polynomial, len(cubes))
        homogeneous, term_count, minimum = shift_and_simplex_homogenize(
            bernstein, len(z)
        )
        reports.append({
            "row": index,
            "positive_denominator": str(denominator),
            "power_terms": len(polynomial.terms()),
            "power_hash": polynomial_hash(polynomial),
            "cube_degrees": degrees,
            "cube_rows": len(bernstein),
            "homogeneous_terms": term_count,
            "minimum": str(minimum),
            "homogeneous_hash": coefficient_rows_hash(homogeneous),
        })
    return reports


def main():
    x, h, rows = generic_rows()
    report = {"marker": MARKER, "modes": {}}
    for mode in ("distinct", "shared"):
        e, order, lowers, signs = lower_rows(mode, x, h, rows)
        report["modes"][mode] = {
            "order": str(order),
            "h3_h4_coefficients": signs,
            "h3_floor": "binom(e,3)-(e-2)^2",
            "h4_ceiling": "h4<=x4 because H is induced in P0",
            "high": cone(mode, "high", e, order, x, lowers),
            "low": cone(mode, "low", e, order, x, lowers),
        }
    report["source_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        mode: {
            sector: [(row["homogeneous_terms"], row["minimum"]) for row in report["modes"][mode][sector]]
            for sector in ("high", "low")
        }
        for mode in ("distinct", "shared")
    }, indent=2), flush=True)
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper(), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
