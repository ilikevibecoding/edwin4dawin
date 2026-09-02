#!/usr/bin/env python3
"""Exact certificate for the diagonal rank-one lift of the multiplier pair.

For monic a with nonpositive roots, a double zero, and root-magnitude sum
N(2N-3), the Euler multiplier pair

  g=(E+N-3)a/(2N-3),  h=(N-E)a/(2N-3)

is the characteristic/difference pair obtained by subtracting the aligned
rank-one matrix sqrt(R)11^T sqrt(R)/(2N-3) from the diagonal matrix R.
"""

from __future__ import annotations

import json
import itertools
import random
from pathlib import Path

import sympy as sp

from verify_umbral_hypergeometric_finite_free_structure import (
    X, hypergeometric_form,
)


OUT = Path("normalized_rankone_diagonal_lift_certificate_20260802.json")


def multiplier_pair(a: sp.Expr, N: int) -> tuple[sp.Expr, sp.Expr]:
    L = 2*N-3
    g = sp.expand((X*sp.diff(a, X)+(N-3)*a)/L)
    h = sp.expand((N*a-X*sp.diff(a, X))/L)
    return g, h


def main() -> None:
    actual_checks = []
    for N in range(4, 61):
        raw_g = hypergeometric_form(N, 3)
        raw_h = hypergeometric_form(N-1, 3)
        leading = sp.Poly(raw_g, X).LC()
        g = sp.expand(raw_g/leading)
        h = sp.expand(raw_h/leading)
        a = sp.expand(g+h)
        gp, hp = multiplier_pair(a, N)
        assert sp.expand(gp-g) == 0
        assert sp.expand(hp-h) == 0
        ap = sp.Poly(a, X)
        assert ap.LC() == 1
        assert ap.nth(N-1) == N*(2*N-3)
        assert sp.rem(ap, sp.Poly(X**2, X)) == 0
        actual_checks.append(N)

    rng = random.Random(993_20260802 + 37)
    determinant_checks = []
    principal_minor_checks = 0
    arrowhead_checks = 0
    leaf_deletion_checks = 0
    for N in range(4, 11):
        L = 2*N-3
        for trial in range(5):
            raw = [sp.Integer(rng.randint(1, 40)) for _ in range(N-2)]
            scale = sp.Rational(N*L, sum(raw))
            positive = [sp.factor(scale*r) for r in raw]
            roots = positive+[sp.Integer(0), sp.Integer(0)]
            a = sp.expand(sp.prod(X+r for r in roots))
            g, h = multiplier_pair(a, N)

            R = sp.diag(*roots)
            column = sp.Matrix(roots)
            ones = sp.ones(N, 1)
            # This rational matrix is similar (on the positive support) to
            # R-sqrt(r)sqrt(r)^T/L, so it has the same characteristic polynomial.
            C = R-column*ones.T/L
            characteristic = sp.expand((X*sp.eye(N)+C).det())
            assert sp.expand(characteristic-g) == 0
            assert sp.expand(a-g-h) == 0

            # Rational arrowhead form of the same aligned subtraction.  It is
            # diagonally similar to the symmetric weighted-star matrix with
            # edge weights sqrt(r_i/L).
            arrow = sp.zeros(N+1)
            arrow[0, 0] = 1
            for i, root in enumerate(roots, start=1):
                arrow[0, i] = sp.Rational(1, L)
                arrow[i, 0] = root
                arrow[i, i] = X+root
            assert sp.expand(arrow.det()-g) == 0
            edge_sum = sp.expand(sum(
                sp.Rational(roots[i], L)
                * sp.prod(X+roots[j] for j in range(N) if j != i)
                for i in range(N)
            ))
            assert sp.expand(edge_sum-h) == 0
            arrowhead_checks += 1

            # Differentiation in the common leaf variable is exactly the sum
            # over leaf deletions.  This is the combinatorial form used by the
            # prospective matching-polynomial proof of the endpoint target.
            max_k = min(3, N)
            for k in range(max_k+1):
                deleted_g = 0
                deleted_h = 0
                for deleted in itertools.combinations(range(N), k):
                    keep = [i for i in range(N) if i not in deleted]
                    smaller_a = sp.prod(X+roots[j] for j in keep)
                    smaller_h = sum(
                        sp.Rational(roots[i], L)
                        * sp.prod(X+roots[j] for j in keep if j != i)
                        for i in keep
                    )
                    # Schur complement of the rational arrowhead.
                    deleted_h += smaller_h
                    deleted_g += smaller_a-smaller_h
                assert sp.expand(sp.diff(g, X, k)-sp.factorial(k)*deleted_g) == 0
                assert sp.expand(sp.diff(h, X, k)-sp.factorial(k)*deleted_h) == 0
                leaf_deletion_checks += 2

            # Every nonzero k-principal minor has the universal factor 1-k/L.
            for k in range(0, min(N-2, 5)+1):
                if k == 0:
                    continue
                indices = list(range(k))
                minor = sp.factor(C.extract(indices, indices).det())
                expected = sp.factor(sp.prod(roots[i] for i in indices)*(1-sp.Rational(k, L)))
                assert minor == expected
                principal_minor_checks += 1
            determinant_checks.append({"N": N, "trial": trial})

    report = {
        "kind": "normalized_rankone_diagonal_lift",
        "date": "2026-08-02",
        "status": "PASS_EXACT_ALIGNED_RANKONE_LIFT",
        "notation": "L=2N-3, E=X*d/dX, R=diag(r_1,...,r_N), sum r_i=NL",
        "pair": ["g=(E+N-3)a/L", "h=(N-E)a/L", "a=g+h=prod_i(X+r_i)"],
        "resolvent_identity": "h/a=sum_i r_i/(L(X+r_i))",
        "symmetric_matrix": "C=R-sqrt(r)sqrt(r)^T/L",
        "rational_similar_matrix": "C_sim=R-r*1^T/L",
        "characteristic_identity": "g(X)=det(XI+C)=det(XI+C_sim)",
        "rank_one_difference": "a(X)-g(X)=h(X)",
        "distinguished_compression": (
            "with u=sqrt(r/L)/sqrt(N), R=C+Nuu*, and "
            "h(X)/N=det(XI+C restricted to u-perp)"
        ),
        "positive_semidefinite_certificate": (
            "C=sqrt(R)(I-11^T/L)sqrt(R); since L=2N-3>N, "
            "I-11^T/L is positive definite (zeros in R are harmless)."
        ),
        "principal_minors": "det C[S]=(prod_(i in S) r_i)*(1-|S|/L)",
        "weighted_star_arrowhead": (
            "g=det([[1,1^T/L],[r,XI+R]]), diagonally similar to the "
            "symmetric star with edge-square weights r_i/L; "
            "h=sum_i (r_i/L) prod_(j!=i)(X+r_j)"
        ),
        "leaf_deletion_identity": (
            "D^k g=k! sum_(|I|=k) g_(delete leaves I), and likewise for h"
        ),
        "multiaffine_operator_identity": (
            "For A=prod_i x_i prod_j y_j, U=sum_i d/dx_i+sum_j d/dy_j, "
            "Ex=sum_i (r_i/L)d/dx_i, Ey=sum_j (r_j/L)d/dy_j, the target "
            "is [U^d(1-Ex)(1-Ey)-U^(d-2)ExEy]A after x_i=X+r_i, y_j=Y+r_j."
        ),
        "actual_defect3_checks": {"N_range": [4, 60], "cases": len(actual_checks)},
        "random_rational_determinant_checks": len(determinant_checks),
        "principal_minor_checks": principal_minor_checks,
        "arrowhead_checks": arrowhead_checks,
        "leaf_deletion_checks": leaf_deletion_checks,
        "significance": (
            "The endpoint compression weights are forced to be r_i/L.  This "
            "alignment is absent from the simultaneous-proper-position counterexample."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"status": report["status"],
                      "actual_cases": len(actual_checks),
                      "determinant_cases": len(determinant_checks),
                      "output": str(OUT.resolve())}, indent=2))


if __name__ == "__main__":
    main()
