#!/usr/bin/env python3
"""Assemble and audit the exact rank-eight Delta0--Delta4 WROM census."""

from __future__ import annotations

import ast
import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
LOGS = [
    "rank8_terminal_delta04_finite_n1_n17_fresh_20260820.log",
    "rank8_terminal_delta04_finite_n18_n20_exact_20260820.log",
    "rank8_terminal_delta04_finite_n21_exact_20260820.log",
    "rank8_terminal_delta04_finite_n22_exact_20260820.log",
]
EXPECTED_TREES = [
    0, 1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301,
    3159, 7741, 19320, 48629, 123867, 317955, 823065, 2144505, 5623756,
]
ROW = re.compile(
    r"core_n=(\d+) trees=(\d+) roots=(\d+) active=(\d+) "
    r"minima=(\[[^\]]*\]) active_minima=(\[[^\]]*\]) "
    r"negative_counts=(\[[^\]]*\])"
)
WITNESS = re.compile(
    r"MINIMUM_WITNESS n=(\d+) layout=(\[[^\]]*\]) root=(\d+) "
    r"delta=(\d+) value=(-?\d+)"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    rows: dict[int, dict[str, object]] = {}
    witnesses: dict[tuple[int, int], dict[str, object]] = {}
    markers: list[str] = []
    for name in LOGS:
        text = (ROOT / name).read_text(encoding="utf-8")
        markers.extend(line for line in text.splitlines() if line.startswith("PASS_EXACT_"))
        for match in ROW.finditer(text):
            order, trees, roots, active = map(int, match.group(1, 2, 3, 4))
            assert order not in rows
            minima = ast.literal_eval(match.group(5))
            active_minima = ast.literal_eval(match.group(6))
            negative_counts = ast.literal_eval(match.group(7))
            assert len(minima) == len(active_minima) == len(negative_counts) == 5
            assert trees == EXPECTED_TREES[order]
            assert roots == trees * order
            rows[order] = {
                "order": order,
                "trees": trees,
                "roots": roots,
                "active_roots": active,
                "minima_Delta0_through_Delta4": minima,
                "active_minima_Delta0_through_Delta4": active_minima,
                "negative_counts_Delta0_through_Delta4": negative_counts,
            }
        for match in WITNESS.finditer(text):
            order, root, rank, value = map(int, (match.group(1), match.group(3), match.group(4), match.group(5)))
            key = (order, rank)
            assert key not in witnesses
            witnesses[key] = {
                "order": order,
                "layout": ast.literal_eval(match.group(2)),
                "root": root,
                "rank": rank,
                "value": value,
                "outside_Q8_alpha_at_least_14_range": order <= 14,
            }

    assert sorted(rows) == list(range(1, 23))
    expected_negative0 = {11: 31, 12: 327, 13: 531, 14: 61}
    for order, row in rows.items():
        minima = row["minima_Delta0_through_Delta4"]
        counts = row["negative_counts_Delta0_through_Delta4"]
        assert all(value >= 0 for value in minima[1:])
        assert counts[1:] == [0, 0, 0, 0]
        assert counts[0] == expected_negative0.get(order, 0)
        if 15 <= order <= 22:
            assert all(value > 0 for value in minima)
    assert sum(expected_negative0.values()) == 950
    assert sorted(witnesses) == [(11, 0), (12, 0), (13, 0), (14, 0)]
    for key, witness in witnesses.items():
        assert witness["value"] == rows[key[0]]["minima_Delta0_through_Delta4"][0]

    independent_name = "rank8_terminal_delta0_negative_witnesses_exact_20260820.json"
    independent = json.loads((ROOT / independent_name).read_text(encoding="utf-8"))
    assert independent["status"] == "PASS_INDEPENDENT_RANK8_TERMINAL_DELTA0_NEGATIVE_WITNESSES"
    for row in independent["rows"]:
        key = (row["order"], 0)
        assert row["layout"] == witnesses[key]["layout"]
        assert row["root"] == witnesses[key]["root"]
        assert row["Delta0_through_Delta4"][0] == witnesses[key]["value"]
        assert row["outside_required_Q8_range"]
        assert row["full_terminal_family_Q8_nonnegative_for_all_required_t"]

    total_trees = sum(int(row["trees"]) for row in rows.values())
    total_roots = sum(int(row["roots"]) for row in rows.values())
    total_active = sum(int(row["active_roots"]) for row in rows.values())
    assert total_trees == 9114285
    assert total_roots == 194813361
    assert total_active == 194810589

    artifacts = [
        Path(__file__).name,
        "verify_rank8_terminal_delta04_finite.rs",
        "verify_rank8_terminal_delta04_finite.exe",
        "verify_rank8_terminal_delta5_finite.rs",
        "verify_rank8_terminal_delta0_negative_witnesses.py",
        independent_name,
        *LOGS,
    ]
    output = ROOT / "rank8_terminal_delta04_finite_n1_n22_exact_20260820.json"
    payload = {
        "status": "PASS_EXACT_RANK8_TERMINAL_DELTA0_4_FINITE_CENSUS_N1_N22",
        "scope": "every root of every free tree of orders 1 through 22",
        "totals": {
            "free_trees": total_trees,
            "rooted_cores": total_roots,
            "active_roots": total_active,
        },
        "proved": [
            "Delta1 through Delta4 are nonnegative for every rooted core through order 22",
            "Delta0 is nonnegative through order 10 and at orders 15 through 22",
            "all five coefficients are strictly positive at every root from order 15 through order 22",
        ],
        "exact_control": {
            "Delta0_negative_orders": [11, 12, 13, 14],
            "Delta0_negative_rooted_rows": 950,
            "reason_outside_Q8_target": "a connected tree of order at most 14 has alpha at most 13, below the proposed alpha>=14 range",
            "minimum_witnesses": [witnesses[key] for key in sorted(witnesses)],
            "independent_bitmask_replay": independent_name,
            "minimum_witness_full_terminal_families": "positive shifted literal-Q8 Newton coefficients from the first t with alpha>=14",
        },
        "rows": [rows[order] for order in sorted(rows)],
        "markers": markers,
        "artifacts_sha256": {name: sha256(ROOT / name) for name in artifacts},
        "warning": "The 950 Delta0 negatives disprove universal residual coefficient positivity. They do not disprove Q8 in its alpha>=14 target range. The four orderwise minimum controls have positive shifted literal-Q8 families, but all exceptional rooted cores still require a separate shifted-family audit.",
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("script_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
