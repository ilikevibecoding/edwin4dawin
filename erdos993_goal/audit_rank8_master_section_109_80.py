#!/usr/bin/env python3
"""Fail-closed publication audit for master Section 109.80."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
MASTER = ROOT / "ARBITRARY_NEGATIVE_FACTOR_COMPATIBILITY_ROUTE_2026-08-06.md"
EXPECTED = {
    "RANK8_TERMINAL_DELTA03_ALL_ROOT_N24_FINITE_THEOREM_2026-08-20.md":
        "C362E3B89998E6AFB00D3A8575F8FCA88398C3EFE6D017DEEA0A08BFEBF5F725",
    "verify_rank8_terminal_delta03_finite_n24.rs":
        "02B51B72B4E75B332E3B4DFBC1497AD2C84E307B082EE49152D42D1B18E09468",
    "verify_rank8_terminal_delta03_finite_n24.exe":
        "398E61190A52F26ED961F04595CD3058BA5A85379DE49F5FD17A625C7253ECF1",
    "rank8_terminal_delta03_finite_n24_primary_20260820.log":
        "8FF4CE82AD545051D1259149CE4875D2CA5E6E3EDFF3314720FF00530CB9BFC4",
    "rank8_terminal_delta03_finite_n24_primary_20260820.err.log":
        "E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855",
    "audit_rank8_terminal_delta03_finite_n24.py":
        "2BE60B8C9814F5F64E61B1FD68A4FE521CF2FC877D94E333BDC061811E9B8097",
    "rank8_terminal_delta03_finite_n24_independent_audit_exact_20260820.json":
        "60F0DA73B3B6A749EE48E6D54DA2B044A97054235E5A0D04E12B4CD03B616428",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED, {
        name: {"expected": EXPECTED[name], "actual": actual[name]}
        for name in EXPECTED
        if EXPECTED[name] != actual[name]
    }
    report = json.loads(
        (ROOT / "rank8_terminal_delta03_finite_n24_independent_audit_exact_20260820.json")
        .read_text(encoding="utf-8")
    )
    assert report["status"] == "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N24"
    primary = report["primary"]
    assert primary["trees"] == 39_299_897
    assert primary["roots"] == primary["active_roots"] == 943_197_528
    assert primary["negative_counts"] == [0, 0, 0, 0]
    assert primary["minima"] == [
        34_473_285_324_077_064_192,
        110_853_430_454_951_847_936,
        191_062_683_117_818_942_976,
        265_702_252_552_979_633_664,
    ]
    assert primary["path_endpoint_witness"]["matches_all_global_minima"] is True
    assert report["source_successor"]["normalized_byte_for_byte_equal_to_n23"] is True
    assert report["i128_safety"]["delta3_bound_bits"] == 90
    assert report["i128_safety"]["integer_margin_floor"] == 195_376_292_558

    master = MASTER.read_text(encoding="utf-8")
    marker = "### 109.80 The entire order-24 rank-eight residual layer is closed"
    assert master.count(marker) == 1
    section = master.split(marker, 1)[1]
    for name, digest in EXPECTED.items():
        assert name in section and digest in section, name
    for phrase in (
        "39,299,897 free trees",
        "943,197,528 rooted pairs",
        "negative counts are exactly",
        "All four minima occur at an endpoint root of `P_24`",
        "gap now begins at core\norder 25",
        "not an all-order proof",
        "Problem 993",
    ):
        assert phrase in section, phrase

    payload = {
        "status": "PASS_PUBLICATION_AUDIT_RANK8_MASTER_SECTION_109_80",
        "immutable_inputs": actual,
        "core_order": 24,
        "free_trees": 39_299_897,
        "rooted_pairs": 943_197_528,
        "negative_counts": [0, 0, 0, 0],
        "connected_q8_complete": False,
        "master_sha256": sha256(MASTER),
    }
    output = ROOT / "rank8_master_section_109_80_publication_audit_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MASTER", payload["master_sha256"])
    print("REPORT", sha256(output))


if __name__ == "__main__":
    main()
