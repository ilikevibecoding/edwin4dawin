#!/usr/bin/env python3
"""Exact standalone proof/replay for terminal-payment Newton degree m=7.

This closes only the seventh low Newton coefficient inside the pinned
terminal-payment framework.  It does not assert any of the other low
coefficients or the full Erdos 993 conjecture.
"""

from __future__ import annotations

import hashlib
import json
from math import factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_m7_exact_independent_20260829.json"
PINS = {
    "verify_terminal_q3_payment_newton_tail_independent_agent.py": (
        "FDC4736A2B5729954C585A37800915C818A24667D55E6DDB2F76B122FD334BA6"
    ),
    "terminal_q3_payment_newton_tail_independent_20260828.json": (
        "EFA58A539FAA2627D3BC1ECC9E5925D6BB6587F555540F01574608F7C38EA212"
    ),
    "audit_terminal_q3_anchor_ordering_independent_agent.py": (
        "C76F68266C3CE74B37096B37BBEF93C5F0AC5ED3005B70724DC15EB6C2FD531C"
    ),
    "terminal_q3_anchor_ordering_independent_audit_20260828.json": (
        "E3011F623E97E289D6C21D20B2577ECB38AE3019C3A42481A28807F47AAA396C"
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def newton_basis(s: sp.Symbol, degree: int) -> sp.Expr:
    return sp.prod(s - offset for offset in range(degree)) / factorial(degree)


def newton_coefficient(expression: sp.Expr, s: sp.Symbol, degree: int) -> sp.Expr:
    values = [sp.expand(expression.subs(s, point)) for point in range(degree + 1)]
    for _ in range(degree):
        values = [sp.expand(right - left) for left, right in zip(values, values[1:])]
    return sp.factor(values[0])


def overlap_coefficient(left: int, right: int, union: int) -> int:
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
    tail = json.loads(
        (HERE / "terminal_q3_payment_newton_tail_independent_20260828.json")
        .read_text(encoding="utf-8")
    )
    anchor = json.loads(
        (HERE / "terminal_q3_anchor_ordering_independent_audit_20260828.json")
        .read_text(encoding="utf-8")
    )
    assert tail["status"] == "PASS_EXACT_ALL_ORDER_TERMINAL_PAYMENT_NEWTON_TAIL_M8_PLUS_REDUCTION"
    assert anchor["status"] == "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_ANCHOR_ORDERING_AUDIT"

    s = sp.symbols("s", integer=True, nonnegative=True)
    a, b, c0, e0, j = sp.symbols("a b c0 e0 j", positive=True)
    p0, p1, p2 = sp.symbols("p0 p1 p2", nonnegative=True)
    r0, r1, r2 = sp.symbols("r0 r1 r2", nonnegative=True)
    P = p0 + p1 * newton_basis(s, 1) + p2 * newton_basis(s, 2) + newton_basis(s, 3)
    R = r0 + r1 * newton_basis(s, 1) + r2 * newton_basis(s, 2)
    c = c0 + a * newton_basis(s, 1)
    e = e0 + b * newton_basis(s, 1)
    A = sp.expand(P * c - a * R)
    Q = sp.expand((j + 1) * b * (c + R) - 3 * (P + a) * e)
    L = sp.expand(a * P * Q)

    q4 = newton_coefficient(Q, s, 4)
    a4 = newton_coefficient(A, s, 4)
    l7 = newton_coefficient(L, s, 7)
    assert q4 == -12 * b
    assert a4 == 4 * a
    assert l7 == -420 * a * b
    assert overlap_coefficient(3, 4, 7) == 35
    assert overlap_coefficient(4, 3, 7) == 35

    # Rebuild the entire coefficient of A*U abstractly.  Every structure
    # constant must be nonnegative, and the retained A4*U3 term has weight 35.
    abstract_a = sp.symbols("A0:5", nonnegative=True)
    abstract_u = sp.symbols("U0:8", nonnegative=True)
    product_terms = []
    au7 = 0
    for left in range(5):
        for right in range(8):
            weight = overlap_coefficient(left, right, 7)
            if weight:
                product_terms.append({"A_degree": left, "U_degree": right, "weight": weight})
                au7 += weight * abstract_a[left] * abstract_u[right]
    assert all(term["weight"] > 0 for term in product_terms)
    retained = 35 * abstract_a[4] * abstract_u[3]
    residual = sp.Poly(sp.expand(au7 - retained), *abstract_a, *abstract_u)
    assert all(coefficient >= 0 for coefficient in residual.coeffs())

    # Check the simple order inequality used in the containment argument.
    k, r = sp.symbols("k r", integer=True, nonnegative=True)
    symbolic_j = 3 + k
    symbolic_n = symbolic_j + r
    choose_difference_twice = sp.expand(
        (symbolic_n - 1) * (symbolic_n - 2)
        - (symbolic_n - symbolic_j + 2) * (symbolic_n - symbolic_j + 1)
    )
    choose_poly = sp.Poly(choose_difference_twice, k, r)
    assert all(coefficient >= 0 for coefficient in choose_poly.coeffs())
    assert sp.expand(choose_difference_twice.subs(k, 0)) == 0

    report = {
        "schema": "terminal-q3-low-newton-m7-exact-independent-v1",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M7",
        "claim": (
            "For every supported terminal-payment cell j>=3, the Newton "
            "coefficient [binom(s,7)]delta is nonnegative, conditional only "
            "on the pinned coefficientwise terminal anchor theorem already "
            "used by the m>=8 reduction."
        ),
        "exact_algebra": {
            "split": "delta=(j+1)a*A*U+L, A=P*c-aR, L=a*P*Q",
            "Q": "Q=(j+1)b(c+R)-3(P+a)e",
            "P3": "1",
            "Q4": str(q4),
            "A4": str(a4),
            "overlap_kappa_3_4_7": overlap_coefficient(3, 4, 7),
            "overlap_kappa_4_3_7": overlap_coefficient(4, 3, 7),
            "L7": str(l7),
            "retained_positive_term": "[A*U]_7 >= 35*A4*U3 = 140*a*U3",
            "abstract_AU7_terms": product_terms,
        },
        "containment_certificate": {
            "notation": "N=|F|, a=f2(F), b=fj(F), U3=i_(j-2)(G)+i_(j-3)(G)",
            "forest_pair_floor": "a>=C(N-1,2)",
            "two_level_containment": "C(N-j+2,2) f_(j-2) >= C(j,2)b",
            "order_comparison": "C(N-1,2)>=C(N-j+2,2) for N>=j>=3",
            "conclusion": "a*U3>=a*f_(j-2)>=C(j,2)b>=3b",
            "cleared_order_difference": str(choose_difference_twice),
        },
        "final_margin": (
            "delta_7 >= 140(j+1)a^2 U3-420ab "
            ">=420j*a*b>=0"
        ),
        "edge_cases": {
            "unsupported_b_zero": "If b=fj=0 there is no target cell; the inequality is vacuous.",
            "a_zero": (
                "A supported j>=3 cell has a j-vertex independent set, hence "
                "a=f2>=C(j,2)>0; division by a is unnecessary in the proof."
            ),
            "small_order": "Support forces N>=j>=3, so all binomial denominators are defined.",
        },
        "pins": observed_pins,
        "scope": (
            "This closes only Newton degree m=7 in the terminal included-payment "
            "margin. Degrees m=0,...,6, the global q3 envelope, unimodality, and "
            "Erdos Problem 993 remain separate obligations."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"Q4={q4} A4={a4} L7={l7}")
    print(f"AU7_terms={len(product_terms)}")
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
