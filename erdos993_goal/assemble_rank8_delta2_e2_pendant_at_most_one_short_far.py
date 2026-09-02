#!/usr/bin/env python3
"""Fail-closed assembler for the at-most-one-short-far pendant theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
EXPECTED = {
    "run_rank8_delta2_e2_pendant_far_pair_paired_cell.py":
        "FF46DF5F79A4E8253BAB8BFB8B0AFB0977EF3009745202D8B82BAD401CE112C5",
    "audit_rank8_delta2_e2_pendant_at_most_one_short_far.py":
        "D615E33F6969FC85D93D7AEC32DEF70B860A3984FB369B11608DF3988B846318",
    "rank8_delta2_e2_pendant_one_short_one_long_far_independent_audit_exact_20260820.json":
        "0CD9F1371ED8024BAF19FF98F6A1C437575F7BAE345CFE031AA90B91A45667F2",
    "assemble_rank8_delta2_e2_pendant_root_side_arbitrary_far_bridge_long.py":
        "A4F6E1ABD67F748858D2F99FFDD9C2FF1231272018F98BA58F9304C8554CD22D",
    "rank8_delta2_e2_pendant_root_side_arbitrary_far_bridge_long_exact_20260820.json":
        "97FE974A2BF6B160F84A82F729DA7D319095291DA8FB42B5ACA46E16BAC95DF5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text())


def main() -> None:
    assert {name: sha256(HERE / name) for name in EXPECTED} == EXPECTED
    boundary = load(
        "rank8_delta2_e2_pendant_one_short_one_long_far_independent_audit_exact_20260820.json"
    )
    long_long = load(
        "rank8_delta2_e2_pendant_root_side_arbitrary_far_bridge_long_exact_20260820.json"
    )
    assert boundary["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_ONE_SHORT_ONE_LONG_FAR"
    assert boundary["short_far_lengths"] == [1, 2, 3, 4, 5, 6]
    assert boundary["root_position_paired_patterns"] == 2688
    assert boundary["shifted_cells"] == 2723
    assert boundary["independent_literal_constants_checked"] == 2723
    assert long_long["status"] == "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_ROOT_SIDE_ARBITRARY_FAR_BRIDGE_LONG"
    assert long_long["strict_positivity"] is True

    payload = {
        "schema": "rank8-delta2-e2-pendant-at-most-one-short-far-assembler-v1",
        "status": "PASS_ASSEMBLED_RANK8_DELTA2_E2_PENDANT_AT_MOST_ONE_SHORT_FAR",
        "immutable_input_hashes": EXPECTED,
        "theorem_scope": (
            "every pendant-rooted e=2 double claw of order n>=23 with arbitrary selected arm/root, "
            "arbitrary paired arm, bridge>=8, and at most one far arm of length <=6"
        ),
        "far_pair_no_gap": (
            "by far-branch reversal the unordered pair is either (>=7,>=7), covered by the long-long "
            "package, or (s,>=7) for a unique fixed s in 1..6, covered by the boundary audit"
        ),
        "root_side_no_gap": "selected root gaps are 0..6/L and paired length is 1..6/L",
        "order_no_gap": "each low-base boundary pattern uses the audited shifted-coordinate union for n>=23",
        "strict_positivity": True,
        "scope_guard": "two far arms both of length <=6 remain outside this theorem",
    }
    output = HERE / "rank8_delta2_e2_pendant_at_most_one_short_far_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
