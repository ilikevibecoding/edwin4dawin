#!/usr/bin/env python3
"""Exact general-(q,k) coupled ratio probe for sum15 Newton rows R0,R1."""

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp

from probe_iso_n5_disconnected_m5_sum15_q2_coarse_root import generic_rows
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import (
    coefficient_rows_hash,
    multinomial,
    polynomial_hash,
    tensor_bernstein_sparse,
    weak_compositions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum15_general_q_ratio_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_DISCONNECTED_M5_SUM15_GENERAL_Q_RATIO_ROOT"
ORDER_BASE = 8


def shift_and_simplex_homogenize(rows, simplex_length):
    homogeneous_rows = []
    minimum = None
    total_terms = 0
    for row in rows:
        shifted = {}
        for key, coefficient in row.items():
            e_power = key[0]
            for t_power in range(e_power + 1):
                new_key = (t_power, *key[1:])
                shifted[new_key] = shifted.get(new_key, 0) + (
                    coefficient * sp.binomial(e_power, t_power)
                    * ORDER_BASE ** (e_power - t_power)
                )
        shifted = {key: sp.cancel(value) for key, value in shifted.items() if value}
        degree = max(sum(key[1:]) for key in shifted)
        homogeneous = {}
        for key, coefficient in shifted.items():
            missing = degree - sum(key[1:])
            for extra in weak_compositions(missing, simplex_length):
                new_key = (
                    key[0],
                    *(left + right for left, right in zip(key[1:], extra)),
                )
                homogeneous[new_key] = homogeneous.get(new_key, 0) + (
                    coefficient * multinomial(missing, extra)
                )
        homogeneous = {key: sp.cancel(value) for key, value in homogeneous.items() if value}
        assert all(value >= 0 for value in homogeneous.values())
        local = min(homogeneous.values())
        minimum = local if minimum is None else min(minimum, local)
        total_terms += len(homogeneous)
        homogeneous_rows.append(homogeneous)
    return homogeneous_rows, total_terms, minimum


def lower_rows(x, h, rows):
    e, q, k = sp.symbols("e q k", nonnegative=True)
    order = e + k
    substitutions = {
        x[1]: order,
        x[2]: choose(order, 2) - e,
        h[1]: e,
        h[2]: choose(e, 2) - (e - q),
    }
    expected = [
        (3 * x[2], -5 * x[1]),
        (3 * x[1], sp.Integer(-5)),
        (sp.Integer(3), sp.Integer(0)),
        (sp.Integer(0), sp.Integer(0)),
    ]
    h3_floor = choose(e, 3) - (e - q) * (e - 2)
    lowered = []
    for index in range(4):
        coefficients = tuple(
            sp.factor(rows[index].coeff(h[rank])) for rank in (3, 4)
        )
        assert all(
            sp.expand(left - right) == 0
            for left, right in zip(coefficients, expected[index])
        )
        lowered.append(sp.expand(rows[index].subs(substitutions).subs({
            h[3]: h3_floor,
            h[4]: choose(e, 4),
        })))
    return (e, q, k), order, lowered


def cone(sector, symbols, order, x, lowers):
    e, q, k = symbols
    v, w, alpha = sp.symbols("v w alpha", nonnegative=True)
    q_value = 1 + v * (e - 2)
    k_value = 1 + w * (q_value - 1)
    order_value = sp.expand(order.subs({q: q_value, k: k_value}))
    rho1_fixed = sp.factor(
        4 * (choose(order_value, 2) - e) / order_value
    )
    budget = rho1_fixed - 3
    z = sp.symbols(f"{sector}_z0:4", nonnegative=True)
    rho4 = budget * z[0]
    rho3 = rho4 + 1 + budget * z[1]
    if sector == "high":
        rho2 = rho3 + 1 + budget * z[2]
        rho1 = rho2 + 1 + budget * z[3]
        cubes = (v, w)
    else:
        rho2 = rho3 + 2 - alpha + budget * z[2]
        rho1 = rho2 + alpha + budget * z[3]
        cubes = (v, w, alpha)
    assert sp.factor(rho1 - rho1_fixed - budget * (sum(z) - 1)) == 0
    product = 1
    substitutions = {}
    for rank, rho in zip(range(2, 6), (rho1, rho2, rho3, rho4)):
        product *= rho
        substitutions[x[rank]] = (
            order_value * product / (2 ** (rank - 1) * sp.factorial(rank))
        )
    reports = []
    for index, lower in enumerate(lowers):
        expression = sp.together(lower.subs({q: q_value, k: k_value}).subs(substitutions))
        corner_failures = []
        for order_e in (13, 20, 40, 100):
            for cube_corner in itertools.product((0, 1), repeat=len(cubes)):
                for chosen in z:
                    value = sp.factor(expression.subs({
                        e: order_e,
                        **dict(zip(cubes, cube_corner)),
                        **{variable: int(variable == chosen) for variable in z},
                    }))
                    if value < 0:
                        corner_failures.append((
                            order_e, cube_corner, str(chosen), str(value)
                        ))
        if corner_failures:
            print(sector, index, "CORNER_FAILURES", corner_failures[:20], flush=True)
            raise AssertionError((sector, index, corner_failures[0]))
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
    symbols, order, lowers = lower_rows(x, h, rows)
    report = {
        "marker": MARKER,
        "geometry": {
            "base_order": "N=e+k",
            "base_edges": "e",
            "H_order_edges": "e vertices and e-q edges",
            "domain": f"e>={ORDER_BASE}, 1<=k<=q<=e-1; q=e is a separate exact boundary",
            "parameterization": "q=1+v(e-2), k=1+w(q-1)",
            "coupling": "h3>=C(e,3)-(e-q)(e-2), h4<=C(e,4)",
        },
        "high": cone("high", symbols, order, x, lowers),
        "low": cone("low", symbols, order, x, lowers),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        sector: [(row["homogeneous_terms"], row["minimum"]) for row in report[sector]]
        for sector in ("high", "low")
    }, indent=2), flush=True)
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper(), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
