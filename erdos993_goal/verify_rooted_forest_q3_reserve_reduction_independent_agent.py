#!/usr/bin/env python3
"""Exact algebraic reduction for the rooted-forest q3 reserve candidate.

This proves that only ranks j=3,4,5 on rooted forests with no isolated
root component remain.  It does not prove those three residual cases.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rooted_forest_q3_reserve_reduction_exact_independent_20260828.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    M, c, a, j = sp.symbols("M c a j", integer=True, positive=True)
    N = M + c

    # A rooted forest without isolated root components has c<=M, M edges,
    # If D is the total root degree, then
    # h2=C(M,2)-(M-D)=C(M-1,2)+D-1.  Since D>=c, the sharp
    # degree-free lower bound is C(M-1,2)+c-1 (not +c).
    h2_lower = sp.binomial(M - 1, 2) + c - 1
    k2_lower = M * (c + 1) + c**2 - 3 * c
    f2 = sp.binomial(N, 2) - M

    high_rank_gap = sp.factor(
        sp.expand_func(14 * h2_lower + 4 * k2_lower - 6 * f2)
    )
    expected_high = 4 * M**2 - 2 * M * c - 8 * M + c**2 + 5 * c
    assert sp.expand(high_rank_gap - expected_high) == 0
    # On the exact integer domain c>=1 and M>=c, put c=1+u and M=c+v.
    # The shifted expression is nonnegative: its only non-coefficientwise
    # term is 2v(2v-1), which is >=0 for every integer v>=0.
    u, v = sp.symbols("u v", integer=True, nonnegative=True)
    high_shift = sp.factor(
        sp.expand(expected_high.subs({c: 1 + u, M: 1 + u + v}, simultaneous=True))
    )
    expected_high_shift = 3 * u**2 + 6 * u * v + 3 * u + 4 * v**2 - 2 * v
    assert sp.expand(high_shift - expected_high_shift) == 0

    # Add a isolated distinguished-root components to a no-isolate base.
    # H is unchanged, while f_j is binomially transformed.
    k2_a = k2_lower + a * (2 * N - M) + a * (a - 1)
    A_a = 2 * (j + 1) * h2_lower + (j - 2) * k2_a
    delta_A = sp.expand((j - 2) * (2 * N - M + 2 * a))
    R = M - j + 1

    # If h_j>0, then M>=j.  The shadow inequality
    # h_{j-1} >= j h_j/(M-j+1), together with f_j(a)>=h_j,
    # makes the following numerator a lower bound for
    # (E(a+1)-E(a))*(M-j+1)/h_j.
    difference_numerator = sp.expand(
        sp.expand_func(
            j * (A_a + delta_A) + R * (delta_A - 6 * (N + a))
        )
    )

    j3 = sp.Poly(sp.expand(difference_numerator.subs(j, 3)), a)
    assert j3.degree() == 2 and j3.LC() == 3
    j3_discriminant = sp.factor(sp.discriminant(j3.as_expr(), a))
    expected_j3_discriminant = -83 * M**2 + 218 * M - 216 * c + 121
    assert sp.expand(j3_discriminant - expected_j3_discriminant) == 0
    r, k = sp.symbols("r k", integer=True, nonnegative=True)
    shifted_negative_discriminant = sp.expand(
        -j3_discriminant.subs({M: 3 + r, c: 1 + u})
    )
    assert shifted_negative_discriminant == 83 * r**2 + 280 * r + 216 * u + 188

    shifted_j4_plus = sp.Poly(
        sp.expand(
            difference_numerator.subs(
                {j: 4 + k, M: 4 + k + r, c: 1 + u}
            )
        ),
        k,
        r,
        u,
        a,
    )
    assert shifted_j4_plus.coeffs()
    assert all(coefficient > 0 for coefficient in shifted_j4_plus.coeffs())

    report = {
        "status": "PASS_EXACT_ROOTED_FOREST_Q3_RESERVE_REDUCTION_TO_RANKS_3_4_5",
        "theorem": {
            "high_ranks": (
                "the rooted reserve holds automatically for every j>=6 on "
                "forests with no isolated root component"
            ),
            "isolated_roots": (
                "adjoining any number of isolated distinguished-root components "
                "preserves the reserve at every j>=3"
            ),
            "remaining_obligation": (
                "prove the reserve only for j=3,4,5 on rooted forests in which "
                "every component is nontrivial"
            ),
        },
        "exact_identities": {
            "parameters": (
                "M=number of nonroots=number of edges, c=number of components, "
                "N=M+c, h2>=C(M-1,2)+c-1, K2>=M(c+1)+c^2-3c"
            ),
            "high_rank_A6_minus_6f2_lower": str(high_rank_gap),
            "high_rank_integer_domain_shift": str(high_shift),
            "high_rank_nonnegative_decomposition": (
                "3u(u+1)+6uv+2v(2v-1), where c=1+u, M=c+v"
            ),
            "isolated_root_updates": {
                "f2": "f2(a)=f2+a*N+C(a,2)",
                "K2": "K2(a)=K2+a(2N-M)+a(a-1)",
                "fj": "fj(a)=sum_l C(a,l)f_(j-l)",
            },
            "difference_lower_numerator": str(sp.factor(difference_numerator)),
            "j3_quadratic": str(j3.as_expr()),
            "j3_discriminant": str(j3_discriminant),
            "negative_j3_discriminant_shift": str(shifted_negative_discriminant),
            "j4_plus_shift_term_count": len(shifted_j4_plus.terms()),
            "j4_plus_shift_minimum_coefficient": str(min(shifted_j4_plus.coeffs())),
        },
        "scope": {
            "proved": "an all-order reduction of the reserve candidate",
            "not_proved": (
                "the residual j=3,4,5 cases, the full reserve candidate, the "
                "two-block payment, the higher-rank tree envelope, or Erdos 993"
            ),
        },
        "correction": (
            "Uses the exact lower bound h2>=C(M-1,2)+c-1; an earlier draft "
            "incorrectly omitted the -1 and is superseded by this report."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report["theorem"], indent=2))
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
