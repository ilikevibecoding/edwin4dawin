#!/usr/bin/env python3
"""Fail-closed assembly of Delta0 through Delta3 for all rooted e=2 double claws."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DELTA01 = "rank8_delta01_e2_complete_independent_audit_agent_20260823.json"
DELTA2 = "rank8_delta2_e2_complete_all_root_types_independent_audit_root_20260823.json"
DELTA3 = "rank8_delta3_e2_complete_independent_audit_root_20260823.json"
OUTPUT = ROOT / "rank8_delta03_e2_complete_all_ranks_all_roots_exact_root_20260823.json"
EXPECTED = {
    DELTA01: "8C1254D37A5F3628AFE8D68E8FE6A97E0E1D68F48B1A2E79B20B107EFDD85462",
    DELTA2: "FACB47E7F157483B18980A50F3465252257547960F462C2F857DC37D098997A2",
    DELTA3: "25BF34B6DD0B1D8CAA626EC70EF2C6DE9BFA736CBC6EF8F76BAA8A64351BE54C",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    reports = {name: json.loads((ROOT / name).read_text(encoding="utf-8")) for name in EXPECTED}
    assert reports[DELTA01]["status"] == "PASS_INDEPENDENT_RANK8_DELTA01_E2_ALL_ROOTED_DOUBLE_CLAWS_N23_PLUS_AUDIT"
    assert reports[DELTA2]["status"] == "PASS_INDEPENDENT_RANK8_DELTA2_E2_COMPLETE_ALL_ROOT_TYPES_N23_PLUS_AUDIT"
    assert reports[DELTA3]["status"] == "PASS_INDEPENDENT_RANK8_DELTA3_E2_COMPLETE_ALL_ROOTS_ALL_ORDERS_N23_PLUS_AUDIT"
    payload = {
        "schema": "rank8-delta03-e2-complete-all-ranks-all-roots-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E2_COMPLETE_ALL_ROOTS_N23_PLUS",
        "theorem": "For every rooted e=2 double claw (A,q) of order n>=23, Delta^j R_1(A,q)>0 for j=0,1,2,3.",
        "rank_partition": {"Delta0_Delta1": DELTA01, "Delta2": DELTA2, "Delta3": DELTA3},
        "root_partition": "each rank package covers branch vertices, every pendant-path vertex including leaves, and every bridge-interior vertex",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Exactly e=2 rooted double claws, n>=23, and terminal differences Delta0..Delta3.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
