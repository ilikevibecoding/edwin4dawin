#!/usr/bin/env python3
"""Exact replay for the path-determinant representation of G_(M,s).

Put

    p_(M,i) = binom(2M-i-1,i),
    P_M(v)  = sum_i p_(M,i) v^i,

and let C_n=tridiag(1,2,1), n=M-1.  The continuant recurrence gives

    P_M(v)=det(I+v C_n).

If a+b=1 and ab=t, the gamma polynomial of the palindromic path slice is

    G_(M,s)(t)=[U^s] P_M(aU)P_M(bU)
              =[U^s] det(I+U C_n+t U^2 C_n^2).       (D)

Equivalently, if lambda_1,...,lambda_n are the eigenvalues of C_n,

    [t^h]G_(M,s)=m_(2^h,1^(s-2h))(lambda_1,...,lambda_n).  (M)

The last identity follows directly by choosing h quadratic terms and
s-2h linear terms from product_i(1+lambda_i U+t lambda_i^2 U^2).

The all-order proof is the continuant argument and coefficient extraction
above.  This script exactly replays (D), the palindromic gamma conversion,
and the boundary rank-one identity

    (C_n^2)[1:n-1,1:n-1]=C_(n-1)^2+e e^T,             (R)

for a finite range.  These finite checks are transcription evidence, not
the proof of the all-order statements.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "path_determinant_monomial_identity_exact_20260809.json"


def p(M: int, i: int) -> int:
    if i < 0 or i > M - 1:
        return 0
    return math.comb(2 * M - i - 1, i)


def path_matrix(n: int) -> sp.Matrix:
    return sp.Matrix(
        n,
        n,
        lambda i, j: 2 if i == j else (1 if abs(i - j) == 1 else 0),
    )


def path_slice(M: int, s: int, z: sp.Symbol) -> sp.Poly:
    return sp.Poly(
        sum(p(M, i) * p(M, s - i) * z**i for i in range(s + 1)),
        z,
        domain=sp.ZZ,
    )


def gamma_from_palindromic(A: sp.Poly, s: int, z: sp.Symbol, t: sp.Symbol) -> sp.Poly:
    """Triangularly solve A(z)=sum_h g_h z^h(1+z)^(s-2h)."""
    residual = sp.Poly(A, z, domain=sp.ZZ)
    gamma = 0
    for h in range(s // 2 + 1):
        value = int(residual.nth(h))
        gamma += value * t**h
        residual -= sp.Poly(value * z**h * (1 + z) ** (s - 2 * h), z, domain=sp.ZZ)
    assert residual.is_zero
    return sp.Poly(gamma, t, domain=sp.ZZ)


def one_size(M: int, U: sp.Symbol, t: sp.Symbol, z: sp.Symbol) -> dict[str, object]:
    n = M - 1
    C = path_matrix(n)
    determinant = sp.Poly(
        sp.expand((sp.eye(n) + U * C + t * U**2 * C**2).det()),
        U,
        t,
        domain=sp.ZZ,
    )

    continuant = sp.Poly((sp.eye(n) + U * C).det(), U, domain=sp.ZZ)
    expected_continuant = sp.Poly(sum(p(M, i) * U**i for i in range(M)), U, domain=sp.ZZ)
    assert continuant == expected_continuant

    layer_records = []
    for s in range(2 * n + 1):
        determinant_layer = sp.Poly(
            sp.Poly(determinant.as_expr(), U).nth(s),
            t,
            domain=sp.ZZ,
        )
        A = path_slice(M, s, z)
        gamma = gamma_from_palindromic(A, s, z, t)
        assert determinant_layer == gamma
        assert all(value >= 0 for value in gamma.all_coeffs())
        layer_records.append({
            "s": s,
            "degree": gamma.degree(),
            "coefficients_low_to_high": [int(gamma.nth(h)) for h in range(gamma.degree() + 1)],
        })

    rank_one_boundary = True
    if n >= 2:
        principal_square = (C**2)[: n - 1, : n - 1]
        smaller = path_matrix(n - 1)
        e = sp.zeros(n - 1, 1)
        e[n - 2, 0] = 1
        rank_one_boundary = principal_square == smaller**2 + e * e.T
        assert rank_one_boundary

    return {
        "M": M,
        "matrix_size": n,
        "continuant_identity_exact": True,
        "determinant_gamma_layers_exact": True,
        "layers_checked": len(layer_records),
        "boundary_square_discrepancy_rank_one": rank_one_boundary,
        "layers": layer_records,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-M", type=int, default=9)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    assert args.max_M >= 2

    U, t, z = sp.symbols("U t z")
    records = [one_size(M, U, t, z) for M in range(2, args.max_M + 1)]
    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "status": "PASS_EXACT_PATH_DETERMINANT_MONOMIAL_IDENTITY_REPLAY",
        "all_order_lemmas": [
            "P_M(v)=det(I+v C_(M-1)) by the common continuant recurrence",
            "G_(M,s)=[U^s]det(I+U C+t U^2 C^2) by gamma homogenization",
            "[t^h]G_(M,s)=m_(2^h,1^(s-2h))(eigenvalues of C)",
            "the leading principal block of C_n^2 differs from C_(n-1)^2 by one boundary rank-one matrix",
        ],
        "finite_replay_scope": {
            "M": [2, args.max_M],
            "sizes": len(records),
            "gamma_layers": sum(record["layers_checked"] for record in records),
        },
        "remaining_target": (
            "Use the rank-one boundary nesting or a mixed-characteristic-polynomial theorem "
            "to prove compatibility of the three transformed size differences and hence "
            "real-rootedness of the selector H polynomial."
        ),
        "source_sha256": source_hash,
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print(json.dumps({
        "status": report["status"],
        "sizes": len(records),
        "gamma_layers": report["finite_replay_scope"]["gamma_layers"],
        "source_sha256": source_hash,
        "report_sha256": report_hash,
        "report": str(args.output),
    }, indent=2))


if __name__ == "__main__":
    main()
