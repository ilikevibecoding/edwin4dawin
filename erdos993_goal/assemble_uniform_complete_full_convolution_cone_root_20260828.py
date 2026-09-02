#!/usr/bin/env python3
"""Fail-closed assembly of the complete all-rank full convolution cone.

The theorem is the exhaustive high/low sector split.  The finite rational
replay below is diagnostic; the proof is supplied by the three independently
audited all-rank sector theorems pinned here by hash and status.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import math
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "uniform_complete_full_convolution_cone_assembler_root_20260828.json"


EXPECTED = {
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
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def load_json(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def convolution(left: list[Fraction], right: list[Fraction], degree: int) -> Fraction:
    return sum(
        Fraction(math.comb(degree, index)) * left[index] * right[degree - index]
        for index in range(degree + 1)
    )


def pattern_slacks(rank: int, pattern: int) -> list[Fraction]:
    if pattern == 0:
        return [Fraction(0) for _ in range(rank)]
    if pattern == 1:
        return [Fraction((3 * index + 1) % 5, index + 2) for index in range(rank)]
    if pattern == 2:
        return [Fraction((index + 1) ** 2, 3) for index in range(rank)]
    return [Fraction(10 ** (index % 4), index + 1) for index in range(rank)]


def make_row(
    rank: int,
    h: Fraction,
    sector: str,
    pattern: int,
    terminal: Fraction,
) -> tuple[list[Fraction], list[Fraction], list[Fraction]]:
    slacks = pattern_slacks(rank, pattern)
    gaps = [Fraction(0) for _ in range(rank)]
    gaps[0] = 2 * h + slacks[0]
    if sector == "high":
        gaps[1] = h + slacks[1]
        gaps[2] = h + slacks[2]
    elif sector == "low":
        # Exercise both low endpoints and strict interior values.
        choices = (Fraction(0), h, h / 3, 2 * h / 3)
        low_gap = choices[pattern]
        gaps[1] = low_gap
        gaps[2] = 2 * h - low_gap + slacks[2]
    else:
        raise ValueError(sector)
    for index in range(3, rank):
        gaps[index] = h + slacks[index]

    ratios = [Fraction(0) for _ in range(rank + 1)]
    ratios[rank] = terminal
    for index in range(rank - 1, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]

    coefficients = [Fraction(1)]
    for ratio in ratios:
        coefficients.append(coefficients[-1] * ratio)
    require(all(value > 0 for value in ratios), "nonpositive ratio")
    require(all(value > 0 for value in coefficients), "nonpositive coefficient")
    return gaps, ratios, coefficients


def check_full(gaps: list[Fraction], h: Fraction) -> None:
    require(gaps[0] >= 2 * h, "gap0")
    require(gaps[1] >= 0, "gap1")
    require(gaps[2] >= h, "gap2")
    require(gaps[1] + gaps[2] >= 2 * h, "coupled gap12")
    require(all(value >= h for value in gaps[3:]), "tail gap")


def exact_replay() -> dict:
    sectors = (("high", "high"), ("low", "high"), ("low", "low"))
    ranks = (8, 9, 12, 17, 24, 32)
    h_values = (Fraction(0), Fraction(1, 3), Fraction(1), Fraction(5, 2))
    counts = {"high/high": 0, "low/high": 0, "low/low": 0}
    minimum_margin: Fraction | None = None
    minimum_case: dict | None = None
    failures = []

    for left_sector, right_sector in sectors:
        key = f"{left_sector}/{right_sector}"
        for rank in ranks:
            for h in h_values:
                for pattern in range(4):
                    left_gaps, _, left = make_row(
                        rank, h, left_sector, pattern,
                        Fraction(2 * rank + pattern + 1, pattern + 1),
                    )
                    right_pattern = (pattern + 1) % 4
                    right_gaps, _, right = make_row(
                        rank, h, right_sector, right_pattern,
                        Fraction(3 * rank + pattern + 2, pattern + 2),
                    )
                    check_full(left_gaps, h)
                    check_full(right_gaps, h)
                    if left_sector == "high":
                        require(all(value >= h for value in left_gaps), "left high")
                    else:
                        require(0 <= left_gaps[1] <= h, "left low")
                    if right_sector == "high":
                        require(all(value >= h for value in right_gaps), "right high")
                    else:
                        require(0 <= right_gaps[1] <= h, "right low")

                    previous = convolution(left, right, rank - 1)
                    current = convolution(left, right, rank)
                    following = convolution(left, right, rank + 1)
                    margin = current * current - previous * following - h * previous * current
                    if margin < 0:
                        failures.append({
                            "sector": key,
                            "rank": rank,
                            "h": str(h),
                            "pattern": pattern,
                            "margin": str(margin),
                        })
                    counts[key] += 1
                    if minimum_margin is None or margin < minimum_margin:
                        minimum_margin = margin
                        minimum_case = {
                            "sector": key,
                            "rank": rank,
                            "h": str(h),
                            "pattern": pattern,
                        }

    require(not failures, f"direct replay failures: {failures[:3]}")
    return {
        "cases": sum(counts.values()),
        "sector_counts": counts,
        "rank_set": list(ranks),
        "h_set": [str(value) for value in h_values],
        "failures": len(failures),
        "minimum_margin": str(minimum_margin),
        "minimum_case": minimum_case,
    }


def symbolic_partition() -> dict:
    h, d0, d2, r = sp.symbols("h d0 d2 r", nonnegative=True)
    low_delta0 = 2 * h + d0
    low_delta1 = r
    low_delta2 = 2 * h - r + d2
    require(sp.expand(low_delta0 - 2 * h) == d0, "low gap0 map")
    require(sp.expand(low_delta1 + low_delta2 - 2 * h) == d2, "low coupled map")
    require(sp.expand(low_delta2 - h) == h - r + d2, "low gap2 map")
    return {
        "ambient": "delta0>=2h, delta1>=0, delta2>=h, delta1+delta2>=2h, delta_i>=h for i>=3",
        "high_sector": "delta1>=h, hence every delta_i>=h",
        "low_sector": "0<=delta1<h, hence delta2=2h-delta1+d2 with d2>=0",
        "equality_face_assignment": "delta1=h is assigned to high",
        "unordered_factor_pairs": ["high/high", "low/high", "low/low"],
        "uncovered_sectors": [],
        "symbolic_low_coordinate_identities": {
            "delta0_minus_2h": str(sp.expand(low_delta0 - 2 * h)),
            "delta1_plus_delta2_minus_2h": str(sp.expand(low_delta1 + low_delta2 - 2 * h)),
            "delta2_minus_h": str(sp.expand(low_delta2 - h)),
        },
    }


def main() -> None:
    actual = {}
    for name, expected in EXPECTED.items():
        path = ROOT / name
        require(path.is_file(), f"missing dependency: {name}")
        actual[name] = sha256(path)
        require(actual[name] == expected, f"hash mismatch: {name}")

    statuses = {}
    for name, expected in EXPECTED_STATUSES.items():
        statuses[name] = load_json(name).get("status")
        require(statuses[name] == expected, f"status mismatch: {name}")

    low_low_audit = load_json(
        "uniform_low_low_matched_pair_convolution_independent_audit_20260828.json"
    )
    require(low_low_audit["producer_not_imported_or_executed"] is True,
            "low/low audit independence flag")
    require(low_low_audit["broad_exact_replay"]["failures"] == 0,
            "low/low audit replay failure")
    require(low_low_audit["pair_partition_audit"]["side_labelled_payment_sets_disjoint_for_every_k_ge_8"] is True,
            "low/low disjointness gate")

    report = {
        "schema": "uniform-complete-full-convolution-cone-assembler-root-v1",
        "status": "PASS_HASH_PINNED_EXACT_ALL_RANK_COMPLETE_FULL_CONVOLUTION_CONE_ASSEMBLY",
        "date": "2026-08-28",
        "theorem": (
            "For every k>=8 and h>=0, if two positive ratio rows each satisfy "
            "delta0>=2h, delta1>=0, delta2>=h, delta1+delta2>=2h, and "
            "delta_i>=h for 3<=i<k, then their binomial convolution c satisfies "
            "c_k^2-c_(k-1)c_(k+1)-h*c_(k-1)c_k>=0."
        ),
        "exhaustive_sector_partition": symbolic_partition(),
        "sector_theorems": {
            "high/high": {
                "producer_status": statuses["uniform_high_high_mlr_convolution_exact_root_20260827.json"],
                "audit_status": statuses["uniform_high_high_mlr_convolution_independent_audit_root_20260827.json"],
                "rank_scope": "k>=1",
            },
            "low/high": {
                "producer_status": statuses["uniform_low_high_full_convolution_cone_assembler_root_20260828.json"],
                "audit_status": statuses["uniform_low_high_full_convolution_cone_assembler_independent_audit_20260828.json"],
                "rank_scope": "k>=8",
            },
            "low/low": {
                "producer_status": statuses["uniform_low_low_matched_pair_convolution_exact_root_20260828.json"],
                "audit_status": statuses["uniform_low_low_matched_pair_convolution_independent_audit_20260828.json"],
                "rank_scope": "k>=8",
                "independent_replay_cases": low_low_audit["broad_exact_replay"]["total_cases"],
            },
        },
        "composition_guard": (
            "This is an exhaustive sector partition, not an inference from separately varied coordinates. "
            "Each sector theorem permits all remaining gap slacks simultaneously."
        ),
        "exact_direct_replay": exact_replay(),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This certifies only the complete abstract all-rank full-factor convolution cone. "
            "Connected-tree Q_k, a uniform exceptional-component/forest lift, the pendant cascade, "
            "unimodality, and Erdos Problem 993 remain separate."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("sector_counts", report["exact_direct_replay"]["sector_counts"])
    print("source_sha256", report["source_sha256"])
    print("report_sha256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
