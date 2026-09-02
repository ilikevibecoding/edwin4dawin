#!/usr/bin/env python3
"""Exact replay for the direct-PGC real-rooted no-go and dependency audit.

This does not test a forest counterexample.  It proves that even the abstract
pendant relation P=A+xQ, with A, P, and Q all PF-infinity and Q strictly
interlacing P, does not imply the PGC margin H_2(P)>=H_1(Q).
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "direct_pgc_real_rooted_nogo_exact_20260813.json"
X = sp.symbols("x")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coefficient_list(polynomial: sp.Expr) -> list[Fraction]:
    poly = sp.Poly(sp.expand(polynomial), X, domain=sp.QQ)
    return [
        Fraction(poly.nth(index))
        for index in range(poly.degree() + 1)
    ]


def reserve(coefficients: list[Fraction], rank: int) -> Fraction:
    def coeff(index: int) -> Fraction:
        if 0 <= index < len(coefficients):
            return coefficients[index]
        return Fraction(0)

    return (
        rank * coeff(rank) ** 2
        + coeff(rank - 1) * coeff(rank)
        - (rank + 1) * coeff(rank - 1) * coeff(rank + 1)
    )


def h_value(coefficients: list[Fraction], rank: int) -> Fraction:
    return rank * reserve(coefficients, rank) / coefficients[rank - 1]


def fraction_string(value: Fraction) -> str:
    return str(value.numerator) if value.denominator == 1 else str(value)


def main() -> int:
    # New exact integer no-go.  The two quadratic factors supply the
    # widely separated outer roots while preserving integer coefficients.
    p = (1 + 400 * X + 2 * X**2) * (1 + 2 * X) * (1 + 8 * X)
    q = (1 + 380 * X + 4 * X**2) * (1 + 7 * X)
    a = sp.expand(p - X * q)

    p_coefficients = coefficient_list(p)
    q_coefficients = coefficient_list(q)
    a_coefficients = coefficient_list(a)
    assert sp.expand(p - a - X * q) == 0
    assert all(value > 0 for value in a_coefficients)

    # The quadratic discriminants are positive, so the displayed
    # factorizations make P and Q PF-infinity.  Exact Sturm counts locate
    # their quadratic roots in strictly alternating rational intervals.
    p_poly = sp.Poly(sp.expand(p), X, domain=sp.ZZ)
    q_poly = sp.Poly(sp.expand(q), X, domain=sp.ZZ)
    p_quadratic = 2 * X**2 + 400 * X + 1
    q_quadratic = 4 * X**2 + 380 * X + 1
    interlacing_entries = [
        ("P", Fraction(-200), Fraction(-199), p_quadratic),
        ("Q", Fraction(-95), Fraction(-94), q_quadratic),
        ("P", Fraction(-1, 2), Fraction(-1, 2), 2 * X + 1),
        ("Q", Fraction(-1, 7), Fraction(-1, 7), 7 * X + 1),
        ("P", Fraction(-1, 8), Fraction(-1, 8), 8 * X + 1),
        ("Q", Fraction(-1, 379), Fraction(-1, 380), q_quadratic),
        ("P", Fraction(-1, 399), Fraction(-1, 400), p_quadratic),
    ]
    for label, lower, upper, factor in interlacing_entries:
        if lower == upper:
            assert sp.expand(factor).subs(
                X, sp.Rational(lower.numerator, lower.denominator)
            ) == 0
        else:
            assert int(
                sp.count_roots(
                    factor,
                    sp.Rational(lower.numerator, lower.denominator),
                    sp.Rational(upper.numerator, upper.denominator),
                )
            ) == 1
    for left, right in zip(interlacing_entries, interlacing_entries[1:]):
        assert left[2] < right[1]
    assert "".join(item[0] for item in interlacing_entries) == "PQPQPQP"

    a_integer = sp.Poly(a, X, domain=sp.ZZ)
    assert a_integer.as_expr() == (
        4 * X**4
        + 3756 * X**3
        + 3631 * X**2
        + 409 * X
        + 1
    )
    isolating_intervals = [
        (Fraction(-939), Fraction(-938)),
        (Fraction(-1), Fraction(-4, 5)),
        (Fraction(-13, 100), Fraction(-3, 25)),
        (Fraction(-3, 1000), Fraction(-1, 500)),
    ]
    interval_counts = []
    for lower, upper in isolating_intervals:
        count = int(
            sp.count_roots(
                a_integer.as_expr(),
                sp.Rational(lower.numerator, lower.denominator),
                sp.Rational(upper.numerator, upper.denominator),
            )
        )
        assert count == 1
        interval_counts.append(
            {
                "lower": fraction_string(lower),
                "upper": fraction_string(upper),
                "root_count": count,
            }
        )
    assert sum(item["root_count"] for item in interval_counts) == 4
    # All coefficients are positive and all four roots lie in negative
    # intervals, so A is PF-infinity as well.

    hp = h_value(p_coefficients, 2)
    hq = h_value(q_coefficients, 1)
    margin = hp - hq
    assert hp == Fraction(635108, 5)
    assert hq == Fraction(144828)
    assert margin == Fraction(-89032, 5)
    assert margin < 0
    degree = len(p_coefficients) - 1
    cutoff = (2 * degree + 1) // 3
    assert cutoff == 3 and 2 < cutoff

    # An independence polynomial with linear coefficient n coming from a
    # forest has i_2=C(n,2)-e >= C(n-1,2), since e<=n-1.  Thus the integer
    # rows are provably abstract rather than unrecognized forest rows.
    forest_pair_lower_bounds = {
        "P": (p_coefficients[2], Fraction(410 * 409 // 2 - 409)),
        "Q": (q_coefficients[2], Fraction(387 * 386 // 2 - 386)),
        "A": (a_coefficients[2], Fraction(409 * 408 // 2 - 408)),
    }
    for actual, lower_bound in forest_pair_lower_bounds.values():
        assert actual < lower_bound

    # Preserve and independently replay the wave-3 PF-convolution no-go.
    old_a = (1 + X / 3) ** 3
    old_q = (1 + 2 * X) * (1 + 3 * X)
    old_p = sp.expand(old_a + X * old_q)
    old_p_plus = sp.expand((1 + X) * old_p)
    old_q_plus = sp.expand((1 + X) * old_q)
    old_margin_2 = h_value(coefficient_list(old_p), 2) - h_value(
        coefficient_list(old_q), 1
    )
    old_margin_3 = h_value(coefficient_list(old_p), 3) - h_value(
        coefficient_list(old_q), 2
    )
    old_lifted_margin_2 = h_value(coefficient_list(old_p_plus), 2) - h_value(
        coefficient_list(old_q_plus), 1
    )
    assert old_margin_2 == Fraction(40, 3)
    assert old_margin_3 == Fraction(83837, 2160)
    assert old_lifted_margin_2 == Fraction(-50, 27)

    # Replay the durable exact finite forest census without rerunning the
    # expensive enumeration.  This is evidence only, never a theorem.
    census_path = HERE / "pgc_all_forest_polynomials_n16_20260726.json"
    census = json.loads(census_path.read_text(encoding="utf-8"))
    assert census["status"] == "PASS_NOT_PROOF"
    assert census["failure"] is None
    assert census["terminal_failure"] is None
    assert census["coverage"]["unlabeled_trees"] == 32508
    assert census["coverage"]["pair_instances"] == 332799
    assert census["coverage"]["rank_checks"] == 1511925

    # Machine-check that the source notes still state hypotheses rather than
    # silently completed implications.
    protected_path = HERE / "PROTECTED_LEAF_PHASE_INDUCTION_REDUCTION_2026-07-29.md"
    lambda_path = HERE / "SHARP_MIXED_LAMBDA_BRIDGE_CANDIDATE_2026-07-29.md"
    wave3_path = HERE / "GLOBAL_PROOF_CHAIN_WAVE3_AUDIT_2026-08-13.md"
    protected_text = protected_path.read_text(encoding="utf-8")
    lambda_text = lambda_path.read_text(encoding="utf-8")
    wave3_text = wave3_path.read_text(encoding="utf-8")
    required_fragments = {
        protected_path.name: [
            "Assume (P1)--(P4)",
            "These computations do not prove (P1)--(P4)",
        ],
        lambda_path.name: [
            "not yet proved",
            "prove the sharp forest \\(\\Lambda\\) leaf recursion",
            "prove the sharp nested bridge increment",
            "prove the complete mixed bracket",
        ],
        wave3_path.name: [
            "Protected-to-PGC lemma",
            "This does not refute PGC for forests",
        ],
    }
    note_texts = {
        protected_path.name: protected_text,
        lambda_path.name: lambda_text,
        wave3_path.name: wave3_text,
    }
    for name, fragments in required_fragments.items():
        for fragment in fragments:
            assert fragment in note_texts[name], (name, fragment)

    report = {
        "status": "EXACT_ABSTRACT_NOGO_NOT_FOREST_COUNTEREXAMPLE",
        "claim": (
            "P=A+xQ with A,P,Q PF-infinity and Q strictly interlacing P "
            "does not imply the prefix PGC margin"
        ),
        "new_real_rooted_nogo": {
            "P_coefficients": [fraction_string(value) for value in p_coefficients],
            "Q_coefficients": [fraction_string(value) for value in q_coefficients],
            "A_coefficients": [fraction_string(value) for value in a_coefficients],
            "relation": "P=A+xQ",
            "strict_interlacing_isolators": [
                {
                    "row": label,
                    "lower": fraction_string(lower),
                    "upper": fraction_string(upper),
                }
                for label, lower, upper, _ in interlacing_entries
            ],
            "P_integer_polynomial": [int(p_poly.nth(j)) for j in range(5)],
            "Q_integer_polynomial": [int(q_poly.nth(j)) for j in range(4)],
            "A_integer_polynomial": [int(a_integer.nth(j)) for j in range(5)],
            "A_negative_root_intervals": interval_counts,
            "degree_P": degree,
            "prefix_cutoff": cutoff,
            "rank": 2,
            "H_2_P": fraction_string(hp),
            "H_1_Q": fraction_string(hq),
            "margin": fraction_string(margin),
            "margin_decimal": float(margin),
            "not_forest_witness": {
                name: {
                    "i_2": fraction_string(actual),
                    "forest_lower_bound_from_i_1": fraction_string(lower_bound),
                }
                for name, (actual, lower_bound) in forest_pair_lower_bounds.items()
            },
        },
        "preserved_pf_convolution_nogo": {
            "base_rank_2_margin": fraction_string(old_margin_2),
            "base_rank_3_margin": fraction_string(old_margin_3),
            "after_common_factor_1_plus_x_rank_2_margin": fraction_string(
                old_lifted_margin_2
            ),
        },
        "finite_forest_evidence_only": {
            "source": census_path.name,
            "sha256": sha256(census_path),
            "status": census["status"],
            "coverage": census["coverage"],
            "failure": census["failure"],
            "closest": census["closest"],
        },
        "protected_lambda_audit": {
            "verdict": "NO_PROVED_PROTECTED_TO_PGC_IMPLICATION",
            "open_obligations": [
                "P1--P4 including rank-four and collision variants",
                "sharp forest Lambda leaf recursion / deletion-fibre inequality",
                "sharp nested bridge increment",
                "complete mixed bracket",
                "explicit derivation from the protected conclusions to PGC",
            ],
            "source_sha256": {
                protected_path.name: sha256(protected_path),
                lambda_path.name: sha256(lambda_path),
                wave3_path.name: sha256(wave3_path),
            },
        },
        "scope": {
            "proves_PGC_for_forests": False,
            "is_forest_counterexample": False,
            "rules_out_generic_PF_or_real_rooted_or_interlacing_shortcut": True,
            "rules_out_forest_specific_injection_or_Markov_proof": False,
        },
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
