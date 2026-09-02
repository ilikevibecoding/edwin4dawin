#!/usr/bin/env python3
"""Independent exact audit of the Newton m=4 proof for |F|>=14."""

from __future__ import annotations

import hashlib
import json
from math import factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_m4_all_order_independent_audit_20260829.json"
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
    "verify_terminal_q3_included_payment_finite_all_t_independent_agent.py": (
        "424ED1CA33674337342AD06049D6BF99FC3AC8ABBBE82841226C7C63A33099FE"
    ),
    "terminal_q3_included_payment_finite_all_t_independent_20260828.json": (
        "42DD09511EE4774A832AF6F561F5EA270271F9732476D8096907B49AA8481044"
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
    finite = json.loads(
        (HERE / "terminal_q3_included_payment_finite_all_t_independent_20260828.json")
        .read_text(encoding="utf-8")
    )
    assert finite["status"] == "PASS_EXACT_FINITE_N14_ALL_REAL_T_TERMINAL_Q3_INCLUDED_PAYMENT_COEFFICIENTS_NOT_ALL_ORDER"
    assert finite["exact_counts"]["orders"] == [1, 14]
    assert finite["exact_counts"]["zero_payment_coefficients"] == 0

    # Recheck that a nonnegative ordinary-power certificate implies every
    # Newton coefficient is nonnegative.
    stirling_checks = 0
    s_check = sp.symbols("s_check")
    for power in range(20):
        reconstruction = sum(
            factorial(degree)
            * sp.functions.combinatorial.numbers.stirling(power, degree, kind=2)
            * basis(s_check, degree)
            for degree in range(power + 1)
        )
        assert sp.expand(reconstruction - s_check**power) == 0
        stirling_checks += 1

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
    l4 = newton_coefficient(L, s, 4)

    N = sp.symbols("N", integer=True, positive=True)
    tree_values = {
        p1: (N**2 + N + 2) / 2,
        p2: N + 2,
        r2: N,
    }
    # Lower each Q1,...,Q4 by deleting its positive (j+1)b(c+R) part.
    q_lower = {
        1: -3 * (e0 * p1 + b * (p1 + p0 + a)),
        2: -3 * (e0 * p2 + 2 * b * (p2 + p1)),
        3: -3 * (e0 + 3 * b * (p2 + 1)),
        4: -12 * b,
    }
    l4_lower_inside = 0
    for left in range(4):
        p_left = [p0, p1, p2, sp.Integer(1)][left]
        for right in range(1, 5):
            weight = overlap(left, right, 4)
            if weight:
                l4_lower_inside += weight * p_left * q_lower[right]

    p0_upper = N * (N + 1) * (N + 2) / 6
    a_upper = N * (N - 1) / 2
    substitutions = {
        **tree_values,
        p0: p0_upper,
        a: a_upper,
        e0: (j + 2) * b,
    }
    explicit_lower_inside = sp.factor(l4_lower_inside.subs(substitutions))
    Q4bound = (
        20 * N**3
        + 15 * N**2 * j
        + 207 * N**2
        + 78 * N * j
        + 739 * N
        + 138 * j
        + 1158
    )
    assert sp.expand(explicit_lower_inside + 2 * b * Q4bound) == 0

    # The exact L4 minus the constructed lower expression consists only of
    # the deleted positive Q terms before the monotone upper substitutions.
    # Symbolically verify the exact product-kernel reconstruction itself.
    exact_kernel_l4 = 0
    q_exact = [newton_coefficient(Q, s, degree) for degree in range(5)]
    for left in range(4):
        p_left = [p0, p1, p2, sp.Integer(1)][left]
        for right in range(5):
            exact_kernel_l4 += overlap(left, right, 4) * p_left * q_exact[right]
    assert sp.expand(l4 - a * exact_kernel_l4) == 0

    a2 = newton_coefficient(A, s, 2).subs(tree_values)
    a3 = newton_coefficient(A, s, 3).subs(tree_values)
    a4 = newton_coefficient(A, s, 4).subs(tree_values)
    assert sp.expand(a2 - a * (N**2 + 3 * N + 8) - (N + 2) * (c0 - a)) == 0
    assert sp.expand(a3 - a * (3 * N + 10) - (c0 - a)) == 0
    assert sp.expand(a4 - 4 * a) == 0

    retained_kernels = {
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
    assert {
        pair: overlap(pair[0], pair[1], 4) for pair in retained_kernels
    } == retained_kernels

    k, r, q = sp.symbols("k r q", integer=True, nonnegative=True)
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
    E4 = (
        A2bar * (6 * R2 + 12 * R3 + 6 * R4)
        + A3bar * (4 + 12 * R2 + 12 * R3 + 4 * R4)
        + 4 * (1 + 4 + 6 * R2 + 4 * R3 + R4)
    )
    symbolic_Q4 = Q4bound.subs({N: symbolic_N, j: symbolic_j})
    gap = sp.cancel(
        (symbolic_j + 1)
        * ((symbolic_N - 1) * (symbolic_N - 2) / 2)
        * E4
        - 2 * symbolic_Q4
    )
    numerator, denominator = sp.fraction(gap)
    numerator = sp.expand(numerator)
    denominator = sp.factor(denominator)
    assert denominator == (r + 1) * (r + 2) * (r + 3)

    large_r = sp.Poly(sp.expand(numerator.subs(r, 11 + q)), k, q)
    assert min(large_r.coeffs()) > 0
    boundary_rows = []
    for r_value in range(11):
        boundary = sp.Poly(
            sp.expand(numerator.subs({r: r_value, k: 11 - r_value + q})),
            q,
        )
        assert min(boundary.coeffs()) > 0
        boundary_rows.append({
            "r": r_value,
            "substitution": f"k={11-r_value}+q",
            "terms": len(boundary.terms()),
            "minimum_coefficient": str(min(boundary.coeffs())),
            "constant": str(boundary.eval(0)),
        })

    report = {
        "schema": "terminal-q3-low-newton-m4-all-order-independent-audit-v2",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M4_AUDIT",
        "claim": (
            "Every supported terminal cell has nonnegative Newton coefficient "
            "m=4. The symbolic proof covers N=|F|>=14 (equivalently |G|>=15); "
            "the pinned all-real-t coefficient certificate covers |G|<=14."
        ),
        "finite_base": {
            "base_orders_G": [1, 14],
            "ordinary_coefficient_checks": finite["exact_counts"]["payment_coefficient_checks"],
            "zero_ordinary_coefficients": finite["exact_counts"]["zero_payment_coefficients"],
            "ordinary_to_newton_stirling_identities_replayed": stirling_checks,
            "logic": (
                "s^k=sum_m m! S(k,m) binom(s,m) with nonnegative Stirling "
                "coefficients, so the pinned nonnegative ordinary-power rows "
                "have nonnegative Newton rows, including m=4."
            ),
        },
        "unconditional_input": (
            "The pinned m6 theorem proves q_j(F)<=1 for every forest, hence "
            "e0<=(j+2)b without an induction hypothesis."
        ),
        "low_remainder": {
            "method": (
                "Reconstruct [P*Q]_4 with all Newton kernels; drop only the "
                "nonnegative parts of Q1..Q4, then use e0<=(j+2)b, "
                "p0<=C(N+2,3), and a<=C(N,2)."
            ),
            "bound": "L4>=-2ab Q4",
            "Q4": str(Q4bound),
        },
        "positive_part": {
            "A_bounds": [
                "A2>=a(N^2+3N+8)",
                "A3>=a(3N+10)",
                "A4=4a",
            ],
            "retained_kernels": [
                {"A_degree": pair[0], "U_degree": pair[1], "weight": weight}
                for pair, weight in retained_kernels.items()
            ],
            "shadows": (
                "U0,U1>=b; Uq>=f_(j+1-q)>=C(j,q-1)b/C(N-j+q-1,q-1), q=2,3,4"
            ),
            "forest_pair_floor": "a>=C(N-1,2)",
            "sufficient_gap": "(j+1)aE4>=2Q4",
        },
        "domain_partition": {
            "parameterization": "j=3+k, N=j+r",
            "denominator": str(denominator),
            "r_at_least_11": {
                "substitution": "r=11+q",
                "terms": len(large_r.terms()),
                "minimum_coefficient": str(min(large_r.coeffs())),
            },
            "r_zero_through_10": boundary_rows,
            "coverage": (
                "If r>=11, N>=14 automatically. If 0<=r<=10, N>=14 is "
                "equivalent to k>=11-r, so k=11-r+q covers the remaining domain."
            ),
        },
        "pins": observed_pins,
        "scope": (
            "This closes m=4 only. Newton degrees m=0,...,3, the whole terminal "
            "payment assembly, unimodality, and Erdos Problem 993 remain separate."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"large_r_terms={len(large_r.terms())} min={min(large_r.coeffs())}")
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
