#!/usr/bin/env python3
"""Fail-closed full pendant assembler for arbitrary arm lengths, bridge >=8."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
EXPECTED = {
    "assemble_rank8_delta2_e2_pendant_at_most_one_short_far.py":
        "64789E74BE68AB6704FC57AE1959038DA25C60FA3285A4E11FBCBED181B07029",
    "rank8_delta2_e2_pendant_at_most_one_short_far_exact_20260820.json":
        "383E5F9652595CA14F8596D22E4B7D251F066FDF836DE78CF7DF236724BF5266",
    "assemble_rank8_delta2_e2_pendant_paired1_bridge_long_all_far.py":
        "A34A1D0C9EA9B9A3ACDDF2850870F2BE20AF96D4438CF4718A084E09283474E6",
    "rank8_delta2_e2_pendant_paired1_bridge_long_all_far_exact_20260820.json":
        "4AA5057A376568698835A5D7008BD0113BC1DD04E8029A1ACCC40913DA42C157",
    "assemble_rank8_delta2_e2_pendant_paired2_bridge_long_all_far.py":
        "A25E51D28B79D2E202AA2D0F20C8C15949185A052F7255A6E1FE81ACAE5C7632",
    "rank8_delta2_e2_pendant_paired2_bridge_long_all_far_exact_20260820.json":
        "D0FF4A8FE5ABADD6CEE8086EEC6A062EF35DA02AD85E73687A6D242E7032299A",
    "assemble_rank8_delta2_e2_pendant_paired3_bridge_long_all_far.py":
        "1CDEF905BF6BDF5AFF79552D66D3530C225B5C49A19AA702C570CA0BB2EF9088",
    "rank8_delta2_e2_pendant_paired3_bridge_long_all_far_exact_20260820.json":
        "94C19BFD4DECA62500076DE88CAC5AE67F45B6151E0F0AF6D67435D7B70DDCD7",
    "assemble_rank8_delta2_e2_pendant_paired4_bridge_long_all_far.py":
        "7844A51F76340C8E7A50DD171C4320BA2EEEA28A3B120E0C7778AB3ECD58141D",
    "rank8_delta2_e2_pendant_paired4_bridge_long_all_far_exact_20260820.json":
        "A9C03E619E65FBE88E5EA12488C2EF993353A103EF7B4C4B2A86BDA4AA494C3B",
    "assemble_rank8_delta2_e2_pendant_paired5_bridge_long_all_far.py":
        "7A3F50FA3FBDD6CDECA337AB33FD657B8931FFFDFFA1DF97BED903AFA57CBFB7",
    "rank8_delta2_e2_pendant_paired5_bridge_long_all_far_exact_20260820.json":
        "95FDC12AD3AC40260D825EB7AC692C92C62309F461EF7AE084DCF079DEE609F4",
    "assemble_rank8_delta2_e2_pendant_paired6_bridge_long_all_far.py":
        "7699E8AA454F21476F5A8B52DAED9884EB5A892DA5652AAB2EFD25F0876A01C7",
    "rank8_delta2_e2_pendant_paired6_bridge_long_all_far_exact_20260820.json":
        "260A97A115C400EDAFBA36086A4CFCD04E790B0F18F23254D1BA5D05709F8CA3",
    "assemble_rank8_delta2_e2_pendant_pairedlong_bridge_long_all_far.py":
        "BD33A6C6DCC6441B0E795433CC62894D6686EE13BEFF4C0747A303CD121ADFF4",
    "rank8_delta2_e2_pendant_pairedlong_bridge_long_all_far_exact_20260820.json":
        "190FF084CF1C0602C259F10F1E1003A771F749655C884FE1FD4F515B2A78B53E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text())


def main() -> None:
    assert {name: sha256(HERE / name) for name in EXPECTED} == EXPECTED
    at_most_one = load(
        "rank8_delta2_e2_pendant_at_most_one_short_far_exact_20260820.json"
    )
    assert at_most_one["status"] == "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_AT_MOST_ONE_SHORT_FAR"
    assert at_most_one["strict_positivity"] is True

    paired_reports = []
    for paired in range(1, 7):
        report = load(
            f"rank8_delta2_e2_pendant_paired{paired}_bridge_long_all_far_exact_20260820.json"
        )
        assert report["status"] == f"PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_PAIRED{paired}_BRIDGE_LONG_ALL_FAR"
        assert report["strict_positivity"] is True
        paired_reports.append(report["status"])
    paired_long = load(
        "rank8_delta2_e2_pendant_pairedlong_bridge_long_all_far_exact_20260820.json"
    )
    assert paired_long["status"] == "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_PAIREDLONG_BRIDGE_LONG_ALL_FAR"
    assert paired_long["strict_positivity"] is True
    paired_reports.append(paired_long["status"])

    assert len(paired_reports) == 7
    payload = {
        "schema": "rank8-delta2-e2-pendant-bridge-long-all-arm-lengths-assembler-v1",
        "status": "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_BRIDGE_LONG_ALL_ARM_LENGTHS",
        "immutable_input_hashes": EXPECTED,
        "theorem_scope": (
            "every pendant-rooted e=2 double claw of order n>=23 with arbitrary selected arm/root, "
            "arbitrary positive paired-arm and far-arm lengths, and central bridge>=8"
        ),
        "paired_arm_no_gap": "each positive paired length is exactly one of 1,2,3,4,5,6 or >=7",
        "far_arm_no_gap": (
            "within every paired state, both far arms<=6 use the audited 21-pair triangle; otherwise "
            "the Section-109.91 at-most-one-short-far theorem applies"
        ),
        "master_dependency_sections": ["109.91", "109.92", "109.94", "109.97", "109.99", "109.100", "109.101"],
        "paired_state_reports": paired_reports,
        "strict_positivity": True,
        "scope_guard": "central bridges<=7 and non-pendant root types remain outside this theorem",
    }
    output = HERE / "rank8_delta2_e2_pendant_bridge_long_all_arm_lengths_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
