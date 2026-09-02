#!/usr/bin/env python3
"""Exact Newton-m=3 proof for the terminal q3 payment at target j>=4.

This is deliberately scoped to tree bases G of order n>=15 and supported
targets j>=4.  The extremal target j=3 is recorded as a separate unresolved
boundary and is not claimed by this verifier.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_m3_j4plus_exact_agent_20260829.json"
PINS = {
    "verify_terminal_q3_payment_newton_tail_independent_agent.py": (
        "FDC4736A2B5729954C585A37800915C818A24667D55E6DDB2F76B122FD334BA6"
    ),
    "terminal_q3_payment_newton_tail_independent_20260828.json": (
        "EFA58A539FAA2627D3BC1ECC9E5925D6BB6587F555540F01574608F7C38EA212"
    ),
    "prove_terminal_q3_low_newton_m6_conditional_independent_agent.py": (
        "A1225191B4224AB0ABDA3E94E6262C13F46E591BDCC9254609EC589AC9A3E3ED"
    ),
    "terminal_q3_low_newton_m6_exact_independent_20260829.json": (
        "0F0AB60B4E248EA6619BD06E471D4776B0D043605185B27DD9D6854B17DDEAC4"
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def kernel(left: int, right: int, union: int) -> sp.Integer:
    if not max(left, right) <= union <= left + right:
        return sp.Integer(0)
    return sp.factorial(union) // (
        sp.factorial(union - left)
        * sp.factorial(union - right)
        * sp.factorial(left + right - union)
    )


def main() -> None:
    observed = {name: sha256(HERE / name) for name in PINS}
    assert observed == PINS
    incidence = json.loads(
        (HERE / "terminal_q3_low_newton_m6_exact_independent_20260829.json")
        .read_text(encoding="utf-8")
    )
    assert incidence["status"] == (
        "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M6"
    )

    N, j, a, b, e0, p0 = sp.symbols(
        "N j a b e0 p0", integer=True, nonnegative=True
    )
    p1 = (N**2 + N + 2) / 2
    p2 = N + 2
    p3 = sp.Integer(1)

    # Lower Q=(j+1)b(c+R)-3(P+a)e coefficient by coefficient.  At
    # degrees 0 and 1 retain c0>=a, c1=a, and R1>=N; at degree 2
    # retain the exact R2=N.
    q_lower = [
        (j + 1) * b * a - 3 * e0 * (p0 + a),
        (j + 1) * b * (a + N) - 3 * e0 * p1 - 3 * b * (p0 + a + p1),
        (j + 1) * b * N - 3 * e0 * p2 - 6 * b * (p1 + p2),
        -3 * (e0 + 3 * b * (p2 + 1)),
    ]
    p = [p0, p1, p2, p3]
    pq3_lower = sp.expand(sum(
        kernel(left, right, 3) * p[left] * q_lower[right]
        for left in range(4)
        for right in range(4)
    ))
    explicit_kernel_sum = sp.expand(
        p0 * q_lower[3]
        + 3 * p1 * q_lower[2]
        + 3 * p1 * q_lower[3]
        + 3 * p2 * q_lower[1]
        + 6 * p2 * q_lower[2]
        + 3 * p2 * q_lower[3]
        + q_lower[0]
        + 3 * q_lower[1]
        + 3 * q_lower[2]
        + q_lower[3]
    )
    assert sp.expand(pq3_lower - explicit_kernel_sum) == 0

    # The unconditional incidence lemma gives e0<=(j+2)b.  After this
    # substitution the coefficient of a is positive for N>=j>=3, whereas
    # the coefficient of p0 is negative.  Thus use the forest pair floor
    # for a and the sharp tree upper bound for p0.
    after_e = sp.expand(pq3_lower.subs(e0, (j + 2) * b))
    a_slope = sp.factor(sp.diff(after_e, a) / b)
    expected_a_slope = 3 * (N + 3) * (j - 2) - (2 * j + 5)
    assert sp.expand(a_slope - expected_a_slope) == 0
    assert sp.Poly(
        sp.expand(expected_a_slope.subs({N: 3 + sp.Symbol("x"), j: 3})),
        sp.Symbol("x"),
    ).coeffs() == [3, 7]
    p0_slope = sp.factor(sp.diff(after_e, p0) / b)
    assert sp.Poly(-p0_slope, N, j).coeffs()
    assert all(value > 0 for value in sp.Poly(-p0_slope, N, j).coeffs())

    pair_floor = (N - 1) * (N - 2) / 2
    p0_upper = N * (N - 1) * (N + 1) / 6
    final_remainder = sp.factor(after_e.subs({a: pair_floor, p0: p0_upper}))
    q3_bound = (
        15 * N**4
        + 14 * N**3 * j
        + 169 * N**3
        + 89 * N**2 * j
        + 689 * N**2
        + 229 * N * j
        + 1469 * N
        + 316 * j
        + 1948
    )
    assert sp.expand(final_remainder + b * q3_bound / 2) == 0

    # The tree triple identity is
    # p0=C(N+1,3)-N(N-1)+W+C(N,2), where W=sum_v C(d_v,2).
    # Writing x_v=d_v-1 gives sum x_v=N-1 and
    # N-1<=W<=C(N,2), proving the lower and upper p0 bounds used here.
    p0_lower = (N - 1) * (N**2 - 2 * N + 6) / 6
    W = sp.symbols("W", integer=True, nonnegative=True)
    p0_from_W = sp.binomial(N + 1, 3) - N * (N - 1) + W + N * (N - 1) / 2
    assert sp.simplify(p0_from_W.subs(W, N - 1) - p0_lower) == 0
    assert sp.simplify(
        p0_from_W.subs(W, N * (N - 1) / 2) - p0_upper
    ) == 0

    # For A=P*c-aR, c0>=a and R1=N^2-2W give
    # A1>=a[p0+2p1-R1]=a[p0+N+2+2W]>=a(p0_lower+N+2).
    anchor1 = sp.factor(p0_lower + N + 2)
    anchor2 = N**2 + 3 * N + 8
    anchor3 = 3 * N + 10
    r, k = sp.symbols("r k", integer=True, nonnegative=True)
    R2 = j / (r + 1)
    R3 = j * (j - 1) / ((r + 1) * (r + 2))
    E3 = sp.expand(
        anchor1 * (3 * R2 + 3 * R3)
        + anchor2 * (3 + 6 * R2 + 3 * R3)
        + anchor3 * (4 + 3 * R2 + R3)
    )
    retained = {
        (1, 2): 3,
        (1, 3): 3,
        (2, 1): 3,
        (2, 2): 6,
        (2, 3): 3,
        (3, 0): 1,
        (3, 1): 3,
        (3, 2): 3,
        (3, 3): 1,
    }
    assert all(kernel(left, right, 3) == weight for (left, right), weight in retained.items())

    # It is enough that 2(j+1)C(N-1,2)E3>=Q3.  For j>=4 set j=4+k,
    # N=j+r.  N>=14 is k+r>=10.  Cover with r>=11 and r=0,...,10.
    gap = sp.factor(2 * (j + 1) * pair_floor * E3 - q3_bound)
    numerator, denominator = sp.together(gap.subs(N, j + r)).as_numer_denom()
    denominator = sp.factor(denominator)
    assert sp.expand(denominator - 2 * (r + 1) * (r + 2)) == 0

    q_high = sp.Symbol("q_high", integer=True, nonnegative=True)
    high = sp.Poly(
        sp.expand(numerator.subs({j: 4 + k, r: 11 + q_high})),
        k,
        q_high,
    )
    assert all(value > 0 for value in high.coeffs())

    q_strip = sp.Symbol("q_strip", integer=True, nonnegative=True)
    strips = []
    for residual in range(11):
        minimum_k = max(0, 10 - residual)
        strip = sp.Poly(
            sp.expand(numerator.subs({
                r: residual,
                j: 4 + minimum_k + q_strip,
            })),
            q_strip,
        )
        assert all(value > 0 for value in strip.coeffs())
        strips.append({
            "r": residual,
            "minimum_k": minimum_k,
            "degree": strip.degree(),
            "term_count": len(strip.terms()),
            "minimum_coefficient": str(min(strip.coeffs())),
        })

    # Record, but do not promote, the exact failure of this coarse sufficient
    # inequality at the excluded target j=3.
    j3_numerator = sp.Poly(sp.expand(numerator.subs(j, 3)), r)
    j3_negative_coefficients = [
        str(value) for value in j3_numerator.coeffs() if value < 0
    ]
    assert j3_negative_coefficients

    report = {
        "schema": "terminal-q3-low-newton-m3-j4plus-exact-agent-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_TREE_BASE_N15_PLUS_TERMINAL_Q3_LOW_NEWTON_M3_J4_PLUS",
        "claim": (
            "For every tree base G of order n>=15, every marked vertex, and "
            "every supported target j>=4, the binom(t-1,3) coefficient of "
            "the normalized untruncated terminal included-payment margin is "
            "nonnegative. Target j=3 is not claimed."
        ),
        "tree_p0_bounds": {
            "lower": str(sp.factor(p0_lower)),
            "upper": str(sp.factor(p0_upper)),
            "anchor_A1_over_a_lower": str(anchor1),
        },
        "remainder": {
            "PQ3_lower": "-(b/2)Q3",
            "Q3": str(q3_bound),
        },
        "retained_kernels": [
            {"A_degree": pair[0], "U_degree": pair[1], "weight": weight}
            for pair, weight in retained.items()
        ],
        "integer_cone_certificate": {
            "domain": "j=4+k, N=j+r, k+r>=10",
            "denominator": str(sp.factor(denominator)),
            "high_cone_terms": len(high.terms()),
            "high_cone_minimum_coefficient": str(min(high.coeffs())),
            "strips": strips,
        },
        "excluded_j3_diagnostic": {
            "coarse_sufficient_inequality_fails": True,
            "negative_coefficients": j3_negative_coefficients,
        },
        "pins": observed,
        "scope": (
            "This proves only Newton degree m=3 for supported j>=4 at tree "
            "base orders n>=15. It does not prove target j=3, m=0..2, "
            "forest-base closure, the whole terminal payment, unimodality, "
            "or Erdos Problem 993."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report["integer_cone_certificate"], indent=2))
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
