#!/usr/bin/env python3
"""Compile and replay the exact streaming classification of small tree jets."""

from __future__ import annotations

import csv
import hashlib
import json
import re
import subprocess
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "extract_rank7_exceptional_small_tree_jets.rs"
EXECUTABLE = ROOT / "extract_rank7_exceptional_small_tree_jets.exe"
JETS = ROOT / "rank7_exceptional_small_tree_jets_exact_20260816.tsv"
REPORT = ROOT / "rank7_exceptional_small_tree_jets_exact_20260816.json"

EXPECTED_TREES = (
    1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159,
    7741, 19320, 48629, 123867, 317955, 823065, 2144505, 5623756,
)
EXPECTED_SMALL = (
    1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1300, 3147,
    7613, 18212, 41009, 82261, 135762, 168480, 136882, 54564,
)
EXPECTED_EXCEPTION_OCCURRENCES = (
    1, 1, 1, 2, 3, 6, 11, 22, 40, 67, 76, 69, 38, 4,
    0, 0, 0, 0, 0, 0, 0, 0,
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def q7(polynomial: tuple[int, ...]) -> int:
    return 14 * polynomial[7] ** 2 - polynomial[6] * polynomial[7] - 16 * polynomial[6] * polynomial[8]


def main() -> int:
    subprocess.run(
        [
            "rustc", "-O", "--target", "x86_64-pc-windows-gnu",
            str(SOURCE), "-o", str(EXECUTABLE),
        ],
        cwd=ROOT,
        check=True,
    )
    completed = subprocess.run(
        [str(EXECUTABLE), str(JETS)],
        cwd=ROOT,
        check=True,
        text=True,
        capture_output=True,
    )
    lines = completed.stdout.splitlines()
    summary_pattern = re.compile(r"^SUMMARY (\d+) (\d+) (\d+) (\d+)$")
    records = []
    for line in lines:
        match = summary_pattern.match(line)
        if match:
            order, trees, small, exceptional = map(int, match.groups())
            records.append(
                {
                    "order": order,
                    "tree_occurrences": trees,
                    "alpha_at_most_11_occurrences": small,
                    "exceptional_occurrences": exceptional,
                }
            )
    assert len(records) == 22
    assert tuple(row["tree_occurrences"] for row in records) == EXPECTED_TREES
    assert tuple(row["alpha_at_most_11_occurrences"] for row in records) == EXPECTED_SMALL
    assert tuple(row["exceptional_occurrences"] for row in records) == EXPECTED_EXCEPTION_OCCURRENCES
    assert any(line.startswith("PASS_EXACT_STREAM_RANK7_EXCEPTIONAL_SMALL_TREE_JETS") for line in lines)

    rows = []
    with JETS.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle, delimiter="\t"):
            alpha = int(row["alpha"])
            polynomial = tuple(int(row[f"i{rank}"]) for rank in range(9))
            value = int(row["q7"])
            assert q7(polynomial) == value
            assert alpha <= 6 or value < 0
            rows.append((alpha, polynomial, value))
    assert len(rows) == len(set(rows)) == 307
    alpha_counts = Counter(alpha for alpha, _, _ in rows)
    assert alpha_counts == {1: 2, 2: 2, 3: 5, 4: 15, 5: 48, 6: 175, 7: 56, 8: 4}
    assert sum(value < 0 for _, _, value in rows) == 60
    assert sum(value == 0 for _, _, value in rows) == 247

    report = {
        "status": "PASS_EXACT_STREAM_RANK7_EXCEPTIONAL_SMALL_TREE_JETS",
        "scope": "all free trees with alpha<=11, hence all possible orders 1..22",
        "all_order_bound": "trees are bipartite, so alpha(T)>=ceil(order(T)/2)",
        "tree_occurrences": sum(EXPECTED_TREES),
        "alpha_at_most_11_occurrences": sum(EXPECTED_SMALL),
        "exceptional_occurrences": sum(EXPECTED_EXCEPTION_OCCURRENCES),
        "distinct_exceptional_jets": len(rows),
        "exception_definition": "alpha<=6 or Q7<0",
        "distinct_exceptional_by_alpha": {str(key): value for key, value in sorted(alpha_counts.items())},
        "negative_Q7_distinct_jets": 60,
        "zero_Q7_low_support_distinct_jets": 247,
        "no_exception_above_order_14": True,
        "by_order": records,
        "hashes": {
            SOURCE.name: sha256(SOURCE),
            EXECUTABLE.name: sha256(EXECUTABLE),
            JETS.name: sha256(JETS),
            Path(__file__).name: sha256(Path(__file__)),
        },
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"trees={report['tree_occurrences']} small={report['alpha_at_most_11_occurrences']} exceptional_occurrences={report['exceptional_occurrences']} distinct_jets={len(rows)}")
    print(f"report_sha256={sha256(REPORT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
