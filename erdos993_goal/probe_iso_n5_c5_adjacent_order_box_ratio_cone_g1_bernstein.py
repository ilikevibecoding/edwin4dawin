#!/usr/bin/env python3
"""Exact cone probe for the adjacent C5 path-floor/order-box relaxation.

This tests only the large-large branch where both neighborhood-deleted
forests have order at least seven.  The marked-deletion geometry gives

    m_B=7+p, m_C=7+p+q, 0<=r<=m_B,
    N=m_B+m_C-r,

after ordering m_B<=m_C.  Put r=m_B*s, 0<=s<=1.  Every B,C coefficient
of ranks two through four is independently placed at its path lower bound
or edgeless upper bound.  The A row is placed on the exact forest factorial
drop cone delta1>=0, delta2>=1, delta3>=1.

This is a sign probe until every branch, finite boundary, and dependency is
assembled.  Failed coefficient rows are retained rather than promoted.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path
import argparse

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_c5_adjacent_order_box_ratio_cone_probe_g1_bernstein_20260830.json"
MARKER = "PROBE_EXACT_ISO_N5_C5_ADJACENT_ORDER_BOX_RATIO_CONE_G1_BERNSTEIN"


def choose(x, rank):
    return sp.prod(x - j for j in range(rank)) / sp.factorial(rank)


def path_floor(order, rank):
    return choose(order - rank + 1, rank)


def row_corner(order, mask):
    row = [sp.Integer(1), order]
    for rank in range(2, 5):
        row.append(choose(order, rank) if mask & (1 << (rank - 2)) else path_floor(order, rank))
    return tuple(row)


def h(a):
    return a[3] ** 2 - a[1] * a[5]


def ell(a, b):
    return -a[1] * b[4] + a[2] * b[3] + a[3] * b[2] - a[4] * b[1]


def k(b, c):
    return -b[1] * c[3] + 2 * b[2] * c[2] - b[3] * c[1]


def bernstein_rows(expression, variable):
    degree = int(sp.degree(expression, variable))
    power = [sp.expand(expression).coeff(variable, j) for j in range(degree + 1)]
    return [sp.expand(sum(
        sp.Rational(sp.binomial(index, j), sp.binomial(degree, j)) * power[j]
        for j in range(index + 1)
    )) for index in range(degree + 1)]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-corners", type=int, default=64)
    parser.add_argument("--stats-only", action="store_true")
    args = parser.parse_args()
    p, q, s = sp.symbols("p q s", nonnegative=True)
    r0, r1, r2, r3 = sp.symbols("r0 r1 r2 r3", nonnegative=True)
    mb = 7 + p
    mc = 7 + p + q
    n = sp.expand(mb + mc - mb * s)
    budget = sp.expand(2 * n - 4)
    t = budget * r0
    d3 = budget * (1 - r0) * r1
    d2 = budget * (1 - r0) * (1 - r1) * r2
    d1 = budget * (1 - r0) * (1 - r1) * (1 - r2) * r3
    rho4 = t
    rho3 = t + 1 + d3
    rho2 = t + 2 + d3 + d2
    rho1 = t + 2 + d3 + d2 + d1
    scaled = [sp.Integer(1), 2 * n]
    for ratio in (rho1, rho2, rho3, rho4):
        scaled.append(sp.expand(scaled[-1] * ratio))
    a = tuple(scaled[rank] / (2**rank * sp.factorial(rank)) for rank in range(6))
    bounded_variables = (s, r0, r1, r2, r3)
    unbounded_variables = (p, q)
    failures = []
    passes = []
    total_bernstein_rows = 0
    total_scalar_terms = 0
    global_minimum = None
    digest = hashlib.sha256()
    for branch_index, (bmask, cmask) in enumerate(itertools.product(range(8), repeat=2)):
        if branch_index >= args.max_corners:
            break
        b = row_corner(mb, bmask)
        c = row_corner(mc, cmask)
        expression = sp.cancel(h(a) + ell(a, b) + ell(a, c) + k(b, c))
        denominator = sp.ilcm(*[coefficient.q for coefficient in sp.Poly(expression, *bounded_variables, *unbounded_variables).coeffs()])
        integer_expression = sp.expand(denominator * expression)
        stats_poly = sp.Poly(integer_expression, *bounded_variables, *unbounded_variables)
        print(json.dumps({
            "B": bmask, "C": cmask, "power_terms": len(stats_poly.terms()),
            "bounded_degrees": [stats_poly.degree(variable) for variable in bounded_variables],
        }), flush=True)
        if args.stats_only:
            break
        rows = [integer_expression]
        for variable in bounded_variables:
            rows = [converted for row in rows for converted in bernstein_rows(row, variable)]
        bad = []
        local_minimum = None
        for index, row in enumerate(rows):
            polynomial = sp.Poly(row, *unbounded_variables)
            values = polynomial.coeffs()
            minimum = min(values)
            local_minimum = minimum if local_minimum is None else min(local_minimum, minimum)
            global_minimum = minimum if global_minimum is None else min(global_minimum, minimum)
            total_scalar_terms += len(polynomial.terms())
            digest.update(f"{bmask}:{cmask}:{index}:".encode())
            digest.update("".join(f"{powers}:{value};" for powers, value in polynomial.terms()).encode())
            if any(value < 0 for value in values):
                bad.append({"bernstein_index": index, "negative_coefficients": sum(1 for value in values if value < 0), "minimum": str(minimum)})
        record = {
            "B_mask": bmask, "C_mask": cmask,
            "s_degree": len(rows) - 1,
            "denominator": denominator,
            "minimum_scalar_coefficient": str(local_minimum),
        }
        (failures if bad else passes).append({**record, "bad_rows": bad} if bad else record)
        total_bernstein_rows += len(rows)
        print(json.dumps({"B": bmask, "C": cmask, "bad": len(bad), "min": str(local_minimum)}), flush=True)
    report = {
        "marker": MARKER,
        "branch": "adjacent marks, ordered mB<=mC, mB,mC>=7",
        "corner_pairs": len(passes) + len(failures),
        "passing_corner_pairs": len(passes),
        "failing_corner_pairs": len(failures),
        "total_bernstein_rows": total_bernstein_rows,
        "total_scalar_terms": total_scalar_terms,
        "global_minimum_scalar_coefficient": str(global_minimum),
        "ordered_stream_sha256": digest.hexdigest().upper(),
        "failures": failures,
        "passes": passes,
        "scope": "Exact large-large cone probe only; no C5 theorem asserted.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({key: report[key] for key in (
        "marker", "corner_pairs", "passing_corner_pairs", "failing_corner_pairs",
        "total_bernstein_rows", "total_scalar_terms", "global_minimum_scalar_coefficient",
    )}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
