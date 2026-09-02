#!/usr/bin/env python3
"""Fail-closed assembly and forced replay of the 8-corner common0/low chart."""

from __future__ import annotations

import argparse
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import subprocess
import sys


HERE = Path(__file__).resolve().parent
PRODUCER = HERE / "probe_iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_common0_low_flint_rank7_g5_finish.py"
PRODUCER_SHA256 = "1B094FF0ED54323482ECF885EDB149BDDBE570409F32ABF1AB4201E2A7518F37"
REDUCTION = HERE / "iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_safe_cap_exact_rank7_g5_finish_20260831.json"
REDUCTION_SHA256 = "DDCF16EA392A2D351028EB0282DD4001BD649E26B58A89848A3DF3BF049CE2AD"
CORNER_REPORT = HERE / "iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_four_corner_signs_exact_rank7_g5_finish_20260831.json"
CORNER_REPORT_SHA256 = "FFD9D6B32296C94E6BC9B4BD3C5FDFD3FEBBC9A8A0C1A0B07AD5A612024628D2"
REPLAY_RECEIPT = HERE / "iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_common0_low_replay_receipt_rank7_g5_finish_20260831.json"
OUTPUT = HERE / "iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_common0_low_matrix_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_SHARED_AP_COMMON0_LOW_MATRIX_RANK7_G5_FINISH"
PROBE_MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_SHARED_AP_COMMON0_LOW_FLINT_RANK7_G5_FINISH"
LOWER_SHA256 = "E27665FFF4F0766F63D345EA2B8041BF4CA13CF9F3F9A846FD7C6C296FD6689C"
EXPECTED = {
    (0, 0, 0): "EC1359BD8A1A878CCB91FB5CFC6931A807438833C5C181BAB1E0E8C62A382BE9",
    (0, 0, 1): "B7D0AED285E48FEA3EFDF3E7F40B550C6AEB9A3EBB73F879B0D857DB3183A945",
    (0, 1, 0): "381187FD3B7595A0471A73CCB2F3392AADE08F76D4E9FD24ECEE2035C0E3C9BC",
    (0, 1, 1): "460C1F1833F7F5CBEC261D61FB980C8782F5ADD88C683E23AB92D917B3DE7E6A",
    (1, 0, 0): "DEE5578E41BAAB2F502AA55FEF373876218F1FA52710803CD580E758E58617DB",
    (1, 0, 1): "82AF1A8700118A65D138B1E37838B6DC6DDED44192F776820D7548817DE9C4E0",
    (1, 1, 0): "2F11BDB9F8A4103F0AF0B12C31FA4A167489801AECFE21A95E1D6150D941A803",
    (1, 1, 1): "7532B52C50F5A31042EF6B6F69E72EAF99C6917259D63F9CBD69851BCF22CA4E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def report_path(bmask: int, cmask: int, d2mask: int) -> Path:
    return HERE / (
        "iso_n6_bundle_g2_nonadjacent_ordinary_shared_ap_common0_low_"
        f"B{bmask}_C{cmask}_D2{d2mask}_flint_rank7_g5_finish_20260831.json"
    )


def validate_report(corner, expected_hash):
    bmask, cmask, d2mask = corner
    path = report_path(*corner)
    assert sha256(path) == expected_hash, (corner, expected_hash, sha256(path))
    report = json.loads(path.read_text(encoding="utf-8"))
    assert report["marker"] == PROBE_MARKER
    assert (report["B_mask"], report["C_mask"], report["D2_mask"]) == corner
    assert report["geometry"] == "common0 low"
    assert report["ordinary_lower_sha256"] == LOWER_SHA256
    assert report["reduction_report_sha256"] == REDUCTION_SHA256
    assert report["processed_betas"] == len(report["records"]) == 70
    assert report["negative_betas"] == 0
    assert report["negative_controls"] == 0
    assert report["zero_controls"] == 0
    assert report["tensor_bernstein_coefficients"] == 9_919_943
    assert Fraction(report["minimum"]) == Fraction(1, 11520)
    assert all(record["negative"] == record["zero"] == 0 for record in report["records"])
    return report


def force_replay():
    records = []
    for index, (corner, expected_hash) in enumerate(sorted(EXPECTED.items()), 1):
        before = sha256(report_path(*corner))
        assert before == expected_hash
        command = [
            sys.executable, str(PRODUCER),
            "--b-mask", str(corner[0]),
            "--c-mask", str(corner[1]),
            "--d2-mask", str(corner[2]),
            "--chunk-columns", "4096",
        ]
        completed = subprocess.run(
            command, cwd=HERE, stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT, text=True, check=False,
        )
        assert completed.returncode == 0, (corner, completed.stdout[-4000:])
        after = sha256(report_path(*corner))
        assert after == before == expected_hash, (corner, before, after)
        validate_report(corner, expected_hash)
        records.append({
            "corner": {"B2": corner[0], "C2": corner[1], "D2": corner[2]},
            "before_sha256": before,
            "after_sha256": after,
            "byte_identical": True,
        })
        print(f"replay {index}/8 corner={corner} sha256={after}", flush=True)
    receipt = {
        "marker": "REPLAY_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_SHARED_AP_COMMON0_LOW_MATRIX_RANK7_G5_FINISH",
        "producer_sha256": PRODUCER_SHA256,
        "records": records,
        "all_byte_identical": True,
    }
    raw = json.dumps(receipt, indent=2, sort_keys=True) + "\n"
    REPLAY_RECEIPT.write_text(raw, encoding="utf-8", newline="\n")


def validate_receipt():
    receipt = json.loads(REPLAY_RECEIPT.read_text(encoding="utf-8"))
    assert receipt["marker"] == "REPLAY_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_SHARED_AP_COMMON0_LOW_MATRIX_RANK7_G5_FINISH"
    assert receipt["producer_sha256"] == PRODUCER_SHA256
    assert receipt["all_byte_identical"] is True
    assert len(receipt["records"]) == 8
    for item, (corner, expected_hash) in zip(receipt["records"], sorted(EXPECTED.items())):
        assert item["corner"] == {"B2": corner[0], "C2": corner[1], "D2": corner[2]}
        assert item["before_sha256"] == item["after_sha256"] == expected_hash
        assert item["byte_identical"] is True
    return receipt


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--force-replay", action="store_true")
    args = parser.parse_args()
    assert sha256(PRODUCER) == PRODUCER_SHA256
    assert sha256(REDUCTION) == REDUCTION_SHA256
    assert sha256(CORNER_REPORT) == CORNER_REPORT_SHA256
    if args.force_replay:
        force_replay()
    receipt = validate_receipt()
    reports = [validate_report(corner, expected) for corner, expected in sorted(EXPECTED.items())]
    report = {
        "marker": MARKER,
        "status": "PASS exact full 8-corner common0/low shared-A-p chart",
        "scope": "nonadjacent marks; ordinary p adjacent to neither; common0/low chart; N>=22",
        "geometry": reports[0]["parameterization"],
        "row_endpoint_reduction": {
            "B3_B4_C3_C4": "PATH",
            "B5_B6_C5_C6": "EDGELESS",
            "free_corners": ["B2", "C2", "D2"],
            "corner_count": 8,
        },
        "simplex_coefficients": sum(item["processed_betas"] for item in reports),
        "tensor_bernstein_coefficients": sum(item["tensor_bernstein_coefficients"] for item in reports),
        "negative_controls": sum(item["negative_controls"] for item in reports),
        "zero_controls": sum(item["zero_controls"] for item in reports),
        "minimum": str(min(Fraction(item["minimum"]) for item in reports)),
        "dual_byte_identical_replay": receipt["all_byte_identical"],
        "replay_receipt": {"file": REPLAY_RECEIPT.name, "sha256": sha256(REPLAY_RECEIPT)},
        "shards": [
            {
                "corner": {"B2": corner[0], "C2": corner[1], "D2": corner[2]},
                "file": report_path(*corner).name,
                "sha256": expected,
                "controls": reports[index]["tensor_bernstein_coefficients"],
                "minimum": reports[index]["minimum"],
            }
            for index, (corner, expected) in enumerate(sorted(EXPECTED.items()))
        ],
        "pins": {
            "producer": {"file": PRODUCER.name, "sha256": PRODUCER_SHA256},
            "reduction": {"file": REDUCTION.name, "sha256": REDUCTION_SHA256},
            "four_corner_signs": {"file": CORNER_REPORT.name, "sha256": CORNER_REPORT_SHA256},
        },
        "scope_guard": "This closes common0/low for N>=22 only; it does not close other geometries/charts, N<22, or universal G2.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    assert report["simplex_coefficients"] == 560
    assert report["tensor_bernstein_coefficients"] == 79_359_544
    assert report["negative_controls"] == report["zero_controls"] == 0
    assert Fraction(report["minimum"]) == Fraction(1, 11520)
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "corners": 8,
        "tensor_bernstein_coefficients": report["tensor_bernstein_coefficients"],
        "negative_controls": 0,
        "zero_controls": 0,
        "minimum": report["minimum"],
        "dual_byte_identical_replay": True,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPLAY_RECEIPT_SHA256", sha256(REPLAY_RECEIPT))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
