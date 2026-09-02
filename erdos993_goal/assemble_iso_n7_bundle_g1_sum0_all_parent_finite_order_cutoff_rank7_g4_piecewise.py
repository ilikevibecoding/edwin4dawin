#!/usr/bin/env python3
"""Assemble the common0/sum0 rank-seven G1 all-parent finite cutoff."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_all_parent_finite_order_cutoff_assembled_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_ALL_PARENT_FINITE_ORDER_CUTOFF_ASSEMBLED_RANK7_G4_PIECEWISE"
FILES = {
    "no_parent_source": "prove_iso_n7_bundle_g1_sum0_no_parent_finite_order_cutoff_rank7_g4_piecewise.py",
    "no_parent_report": "iso_n7_bundle_g1_sum0_no_parent_finite_order_cutoff_exact_rank7_g4_piecewise_20260831.json",
    "endpoint_source": "prove_iso_n7_bundle_g1_sum0_endpoint_finite_order_cutoff_rank7_g4_piecewise.py",
    "endpoint_report": "iso_n7_bundle_g1_sum0_endpoint_finite_order_cutoff_exact_rank7_g4_piecewise_20260831.json",
    "ordinary_source": "prove_iso_n7_bundle_g1_sum0_ordinary_finite_order_cutoff_rank7_g4_piecewise.py",
    "ordinary_report": "iso_n7_bundle_g1_sum0_ordinary_finite_order_cutoff_exact_rank7_g4_piecewise_20260831.json",
}
EXPECTED = {
    "no_parent_source": "DB751F95D1CC016869C219355446C057A107EA070CCA1BCAC431F019FDFC2C4E",
    "no_parent_report": "01175F2ED7439C79E08F06D3A7457131E8755EE132DB1303AF2AA729CCCEF05F",
    "endpoint_source": "070F5E6CEC61E16BA55D9AC9ACE98AD74CAC1B095EC2685AE4DCE3617BCE1B51",
    "endpoint_report": "D111AEACC17847A35A5BA1EAD74A3A84E2404691A3FD21FBBAE5DBE71B0EB605",
    "ordinary_source": "887E66D38BBC12773BA06427C9A54E096AC9A3A11A7EE742D288D0F2651F571D",
    "ordinary_report": "57847F795F12C9052FD4868F93AB56274176CF088B4F31A73B4DDB14A285A1E6",
}
MARKERS = {
    "no_parent_report": "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_NO_PARENT_FINITE_ORDER_CUTOFF_RANK7_G4_PIECEWISE",
    "endpoint_report": "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_ENDPOINT_FINITE_ORDER_CUTOFF_RANK7_G4_PIECEWISE",
    "ordinary_report": "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_ORDINARY_FINITE_ORDER_CUTOFF_RANK7_G4_PIECEWISE",
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
        assert reports[key]["marker"] == marker, key
        assert reports[key]["status"] == "proved exact", key
        assert reports[key]["coverage_gap_within_cutoff_scope"] is None, key
    assert reports["endpoint_report"]["endpoint_symmetry_checked"] is True
    assert reports["ordinary_report"]["ordinary_parent_scope"] == (
        "every p in W, isolated or non-isolated"
    )
    component_cutoffs = {
        "no_parent": reports["no_parent_report"]["cutoff"][
            "unmarked_order_m_at_least"
        ],
        "endpoint_u": reports["endpoint_report"]["cutoff"][
            "unmarked_order_m_at_least"
        ],
        "endpoint_v": reports["endpoint_report"]["cutoff"][
            "unmarked_order_m_at_least"
        ],
        "ordinary_parent_is_isolate": reports["ordinary_report"]["cutoff"][
            "unmarked_order_m_at_least"
        ],
        "ordinary_parent_in_nonisolated_core": reports["ordinary_report"]["cutoff"][
            "unmarked_order_m_at_least"
        ],
    }
    shared_cutoff = max(component_cutoffs.values())
    assert shared_cutoff == 411785737

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let C be a forest consisting of two isolated marked vertices and "
            "an unmarked forest W of order m>=411785737. Then the exact "
            "rank-seven bundle coefficient G1 is nonnegative for every "
            "canonical parent mode."
        ),
        "geometry": "nonadjacent_common0_sum0",
        "shared_unmarked_order_cutoff": shared_cutoff,
        "shared_total_order_cutoff": shared_cutoff+2,
        "component_cutoffs": component_cutoffs,
        "parent_mode_exhaustion": [
            {"mode": "no_parent", "dependency": "no_parent_report"},
            {"mode": "endpoint_u", "dependency": "endpoint_report"},
            {"mode": "endpoint_v", "dependency": "endpoint_report"},
            {
                "mode": "ordinary_parent_is_isolate",
                "dependency": "ordinary_report",
            },
            {
                "mode": "ordinary_parent_in_nonisolated_core",
                "dependency": "ordinary_report",
            },
        ],
        "coverage_gap_within_shared_cutoff_scope": None,
        "finite_residual": (
            "Common0/sum0 bundle cells with unmarked order m<411785737, "
            "outside separately pinned dense-isolate and finite regions."
        ),
        "scope": (
            "Rank-seven G1 only, common0/sum0 only. This closes all parent "
            "modes above the explicit safe cutoff; it does not close the finite "
            "residual or other marked geometries."
        ),
        "dependencies_sha256": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "shared_unmarked_order_cutoff": shared_cutoff,
        "parent_entries": len(report["parent_mode_exhaustion"]),
        "coverage_gap_within_shared_cutoff_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
