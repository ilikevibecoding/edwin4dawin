#!/usr/bin/env python3
"""Independent exact audit of the all-order m=5 terminal argument."""

from __future__ import annotations

import hashlib
import json
from math import factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_m5_independent_audit_20260829.json"
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


def basis(s: sp.Symbol, degree: int) -> sp.Expr:
    return sp.prod(s - offset for offset in range(degree)) / factorial(degree)


def newton_coefficient(expression: sp.Expr, s: sp.Symbol, degree: int) -> sp.Expr:
    values = [sp.expand(expression.subs(s, value)) for value in range(degree + 1)]
    for _ in range(degree):
        values = [sp.expand(right - left) for left, right in zip(values, values[1:])]
    return sp.factor(values[0])


def overlap(left: int, right: int, union: int) -> int:
    if not max(left, right) <= union <= left + right:
        return 0
    return factorial(union) // (
        factorial(union - left)
        * factorial(union - right)
        * factorial(left + right - union)
    )


def main() -> None:
    observed_pins = {name: sha256(HERE / name) for name in PINS}
    assert observed_pins == PINS

    s = sp.symbols("s", integer=True, nonnegative=True)
    a, b, c0, e0, j = sp.symbols("a b c0 e0 j", positive=True)
    p0, p1, p2 = sp.symbols("p0 p1 p2", nonnegative=True)
    r0, r1, r2 = sp.symbols("r0 r1 r2", nonnegative=True)
    P = p0 + p1 * basis(s, 1) + p2 * basis(s, 2) + basis(s, 3)
    R = r0 + r1 * basis(s, 1) + r2 * basis(s, 2)
    c = c0 + a * basis(s, 1)
    e = e0 + b * basis(s, 1)
    A = sp.expand(P * c - a * R)
    Q = sp.expand((j + 1) * b * (c + R) - 3 * (P + a) * e)
    L = sp.expand(a * P * Q)
    l5 = newton_coefficient(L, s, 5)

    # Tree G has N+1 vertices and N edges.
    N = sp.symbols("N", integer=True, positive=True)
    tree_values = {
        p1: (N**2 + N + 2) / 2,
        p2: N + 2,
        r2: N,
    }
    l5_tree = sp.factor(l5.subs(tree_values))
    # Drop the sole positive contribution 10(j+1)bN and use e0<=(j+2)b.
    positive_q2_piece = 10 * (j + 1) * b * N
    lower_l5 = sp.factor(
        (l5_tree - a * positive_q2_piece).subs(e0, (j + 2) * b)
    )
    P5 = 5 * N**2 + 2 * N * j + 40 * N + 7 * j + 95
    assert sp.expand(lower_l5 + 30 * a * b * P5) == 0

    # Reconstruct the A2,A3,A4 lower bounds from c0>=a.
    a2 = newton_coefficient(A, s, 2).subs(tree_values)
    a3 = newton_coefficient(A, s, 3).subs(tree_values)
    a4 = newton_coefficient(A, s, 4).subs(tree_values)
    a2_lower = a * (N**2 + 3 * N + 8)
    a3_lower = a * (3 * N + 10)
    # Differences use c0-a>=0 and the exact nonnegative omitted terms.
    assert sp.expand(a2 - a2_lower - (N + 2) * (c0 - a)) == 0
    assert sp.expand(a3 - a3_lower - (c0 - a)) == 0
    assert sp.expand(a4 - 4 * a) == 0

    expected_kernels = {
        (2, 3): 10,
        (2, 4): 20,
        (3, 2): 10,
        (3, 3): 30,
        (3, 4): 30,
        (4, 1): 5,
        (4, 2): 20,
        (4, 3): 30,
        (4, 4): 20,
    }
    assert {
        pair: overlap(pair[0], pair[1], 5) for pair in expected_kernels
    } == expected_kernels

    k, r = sp.symbols("k r", integer=True, nonnegative=True)
    symbolic_j = k + 3
    symbolic_N = symbolic_j + r
    R2 = symbolic_j / (r + 1)
    R3 = symbolic_j * (symbolic_j - 1) / ((r + 1) * (r + 2))
    R4 = (
        symbolic_j * (symbolic_j - 1) * (symbolic_j - 2)
        / ((r + 1) * (r + 2) * (r + 3))
    )
    A2bar = symbolic_N**2 + 3 * symbolic_N + 8
    A3bar = 3 * symbolic_N + 10
    E = (
        A2bar * (10 * R3 + 20 * R4)
        + A3bar * (10 * R2 + 30 * R3 + 30 * R4)
        + 4 * (5 + 20 * R2 + 30 * R3 + 20 * R4)
    )
    symbolic_P5 = P5.subs({N: symbolic_N, j: symbolic_j})
    gap = sp.cancel(
        (symbolic_j + 1)
        * ((symbolic_N - 1) * (symbolic_N - 2) / 2)
        * E
        - 30 * symbolic_P5
    )
    numerator, denominator = sp.fraction(gap)
    numerator = sp.expand(numerator)
    denominator = sp.factor(denominator)
    gap_poly = sp.Poly(numerator, k, r)
    assert denominator == (r + 1) * (r + 2) * (r + 3)
    assert len(gap_poly.terms()) == 39
    assert min(gap_poly.coeffs()) == 5
    k0_factor = sp.factor(numerator.subs(k, 0))
    assert sp.expand(
        k0_factor
        - 10 * (r + 1) * (r + 2)
        * (19 * r**3 + 279 * r**2 + 1493 * r + 3129)
    ) == 0

    report = {
        "schema": "terminal-q3-low-newton-m5-independent-audit-v2",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M5_AUDIT",
        "claim": (
            "The all-order m=5 argument is algebraically and combinatorially "
            "valid.  Its q_j(F)<=1 input is the unconditional forest-incidence "
            "theorem pinned below."
        ),
        "unconditional_q_bound": (
            "The pinned m6 theorem independently proves 2z_j<=D_j<=2U_j<=2j f_j, "
            "hence q_j(F)<=1 and e0<=(j+2)b for every forest."
        ),
        "low_remainder": {
            "exact_tree_L5": str(l5_tree),
            "dropped_positive_piece_before_outer_a": str(positive_q2_piece),
            "e0_bound": "e0<=z_j+h_j+b<=(j+2)b",
            "lower_bound": "L5>=-30ab P5",
            "P5": str(P5),
        },
        "anchor_lower_bounds": {
            "A2": "A2>=a(N^2+3N+8)",
            "A3": "A3>=a(3N+10)",
            "A4": "A4=4a",
            "retained_product_kernels": [
                {"A_degree": pair[0], "U_degree": pair[1], "weight": weight}
                for pair, weight in expected_kernels.items()
            ],
        },
        "shadow_certificate": {
            "ratios": {
                "U1_over_b": ">=1",
                "U2_over_b": ">=j/(N-j+1)",
                "U3_over_b": ">=C(j,2)/C(N-j+2,2)",
                "U4_over_b": ">=C(j,3)/C(N-j+3,3)",
            },
            "forest_pair_floor": "a>=C(N-1,2)",
            "sufficient_inequality": "(j+1)aE>=30P5",
            "cleared_denominator": str(denominator),
            "positive_numerator_terms": len(gap_poly.terms()),
            "minimum_numerator_coefficient": str(min(gap_poly.coeffs())),
            "k_zero_factor": str(k0_factor),
        },
        "pins": observed_pins,
        "scope": (
            "All-order m=5 audit only; this does not close m=0,...,4, the whole "
            "terminal payment, unimodality, or Erdos Problem 993."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"gap_terms={len(gap_poly.terms())} min_coeff={min(gap_poly.coeffs())}")
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
