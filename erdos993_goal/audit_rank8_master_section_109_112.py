#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.112."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_LOW_LOW_FULL_EARLY_SUFFIX45_REDISTRIBUTION_THEOREM_2026-08-22.md":
        "E3F0A34642D2BAF0CD0E15FD8D54BB604E9470749D02B4CA02024F04AEFC0999",
    "verify_rank8_low_low_suffix45_redistribution_identity.py":
        "FC954DCB651571B845274DFEE67FBF9B5D787B73652A6017FC23B07487C1F3A5",
    "rank8_low_low_suffix45_redistribution_identity_exact_20260822.json":
        "DC5AC4905E04E14B4D628F90AD238809D4B58943A40404183FCCCD8366D4ECDD",
    "audit_rank8_low_low_suffix45_redistribution_support.py":
        "61E663284E68AC03493A8586F6CA9B4DCB2D54F25B45DC25EB727DB2D9825D50",
    "rank8_low_low_suffix45_redistribution_support_audit_20260822.json":
        "21A8442A699F9A5CAC95F95D64DB330A09B6CE7BD31F4E3FE865D2AF7222B38E",
    "probe_rank8_low_low_full_early_suffix45_redistribution_bernstein_cell.py":
        "54631D4D2721F9208DC42C5BB1024FA7E6D199DEC5CF0FD52D173837BFC23159",
    "verify_rank8_low_low_full_early_suffix45_redistribution_cells.py":
        "16C323A355CDA03BF5466694897FF6036DDE1D1AD2DF5DC2913A873C9A53FE45",
    "rank8_low_low_full_early_suffix45_redistribution_exact_20260822.json":
        "846145E70AD06754450951C233E92C249770BBBCD02A1061C8AD78A122E13183",
    "audit_rank8_low_low_full_early_suffix45_redistribution.py":
        "A1BF5852F0CDE4D736D03E3E3A4ADB73AB052A40DCA5345C7D4F4C38267044B6",
    "rank8_low_low_full_early_suffix45_redistribution_audit_20260822.json":
        "784C9F6343FC4058E4A60BF5BD5742B5A1A67766A7CC1EF926BC5FCA58684ABE",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    identity = json.loads(
        (ROOT / "rank8_low_low_suffix45_redistribution_identity_exact_20260822.json")
        .read_text(encoding="utf-8")
    )
    support = json.loads(
        (ROOT / "rank8_low_low_suffix45_redistribution_support_audit_20260822.json")
        .read_text(encoding="utf-8")
    )
    primary = json.loads(
        (ROOT / "rank8_low_low_full_early_suffix45_redistribution_exact_20260822.json")
        .read_text(encoding="utf-8")
    )
    independent = json.loads(
        (ROOT / "rank8_low_low_full_early_suffix45_redistribution_audit_20260822.json")
        .read_text(encoding="utf-8")
    )
    assert identity["status"] == "PASS_EXACT_SUFFIX45_REDISTRIBUTION_IDENTITY"
    assert support["status"] == "PASS_INDEPENDENT_SUFFIX45_REDISTRIBUTION_SUPPORT_AUDIT"
    assert primary["status"] == (
        "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX45_REDISTRIBUTION_GRID"
    )
    assert independent["status"] == (
        "PASS_INDEPENDENT_SUFFIX45_REDISTRIBUTION_GRID_AUDIT"
    )
    assert primary["outer_cells"] == independent["complete_cell_keys"] == 182
    assert independent["new_bernstein_positions"] == 7
    assert independent["new_exact_coefficients"] == 592_762_759
    assert independent["negative_coefficients"] == 0
    assert independent["strict_minimum_over_nonempty_rows"] == 4

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.112 The simultaneous full-early/suffix-4/5 low/low join is closed"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "each factor row is affine",
        "bidegree at most\n`(2,2)`",
        "remaining seven tensor\npositions",
        "592,762,759 exact coefficients",
        "global minimum 4",
        "Suffix index 3 is the only remaining adjusted-gap slack",
        "Problem 993\nremain open",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_112",
        "immutable_inputs": actual,
        "total_slack_cells": 182,
        "new_bernstein_positions": 7,
        "new_exact_coefficients": 592_762_759,
        "negative_coefficients": 0,
        "strict_minimum": 4,
        "full_low_low_complete": False,
        "remaining_join": "suffix index 3",
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_112_publication_audit_20260822.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
