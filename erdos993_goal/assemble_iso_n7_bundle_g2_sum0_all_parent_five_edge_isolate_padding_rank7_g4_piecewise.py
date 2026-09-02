#!/usr/bin/env python3
"""All-parent assembly for five-edge G2 with two isolated marks."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g2_sum0_all_parent_five_edge_isolate_padding_assembled_"
    "exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G2_SUM0_ALL_PARENT_FIVE_EDGE_ISOLATE_"
    "PADDING_ASSEMBLED_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "prove_iso_n7_bundle_g2_sum0_no_parent_five_edge_isolate_padding_rank7_g4_piecewise.py":
        "CD8C791FFBCCB3B35A3B41F6C66DDA68EF0EDE249E6A8D3B927E5FE798E33B02",
    "iso_n7_bundle_g2_sum0_no_parent_five_edge_isolate_padding_exact_rank7_g4_piecewise_20260831.json":
        "E1DF140B3FE72BCE18721DD714B5431128E0C66F6BF411481FC74C291EFCAF6C",
    "prove_iso_n7_bundle_g2_sum0_endpoint_five_edge_isolate_padding_rank7_g4_piecewise.py":
        "0E9AB0B01CC62D018092C547E9A2005BF0CD26F683422DB3E0CE1C562C6DCB01",
    "iso_n7_bundle_g2_sum0_endpoint_five_edge_isolate_padding_exact_rank7_g4_piecewise_20260831.json":
        "FFAEB47F52CA06A6C76AD6700DC11E72C327DAD5A4E9DEC61CD152181549DE6D",
    "prove_iso_n7_bundle_g2_sum0_ordinary_isolate_parent_five_edge_padding_rank7_g4_piecewise.py":
        "1A6A5791A71CEF98C466B176A23519E053F3A05E566E6A57EA3520629C7BEF8B",
    "iso_n7_bundle_g2_sum0_ordinary_isolate_parent_five_edge_padding_exact_rank7_g4_piecewise_20260831.json":
        "AAD57B8F6F754C4EB2828005B988E5D1938207FA3ECA05B63B6C25DDF6AE0FC0",
    "prove_iso_n7_bundle_g2_sum0_ordinary_core_parent_five_edge_padding_rank7_g4_piecewise.py":
        "4DD85E5AE3EF52FE3AA4E4E769D1A18E02BB0F63C7712050CFF816DBD3DFC4E7",
    "iso_n7_bundle_g2_sum0_ordinary_core_parent_five_edge_padding_exact_rank7_g4_piecewise_20260831.json":
        "70985F5E70D4A48BCD40155AFE9F02B2E1F5264954238C2D413508B760C57B5D",
}
REPORTS = {
    "no_parent": (
        "iso_n7_bundle_g2_sum0_no_parent_five_edge_isolate_padding_exact_"
        "rank7_g4_piecewise_20260831.json"
    ),
    "endpoints": (
        "iso_n7_bundle_g2_sum0_endpoint_five_edge_isolate_padding_exact_"
        "rank7_g4_piecewise_20260831.json"
    ),
    "ordinary_parent_isolate": (
        "iso_n7_bundle_g2_sum0_ordinary_isolate_parent_five_edge_padding_exact_"
        "rank7_g4_piecewise_20260831.json"
    ),
    "ordinary_parent_core": (
        "iso_n7_bundle_g2_sum0_ordinary_core_parent_five_edge_padding_exact_"
        "rank7_g4_piecewise_20260831.json"
    ),
}
EXPECTED_MARKERS = {
    "no_parent": (
        "PASS_EXACT_ISO_N7_BUNDLE_G2_SUM0_NO_PARENT_FIVE_EDGE_ISOLATE_"
        "PADDING_RANK7_G4_PIECEWISE"
    ),
    "endpoints": (
        "PASS_EXACT_ISO_N7_BUNDLE_G2_SUM0_ENDPOINT_FIVE_EDGE_ISOLATE_"
        "PADDING_RANK7_G4_PIECEWISE"
    ),
    "ordinary_parent_isolate": (
        "PASS_EXACT_ISO_N7_BUNDLE_G2_SUM0_ORDINARY_ISOLATE_PARENT_FIVE_"
        "EDGE_PADDING_RANK7_G4_PIECEWISE"
    ),
    "ordinary_parent_core": (
        "PASS_EXACT_ISO_N7_BUNDLE_G2_SUM0_ORDINARY_CORE_PARENT_FIVE_"
        "EDGE_PADDING_RANK7_G4_PIECEWISE"
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name

    reports = {
        mode: json.loads((HERE / name).read_text(encoding="utf-8"))
        for mode, name in REPORTS.items()
    }
    for mode, report in reports.items():
        assert report["status"] == "proved exact", mode
        assert report["marker"] == EXPECTED_MARKERS[mode], mode
        assert report["gapless_five_edge_core_classification"]["total_cores"] == 16 \
            if mode != "ordinary_parent_core" \
            else report["gapless_five_edge_core_parent_classification"]["total_cores"] == 16

    assert reports["no_parent"][
        "coverage_gap_within_five_edge_isolated_marks_no_parent_G2"
    ] is None
    assert reports["endpoints"][
        "coverage_gap_within_five_edge_isolated_marks_endpoint_G2"
    ] is None
    assert reports["ordinary_parent_isolate"][
        "coverage_gap_within_five_edge_isolated_marks_ordinary_isolate_parent_G2"
    ] is None
    assert reports["ordinary_parent_core"][
        "coverage_gap_within_five_edge_isolated_marks_ordinary_core_parent_G2"
    ] is None
    assert reports["ordinary_parent_core"][
        "gapless_five_edge_core_parent_classification"
    ]["literal_core_vertex_parent_placements"] == 114

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let W be any forest with exactly five edges and let u,v be two "
            "additional distinct isolated marked vertices. For every "
            "compatible canonical parent mode (no parent, endpoint u, "
            "endpoint v, or any ordinary parent p in W), the exact "
            "rank-seven nonadjacent/common0/sum0 bundle coefficient G2 is "
            "strictly positive."
        ),
        "gapless_parent_partition": {
            "no_parent": "pinned no-parent isolate-padding theorem",
            "endpoint_u": "pinned endpoint theorem; u/v reductions identical",
            "endpoint_v": "pinned endpoint theorem; u/v reductions identical",
            "ordinary_parent": {
                "p_is_an_isolate_of_W": "pinned ordinary-isolate theorem",
                "p_lies_in_isolate_free_core_of_W": "pinned 114-placement ordinary-core theorem",
                "partition_gap": None,
            },
            "all_compatible_parent_modes_covered": True,
            "coverage_gap": None,
        },
        "gapless_five_edge_forest_factorization": {
            "statement": (
                "Every five-edge forest W decomposes uniquely as its "
                "isolate-free five-edge core R plus isolate padding."
            ),
            "isolate_free_cores": 16,
            "core_orders": [6, 10],
            "cores_by_order_6_through_10": [6, 5, 3, 1, 1],
            "coverage_gap": None,
        },
        "coverage_gap_within_five_edge_isolated_marks_all_parent_G2": None,
        "remaining_rank7_G2_boundary": (
            "Other marked placements for five-edge W and all six-or-more-"
            "edge W remain separate."
        ),
        "scope_guard": (
            "Rank-seven G2 only; W has exactly five edges; both marks are "
            "isolated (nonadjacent/common0/sum0); all compatible parent "
            "modes. This is not a universal five-edge all-marked-geometry "
            "or six-plus-edge theorem."
        ),
        "dependency_reports": REPORTS,
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "parent_modes": [
            "no_parent", "endpoint_u", "endpoint_v",
            "ordinary_parent_isolate", "ordinary_parent_core",
        ],
        "five_edge_isolate_free_cores": 16,
        "ordinary_core_parent_placements": 114,
        "coverage_gap_within_five_edge_isolated_marks_all_parent_G2": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
