#!/usr/bin/env python3
"""Hash-pinned assembly of the complete abstract all-rank low/high cone.

This file only assembles the convolution-cone implication.  It does not
assert that any particular forest supplies the required ratio gaps.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_full_convolution_cone_assembler_root_20260828.json"

DEPENDENCIES = {
    "tail_assembler": (
        "assemble_uniform_low_high_tail_boost_convolution_root_20260828.py",
        "089B4908C20E562EC4D75BB208C0D975297BE2BE654F5D1BFDC56AC026D01370",
        None,
    ),
    "tail_report": (
        "uniform_low_high_tail_boost_convolution_assembler_root_20260828.json",
        "BCFCFF07F62D0E8CB967C76276246DDCB7C6DF6D8128749EB2C26CAA44944E53",
        "PASS_HASH_PINNED_EXACT_ALL_RANK_TAIL_BOOST_CONVOLUTION_THEOREM",
    ),
    "tail_note": (
        "UNIFORM_LOW_HIGH_TAIL_BOOST_CONVOLUTION_THEOREM_2026-08-28.md",
        "2A88990943F3376524D7B40552E56AEB3C1E6B5B88D92526A70FC3E3C6B64D4C",
        None,
    ),
    "tail_auditor": (
        "audit_uniform_low_high_tail_boost_convolution_assembler_independent_agent.py",
        "4BBE4380F89EB83735F3D54EDA413F3921172619FB2309CC3FF817FD8AE50968",
        None,
    ),
    "tail_audit": (
        "uniform_low_high_tail_boost_convolution_assembler_independent_audit_20260828.json",
        "BD40CB1656C95AC555D9825DE602E13D9CFBFED3201FA4D0A566A4D056AC04BA",
        "PASS_INDEPENDENT_HASH_PINNED_EXACT_ALL_RANK_TAIL_BOOST_CONVOLUTION_ASSEMBLY_AUDIT",
    ),
    "four_gap_assembler": (
        "assemble_uniform_low_high_four_gap_strong_boundary_root.py",
        "0C80172942E8A2DEE51C15EB806F65DDF2428CA206F806E6A0C892A6491F63D6",
        None,
    ),
    "four_gap_report": (
        "uniform_low_high_four_gap_strong_boundary_exact_root_20260827.json",
        "11631F3864D2A65CCED7BB8782DA940BC50AA5F2A4E2CD624023F4AD219F5D31",
        "PASS_EXACT_ALL_RANK_SIMULTANEOUS_LEFT_GAP01_RIGHT_GAP01_STRONG_BOUNDARY",
    ),
    "four_gap_auditor": (
        "audit_uniform_low_high_four_gap_low_chart_composite_independent_agent_four_gap_cache.py",
        "9B7B6EE881FA45E404D2468443ACC5F8A1AC02F6D912F336C7344C88F43082F4",
        None,
    ),
    "four_gap_audit": (
        "uniform_low_high_four_gap_low_chart_composite_independent_audit_agent_four_gap_cache.json",
        "BF19060573C24BB95F1DE759794023321616BFCC959619AC7BE86C5867F7A039",
        "PASS_INDEPENDENT_EXACT_FOUR_GAP_CACHE_AND_LOW_CHART_COMPOSITE_AUDIT",
    ),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def load_json(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def audit_dependencies() -> dict:
    rows = {}
    for label, (name, expected_hash, expected_status) in DEPENDENCIES.items():
        actual_hash = sha256(HERE / name)
        assert actual_hash == expected_hash, (label, actual_hash, expected_hash)
        row = {"path": name, "sha256": actual_hash}
        if expected_status is not None:
            report = load_json(name)
            assert report["status"] == expected_status, (label, report["status"])
            row["status"] = expected_status
        rows[label] = row

    tail = load_json(DEPENDENCIES["tail_report"][0])
    tail_audit = load_json(DEPENDENCIES["tail_audit"][0])
    assert tail["source_sha256"] == DEPENDENCIES["tail_assembler"][1]
    assert tail_audit["audit_source_sha256"] == DEPENDENCIES["tail_auditor"][1]
    assert tail_audit["frozen_inputs"] == {
        "assembler": DEPENDENCIES["tail_assembler"][1],
        "assembler_report": DEPENDENCIES["tail_report"][1],
        "theorem_note": DEPENDENCIES["tail_note"][1],
    }
    assert tail_audit["dependency_audit"]["transitive_source_and_audit_routes_match"]

    four_gap = load_json(DEPENDENCIES["four_gap_report"][0])
    four_gap_audit = load_json(DEPENDENCIES["four_gap_audit"][0])
    assert four_gap["source_sha256"] == DEPENDENCIES["four_gap_assembler"][1]
    assert four_gap_audit["source_sha256"] == DEPENDENCIES["four_gap_auditor"][1]
    assert four_gap_audit["composite"]["sha256"] == DEPENDENCIES["four_gap_report"][1]
    assert four_gap_audit["composite"]["assembler_source_sha256"] == DEPENDENCIES["four_gap_assembler"][1]
    assert all(four_gap_audit["checks"].values())
    return rows


def ratios_from_gaps(gaps: list[Fraction], terminal: Fraction) -> list[Fraction]:
    ratios = [Fraction(0)] * (len(gaps) + 1)
    ratios[-1] = terminal
    for index in range(len(gaps) - 1, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios


def row_from_ratios(ratios: list[Fraction]) -> list[Fraction]:
    row = [Fraction(1)]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    return row


def convolution(left: list[Fraction], right: list[Fraction], degree: int) -> Fraction:
    return sum(
        Fraction(math.comb(degree, index)) * left[index] * right[degree - index]
        for index in range(degree + 1)
    )


def margin(left: list[Fraction], right: list[Fraction], rank: int, h: Fraction) -> Fraction:
    lower = convolution(left, right, rank - 1)
    center = convolution(left, right, rank)
    upper = convolution(left, right, rank + 1)
    return center * center - lower * upper - h * lower * center


def selected_slacks(rank: int, unit: Fraction) -> list[tuple[str, dict[int, Fraction]]]:
    return [
        ("tight", {}),
        ("head", {0: 3 * unit, 2: 5 * unit}),
        ("near_tail", {3: 7 * unit, rank - 2: 11 * unit}),
        ("terminal", {rank - 1: 13 * unit}),
        ("mixed", {0: 17 * unit, 2: unit, rank // 2: 19 * unit, rank - 1: 23 * unit}),
    ]


def coordinate_and_direct_replay() -> dict:
    ranks = (8, 9, 12, 16, 20)
    scales = (Fraction(0), Fraction(1, 2), Fraction(1), Fraction(3))
    cases = 0
    minimum = None
    minimum_case = None

    for rank in ranks:
        for h in scales:
            unit = h if h > 0 else Fraction(1)
            r_values = (Fraction(0),) if h == 0 else (
                Fraction(0), h / 4, h / 2, 3 * h / 4, h
            )
            left_patterns = selected_slacks(rank, unit)
            right_patterns = selected_slacks(rank, unit)
            for r in r_values:
                tau = h - r
                for left_name, left_slack in left_patterns:
                    d0 = left_slack.get(0, Fraction(0))
                    d2 = left_slack.get(2, Fraction(0))
                    low_gaps = [
                        2 * h + d0,
                        r,
                        2 * h - r + d2,
                    ] + [
                        h + left_slack.get(index, Fraction(0))
                        for index in range(3, rank)
                    ]
                    low_terminal = Fraction(1) + left_slack.get(rank - 1, Fraction(0)) / 7
                    low_ratios = ratios_from_gaps(low_gaps, low_terminal)

                    base_ratios = list(low_ratios)
                    base_ratios[2] -= tau
                    base_gaps = [
                        base_ratios[index] - base_ratios[index + 1]
                        for index in range(rank)
                    ]
                    assert base_gaps[0] >= 2 * h
                    assert base_gaps[1] == h
                    assert all(value >= h for value in base_gaps[2:])
                    capacity = base_ratios[2]
                    assert capacity > 0
                    lam = Fraction(1) + tau / capacity
                    assert Fraction(1) <= lam <= Fraction(1) + h / capacity

                    base_row = row_from_ratios(base_ratios)
                    reconstructed = [
                        value if index <= 2 else lam * value
                        for index, value in enumerate(base_row)
                    ]
                    low_row = row_from_ratios(low_ratios)
                    assert reconstructed == low_row

                    for right_name, right_slack in right_patterns:
                        high_gaps = [
                            2 * h + right_slack.get(0, Fraction(0))
                        ] + [
                            h + right_slack.get(index, Fraction(0))
                            for index in range(1, rank)
                        ]
                        high_terminal = Fraction(2) + right_slack.get(rank - 1, Fraction(0)) / 11
                        high_ratios = ratios_from_gaps(high_gaps, high_terminal)
                        high_row = row_from_ratios(high_ratios)
                        value = margin(low_row, high_row, rank, h)
                        assert value >= 0, (rank, h, r, left_name, right_name, value)
                        cases += 1
                        if minimum is None or value < minimum:
                            minimum = value
                            minimum_case = {
                                "rank": rank,
                                "h": str(h),
                                "r": str(r),
                                "left_pattern": left_name,
                                "right_pattern": right_name,
                            }

    return {
        "exact_cases": cases,
        "failures": 0,
        "rank_set": list(ranks),
        "h_set": [str(value) for value in scales],
        "minimum_margin": str(minimum),
        "minimum_case": minimum_case,
        "checks": [
            "canonical base has gap1 exactly h",
            "canonical base retains every other gap slack",
            "capacity C is positive",
            "1<=lambda<=1+h/C",
            "tail-scaled base coefficients equal the target low row exactly",
            "direct binomial convolution margin is nonnegative",
        ],
    }


def main() -> int:
    dependencies = audit_dependencies()
    replay = coordinate_and_direct_replay()
    payload = {
        "schema": "uniform-low-high-full-convolution-cone-assembler-root-v1",
        "status": "PASS_HASH_PINNED_EXACT_ALL_RANK_LOW_HIGH_FULL_CONVOLUTION_CONE_ASSEMBLY",
        "date": "2026-08-28",
        "theorem": (
            "For every k>=8 and h>=0, let one positive ratio row be low: "
            "delta0>=2h, 0<=delta1<=h, delta2>=2h-delta1, and "
            "delta_i>=h for 3<=i<k. Let the other positive row be high: "
            "epsilon0>=2h and epsilon_i>=h for 1<=i<k. Then their "
            "binomial-convolution margin c_k^2-c_(k-1)c_(k+1)-h*c_(k-1)c_k "
            "is nonnegative. The statement is symmetric in the two rows."
        ),
        "exhaustive_full_factor_split": {
            "ambient_gap_conditions": (
                "delta0>=2h, delta1>=0, delta2>=h, "
                "delta1+delta2>=2h, delta_i>=h for i>=3"
            ),
            "high_sector": "delta1>=h; all gaps meet the high hypotheses",
            "low_sector": (
                "0<=r=delta1<=h; write delta2=2h-r+d2 with d2>=0"
            ),
        },
        "canonical_coordinate_map": {
            "low_target": (
                "(delta0,delta1,delta2,delta3,...)="
                "(2h+d0,r,2h-r+d2,h+d3,...)"
            ),
            "tail_parameter": "tau=h-r, so 0<=tau<=h",
            "base_ratio_change": "C=tilde_A2=A2-tau; all other A_i are unchanged",
            "base_gaps": (
                "(2h+d0,h,h+d2,h+d3,...); every slack d0,d2,d3,... "
                "is retained simultaneously"
            ),
            "coefficient_change": (
                "tilde_a_i=a_i for i<=2 and tilde_a_i=a_i/lambda for i>=3, "
                "where lambda=1+tau/C"
            ),
            "interval": "C>0 and 1<=lambda<=1+h/C",
            "inverse": (
                "from a base with gap1=h and 0<=tau<=h, tail scaling gives "
                "delta1=h-tau and delta2=tilde_delta2+tau"
            ),
            "conclusion": (
                "This is an exact bijection between the complete low chart and "
                "the integrated tail theorem's base-times-interval domain."
            ),
        },
        "gap_coordinate_coverage": {
            "left_delta0_slack": "arbitrary in the tail theorem base",
            "left_delta1_low_coordinate": "exactly the tail interval coordinate tau=h-delta1",
            "left_delta2_slack": "arbitrary base gap2 slack d2",
            "left_delta_i_slacks_i_ge_3": "unchanged and arbitrary in the tail theorem base",
            "left_terminal_ratio": "positive and unrestricted",
            "right_epsilon0_slack": "arbitrary in the high partner",
            "right_epsilon_i_slacks_i_ge_1": "simultaneously arbitrary in the high partner",
            "right_terminal_ratio": "positive and unrestricted",
            "uncovered_simultaneous_directions": [],
        },
        "proof_route": {
            "low_high": (
                "Apply the audited all-rank tail-boost theorem to the canonical "
                "base and lambda=1+(h-delta1)/C."
            ),
            "high_high_boundary": (
                "The lambda=1 endpoint is the independently audited high/high "
                "MLR theorem already pinned transitively by the tail assembly."
            ),
            "row_order": "binomial convolution is commutative, so either factor may be low",
        },
        "four_gap_role": {
            "normalized_slice": (
                "At h=1 it varies left gap0/gap1 and right gap0/gap1 while "
                "all deeper gaps are tight."
            ),
            "intersection_with_canonical_base": (
                "Its left-gap1-slack-zero face lies inside the canonical "
                "gap1=h base hyperplane."
            ),
            "extra_left_gap1_slack": (
                "The four-gap theorem also certifies base gap1>h on its translated "
                "tail-tight slice, but this is not a missing low-chart coordinate."
            ),
            "composition_guard": (
                "No inference is made by adding separate coordinate theorems. "
                "Closure uses the integrated tail theorem, which already permits "
                "all remaining left and right slacks simultaneously."
            ),
            "logical_role": "independently audited overlap/cross-check; not required for closure",
        },
        "exact_replay": replay,
        "dependencies": dependencies,
        "source_sha256": sha256(Path(__file__).resolve()),
        "scope_warning": (
            "This proves only the abstract all-rank low/high full-convolution cone "
            "under the displayed positive-row gap hypotheses. It does not prove "
            "the low/low cone, that forest rows satisfy the hypotheses, any forest "
            "Q_k statement, the forest assembly, or Erdos Problem 993."
        ),
    }
    report_hash = atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", report_hash)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
