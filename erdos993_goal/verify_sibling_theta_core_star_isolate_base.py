#!/usr/bin/env python3
"""Prove the terminal star-plus-isolates sibling Theta-core base.

Let H consist of a star centered at v, with distinguished leaf w,
k other leaves, and t external isolated vertices.  Put n=k+t.  For
q>=3 define

    P = C(n,q-2), R = C(t,q-1).

An exact phase calculation gives

  2 D_q(H,v,w)/(q!)^2
    = 2P/[q(q-1)^2] * {A P-(q-1) C R},

where

  A = 2(n+1)(n-q+2)(nq+n-3q+5)

and C is the polynomial returned by ``symbolic_proof`` below.

If C<=0 the result is immediate.  If C>0 and R>0, then t>=q-1 and

  P/R = (q-1)/(t-q+2)
        product_{j=0}^{q-3} (k+t-j)/(t-j)
      >= (q-1)/(t-q+2) {1+(q-2)k/t}.

Finally

  A{1+(q-2)k/t}-(t-q+2)C >= 0.

After multiplying by t and substituting q=3+r, t=q-1+u, the last
expression is a polynomial in k,u,r with 58 nonnegative coefficients.
That proves the base for every integer k,t>=0 and q>=3.
"""

from __future__ import annotations

import argparse
import json
from math import comb, factorial
from pathlib import Path

import networkx as nx
import sympy as sp

from scan_sibling_theta_core_pruning import theta_core


def choose(order: int, rank: int) -> int:
    return comb(order, rank) if 0 <= rank <= order else 0


def symbolic_proof() -> dict:
    k, t, q = sp.symbols(
        "k t q", integer=True, nonnegative=True
    )
    n = k + t
    Z, L, R, M, P = sp.symbols(
        "Z L R M P", nonnegative=True
    )

    # The rank-q base phase splits into root-absent sets that choose
    # no star leaf (Z), root-absent sets that hit a star leaf (L), and
    # root-selected sets (R).  The two lower phases live in n isolates.
    h_z, c_z = n - q + 1, t - q + 1
    h_l = c_l = n - q
    h_r = c_r = t - q + 1
    N = Z + L + R
    X = Z + L
    Y = L
    S = Z * h_z + L * h_l + R * h_r
    H2 = Z * h_z**2 + L * h_l**2 + R * h_r**2
    C0 = Z * c_z + L * c_l + R * c_r
    HX = Z * h_z + L * h_l
    h_m, h_p = n - q + 1, n - q + 2
    T, J2, D0 = M * h_m, M * h_m**2, M * h_m
    U, K2, E0 = P * h_p, P * h_p**2, P * h_p

    phi_sum = (
        2 * M * (S - HX)
        - 2 * (N - X) * T
        + M * (X + Y)
    )
    psi_sum = (
        2 * (q - 3) * N * P
        + P * C0
        + 2 * P * Y
        + N * E0
        - P * (H2 + 4 * HX + 4 * X)
        - N * K2
        + 2 * (S + 2 * X) * U
    )
    chi_sum = (
        (2 * q - 6) * M * P
        + P * D0
        + M * E0
        - P * J2
        - M * K2
        - 2 * P * T
        + 2 * T * U
        + 2 * M * U
    )
    doubled_core = sp.expand(
        -4 * X * (N - X)
        + 4 * phi_sum
        + 2 * psi_sum
        + 2 * chi_sum
        + 8 * M**2
    )

    substitutions = {
        Z: sp.binomial(t, q),
        L: sp.binomial(n, q) - sp.binomial(t, q),
        R: sp.binomial(t, q - 1),
        M: sp.binomial(n, q - 1),
        P: sp.binomial(n, q - 2),
    }

    # Algebraically eliminate adjacent binomial ranks, retaining P and R.
    M_in_P = P * (n - q + 2) / (q - 1)
    Z_in_R = R * (t - q + 1) / q
    L_in_PR = (
        M_in_P * (n - q + 1) / q - Z_in_R
    )
    reduced = sp.factor(
        doubled_core.subs(
            {
                Z: Z_in_R,
                L: L_in_PR,
                M: M_in_P,
            }
        )
    )

    A = sp.factor(
        2
        * (n + 1)
        * (n - q + 2)
        * (n * q + n - 3 * q + 5)
    )
    C = sp.expand(
        k**2 * q**2
        - 2 * k**2 * q
        + k**2
        + 5 * k * n * q
        - 3 * k * n
        - 2 * k * q**2
        + 7 * k * q
        - 3 * k
        + 4 * n**2
        - 2 * n * q**2
        - 4 * n * q
        + 10 * n
        + 6 * q**2
        - 12 * q
        + 6
    )
    claimed = (
        2
        * P
        * (A * P - (q - 1) * C * R)
        / (q * (q - 1) ** 2)
    )
    assert sp.factor(reduced - claimed) == 0

    r, u = sp.symbols("r u", nonnegative=True)
    bernoulli_margin_cleared = sp.expand(
        A * (t + (q - 2) * k)
        - t * (t - q + 2) * C
    )
    positive_polynomial = sp.Poly(
        sp.expand(
            bernoulli_margin_cleared
            .subs(t, u + q - 1)
            .subs(q, r + 3)
        ),
        k,
        u,
        r,
    )
    negative_coefficients = [
        {
            "monomial": monomial,
            "coefficient": str(coefficient),
        }
        for monomial, coefficient in positive_polynomial.terms()
        if coefficient < 0
    ]
    assert not negative_coefficients

    # On the support P>0, n=q-2+d.  The final factor of A is
    # (q-1)(q-3)+(q+1)d, hence A>=0 for q>=3.
    d = sp.symbols("d", nonnegative=True)
    last_a_factor = sp.factor(
        (n * q + n - 3 * q + 5).subs(n, q - 2 + d)
    )
    assert sp.expand(
        last_a_factor
        - ((q - 1) * (q - 3) + (q + 1) * d)
    ) == 0

    return {
        "A": str(A),
        "C": str(C),
        "reduced_doubled_core": str(claimed),
        "bernoulli_margin_term_count": len(
            positive_polynomial.terms()
        ),
        "bernoulli_margin_negative_coefficient_count": 0,
        "A_last_factor_on_support": str(last_a_factor),
        "binomial_substitution": {
            name.name: str(value)
            for name, value in substitutions.items()
        },
    }


def direct_formula(k: int, t: int, q: int) -> int:
    n = k + t
    P = choose(n, q - 2)
    R = choose(t, q - 1)
    A = (
        2
        * (n + 1)
        * (n - q + 2)
        * (n * q + n - 3 * q + 5)
    )
    C = (
        k * k * q * q
        - 2 * k * k * q
        + k * k
        + 5 * k * n * q
        - 3 * k * n
        - 2 * k * q * q
        + 7 * k * q
        - 3 * k
        + 4 * n * n
        - 2 * n * q * q
        - 4 * n * q
        + 10 * n
        + 6 * q * q
        - 12 * q
        + 6
    )
    numerator = (
        factorial(q) ** 2
        * P
        * (A * P - (q - 1) * C * R)
    )
    denominator = q * (q - 1) ** 2
    assert numerator % denominator == 0
    return numerator // denominator


def finite_replay(maximum_k: int, maximum_t: int) -> dict:
    checks = 0
    failures: list[dict] = []
    for k in range(maximum_k + 1):
        for t in range(maximum_t + 1):
            # Center 0, distinguished leaf k+1, ordinary leaves 1..k,
            # and t isolates following the star component.
            graph = nx.star_graph(k + 1)
            next_vertex = k + 2
            graph.add_nodes_from(range(next_vertex, next_vertex + t))
            root = 0
            distinguished = k + 1
            values = theta_core(graph, root, distinguished)
            for q in range(3, k + t + 5):
                direct = values.get(q, 0)
                formula = direct_formula(k, t, q)
                if direct != formula:
                    failures.append(
                        {
                            "ordinary_star_leaves_k": k,
                            "external_isolates_t": t,
                            "rank_q": q,
                            "direct_factorial_theta_core": direct,
                            "closed_formula": formula,
                        }
                    )
                checks += 1
    return {
        "maximum_k": maximum_k,
        "maximum_t": maximum_t,
        "checked_parameter_ranks": checks,
        "identity_failure_count": len(failures),
        "identity_failures": failures[:20],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--maximum-k", type=int, default=20)
    parser.add_argument("--maximum-t", type=int, default=20)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(
            "sibling_theta_core_star_isolate_base_"
            "certificate_20260729.json"
        ),
    )
    args = parser.parse_args()

    symbolic = symbolic_proof()
    replay = finite_replay(args.maximum_k, args.maximum_t)
    report = {
        "status": (
            "PASS_SIBLING_THETA_CORE_STAR_ISOLATE_BASE_THEOREM"
            if not replay["identity_failure_count"]
            else "FAIL_SIBLING_THETA_CORE_STAR_ISOLATE_BASE_THEOREM"
        ),
        "symbolic_proof": True,
        "proof_cases": (
            "If R=0 or C<=0 the reduced expression is immediate. "
            "Otherwise the exact P/R product, first-order Bernoulli "
            "bound, and the 58-term coefficient-positive polynomial "
            "prove nonnegativity."
        ),
        **symbolic,
        **replay,
    }
    args.output.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
