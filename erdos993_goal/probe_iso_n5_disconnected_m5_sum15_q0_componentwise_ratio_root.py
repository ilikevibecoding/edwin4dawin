#!/usr/bin/env python3
"""Exact large-edge q=0 componentwise-deletion cone for unique sum15."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n5_disconnected_m5_sum15_componentwise_ratio_root import (
    EDGE_BASE,
    shift_edge_and_homogenize,
    tensor_bernstein_two_unbounded,
)
from probe_iso_n5_disconnected_m5_sum15_q2_coarse_root import generic_rows
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import (
    coefficient_rows_hash,
    polynomial_hash,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum15_q0_componentwise_ratio_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_DISCONNECTED_M5_SUM15_Q0_COMPONENTWISE_RATIO_ROOT"


def sector(sector_name, x, rows, E, b, N):
    alpha = sp.symbols("alpha", nonnegative=True)
    rho1_fixed = sp.factor(4 * (choose(N, 2) - E) / N)
    budget = rho1_fixed - 3
    z = sp.symbols(f"{sector_name}_z0:4", nonnegative=True)
    rho4 = budget * z[0]
    rho3 = rho4 + 1 + budget * z[1]
    if sector_name == "high":
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
        substitutions[x[rank]] = N * product / (2 ** (rank - 1) * sp.factorial(rank))

    reports = []
    for index, row in enumerate(rows[:4]):
        expression = sp.together(row.subs(substitutions))
        numerator, denominator = sp.fraction(expression)
        polynomial = sp.Poly(numerator, E, b, *cubes, *z)
        degrees, bernstein = tensor_bernstein_two_unbounded(polynomial, len(cubes))
        homogeneous, terms, minimum, negatives = shift_edge_and_homogenize(
            bernstein, len(z)
        )
        assert not negatives, (sector_name, index, negatives[:1])
        report = {
            "row": index,
            "positive_denominator": str(sp.factor(denominator)),
            "power_terms": len(polynomial.terms()),
            "power_hash": polynomial_hash(polynomial),
            "cube_degrees": degrees,
            "cube_rows": len(bernstein),
            "homogeneous_terms": terms,
            "minimum": str(minimum),
            "homogeneous_hash": coefficient_rows_hash(homogeneous),
        }
        reports.append(report)
        print(sector_name, index, report, flush=True)
    return reports


def main():
    x, h, generic = generic_rows()
    E, b = sp.symbols("E b", nonnegative=True)
    N = E + b
    equality = {h[index]: x[index] for index in range(7)}
    base = [sp.expand(row.subs(equality).subs({
        x[1]: N,
        x[2]: choose(N, 2) - E,
    })) for row in generic]
    terminal = [sp.factor(row) for row in base[4:]]
    assert sp.expand(terminal[0] - (25 * N + 10 * E + 42)) == 0
    assert terminal[1] == 30
    report = {
        "marker": MARKER,
        "geometry": "q=k=0, so X=H=A is an arbitrary forest; E=e(A), b=c(A), N=E+b",
        "edge_range": f"E>={EDGE_BASE}",
        "high": sector("high", x, base, E, b, N),
        "low": sector("low", x, base, E, b, N),
        "terminal_rows": [str(value) for value in terminal],
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper(), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
