#!/usr/bin/env python3
"""Extend the exact connected rank-eight boundary package through order 25."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import assemble_rank8_pgc_boundary_connected_n21_n24 as prior


ROOT = Path(__file__).resolve().parent
BASE = ROOT / "rank8_pgc_boundary_connected_n21_n24_exact_20260817.json"
N25_LOG = ROOT / "rank8_pgc_boundary_connected_n25_exact_20260817.log"
QUOTIENT_LOG = ROOT / "rank8_pgc_boundary_matching_quotient_n25_exact_20260817.log"
REPORT = ROOT / "rank8_pgc_boundary_connected_n21_n25_exact_20260817.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def quotient_row() -> dict[str, object]:
    line = next(line for line in QUOTIENT_LOG.read_text(encoding="utf-8").splitlines() if line.startswith("QMATCH "))
    row: dict[str, object] = {}
    for token in line.split()[1:]:
        key, value = token.split("=", 1)
        if key in {"full", "reduced", "min_v_full", "min_v_reduced"}:
            row[key] = tuple(int(part) for part in value.split(","))
        else:
            row[key] = int(value)
    return row


def main() -> None:
    base = json.loads(BASE.read_text(encoding="utf-8"))
    assert base["status"] == "PASS_EXACT_CONNECTED_RANK8_PGC_BOUNDARY_ORDERS21_24"
    n25_line = next(line for line in N25_LOG.read_text(encoding="utf-8").splitlines() if line.startswith("ORDER "))
    n25 = prior.parse_order(n25_line)
    assert (
        n25["order"], n25["total_trees"], n25["processed_trees"],
        n25["eligible13"], n25["eligible14"], n25["states13"], n25["states14"],
        n25["q_negative"], n25["v_negative"], n25["v_negative13"],
        n25["v_negative14"], n25["coupled_negative"],
    ) == (
        25, 104_636_890, 104_636_890, 3_265_748, 20_171_628,
        27_383_553, 165_251_810, 0, 59_792, 59_692, 100, 0,
    )
    assert prior.margin_numerator(n25["full"], n25["reduced"]) == (
        n25["min_num"], n25["min_den"]
    )
    assert prior.v8(n25["min_v_reduced"]) < 0
    assert prior.margin_numerator(n25["min_v_full"], n25["min_v_reduced"]) == (
        n25["min_v_margin_num"], n25["min_v_margin_den"]
    )
    quotient = quotient_row()
    assert quotient["order"] == 25 and quotient["alpha"] == 13
    assert quotient["quotient_total"] == 1_301
    assert quotient["covering_trees"] == 23_726_807
    assert quotient["coupled_negative"] == 0
    # The structurally independent matching-quotient cover reproduces the
    # WROM minima and witnesses in its alpha=13 slice exactly.
    for key in (
        "min_num", "min_den", "full", "reduced", "min_v",
        "min_v_margin_num", "min_v_margin_den", "min_v_full", "min_v_reduced",
    ):
        assert quotient[key] == n25[key]

    rows = list(base["orders"]) + [n25]
    report = {
        "status": "PASS_EXACT_CONNECTED_RANK8_PGC_BOUNDARY_ORDERS21_25",
        "scope": {
            "graph_class": "connected forests, hence free trees",
            "orders": [21, 22, 23, 24, 25],
            "alpha_P": [13, 14],
            "warning": "superseded for all-forest completion by the matching-quotient matrix package",
        },
        "coverage": {
            "free_trees": 166_533_122,
            "eligible_trees_alpha13": 13_840_112,
            "eligible_trees_alpha14": 39_798_607,
            "pendant_support_states_alpha13": 107_371_328,
            "pendant_support_states_alpha14": 311_396_675,
            "Q8_negative_states": 0,
            "V8_negative_states": 482_909,
            "coupled_negative_states": 0,
        },
        "orders": rows,
        "independent_n25_alpha13_matching_quotient": quotient,
        "hashes": {
            "n21_n24_report_sha256": sha256(BASE),
            "n25_wrom_log_sha256": sha256(N25_LOG),
            "n25_matching_quotient_log_sha256": sha256(QUOTIENT_LOG),
        },
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report["coverage"], sort_keys=True))
    print("report_sha256", sha256(REPORT))


if __name__ == "__main__":
    main()
