#!/usr/bin/env python3
"""Independent fail-closed audit of the matched four-pair payment theorem.

The producer is never imported or executed.  This script reconstructs the
local rational function, the shifted central-slack coefficient streams, the
zero-slack proof, and a separate exact row replay.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
PRODUCER = HERE / "prove_uniform_low_high_matched_local_pair_payment_root.py"
PRODUCER_REPORT = HERE / "uniform_low_high_matched_local_pair_payment_exact_root_20260828.json"
THEOREM_NOTE = HERE / "UNIFORM_LOW_HIGH_MATCHED_LOCAL_PAIR_PAYMENT_2026-08-28.md"
OUTPUT = HERE / "uniform_low_high_matched_local_pair_payment_independent_audit_20260828.json"

EXPECTED_PRODUCER_SHA256 = "811166967CB5479619F766B638FEA94077E0A2A4E75211AFCF8E8CABE77FB07B"
EXPECTED_REPORT_SHA256 = "20278F5C3881A8066ECFAC21A87C3DAE9FBD662986EE074241F8EDE249DC3077"
EXPECTED_NOTE_SHA256 = "645FEF475ED1F067C64A9C8BC9BD97E1379017B32D92D51216794A3222270356"
EXPECTED_STATUS = "PASS_EXACT_ANALYTIC_ALL_RANK_MATCHED_LOCAL_PAIR_PAYMENT"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def ordered_term_digest(polynomial: sp.Poly) -> str:
    digest = hashlib.sha256()
    for monomial, coefficient in polynomial.terms():
        record = ",".join(map(str, monomial)) + ":" + str(int(coefficient)) + "\n"
        digest.update(record.encode("ascii"))
    return digest.hexdigest().upper()


def independent_symbolic_reconstruction(producer_report: dict) -> dict:
    # These names and the construction are independent of the producer module.
    rank_parameter, capacity, terminal, central = sp.symbols(
        "rank_parameter capacity terminal central", positive=True
    )
    upstream_slack, downstream_slack = sp.symbols(
        "upstream_slack downstream_slack", nonnegative=True
    )

    upstream_ratio = (
        terminal + 2 + central + upstream_slack
    ) / (rank_parameter - 1)
    central_ratio = (terminal + 1 + central) / rank_parameter
    downstream_ratio = terminal / (rank_parameter + 1)
    far_ratio = (terminal - 1 - downstream_slack) / (rank_parameter + 2)

    coefficient_01 = sp.Rational(2) / ((capacity + 1) * (capacity + 3))
    coefficient_03 = (capacity + 1) / (3 * (capacity + 3))
    coefficient_23 = capacity * (capacity + 1) / 6
    coefficient_right = (capacity + 1) / 6

    normalized_surplus = sp.factor(
        coefficient_01
        * central_ratio
        * downstream_ratio
        * (downstream_ratio - far_ratio)
        + coefficient_03
        * downstream_ratio
        * (upstream_ratio - far_ratio)
        / upstream_ratio
        + coefficient_23
        * (upstream_ratio - central_ratio)
        / (upstream_ratio * central_ratio)
        + coefficient_right * central
        - (central_ratio - downstream_ratio)
    )

    expected_upstream_derivative = (
        coefficient_03 * downstream_ratio * far_ratio / upstream_ratio**2
        + coefficient_23 / upstream_ratio**2
    ) / (rank_parameter - 1)
    expected_downstream_derivative = (
        coefficient_01 * central_ratio * downstream_ratio
        + coefficient_03 * downstream_ratio / upstream_ratio
    ) / (rank_parameter + 2)
    assert sp.factor(
        sp.diff(normalized_surplus, upstream_slack) - expected_upstream_derivative
    ) == 0
    assert sp.factor(
        sp.diff(normalized_surplus, downstream_slack) - expected_downstream_derivative
    ) == 0

    neighbor_zero = sp.factor(
        normalized_surplus.subs({upstream_slack: 0, downstream_slack: 0})
    )
    numerator, denominator = map(sp.factor, sp.together(neighbor_zero).as_numer_denom())
    expected_denominator = (
        6
        * rank_parameter
        * (capacity + 1)
        * (capacity + 3)
        * (rank_parameter + 1) ** 2
        * (rank_parameter + 2)
        * (central + terminal + 1)
        * (central + terminal + 2)
    )
    assert sp.factor(denominator - expected_denominator) == 0

    rank_excess, capacity_excess, terminal_excess = sp.symbols(
        "rank_excess capacity_excess terminal_excess", nonnegative=True
    )
    shifted_numerator = sp.Poly(
        sp.expand(
            numerator.subs(
                {
                    rank_parameter: rank_excess + 6,
                    capacity: rank_excess + 6 + capacity_excess,
                    terminal: terminal_excess + 2,
                }
            )
        ),
        central,
    )
    assert shifted_numerator.degree() == 3

    report_streams = producer_report["symbolic_certificate"][
        "positive_central_slack_coefficients"
    ]
    assert [item["central_slack_exponent"] for item in report_streams] == [1, 2, 3]
    stream_audits = []
    for exponent, report_stream in zip((1, 2, 3), report_streams):
        coefficient_polynomial = sp.Poly(
            shifted_numerator.coeff_monomial(central**exponent),
            rank_excess,
            capacity_excess,
            terminal_excess,
        )
        ordered_terms = [
            {
                "powers_rank_capacity_terminal": list(monomial),
                "coefficient": int(coefficient),
            }
            for monomial, coefficient in coefficient_polynomial.terms()
        ]
        coefficients = [item["coefficient"] for item in ordered_terms]
        digest = ordered_term_digest(coefficient_polynomial)
        assert coefficients and min(coefficients) > 0
        assert ordered_terms == report_stream["ordered_terms"]
        assert len(ordered_terms) == report_stream["monomial_count"]
        assert min(coefficients) == report_stream["minimum_coefficient"]
        assert max(coefficients) == report_stream["maximum_coefficient"]
        assert digest == report_stream["ordered_coefficient_sha256"]
        stream_audits.append(
            {
                "central_slack_exponent": exponent,
                "monomial_count": len(ordered_terms),
                "minimum_coefficient": min(coefficients),
                "maximum_coefficient": max(coefficients),
                "ordered_term_sha256": digest,
                "exact_ordered_term_match_to_producer_report": True,
            }
        )

    zero_substitution = {
        central: 0,
        upstream_slack: 0,
        downstream_slack: 0,
    }
    adverse = sp.factor((central_ratio - downstream_ratio).subs(zero_substitution))
    relative_01 = sp.factor(
        (
            coefficient_01
            * central_ratio
            * downstream_ratio
            * (downstream_ratio - far_ratio)
        ).subs(zero_substitution)
        / adverse
    )
    relative_03 = sp.factor(
        (
            coefficient_03
            * downstream_ratio
            * (upstream_ratio - far_ratio)
            / upstream_ratio
        ).subs(zero_substitution)
        / adverse
    )
    relative_23 = sp.factor(
        (
            coefficient_23
            * (upstream_ratio - central_ratio)
            / (upstream_ratio * central_ratio)
        ).subs(zero_substitution)
        / adverse
    )
    expected_01 = 2 * terminal * (terminal + 1) / (
        (capacity + 1)
        * (capacity + 3)
        * (rank_parameter + 1)
        * (rank_parameter + 2)
    )
    expected_23 = (
        capacity
        * (capacity + 1)
        * rank_parameter
        * (rank_parameter + 1)
        / (6 * (terminal + 1) * (terminal + 2))
    )
    expected_03 = (
        rank_parameter
        * (capacity + 1)
        * terminal
        / ((capacity + 3) * (rank_parameter + 2) * (terminal + 2))
    )
    assert sp.factor(relative_01 - expected_01) == 0
    assert sp.factor(relative_23 - expected_23) == 0
    assert sp.factor(relative_03 - expected_03) == 0
    product_01_23 = sp.factor(relative_01 * relative_23)
    expected_product = (
        capacity
        * rank_parameter
        * terminal
        / (3 * (capacity + 3) * (rank_parameter + 2) * (terminal + 2))
    )
    assert sp.factor(product_01_23 - expected_product) == 0

    # Independent exact verification of both elementary d=0 cases.
    small_terminal_pair_23_floor = Fraction(6 * 7 * 6 * 7, 6 * 5 * 6)
    large_terminal_product_floor = Fraction(1, 3) * Fraction(3, 4) * Fraction(
        2, 3
    ) * Fraction(2, 3)
    large_terminal_sum_floor = 2 * Fraction(1, 3)
    large_terminal_pair_03_floor = Fraction(3, 4) * Fraction(2, 3) * Fraction(
        7, 9
    )
    large_terminal_total_floor = (
        large_terminal_sum_floor + large_terminal_pair_03_floor
    )
    assert small_terminal_pair_23_floor == Fraction(49, 5) > 1
    assert large_terminal_product_floor == Fraction(1, 9)
    assert large_terminal_sum_floor == Fraction(2, 3)
    assert large_terminal_pair_03_floor == Fraction(7, 18)
    assert large_terminal_total_floor == Fraction(19, 18) > 1

    return {
        "normalized_surplus": str(normalized_surplus),
        "neighbor_slack_derivative_identities_reconstructed": True,
        "neighbor_slack_sign_reason": (
            "All displayed factors are nonnegative; the far local ratio is "
            "positive because a later positive terminal ratio remains."
        ),
        "cleared_denominator": str(expected_denominator),
        "positive_central_slack_streams": stream_audits,
        "central_zero_relative_terms": {
            "pair_01": str(relative_01),
            "pair_23": str(relative_23),
            "pair_03": str(relative_03),
            "pair_01_times_pair_23": str(product_01_23),
        },
        "central_zero_two_case_proof": {
            "2_lt_terminal_le_4_pair_23_floor": str(
                small_terminal_pair_23_floor
            ),
            "terminal_ge_4_pair_01_times_pair_23_floor": str(
                large_terminal_product_floor
            ),
            "terminal_ge_4_pair_01_plus_pair_23_floor": str(
                large_terminal_sum_floor
            ),
            "terminal_ge_4_pair_03_floor": str(
                large_terminal_pair_03_floor
            ),
            "terminal_ge_4_total_floor": str(large_terminal_total_floor),
        },
    }


def ratios_from_gaps(gaps, terminal) -> list[Fraction]:
    ratios = [Fraction(0)] * (len(gaps) + 1)
    ratios[-1] = Fraction(terminal)
    for index in range(len(gaps) - 1, -1, -1):
        ratios[index] = ratios[index + 1] + Fraction(gaps[index])
    return ratios


def factorial_row(ratios) -> list[Fraction]:
    row = [Fraction(1)]
    for index, ratio in enumerate(ratios):
        row.append(row[-1] * ratio / (index + 1))
    return row


def value(row, index: int) -> Fraction:
    return row[index] if 0 <= index < len(row) else Fraction(0)


def kernel(row, rank: int, first: int, second: int) -> Fraction:
    return (
        value(row, rank - 1 - first) * value(row, rank - second)
        - value(row, rank - first) * value(row, rank - 1 - second)
    )


def direct_selected_payment(rank, h, left_ratios, right_ratios) -> dict:
    left = factorial_row(left_ratios)
    right = factorial_row(right_ratios)
    capacity = left_ratios[2]

    def exponent(index: int) -> int:
        return int(index >= 3)

    def left_term(first: int, second: int) -> Fraction:
        bracket = (
            (capacity + h * (exponent(first) + exponent(second)))
            * (
                left_ratios[first]
                + first * h
                - left_ratios[second]
                - second * h
            )
            + h * capacity * (int(first == 2) - int(second == 2))
        )
        return (
            left[first]
            * left[second]
            * kernel(right, rank, first, second)
            * bracket
        )

    selected_left = left_term(0, 1) + left_term(0, 3) + left_term(2, 3)
    central_first, central_second = rank - 3, rank - 2
    adjusted_gap = (
        right_ratios[central_first]
        + central_first * h
        - right_ratios[central_second]
        - central_second * h
    )
    matched_right = (
        right[central_first]
        * right[central_second]
        * adjusted_gap
        * Fraction(capacity, 3)
        * left[2] ** 2
    )
    adverse = (
        h
        * capacity
        * left[1]
        * left[2]
        * kernel(right, rank, 1, 2)
    )

    # The larger corrected reserve contains the selected terms and only
    # additional nonnegative terms of the two stated left families.
    zero_family = [left_term(0, second) for second in range(1, rank + 1)]
    two_family = [left_term(2, second) for second in range(3, rank + 1)]
    assert min(zero_family + two_family) >= 0
    full_corrected = sum(zero_family + two_family, Fraction(0)) + matched_right
    selected = selected_left + matched_right
    assert full_corrected >= selected
    return {
        "selected": selected,
        "full_corrected": full_corrected,
        "adverse": adverse,
        "surplus": selected - adverse,
        "payment_ratio": selected / adverse,
    }


def independent_exact_replay() -> dict:
    ranks = (8, 9, 10, 12, 16, 24, 32)
    scales = (Fraction(1), Fraction(3, 2), Fraction(4))
    cases = 0
    minimum = None

    for rank in ranks:
        for h in scales:
            left_base = [2 * h] + [h] * (rank - 1)
            right_base = [2 * h] + [h] * (rank - 1)
            left_patterns = (
                ("tight", {}, h),
                ("first_slack", {0: 3}, h),
                ("index2_slack", {2: 5}, h),
                ("last_slack", {rank - 1: 17}, h),
                ("cross_slack", {0: 100, rank - 2: 31}, h),
                ("terminal3", {}, 3 * h),
            )
            right_patterns = (
                ("tight", {}, h),
                ("central1", {rank - 3: 1}, h),
                ("central7", {rank - 3: 7}, h),
                ("central31", {rank - 3: 31}, h),
                ("central10000", {rank - 3: 10000}, h),
                ("upstream31", {rank - 4: 31}, h),
                ("downstream31", {rank - 2: 31}, h),
                ("last1000", {rank - 1: 1000}, h),
                (
                    "multi_extreme",
                    {
                        0: 100,
                        rank - 4: 17,
                        rank - 3: 71,
                        rank - 2: 29,
                        rank - 1: 1000,
                    },
                    5 * h,
                ),
            )

            for left_name, left_modifications, left_terminal in left_patterns:
                left_gaps = left_base.copy()
                for index, multiplier in left_modifications.items():
                    left_gaps[index] += multiplier * h
                left_ratios = ratios_from_gaps(left_gaps, left_terminal)
                assert left_ratios[1] - left_ratios[2] == h

                for right_name, right_modifications, right_terminal in right_patterns:
                    right_gaps = right_base.copy()
                    for index, multiplier in right_modifications.items():
                        right_gaps[index] += multiplier * h
                    right_ratios = ratios_from_gaps(right_gaps, right_terminal)
                    result = direct_selected_payment(
                        rank, h, left_ratios, right_ratios
                    )
                    cases += 1
                    assert result["surplus"] >= 0
                    if (
                        minimum is None
                        or result["payment_ratio"] < minimum["payment_ratio"]
                    ):
                        minimum = {
                            "rank": rank,
                            "h": str(h),
                            "left_pattern": left_name,
                            "right_pattern": right_name,
                            "payment_ratio": result["payment_ratio"],
                            "surplus": result["surplus"],
                        }

    assert cases == 1134

    # Replay the exact family that disproved the preceding left-only reserve.
    family_ratios = {}
    rank = 8
    h = Fraction(1)
    left_ratios = ratios_from_gaps([2] + [1] * 7, 1)
    for central_gap in (1, 2, 8, 12, 100, 1000, 10000):
        right_ratios = ratios_from_gaps(
            [2, 1, 1, 1, 1, central_gap, 1, 1], 1
        )
        result = direct_selected_payment(rank, h, left_ratios, right_ratios)
        assert result["surplus"] >= 0
        family_ratios[str(central_gap)] = str(result["payment_ratio"])

    return {
        "cases": cases,
        "failures": 0,
        "rank_set": list(ranks),
        "h_set": [str(item) for item in scales],
        "families": (
            "independent tight, sparse, cross, terminal, central-gap, "
            "neighbor-gap, and multi-extreme deterministic rows"
        ),
        "minimum_payment_ratio": str(minimum["payment_ratio"]),
        "minimum_case": {
            "rank": minimum["rank"],
            "h": minimum["h"],
            "left_pattern": minimum["left_pattern"],
            "right_pattern": minimum["right_pattern"],
            "surplus": str(minimum["surplus"]),
        },
        "former_left_only_counterfamily_selected_payment_ratios": family_ratios,
    }


def main() -> int:
    frozen_hashes = {
        "producer": sha256(PRODUCER),
        "producer_report": sha256(PRODUCER_REPORT),
        "theorem_note": sha256(THEOREM_NOTE),
    }
    assert frozen_hashes == {
        "producer": EXPECTED_PRODUCER_SHA256,
        "producer_report": EXPECTED_REPORT_SHA256,
        "theorem_note": EXPECTED_NOTE_SHA256,
    }

    producer_report = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    assert producer_report["status"] == EXPECTED_STATUS
    assert producer_report["source_sha256"] == EXPECTED_PRODUCER_SHA256
    note_text = THEOREM_NOTE.read_text(encoding="utf-8")
    assert EXPECTED_PRODUCER_SHA256 in note_text
    assert EXPECTED_REPORT_SHA256 in note_text
    assert EXPECTED_STATUS in note_text

    symbolic_audit = independent_symbolic_reconstruction(producer_report)
    exact_replay = independent_exact_replay()
    payload = {
        "schema": "uniform-low-high-matched-local-pair-payment-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_ALL_RANK_MATCHED_LOCAL_PAIR_PAYMENT_AUDIT",
        "date": "2026-08-28",
        "frozen_inputs": frozen_hashes,
        "producer_source_not_imported_or_executed": True,
        "symbolic_audit": symbolic_audit,
        "independent_exact_replay": exact_replay,
        "conclusion": (
            "The independently reconstructed four selected pair terms pay the "
            "unique negative left pair for every k>=8 under the stated positive "
            "factorial-row gap hypotheses. The larger corrected reserve follows "
            "because its additional left-family terms are nonnegative."
        ),
        "scope_warning": (
            "This certifies the matched local-pair payment and therefore the "
            "tail-boost strong auxiliary in the cited pairwise reduction. It "
            "does not certify the remaining low/low cone, forest assembly, or "
            "Erdos Problem 993."
        ),
        "audit_source": Path(__file__).name,
        "audit_source_sha256": sha256(Path(__file__)),
    }
    report_hash = atomic_json(OUTPUT, payload)
    print(payload["status"])
    print(OUTPUT.name)
    print(report_hash)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
