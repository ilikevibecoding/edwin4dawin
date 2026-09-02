#!/usr/bin/env python3
"""Exact all-order Delta0, Delta1, and Delta3 path-core certificates."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


def choose_poly(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def path_polynomial(order: sp.Expr, rank: int) -> sp.Expr:
    return choose_poly(order - rank + 1, rank)


def fixed_path_count(order: int, rank: int) -> sp.Integer:
    top = order - rank + 1
    return sp.Integer(math.comb(top, rank) if top >= rank >= 0 else 0)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    n, m = sp.symbols("n m", integer=True, nonnegative=True)
    coefficients = newton_coefficients(residual())
    path_c = {c[rank]: path_polynomial(n, rank) for rank in range(9)}
    results = {}

    for delta_rank in (0, 1, 3):
        delta = sp.expand(coefficients[delta_rank])
        boundary_rows = []
        for left in range(6):
            def deletion_count(rank: int) -> sp.Expr:
                return sp.expand(
                    sum(
                        fixed_path_count(left, j)
                        * path_polynomial(n - 1 - left, rank - j)
                        for j in range(rank + 1)
                    )
                )

            expression = sp.factor(
                delta.subs(
                    {
                        **path_c,
                        h[6]: deletion_count(6),
                        h[7]: deletion_count(7),
                    },
                    simultaneous=True,
                )
            )
            shifted = sp.Poly(sp.expand(expression.subs(n, m + 23)), m)
            assert all(value > 0 for value in shifted.all_coeffs()), (
                delta_rank,
                left,
                min(shifted.all_coeffs()),
            )
            boundary_rows.append(
                {
                    "left_order": left,
                    "right_order": f"n-1-{left}",
                    "degree": shifted.degree(),
                    "terms": len(shifted.terms()),
                    "minimum_coefficient": str(min(shifted.all_coeffs())),
                }
            )

        left, d, L, D, M = sp.symbols(
            "left d L D M", integer=True, nonnegative=True
        )
        interior_h = {}
        for rank in (6, 7):
            interior_h[rank] = sp.expand(
                sum(
                    path_polynomial(left, j)
                    * path_polynomial(n - 1 - left, rank - j)
                    for j in range(rank + 1)
                )
            )
        interior_expression = sp.factor(
            delta.subs(
                {**path_c, h[6]: interior_h[6], h[7]: interior_h[7]},
                simultaneous=True,
            )
        )
        # Up to reflection, every remaining root has left=L+6 and
        # right=left+d, hence n=2L+13+d.  The analytic range n>=23 is
        # exactly 2L+d>=10.  Split it without a relaxation gap: L=0..4
        # with d=D+10-2L, and L=M+5 with d=D.
        small_left_rows = []
        for fixed_L in range(5):
            shifted = sp.Poly(
                sp.expand(
                    interior_expression.subs(
                        {
                            left: fixed_L + 6,
                            n: D + 23,
                        },
                        simultaneous=True,
                    )
                ),
                D,
            )
            assert all(value > 0 for value in shifted.all_coeffs()), (
                delta_rank,
                fixed_L,
                min(shifted.all_coeffs()),
            )
            small_left_rows.append(
                {
                    "L": fixed_L,
                    "left_order": fixed_L + 6,
                    "d": f"D+{10 - 2 * fixed_L}",
                    "n": "D+23",
                    "degree": shifted.degree(),
                    "terms": len(shifted.terms()),
                    "minimum_coefficient": str(min(shifted.all_coeffs())),
                }
            )

        bulk_shifted = sp.Poly(
            sp.expand(
                interior_expression.subs(
                    {left: M + 11, n: 2 * M + 23 + D}, simultaneous=True
                )
            ),
            M,
            D,
        )
        assert all(value > 0 for value in bulk_shifted.coeffs()), (
            delta_rank,
            min(bulk_shifted.coeffs()),
        )
        results[str(delta_rank)] = {
            "boundary_root_cases": boundary_rows,
            "interior_domain": "left=L+6, right=left+d, n=2L+13+d, with 2L+d>=10",
            "interior_small_L_rows": small_left_rows,
            "interior_bulk_coordinates": "L=M+5, d=D, left=M+11, n=2M+23+D",
            "interior_bulk_degrees": list(bulk_shifted.degree_list()),
            "interior_bulk_terms": len(bulk_shifted.terms()),
            "interior_bulk_minimum_coefficient": str(
                min(bulk_shifted.coeffs())
            ),
        }
        print(
            "PATH_DELTA_PASS",
            delta_rank,
            bulk_shifted.degree_list(),
            len(bulk_shifted.terms()),
            flush=True,
        )

    output = Path(__file__).with_name(
        "rank8_delta013_all_root_path_faces_exact_20260820.json"
    )
    payload = {
        "status": "PASS_EXACT_RANK8_DELTA013_ALL_ROOT_PATH_FACES_N_GE_23",
        "scope": "Delta0,Delta1,Delta3 are strictly positive for every root of P_n and every n>=23",
        "path_coefficients": "i_j(P_n)=C(n-j+1,j)",
        "root_deletion": "P_n-q=P_left disjoint union P_right",
        "reflection_complete_split": [
            "left=0,1,2,3,4,5 individually",
            "left=L+6 and right=left+d with 2L+d>=10",
            "the interior domain is partitioned into L=0..4 with d=D+10-2L and L=M+5 with d=D",
        ],
        "Delta_results": results,
        "conclusion_with_existing_Delta2": "Together with rank8_delta2_path_forcing_and_face_exact_20260820.json, all four pending ranks Delta0..Delta3 are positive for every rooted path core P_n, n>=23.",
        "warning": "This is the path-core subtheorem only; it does not prove the remaining nonpath tensors or connected Q8.",
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
