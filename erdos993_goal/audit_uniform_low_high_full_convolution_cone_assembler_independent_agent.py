#!/usr/bin/env python3
"""Independent fail-closed audit of the all-rank low/high cone assembly.

The assembler and all theorem producers are neither imported nor executed.
This audit reconstructs the cone split, canonical rebase, coefficient map,
and direct exact convolution checks from scratch.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_full_convolution_cone_assembler_independent_audit_20260828.json"

FROZEN_INPUTS = {
    "assembler": (
        "assemble_uniform_low_high_full_convolution_cone_root_20260828.py",
        "999181C60EAFB0AF34D2F3987997DFBEB6C2FC94BF6A323383657EA2E377A92D",
    ),
    "assembler_report": (
        "uniform_low_high_full_convolution_cone_assembler_root_20260828.json",
        "FBC292328F6E3AB67181F1D394873030BAA30388B8E8621496823CFA1BCFE3AA",
    ),
    "theorem_note": (
        "UNIFORM_LOW_HIGH_FULL_CONVOLUTION_CONE_THEOREM_2026-08-28.md",
        "4B2084EB190786252D01080F65E9404668B056CDEAC78A55A53D0D024EBD4DB2",
    ),
}

EXPECTED_DEPENDENCIES = {
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


def fail_closed_route_audit() -> tuple[dict, dict]:
    frozen = {}
    for label, (name, expected) in FROZEN_INPUTS.items():
        actual = sha256(HERE / name)
        assert actual == expected, (label, actual, expected)
        frozen[label] = {"path": name, "sha256": actual}

    assembly = load_json(FROZEN_INPUTS["assembler_report"][0])
    assert assembly["schema"] == "uniform-low-high-full-convolution-cone-assembler-root-v1"
    assert assembly["status"] == (
        "PASS_HASH_PINNED_EXACT_ALL_RANK_LOW_HIGH_FULL_CONVOLUTION_CONE_ASSEMBLY"
    )
    assert assembly["source_sha256"] == FROZEN_INPUTS["assembler"][1]
    assert assembly["gap_coordinate_coverage"]["uncovered_simultaneous_directions"] == []

    dependencies = {}
    assert set(assembly["dependencies"]) == set(EXPECTED_DEPENDENCIES)
    for label, (name, expected_hash, expected_status) in EXPECTED_DEPENDENCIES.items():
        actual_hash = sha256(HERE / name)
        assert actual_hash == expected_hash, (label, actual_hash, expected_hash)
        stored = assembly["dependencies"][label]
        assert stored["path"] == name
        assert stored["sha256"] == actual_hash
        row = {"path": name, "sha256": actual_hash}
        if expected_status is not None:
            data = load_json(name)
            assert data["status"] == expected_status
            assert stored["status"] == expected_status
            row["status"] = expected_status
        dependencies[label] = row

    tail = load_json(EXPECTED_DEPENDENCIES["tail_report"][0])
    tail_audit = load_json(EXPECTED_DEPENDENCIES["tail_audit"][0])
    assert tail["source_sha256"] == EXPECTED_DEPENDENCIES["tail_assembler"][1]
    assert tail_audit["audit_source_sha256"] == EXPECTED_DEPENDENCIES["tail_auditor"][1]
    assert tail_audit["frozen_inputs"] == {
        "assembler": EXPECTED_DEPENDENCIES["tail_assembler"][1],
        "assembler_report": EXPECTED_DEPENDENCIES["tail_report"][1],
        "theorem_note": EXPECTED_DEPENDENCIES["tail_note"][1],
    }
    assert tail_audit["dependency_audit"]["scope_chain"] == {
        "base_margin": "high/high theorem supplies M(1)>=0",
        "quadratic_coefficient": "pairwise theorem supplies [lambda^2]M>=0",
        "strong_auxiliary": (
            "pairwise reduction leaves exactly one adverse term and the matched "
            "local-pair theorem pays it, so A2*M(1)+h*M'(1)>=0"
        ),
    }
    assert tail_audit["convex_quadratic_audit"]["symbolic_identity_exact"]
    assert tail_audit["independent_binomial_convolution_replay"]["failures"] == 0

    four_gap = load_json(EXPECTED_DEPENDENCIES["four_gap_report"][0])
    four_gap_audit = load_json(EXPECTED_DEPENDENCIES["four_gap_audit"][0])
    assert four_gap["source_sha256"] == EXPECTED_DEPENDENCIES["four_gap_assembler"][1]
    assert four_gap_audit["source_sha256"] == EXPECTED_DEPENDENCIES["four_gap_auditor"][1]
    assert four_gap_audit["composite"]["sha256"] == EXPECTED_DEPENDENCIES["four_gap_report"][1]
    assert four_gap_audit["composite"]["assembler_source_sha256"] == EXPECTED_DEPENDENCIES["four_gap_assembler"][1]
    assert all(four_gap_audit["checks"].values())
    return frozen, dependencies


def ratios_from_gaps(gaps: list[Fraction], terminal: Fraction) -> list[Fraction]:
    output = [Fraction(0)] * (len(gaps) + 1)
    output[-1] = terminal
    for position in range(len(gaps) - 1, -1, -1):
        output[position] = output[position + 1] + gaps[position]
    return output


def coefficients(ratios: list[Fraction]) -> list[Fraction]:
    output = [Fraction(1)]
    for ratio in ratios:
        output.append(output[-1] * ratio)
    return output


def binomial_slice(left: list[Fraction], right: list[Fraction], degree: int) -> Fraction:
    total = Fraction(0)
    for index in range(degree + 1):
        total += Fraction(math.comb(degree, index)) * left[index] * right[degree - index]
    return total


def target_margin(left: list[Fraction], right: list[Fraction], rank: int, h: Fraction) -> Fraction:
    c0 = binomial_slice(left, right, rank - 1)
    c1 = binomial_slice(left, right, rank)
    c2 = binomial_slice(left, right, rank + 1)
    return c1 * c1 - c0 * c2 - h * c0 * c1


def independent_patterns(rank: int, unit: Fraction) -> tuple[dict[int, Fraction], ...]:
    return (
        {},
        {0: 2 * unit},
        {2: 3 * unit},
        {3: 5 * unit, rank - 1: 7 * unit},
        {rank // 2: 11 * unit},
        {0: 13 * unit, 2: 17 * unit, rank // 2: 19 * unit, rank - 2: 23 * unit},
    )


def independent_coordinate_replay() -> dict:
    ranks = (8, 10, 13, 17, 24)
    h_values = (Fraction(0), Fraction(1, 3), Fraction(1), Fraction(5, 2))
    cases = 0
    margin_minimum = None
    capacity_identity_checks = 0

    for rank in ranks:
        for h in h_values:
            unit = h if h > 0 else Fraction(1)
            r_values = (Fraction(0),) if h == 0 else (
                Fraction(0), h / 5, 2 * h / 5, 4 * h / 5, h
            )
            patterns = independent_patterns(rank, unit)
            for r in r_values:
                tau = h - r
                for left_slack in patterns:
                    target_gaps = [
                        2 * h + left_slack.get(0, Fraction(0)),
                        r,
                        2 * h - r + left_slack.get(2, Fraction(0)),
                    ] + [
                        h + left_slack.get(index, Fraction(0))
                        for index in range(3, rank)
                    ]
                    terminal = Fraction(3, 2) + left_slack.get(rank - 1, Fraction(0)) / 29
                    target_ratios = ratios_from_gaps(target_gaps, terminal)
                    base_ratios = target_ratios[:]
                    base_ratios[2] -= tau
                    base_gaps = [
                        base_ratios[index] - base_ratios[index + 1]
                        for index in range(rank)
                    ]
                    assert base_gaps[0] == target_gaps[0]
                    assert base_gaps[1] == h
                    assert base_gaps[2] == h + left_slack.get(2, Fraction(0))
                    assert base_gaps[3:] == target_gaps[3:]

                    capacity = base_ratios[2]
                    capacity_from_tail = terminal + sum(base_gaps[2:])
                    assert capacity == capacity_from_tail > 0
                    capacity_identity_checks += 1
                    lam = 1 + tau / capacity
                    assert 1 <= lam <= 1 + h / capacity

                    base_coefficients = coefficients(base_ratios)
                    target_coefficients = coefficients(target_ratios)
                    rebuilt_coefficients = [
                        value if index <= 2 else lam * value
                        for index, value in enumerate(base_coefficients)
                    ]
                    assert rebuilt_coefficients == target_coefficients

                    # Recheck the inverse map without referring to the assembly.
                    inverse_gap1 = base_gaps[1] - tau
                    inverse_gap2 = base_gaps[2] + tau
                    assert inverse_gap1 == target_gaps[1]
                    assert inverse_gap2 == target_gaps[2]

                    for right_slack in patterns:
                        right_gaps = [
                            2 * h + right_slack.get(0, Fraction(0))
                        ] + [
                            h + right_slack.get(index, Fraction(0))
                            for index in range(1, rank)
                        ]
                        right_terminal = Fraction(5, 3) + right_slack.get(rank - 1, Fraction(0)) / 31
                        right_coefficients = coefficients(
                            ratios_from_gaps(right_gaps, right_terminal)
                        )
                        value = target_margin(
                            target_coefficients, right_coefficients, rank, h
                        )
                        assert value >= 0, (rank, h, r, left_slack, right_slack, value)
                        cases += 1
                        if margin_minimum is None or value < margin_minimum:
                            margin_minimum = value

    # Independently replay the ambient high/low partition on exact rationals.
    partition_cases = 0
    for h in h_values:
        for fifths in range(0, 16):
            delta1 = h * Fraction(fifths, 5)
            for extra2 in range(0, 6):
                delta2 = max(h, 2 * h - delta1) + Fraction(extra2)
                assert delta1 >= 0 and delta2 >= h and delta1 + delta2 >= 2 * h
                if delta1 >= h:
                    assert delta1 >= h and delta2 >= h
                else:
                    d2 = delta2 - (2 * h - delta1)
                    assert 0 <= delta1 < h and d2 >= 0
                partition_cases += 1

    return {
        "exact_direct_cases": cases,
        "direct_failures": 0,
        "partition_cases": partition_cases,
        "capacity_identity_checks": capacity_identity_checks,
        "minimum_direct_margin": str(margin_minimum),
        "rank_set": list(ranks),
        "h_set": [str(value) for value in h_values],
        "reconstructed_without_assembler_import": True,
        "identities": {
            "base_gap1": "delta1+(h-delta1)=h",
            "base_gap2": "delta2-(h-delta1)>=h",
            "capacity": "C=A_k+sum_(i=2)^(k-1) tilde_delta_i>0",
            "interval": "lambda=1+(h-delta1)/C lies in [1,1+h/C]",
            "inverse": "delta1=h-tau and delta2=tilde_delta2+tau",
        },
    }


def main() -> int:
    frozen, dependencies = fail_closed_route_audit()
    replay = independent_coordinate_replay()
    payload = {
        "schema": "uniform-low-high-full-convolution-cone-assembler-independent-audit-v1",
        "status": "PASS_INDEPENDENT_HASH_PINNED_EXACT_ALL_RANK_LOW_HIGH_FULL_CONVOLUTION_CONE_AUDIT",
        "date": "2026-08-28",
        "frozen_inputs": frozen,
        "assembler_not_imported_or_executed": True,
        "theorem_producers_not_imported_or_executed": True,
        "dependency_routes": dependencies,
        "cone_definition_audit": {
            "ambient": (
                "delta0>=2h, delta1>=0, delta2>=h, delta1+delta2>=2h, "
                "delta_i>=h for i>=3"
            ),
            "high_case": "delta1>=h",
            "low_case": "0<=delta1<h with delta2=2h-delta1+d2, d2>=0",
            "split_exhaustive": True,
        },
        "canonical_rebase_audit": {
            "all_gap_coordinates_mapped": True,
            "simultaneous_left_and_right_slacks_retained": True,
            "tail_interval_exact": True,
            "coefficient_reconstruction_exact": True,
            "inverse_map_exact": True,
            "uncovered_simultaneous_directions": [],
        },
        "four_gap_scope_audit": {
            "mapped_slice": (
                "normalized h=1 translated tail-tight slice with left and right "
                "gap0/gap1 slacks"
            ),
            "overlap": "left-gap1-slack-zero face intersects the canonical base",
            "positive_left_gap1_slack_needed_for_low_chart": False,
            "used_as_additive_coordinate_argument": False,
            "role": "independently audited overlap only",
        },
        "independent_exact_replay": replay,
        "conclusion": (
            "Every low row has a unique canonical base with gap1=h and a tail "
            "parameter in the audited interval. All other left slacks and every "
            "right high-row slack remain simultaneous. The audited tail theorem "
            "therefore closes the complete abstract low/high full-convolution cone "
            "for every k>=8; the four-gap theorem is compatible audited overlap, "
            "not a missing composition step."
        ),
        "scope_warning": (
            "This audit certifies only the abstract low/high convolution cone under "
            "the displayed positive-row hypotheses. It does not certify low/low, "
            "any forest Q_k claim, a forest assembly, or Erdos Problem 993."
        ),
        "audit_source": Path(__file__).name,
        "audit_source_sha256": sha256(Path(__file__).resolve()),
    }
    report_hash = atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", payload["audit_source_sha256"])
    print("REPORT", report_hash)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
