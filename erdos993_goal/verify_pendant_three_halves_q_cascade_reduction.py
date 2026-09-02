#!/usr/bin/env python3
"""Verify the pendant Q-cascade algebra, cutoff reduction, and scan outputs.

This verifier does not assume or prove Q-Cascade.  It proves that the
stated inequality would resolve the forest conjecture once combined with
the separately certified rank-three base.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


def q_reserve(poly, rank):
    def coeff(index):
        return poly[index] if 0 <= index < len(poly) else 0

    return (
        2 * rank * coeff(rank) ** 2
        - coeff(rank - 1) * coeff(rank)
        - 2
        * (rank + 1)
        * coeff(rank - 1)
        * coeff(rank + 1)
    )


def symbolic_identities() -> None:
    k = sp.symbols("k", integer=True, positive=True)
    pm, p, pp = sp.symbols("p_minus p p_plus", positive=True)
    G = k * p**2 + pm * p - (k + 1) * pm * pp
    Q = 2 * k * p**2 - pm * p - 2 * (k + 1) * pm * pp
    H = k * G / pm
    K = k * Q / pm
    assert sp.expand(K - (2 * H - 3 * k * p)) == 0

    # Residual-slack identity.  sigma=G/(pm*p),
    # E[e]=k*p/pm, and S_Q=E[e](sigma-3/2).
    sigma = G / (pm * p)
    mean_extensions = k * p / pm
    slack = sp.factor(mean_extensions * (sigma - sp.Rational(3, 2)))
    assert sp.simplify(slack - k * Q / (2 * pm**2)) == 0
    assert sp.simplify(K - 2 * pm * slack) == 0

    # Exact law-of-total-variance form of the cascade.
    class_weight, total_count = sp.symbols(
        "class_weight total_count", positive=True
    )
    slack_absent, slack_present, mean_gap = sp.symbols(
        "slack_absent slack_present mean_gap", real=True
    )
    slack_mixture = (
        class_weight * slack_absent
        + (1 - class_weight) * slack_present
        - class_weight * (1 - class_weight) * mean_gap**2
    )
    present_count = (1 - class_weight) * total_count
    absent_count = class_weight * total_count
    mixture_difference = sp.expand(
        2 * total_count * slack_mixture
        - 2 * present_count * slack_present
    )
    assert sp.expand(
        mixture_difference
        - 2
        * absent_count
        * (
            slack_absent
            - (1 - class_weight) * mean_gap**2
        )
    ) == 0

    slack_t, pi, root_absence, covariance = sp.symbols(
        "slack_t pi root_absence covariance", real=True
    )
    # e_A=e_T+J and q_A=q_T+I.
    absent_increment = (
        2 * pi
        + sp.Rational(1, 2) * root_absence
        - root_absence * (1 - root_absence)
        - 2 * covariance
    )
    expected_absent = (
        slack_t
        + 2 * pi
        - sp.Rational(1, 2) * root_absence
        + root_absence**2
        - 2 * covariance
    )
    assert sp.expand(slack_t + absent_increment - expected_absent) == 0

    # Clearing the cascade denominators.
    fm, gm, qg, qf = sp.symbols(
        "f_km2 g_km1 Q_g Q_f", positive=True
    )
    left_scaled = k * qg / gm
    right_scaled = (k - 1) * qf / fm
    cleared = sp.factor(
        gm * fm * (left_scaled - right_scaled)
    )
    assert sp.expand(cleared - (k * fm * qg - (k - 1) * gm * qf)) == 0

    # Exact compensation identity with T=G-leaf and F=G-{leaf,p}.
    am, a, ap, bmm, bm, bp = sp.symbols(
        "a_minus a a_plus b_minusminus b_minus b", positive=True
    )
    g_minus = a + bmm
    g_here = ap + bm
    g_plus = sp.symbols("g_plus", positive=True)
    # g_{k+1}=a_{k+1}+b_k; here ap is a_k in zero-based rank
    # notation below, so use a separate a_next.
    a_next = sp.symbols("a_next", positive=True)
    g_here = ap + bm
    g_plus = a_next + bp
    q_g = (
        2 * k * g_here**2
        - g_minus * g_here
        - 2 * (k + 1) * g_minus * g_plus
    )
    q_f = (
        2 * (k - 1) * bm**2
        - bmm * bm
        - 2 * k * bmm * bp
    )
    cascade = sp.expand(
        k * bmm * q_g - (k - 1) * g_minus * q_f
    )
    # In the note's notation a=i_{k-1}(T), a^+=i_k(T).
    lam = a * bm + bm**2 + 2 * k * (ap * bm - a * bp)
    mean_gap = bmm * (k * ap + bm) - (k - 1) * bm * a
    pi = bmm * (a + bmm) * lam - mean_gap**2
    pi_q = 2 * pi - 3 * a * bmm * (a + bmm) * bm
    q_t = (
        2 * k * ap**2
        - a * ap
        - 2 * (k + 1) * a * a_next
    )
    assert sp.expand(
        a * cascade - pi_q - k * bmm * (a + bmm) * q_t
    ) == 0

    s, u, v, w = sp.symbols("s u v w", positive=True)
    normalized_pi_q = sp.factor(
        pi_q.subs(
            {
                bm: s * a,
                bmm: (k - 1) * s * a / u,
                ap: v * a / k,
                bp: w * s * a / k,
            }
        )
        * u**2
        / (a**4 * s**2 * (k - 1))
    )
    theta_q = (
        2
        * (
            (u + (k - 1) * s) * (1 + s + 2 * (v - w))
            - (k - 1) * (v + s - u) ** 2
        )
        - 3 * (u + (k - 1) * s)
    )
    assert sp.expand(normalized_pi_q - theta_q) == 0

    y = sp.symbols("y", positive=True)
    q_t_normalized = sp.factor(
        q_t.subs(
            {
                ap: v * a / k,
                a_next: y * v * a / (k * (k + 1)),
            }
        )
        / a**2
    )
    assert sp.expand(q_t_normalized - v * (2 * v - 1 - 2 * y) / k) == 0
    same_rank = k * bmm * (a + bmm) * q_t
    normalized_four_fifths = sp.factor(
        (5 * pi_q + 4 * same_rank).subs(
            {
                bm: s * a,
                bmm: (k - 1) * s * a / u,
                ap: v * a / k,
                bp: w * s * a / k,
                a_next: y * v * a / (k * (k + 1)),
            }
        )
        * u**2
        / (a**4 * s * (k - 1))
    )
    expected_four_fifths = (
        5 * s * theta_q
        + 4
        * v
        * (u + (k - 1) * s)
        * (2 * v - 1 - 2 * y)
    )
    assert sp.expand(
        normalized_four_fifths - expected_four_fifths
    ) == 0
    normalized_one_third = sp.factor(
        (3 * pi_q + same_rank).subs(
            {
                bm: s * a,
                bmm: (k - 1) * s * a / u,
                ap: v * a / k,
                bp: w * s * a / k,
                a_next: y * v * a / (k * (k + 1)),
            }
        )
        * u**2
        / (a**4 * s * (k - 1))
    )
    expected_one_third = (
        3 * s * theta_q
        + v
        * (u + (k - 1) * s)
        * (2 * v - 1 - 2 * y)
    )
    assert sp.expand(
        normalized_one_third - expected_one_third
    ) == 0


def cutoff_audit(limit: int = 10000) -> None:
    for beta in range(1, limit + 1):
        alpha_g = beta + 1
        cutoff_g = (2 * alpha_g + 1) // 3
        cutoff_f = (2 * beta + 1) // 3
        assert cutoff_g == (2 * beta) // 3 + 1
        for rank in range(4, cutoff_g):
            assert 3 <= rank - 1 < cutoff_f


def output_audit() -> None:
    forest = json.loads(
        Path(
            "q_cascade_all_forest_polynomials_n17_20260727.json"
        ).read_text(encoding="utf-8")
    )
    assert forest["status"] == "PASS_NOT_PROOF"
    assert forest["failure"] is None
    assert forest["distinct_pendant_common_pairs"] == 866_379
    assert forest["checks"] == 2_542_945
    witness = forest["closest"]
    full = witness["full"]
    deletion = witness["deletion"]
    rank = witness["rank"]
    left = (
        rank
        * deletion[rank - 2]
        * q_reserve(full, rank)
    )
    right = (
        (rank - 1)
        * full[rank - 1]
        * q_reserve(deletion, rank - 1)
    )
    assert left == witness["left"] == 229_264
    assert right == witness["right"] == 214_020
    assert left - right == witness["difference"] == 15_244

    pattern = json.loads(
        Path(
            "patternboost60_three_halves_q_cascade_r3_20260727.json"
        ).read_text(encoding="utf-8")
    )
    assert pattern["status"] == "PASS_NOT_PROOF"
    assert pattern["failure"] is None
    assert pattern["records"] == 43_595
    assert pattern["attachments"] == 130_785
    assert pattern["checks"] == 2_223_348

    galvin = json.loads(
        Path(
            "galvin_three_halves_q_cascade_t20_m100_20260727.json"
        ).read_text(encoding="utf-8")
    )
    assert galvin["status"] == "PASS_NOT_PROOF"
    assert galvin["failure"] is None
    assert galvin["cases"] == 1_900
    assert galvin["checks"] == 760_004

    local = json.loads(
        Path(
            "three_halves_q_cascade_n15_local_20260727.json"
        ).read_text(encoding="utf-8")
    )
    local_failure = local["first_local_q_payment_failure"]
    assert local_failure["local_q_payment"] == -13_160
    assert local_failure["left"] == 56_100
    assert local_failure["right"] == 30_627
    assert local_failure["difference"] == 25_473

    refined = json.loads(
        Path(
            "q_cascade_all_forest_polynomials_n17_four_fifths_20260727.json"
        ).read_text(encoding="utf-8")
    )
    assert refined["first_four_fifths_failure"] is None
    assert refined["first_negative_same_rank_payment"] is None
    assert refined["first_cutoff_q_failure"] is None
    assert refined["cutoff_q_checks"] == 156_512
    payment = refined["largest_compensation_ratio"]
    assert payment["local_q_payment"] == -2_019_332
    assert payment["same_rank_q_payment"] == 2_583_360
    from fractions import Fraction

    ratio = Fraction(
        -payment["local_q_payment"],
        payment["same_rank_q_payment"],
    )
    assert ratio == Fraction(504833, 645840)
    assert ratio > Fraction(3, 4)
    assert ratio < Fraction(4, 5)

    one_third = json.loads(
        Path(
            "q_cascade_all_forest_polynomials_"
            "n17_one_third_exact_20260727.json"
        ).read_text(encoding="utf-8")
    )
    assert one_third["status"] == "PASS_NOT_PROOF"
    assert one_third["failure"] is None
    assert (
        one_third["first_one_third_failure_above_rank_four"]
        is None
    )
    assert one_third["first_negative_same_rank_payment"] is None
    assert one_third["distinct_pendant_common_pairs"] == 866_379
    assert one_third["checks"] == 2_542_945
    rank_six = one_third["compensation_witness_by_rank"]["6"]
    rank_six_ratio = Fraction(
        rank_six["ratio_numerator"],
        rank_six["ratio_denominator"],
    )
    assert rank_six_ratio == Fraction(1_670_647, 5_022_327)
    assert rank_six_ratio < Fraction(1, 3)
    assert (
        Fraction(1, 3) - rank_six_ratio
        == Fraction(3_462, 5_022_327)
    )
    assert (
        3 * rank_six["local_q_payment"]
        + rank_six["same_rank_q_payment"]
        == 83_752_704
    )

    pattern_one_third = json.loads(
        Path(
            "patternboost60_three_halves_q_cascade_"
            "one_third_r3_20260727.json"
        ).read_text(encoding="utf-8")
    )
    assert pattern_one_third["status"] == "PASS_NOT_PROOF"
    assert pattern_one_third["failure"] is None
    assert (
        pattern_one_third[
            "first_one_third_failure_above_rank_four"
        ]
        is None
    )
    assert pattern_one_third["records"] == 43_595
    assert pattern_one_third["attachments"] == 130_785
    assert pattern_one_third["checks"] == 2_223_348


def main() -> int:
    symbolic_identities()
    cutoff_audit()
    output_audit()
    print("pendant three-halves Q-cascade reduction: PASS")
    print("cutoff cases beta<=10000: PASS")
    print("exhaustive forest-product ranks: 2,542,945")
    print("PatternBoost sampled-root ranks: 2,223,348")
    print("Galvin-family ranks: 760,004")
    print("mixed rank-4/rank>=5 payment package: PASS_NOT_PROOF")
    print("Q-Cascade itself remains conjectural")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
