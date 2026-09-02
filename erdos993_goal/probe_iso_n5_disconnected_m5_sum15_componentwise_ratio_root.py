#!/usr/bin/env python3
"""Exact componentwise-deletion ratio probe for unique sum15.

This extends the active-root geometry by b unselected P-components.  After
extracting isolated selected components, put E=e(P), k=# active selected
vertices and q=sum selected degrees.  Then

    |P|=N=E+k+b, |H|=E+b, e(H)=E-q,
    b>=0, 1<=k<=q<=E.

The output is a probe, not a theorem assembly.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n5_disconnected_m5_sum15_q2_coarse_root import generic_rows
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import choose
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import (
    coefficient_rows_hash,
    multinomial,
    polynomial_hash,
    weak_compositions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum15_componentwise_ratio_probe_root_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_DISCONNECTED_M5_SUM15_COMPONENTWISE_RATIO_ROOT"
EDGE_BASE = 8


def tensor_bernstein_two_unbounded(polynomial: sp.Poly, cube_count: int):
    terms = polynomial.terms()
    degrees = [
        max(monomial[2 + index] for monomial, _ in terms)
        for index in range(cube_count)
    ]
    rows = []
    import itertools
    for indices in itertools.product(*(range(degree + 1) for degree in degrees)):
        row = {}
        for monomial, coefficient in terms:
            powers = monomial[2:2 + cube_count]
            if any(power > index for power, index in zip(powers, indices)):
                continue
            factor = sp.prod(
                sp.binomial(index, power) / sp.binomial(degree, power)
                for index, power, degree in zip(indices, powers, degrees)
            )
            key = (*monomial[:2], *monomial[2 + cube_count:])
            row[key] = row.get(key, 0) + coefficient * factor
        rows.append({key: sp.cancel(value) for key, value in row.items() if value})
    return degrees, rows


def shift_edge_and_homogenize(rows, simplex_length):
    output = []
    total = 0
    minimum = None
    for row in rows:
        shifted = {}
        for key, coefficient in row.items():
            edge_power, b_power, *simplex = key
            for t_power in range(edge_power + 1):
                new_key = (t_power, b_power, *simplex)
                shifted[new_key] = shifted.get(new_key, 0) + (
                    coefficient * sp.binomial(edge_power, t_power)
                    * EDGE_BASE ** (edge_power - t_power)
                )
        shifted = {key: sp.cancel(value) for key, value in shifted.items() if value}
        degree = max(sum(key[2:]) for key in shifted)
        homogeneous = {}
        for key, coefficient in shifted.items():
            missing = degree - sum(key[2:])
            for extra in weak_compositions(missing, simplex_length):
                new_key = (
                    key[0], key[1],
                    *(left + right for left, right in zip(key[2:], extra)),
                )
                homogeneous[new_key] = homogeneous.get(new_key, 0) + (
                    coefficient * multinomial(missing, extra)
                )
        homogeneous = {key: sp.cancel(value) for key, value in homogeneous.items() if value}
        negatives = [(key, value) for key, value in homogeneous.items() if value < 0]
        if negatives:
            return None, None, None, negatives[:20]
        local = min(homogeneous.values())
        minimum = local if minimum is None else min(minimum, local)
        total += len(homogeneous)
        output.append(homogeneous)
    return output, total, minimum, []


def lower_rows():
    x, h, rows = generic_rows()
    E, b, q, k = sp.symbols("E b q k", nonnegative=True)
    N = E + b + k
    h_order = E + b
    substitutions = {
        x[1]: N,
        x[2]: choose(N, 2) - E,
        h[1]: h_order,
        h[2]: choose(h_order, 2) - (E - q),
    }
    h3_floor = choose(h_order, 3) - (E - q) * (h_order - 2)
    h4_ceiling = choose(h_order, 4)
    lowered = [sp.expand(row.subs(substitutions).subs({
        h[3]: h3_floor,
        h[4]: h4_ceiling,
    })) for row in rows[:4]]
    return x, (E, b, q, k), N, lowered


def sector_certificate(sector, x, geometry, N, lowers):
    E, b, q, k = geometry
    v, w, alpha = sp.symbols("v w alpha", nonnegative=True)
    # Include the q=E boundary; a failure here will identify whether it must
    # be split off from the componentwise interior theorem.
    q_value = 1 + v * (E - 1)
    k_value = 1 + w * (q_value - 1)
    N_value = sp.expand(N.subs({q: q_value, k: k_value}))
    rho1_fixed = sp.factor(4 * (choose(N_value, 2) - E) / N_value)
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
            N_value * product / (2 ** (rank - 1) * sp.factorial(rank))
        )
    reports = []
    for index, lower in enumerate(lowers):
        expression = sp.together(lower.subs({q: q_value, k: k_value}).subs(substitutions))
        numerator, denominator = sp.fraction(expression)
        polynomial = sp.Poly(numerator, E, b, *cubes, *z)
        degrees, bernstein = tensor_bernstein_two_unbounded(polynomial, len(cubes))
        homogeneous, terms, minimum, negatives = shift_edge_and_homogenize(
            bernstein, len(z)
        )
        row = {
            "row": index,
            "positive_denominator": str(sp.factor(denominator)),
            "power_terms": len(polynomial.terms()),
            "power_hash": polynomial_hash(polynomial),
            "cube_degrees": degrees,
            "cube_rows": len(bernstein),
            "negative_examples": [[list(key), str(value)] for key, value in negatives],
        }
        if not negatives:
            row.update({
                "homogeneous_terms": terms,
                "minimum": str(minimum),
                "homogeneous_hash": coefficient_rows_hash(homogeneous),
            })
        reports.append(row)
        print(sector, index, row, flush=True)
        if negatives:
            break
    return reports


def main():
    x, geometry, N, lowers = lower_rows()
    report = {
        "marker": MARKER,
        "geometry": (
            "E=e(P), b=unselected P-components, N=E+k+b, |H|=E+b, "
            "e(H)=E-q, b>=0, 1<=k<=q<=E"
        ),
        "edge_base": EDGE_BASE,
        "q_parameterization": "q=1+v(E-1), k=1+w(q-1)",
        "high": sector_certificate("high", x, geometry, N, lowers),
        "low": sector_certificate("low", x, geometry, N, lowers),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper(), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
