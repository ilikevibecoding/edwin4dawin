#!/usr/bin/env python3
"""Exact transfer/Newton reduction for the five-cubic-T long-outer-branch orbit."""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_five_cubic_t_long_outer_branch_newton_reduction_exact_agent_20260823.json"
EXPECTED = {
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json": "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_five_cubic_t_center_branch_newton_reduction_exact_agent_20260823.json": "3C11EC670614BBBFBC17779003066402D019A0062F04F65A162D4845D1ED2102",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json": "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json": "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def convolve(*factors: Counter[tuple[int, int]]) -> Counter[tuple[int, int]]:
    total = Counter({(0, 0): 1})
    for factor in factors:
        result: Counter[tuple[int, int]] = Counter()
        for (stored_a, long_a), count_a in total.items():
            for (stored_b, long_b), count_b in factor.items():
                result[stored_a + stored_b, long_a + long_b] += count_a * count_b
        total = result
    return total


def distribution(rows: list[tuple[tuple[int, bool], ...]]) -> Counter[tuple[int, int]]:
    return Counter(
        (sum(value for value, _ in row), sum(is_long for _, is_long in row))
        for row in rows
    )


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    pendant = [(value, value == 7) for value in range(1, 8)]
    spine = [(value, value == 8) for value in range(1, 9)]
    pendant_pairs = list(itertools.combinations_with_replacement(pendant, 2))
    short_arm_states = [
        (spine_state, low, high)
        for spine_state in spine
        for low, high in pendant_pairs
    ]
    unordered_short_arm_pairs = [
        left + right
        for left, right in itertools.combinations_with_replacement(short_arm_states, 2)
    ]
    patterns = convolve(
        distribution(unordered_short_arm_pairs),
        distribution([(value,) for value in spine]),
        distribution([(value,) for value in pendant]),
        distribution([(value,) for value in spine]),
        distribution(pendant_pairs),
    )
    counts: Counter[str] = Counter()
    orders: Counter[int] = Counter()
    for (stored, long_count), multiplicity in patterns.items():
        order = 1 + stored
        if long_count == 0:
            counts["all_short"] += multiplicity
            orders[order] += multiplicity
            counts["order27"] += multiplicity * (order == 27)
            counts["finite"] += multiplicity * (order >= 28)
        elif long_count == 11:
            counts["all_long"] += multiplicity
        else:
            counts["mixed"] += multiplicity
    counts["total"] = sum(patterns.values())
    counts["rays"] = counts["mixed"] + counts["all_long"]
    assert counts == Counter(
        total=316_108_800,
        all_short=67_160_772,
        finite=66_375_425,
        order27=291_131,
        mixed=248_948_027,
        all_long=1,
        rays=248_948_028,
    )
    partition = json.loads((ROOT / "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json").read_text(encoding="utf-8"))
    row = next(
        item for item in partition["root_location_partitions"]
        if item["root_location_orbit"] == "five_cubic_t:long_outer_branch"
    )
    assert row["stabilizer_order"] == 16 and row["coordinate_count"] == 11
    assert row["coordinate_patterns"] == counts["total"]
    assert row["all_short_literal_patterns"] == counts["all_short"]
    assert row["all_short_patterns_order27"] == counts["order27"]
    assert row["all_short_patterns_n28_plus"] == counts["finite"]
    assert row["mixed_long_short_patterns"] == counts["mixed"]
    assert row["all_long_patterns"] == 1
    assert {int(key): value for key, value in row["all_short_order_distribution"].items()} == dict(sorted(orders.items()))
    transfer = json.loads((ROOT / "rank8_delta03_e5_five_cubic_t_center_branch_newton_reduction_exact_agent_20260823.json").read_text(encoding="utf-8"))
    assert transfer["integer_newton_matrix_determinant"] == 1
    payload = {
        "schema": "rank8-delta03-e5-five-cubic-t-long-outer-branch-newton-reduction-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_FIVE_CUBIC_T_LONG_OUTER_BRANCH_TRANSFER_NEWTON_REDUCTION",
        "root_orbit": "five_cubic_t:long_outer_branch",
        "quotient_formula": "unordered pair of 224 short-outer cubic-arm states * center-middle spine 8 * middle pendant 7 * middle-long-outer spine 8 * unordered long-outer pendant pair 28",
        "coordinate_order": "first short-outer arm spine, pendant low,high; second short-outer arm spine, pendant low,high; center--middle spine; middle pendant; middle--long-outer spine; long-outer pendant low,high",
        "root_decomposition": "at the long-outer branch: two pendant paths * middle-side message obtained by joining the unordered short-arm pair at the center, crossing the center--middle spine, adjoining the middle pendant, and crossing the middle--long-outer spine",
        "order_formula": "n=1+sum(the eleven stored edge-length coordinates)",
        "quotient_counts": dict(counts),
        "all_short_order_distribution": {str(key): value for key, value in sorted(orders.items())},
        "graded_path_transfer": transfer["graded_path_transfer"],
        "degree_bounds": transfer["degree_bounds"],
        "newton_gate": transfer["newton_gate"],
        "integer_newton_matrix_determinant": 1,
        "shared_order27_evidence": {
            "all_rooted_pairs": 20_278_767_420,
            "nonpositive_by_delta": [0, 0, 0, 0],
            "scope": "exact all-root order-27 census only",
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Reduction only; no n>=28 sign claim. The shared order-27 base supplies no n>=28 credit.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
