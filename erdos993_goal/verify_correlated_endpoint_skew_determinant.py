#!/usr/bin/env python3
"""Exact replay for the correlated endpoint-deletion determinant.

Let C_n=tridiag(1,2,1), D_x=I+v*x*C_n, D_y=I+v*y*C_n, and
E=e_1e_1^T+e_ne_n^T.  With a^2=u, put

    M_n = [[D_x, a E],[-a E, D_y]].

The sparse permutation expansion gives, for n>=2,

 det M_n = P_(n+1)(vx)P_(n+1)(vy)
         + 2u P_n(vx)P_n(vy)
         + u^2 P_(n-1)(vx)P_(n-1)(vy)
         + 2u v^(2n-2)(xy)^(n-1).

The first four terms come from using neither, one, or both endpoint cross
transpositions.  The last term is the sum of the two oriented Hamiltonian
cycles in the two-rail graph.  Consequently every v-layer below 2n-2 is
exactly the correlated quadratic pencil used in the lower-selector route.

The permutation classification is the all-order proof.  This script checks
the determinant and all low-layer identities exactly for a finite range.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "correlated_endpoint_skew_determinant_exact_20260810.json"


def path_matrix(n: int) -> sp.Matrix:
    return sp.Matrix(
        n,
        n,
        lambda i, j: 2 if i == j else (1 if abs(i - j) == 1 else 0),
    )


def path_det(n: int, q: sp.Expr) -> sp.Expr:
    if n == 0:
        return sp.Integer(1)
    return sp.expand((sp.eye(n) + q * path_matrix(n)).det())


def one_size(n: int, v: sp.Symbol, x: sp.Symbol, y: sp.Symbol,
             a: sp.Symbol, u: sp.Symbol) -> dict[str, object]:
    C = path_matrix(n)
    E = sp.zeros(n)
    E[0, 0] = 1
    E[n - 1, n - 1] = 1
    Dx = sp.eye(n) + v * x * C
    Dy = sp.eye(n) + v * y * C
    M = Dx.row_join(a * E).col_join((-a * E).row_join(Dy))
    determinant = sp.expand(M.det().subs(a**2, u))
    # SymPy's direct substitution handles a^4 only after an expansion pass.
    determinant = sp.expand(determinant.subs(a**4, u**2).subs(a**2, u))

    expected_main = sp.expand(
        path_det(n, v * x) * path_det(n, v * y)
        + 2 * u * path_det(n - 1, v * x) * path_det(n - 1, v * y)
        + u**2 * path_det(n - 2, v * x) * path_det(n - 2, v * y)
    )
    hamiltonian = 2 * u * v ** (2 * n - 2) * (x * y) ** (n - 1)
    assert sp.expand(determinant - expected_main - hamiltonian) == 0

    determinant_v = sp.Poly(determinant, v)
    main_v = sp.Poly(expected_main, v)
    low_layers = 0
    for s in range(2 * n - 2):
        assert sp.expand(determinant_v.nth(s) - main_v.nth(s)) == 0
        low_layers += 1

    return {
        "n": n,
        "N": n + 1,
        "exact_determinant_identity": True,
        "hamiltonian_degree": 2 * n - 2,
        "low_layers_checked": low_layers,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-n", type=int, default=7)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    assert args.max_n >= 2

    v, x, y, a, u = sp.symbols("v x y a u")
    records = [one_size(n, v, x, y, a, u) for n in range(2, args.max_n + 1)]
    source_hash = hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper()
    report = {
        "status": "PASS_EXACT_CORRELATED_ENDPOINT_SKEW_DETERMINANT_REPLAY",
        "all_order_proof": (
            "Classify sparse determinant permutations: endpoint cross arcs are either "
            "paired into cross transpositions, giving the four correlated principal-"
            "minor terms, or both rails and both endpoints form one of the two oriented "
            "Hamiltonian cycles."
        ),
        "finite_scope": {
            "n": [2, args.max_n],
            "sizes": len(records),
            "low_layers": sum(record["low_layers_checked"] for record in records),
        },
        "implication": (
            "For N=n+1 and s<2N-4, the v^s layer is exactly the binary "
            "homogenization of G_(N,s)+2uG_(N-1,s)+u^2G_(N-2,s)."
        ),
        "remaining_gap": (
            "Prove stability/proper position of the low homogeneous layers; the full "
            "skew determinant is not itself a generic Hermitian determinantal-stability "
            "certificate."
        ),
        "source_sha256": source_hash,
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report_hash = hashlib.sha256(args.output.read_bytes()).hexdigest().upper()
    print(json.dumps({
        "status": report["status"],
        "sizes": len(records),
        "low_layers": report["finite_scope"]["low_layers"],
        "source_sha256": source_hash,
        "report_sha256": report_hash,
        "report": str(args.output),
    }, indent=2))


if __name__ == "__main__":
    main()
