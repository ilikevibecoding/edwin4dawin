#!/usr/bin/env python3
"""Exact proof of terminal-payment Newton m=3 at the extremal target j=3.

Tree-base order n=15 is covered by a complete independent finite census.
Orders n>=16 are covered symbolically using the all-forest q3<=q2 theorem
and the rooted-forest rank-three reserve.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_m3_j3_exact_agent_20260829.json"
PINS = {
    "verify_terminal_q3_payment_newton_tail_independent_agent.py": (
        "FDC4736A2B5729954C585A37800915C818A24667D55E6DDB2F76B122FD334BA6"
    ),
    "audit_all_forest_q3_q2_component_lift_independent_agent.py": (
        "63C2FFE7432FE54BF197B2F6F89DFF737B280D7B2571D6B30692FF09227E9815"
    ),
    "all_forest_q3_q2_component_lift_independent_audit_20260829.json": (
        "7465DCB4C62ACF76614003D42285B72CD559A27AB6F449804F3CC881B405695D"
    ),
    "verify_rooted_forest_q3_reserve_rank3_independent_agent.py": (
        "C2847EFDF940BA0FB2124147EBBD9F8C506FAE50FE2C93AC026070892C2319BB"
    ),
    "rooted_forest_q3_reserve_rank3_exact_independent_20260828.json": (
        "67544893404E231AAD9F8E4912D1075189412EF9AB75B1A7527485FA39D242DF"
    ),
    "verify_terminal_q3_low_newton_m3_j3_n15_independent_agent.py": (
        "D3023B7F5FCE1384C9F6F6E84131A440E1F980D2575A677DCE304F1E10C26B86"
    ),
    "terminal_q3_low_newton_m3_j3_n15_independent_20260829.json": (
        "4533A69D8B1C88048D03EAC8A0DCC0579E699097693FF48A0D1564BD5B87229C"
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
    forest = json.loads(
        (HERE / "all_forest_q3_q2_component_lift_independent_audit_20260829.json")
        .read_text(encoding="utf-8")
    )
    assert forest["status"] == (
        "PASS_INDEPENDENT_EXACT_ALL_FOREST_Q3_AT_MOST_Q2_COMPONENT_LIFT_AUDIT"
    )
    reserve = json.loads(
        (HERE / "rooted_forest_q3_reserve_rank3_exact_independent_20260828.json")
        .read_text(encoding="utf-8")
    )
    assert reserve["status"] == "PASS_EXACT_ALL_ORDER_ROOTED_FOREST_Q3_RESERVE_RANK3"
    finite = json.loads(
        (HERE / "terminal_q3_low_newton_m3_j3_n15_independent_20260829.json")
        .read_text(encoding="utf-8")
    )
    assert finite["status"] == (
        "PASS_INDEPENDENT_EXACT_COMPLETE_N15_TERMINAL_Q3_LOW_NEWTON_M3_J3"
    )
    assert finite["coverage"] == {
        "unlabeled_trees": 7741,
        "marked_vertices": 116115,
        "supported_cells": 116115,
        "coefficient_checks": 116115,
    }

    # Correlate the two exact forest inputs without division.  All-forest
    # q3<=q2 gives 2a*z3<=3b*z2.  The rooted rank-three reserve gives
    # 6a*h3<=b(8h2+2a-z2).  Adding three copies of the former to the latter
    # proves 6a*e0<=8b(a+z2+h2), where e0=b+z3+h3.
    a, b, z2, z3, h2, h3 = sp.symbols(
        "a b z2 z3 h2 h3", positive=True
    )
    forest_rhs = 3 * b * z2
    reserve_rhs = b * (8 * h2 + 2 * a - z2)
    combined_rhs = sp.expand(3 * forest_rhs + reserve_rhs + 6 * a * b)
    assert sp.expand(combined_rhs - 8 * b * (a + z2 + h2)) == 0

    # Put x=(z2+h2)/a.  The preceding inequality is
    # e0/b<=4(1+x)/3.
    N, x, e0, p0 = sp.symbols(
        "N x e0 p0", integer=True, nonnegative=True
    )
    p1 = (N**2 + N + 2) / 2
    p2 = N + 2
    p = [p0, p1, p2, sp.Integer(1)]
    c0 = a * (1 + x)
    e_upper = sp.Rational(4, 3) * b * (1 + x)

    # Lower Q0,...,Q3 at j=3, retaining R1>=N and R2=N.
    q_lower = [
        4 * b * c0 - 3 * e0 * (p0 + a),
        4 * b * (a + N) - 3 * e0 * p1 - 3 * b * (p0 + a + p1),
        4 * b * N - 3 * e0 * p2 - 6 * b * (p1 + p2),
        -3 * (e0 + 3 * b * (p2 + 1)),
    ]
    pq3 = sp.expand(sum(
        kernel(left, right, 3) * p[left] * q_lower[right]
        for left in range(4)
        for right in range(4)
    ))
    pq3 = sp.expand(pq3.subs(e0, e_upper))
    p0_slope = sp.factor(sp.diff(pq3, p0) / b)
    assert sp.expand(p0_slope + 2 * (9 * N + 4 * x + 31)) == 0

    # The sharp tree bounds on p0=i3(G)+i2(G) are the path/star endpoints.
    p0_lower = (N - 1) * (N**2 - 2 * N + 6) / 6
    p0_upper = N * (N - 1) * (N + 1) / 6
    pq3 = sp.expand(pq3.subs(p0, p0_upper))

    # The exact c0=a(1+x) strengthens each quantitative anchor coefficient.
    A1bar = p0_lower + N + 2 + x * p1
    A2bar = N**2 + 3 * N + 8 + x * p2
    A3bar = 3 * N + 10 + x
    shadow2 = 3 / (N - 2)
    shadow3 = 6 / ((N - 2) * (N - 1))
    E3 = sp.expand(
        A1bar * (3 * shadow2 + 3 * shadow3)
        + A2bar * (3 + 6 * shadow2 + 3 * shadow3)
        + A3bar * (4 + 3 * shadow2 + shadow3)
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

    # delta3/(ab)>=4aE3+[PQ]3/b.  Its a-slope is manifestly positive, so
    # use the forest pair floor a>=C(N-1,2).
    normalized = sp.expand(4 * a * E3 + pq3 / b)
    slope_num, slope_den = sp.cancel(sp.diff(normalized, a)).as_numer_denom()
    slope_den = sp.factor(slope_den)
    assert sp.expand(slope_den - (N - 2) * (N - 1)) == 0
    expected_slope_num = (
        18 * N**4
        + 30 * N**3 * x
        + 111 * N**3
        + 112 * N**2 * x
        + 418 * N**2
        + 138 * N * x
        + 399 * N
        + 104 * x
        + 446
    )
    assert sp.expand(slope_num - expected_slope_num) == 0
    assert all(value > 0 for value in sp.Poly(expected_slope_num, N, x).coeffs())

    pair_floor = (N - 1) * (N - 2) / 2
    final_lower = sp.factor(normalized.subs(a, pair_floor))
    numerator = (
        9 * N**4
        + 10 * N**3 * x
        - 89 * N**3
        - 96 * N**2 * x
        - 393 * N**2
        - 658 * N * x
        - 2359 * N
        - 1008 * x
        - 3708
    )
    assert sp.expand(final_lower - numerator / 6) == 0

    # For N>=15 set N=15+q.  Every coefficient is positive.
    q = sp.Symbol("q", integer=True, nonnegative=True)
    shifted = sp.Poly(sp.expand(numerator.subs(N, 15 + q)), q, x)
    assert all(value > 0 for value in shifted.coeffs())
    assert sp.expand(numerator.subs(N, 15 + q)) == (
        9 * q**4
        + 10 * q**3 * x
        + 451 * q**3
        + 354 * q**2 * x
        + 7752 * q**2
        + 3212 * q * x
        + 47276 * q
        + 1272 * x
        + 27732
    )

    report = {
        "schema": "terminal-q3-low-newton-m3-j3-exact-agent-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_TREE_BASE_N15_PLUS_TERMINAL_Q3_LOW_NEWTON_M3_J3",
        "claim": (
            "For every tree base G of order n>=15, every marked vertex, and "
            "target j=3, the binom(t-1,3) coefficient of the normalized "
            "untruncated terminal included-payment margin is nonnegative."
        ),
        "correlated_forest_bound": (
            "all-forest q3<=q2 plus rooted rank-three reserve imply "
            "e0/b<=4(1+x)/3, x=(z2+h2)/a"
        ),
        "analytic_orders": {
            "tree_order": "n>=16",
            "forest_order": "N>=15",
            "shifted_positive_numerator": str(sp.expand(numerator.subs(N, 15 + q))),
            "term_count": len(shifted.terms()),
            "minimum_coefficient": str(min(shifted.coeffs())),
        },
        "finite_order_15": finite["coverage"],
        "finite_minimum_witness": finite["minimum_witness"],
        "retained_kernels": [
            {"A_degree": pair[0], "U_degree": pair[1], "weight": weight}
            for pair, weight in retained.items()
        ],
        "pins": observed,
        "scope": (
            "This proves only Newton m=3 at target j=3 for tree bases n>=15. "
            "The separate j>=4 certificate is needed for the full m=3 row. "
            "It does not prove m=0..2, forest-base terminal closure, the whole "
            "terminal payment, unimodality, or Erdos Problem 993."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report["analytic_orders"], indent=2))
    print(json.dumps(report["finite_order_15"], indent=2))
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
