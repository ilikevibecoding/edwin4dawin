#!/usr/bin/env python3
"""Independent exact all-order audit for terminal Newton degree m=3.

The j>=4 cone is elementary.  The j=3 cone uses the all-forest q3<=q2
theorem and the pinned rooted-forest reserve; both are explicit dependencies.
"""

from __future__ import annotations

import hashlib
import json
from math import factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_m3_all_order_independent_audit_20260829.json"

PINS = {
    "prove_all_forest_q3_q2_component_lift_root.py": (
        "6C9F956D8F37AFC462193E780284C24F995D90A644F6C6C2B129A0B9BE259B00"
    ),
    "all_forest_q3_q2_component_lift_exact_root_20260829.json": (
        "71BA8A861714902FECC613150B2BA936A19100F0AB43DF5766CF8614C5E50442"
    ),
    "audit_all_forest_q3_q2_component_lift_independent_agent.py": (
        "63C2FFE7432FE54BF197B2F6F89DFF737B280D7B2571D6B30692FF09227E9815"
    ),
    "all_forest_q3_q2_component_lift_independent_audit_20260829.json": (
        "7465DCB4C62ACF76614003D42285B72CD559A27AB6F449804F3CC881B405695D"
    ),
    "verify_terminal_q3_payment_newton_tail_independent_agent.py": (
        "FDC4736A2B5729954C585A37800915C818A24667D55E6DDB2F76B122FD334BA6"
    ),
    "terminal_q3_payment_newton_tail_independent_20260828.json": (
        "EFA58A539FAA2627D3BC1ECC9E5925D6BB6587F555540F01574608F7C38EA212"
    ),
    "assemble_rooted_forest_q3_reserve_all_rank_independent_agent.py": (
        "FA1980F1C539A13C477A1B4A3A5F9BDB7E9B9E49AE0A914E076BA9A31F558184"
    ),
    "rooted_forest_q3_reserve_all_rank_assembly_independent_20260828.json": (
        "A013FF2C5E2C3401A661A27C3503797B8C2E06DDB74C5F78314F5400523E26F3"
    ),
    "verify_terminal_q3_included_payment_finite_all_t_independent_agent.py": (
        "424ED1CA33674337342AD06049D6BF99FC3AC8ABBBE82841226C7C63A33099FE"
    ),
    "terminal_q3_included_payment_finite_all_t_independent_20260828.json": (
        "42DD09511EE4774A832AF6F561F5EA270271F9732476D8096907B49AA8481044"
    ),
    "audit_terminal_q3_low_newton_adversarial_agent.py": (
        "F009D46E8D3E30C26A9B1E3B30441526F108029DD3891DA14B268D9916650B4D"
    ),
    "terminal_q3_low_newton_adversarial_independent_20260829.json": (
        "A8C9D806F00551EA6C2433B4B8180CF1738D6814E1FF8CAD20173E0A9F2B0836"
    ),
}
FOREST_PRODUCER_STATUS = (
    "PASS_EXACT_SYMBOLIC_ALL_FOREST_Q3_Q2_LIFT_FROM_ALL_TREE_THEOREM"
)
FOREST_AUDIT_STATUS = (
    "PASS_INDEPENDENT_EXACT_ALL_FOREST_Q3_AT_MOST_Q2_COMPONENT_LIFT_AUDIT"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


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
    reserve = json.loads(
        (HERE / "rooted_forest_q3_reserve_all_rank_assembly_independent_20260828.json")
        .read_text(encoding="utf-8")
    )
    finite14 = json.loads(
        (HERE / "terminal_q3_included_payment_finite_all_t_independent_20260828.json")
        .read_text(encoding="utf-8")
    )
    finite15 = json.loads(
        (HERE / "terminal_q3_low_newton_adversarial_independent_20260829.json")
        .read_text(encoding="utf-8")
    )
    forest_producer = json.loads(
        (HERE / "all_forest_q3_q2_component_lift_exact_root_20260829.json")
        .read_text(encoding="utf-8")
    )
    forest_audit = json.loads(
        (HERE / "all_forest_q3_q2_component_lift_independent_audit_20260829.json")
        .read_text(encoding="utf-8")
    )
    assert reserve["status"] == "PASS_EXACT_ALL_ORDER_ROOTED_FOREST_Q3_RESERVE_ASSEMBLY"
    assert finite14["status"].startswith("PASS_EXACT_FINITE_N14_ALL_REAL_T")
    assert finite15["status"].startswith("PASS_EXACT_FINITE_AND_ADVERSARIAL_LOW_NEWTON")
    assert finite15["coverage"]["finite"]["trees"] == 13188
    assert finite15["newton_degrees"]["3"]["negative_coefficients"] == 0
    assert forest_producer["status"] == FOREST_PRODUCER_STATUS
    assert forest_audit["status"] == FOREST_AUDIT_STATUS
    assert forest_producer["claim"].startswith("For every forest F")
    assert forest_audit["claim"].startswith("For every finite forest F")

    N, j, a, b, e0, p0 = sp.symbols(
        "N j a b e0 p0", positive=True
    )
    p1 = (N**2 + N + 2) / 2
    p2 = N + 2
    a_low = (N - 1) * (N - 2) / 2
    p0_low = (N - 1) * (N**2 - 2 * N + 6) / 6
    p0_high = N * (N - 1) * (N + 1) / 6

    # The tree triple identity.  W is the number of length-two wedges.
    W = sp.symbols("W", nonnegative=True)
    p0_wedge = (
        (N + 1) * N * (N - 1) / 6
        - N * (N - 1)
        + W
        + N * (N - 1) / 2
    )
    assert sp.expand(p0_wedge.subs(W, N - 1) - p0_low) == 0
    assert sp.expand(p0_wedge.subs(W, N * (N - 1) / 2) - p0_high) == 0

    # Corrected low-remainder lower bound.  R1>=N is retained in B1.
    B0 = (j + 1) * b * a - 3 * e0 * (p0 + a)
    B1 = (
        (j + 1) * b * (a + N)
        - 3 * e0 * p1
        - 3 * b * (p1 + p0 + a)
    )
    B2 = (j + 1) * b * N - 3 * e0 * p2 - 6 * b * (p2 + p1)
    B3 = -3 * (e0 + 3 * b * (p2 + 1))
    pq3_lower = sp.expand(
        p0 * B3
        + 3 * p1 * B2
        + 3 * p1 * B3
        + 3 * p2 * B1
        + 6 * p2 * B2
        + 3 * p2 * B3
        + B0
        + 3 * B1
        + 3 * B2
        + B3
    )
    # e0 has a nonpositive coefficient; p0 has a nonpositive coefficient.
    assert sp.Poly(sp.diff(pq3_lower, e0), N, j, a, b, p0).coeffs()
    assert all(
        coefficient <= 0
        for coefficient in sp.Poly(sp.diff(pq3_lower, e0), N, j, a, b, p0).coeffs()
    )
    assert all(
        coefficient <= 0
        for coefficient in sp.Poly(sp.diff(pq3_lower, p0), N, j, a, b, e0).coeffs()
    )
    after_e = sp.expand(pq3_lower.subs(e0, (j + 2) * b))
    a_coefficient = sp.factor(sp.diff(after_e, a))
    assert sp.expand(
        a_coefficient - b * (3 * N * (j - 2) + 7 * j - 23)
    ) == 0

    corrected_Q3 = (
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
    general_lower = sp.factor(
        after_e.subs({p0: p0_high, a: a_low})
    )
    assert sp.expand(general_lower + b * corrected_Q3 / 2) == 0

    # Anchor bounds and retained positive kernels.
    A1bar = p0_low + N + 2
    A2bar = N**2 + 3 * N + 8
    A3bar = 3 * N + 10
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
    assert {pair: overlap(*pair, 3) for pair in retained} == retained

    # j>=4: all supported N>=j, with j=4+k and N=j+r.
    k, r = sp.symbols("k r", integer=True, nonnegative=True)
    symbolic_j = 4 + k
    symbolic_N = symbolic_j + r
    R2 = symbolic_j / (r + 1)
    R3 = symbolic_j * (symbolic_j - 1) / ((r + 1) * (r + 2))
    E = (
        A1bar.subs(N, symbolic_N) * 3 * (R2 + R3)
        + A2bar.subs(N, symbolic_N) * (3 + 6 * R2 + 3 * R3)
        + A3bar.subs(N, symbolic_N) * (4 + 3 * R2 + R3)
    )
    general_gap = sp.cancel(
        2
        * (symbolic_j + 1)
        * a_low.subs(N, symbolic_N)
        * E
        - corrected_Q3.subs({N: symbolic_N, j: symbolic_j})
    )
    general_numerator, general_denominator = sp.fraction(general_gap)
    general_poly = sp.Poly(sp.expand(general_numerator), k, r)
    assert sp.expand(general_denominator - 2 * (r + 1) * (r + 2)) == 0
    assert len(general_poly.terms()) == 42
    assert min(general_poly.coeffs()) == 1

    # j=3 correlated bound.  Put x=(z2+h2)/a.  Forest q3<=q2 and
    # the rank-three rooted reserve imply e0/b<=4(1+x)/3.
    x, q = sp.symbols("x q", integer=False, nonnegative=True)
    correlated_e = sp.Rational(4, 3) * (1 + x) * b
    # Algebraic replay of 1+3z2/(2a)+(8h2+2a-z2)/(6a).
    z2, h2 = sp.symbols("z2 h2", nonnegative=True)
    correlated_from_inputs = sp.simplify(
        1
        + 3 * z2 / (2 * a)
        + (8 * h2 + 2 * a - z2) / (6 * a)
    )
    assert sp.simplify(
        correlated_from_inputs - sp.Rational(4, 3) * (1 + (z2 + h2) / a)
    ) == 0

    C0 = a * (1 + x)
    J3B0 = 4 * b * C0 - 3 * correlated_e * (p0 + a)
    J3B1 = (
        4 * b * (a + N)
        - 3 * correlated_e * p1
        - 3 * b * (p1 + p0 + a)
    )
    J3B2 = 4 * b * N - 3 * correlated_e * p2 - 6 * b * (p2 + p1)
    J3B3 = -3 * (correlated_e + 3 * b * (p2 + 1))
    j3_pq_lower = sp.expand(
        p0 * J3B3
        + 3 * p1 * J3B2
        + 3 * p1 * J3B3
        + 3 * p2 * J3B1
        + 6 * p2 * J3B2
        + 3 * p2 * J3B3
        + J3B0
        + 3 * J3B1
        + 3 * J3B2
        + J3B3
    )
    assert sp.expand(sp.diff(j3_pq_lower, a) - 3 * b * (N + 3)) == 0
    assert all(
        coefficient <= 0
        for coefficient in sp.Poly(sp.diff(j3_pq_lower, p0), N, b, x).coeffs()
    )
    j3_remainder = sp.factor(j3_pq_lower.subs({a: a_low, p0: p0_high}))
    j3_Q = (
        45 * N**4
        + 80 * N**3 * x
        + 413 * N**3
        + 432 * N**2 * x
        + 1647 * N**2
        + 1072 * N * x
        + 3619 * N
        + 1320 * x
        + 4992
    )
    assert sp.expand(j3_remainder + b * j3_Q / 6) == 0

    j3_A1 = p0_low + N + 2 + x * p1
    j3_A2 = A2bar + x * (N + 2)
    j3_A3 = A3bar + x
    j3_R2 = 3 / (N - 2)
    j3_R3 = 6 / ((N - 1) * (N - 2))
    j3_E = (
        j3_A1 * 3 * (j3_R2 + j3_R3)
        + j3_A2 * (3 + 6 * j3_R2 + 3 * j3_R3)
        + j3_A3 * (4 + 3 * j3_R2 + j3_R3)
    )
    j3_gap = sp.factor(4 * a_low * j3_E - j3_Q / 6)
    j3_expected_numerator = (
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
    assert sp.expand(j3_gap - j3_expected_numerator / 6) == 0
    j3_large = sp.Poly(sp.expand(j3_expected_numerator.subs(N, 15 + q)), q, x)
    assert len(j3_large.terms()) == 9
    assert min(j3_large.coeffs()) == 9

    report = {
        "schema": "terminal-q3-low-newton-m3-all-order-independent-audit-v1",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M3_AUDIT",
        "claim": (
            "Every supported terminal cell has nonnegative Newton coefficient "
            "m=3. The j>=4 cone is coefficient-positive for all N>=j; the j=3 "
            "cone is coefficient-positive for N>=15 and exact finite pins cover "
            "N<=14."
        ),
        "tree_coefficient_bounds": {
            "wedge_range": "N-1<=W<=C(N,2)",
            "p0_lower": str(p0_low),
            "p0_upper": str(p0_high),
            "R1_floor": "R1=N^2-2W>=N",
            "A1_lower": "A1>=a(p0_lower+N+2)",
        },
        "j_at_least_4": {
            "corrected_remainder": "[P*Q]_3>=-(b/2)Q3",
            "Q3": str(corrected_Q3),
            "retained_kernels": [
                {"A_degree": pair[0], "U_degree": pair[1], "weight": weight}
                for pair, weight in retained.items()
            ],
            "parameterization": "j=4+k, N=j+r",
            "cleared_numerator": str(sp.expand(general_numerator)),
            "denominator": str(general_denominator),
            "positive_terms": len(general_poly.terms()),
            "minimum_coefficient": str(min(general_poly.coeffs())),
        },
        "j_equals_3": {
            "correlation": (
                "x=(z2+h2)/a; all-forest q3<=q2 plus rooted reserve gives "
                "e0/b<=4(1+x)/3"
            ),
            "remainder": "[P*Q]_3>=-(b/6)Qcorr",
            "Qcorr": str(j3_Q),
            "final_lower_bound": "delta3/(ab)>=numerator/6",
            "numerator": str(j3_expected_numerator),
            "large_substitution": "N=15+q",
            "large_expansion": str(j3_large.as_expr()),
            "positive_terms": len(j3_large.terms()),
            "minimum_coefficient": str(min(j3_large.coeffs())),
        },
        "finite_base": {
            "G_orders_1_through_14": finite14["status"],
            "G_order_15_included_in_exact_newton_census": True,
            "exact_newton_census_trees_through_15": finite15["coverage"]["finite"]["trees"],
            "m3_negative_coefficients": finite15["newton_degrees"]["3"]["negative_coefficients"],
        },
        "all_forest_q3_q2_dependencies": {
            "producer_status": forest_producer["status"],
            "independent_audit_status": forest_audit["status"],
        },
        "pins": observed_pins,
        "scope": (
            "This closes only m=3. Degrees m=0,1,2, the full terminal payment, "
            "unimodality, and Erdos Problem 993 remain separate."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"j4plus_terms={len(general_poly.terms())} j3_terms={len(j3_large.terms())}")
    print(f"forest_producer={forest_producer['status']}")
    print(f"forest_audit={forest_audit['status']}")
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
