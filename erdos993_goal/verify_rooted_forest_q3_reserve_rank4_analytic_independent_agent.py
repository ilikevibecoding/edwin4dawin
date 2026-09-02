#!/usr/bin/env python3
"""Exact all-order analytic proof of the rank-j=4 rooted-forest reserve."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rooted_forest_q3_reserve_rank4_analytic_exact_independent_20260828.json"
REDUCTION_SOURCE = HERE / "verify_rooted_forest_q3_reserve_reduction_independent_agent.py"
REDUCTION_REPORT = HERE / "rooted_forest_q3_reserve_reduction_exact_independent_20260828.json"
EXPECTED_REDUCTION_SOURCE = "4FF559B971D5C62ECBF82FD822F53AFABF5F770AA3B8A69BB6261167D886FF5A"
EXPECTED_REDUCTION_REPORT = "22127852392861F649556669959C9E2EC2365146DB6BA20788A27887D34817B4"
EXPECTED_REDUCTION_STATUS = "PASS_EXACT_ROOTED_FOREST_Q3_RESERVE_REDUCTION_TO_RANKS_3_4_5"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def nonnegative_coefficients(expression: sp.Expr, *variables: sp.Symbol) -> dict[str, object]:
    polynomial = sp.Poly(sp.expand(expression), *variables)
    assert polynomial.coeffs() and all(value >= 0 for value in polynomial.coeffs())
    return {
        "term_count": len(polynomial.terms()),
        "minimum_coefficient": str(min(polynomial.coeffs())),
        "expression": str(sp.factor(expression)),
    }


def main() -> None:
    assert sha256(REDUCTION_SOURCE) == EXPECTED_REDUCTION_SOURCE
    assert sha256(REDUCTION_REPORT) == EXPECTED_REDUCTION_REPORT
    reduction = json.loads(REDUCTION_REPORT.read_text(encoding="utf-8"))
    assert reduction["status"] == EXPECTED_REDUCTION_STATUS
    assert reduction["source_sha256"] == EXPECTED_REDUCTION_SOURCE

    M, c = sp.symbols("M c", integer=True, positive=True)
    N = M + c
    f2 = sp.expand_func(sp.binomial(N, 2) - M)
    hmin = sp.expand_func(sp.binomial(M - 1, 2) + c - 1)
    hmax = sp.expand_func(sp.binomial(M, 2))
    Kmin = sp.expand(N * (c - 1) + 2 * (M - c))

    # Direct coefficient domination.
    G4 = sp.factor(10 * hmin + 2 * Kmin - 6 * f2)
    expected_G4 = 2 * M**2 - 4 * M * c - 4 * M - c**2 + 7 * c
    assert sp.expand(G4 - expected_G4) == 0
    c1 = sp.factor(G4.subs(c, 1))
    c2 = sp.factor(G4.subs(c, 2))
    c3 = sp.factor(G4.subs(c, 3))
    assert sp.expand(c1 - 2 * (M - 3) * (M - 1)) == 0
    assert sp.expand(c2 - 2 * (M - 5) * (M - 1)) == 0
    assert sp.expand(c3 - 2 * (M**2 - 8 * M + 6)) == 0

    # Shadow/path-floor payment.  Leaf deletion proves for every forest on n
    # vertices that i_k>=C(n-k+1,k), via Pascal's identity.
    n, k = sp.symbols("n k", integer=True, nonnegative=True)
    assert sp.simplify(
        sp.binomial(n - k, k)
        + sp.binomial(n - k, k - 1)
        - sp.binomial(n - k + 1, k)
    ) == 0
    L = sp.expand_func(sp.binomial(N - 3, 4))
    shadow = sp.expand_func(sp.binomial(M - 2, 2))
    slope = sp.factor(10 * L - shadow * f2)
    Bmin = sp.expand(slope * hmin + 2 * L * Kmin)
    Bmax = sp.expand(slope * hmax + 2 * L * Kmin)

    # The three c=3 transition values have negative slope, so h2<=hmax
    # makes B(h2)>=B(hmax).
    transition_M = [5, 6, 7]
    transition_slopes = [int(slope.subs({M: value, c: 3})) for value in transition_M]
    transition_values = [int(Bmax.subs({M: value, c: 3})) for value in transition_M]
    assert all(value < 0 for value in transition_slopes)
    assert transition_values == [10, 270, 1330]

    # For c>=4, shift onto the exact domain c=4+u, M=c+r.
    u, r = sp.symbols("u r", integer=True, nonnegative=True)
    domain_shift = {c: 4 + u, M: 4 + u + r}
    slope_certificate = nonnegative_coefficients(
        slope.subs(domain_shift, simultaneous=True), u, r
    )
    Bmin_certificate = nonnegative_coefficients(
        Bmin.subs(domain_shift, simultaneous=True), u, r
    )
    assert slope_certificate["term_count"] == 15
    assert Bmin_certificate["term_count"] == 28

    # At M=4 the only nontrivial cases not already closed above are c=2,3.
    # If H has an edge, h4=0.  If H is edgeless, each component is a rooted
    # star and the positive leaf-count compositions are exactly those below.
    x = sp.symbols("x")
    star_cases = []
    expected_margins = {(1, 3): 102, (2, 2): 14, (1, 1, 2): 266}
    for parts, expected_margin in expected_margins.items():
        component_count = len(parts)
        total_nonroots = sum(parts)
        independence_polynomial = sp.prod(x + (1 + x) ** part for part in parts)
        f4 = int(sp.expand(independence_polynomial).coeff(x, 4))
        local_f2 = int(sp.binomial(total_nonroots + component_count, 2) - total_nonroots)
        h2 = int(sp.binomial(total_nonroots, 2))
        P = int(sum(sp.binomial(part, 2) for part in parts))
        K2 = (total_nonroots + component_count) * (component_count - 1) + 2 * P
        margin = (10 * h2 + 2 * K2) * f4 - 6 * local_f2
        assert total_nonroots == 4 and margin == expected_margin
        star_cases.append(
            {
                "leaf_composition": list(parts),
                "components": component_count,
                "f2": local_f2,
                "h2": h2,
                "K2": K2,
                "f4": f4,
                "h4": 1,
                "margin": margin,
            }
        )

    report = {
        "status": "PASS_EXACT_ALL_ORDER_ANALYTIC_ROOTED_FOREST_Q3_RESERVE_RANK4",
        "theorem": (
            "For every rooted forest F and H=F-roots, "
            "(10h2+2K2)f4>=6h4f2."
        ),
        "proof": {
            "no_isolated_root_parameters": (
                "M=number of nonroots=edges, c=components, N=M+c, 1<=c<=M"
            ),
            "corrected_bounds": {
                "h2": "C(M-1,2)+c-1 <= h2 <= C(M,2)",
                "K2": "K2>=N(c-1)+2(M-c)",
                "f2": str(f2),
            },
            "direct_coefficient_gap": {
                "general_lower": str(G4),
                "c1": str(c1),
                "c2": str(c2),
                "c3": str(c3),
                "closed_ranges": (
                    "c=1,M>=3; c=2,M>=5; c=3,M>=8. "
                    "When M<4, h4=0."
                ),
                "decomposition": (
                    "If G4=(10h2+2K2)-6f2>=0, then the margin is "
                    "G4*f4+6f2(f4-h4)>=0."
                ),
            },
            "shadow_path_payment": {
                "shadow": "6h4<=C(M-2,2)h2",
                "path_floor": "f4>=C(N-3,4), by leaf-deletion induction",
                "affine_slope": str(slope),
                "c3_transition_M": transition_M,
                "c3_transition_negative_slopes": transition_slopes,
                "c3_transition_hmax_values": transition_values,
                "c_at_least_4_slope_certificate": slope_certificate,
                "c_at_least_4_hmin_certificate": Bmin_certificate,
            },
            "M4_edgeless_H_star_cases": star_cases,
            "isolated_roots": (
                "Any isolated distinguished-root components are restored by "
                "the pinned corrected all-rank preservation reduction."
            ),
        },
        "frozen_dependency": {
            "status": reduction["status"],
            "source_sha256": EXPECTED_REDUCTION_SOURCE,
            "report_sha256": EXPECTED_REDUCTION_REPORT,
        },
        "scope": {
            "proved": "the rooted reserve at j=4 for every finite rooted forest",
            "not_proved": (
                "the terminal two-block payment, all-tree higher-rank envelope, "
                "or Erdos Problem 993"
            ),
        },
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report["proof"]["M4_edgeless_H_star_cases"], indent=2))
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
