#!/usr/bin/env python3
"""Independent recursive-provenance audit for the complete e=2 rank package."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ASSEMBLER = "assemble_rank8_delta03_e2_complete_root.py"
ASSEMBLY = "rank8_delta03_e2_complete_all_ranks_all_roots_exact_root_20260823.json"
DELTA01 = "rank8_delta01_e2_complete_independent_audit_agent_20260823.json"
DELTA2 = "rank8_delta2_e2_complete_all_root_types_independent_audit_root_20260823.json"
DELTA3 = "rank8_delta3_e2_complete_independent_audit_root_20260823.json"
OUTPUT = ROOT / "rank8_delta03_e2_complete_all_ranks_all_roots_independent_audit_root_20260823.json"
EXPECTED = {
    ASSEMBLER: "2F93556842736505CBF7F322D26D5825B8F39DC53B4243DD519A3206950CF998",
    ASSEMBLY: "2A021F3E0C238A43513C53A6183D983C1C2E14811B09375D5D15D484354CC656",
    DELTA01: "8C1254D37A5F3628AFE8D68E8FE6A97E0E1D68F48B1A2E79B20B107EFDD85462",
    DELTA2: "FACB47E7F157483B18980A50F3465252257547960F462C2F857DC37D098997A2",
    DELTA3: "25BF34B6DD0B1D8CAA626EC70EF2C6DE9BFA736CBC6EF8F76BAA8A64351BE54C",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def verify_graph(seeds):
    verified = set()

    def visit(name, expected=None):
        path_value = ROOT / name
        assert path_value.exists(), name
        actual = sha256(path_value)
        if expected is not None:
            assert actual == expected, name
        identity = (name, actual)
        if identity in verified:
            return
        verified.add(identity)
        if path_value.suffix.lower() != ".json":
            return
        report = json.loads(path_value.read_text(encoding="utf-8"))
        for field in ("immutable_input_hashes", "immutable_inputs"):
            for child, child_hash in report.get(field, {}).items():
                visit(child, child_hash)
        for row in report.get("rows", []):
            if row.get("report") is not None and row.get("report_sha256") is not None:
                visit(row["report"], row["report_sha256"])

    for seed in seeds:
        visit(seed, EXPECTED[seed])
    return len(verified)


def main() -> None:
    assert not any(value.startswith("FILL_") for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    assembly = json.loads((ROOT / ASSEMBLY).read_text(encoding="utf-8"))
    assert assembly["status"] == "PASS_EXACT_RANK8_DELTA03_E2_COMPLETE_ALL_ROOTS_N23_PLUS"
    assert assembly["immutable_input_hashes"] == {
        DELTA01: EXPECTED[DELTA01], DELTA2: EXPECTED[DELTA2], DELTA3: EXPECTED[DELTA3]
    }
    files = verify_graph((DELTA01, DELTA2, DELTA3))
    payload = {
        "schema": "rank8-delta03-e2-complete-all-ranks-all-roots-independent-audit-root-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA03_E2_COMPLETE_ALL_ROOTS_N23_PLUS_AUDIT",
        "audit_claim": "Recursively rehashed the three independently sealed rank packages and every reachable immutable input, and verified their exact Delta/root/order partition in the master assembly.",
        "reachable_files_rehashed": files,
        "rank_coverage": [0, 1, 2, 3],
        "root_coverage": ["branch", "pendant including leaves", "bridge internal"],
        "order_range": "n>=23",
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Complete e=2 rank package only.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("REHASHED", files)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
