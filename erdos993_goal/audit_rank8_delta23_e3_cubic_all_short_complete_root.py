#!/usr/bin/env python3
"""Fail-closed independent audit of the complete all-short Delta2/Delta3 report."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from audit_rank8_delta23_e3_cubic_all_short_i256_root import delta23


ROOT = Path(__file__).resolve().parent
REPORT = ROOT / "rank8_delta23_e3_cubic_all_short_complete_exact_root_20260823.json"
UNIVERSE_AUDIT = ROOT / "rank8_delta01_e3_cubic_boundary_universe_audit_agent_20260823.json"
OUTPUT = ROOT / "rank8_delta23_e3_cubic_all_short_complete_independent_audit_root_20260823.json"
EXPECTED = {
    REPORT.name: "49C5B46125A078B97E2443FF5C204DE64A9B24389261359D43D00753FF00CA6D",
    UNIVERSE_AUDIT.name: "480650229492873FAFD07B480E867C4EC0C00A09BDCF883BEC37DA60D725FD19",
    "run_rank8_delta23_e3_cubic_all_short_i256_root.py": "F7FA113AB5C4EF6F163E5E57E57A45C4745DDF6A4F1704174047140DD6D25F25",
    "audit_rank8_delta23_e3_cubic_all_short_i256_root.py": "180D227F86C2F3B8A40A906576FF27EF2ED013889315721F426021398259510B",
    "rank8_delta23_e3_cubic_all_short_i256_root_independent_audit_20260823.json": "08505386C2E5E988C641C28FA76C62DA35527211763B6727A47B23A3F50645E8",
    "probe_rank8_delta23_e3_cubic_all_short_i256_root.rs": "D5E11C6D8CE0A5532BA62F440CFA9C3B643BC455A65A114C699096230CF2D690",
    "probe_rank8_delta23_e3_cubic_all_short_i256_root.exe": "E6F59896151D0FFC90572202F5EEA630307DFFE738746FD1C3B04FE2A2624AA2",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    assert report["status"] == "PASS_EXACT_RANK8_DELTA23_E3_CUBIC_ALL_SHORT_COMPLETE_N37_PLUS"
    assert report["coverage"] == {
        "root_orbits": 7,
        "patterns": 4_670_546,
        "negative_or_zero_Delta2": 0,
        "negative_or_zero_Delta3": 0,
    }
    route = json.loads((ROOT / "rank8_delta23_e3_cubic_all_short_i256_root_independent_audit_20260823.json").read_text(encoding="utf-8"))
    assert route["status"] == "PASS_INDEPENDENT_LITERAL_TREE_DELTA23_ALL_SHORT_I256_ROUTE_AUDIT"
    universe = json.loads(UNIVERSE_AUDIT.read_text(encoding="utf-8"))
    assert universe["status"] == "PASS_EXACT_DETERMINISTIC_NO_GAP_NO_DUPLICATE_WORK_UNIVERSES"
    pinned_counts = {
        row["root_location_orbit"]: row["cells"]
        for row in universe["universes"] if row["mode"] == "all_short"
    }
    assert sum(pinned_counts.values()) == universe["totals"]["all_short_n37_plus"] == 4_670_546
    assert set(report["rows"]) == set(pinned_counts)

    witnesses = []
    for root, row in report["rows"].items():
        assert row["root"] == root
        assert row["start"] == 0
        assert row["stop"] == row["processed"] == row["universe"] == pinned_counts[root]
        assert row["negative2"] == row["negative3"] == 0
        for rank in (2, 3):
            values = row[f"witness{rank}"]
            d2, d3, order, literal_root = delta23(root, values)
            replayed = d2 if rank == 2 else d3
            expected = int(row[f"minimum{rank}"])
            assert replayed == expected > 0
            assert order >= 37
            witnesses.append({
                "root_location_orbit": root,
                "rank": rank,
                "values": values,
                "literal_order": order,
                "literal_root": literal_root,
                "expected_and_replayed_minimum": expected,
            })

    canonical_rows = json.dumps(report["rows"], sort_keys=True, separators=(",", ":")).encode("utf-8")
    payload = {
        "schema": "rank8-delta23-e3-cubic-all-short-complete-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_DELTA23_E3_CUBIC_ALL_SHORT_COMPLETE_AUDIT",
        "coverage": {
            "root_orbits": 7,
            "patterns": 4_670_546,
            "literal_minimum_replays": len(witnesses),
            "negative_or_zero_Delta2": 0,
            "negative_or_zero_Delta3": 0,
        },
        "universe_cross_check": {
            "source": UNIVERSE_AUDIT.name,
            "all_short_n37_plus": universe["totals"]["all_short_n37_plus"],
            "counts": pinned_counts,
        },
        "literal_minimum_replays": witnesses,
        "canonical_rows_sha256": hashlib.sha256(canonical_rows).hexdigest().upper(),
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This independently audits complete all-short cubic Delta2/Delta3 coverage only. It does not close orders 27..36, all-long or mixed cubic sectors, the quartic-star skeleton, other connected cases, forest Q8, PGC, or Problem 993.",
    }
    atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
