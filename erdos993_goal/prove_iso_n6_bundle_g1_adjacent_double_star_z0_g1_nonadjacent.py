#!/usr/bin/env python3
"""Exact all-order g1 theorem for adjacent double-stars without isolates."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g1_adjacent_double_star_actual_d_g1_nonadjacent import marked_rows
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import certify_bernstein


MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_ADJACENT_DOUBLE_STAR_Z0_G1_NONADJACENT"


def main():
    expression = reconstruct(1)
    names = {str(x): x for x in expression.free_symbols}
    t, a, rx, ry = sp.symbols("t a rx ry", nonnegative=True)
    n, m = t + 8, t + 6
    x_count, y_count = m*a, m*(1-a)
    crows = marked_rows(m, x_count, y_count, 1, 1)
    cases = []
    total_rows = total_scalars = 0
    minimum = None
    stream = hashlib.sha256()
    for keep_u in (0, 1):
        for keep_v in (0, 1):
            retained_x, retained_y = x_count*rx, y_count*ry
            drows = marked_rows(retained_x + retained_y, retained_x, retained_y, keep_u, keep_v)
            substitutions = {}
            for prefix, rows in (("c", crows), ("d", drows)):
                for family, row in zip("EUVW", rows):
                    for rank in range(8):
                        name = f"{prefix}{family}{rank}"
                        if name in names:
                            substitutions[names[name]] = row[rank]
            value = sp.expand_func(expression.subs(substitutions))
            certificate = certify_bernstein(value, (a, rx, ry), tail=t)
            total_rows += certificate["bernstein_coefficients"]
            total_scalars += certificate["tail_power_coefficients"]
            local = sp.Rational(certificate["minimum_tail_power_coefficient"])
            minimum = local if minimum is None else min(minimum, local)
            stream.update(f"{keep_u}|{keep_v}|{sp.srepr(sp.factor(value))};".encode())
            cases.append({"keep_u": keep_u, "keep_v": keep_v, **certificate})
    report = {
        "marker": MARKER,
        "scope": "all adjacent marked double-stars C of order n>=8 with every unmarked vertex adjacent to exactly one mark, and every actual induced marked minor D",
        "claim": "rank-six bundle g1 is nonnegative",
        "cases": cases,
        "bernstein_rows": total_rows,
        "tail_power_coefficients": total_scalars,
        "minimum_tail_power_coefficient": str(minimum),
        "ordered_expression_sha256": stream.hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "proof": (
            "Write the two arm sizes as x=(n-2)a and y=(n-2)(1-a). An actual induced D is determined by mark retention and retained fractions rx,ry of the two symmetric arm classes. The literal four independence rows are reconstructed before substitution. Exact tensor Bernstein conversion in (a,rx,ry), exact inverse conversion, and nonnegative t=n-8 power coefficients prove all four cases."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output = Path("iso_n6_bundle_g1_adjacent_double_star_z0_exact_g1_nonadjacent_20260831.json")
    output.write_text(raw, encoding="utf-8")
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print("ROWS", total_rows, "SCALARS", total_scalars, "MIN", minimum)
    print(MARKER)


if __name__ == "__main__":
    main()
