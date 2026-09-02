#!/usr/bin/env python3
"""Fail-closed assembly of dense-isolate rank-seven G1 for all parent modes."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_dense_isolates_all_parent_assembled_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_ISOLATES_ALL_PARENT_ASSEMBLED_RANK7_G4_PIECEWISE"
FILES = {
    "no_parent_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise.py",
    "no_parent_report": "iso_n7_bundle_g1_sum0_dense_isolates_exact_rank7_g4_piecewise_20260831.json",
    "endpoint_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_endpoint_rank7_g4_piecewise.py",
    "endpoint_report": "iso_n7_bundle_g1_sum0_dense_isolates_endpoint_exact_rank7_g4_piecewise_20260831.json",
    "ordinary_isolate_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_ordinary_isolate_rank7_g4_piecewise.py",
    "ordinary_isolate_report": "iso_n7_bundle_g1_sum0_dense_isolates_ordinary_isolate_exact_rank7_g4_piecewise_20260831.json",
    "ordinary_core_source": "prove_iso_n7_bundle_g1_sum0_dense_isolates_ordinary_core_rank7_g4_piecewise.py",
    "ordinary_core_report": "iso_n7_bundle_g1_sum0_dense_isolates_ordinary_core_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "no_parent_source": "2C810925F74E9F3F893F9434D195225CA04E5150CE78770B23F65E9BB15FA2CF",
    "no_parent_report": "683A7ACF848B0C415834C4C3382DC28883CE734230910AA4DE2D87FB80B724C7",
    "endpoint_source": "E86BDA463214959A97FD83D443B7B96721ACBDCD06412AD62916D6644BA481C1",
    "endpoint_report": "D698613BD1A3866D78F9E8532506682ABD1217603AB2500B6B2544F4724DE53D",
    "ordinary_isolate_source": "F0C47444A3F97FE742079FB5E967957B77B3B6D73FC764FF29D46652698DC6CA",
    "ordinary_isolate_report": "D9AD1544A889BA953C47A87AD02400FA83B50FC8E801A3CAC6A54035E23C9A9A",
    "ordinary_core_source": "8BBF84D8F2BE9A9A16244AB2ED282C89B2D13E191B63F145001E8F653FD9CBCC",
    "ordinary_core_report": "919E42B0114426DDD572B0FEDCCD35E07C312D0EFD66964795DEE70350897B89",
}
MARKERS = {
    "no_parent_report": "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_ISOLATES_RANK7_G4_PIECEWISE",
    "endpoint_report": "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_ISOLATES_ENDPOINT_RANK7_G4_PIECEWISE",
    "ordinary_isolate_report": "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_ISOLATES_ORDINARY_ISOLATE_RANK7_G4_PIECEWISE",
    "ordinary_core_report": "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_ISOLATES_ORDINARY_CORE_RANK7_G4_PIECEWISE",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest, key
    reports = {
        key: json.loads((HERE/FILES[key]).read_text(encoding="utf-8"))
        for key in MARKERS
    }
    for key, marker in MARKERS.items():
        report = reports[key]
        assert report["marker"] == marker, key
        assert report["status"] == "proved exact", key
        assert report["exact_power_inversion"] is True, key
    assert reports["no_parent_report"][
        "coverage_gap_within_dense_isolate_no_parent_G1"
    ] is None
    assert reports["endpoint_report"][
        "coverage_gap_within_dense_isolate_endpoint_G1"
    ] is None
    assert reports["endpoint_report"]["endpoint_symmetry_checked"] is True
    assert reports["ordinary_isolate_report"][
        "coverage_gap_within_dense_isolate_ordinary_isolate_G1"
    ] is None
    assert reports["ordinary_core_report"][
        "coverage_gap_within_dense_isolate_ordinary_core_G1"
    ] is None
    assert reports["ordinary_core_report"]["proof_facts"][
        "core_size"
    ] == "p in H implies h>=2"

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let C be a forest consisting of two isolated marked vertices and "
            "an unmarked forest W. If at least 90 percent of W is isolated, "
            "then the exact rank-seven bundle coefficient G1 is nonnegative "
            "for every canonical parent mode."
        ),
        "geometry": "nonadjacent_common0_sum0",
        "isolate_condition": "number of non-isolated W vertices <= |W|/10",
        "parent_mode_exhaustion": [
            {
                "mode": "no_parent",
                "dependency": "no_parent_report",
                "coverage_gap": None,
            },
            {
                "mode": "endpoint_u",
                "dependency": "endpoint_report",
                "coverage_gap": None,
            },
            {
                "mode": "endpoint_v",
                "dependency": "endpoint_report",
                "coverage_gap": None,
            },
            {
                "mode": "ordinary_parent_is_isolate",
                "dependency": "ordinary_isolate_report",
                "coverage_gap": None,
            },
            {
                "mode": "ordinary_parent_in_nonisolated_core",
                "dependency": "ordinary_core_report",
                "coverage_gap": None,
            },
        ],
        "ordinary_parent_partition": (
            "Write W canonically as H+rK1, with H induced by all non-isolated "
            "vertices. Every ordinary p lies either in the r isolates or in H."
        ),
        "ordinary_core_small_order_guard": {
            "claim": "ordinary p in H is impossible for n<=21",
            "proof": (
                "p in H implies |H|>=2; |H|<=|W|/10 then forces |W|>=20, "
                "and n=|W|+2>=22"
            ),
        },
        "coverage": [
            {
                "orders": "n<=1",
                "method": "vacuous: there is no distinct marked pair",
            },
            {
                "orders": "2<=n<=10",
                "method": "pinned exhaustive all-forest/all-parent finite certificate",
            },
            {
                "orders": "n>=11",
                "method": (
                    "four pinned exact large-order certificates exhausting five "
                    "parent entries, with literal reconstruction and exact inversion"
                ),
            },
        ],
        "coverage_gap_within_common0_sum0_dense_isolate_G1": None,
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Rank-seven G1 only, common0/sum0 only, with at least 90 percent "
            "isolated W vertices. The complementary regime with more than 10 "
            "percent non-isolated W vertices and other marked geometries remains open."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "parent_entries": len(report["parent_mode_exhaustion"]),
        "coverage_gap_within_common0_sum0_dense_isolate_G1": None,
        "ordinary_core_small_order_guard": report[
            "ordinary_core_small_order_guard"
        ]["claim"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
