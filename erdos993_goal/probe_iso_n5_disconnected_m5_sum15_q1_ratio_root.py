#!/usr/bin/env python3
"""Exact q=1 Newton/ratio probe for disconnected-M5 unique sum15."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P,
    at,
    choose,
    interval_cells,
    unique_expressions,
)
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import (
    coefficient_rows_hash,
    polynomial_hash,
    shift_and_simplex_homogenize,
    tensor_bernstein_sparse,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum15_q1_ratio_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_DISCONNECTED_M5_SUM15_Q1_RATIO_ROOT"


def symbolic_rows():
    t = sp.symbols("t", integer=True, nonnegative=True)
    a = sp.symbols("a0:7", nonnegative=True)
    g = sp.symbols("g0:6", nonnegative=True)
    x = tuple(at(a, rank) + at(g, rank - 1) for rank in range(7))
    p = tuple(sp.expand(sum(
        sp.binomial(t, j) * at(x, rank - j) for j in range(rank + 1)
    )) for rank in range(8))
    expression = unique_expressions(interval_cells(P, H))[14]
    twice = sp.expand(sp.expand_func(
        (2 * expression)
        .subs({P[rank]: p[rank] for rank in range(8)})
        .subs({H[rank]: a[rank] for rank in range(7)})
        .subs({a[0]: 1, g[0]: 1, g[1]: a[1] - 1})
    ))
    assert sp.degree(twice, t) == 5
    rows = [sp.expand(sum(
        (-1) ** (rank - j) * sp.binomial(rank, j) * twice.subs(t, j)
        for j in range(rank + 1)
    )) for rank in range(6)]
    reconstructed = sum(rows[j] * sp.binomial(t, j) for j in range(6))
    assert sp.expand(sp.expand_func(reconstructed) - twice) == 0
    return a, g, twice, rows


def hard_lowers(a, g, rows):
    e, m = sp.symbols("e m", nonnegative=True)
    b = sp.symbols("b0:5", nonnegative=True)
    split = {g[rank]: a[rank] - b[rank - 1] for rank in range(2, 6)}
    lowers = []
    coefficient_rows = []
    expected = [
        (e**2 + 5 * e + 1, 5 * (e + 1), sp.Integer(0)),
        (7 * e + 13, sp.Integer(5), sp.Integer(0)),
        (sp.Integer(12), sp.Integer(0), sp.Integer(0)),
    ]
    for index in range(3):
        expression = sp.expand(rows[index].subs(split).subs({
            a[1]: e,
            a[2]: choose(e - 1, 2),
            b[1]: m,
        }))
        coefficients = tuple(
            sp.factor(expression.coeff(b[rank])) for rank in (2, 3, 4)
        )
        assert all(
            sp.expand(left - right) == 0
            for left, right in zip(coefficients, expected[index])
        )
        lower = sp.factor(expression.subs({b[2]: 0, b[3]: 0, b[4]: 0}))
        lowers.append(lower)
        coefficient_rows.append([str(value) for value in coefficients])
    return (e, m), lowers, coefficient_rows


def ratio_probe(a, symbols, lowers):
    e, m = symbols
    u, alpha = sp.symbols("u alpha", nonnegative=True)
    reports = {}
    for mode in ("high", "low"):
        z = sp.symbols(f"{mode}_z0:4", nonnegative=True)
        budget = 2 * e - 9 + 4 / e
        rho4 = budget * z[0]
        rho3 = rho4 + 1 + budget * z[1]
        if mode == "high":
            rho2 = rho3 + 1 + budget * z[2]
            rho1 = rho2 + 1 + budget * z[3]
            cubes = (u,)
        else:
            rho2 = rho3 + 2 - alpha + budget * z[2]
            rho1 = rho2 + alpha + budget * z[3]
            cubes = (u, alpha)
        rho1_fixed = 2 * e - 6 + 4 / e
        assert sp.factor(rho1 - rho1_fixed - budget * (sum(z) - 1)) == 0
        product = 1
        substitutions = {}
        for rank, rho in zip(range(2, 6), (rho1, rho2, rho3, rho4)):
            product *= rho
            substitutions[a[rank]] = (
                e * product / (2 ** (rank - 1) * sp.factorial(rank))
            )
        mode_rows = []
        for index, lower in enumerate(lowers):
            expression = lower.subs({m: u * (e - 2), **substitutions})
            scaled = sp.cancel(480 * e**3 * expression)
            numerator, denominator = sp.fraction(scaled)
            assert denominator == 1, (mode, index, denominator)
            polynomial = sp.Poly(numerator, e, *cubes, *z)
            degrees, bernstein = tensor_bernstein_sparse(
                polynomial, len(cubes)
            )
            homogeneous, term_count, minimum = shift_and_simplex_homogenize(
                bernstein, len(z)
            )
            mode_rows.append({
                "newton_row": index,
                "power_terms": len(polynomial.terms()),
                "power_hash": polynomial_hash(polynomial),
                "cube_degrees": degrees,
                "cube_rows": len(bernstein),
                "homogeneous_terms": term_count,
                "minimum": str(minimum),
                "homogeneous_hash": coefficient_rows_hash(homogeneous),
            })
        reports[mode] = mode_rows
    return reports


def main():
    a, g, twice, rows = symbolic_rows()
    symbols, lowers, b_coefficients = hard_lowers(a, g, rows)
    ratio = ratio_probe(a, symbols, lowers)
    report = {
        "marker": MARKER,
        "newton_identity": "2*sum15=sum_{j=0}^5 R_j*binom(t,j)",
        "twice_sum15": str(sp.factor(twice)),
        "rows": [str(sp.factor(row)) for row in rows],
        "hard_row_b234_coefficients": b_coefficients,
        "hard_row_lowers": [str(value) for value in lowers],
        "ratio": ratio,
        "status": "exact q=1 large-order ratio probe; finite/easy rows separate",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True, default=str) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "high_terms": [row["homogeneous_terms"] for row in ratio["high"]],
        "high_minima": [row["minimum"] for row in ratio["high"]],
        "low_terms": [row["homogeneous_terms"] for row in ratio["low"]],
        "low_minima": [row["minimum"] for row in ratio["low"]],
    }, indent=2), flush=True)
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper(), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
