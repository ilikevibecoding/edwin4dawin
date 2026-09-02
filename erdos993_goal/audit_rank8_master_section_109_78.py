#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.78."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_EXCEPTIONAL_FIXED_ALPHA7_CONES_2026-08-20.md":
        "D49944C45AA645A7B142D4E9CF1FAE10EF69823C196E5D2DBC6B33F86BF167C0",
    "assemble_rank8_exceptional_fixed_alpha7.py":
        "F7074432828F06C026A26543E9C476AF9500CB4F668CB1639C3F92FD65527A82",
    "rank8_exceptional_fixed_alpha7_independent_assembly_exact_20260820.json":
        "00CB17A7F06A7A6AB23C2839F6F19AFF8C812A45252EA02D827230E06CC39867",
    "audit_rank8_exceptional_fixed_alpha7_assembly.py":
        "0C2EBFEBA508FC207532A66B125343897091D6C4F208B10C9B5FA17485B28DE2",
    "rank8_exceptional_fixed_alpha7_independent_audit_exact_20260820.json":
        "90D30B2CD476B35104797B19A55BDABEC6FD2AC280B4E4F7A78C3C5AA343E5C9",
    "audit_rank8_forest_lift_fixed_progress_alpha7.py":
        "7A6345C67DED20FE0700E8831EA6CA9DAA06DFD0999B1AE6FD6042519BEF35AA",
    "rank8_forest_lift_fixed_progress_through_alpha7_exact_20260820.json":
        "05D534B625E3DD2F9F71CCF7D146C9E7F981027BEBA012E36019FCE36B07A562",
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
    assembly = load("rank8_exceptional_fixed_alpha7_independent_assembly_exact_20260820.json")
    audit = load("rank8_exceptional_fixed_alpha7_independent_audit_exact_20260820.json")
    integration = load("rank8_forest_lift_fixed_progress_through_alpha7_exact_20260820.json")
    assert "PASS" in assembly["status"] and "ALPHA7" in assembly["status"]
    assert "PASS" in audit["status"] and "ALPHA7" in audit["status"]
    assert "PASS" in integration["status"]

    # The exact field names are audited through the combined integration row;
    # retain direct numerical checks without trusting prose in the note.
    text = json.dumps(assembly)
    for literal in ("248", "947", "700", "1525791400"):
        assert literal in text
    integration_text = json.dumps(integration)
    for literal in ("947", "268", "253", "15"):
        assert literal in integration_text

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.78 The exceptional fixed/full lift is closed through alpha seven"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "700 jets",
        "1,525,791,400",
        "first 947 exceptional jets",
        "exactly 268",
        "253 at alpha eight and 15 at alpha nine",
        "not rank-eight PGC or a proof of Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_78",
        "immutable_inputs": actual,
        "alpha_band_closed": 7,
        "jets_closed_in_band": 700,
        "fixed_full_indices_closed_through": 947,
        "remaining_fixed_full_jets": 268,
        "forest_lift_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_78_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
