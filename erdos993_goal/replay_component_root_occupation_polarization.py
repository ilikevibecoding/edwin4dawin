#!/usr/bin/env python3
"""Exact replay for the component root-occupation PGC reduction and no-gos."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
x, y = sp.symbols("x y")


def coefficients(poly: sp.Expr, variable: sp.Symbol = x) -> list[int]:
    p = sp.Poly(sp.expand(poly), variable)
    return [int(p.nth(j)) for j in range(p.degree() + 1)]


def coeff(values: list[int], j: int) -> int:
    return values[j] if 0 <= j < len(values) else 0


def reserve(values: list[int], k: int) -> int:
    return (
        k * coeff(values, k) ** 2
        + coeff(values, k - 1) * coeff(values, k)
        - (k + 1) * coeff(values, k - 1) * coeff(values, k + 1)
    )


def h(values: list[int], k: int) -> Fraction:
    return Fraction(k * reserve(values, k), coeff(values, k - 1))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def pendant_data(phi: sp.Expr) -> dict:
    B = sp.expand(phi.subs(y, 1))
    C = sp.expand(phi.subs(y, 0))
    P = sp.expand((1 + x) * B + x * C)
    bb, cc, pp = coefficients(B), coefficients(C), coefficients(P)
    alpha = len(pp) - 1
    cutoff = (2 * alpha + 1) // 3
    margins = {
        str(k): str(h(pp, k) - h(bb, k - 1))
        for k in range(2, cutoff)
    }
    assert all(Fraction(value) > 0 for value in margins.values())
    return {
        "B": bb,
        "C": cc,
        "P": pp,
        "alpha_P": alpha,
        "cutoff": cutoff,
        "required_pgc_margins": margins,
    }


def verify_six_scalar_identity() -> str:
    k, beta = sp.symbols("k beta", nonzero=True)
    s, u, v, q0, q1, q2 = sp.symbols(
        "s u v q0 q1 q2", nonzero=True
    )
    bkm2 = beta / s
    bkm1 = beta
    bk = beta * u
    bkp1 = beta * u * v
    pkm1 = bkm2 * (1 + s + q0)
    pk = bkm1 * (1 + u + q1)
    pkp1 = bk * (1 + v + q2)
    g_p = k * pk**2 + pkm1 * pk - (k + 1) * pkm1 * pkp1
    h_p = k * g_p / pkm1
    g_b = (k - 1) * bkm1**2 + bkm2 * bkm1 - k * bkm2 * bk
    h_b = (k - 1) * g_b / bkm2
    expression = (
        k * (1 + u + q1)
        + k**2 * s * (1 + u + q1) ** 2 / (1 + s + q0)
        - k * (k + 1) * u * (1 + v + q2)
        - (k - 1) * (1 + (k - 1) * s - k * u)
    )
    assert sp.factor(h_p - h_b - beta * expression) == 0
    return "H_k(P)-H_(k-1)(B)=b_(k-1)*E_k"


def main() -> int:
    scalar_identity = verify_six_scalar_identity()

    # Two copies of K_(1,2), rooted at their centers.
    phi_two = sp.expand(((1 + x) ** 2 + y * x) ** 2)
    m2 = sp.expand(sp.Poly(phi_two, x).nth(2))
    assert coefficients(m2, y) == [6, 4, 1]
    assert sp.discriminant(m2, y) == -8
    assert 4**2 < 4 * 6 * 1
    total = int(m2.subs(y, 1))
    assert total == 11
    p_root = Fraction(3, 11)
    p_both = Fraction(1, 11)
    covariance = p_both - p_root * p_root
    variance_sum = 2 * p_root * (1 - p_root)
    mean_j = Fraction(4 + 2, 11)
    second_j = Fraction(4 + 4, 11)
    variance_j = second_j - mean_j * mean_j
    assert covariance == Fraction(2, 121) > 0
    assert variance_j == Fraction(52, 121)
    assert variance_sum == Fraction(48, 121)
    assert variance_j > variance_sum
    two_data = pendant_data(phi_two)
    assert two_data["required_pgc_margins"] == {"2": "209/2"}

    # Four rooted edges and one rooted K_(1,8).
    phi_mixed = sp.expand(((1 + x) + y * x) ** 4 * ((1 + x) ** 8 + y * x))
    m5 = sp.expand(sp.Poly(phi_mixed, x).nth(5))
    assert coefficients(m5, y) == [792, 1321, 724, 150, 12, 1]
    assert 12**2 < 150
    mixed_data = pendant_data(phi_mixed)
    assert mixed_data["alpha_P"] == 13
    assert mixed_data["cutoff"] == 9

    # Retain the earlier exact nested-PF no-go and expose the sharper
    # marked-component obstruction t=b1-c1<=deg(B).
    B_old = sp.expand((1 + 344 * x) * (1 + 8 * x + 4 * x**2))
    C_old = 1 + 33 * x + 67 * x**2
    P_old = sp.expand((1 + x) * B_old + x * C_old)
    bb_old, cc_old, pp_old = (
        coefficients(B_old),
        coefficients(C_old),
        coefficients(P_old),
    )
    old_gap = h(pp_old, 2) - h(bb_old, 1)
    touched_count = bb_old[1] - cc_old[1]
    assert old_gap == Fraction(-1544450, 59)
    assert touched_count == 319 > sp.degree(B_old, x) == 3

    census = ROOT / "pgc_all_forest_polynomials_n16_20260726.json"
    census_data = json.loads(census.read_text(encoding="utf-8"))
    assert census_data["status"] == "PASS_NOT_PROOF"
    assert census_data["coverage"]["pair_instances"] == 332799
    assert census_data["coverage"]["rank_checks"] == 1511925
    assert census_data["failure"] is None
    assert sha256(census) == (
        "A1CA67D843BAB10D95DC0DC4A924A8E26C25466633F26FAFA6177677EB9C837A"
    )

    report = {
        "status": "PASS_EXACT_REDUCTION_AND_FOREST_NOGOS_NOT_PGC_PROOF",
        "six_scalar_identity": scalar_identity,
        "two_rooted_K1_2": {
            "marked_count_rank_2": coefficients(m2, y),
            "discriminant": int(sp.discriminant(m2, y)),
            "ultra_log_concavity_check": "16 < 24",
            "root_covariance": str(covariance),
            "marked_count_variance": str(variance_j),
            "sum_marginal_variances": str(variance_sum),
            "pendant_rows": two_data,
        },
        "four_edges_plus_K1_8": {
            "marked_count_rank_5": coefficients(m5, y),
            "ordinary_log_concavity_failure": "12^2=144 < 150*1",
            "pendant_rows": mixed_data,
        },
        "retained_nested_pf_nogo": {
            "B": bb_old,
            "C": cc_old,
            "P": pp_old,
            "pgc_gap": str(old_gap),
            "required_touched_components": touched_count,
            "degree_B": int(sp.degree(B_old, x)),
            "component_separated_obstruction": "b1-c1=319 > degree(B)=3",
        },
        "finite_forest_evidence": {
            "artifact": census.name,
            "sha256": sha256(census),
            "pair_instances": census_data["coverage"]["pair_instances"],
            "rank_checks": census_data["coverage"]["rank_checks"],
            "failure": None,
            "scope": "finite evidence only",
        },
        "conclusion": (
            "Canonical conditioning destroys naive component variance "
            "tensorization, and marked-root rows need not be ULC or LC. "
            "The surviving PGC target is the coupled zero-atom inequality E_k>=0."
        ),
    }
    output = ROOT / "component_root_occupation_polarization_exact_20260813.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(output.name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
