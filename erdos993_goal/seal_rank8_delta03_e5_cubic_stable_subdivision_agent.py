#!/usr/bin/env python3
"""Fail-closed sealer for the independently audited cubic e=5 stable theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_cubic_stable_subdivision_sealed_agent_20260825.json"
EXPECTED = {
    "verify_rank8_delta03_e5_cubic_stable_subdivision_agent.py":
        "92C7CC84DE4C85B44ACB53BF6F6A3632425B738084ED019149E76C538AC800FF",
    "rank8_delta03_e5_cubic_stable_subdivision_exact_agent_20260825.json":
        "87F9BF323D5BD317F87F1755257718C5E25692435F3453C531A4DD95C52D0221",
    "audit_rank8_delta03_e5_cubic_stable_subdivision_literal_agent.py":
        "A8614061319E53DEFF225CCB1A24C4D3821800FB14CDB416BD31E04636AB9F35",
    "rank8_delta03_e5_cubic_stable_subdivision_independent_audit_agent_20260825.json":
        "C0083F2926D1A5626CF755F7F568C6F72800BE31F5D472139EA29B5BD19F9788",
    "verify_rank8_stable_path_offset_transfer_agent.py":
        "2EB0B6E4F073F0FC90FB023D2EC265D4C28CC58C5DF710EF45E17471085D578E",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json":
        "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(
        (ROOT / "rank8_delta03_e5_cubic_stable_subdivision_exact_agent_20260825.json")
        .read_text(encoding="utf-8")
    )
    audit = json.loads(
        (ROOT / "rank8_delta03_e5_cubic_stable_subdivision_independent_audit_agent_20260825.json")
        .read_text(encoding="utf-8")
    )
    transfer = json.loads(
        (ROOT / "rank8_stable_path_offset_transfer_exact_agent_20260822.json")
        .read_text(encoding="utf-8")
    )
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA03_E5_CUBIC_STABLE_SUBDIVISION"
    assert audit["status"] == "PASS_INDEPENDENT_LITERAL_AUDIT_RANK8_DELTA03_E5_CUBIC_STABLE_SUBDIVISION"
    assert transfer["status"] == "PASS_EXACT_RANK8_STABLE_PATH_OFFSET_TRANSFER"
    assert primary["root_location_orbits"] == audit["root_location_orbits"] == 24
    assert primary["literal_formula_checks"] == 96
    assert audit["literal_tree_evaluations"] == 696
    primary_keys = {
        (row["skeleton"], row["root_location_orbit"])
        for row in primary["cells"]
    }
    audit_keys = {
        (row["skeleton"], row["root_location_orbit"])
        for row in audit["cells"]
    }
    assert primary_keys == audit_keys and len(primary_keys) == 24
    for row in primary["cells"]:
        for rank in range(4):
            value = row["ranks"][str(rank)]["value"]
            increment = row["ranks"][str(rank)]["unit_subdivision_increment"]
            assert value["negative_newton_coefficients"] == 0
            assert increment["negative_newton_coefficients"] == 0
            assert int(value["base_value"]) > 0
            assert int(increment["base_value"]) > 0

    payload = {
        "schema": "rank8-delta03-e5-cubic-stable-subdivision-sealed-agent-v1",
        "status": "SEALED_EXACT_RANK8_DELTA03_E5_CUBIC_STABLE_SUBDIVISION",
        "root_location_orbits": 24,
        "ranks": [0, 1, 2, 3],
        "primary_literal_formula_checks": 96,
        "independent_literal_tree_evaluations": 696,
        "conclusion": primary["conclusion"],
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Seals every fully stable cell of the two cubic e=5 skeletons. Mixed and all-short boundary cells remain outside this artifact."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
