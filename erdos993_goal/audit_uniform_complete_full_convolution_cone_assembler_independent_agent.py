#!/usr/bin/env python3
"""Independent fail-closed audit of the complete three-sector assembly.

The frozen assembler is never imported or executed.  This file rehashes the
sector theorem chains, reconstructs the ambient high/low partition, checks
assumption and rank-scope alignment, and performs a fresh exact rational
convolution replay in both factor orders.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
import os
from pathlib import Path
import random

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_complete_full_convolution_cone_assembler_independent_audit_20260828.json"

FROZEN = {
    "assembler": (
        "assemble_uniform_complete_full_convolution_cone_root_20260828.py",
        "B73D49C095AD67E7480EC9BE352B7BD0A3A824C3B95C3647F30CC65D5061CB0B",
    ),
    "assembler_report": (
        "uniform_complete_full_convolution_cone_assembler_root_20260828.json",
        "A4497CFF4E293CC05AFB3F6E6C4E957AED31B8B6F25048C80D84B9058AFD3623",
    ),
    "theorem_note": (
        "UNIFORM_COMPLETE_FULL_CONVOLUTION_CONE_THEOREM_2026-08-28.md",
        "B7E94CE34C1DA98631AB0CA9606C45D17D5F32FF6C1C19F521C1FB9E76E977DE",
    ),
}

PINNED = {
    "prove_uniform_high_high_mlr_convolution_root.py":
        "818B2EFA16AEC2FA12A398697D3C1CC59E6EE057E73063238E1C62259E4867EB",
    "uniform_high_high_mlr_convolution_exact_root_20260827.json":
        "2B8AA7A6BDA968889C6700207C74FC9F41448C7FCEB389425C4B9938405315EA",
    "UNIFORM_HIGH_HIGH_MLR_CONVOLUTION_THEOREM_2026-08-27.md":
        "D5CDF33527447BC726F78783223CC7E5A2A2A47FF367966593857FAEFCE3A74F",
    "audit_uniform_high_high_mlr_convolution_independent_root.py":
        "153740ABFE8FA3FE9632F2BE5100A724EC73D561CB192E90CD378A426BCF46B3",
    "uniform_high_high_mlr_convolution_independent_audit_root_20260827.json":
        "42318EA4CB73DC4E60B6FA6837D9259DDEACFD5E230E0DC21601504C565BA509",
    "assemble_uniform_low_high_full_convolution_cone_root_20260828.py":
        "999181C60EAFB0AF34D2F3987997DFBEB6C2FC94BF6A323383657EA2E377A92D",
    "uniform_low_high_full_convolution_cone_assembler_root_20260828.json":
        "FBC292328F6E3AB67181F1D394873030BAA30388B8E8621496823CFA1BCFE3AA",
    "UNIFORM_LOW_HIGH_FULL_CONVOLUTION_CONE_THEOREM_2026-08-28.md":
        "4B2084EB190786252D01080F65E9404668B056CDEAC78A55A53D0D024EBD4DB2",
    "audit_uniform_low_high_full_convolution_cone_assembler_independent_agent.py":
        "AFA6EA3E02BC452EB9F3B13B6D06131446B60F9EFBEEC926976987FE657A9D02",
    "uniform_low_high_full_convolution_cone_assembler_independent_audit_20260828.json":
        "24B88D45D47CB6BD6096F6C3E48D69005C8ED5DDDBB23892DF754B53B8C52A65",
    "prove_uniform_low_low_matched_pair_convolution_root.py":
        "0110010F6D9D974580C1BB9CAC18E6E4D8333335F534BA879D1A105944F0FBF1",
    "uniform_low_low_matched_pair_convolution_exact_root_20260828.json":
        "9075B3C765836F9EE991A7A57B21542D7B239404040F63009CBE1F1D4810AC55",
    "UNIFORM_LOW_LOW_MATCHED_PAIR_CONVOLUTION_THEOREM_2026-08-28.md":
        "C3A02805963E35CC6022BFF0AE4FBB7C37E3722806D3472AEE26FBA840174833",
    "audit_uniform_low_low_matched_pair_convolution_independent_agent.py":
        "271BA8C3A99A47192EB4E9328417B624DB566B3B868585C9097C6E047D0ABA18",
    "uniform_low_low_matched_pair_convolution_independent_audit_20260828.json":
        "3961B6258F1BFCDE7DF5AEC338D9074BF31E5006C6F74D333F2C21DF706B951C",
    "UNIFORM_COMPLETE_FULL_CONVOLUTION_CONE_THEOREM_2026-08-28.md":
        "B7E94CE34C1DA98631AB0CA9606C45D17D5F32FF6C1C19F521C1FB9E76E977DE",
}

EXPECTED_STATUSES = {
    "uniform_high_high_mlr_convolution_exact_root_20260827.json":
        "PASS_EXACT_ANALYTIC_ALL_RANK_HIGH_HIGH_CONVOLUTION_MARGIN",
    "uniform_high_high_mlr_convolution_independent_audit_root_20260827.json":
        "PASS_INDEPENDENT_EXACT_ANALYTIC_ALL_RANK_HIGH_HIGH_CONVOLUTION_MARGIN_AUDIT",
    "uniform_low_high_full_convolution_cone_assembler_root_20260828.json":
        "PASS_HASH_PINNED_EXACT_ALL_RANK_LOW_HIGH_FULL_CONVOLUTION_CONE_ASSEMBLY",
    "uniform_low_high_full_convolution_cone_assembler_independent_audit_20260828.json":
        "PASS_INDEPENDENT_HASH_PINNED_EXACT_ALL_RANK_LOW_HIGH_FULL_CONVOLUTION_CONE_AUDIT",
    "uniform_low_low_matched_pair_convolution_exact_root_20260828.json":
        "PASS_EXACT_ANALYTIC_ALL_RANK_LOW_LOW_CONVOLUTION_CONE",
    "uniform_low_low_matched_pair_convolution_independent_audit_20260828.json":
        "PASS_INDEPENDENT_EXACT_ANALYTIC_ALL_RANK_LOW_LOW_CONVOLUTION_CONE_AUDIT",
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


def dependency_and_scope_audit(assembly: dict) -> dict:
    assert assembly["schema"] == "uniform-complete-full-convolution-cone-assembler-root-v1"
    assert assembly["status"] == (
        "PASS_HASH_PINNED_EXACT_ALL_RANK_COMPLETE_FULL_CONVOLUTION_CONE_ASSEMBLY"
    )
    assert assembly["source_sha256"] == FROZEN["assembler"][1]
    assert assembly["immutable_input_hashes"] == PINNED

    rows = {}
    for name, expected_hash in PINNED.items():
        actual_hash = sha256(HERE / name)
        assert actual_hash == expected_hash, (name, actual_hash, expected_hash)
        row = {"sha256": actual_hash}
        if name in EXPECTED_STATUSES:
            data = load_json(name)
            assert data["status"] == EXPECTED_STATUSES[name]
            row["status"] = data["status"]
        rows[name] = row

    high = load_json("uniform_high_high_mlr_convolution_exact_root_20260827.json")
    high_audit = load_json(
        "uniform_high_high_mlr_convolution_independent_audit_root_20260827.json"
    )
    assert high["source_sha256"] == PINNED["prove_uniform_high_high_mlr_convolution_root.py"]
    assert high["theorem"] == {
        "rank": "every integer k>=1",
        "assumptions": (
            "positive factorial rows a,b with A_i-A_(i+1)>=h and "
            "B_i-B_(i+1)>=h for 0<=i<k, h>=0"
        ),
        "conclusion": "c_k^2-c_(k-1)c_(k+1)-h*c_(k-1)c_k>=0",
    }
    assert high_audit["source_sha256"] == PINNED[
        "audit_uniform_high_high_mlr_convolution_independent_root.py"
    ]
    assert high_audit["theorem_sha256"] == PINNED[
        "uniform_high_high_mlr_convolution_exact_root_20260827.json"
    ]
    assert high_audit["producer_source"] == {
        "path": "prove_uniform_high_high_mlr_convolution_root.py",
        "sha256": PINNED["prove_uniform_high_high_mlr_convolution_root.py"],
        "imported": False,
    }
    assert all(high_audit["checks"].values())

    low_high = load_json("uniform_low_high_full_convolution_cone_assembler_root_20260828.json")
    low_high_audit = load_json(
        "uniform_low_high_full_convolution_cone_assembler_independent_audit_20260828.json"
    )
    assert low_high["source_sha256"] == PINNED[
        "assemble_uniform_low_high_full_convolution_cone_root_20260828.py"
    ]
    assert low_high_audit["audit_source_sha256"] == PINNED[
        "audit_uniform_low_high_full_convolution_cone_assembler_independent_agent.py"
    ]
    assert low_high_audit["frozen_inputs"] == {
        "assembler": {
            "path": "assemble_uniform_low_high_full_convolution_cone_root_20260828.py",
            "sha256": PINNED["assemble_uniform_low_high_full_convolution_cone_root_20260828.py"],
        },
        "assembler_report": {
            "path": "uniform_low_high_full_convolution_cone_assembler_root_20260828.json",
            "sha256": PINNED["uniform_low_high_full_convolution_cone_assembler_root_20260828.json"],
        },
        "theorem_note": {
            "path": "UNIFORM_LOW_HIGH_FULL_CONVOLUTION_CONE_THEOREM_2026-08-28.md",
            "sha256": PINNED["UNIFORM_LOW_HIGH_FULL_CONVOLUTION_CONE_THEOREM_2026-08-28.md"],
        },
    }
    assert low_high_audit["canonical_rebase_audit"]["uncovered_simultaneous_directions"] == []
    assert low_high_audit["canonical_rebase_audit"]["simultaneous_left_and_right_slacks_retained"]

    low_low = load_json("uniform_low_low_matched_pair_convolution_exact_root_20260828.json")
    low_low_audit = load_json(
        "uniform_low_low_matched_pair_convolution_independent_audit_20260828.json"
    )
    assert low_low["source_sha256"] == PINNED[
        "prove_uniform_low_low_matched_pair_convolution_root.py"
    ]
    assert low_low_audit["audit_source_sha256"] == PINNED[
        "audit_uniform_low_low_matched_pair_convolution_independent_agent.py"
    ]
    assert low_low_audit["frozen_inputs"] == {
        "producer": PINNED["prove_uniform_low_low_matched_pair_convolution_root.py"],
        "producer_report": PINNED[
            "uniform_low_low_matched_pair_convolution_exact_root_20260828.json"
        ],
    }
    assert low_low_audit["producer_not_imported_or_executed"]
    assert low_low_audit["pair_partition_audit"][
        "side_labelled_payment_sets_disjoint_for_every_k_ge_8"
    ]
    assert low_low_audit["broad_exact_replay"]["failures"] == 0

    expected_sectors = {
        "high/high": {
            "producer_status": EXPECTED_STATUSES[
                "uniform_high_high_mlr_convolution_exact_root_20260827.json"
            ],
            "audit_status": EXPECTED_STATUSES[
                "uniform_high_high_mlr_convolution_independent_audit_root_20260827.json"
            ],
            "rank_scope": "k>=1",
        },
        "low/high": {
            "producer_status": EXPECTED_STATUSES[
                "uniform_low_high_full_convolution_cone_assembler_root_20260828.json"
            ],
            "audit_status": EXPECTED_STATUSES[
                "uniform_low_high_full_convolution_cone_assembler_independent_audit_20260828.json"
            ],
            "rank_scope": "k>=8",
        },
        "low/low": {
            "producer_status": EXPECTED_STATUSES[
                "uniform_low_low_matched_pair_convolution_exact_root_20260828.json"
            ],
            "audit_status": EXPECTED_STATUSES[
                "uniform_low_low_matched_pair_convolution_independent_audit_20260828.json"
            ],
            "rank_scope": "k>=8",
            "independent_replay_cases": 900,
        },
    }
    assert assembly["sector_theorems"] == expected_sectors
    return {
        "dependency_count": len(rows),
        "status_bearing_dependency_count": len(EXPECTED_STATUSES),
        "dependencies": rows,
        "source_hash_propagation_exact": True,
        "sector_status_and_rank_scope_map_exact": True,
    }


def partition_audit(assembly: dict) -> dict:
    h, delta0, delta1, delta2 = sp.symbols(
        "h delta0 delta1 delta2", nonnegative=True
    )
    r, d0, d2 = sp.symbols("r d0 d2", nonnegative=True)
    low0 = 2 * h + d0
    low1 = r
    low2 = 2 * h - r + d2
    assert sp.expand(low0 - 2 * h) == d0
    assert sp.expand(low1 + low2 - 2 * h) == d2
    assert sp.expand(low2 - h) == h - r + d2

    expected = {
        "ambient": (
            "delta0>=2h, delta1>=0, delta2>=h, "
            "delta1+delta2>=2h, delta_i>=h for i>=3"
        ),
        "high_sector": "delta1>=h, hence every delta_i>=h",
        "low_sector": "0<=delta1<h, hence delta2=2h-delta1+d2 with d2>=0",
        "equality_face_assignment": "delta1=h is assigned to high",
        "unordered_factor_pairs": ["high/high", "low/high", "low/low"],
        "uncovered_sectors": [],
        "symbolic_low_coordinate_identities": {
            "delta0_minus_2h": "d0",
            "delta1_plus_delta2_minus_2h": "d2",
            "delta2_minus_h": "d2 + h - r",
        },
    }
    assert assembly["exhaustive_sector_partition"] == expected

    grid_cases = 0
    for h_value in (Fraction(0), Fraction(1, 3), Fraction(1), Fraction(5, 2)):
        candidates = (
            Fraction(0), h_value / 3, h_value, 2 * h_value, 7 * h_value
        )
        for first_gap in candidates:
            second_floor = max(h_value, 2 * h_value - first_gap)
            for extra in (Fraction(0), Fraction(1, 7), Fraction(9)):
                second_gap = second_floor + extra
                assert first_gap >= 0
                assert second_gap >= h_value
                assert first_gap + second_gap >= 2 * h_value
                if first_gap >= h_value:
                    assert first_gap >= h_value and second_gap >= h_value
                else:
                    reconstructed_d2 = first_gap + second_gap - 2 * h_value
                    assert 0 <= first_gap < h_value
                    assert reconstructed_d2 >= 0
                    assert second_gap == 2 * h_value - first_gap + reconstructed_d2
                grid_cases += 1

    # These are route-obstruction witnesses if either ambient condition were
    # silently dropped; neither witness belongs to the frozen theorem's cone.
    omit_delta2 = {
        "h": "1",
        "delta1": "3",
        "delta2": "-1",
        "coupled_sum": "2",
        "failure": "delta2<h, so the high theorem cannot be applied",
    }
    omit_coupled = {
        "h": "1",
        "delta1": "0",
        "delta2": "1",
        "failure": "delta1+delta2<2h, so the low theorem cannot be applied",
    }
    return {
        "symbolic_coordinate_identities_exact": True,
        "exact_grid_cases": grid_cases,
        "high_route_uses_delta2_ge_h_explicitly": True,
        "low_route_uses_delta1_plus_delta2_ge_2h_explicitly": True,
        "low_route_delta2_ge_h_then_automatic": True,
        "equality_delta1_eq_h_assigned_high": True,
        "h_zero_all_rows_high_and_low_sector_empty": True,
        "unordered_cartesian_square": ["HH", "HL=LH by commutativity", "LL"],
        "uncovered_sectors": [],
        "assumption_omission_route_witnesses": {
            "if_delta2_ge_h_were_omitted": omit_delta2,
            "if_coupled_condition_were_omitted": omit_coupled,
        },
    }


def ratios_from_gaps(gaps: list[Fraction], terminal: Fraction) -> list[Fraction]:
    ratios = [Fraction(0)] * (len(gaps) + 1)
    ratios[-1] = terminal
    for index in range(len(gaps) - 1, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    return ratios


def coefficients(ratios: list[Fraction]) -> list[Fraction]:
    row = [Fraction(1)]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    return row


def convolution(left: list[Fraction], right: list[Fraction], degree: int) -> Fraction:
    return sum(
        Fraction(math.comb(degree, index)) * left[index] * right[degree - index]
        for index in range(degree + 1)
    )


def classify(gaps: list[Fraction], h: Fraction) -> str:
    assert gaps[0] >= 2 * h
    assert gaps[1] >= 0
    assert gaps[2] >= h
    assert gaps[1] + gaps[2] >= 2 * h
    assert all(gap >= h for gap in gaps[3:])
    if gaps[1] >= h:
        assert all(gap >= h for gap in gaps)
        return "H"
    d2 = gaps[1] + gaps[2] - 2 * h
    assert d2 >= 0
    assert gaps[2] == 2 * h - gaps[1] + d2
    return "L"


def pattern_slacks(rank: int, h: Fraction, pattern: int) -> tuple[dict, Fraction, bool]:
    unit = h if h > 0 else Fraction(1)
    if pattern == 0:
        return {}, Fraction(1), False
    if pattern == 1:
        return {
            0: Fraction(1, 7) * unit,
            2: Fraction(2, 5) * unit,
            rank // 2: Fraction(3, 11) * unit,
        }, Fraction(7, 5), False
    if pattern == 2:
        return {0: 10**9 * unit}, Fraction(1), True
    if pattern == 3:
        return {
            2: 10**8 * unit,
            3: 10**6 * unit,
            rank - 2: 10**9 * unit,
        }, Fraction(2), True
    if pattern == 4:
        return {
            0: 13 * unit,
            2: 17 * unit,
            rank // 2: 10**5 * unit,
            rank - 1: 10**7 * unit,
        }, Fraction(1) + 10**9 * unit, True
    raise AssertionError(pattern)


def make_row(
    rank: int,
    h: Fraction,
    kind: str,
    pattern: int,
) -> tuple[list[Fraction], list[Fraction], list[Fraction], bool]:
    slacks, terminal, huge = pattern_slacks(rank, h, pattern)
    if kind == "high_equal":
        gap1 = h
        gap2 = h + slacks.get(2, Fraction(0))
    elif kind == "high_strict":
        unit = h if h > 0 else Fraction(1)
        gap1 = h + 5 * unit + slacks.get(1, Fraction(0))
        gap2 = h + slacks.get(2, Fraction(0))
    elif kind == "low_zero":
        gap1 = Fraction(0)
        gap2 = 2 * h + slacks.get(2, Fraction(0))
    elif kind == "low_mid":
        gap1 = h / 2
        gap2 = 3 * h / 2 + slacks.get(2, Fraction(0))
    elif kind == "low_near":
        gap1 = 6 * h / 7
        gap2 = 8 * h / 7 + slacks.get(2, Fraction(0))
    else:
        raise AssertionError(kind)
    gaps = [
        2 * h + slacks.get(0, Fraction(0)),
        gap1,
        gap2,
    ] + [
        h + slacks.get(index, Fraction(0))
        for index in range(3, rank)
    ]
    ratios = ratios_from_gaps(gaps, terminal)
    row = coefficients(ratios)
    assert all(ratio > 0 for ratio in ratios)
    assert all(value > 0 for value in row)
    return gaps, ratios, row, huge


def random_row(
    rng: random.Random,
    rank: int,
    h: Fraction,
    requested: str,
) -> tuple[list[Fraction], list[Fraction], list[Fraction], bool]:
    unit = h if h > 0 else Fraction(1)
    choices = (0, 0, 1, 7, 10**4, 10**9)
    slacks = [Fraction(rng.choice(choices)) * unit for _ in range(rank)]
    if requested == "H" or h == 0:
        gap1 = h + slacks[1]
        gap2 = h + slacks[2]
    else:
        fraction = Fraction(rng.randrange(7), 7)
        gap1 = h * fraction
        gap2 = 2 * h - gap1 + slacks[2]
    gaps = [2 * h + slacks[0], gap1, gap2] + [
        h + slacks[index] for index in range(3, rank)
    ]
    terminal = Fraction(1) + Fraction(rng.choice(choices)) * unit
    ratios = ratios_from_gaps(gaps, terminal)
    row = coefficients(ratios)
    huge = max(slacks, default=0) >= 10**4 * unit or terminal > 10**4
    return gaps, ratios, row, huge


def replay_case(rank: int, h: Fraction, left_data, right_data) -> dict:
    left_gaps, _, left, left_huge = left_data
    right_gaps, _, right, right_huge = right_data
    left_sector = classify(left_gaps, h)
    right_sector = classify(right_gaps, h)
    sector = "".join(sorted((left_sector, right_sector)))
    assert sector in {"HH", "HL", "LL"}

    forward = [convolution(left, right, degree) for degree in (rank - 1, rank, rank + 1)]
    reverse = [convolution(right, left, degree) for degree in (rank - 1, rank, rank + 1)]
    assert forward == reverse
    margin = forward[1] ** 2 - forward[0] * forward[2] - h * forward[0] * forward[1]
    reverse_margin = reverse[1] ** 2 - reverse[0] * reverse[2] - h * reverse[0] * reverse[1]
    assert margin == reverse_margin >= 0
    return {
        "sector": sector,
        "margin": margin,
        "h_zero": h == 0,
        "equality_face": left_gaps[1] == h or right_gaps[1] == h,
        "strict_low": left_sector == "L" or right_sector == "L",
        "huge_asymmetry": left_huge != right_huge or left_huge or right_huge,
    }


def fresh_exact_replay() -> dict:
    ranks = (8, 9, 12, 20, 32, 48)
    h_values = (Fraction(0), Fraction(1, 3), Fraction(1), Fraction(7, 2))
    pattern_pairs = ((0, 1), (1, 0), (2, 0), (0, 3), (3, 4))
    h_zero_configs = (
        ("high_equal", "high_equal"),
        ("high_strict", "high_equal"),
        ("low_zero", "high_strict"),
    )
    positive_h_configs = (
        ("high_equal", "high_equal"),
        ("high_equal", "high_strict"),
        ("high_strict", "high_strict"),
        ("low_zero", "high_equal"),
        ("high_strict", "low_mid"),
        ("low_near", "high_strict"),
        ("low_zero", "low_zero"),
        ("low_zero", "low_near"),
        ("low_mid", "low_near"),
        ("high_equal", "low_mid"),
    )
    counts = {"HH": 0, "HL": 0, "LL": 0}
    total = 0
    h_zero = 0
    equality = 0
    strict_low = 0
    huge = 0
    minimum = None

    def absorb(result: dict) -> None:
        nonlocal total, h_zero, equality, strict_low, huge, minimum
        counts[result["sector"]] += 1
        total += 1
        h_zero += int(result["h_zero"])
        equality += int(result["equality_face"])
        strict_low += int(result["strict_low"])
        huge += int(result["huge_asymmetry"])
        minimum = result["margin"] if minimum is None else min(minimum, result["margin"])

    for rank in ranks:
        for h in h_values:
            configs = h_zero_configs if h == 0 else positive_h_configs
            for left_kind, right_kind in configs:
                for left_pattern, right_pattern in pattern_pairs:
                    absorb(replay_case(
                        rank,
                        h,
                        make_row(rank, h, left_kind, left_pattern),
                        make_row(rank, h, right_kind, right_pattern),
                    ))

    rng = random.Random(993_20260828_505)
    for index in range(400):
        rank = 8 + (13 * index) % 41
        h = Fraction(0) if index % 31 == 0 else Fraction(1 + index % 9, 1 + index % 5)
        requested_left = "H" if rng.randrange(2) == 0 or h == 0 else "L"
        requested_right = "H" if rng.randrange(2) == 0 or h == 0 else "L"
        absorb(replay_case(
            rank,
            h,
            random_row(rng, rank, h, requested_left),
            random_row(rng, rank, h, requested_right),
        ))

    assert all(value > 0 for value in counts.values())
    return {
        "total_cases": total,
        "targeted_cases": total - 400,
        "seeded_random_cases": 400,
        "sector_counts": counts,
        "rank_range": [8, 48],
        "h_zero_cases": h_zero,
        "equality_face_cases": equality,
        "strict_low_cases": strict_low,
        "huge_or_asymmetric_cases": huge,
        "factor_order_symmetry_checks": total,
        "failures": 0,
        "minimum_margin": str(minimum),
        "families": (
            "h=0, delta1=h equality, strict high, strict low from delta1=0 "
            "through 6h/7, tight, rational slack, huge head/deep/terminal "
            "asymmetry, and seeded mixed rows"
        ),
    }


def main() -> int:
    frozen = {}
    for label, (name, expected_hash) in FROZEN.items():
        actual_hash = sha256(HERE / name)
        assert actual_hash == expected_hash, (label, actual_hash, expected_hash)
        frozen[label] = {"path": name, "sha256": actual_hash}

    assembly = load_json(FROZEN["assembler_report"][0])
    dependencies = dependency_and_scope_audit(assembly)
    partition = partition_audit(assembly)
    replay = fresh_exact_replay()
    payload = {
        "schema": "uniform-complete-full-convolution-cone-assembler-independent-audit-v1",
        "status": "PASS_INDEPENDENT_HASH_PINNED_EXACT_ALL_RANK_COMPLETE_FULL_CONVOLUTION_CONE_AUDIT",
        "date": "2026-08-28",
        "frozen_inputs": frozen,
        "assembler_not_imported_or_executed": True,
        "dependency_and_scope_audit": dependencies,
        "ambient_sector_partition_audit": partition,
        "sector_coverage": {
            "complete_rank_scope": "k>=8",
            "high_high": "audited for k>=1 and used for k>=8",
            "low_high": "audited for k>=8; symmetric under factor exchange",
            "low_low": "audited for k>=8",
            "ordered_pairs": ["HH", "HL", "LH", "LL"],
            "unordered_routes": ["high/high", "low/high", "low/low"],
            "factor_order_reduction": "HL=LH by exact binomial-convolution commutativity",
            "all_remaining_gap_slacks_simultaneous_in_each_sector_theorem": True,
            "uncovered_pairs": [],
        },
        "fresh_exact_rational_replay": replay,
        "conclusion": (
            "The ambient full cone splits exhaustively into high and strict-low "
            "sectors at delta1=h. The explicit delta2>=h condition supplies the "
            "high route, while delta1+delta2>=2h supplies the low coordinate. "
            "The independently audited high/high, low/high, and low/low theorems "
            "therefore cover the complete unordered Cartesian square for every "
            "k>=8, with no assumption, equality-face, rank, or factor-order gap."
        ),
        "scope_warning": (
            "This audit certifies only the complete abstract full-factor "
            "convolution cone. It does not certify connected-tree Q_k, a uniform "
            "exceptional-component or forest lift, the pendant cascade, "
            "unimodality, or Erdos Problem 993."
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
