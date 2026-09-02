#!/usr/bin/env python3
"""Exact finite certificates for the primitive reverse-sign-regular factors.

For increasing row/column indices, a k-minor of a reverse totally
nonnegative coefficient matrix has the sign (-1)^(k(k-1)/2).
The fixed primitive factors are checked exhaustively.  Small powers T^b are
also checked as evidence for the Pascal/Cauchy--Binet factorization.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, q, w, z


OUTPUT_PATH = Path("group_reserve_primitive_reverse_total_positivity_certificate_20260802.json")


def coefficient_matrix(expression):
    poly = sp.Poly(sp.expand(expression), z, w)
    dz, dw = poly.degree(z), poly.degree(w)
    return sp.Matrix([[poly.coeff_monomial(z**i * w**j) for j in range(dw + 1)] for i in range(dz + 1)])


def audit(expression):
    matrix = coefficient_matrix(expression)
    orders = []
    for k in range(1, min(matrix.rows, matrix.cols) + 1):
        expected = -1 if (k * (k - 1) // 2) % 2 else 1
        zero = positive_expected = bad = 0
        first_bad = None
        for rows in itertools.combinations(range(matrix.rows), k):
            for cols in itertools.combinations(range(matrix.cols), k):
                determinant = int(matrix.extract(rows, cols).det())
                signed = expected * determinant
                if signed > 0:
                    positive_expected += 1
                elif signed == 0:
                    zero += 1
                else:
                    bad += 1
                    if first_bad is None:
                        first_bad = {"rows": rows, "cols": cols, "determinant": determinant}
        orders.append({
            "order": k,
            "expected_sign": expected,
            "strict_expected_count": positive_expected,
            "zero_count": zero,
            "bad_count": bad,
            "first_bad": first_bad,
        })
    return {
        "shape": [matrix.rows, matrix.cols],
        "all_minors_have_reverse_tn_sign": all(item["bad_count"] == 0 for item in orders),
        "orders": orders,
    }


def main():
    F = sp.expand(2 * A * (A - 1) + (V + 1) ** 2)
    G = sp.expand(A * T**2 - q)
    expressions = {
        "A": A,
        "T": T,
        "z_plus_w": z + w,
        "z2_plus_w2": z**2 + w**2,
        "F": F,
        "G": G,
        **{f"T_power_{b}": sp.expand(T**b) for b in range(2, 5)},
    }
    records = {name: audit(expression) for name, expression in expressions.items()}
    report = {
        "status": (
            "PASS_PRIMITIVE_REVERSE_TOTAL_NONNEGATIVITY_CERTIFICATE"
            if all(record["all_minors_have_reverse_tn_sign"] for record in records.values())
            else "PRIMITIVE_REVERSE_TOTAL_NONNEGATIVITY_FAILURE"
        ),
        "identity": "T^b=sum_{k=0}^b binom(b,k)*(z*(1+z))^k*(w*(1+w))^(b-k)",
        "records": records,
        "scope": "Exhaustive exact certificate for fixed primitives and T powers 2,3,4; the all-b identity still requires a symbolic Cauchy--Binet proof.",
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "shapes": {k: v["shape"] for k, v in records.items()}}, indent=2))


if __name__ == "__main__":
    main()
