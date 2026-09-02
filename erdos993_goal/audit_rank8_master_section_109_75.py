#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.75."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_DELTA013_E2_ALL_LONG_ROOT_CELLS_THEOREM_2026-08-20.md":
        "39A2BD00A4F10BC8764BD8D1F035EE965E51EE85A6E8D8EDA4881E254B3CBD80",
    "assemble_rank8_delta013_e2_all_long.py":
        "0A34A5C62D7BE89CED10BA00AB81F9C4D4CB4132A1A918BDF23AA9C6938D81AC",
    "rank8_delta013_e2_all_long_exact_20260820.json":
        "753DF4C499A78021C50E32C700B93FBCB16877003EF8265F4106D63C45AB5701",
    "audit_rank8_delta2_e2_long_pair_sum_identity.py":
        "A63B505EA6F50FFAACB6DBBBCF1A5707E5105122FFE65D9A846117DD7688005B",
    "rank8_delta2_e2_long_pair_sum_independent_audit_exact_20260820.json":
        "3D08D942263C416BD799F4BBA5822B3289CD92BCBEE936520D95B23FFD2CAB46",
    "probe_rank8_delta013_e2_symmetric_long_cells.py":
        "32CC4A331D388143640809AD4F07D18B002AB9A16C1F0C40769D9923F7DD0085",
    "audit_rank8_delta013_e2_symmetric_long_cells.py":
        "D5EB865FC0923F0AF43B89F8EEC6092FD5EE081E78E50EDA00DFA7A4D5F3875E",
    "rank8_delta013_e2_symmetric_long_independent_audit_exact_20260820.json":
        "7872A0B5F181B4F15FC54DDFB9E54B57E1412C3BDC620D477911192EABE55A1B",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED
        if EXPECTED[name] != actual[name]
    }
    theorem = load("rank8_delta013_e2_all_long_exact_20260820.json")
    sum_audit = load("rank8_delta2_e2_long_pair_sum_independent_audit_exact_20260820.json")
    lower_audit = load("rank8_delta013_e2_symmetric_long_independent_audit_exact_20260820.json")
    assert theorem["status"] == "PASS_EXACT_RANK8_DELTA013_E2_ALL_LONG_ROOT_CELLS"
    assert sum_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_LONG_PAIR_SUM_AND_ROOT_CELLS"
    assert lower_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA013_E2_SYMMETRIC_LONG_CELLS"
    cells = theorem["cells"]
    assert len(cells) == 12
    assert {(row["rank"], row["root_type"]) for row in cells} == {
        (rank, root_type)
        for rank in range(4)
        for root_type in ("branch", "bridge_interior", "pendant")
    }
    for row in cells:
        report = load(f"rank8_delta{row['rank']}_e2_{row['root_type']}_symmetric_long_exact_20260820.json")
        assert report["status"] == "PASS_POSITIVE_SYMMETRIC_COEFFICIENT_CELL"
        assert report["negative_coefficients"] == 0
        assert Fraction(report["constant_coefficient"]) > 0
    assert "only through S=A+B" in theorem["sum_only_identity"]
    assert theorem["scope_guard"].startswith("This is not an all-order theorem for every e=2 root")

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.75 The all-long degree-surplus-two cells are closed exactly"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for text in (
        "all twelve cells",
        "branch root",
        "pendant-arm root",
        "bridge-interior root",
        "c3=C(n-2,3)+2",
        "short arm, bridge, near segment, or tail segment",
        "does not prove connected `Q8` or Problem 993",
    ):
        assert text in section, text

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_75",
        "immutable_inputs": actual,
        "closed_cells": 12,
        "closed_ranks": [0, 1, 2, 3],
        "root_types": ["branch", "bridge_interior", "pendant"],
        "general_e2_complete": False,
        "connected_Q8_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_75_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
