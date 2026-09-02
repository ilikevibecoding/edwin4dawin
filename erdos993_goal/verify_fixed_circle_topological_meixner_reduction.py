#!/usr/bin/env python3
"""Exact structural reduction for the remaining fixed-circle theorem.

This verifier has two purposes.

1.  It identifies the boundary of the reachable symmetric-parameter region
    (s,p)=(u+v,uv).  The u=0 boundary is hyperbolic and the u=1 boundary is
    covered by the proved large-parameter sign theorem.  Subject to the
    already proved negative-axis anchor, the only new boundary family needed
    by the continuation argument is u=v.

2.  For repeated benign source parameter d, it identifies the u=v polynomial
    as an order-two quasi-orthogonal Meixner polynomial and as a one-coupling
    indefinite Jacobi extension.  The exact recurrence exposes the target
    radius N(N-1)/16 in the final recurrence coefficient.

The script verifies identities and finite matrix replays.  It does not claim
the remaining spectral disk enclosure, nor the full Erdos conjecture.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "fixed_circle_topological_meixner_reduction_exact_20260809.json"
z, q = sp.symbols("z q")


def falling(order: int) -> sp.Expr:
    return sp.prod((z - j for j in range(order)), start=sp.Integer(1))


def rising(B: sp.Expr, order: int) -> sp.Expr:
    return sp.prod((B + j for j in range(order)), start=sp.Integer(1))


def normalized_pochhammer(source: sp.Expr, B: sp.Expr) -> sp.Poly:
    polynomial = sp.Poly(sp.expand(source), q)
    return sp.Poly(
        sp.expand(sum(
            polynomial.nth(k) * falling(k) / rising(B, k)
            for k in range(polynomial.degree() + 1)
        )),
        z,
    )


def monic_meixner(B: sp.Expr, d: sp.Expr, degree: int) -> sp.Poly:
    raw = normalized_pochhammer((4 * q - d) ** degree, B)
    return sp.Poly(sp.cancel(raw.as_expr() / raw.LC()), z)


def tridiagonal_characteristic(
    diagonal: list[sp.Expr], subdiagonal_products: list[sp.Expr]
) -> sp.Poly:
    previous = sp.Integer(1)
    current = z - diagonal[0]
    for index in range(1, len(diagonal)):
        following = sp.expand(
            (z - diagonal[index]) * current
            - subdiagonal_products[index - 1] * previous
        )
        previous, current = current, following
    return sp.Poly(current, z)


def main() -> None:
    # Exact symmetric-bilinear and reachable-boundary algebra.
    u, v, s, p = sp.symbols("u v s p", real=True)
    T00, T10, T11 = sp.symbols("T00 T10 T11")
    general = sp.expand(
        (1 - u) * (1 - v) * T00
        + (u * (1 - v) + v * (1 - u)) * T10
        + u * v * T11
    )
    A = T10 - T00
    D = T00 - 2 * T10 + T11
    assert sp.expand(general - (T00 + (u + v) * A + u * v * D)) == 0

    # The three boundary components of K={(u+v,uv):0<=u,v<=1}.
    boundary_substitutions = {
        "one_zero": {u: 0},
        "one_one": {u: 1},
        "diagonal": {v: u},
    }
    boundary_forms = {
        label: str(sp.factor(general.subs(substitution)))
        for label, substitution in boundary_substitutions.items()
    }
    assert sp.expand(general.subs(u, 0) - (T00 + v * A)) == 0
    assert sp.expand(general.subs(u, 1) - (T10 + v * (T11 - T10))) == 0
    assert sp.expand(general.subs(v, u) - (T00 + 2 * u * A + u**2 * D)) == 0

    # The u=1 edge lies strictly in the already proved large-parameter region.
    r, beta, xi, edge_parameter = sp.symbols(
        "r beta xi edge_parameter", nonnegative=True
    )
    B_reserve = 3 * r + 4 + beta
    edge_margin = sp.factor(
        (B_reserve + xi)
        * (sp.Rational(1, 3) + edge_parameter / (4 - edge_parameter))
        - (r + 1)
    )
    # Dropping the nonnegative xi and edge-parameter terms leaves 1/3+beta/3.
    edge_floor = sp.factor(edge_margin.subs({xi: 0, edge_parameter: 0}))
    assert sp.factor(edge_floor - (beta + 1) / 3) == 0

    # Meixner recurrence for the repeated benign source.
    B, d, t = sp.symbols("B d t", positive=True)
    recurrence_records: list[dict[str, object]] = []
    meixner = [monic_meixner(B, d, degree) for degree in range(9)]
    for degree in range(8):
        b_degree = degree * (1 + d / 2) + d * B / 4
        if degree == 0:
            expected = sp.Poly(z - b_degree, z)
        else:
            a_degree = d * (d + 4) * degree * (degree + B - 1) / 16
            expected = sp.Poly(
                sp.expand(
                    (z - b_degree) * meixner[degree].as_expr()
                    - a_degree * meixner[degree - 1].as_expr()
                ),
                z,
            )
        assert meixner[degree + 1] == expected
        recurrence_records.append(
            {
                "degree": degree,
                "b": str(sp.factor(b_degree)),
                "a": None if degree == 0 else str(sp.factor(a_degree)),
            }
        )

    # Repeated-benign diagonal-outlier identity and Jacobi determinant replay.
    repeated_records: list[dict[str, object]] = []
    for rank in range(0, 7):
        N = B + rank + 1
        radius_squared = N * (N - 1) / 16
        h = d + t
        source = (q + t / 4) ** 2 * (4 * q - d) ** rank
        raw = normalized_pochhammer(source, B)
        full_monic = sp.Poly(sp.cancel(raw.as_expr() / raw.LC()), z)

        meixner_combo = sp.Poly(
            sp.expand(
                meixner[rank + 2].as_expr()
                + h * N * meixner[rank + 1].as_expr() / 2
                + h**2 * radius_squared * meixner[rank].as_expr()
            ),
            z,
        )
        assert full_monic == meixner_combo

        b_values = [
            k * (1 + d / 2) + d * B / 4
            for k in range(rank + 1)
        ]
        a_values = [
            d * (d + 4) * k * (k + B - 1) / 16
            for k in range(1, rank + 1)
        ]
        b_final = sp.factor(rank + 1 - d * B / 4 - t * N / 2)
        a_final = sp.factor(
            d * (d + 4) * (rank + 1) * (N - 1) / 16
            - h**2 * radius_squared
        )
        matrix_characteristic = tridiagonal_characteristic(
            [*b_values, b_final], [*a_values, a_final]
        )
        assert full_monic == matrix_characteristic

        # Birth-death factorization, with exactly the final death rate allowed
        # to be negative.
        u_final = sp.factor(N * t**2 / (4 * d))
        ell_final = sp.factor(b_final - u_final)
        u_r = sp.factor(d * (N - 1) / 4)
        assert sp.factor(ell_final + u_final - b_final) == 0
        assert sp.factor(ell_final * u_r - a_final) == 0

        repeated_records.append(
            {
                "rank": rank,
                "N": str(N),
                "radius_squared": str(sp.factor(radius_squared)),
                "final_diagonal": str(b_final),
                "final_coupling_square": str(a_final),
                "final_birth_rate": str(u_final),
                "final_death_rate": str(ell_final),
                "primitive_sha256": hashlib.sha256(
                    str(sp.primitive(full_monic.as_expr(), z)[1]).encode("utf-8")
                ).hexdigest(),
            }
        )

    payload = {
        "kind": "fixed_circle_topological_and_meixner_structural_reduction",
        "date": "2026-08-09",
        "status": "PASS_EXACT_TOPOLOGICAL_BOUNDARY_AND_MEIXNER_MATRIX_REDUCTION",
        "scope": "exact reductions and finite symbolic replays; not the remaining disk proof",
        "reachable_region": (
            "K={(s,p):p>=0,p<=1,s>=0,s<=1+p,s^2>=4p}.  Its boundary is "
            "u=0 or v=0, u=1 or v=1, and u=v."
        ),
        "topological_continuation": (
            "For each upper-semicircle point, T00+sA+pD is affine in (s,p). "
            "Using the proved negative-axis anchor, excluding zeros on the three "
            "boundary families excludes an interior reachable zero.  The zero and "
            "one edges are already controlled; u=v is the new boundary theorem."
        ),
        "boundary_forms": boundary_forms,
        "one_edge_large_parameter_margin_floor": str(edge_floor),
        "meixner_recurrence": (
            "m_(n+1)=(z-b_n)m_n-a_n m_(n-1), "
            "b_n=n(1+d/2)+dB/4, a_n=d(d+4)n(n+B-1)/16."
        ),
        "diagonal_quasi_orthogonal_form": (
            "f_r=m_(r+2)+(d+t)N/2*m_(r+1)+"
            "(d+t)^2*N(N-1)/16*m_r."
        ),
        "indefinite_jacobi_form": (
            "f_r=(z-b_*)m_(r+1)-a_*m_r with "
            "b_*=r+1-dB/4-tN/2 and "
            "a_*=d(d+4)(r+1)(N-1)/16-(d+t)^2*N(N-1)/16."
        ),
        "remaining_spectral_lemma": (
            "For B>=3r+4, 0<=t<=1 and d>0, prove that the at-most-two "
            "nonpositive/nonreal zeros of this one-coupling Meixner extension "
            "lie in |z|^2<=N(N-1)/16, then lift from the repeated benign source "
            "to an arbitrary positive-rooted benign source."
        ),
        "recurrence_replays": recurrence_records,
        "repeated_rank_replays": repeated_records,
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"recurrence_degrees=0..{len(recurrence_records)-1}")
    print(f"repeated_ranks=0..{len(repeated_records)-1}")
    print(f"report={REPORT}")


if __name__ == "__main__":
    main()
