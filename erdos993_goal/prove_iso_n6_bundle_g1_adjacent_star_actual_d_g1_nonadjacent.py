#!/usr/bin/env python3
"""Exact all-order rank-six g1 theorem on the adjacent marked-star family."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import certify_bernstein


MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_ADJACENT_STAR_ACTUAL_D_G1_NONADJACENT"


def edgeless(order):
    return tuple(sp.binomial(order, rank) for rank in range(8))


def star(leaves):
    row = list(edgeless(leaves))
    row[1] += 1
    return tuple(row)


def main():
    expression = reconstruct(1)
    symbols = {str(x): x for x in expression.free_symbols}
    t, rho = sp.symbols("t rho", nonnegative=True)
    n = t + 8
    m = n - 2
    retained = m * rho
    crows = (star(n - 1), edgeless(n - 1), star(m), edgeless(m))
    cases = []
    total_rows = total_scalars = 0
    minimum = None
    stream = hashlib.sha256()
    for keep_u in (0, 1):
        for keep_v in (0, 1):
            if keep_u:
                drows = (
                    star(retained + keep_v), edgeless(retained + keep_v),
                    star(retained), edgeless(retained),
                )
            else:
                drows = (
                    edgeless(retained + keep_v), edgeless(retained + keep_v),
                    edgeless(retained), edgeless(retained),
                )
            substitutions = {}
            for prefix, rows in (("c", crows), ("d", drows)):
                for family, row in zip("EUVW", rows):
                    for rank in range(8):
                        name = f"{prefix}{family}{rank}"
                        if name in symbols:
                            substitutions[symbols[name]] = row[rank]
            value = sp.expand_func(expression.subs(substitutions))
            certificate = certify_bernstein(value, (rho,), tail=t)
            total_rows += certificate["bernstein_coefficients"]
            total_scalars += certificate["tail_power_coefficients"]
            local = sp.Rational(certificate["minimum_tail_power_coefficient"])
            minimum = local if minimum is None else min(minimum, local)
            stream.update(f"{keep_u}|{keep_v}|{sp.srepr(sp.factor(value))};".encode())
            cases.append({"keep_u": keep_u, "keep_v": keep_v, **certificate})
    report = {
        "marker": MARKER,
        "scope": "all adjacent marked stars C with center u, marked leaf v, order n>=8; every actual induced marked minor D",
        "claim": "rank-six bundle g1 is nonnegative",
        "cases": cases,
        "bernstein_rows": total_rows,
        "tail_power_coefficients": total_scalars,
        "minimum_tail_power_coefficient": str(minimum),
        "ordered_expression_sha256": stream.hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "proof": (
            "An induced D is determined up to symmetry by retention of the two marks and the number r of retained unmarked leaves. "
            "Writing r=(n-2)rho covers the integer domain inside 0<=rho<=1. Exact Bernstein conversion in rho and nonnegative t=n-8 power coefficients prove all four mark-retention cases."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output = Path("iso_n6_bundle_g1_adjacent_star_actual_d_exact_g1_nonadjacent_20260831.json")
    output.write_text(raw, encoding="utf-8")
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print("ROWS", total_rows, "SCALARS", total_scalars, "MIN", minimum)
    print(MARKER)


if __name__ == "__main__":
    main()
