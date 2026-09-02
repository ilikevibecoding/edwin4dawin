#!/usr/bin/env python3
"""Exact all-order proof of terminal-payment Newton coefficient m=4.

The theorem is scoped to a tree base G of order n>=15, with F=G-w,
N=|F|=n-1, and every supported target j>=3.  It proves only the fourth
Newton coefficient of the normalized included-payment margin.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_m4_exact_agent_20260829.json"
PINS = {
    "verify_terminal_q3_payment_newton_tail_independent_agent.py": (
        "FDC4736A2B5729954C585A37800915C818A24667D55E6DDB2F76B122FD334BA6"
    ),
    "terminal_q3_payment_newton_tail_independent_20260828.json": (
        "EFA58A539FAA2627D3BC1ECC9E5925D6BB6587F555540F01574608F7C38EA212"
    ),
    "terminal_q3_anchor_ordering_independent_audit_20260828.json": (
        "E3011F623E97E289D6C21D20B2577ECB38AE3019C3A42481A28807F47AAA396C"
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
    tail = json.loads(
        (HERE / "terminal_q3_payment_newton_tail_independent_20260828.json")
        .read_text(encoding="utf-8")
    )
    assert tail["status"] == "PASS_EXACT_ALL_ORDER_TERMINAL_PAYMENT_NEWTON_TAIL_M8_PLUS_REDUCTION"
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

    # Q=(j+1)b(c+R)-3(P+a)e has Newton degree four.  For a lower
    # bound, discard its nonnegative first summands at degrees one and two.
    q1_lower = -3 * (e0 * p1 + b * (p0 + a + p1))
    q2_lower = -3 * e0 * p2 - 6 * b * (p1 + p2)
    q3 = -3 * (e0 + 3 * b * (p2 + 1))
    q4 = -12 * b

    p = [p0, p1, p2, p3]
    q_lower = [sp.Integer(0), q1_lower, q2_lower, q3, q4]
    pq4_lower = sp.expand(
        sum(
            kernel(left, right, 4) * p[left] * q_lower[right]
            for left in range(4)
            for right in range(5)
        )
    )
    expected_raw = -6 * (
        6 * N**3 * b
        + 56 * N**2 * b
        + 5 * N**2 * e0
        + 194 * N * b
        + 26 * N * e0
        + 2 * a * b
        + 4 * b * p0
        + 294 * b
        + 46 * e0
    )
    assert sp.expand(pq4_lower - expected_raw) == 0

    # The unconditional incidence theorem gives e0<=z_j+h_j+b<=(j+2)b.
    # The remaining elementary upper bounds are a<=C(N,2) and
    # p0<=C(N+2,3), the latter simply counting all triples in G union K1.
    q_bound = (
        20 * N**3
        + 15 * N**2 * j
        + 207 * N**2
        + 78 * N * j
        + 739 * N
        + 138 * j
        + 1158
    )
    substituted = sp.factor(
        pq4_lower.subs(
            {
                e0: (j + 2) * b,
                a: N * (N - 1) / 2,
                p0: N * (N + 1) * (N + 2) / 6,
            }
        )
    )
    assert sp.expand(substituted + 2 * b * q_bound) == 0

    # Quantitative anchor coefficients obtained directly from
    # A=P*c-aR, using c0>=a and R2=N.
    anchor2 = N**2 + 3 * N + 8
    anchor3 = 3 * N + 10
    anchor4 = sp.Integer(4)
    retained = {
        (2, 2): 6,
        (2, 3): 12,
        (2, 4): 6,
        (3, 1): 4,
        (3, 2): 12,
        (3, 3): 12,
        (3, 4): 4,
        (4, 0): 1,
        (4, 1): 4,
        (4, 2): 6,
        (4, 3): 4,
        (4, 4): 1,
    }
    assert all(kernel(left, right, 4) == weight for (left, right), weight in retained.items())

    r, k = sp.symbols("r k", integer=True, nonnegative=True)
    R2 = j / (r + 1)
    R3 = j * (j - 1) / ((r + 1) * (r + 2))
    R4 = j * (j - 1) * (j - 2) / (
        (r + 1) * (r + 2) * (r + 3)
    )
    # U0/b,U1/b>=1 and Uq/b>=f_(j+1-q)/f_j for q=2,3,4.
    E4 = sp.expand(
        anchor2 * (6 * R2 + 12 * R3 + 6 * R4)
        + anchor3 * (4 + 12 * R2 + 12 * R3 + 4 * R4)
        + anchor4 * (5 + 6 * R2 + 4 * R3 + R4)
    )
    pair_floor = (N - 1) * (N - 2) / 2
    sufficient = sp.factor((j + 1) * pair_floor * E4 - 2 * q_bound)

    # Put N=j+r and j=3+k.  The n>=15 hypothesis is N>=14, i.e.
    # k+r>=11.  Cover this integer cone by r>=11 and the eleven vertical
    # strips r=0,...,10.
    numerator, denominator = sp.together(
        sufficient.subs(N, j + r)
    ).as_numer_denom()
    assert sp.factor(denominator) == (r + 1) * (r + 2) * (r + 3)
    q_high = sp.Symbol("q_high", integer=True, nonnegative=True)
    high_r_shift = sp.Poly(
        sp.expand(numerator.subs({j: 3 + k, r: 11 + q_high})),
        k,
        q_high,
    )
    assert all(value > 0 for value in high_r_shift.coeffs())

    strip_records = []
    qvar = sp.Symbol("q", integer=True, nonnegative=True)
    for residual in range(11):
        strip = sp.Poly(
            sp.expand(
                numerator.subs(
                    {r: residual, j: 3 + (11 - residual) + qvar}
                )
            ),
            qvar,
        )
        assert all(value > 0 for value in strip.coeffs())
        strip_records.append({
            "r": residual,
            "j_shift": 3 + 11 - residual,
            "degree": strip.degree(),
            "minimum_coefficient": str(min(strip.coeffs())),
        })

    report = {
        "schema": "terminal-q3-low-newton-m4-exact-agent-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_TREE_BASE_N15_PLUS_TERMINAL_Q3_LOW_NEWTON_M4",
        "claim": (
            "For every tree base G of order n>=15, every marked vertex, and "
            "every supported target j>=3, the binom(t-1,4) coefficient of "
            "the normalized untruncated terminal included-payment margin is "
            "nonnegative."
        ),
        "exact_remainder_bound": {
            "PQ4_lower": str(sp.factor(pq4_lower)),
            "L4_lower": "L4 >= -2*a*b*Q4",
            "Q4": str(q_bound),
        },
        "anchor_bounds": {
            "A2": "A2>=a(N^2+3N+8)",
            "A3": "A3>=a(3N+10)",
            "A4": "A4=4a",
        },
        "retained_kernels": [
            {"A_degree": key[0], "U_degree": key[1], "weight": value}
            for key, value in retained.items()
        ],
        "integer_cone_certificate": {
            "parameters": "j=3+k, N=j+r, N>=14 iff k+r>=11",
            "denominator": str(sp.factor(denominator)),
            "r_11_plus_term_count": len(high_r_shift.terms()),
            "r_11_plus_minimum_coefficient": str(min(high_r_shift.coeffs())),
            "finite_r_strips": strip_records,
        },
        "pins": observed,
        "scope": (
            "This proves only Newton degree m=4 for tree bases of order at "
            "least 15.  It does not prove m=0..3, forest-base closure, the "
            "full terminal payment, unimodality, or Erdos Problem 993."
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
