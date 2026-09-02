#!/usr/bin/env python3
"""Assemble and audit the exact split-phase V8 scans at orders 28 and 29.

The order-n disconnected census is partitioned uniquely into forests whose
components all have order at most floor(n/2), and forests having a unique
larger tree component of each order floor(n/2)+1,...,n-1.  Together with the
tree phase, these are all unlabeled forests exactly once.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path


HERE = Path(__file__).resolve().parent
HIGH = HERE / "rank8_v8_forest_orders25_29_exact_20260816.json"
N27_LOG = HERE / "rank8_v8_n27_monolithic.out.log"

TREE_COUNTS = [
    0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1_301,
    3_159, 7_741, 19_320, 48_629, 123_867, 317_955, 823_065,
    2_144_505, 5_623_756, 14_828_074, 39_299_897, 104_636_890,
    279_793_450, 751_065_460, 2_023_443_032, 5_469_566_585,
]
EXPECTED_TREES = {order: TREE_COUNTS[order] for order in range(27, 30)}


def forest_counts() -> list[int]:
    """Euler transform of the independently asserted free-tree counts."""
    counts = [0] * len(TREE_COUNTS)
    counts[0] = 1
    for order in range(1, len(counts)):
        numerator = 0
        for degree in range(1, order + 1):
            logarithmic = sum(
                divisor * TREE_COUNTS[divisor]
                for divisor in range(1, degree + 1)
                if degree % divisor == 0
            )
            numerator += logarithmic * counts[order - degree]
        assert numerator % order == 0
        counts[order] = numerator // order
    return counts


EXPECTED_FORESTS = forest_counts()

PHASE_RE = re.compile(
    r"^PHASE_(TREE|ALL_SMALL|LARGE) target=(\d+)"
    r"(?: tree_order=(\d+))? eligible=(\d+) minimum=(\d+)$"
)
TREE_RE = re.compile(
    r"^TREE order=(\d+) total=(\d+) eligible=(\d+) minimum=(\d+)"
    r" polynomial=(\[.*\])$"
)
HIGH_RE = re.compile(
    r"^HIGH_(ALL_SMALL|DISCONNECTED|TOTAL) target=(\d+)"
    r" eligible=(\d+) minimum=(\d+)$"
)
TREE_SHARD_RE = re.compile(
    r"^PHASE_TREE_SHARD target=(\d+) shard_index=(\d+) shard_count=(\d+)"
    r" accepted=(\d+) eligible=(\d+) minimum=(\d+) polynomial=(\[.*\])$"
)
TREE_ISOLATE_SHARD_RE = re.compile(
    r"^PHASE_TREE_ISOLATE_SHARD base_target=28 isolate_target=29"
    r" shard_index=(\d+) shard_count=(\d+) accepted=(\d+)"
    r" base_minimum=(\d+) base_polynomial=(\[.*?\])"
    r" isolate_minimum=(\d+) isolate_polynomial=(\[.*\])$"
)


def read_nonempty(path: Path) -> list[str]:
    assert path.exists(), f"missing exact-scan transcript: {path.name}"
    lines = [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert lines, f"empty exact-scan transcript: {path.name}"
    return lines


def parse_n27() -> dict[str, object]:
    lines = read_nonempty(N27_LOG)
    tree_match = next((TREE_RE.match(line) for line in lines if line.startswith("TREE ")), None)
    assert tree_match is not None
    target, total, eligible, minimum = map(int, tree_match.groups()[:4])
    witness = json.loads(tree_match.group(5))
    assert target == 27
    assert total == eligible == EXPECTED_TREES[27]
    records: dict[str, tuple[int, int]] = {}
    for line in lines:
        match = HIGH_RE.match(line)
        if match:
            label, row_target, count, value = match.groups()
            assert int(row_target) == 27
            assert label not in records
            records[label] = (int(count), int(value))
    assert set(records) == {"ALL_SMALL", "DISCONNECTED", "TOTAL"}
    assert lines[-1] == "PASS_EXACT_FOREST_V8_ALPHA14_ORDER_27"
    all_small_count, _ = records["ALL_SMALL"]
    disconnected_count, disconnected_minimum = records["DISCONNECTED"]
    total_count, global_minimum = records["TOTAL"]
    assert total_count == eligible + disconnected_count
    # Every forest is bipartite, so alpha>=ceil(27/2)=14; the eligible census
    # must equal the independent Euler-transform count of every forest.
    assert total_count == EXPECTED_FORESTS[27]
    assert global_minimum == min(minimum, disconnected_minimum)
    assert global_minimum > 0
    return {
        "free_trees": total,
        "eligible_trees": eligible,
        "all_small_component_eligible_forests": all_small_count,
        "eligible_disconnected_forests": disconnected_count,
        "eligible_total": total_count,
        "independent_Euler_transform_forest_count": EXPECTED_FORESTS[27],
        "minimum_V8": global_minimum,
        "minimum_tree_polynomial_through_i8": witness,
        "coverage_transcript": N27_LOG.name,
    }


def parse_phase(path: Path, expected_kind: str, target: int, tree_order: int | None = None) -> tuple[int, int]:
    error_path = path.with_name(path.name.replace(".out.log", ".err.log"))
    assert error_path.exists(), f"missing stderr transcript: {error_path.name}"
    assert error_path.stat().st_size == 0, f"nonempty stderr transcript: {error_path.name}"
    lines = read_nonempty(path)
    matches = [PHASE_RE.match(line) for line in lines]
    matches = [match for match in matches if match]
    assert len(matches) == 1, f"expected one phase terminator in {path.name}"
    match = matches[0]
    kind, row_target, row_tree_order, eligible, minimum = match.groups()
    assert kind == expected_kind and int(row_target) == target
    assert (None if row_tree_order is None else int(row_tree_order)) == tree_order
    eligible_int, minimum_int = int(eligible), int(minimum)
    assert minimum_int > 0
    return eligible_int, minimum_int


def parse_tree_shards(target: int, shard_count: int) -> tuple[int, int, dict[str, object]]:
    rows = []
    for shard_index in range(shard_count):
        path = HERE / f"rank8_v8_n{target}_tree_shard_{shard_index:02d}.out.log"
        error_path = path.with_name(path.name.replace(".out.log", ".err.log"))
        assert error_path.exists() and error_path.stat().st_size == 0
        lines = read_nonempty(path)
        assert len(lines) == 1
        match = TREE_SHARD_RE.match(lines[0])
        assert match is not None
        (row_target, row_index, row_count, accepted, eligible, minimum, polynomial) = match.groups()
        assert (int(row_target), int(row_index), int(row_count)) == (
            target, shard_index, shard_count
        )
        row = {
            "shard_index": shard_index,
            "accepted": int(accepted),
            "eligible": int(eligible),
            "minimum_V8": int(minimum),
            "minimum_polynomial_through_i8": json.loads(polynomial),
            "transcript": path.name,
        }
        assert row["minimum_V8"] > 0
        rows.append(row)
    accepted_total = sum(row["accepted"] for row in rows)
    eligible_total = sum(row["eligible"] for row in rows)
    assert accepted_total == eligible_total == EXPECTED_TREES[target]
    minimum_row = min(rows, key=lambda row: row["minimum_V8"])
    return eligible_total, minimum_row["minimum_V8"], {
        "method": "accepted WROM index modulo shard_count",
        "shard_count": shard_count,
        "accepted_total": accepted_total,
        "shards": rows,
        "minimum_polynomial_through_i8": minimum_row["minimum_polynomial_through_i8"],
    }


def parse_tree_isolate_shards(shard_count: int) -> dict[str, object]:
    rows = []
    for shard_index in range(shard_count):
        path = HERE / f"rank8_v8_n28_tree_isolate_shard_{shard_index:02d}.out.log"
        error_path = path.with_name(path.name.replace(".out.log", ".err.log"))
        assert error_path.exists() and error_path.stat().st_size == 0
        lines = read_nonempty(path)
        assert len(lines) == 1
        match = TREE_ISOLATE_SHARD_RE.match(lines[0])
        assert match is not None
        (row_index, row_count, accepted, base_minimum, base_polynomial,
         isolate_minimum, isolate_polynomial) = match.groups()
        assert (int(row_index), int(row_count)) == (shard_index, shard_count)
        row = {
            "shard_index": shard_index,
            "accepted": int(accepted),
            "base_minimum_V8": int(base_minimum),
            "base_minimum_polynomial_through_i8": json.loads(base_polynomial),
            "isolate_minimum_V8": int(isolate_minimum),
            "isolate_minimum_polynomial_through_i8": json.loads(isolate_polynomial),
            "transcript": path.name,
        }
        assert row["base_minimum_V8"] > 0 and row["isolate_minimum_V8"] > 0
        rows.append(row)
    accepted_total = sum(row["accepted"] for row in rows)
    assert accepted_total == EXPECTED_TREES[28]
    base_row = min(rows, key=lambda row: row["base_minimum_V8"])
    isolate_row = min(rows, key=lambda row: row["isolate_minimum_V8"])
    return {
        "accepted_total": accepted_total,
        "base_minimum_V8": base_row["base_minimum_V8"],
        "base_minimum_polynomial_through_i8": base_row["base_minimum_polynomial_through_i8"],
        "isolate_minimum_V8": isolate_row["isolate_minimum_V8"],
        "isolate_minimum_polynomial_through_i8": isolate_row["isolate_minimum_polynomial_through_i8"],
        "method": "shared order-28 WROM-index congruence shards",
        "shard_count": shard_count,
        "shards": rows,
    }


def parse_split_target(target: int) -> dict[str, object]:
    tree_path = HERE / f"rank8_v8_n{target}_phase_tree.out.log"
    if target == 28 and (not tree_path.exists() or tree_path.stat().st_size == 0):
        dual = parse_tree_isolate_shards(12)
        tree_eligible = dual["accepted_total"]
        tree_minimum = dual["base_minimum_V8"]
        tree_certificate = dual
    elif target == 29 and (not tree_path.exists() or tree_path.stat().st_size == 0):
        tree_eligible, tree_minimum, tree_certificate = parse_tree_shards(target, 12)
    else:
        tree_eligible, tree_minimum = parse_phase(tree_path, "TREE", target)
        tree_certificate = {"tree_transcript": tree_path.name}
    assert tree_eligible == EXPECTED_TREES[target]

    small_path = HERE / f"rank8_v8_n{target}_phase_all-small.out.log"
    all_small_eligible, all_small_minimum = parse_phase(
        small_path, "ALL_SMALL", target
    )
    phase_records = []
    large_eligible = 0
    large_minimum: int | None = None
    required_orders = list(range(target // 2 + 1, target))
    for tree_order in required_orders:
        path = HERE / f"rank8_v8_n{target}_phase_large-{tree_order}.out.log"
        if target == 29 and tree_order == 28 and (
            not path.exists() or path.stat().st_size == 0
        ):
            dual = parse_tree_isolate_shards(12)
            eligible = dual["accepted_total"]
            minimum = dual["isolate_minimum_V8"]
            transcript: object = {
                "shared_tree_isolate_shards": [
                    row["transcript"] for row in dual["shards"]
                ]
            }
        else:
            eligible, minimum = parse_phase(path, "LARGE", target, tree_order)
            transcript = path.name
        large_eligible += eligible
        large_minimum = minimum if large_minimum is None else min(large_minimum, minimum)
        phase_records.append({
            "tree_order": tree_order,
            "eligible": eligible,
            "minimum_V8": minimum,
            "transcript": transcript,
        })
    assert large_minimum is not None
    disconnected = all_small_eligible + large_eligible
    disconnected_minimum = min(all_small_minimum, large_minimum)
    total = tree_eligible + disconnected
    # Every forest here has alpha>=ceil(target/2)>=14, hence this also checks
    # the complete phase sum against the independent Euler-transform count.
    assert total == EXPECTED_FORESTS[target]
    global_minimum = min(tree_minimum, disconnected_minimum)
    return {
        "free_trees": EXPECTED_TREES[target],
        "eligible_trees": tree_eligible,
        "all_small_component_eligible_forests": all_small_eligible,
        "eligible_disconnected_forests": disconnected,
        "eligible_total": total,
        "independent_Euler_transform_forest_count": EXPECTED_FORESTS[target],
        "minimum_V8": global_minimum,
        "split_phase_certificate": {
            "tree": tree_certificate,
            "all_small_transcript": small_path.name,
            "required_large_tree_orders": required_orders,
            "large_component_phases": phase_records,
            "disconnected_minimum_V8": disconnected_minimum,
        },
    }


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    payload = json.loads(HIGH.read_text(encoding="utf-8"))
    assert set(payload["completed_orders"]) >= {"25", "26"}
    payload["completed_orders"]["27"] = parse_n27()
    payload["completed_orders"]["28"] = parse_split_target(28)
    payload["completed_orders"]["29"] = parse_split_target(29)
    payload["status"] = "PASS_EXACT_FOREST_V8_ALPHA14_ORDERS25_29"
    payload["coverage_method"] = (
        "Every WROM free tree and every canonical disconnected component "
        "multiset. Orders 28 and 29 use an exact disjoint phase partition: "
        "all components <=floor(n/2), or one unique larger component of each "
        "possible order plus the exact small-forest remainder. Coefficients "
        "through i8 use rigorously bounded u32; signed V8 uses i128."
    )
    payload["remaining_orders"] = []
    payload["all_completed_required_margins_positive"] = all(
        row["minimum_V8"] > 0 for row in payload["completed_orders"].values()
    )
    assert payload["all_completed_required_margins_positive"]
    HIGH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    for order in range(25, 30):
        row = payload["completed_orders"][str(order)]
        print(
            f"n={order} eligible={row['eligible_total']} "
            f"minimum_V8={row['minimum_V8']}"
        )
    for path in (Path(__file__), HIGH, N27_LOG):
        print(path.name, sha256(path))


if __name__ == "__main__":
    main()
