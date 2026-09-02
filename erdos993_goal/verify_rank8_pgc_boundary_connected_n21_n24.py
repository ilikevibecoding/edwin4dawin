#!/usr/bin/env python3
"""Fast replay audit for the connected rank-eight boundary certificate."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_pgc_boundary_connected_n21_n24_exact_20260817.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_CONNECTED_RANK8_PGC_BOUNDARY_ORDERS21_24"
    assert report["scope"]["orders"] == [21, 22, 23, 24]
    assert report["scope"]["alpha_P"] == [13, 14]
    assert report["coverage"] == {
        "free_trees": 61_896_232,
        "eligible_trees_alpha13": 10_574_364,
        "eligible_trees_alpha14": 19_626_979,
        "pendant_support_states_alpha13": 79_987_775,
        "pendant_support_states_alpha14": 146_144_865,
        "Q8_negative_states": 0,
        "V8_negative_states": 423_117,
        "coupled_negative_states": 0,
    }
    assert [row["v_negative"] for row in report["orders"]] == [0, 5_850, 144_448, 272_819]
    assert all(row["v_negative13"] == row["v_negative"] for row in report["orders"])
    assert all(row["v_negative14"] == 0 for row in report["orders"])
    assert all(row["q_negative"] == 0 for row in report["orders"])
    assert all(row["coupled_negative"] == 0 for row in report["orders"])
    hashes = report["hashes"]
    for key, filename in (
        ("rust_source_sha256", "verify_rank8_pgc_boundary_connected.rs"),
        ("executable_sha256", "verify_rank8_pgc_boundary_connected.exe"),
        ("exact_log_sha256", "rank8_pgc_boundary_connected_n19_n24_exact_20260817.log"),
    ):
        assert hashes[key] == sha256(ROOT / filename)
    print("PASS_EXACT_CONNECTED_RANK8_PGC_BOUNDARY_ORDERS21_24_REPLAY")
    print("report_sha256", sha256(REPORT))


if __name__ == "__main__":
    main()
