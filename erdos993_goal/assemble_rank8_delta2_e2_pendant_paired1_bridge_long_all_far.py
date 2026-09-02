#!/usr/bin/env python3
"""Fail-closed assembler for paired-arm-1 pendant roots with bridge >=8."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
EXPECTED = {
    "audit_rank8_delta2_e2_pendant_two_short_far_paired1.py":
        "37516F82512350F3848B8CD92B5176256029B0E802449316F22A375044F21E18",
    "rank8_delta2_e2_pendant_two_short_far_paired1_independent_audit_exact_20260820.json":
        "4B00FCC36772987894D57A4CA498CE440DBAE69BE51B7F1843C6C112440905F1",
    "assemble_rank8_delta2_e2_pendant_at_most_one_short_far.py":
        "64789E74BE68AB6704FC57AE1959038DA25C60FA3285A4E11FBCBED181B07029",
    "rank8_delta2_e2_pendant_at_most_one_short_far_exact_20260820.json":
        "383E5F9652595CA14F8596D22E4B7D251F066FDF836DE78CF7DF236724BF5266",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text())


def main() -> None:
    assert {name: sha256(HERE / name) for name in EXPECTED} == EXPECTED
    two_short = load(
        "rank8_delta2_e2_pendant_two_short_far_paired1_independent_audit_exact_20260820.json"
    )
    at_most_one = load(
        "rank8_delta2_e2_pendant_at_most_one_short_far_exact_20260820.json"
    )
    assert two_short["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_TWO_SHORT_FAR_PAIRED1"
    assert two_short["unordered_far_pairs"] == 21
    assert two_short["root_position_patterns"] == 1344
    assert two_short["shifted_cells"] == 1358
    assert two_short["independent_literal_constants_checked"] == 1358
    assert at_most_one["status"] == "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_AT_MOST_ONE_SHORT_FAR"
    assert at_most_one["strict_positivity"] is True

    payload = {
        "schema": "rank8-delta2-e2-pendant-paired1-bridge-long-all-far-assembler-v1",
        "status": "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_PAIRED1_BRIDGE_LONG_ALL_FAR",
        "immutable_input_hashes": EXPECTED,
        "theorem_scope": (
            "every pendant-rooted e=2 double claw of order n>=23 with arbitrary selected arm/root, "
            "paired arm length1, arbitrary positive far-arm lengths, and bridge>=8"
        ),
        "far_pair_no_gap": (
            "if both far arms are <=6 use one of the 21 audited unordered pairs; otherwise at least "
            "one is >=7 and the at-most-one-short-far theorem applies"
        ),
        "strict_positivity": True,
        "scope_guard": "paired arms >=2 and central bridges <=7 remain outside this theorem",
    }
    output = HERE / "rank8_delta2_e2_pendant_paired1_bridge_long_all_far_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
