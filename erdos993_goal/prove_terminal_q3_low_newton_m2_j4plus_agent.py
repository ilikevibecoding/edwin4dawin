#!/usr/bin/env python3
"""Exact terminal-payment Newton-m=2 proof for every target j>=4.

Scope: tree bases G of order n>=15.  The infinite symbolic proof covers
N=|G|-1>=15 (thus n>=16); the independently reconstructed exhaustive audit
supplies the boundary order n=15.  Target j=3 is deliberately separate.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_m2_j4plus_exact_agent_20260829.json"
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
    "RANK4_EDGE_LOCAL_COMPONENT_SURPLUS_THEOREM_2026-08-28.md": (
        "682282B6D01BB7D5D14758AD4AC1076886A6E82E93F0012F8DC637DF669875E0"
    ),
    "rank4_edge_local_component_surplus_independent_audit_20260828.json": (
        "8F2BEF58AD6ADAB96066B47EF8BFEAA494CD2E0433CCB7C4A2977F86643A08E4"
    ),
    "ROOTED_FOREST_EXTENSION_FLOOR_2026-08-28.md": (
        "8AA07C316270045F9CBFCA2B5A04E04994100DCF87F02EB99B84A61080A1458E"
    ),
    "audit_terminal_q3_low_newton_adversarial_agent.py": (
        "F009D46E8D3E30C26A9B1E3B30441526F108029DD3891DA14B268D9916650B4D"
    ),
    "terminal_q3_low_newton_adversarial_independent_20260829.json": (
        "A8C9D806F00551EA6C2433B4B8180CF1738D6814E1FF8CAD20173E0A9F2B0836"
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


def positive_coefficients(expression: sp.Expr, *variables: sp.Symbol) -> sp.Poly:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    assert polynomial.coeffs()
    assert all(value > 0 for value in polynomial.coeffs())
    return polynomial


def cone_certificate(
    expression: sp.Expr,
    *,
    j: sp.Symbol,
    r: sp.Symbol,
    k: sp.Symbol,
    q: sp.Symbol,
) -> dict[str, object]:
    """Certify j>=4, r>=1, j+r>=15 by one cone and ten strips."""
    numerator, denominator = sp.together(expression).as_numer_denom()
    denominator = sp.factor(denominator)
    denominator_poly = sp.Poly(sp.expand(denominator), r)
    assert all(value >= 0 for value in denominator_poly.coeffs())
    assert denominator.subs(r, 1) > 0

    high = positive_coefficients(
        numerator.subs({j: 4 + k, r: 11 + q}),
        k,
        q,
    )
    strips: list[dict[str, object]] = []
    for residual in range(1, 11):
        minimum_k = 11 - residual
        strip = positive_coefficients(
            numerator.subs({r: residual, j: 4 + minimum_k + q}),
            q,
        )
        strips.append({
            "r": residual,
            "minimum_k": minimum_k,
            "degree": strip.degree(),
            "term_count": len(strip.terms()),
            "minimum_coefficient": str(min(strip.coeffs())),
        })
    return {
        "denominator": str(denominator),
        "r_11_plus_term_count": len(high.terms()),
        "r_11_plus_minimum_coefficient": str(min(high.coeffs())),
        "strips": strips,
    }


def r_zero_certificate(
    expression: sp.Expr,
    *,
    j: sp.Symbol,
    r: sp.Symbol,
    q: sp.Symbol,
) -> dict[str, object]:
    """Certify r=0, y=0, j=N>=15."""
    specialized = sp.factor(expression.subs({r: 0, j: 15 + q}))
    numerator, denominator = sp.together(specialized).as_numer_denom()
    assert denominator > 0
    polynomial = positive_coefficients(numerator, q)
    return {
        "denominator": str(denominator),
        "degree": polynomial.degree(),
        "term_count": len(polynomial.terms()),
        "minimum_coefficient": str(min(polynomial.coeffs())),
    }


def main() -> None:
    observed_pins = {name: sha256(HERE / name) for name in PINS}
    assert observed_pins == PINS
    tail = json.loads(
        (HERE / "terminal_q3_payment_newton_tail_independent_20260828.json")
        .read_text(encoding="utf-8")
    )
    assert tail["status"] == (
        "PASS_EXACT_ALL_ORDER_TERMINAL_PAYMENT_NEWTON_TAIL_M8_PLUS_REDUCTION"
    )
    anchor = json.loads(
        (HERE / "terminal_q3_anchor_ordering_independent_audit_20260828.json")
        .read_text(encoding="utf-8")
    )
    assert anchor["status"] == (
        "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_ANCHOR_ORDERING_AUDIT"
    )
    finite = json.loads(
        (HERE / "terminal_q3_low_newton_adversarial_independent_20260829.json")
        .read_text(encoding="utf-8")
    )
    assert finite["status"] == (
        "PASS_EXACT_FINITE_AND_ADVERSARIAL_LOW_NEWTON_M0_M7_NO_NEGATIVES_NOT_ALL_ORDER"
    )
    assert finite["coverage"]["finite"] == {
        "trees": 13188,
        "roots": 188260,
        "rank_cells": 1222653,
        "coefficients": 9781224,
    }
    assert finite["newton_degrees"]["2"]["negative_coefficients"] == 0
    assert int(finite["newton_degrees"]["2"]["minimum_coefficient"]) > 0

    N, j, a, b, e0, W, y = sp.symbols(
        "N j a b e0 W y", nonnegative=True
    )
    r, k, q = sp.symbols("r k q", integer=True, nonnegative=True)
    p0 = sp.expand(sp.expand_func(
        sp.binomial(N + 1, 3)
        - N * (N - 1)
        + W
        + N * (N - 1) / 2
    ))
    p1 = (N**2 + N + 2) / 2
    p2 = N + 2
    P = [p0, p1, p2]

    # Q=(j+1)b(c+R)-3(P+a)e.  At degree zero retain c0>=a and R0>=0;
    # at degree one retain c1=a and the exact tree identity R1=N^2-2W;
    # at degree two retain R2=N.
    q_lower = [
        (j + 1) * b * a - 3 * e0 * (p0 + a),
        (j + 1) * b * (a + N**2 - 2 * W)
        - 3 * e0 * p1
        - 3 * b * (p0 + a + p1),
        (j + 1) * b * N
        - 3 * e0 * p2
        - 6 * b * (p1 + p2),
    ]
    pq2 = sp.expand(sum(
        kernel(left, right, 2) * P[left] * q_lower[right]
        for left in range(3)
        for right in range(3)
    ))
    explicit_pq2 = sp.expand(
        p0 * q_lower[2]
        + 2 * p1 * q_lower[1]
        + 2 * p1 * q_lower[2]
        + p2 * q_lower[0]
        + 2 * p2 * q_lower[1]
        + p2 * q_lower[2]
    )
    assert sp.expand(pq2 - explicit_pq2) == 0
    assert {
        (0, 2): 1,
        (1, 1): 2,
        (1, 2): 2,
        (2, 0): 1,
        (2, 1): 2,
        (2, 2): 1,
    } == {
        (left, right): kernel(left, right, 2)
        for left in range(3)
        for right in range(3)
        if kernel(left, right, 2)
    }

    # Every one-edge (j+1)-set has two endpoint deletions.  Their count is
    # at most the selected-degree incidence D_j.  In a rooted forest, the
    # prescribed-root injection gives D_j<=2U_j.  Since every independent
    # j-set not counted by h_j contains a root,
    # U_j<=j b-(b-h_j)=(j-1)b+h_j.  Hence
    # z_j<=(j-1)b+h_j and e0=z_j+h_j+b<=b(j+2y), y=h_j/b in [0,1].
    adverse_e = sp.factor(-sp.diff(pq2, e0))
    expected_adverse_e = 3 * (
        p0 * p2
        + 2 * p1**2
        + 4 * p1 * p2
        + p2 * (p0 + a)
        + p2**2
    )
    assert sp.expand(adverse_e - expected_adverse_e) == 0
    remainder = sp.factor(pq2.subs(e0, b * (j + 2 * y)) / b)

    # Quantitative anchor floors from A=P*c-aR.  The first keeps the same W
    # appearing in p0 and R1; the second uses c0>=a and R2=N.
    anchor1 = sp.expand(p0 + N + 2 + 2 * W)
    anchor2 = N**2 + 3 * N + 8

    # Put r=N-j.  Ordinary F-shadows give S1,S2 below.  If r>=1 and y>0,
    # H has at most N-1 vertices, so j h_j<=r h_(j-1), i.e. H1 below.
    S1 = j / (r + 1)
    S2 = j * (j - 1) / ((r + 1) * (r + 2))
    H1 = j * y / r
    U0base = (N - 2 * j + 3 + (j - 1) * y) / (j + 1)

    # The coupled rooted extension floor gives
    # U0/b >= U0base+H1.  Also U1/b>=1+S1+H1 and U2/b>=S1+S2.
    # Retain all m=2 kernels except the nonnegative A0*U2 term.
    E = sp.expand(
        2 * anchor1 * (1 + 2 * S1 + S2 + H1)
        + anchor2 * (U0base + 2 + 3 * S1 + S2 + 3 * H1)
    )
    normalized_gap = sp.factor((j + 1) * a * E + remainder)
    assert sp.Poly(normalized_gap, a).degree() == 1

    pair_floor = (N - 1) * (N - 2) / 2
    W_lower = N - 1
    W_upper = N * (N - 1) / 2
    substituted_gap = sp.factor(normalized_gap.subs(N, j + r))
    a_slope = sp.factor(sp.diff(substituted_gap, a))
    floor_gap = sp.factor(substituted_gap.subs(a, pair_floor.subs(N, j + r)))
    assert sp.Poly(a_slope, W).degree() <= 1
    assert sp.Poly(a_slope, y).degree() <= 1
    assert sp.Poly(floor_gap, W).degree() <= 1
    assert sp.Poly(floor_gap, y).degree() <= 1

    # A bilinear function on a rectangle is the bilinear interpolation of
    # its four corners.  Certify the a-slope and then the gap at those four
    # corners, on the complete integer cone r>=1, j>=4, j+r>=15.
    slope_corners: dict[str, object] = {}
    gap_corners: dict[str, object] = {}
    for y_value in (0, 1):
        for W_name, W_value in (
            ("path", W_lower.subs(N, j + r)),
            ("star", W_upper.subs(N, j + r)),
        ):
            corner = f"y{y_value}_{W_name}"
            slope_corners[corner] = cone_certificate(
                sp.factor(a_slope.subs({y: y_value, W: W_value})),
                j=j,
                r=r,
                k=k,
                q=q,
            )
            gap_corners[corner] = cone_certificate(
                sp.factor(floor_gap.subs({y: y_value, W: W_value})),
                j=j,
                r=r,
                k=k,
                q=q,
            )

    # If r=0, then H has fewer than j vertices and y=0.  The H-shadow term
    # is not invoked.  Rebuild E without H1 and certify j=N>=15 directly.
    E_r0 = sp.expand(
        2 * anchor1 * (1 + 2 * S1 + S2)
        + anchor2 * (U0base.subs(y, 0) + 2 + 3 * S1 + S2)
    )
    gap_r0 = sp.factor(
        ((j + 1) * a * E_r0 + remainder.subs(y, 0)).subs(N, j + r)
    )
    slope_r0 = sp.factor(sp.diff(gap_r0, a))
    floor_r0 = sp.factor(gap_r0.subs(a, pair_floor.subs(N, j + r)))
    r0_slope: dict[str, object] = {}
    r0_gap: dict[str, object] = {}
    for W_name, W_value in (
        ("path", W_lower.subs(N, j + r)),
        ("star", W_upper.subs(N, j + r)),
    ):
        r0_slope[W_name] = r_zero_certificate(
            slope_r0.subs(W, W_value), j=j, r=r, q=q
        )
        r0_gap[W_name] = r_zero_certificate(
            floor_r0.subs(W, W_value), j=j, r=r, q=q
        )

    report = {
        "schema": "terminal-q3-low-newton-m2-j4plus-exact-agent-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_TREE_BASE_N15_PLUS_TERMINAL_Q3_LOW_NEWTON_M2_J4_PLUS",
        "claim": (
            "For every tree base G of order n>=15, every marked vertex, "
            "and every supported target j>=4, the binom(t-1,2) coefficient "
            "of the normalized untruncated terminal included-payment margin "
            "is nonnegative."
        ),
        "exact_algebra": {
            "p0": str(p0),
            "p1": str(p1),
            "p2": str(p2),
            "Q_lower": [str(sp.factor(value)) for value in q_lower],
            "PQ2_lower": str(sp.factor(pq2)),
            "adverse_e_derivative": str(adverse_e),
        },
        "correlated_incidence_and_extension": {
            "y": "h_j/b in [0,1]",
            "endpoint_deletions": "2z_j<=D_j",
            "refined_incidence": "D_j<=2[(j-1)b+h_j]",
            "e0_upper": "e0/b<=j+2y",
            "coupled_extension": (
                "U0/b>=[N-2j+3+(j-1)y]/(j+1)+h_(j-1)/b"
            ),
            "H_shadow_r_positive": "h_(j-1)/b>=j*y/(N-j)",
            "F_shadows": {
                "S1": str(S1),
                "S2": str(S2),
            },
        },
        "anchor_bounds": {
            "A0": "A0>=0 (pinned anchor-ordering theorem; term omitted)",
            "A1_over_a": str(anchor1),
            "A2_over_a": str(anchor2),
            "a_floor": str(pair_floor),
            "W_interval": [str(W_lower), str(W_upper)],
        },
        "retained_AU2_over_ab": str(E),
        "integer_cone_certificate": {
            "domain": "j=4+k, N=j+r>=15",
            "r_positive_a_slope_corners": slope_corners,
            "r_positive_gap_corners": gap_corners,
            "r_zero_y_zero_a_slope_endpoints": r0_slope,
            "r_zero_y_zero_gap_endpoints": r0_gap,
        },
        "finite_boundary_n15": {
            "source_scope": "all unlabeled trees through order 15, every root and supported rank",
            "finite_counts": finite["coverage"]["finite"],
            "m2_negative_coefficients": finite["newton_degrees"]["2"]["negative_coefficients"],
            "m2_minimum_coefficient": finite["newton_degrees"]["2"]["minimum_coefficient"],
        },
        "pins": observed_pins,
        "scope": (
            "This proves only Newton degree m=2 for targets j>=4 at tree "
            "base orders n>=15. Target j=3 is separate. It does not prove "
            "m=0,1, the whole terminal payment, unimodality, or Erdos Problem 993."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"r_positive_gap_corners={len(gap_corners)}")
    print(f"r_zero_gap_endpoints={len(r0_gap)}")
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
