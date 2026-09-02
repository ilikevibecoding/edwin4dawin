#!/usr/bin/env python3
"""Exact transfer/Newton reduction for the e=5 cubic-pendant-internal root orbit."""
from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_newton_reduction_exact_agent_20260823.json"
EXPECTED = {
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json": "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_newton_reduction_exact_agent_20260823.json": "51E4E7647988CF358152A52444CD25638E342E20421977269F00C279C77F228E",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_order27_exact_agent_20260823.json": "0FCBABF9F2A14E06F8C5BCE7316F97F636E66FF32370BF844D1D607B903A83E1",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_order27_independent_audit_agent_20260823.json": "F14CF20662843BD3CB7340019887600C21493C574537AA28109D761C5A511221",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


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
    gap = [(value, value == 7) for value in range(8)]
    spine = [(value, value == 8) for value in range(1, 9)]
    pendant_pairs = list(itertools.combinations_with_replacement(pendant, 2))
    patterns = convolve(
        distribution([(value,) for value in gap]),
        distribution([(value,) for value in pendant]),
        distribution([(value,) for value in pendant]),
        distribution([(value,) for value in spine]),
        distribution(pendant_pairs),
        distribution([(value,) for value in spine]),
        distribution(pendant_pairs),
    )
    counts: Counter[str] = Counter()
    orders: Counter[int] = Counter()
    for (stored, long_count), multiplicity in patterns.items():
        order = 2 + stored
        if long_count == 0:
            counts["all_short"] += multiplicity
            orders[order] += multiplicity
            counts["order27"] += multiplicity * (order == 27)
            counts["finite"] += multiplicity * (order >= 28)
        elif long_count == 9:
            counts["all_long"] += multiplicity
        else:
            counts["mixed"] += multiplicity
    counts["total"] = sum(patterns.values())
    counts["rays"] = counts["mixed"] + counts["all_long"]
    assert counts == Counter(
        total=19_668_992,
        all_short=5_445_468,
        finite=4_768_380,
        order27=181_695,
        mixed=14_223_523,
        all_long=1,
        rays=14_223_524,
    )
    partition = json.loads(
        (ROOT / "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json").read_text(encoding="utf-8")
    )
    row = next(
        item for item in partition["root_location_partitions"]
        if item["root_location_orbit"] == "quartic_center_two_cubic:cubic_pendant_internal"
    )
    assert row["stabilizer_order"] == 4
    assert row["coordinate_count"] == 9
    assert row["coordinate_patterns"] == counts["total"]
    assert row["all_short_literal_patterns"] == counts["all_short"]
    assert row["all_short_patterns_order27"] == counts["order27"]
    assert row["all_short_patterns_n28_plus"] == counts["finite"]
    assert row["mixed_long_short_patterns"] == counts["mixed"]
    assert row["all_long_patterns"] == 1
    assert {int(key): value for key, value in row["all_short_order_distribution"].items()} == dict(sorted(orders.items()))
    transfer = json.loads(
        (ROOT / "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_newton_reduction_exact_agent_20260823.json").read_text(encoding="utf-8")
    )
    assert transfer["integer_newton_matrix_determinant"] == 1
    payload = {
        "schema": "rank8-delta03-e5-quartic-center-two-cubic-cubic-pendant-internal-newton-reduction-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_CUBIC_PENDANT_INTERNAL_TRANSFER_NEWTON_REDUCTION",
        "root_orbit": "quartic_center_two_cubic:cubic_pendant_internal",
        "quotient_formula": "near gap 8 * root tail 7 * sibling cubic pendant 7 * rooted-cubic spine 8 * rooted-cubic unordered pendant pair 28 * other-cubic spine 8 * other-cubic unordered pendant pair 28",
        "coordinate_order": "rooted-cubic near gap; root-tail component; sibling rooted-cubic pendant; rooted-cubic--quartic spine; quartic pendant low,high; quartic--other-cubic spine; other-cubic pendant low,high",
        "order_formula": "n=2+sum(the nine stored coordinates)",
        "quotient_counts": dict(counts),
        "all_short_order_distribution": {str(key): value for key, value in sorted(orders.items())},
        "graded_path_transfer": transfer["graded_path_transfer"],
        "degree_bounds": transfer["degree_bounds"],
        "newton_gate": transfer["newton_gate"],
        "integer_newton_matrix_determinant": 1,
        "nested_order27_evidence": {
            "canonical_subdivisions": 379_665,
            "nonpositive_by_delta": [0, 0, 0, 0],
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Reduction only; no n>=28 sign claim.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
