#!/usr/bin/env python3
"""Assemble and audit the exact connected rank-eight boundary log.

The expensive enumeration is performed by
``verify_rank8_pgc_boundary_connected.rs``.  This script independently
recomputes every displayed witness functional, freezes the exact WROM and
eligible-state counts, and writes a compact JSON certificate for the new
orders 21--24.  Orders 19--20 in the same log are retained only as overlap
checks against the earlier connected audit.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
LOG = ROOT / "rank8_pgc_boundary_connected_n19_n24_exact_20260817.log"
SOURCE = ROOT / "verify_rank8_pgc_boundary_connected.rs"
EXE = ROOT / "verify_rank8_pgc_boundary_connected.exe"
REPORT = ROOT / "rank8_pgc_boundary_connected_n21_n24_exact_20260817.json"

EXPECTED = {
    19: (317_955, 53_237, 13_709, 280_979, 62_967, 0),
    20: (823_065, 233_344, 88_208, 1_384_339, 470_438, 0),
    21: (2_144_505, 779_459, 445_511, 5_087_248, 2_679_073, 0),
    22: (5_623_756, 1_946_297, 1_753_037, 13_748_438, 11_633_643, 5_850),
    23: (14_828_074, 3_514_311, 5_308_399, 26_530_397, 38_244_137, 144_448),
    24: (39_299_897, 4_334_297, 12_120_032, 34_621_692, 93_588_012, 272_819),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def parse_order(line: str) -> dict[str, object]:
    tokens = line.split()[1:]
    row: dict[str, object] = {}
    for token in tokens:
        key, value = token.split("=", 1)
        if key in {"full", "reduced", "min_v_full", "min_v_reduced"}:
            row[key] = tuple(int(part) for part in value.split(","))
        else:
            row[key] = int(value)
    return row


def q8(poly: tuple[int, ...]) -> int:
    return 16 * poly[8] ** 2 - poly[7] * poly[8] - 18 * poly[7] * poly[9]


def v8(poly: tuple[int, ...]) -> int:
    return 10 * poly[6] * poly[7] + 136 * poly[6] * poly[8] - 98 * poly[7] ** 2


def margin_numerator(full: tuple[int, ...], reduced: tuple[int, ...]) -> tuple[int, int]:
    p7 = full[7]
    b6 = reduced[6]
    c7 = full[8] - reduced[7] - reduced[8]
    assert p7 > 0 and b6 > 0 and c7 >= 0
    numerator = 8 * b6 * q8(full) + 24 * c7 * p7 * b6 + v8(reduced) * p7
    return numerator, 2 * p7 * b6


def main() -> None:
    lines = LOG.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "CONFIG start=19 end=24 shard_index=0 shard_count=1"
    assert lines[-1] == "PASS_EXACT_RANK8_PGC_CONNECTED_BOUNDARY_ORDERS_19_24_SHARD_0_OF_1"
    rows = {int(row["order"]): row for row in map(parse_order, (
        line for line in lines if line.startswith("ORDER ")
    ))}
    assert set(rows) == set(EXPECTED)

    for order, row in rows.items():
        expected = EXPECTED[order]
        observed = (
            row["total_trees"], row["eligible13"], row["eligible14"],
            row["states13"], row["states14"], row["v_negative"],
        )
        assert observed == expected
        assert row["processed_trees"] == row["total_trees"]
        assert row["q_negative"] == 0
        assert row["v_negative13"] == row["v_negative"]
        assert row["v_negative14"] == 0
        assert row["coupled_negative"] == 0
        full = row["full"]
        reduced = row["reduced"]
        assert isinstance(full, tuple) and isinstance(reduced, tuple)
        assert margin_numerator(full, reduced) == (row["min_num"], row["min_den"])
        assert row["min_num"] > 0 and row["min_den"] > 0
        if row["v_negative"]:
            vf = row["min_v_full"]
            vr = row["min_v_reduced"]
            assert isinstance(vf, tuple) and isinstance(vr, tuple)
            assert v8(vr) < 0
            assert margin_numerator(vf, vr) == (
                row["min_v_margin_num"], row["min_v_margin_den"]
            )
            assert row["min_v_margin_num"] > 0
        else:
            assert row["min_v"] == 0

    new_rows = [rows[order] for order in range(21, 25)]
    report = {
        "status": "PASS_EXACT_CONNECTED_RANK8_PGC_BOUNDARY_ORDERS21_24",
        "scope": {
            "graph_class": "connected forests, hence free trees",
            "orders": [21, 22, 23, 24],
            "alpha_P": [13, 14],
            "pendant_quotient": (
                "one check per support incident with at least one leaf; all leaves "
                "at that support have identical deletion polynomial"
            ),
            "warning": (
                "does not cover disconnected forests or connected orders 25--28; "
                "it is not the complete boundary theorem"
            ),
        },
        "identity": {
            "Q8": "16*p8^2-p7*p8-18*p7*p9",
            "V8": "10*b6*b7+136*b6*b8-98*b7^2",
            "c7": "p8-b7-b8",
            "cleared": "8*b6*Q8(P)+24*c7*p7*b6+V8(B)*p7",
        },
        "coverage": {
            "free_trees": sum(int(row["total_trees"]) for row in new_rows),
            "eligible_trees_alpha13": sum(int(row["eligible13"]) for row in new_rows),
            "eligible_trees_alpha14": sum(int(row["eligible14"]) for row in new_rows),
            "pendant_support_states_alpha13": sum(int(row["states13"]) for row in new_rows),
            "pendant_support_states_alpha14": sum(int(row["states14"]) for row in new_rows),
            "Q8_negative_states": sum(int(row["q_negative"]) for row in new_rows),
            "V8_negative_states": sum(int(row["v_negative"]) for row in new_rows),
            "coupled_negative_states": sum(int(row["coupled_negative"]) for row in new_rows),
        },
        "orders": new_rows,
        "overlap_orders19_20": [rows[19], rows[20]],
        "hashes": {
            "rust_source_sha256": sha256(SOURCE),
            "executable_sha256": sha256(EXE),
            "exact_log_sha256": sha256(LOG),
        },
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(report["coverage"], sort_keys=True))
    print("report_sha256", sha256(REPORT))


if __name__ == "__main__":
    main()
