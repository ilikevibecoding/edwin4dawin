#!/usr/bin/env python3
"""Symbolic shifted solid minors of the odd Newton--Racah subsystem.

For columns c,...,c+k-1 and rows c+s,...,c+s+k-1, factor the common
positive Newton term X_c from each row.  When c>=1 the remaining entry is

  (R)_(falling j) (R+2c+4)_(rising j) T(R-j,c+j-1),

where R=s+i.  The script checks coefficientwise positivity of the resulting
two-parameter determinant for fixed orders k.  The c=0 boundary is handled
separately because its first column is X_0=1.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp

from verify_left_newton_connection import rational_racah_value


OUT = Path("left_odd_solid_minors_20260803.json")


def falling(x, length):
    return sp.prod(x - h for h in range(length))


def rising(x, length):
    return sp.prod(x + h for h in range(length))


def normalized_entry(R, c, offset):
    if offset == 0:
        return rational_racah_value(R, c - 1)
    return sp.cancel(
        falling(R, offset)
        * rising(R + 2 * c + 4, offset)
        * rational_racah_value(R - offset, c + offset - 1)
    )


def interior_minor(order, a, s):
    c = a + 1
    matrix = [
        [normalized_entry(s + i, c, j) for j in range(order)]
        for i in range(order)
    ]
    return sp.cancel(matrix_det(matrix))


def boundary_minor(order, s):
    matrix = []
    for i in range(order):
        R = s + i
        row = [sp.S.One]
        for j in range(1, order):
            row.append(
                sp.cancel(
                    falling(R, j)
                    * rising(R + 4, j)
                    * rational_racah_value(R - j, j - 1)
                )
            )
        matrix.append(row)
    return sp.cancel(matrix_det(matrix))


def matrix_det(matrix):
    if len(matrix) == 1:
        return matrix[0][0]
    return sp.Matrix(matrix).det(method="domain-ge")


def summarize(name, order, value, variables):
    numerator, denominator = sp.fraction(sp.cancel(value))
    numerator = sp.factor(numerator)
    denominator = sp.factor(denominator)
    numerator_poly = sp.Poly(sp.expand(numerator), *variables)
    denominator_poly = sp.Poly(sp.expand(denominator), *variables)
    numerator_coeffs = numerator_poly.coeffs()
    denominator_coeffs = denominator_poly.coeffs()
    entry = {
        "family": name,
        "order": order,
        "status": (
            "PASS"
            if all(x > 0 for x in numerator_coeffs)
            and all(x > 0 for x in denominator_coeffs)
            else "FAIL"
        ),
        "numerator_terms": len(numerator_poly.terms()),
        "numerator_total_degree": numerator_poly.total_degree(),
        "numerator_min_coefficient": str(min(numerator_coeffs)),
        "denominator_terms": len(denominator_poly.terms()),
        "denominator_total_degree": denominator_poly.total_degree(),
        "denominator_min_coefficient": str(min(denominator_coeffs)),
        "factored_numerator": str(numerator),
        "factored_denominator": str(denominator),
    }
    print(
        name,
        f"k={order}",
        entry["status"],
        f"terms={entry['numerator_terms']}/{entry['denominator_terms']}",
        flush=True,
    )
    return entry


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-k", type=int, default=1)
    parser.add_argument("--max-k", type=int, default=4)
    args = parser.parse_args()

    a, s = sp.symbols("a s", nonnegative=True)
    entries = []
    for order in range(args.min_k, args.max_k + 1):
        entries.append(
            summarize(
                "interior-c=a+1",
                order,
                interior_minor(order, a, s),
                (a, s),
            )
        )
        entries.append(
            summarize(
                "boundary-c=0",
                order,
                boundary_minor(order, s),
                (s,),
            )
        )

    previous = []
    if OUT.exists():
        previous = json.loads(OUT.read_text(encoding="utf-8")).get("families", [])
    by_key = {(x["family"], x["order"]): x for x in previous}
    by_key.update({(x["family"], x["order"]): x for x in entries})
    all_entries = sorted(by_key.values(), key=lambda x: (x["order"], x["family"]))
    report = {
        "status": "PASS" if all(x["status"] == "PASS" for x in all_entries) else "FAIL",
        "max_k": args.max_k,
        "families": all_entries,
        "scope": (
            "Each passing fixed order is an all-parameter positivity proof. "
            "A uniform proof in the order k is still required."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
