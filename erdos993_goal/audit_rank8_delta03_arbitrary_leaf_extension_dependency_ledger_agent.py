#!/usr/bin/env python3
"""Independent fail-closed audit of the arbitrary-leaf dependency ledger."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
BUILDER = HERE / "assemble_rank8_delta03_arbitrary_leaf_extension_dependency_ledger_agent.py"
LEDGER = HERE / "rank8_delta03_arbitrary_leaf_extension_dependency_ledger_agent_20260823.json"
OUTPUT = HERE / "rank8_delta03_arbitrary_leaf_extension_dependency_ledger_independent_audit_agent_20260823.json"
EXPECTED_BUILDER = "5D85F1078946303D0D8C6849A48AFE2AB84C8168152F52AE3B9ABC4DDCACB4E0"
EXPECTED_LEDGER = "3B6FF1685982C0F923C83E8D9CE8667966E050AED06A712C961D1021E63224BC"


def stable_bytes(path: Path) -> bytes:
    before = path.stat()
    data = path.read_bytes()
    after = path.stat()
    assert before.st_size == after.st_size == len(data), path.name
    assert before.st_mtime_ns == after.st_mtime_ns, path.name
    return data


def sha256(path: Path) -> str:
    return hashlib.sha256(stable_bytes(path)).hexdigest().upper()


def load(path: Path):
    return json.loads(stable_bytes(path).decode("utf-8"))


def main() -> None:
    assert sha256(BUILDER) == EXPECTED_BUILDER
    assert sha256(LEDGER) == EXPECTED_LEDGER
    ledger = load(LEDGER)
    assert ledger["status"] == "PARTIAL_EXACT_1_OF_12_GATE_RANK_OBLIGATIONS_SEALED_11_OPEN"

    manifest = ledger["dependency_manifest_sha256"]
    before = {name: sha256(HERE / name) for name in manifest}
    assert before == manifest

    symbolic = load(HERE / "rank8_delta03_arbitrary_leaf_extension_symbolic_dependency_agent_20260823.json")
    gates = ("new_leaf_root", "attach_at_old_root", "general_old_root")
    ranks = (0, 1, 2, 3)
    universe = {(gate, rank) for gate in gates for rank in ranks}
    for gate in gates:
        raw = symbolic["families"][gate + "_raw"]
        assert {int(row["rank"]) for row in raw} == set(ranks)
    assert "general_old_root_adjacent_structural" in symbolic["families"]
    assert "general_old_root" in symbolic["gate_meaning"]

    observed = [(row["gate"], int(row["rank"])) for row in ledger["cells"]]
    assert len(observed) == len(set(observed)) == len(universe) == 12
    assert set(observed) == universe
    states = {(row["gate"], int(row["rank"])): row["state"] for row in ledger["cells"]}
    sealed = {cell for cell, state in states.items() if state == "SEALED_AND_INDEPENDENTLY_AUDITED"}
    opened = {cell for cell, state in states.items() if state == "OPEN"}
    assert sealed == {("new_leaf_root", 0)}
    assert opened == universe - sealed
    assert ledger["counts"] == {
        "sealed_and_independently_audited": 1,
        "open": 11,
        "gaps": 0,
        "overlaps": 0,
    }

    theorem = load(HERE / "rank8_delta0_new_leaf_four_mask_complete_agent_20260823.json")
    theorem_audit = load(HERE / "rank8_delta0_new_leaf_four_mask_complete_independent_audit_agent_20260823.json")
    assert theorem["status"] == "PASS_EXACT_INDEPENDENTLY_AUDITED_DELTA0_NEW_LEAF_GATE_ALL_N_GE_27"
    assert theorem_audit["status"] == "PASS_INDEPENDENT_FOUR_CORNER_COMPOSITION_DELTA0_NEW_LEAF_GATE_ALL_N_GE_27"
    assert "source tree A of order n>=27" in theorem["theorem"]

    after = {name: sha256(HERE / name) for name in manifest}
    assert after == before
    payload = {
        "schema": "rank8-delta03-arbitrary-leaf-extension-dependency-ledger-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LEDGER_AUDIT_1_OF_12_SEALED_11_OPEN",
        "replayed_universe": {
            "gate_families": list(gates),
            "ranks": list(ranks),
            "total": len(universe),
            "sealed": 1,
            "open": 11,
            "gaps": 0,
            "overlaps": 0,
            "adjacent_general_old_root_not_double_counted": True,
        },
        "builder_sha256": EXPECTED_BUILDER,
        "ledger_sha256": EXPECTED_LEDGER,
        "dependency_manifest_sha256": manifest,
        "dependency_rehash_stable_within_run": True,
        "proof_boundary": ledger["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SEALED 1 OPEN 11 TOTAL 12")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
