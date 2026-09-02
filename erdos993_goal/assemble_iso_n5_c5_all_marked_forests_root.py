#!/usr/bin/env python3
"""Fail-closed universal assembly of the rank-five C5 inequality.

Every pair of distinct marked vertices in a forest lies in exactly one of
three classes: adjacent, nonadjacent in the same component, or in different
components.  Dedicated exact all-order certificates cover those classes.
This assembler pins them and checks that their scopes form a disjoint,
exhaustive partition.

The result is the universal C5 subtheorem only.  It does not assert the
remaining M5+3*C5 inequality, g1, universal rank five, or Problem 993.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_c5_all_marked_forests_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_C5_ALL_MARKED_FORESTS_ROOT"

DEPENDENCIES = {
    "adjacent": {
        "source": "prove_iso_n5_c5_adjacent_all_forest_g1_bernstein.py",
        "source_sha256": "CF6DC882AB21949470B2A8F100D3057D9BF7F3D63AF6C7BD8256853D4E5F05E5",
        "report": "iso_n5_c5_adjacent_all_forest_exact_g1_bernstein_20260830.json",
        "report_sha256": "A39192A5F27BF51249E8A0DC357CB23EE9AAB4C0E33B5ACF5A28447428690BB5",
        "marker": "PASS_EXACT_ISO_N5_C5_ADJACENT_ALL_FOREST_G1_BERNSTEIN",
    },
    "connected_nonadjacent": {
        "source": "prove_iso_n5_c5_connected_nonadjacent_all_forest_g1_nonadjacent.py",
        "source_sha256": "4AEE620CB154B0BEB8A72EA19E0C64E860ACC23E9D73F6939E09354A7C2EE763",
        "report": "iso_n5_c5_connected_nonadjacent_all_forest_exact_g1_nonadjacent_20260830.json",
        "report_sha256": "91160843C5B3A3878BBDCFFDE7667649B5A608F24C1886F0F8221F69BAF4D0DE",
        "marker": "PRODUCED_EXACT_ISO_N5_C5_CONNECTED_NONADJACENT_ALL_FOREST_G1_NONADJACENT",
        "assembly_source": "assemble_iso_n5_c5_connected_nonadjacent_all_forest_g1_nonadjacent.py",
        "assembly_source_sha256": "FA86DD62E1B9026AD00120EDDFA6E33B1948A0DD7F2465B1089978ACBC3ED365",
        "assembly_report": "iso_n5_c5_connected_nonadjacent_all_forest_assembled_g1_nonadjacent_20260830.json",
        "assembly_report_sha256": "352F9DF0D512C32112C4099BF58715C3426A03E6770E08C1276058BCF7989ED8",
        "assembly_marker": "PASS_EXACT_ISO_N5_C5_CONNECTED_NONADJACENT_ALL_FOREST_ASSEMBLED_G1_NONADJACENT",
    },
    "different_components": {
        "source": "prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent.py",
        "source_sha256": "DD1112EC4A72A9DA18979084D03462AC0073E8C86927E3306142171E39134A05",
        "report": "iso_n5_c5_disconnected_nonadjacent_exact_g1_nonadjacent_20260830.json",
        "report_sha256": "51636F0BB3B599BCCF5251C0AAE8DD7D0C7689AFDFDC09E41A9B9312257A3BFD",
        "marker": "PASS_EXACT_ISO_N5_C5_DISCONNECTED_NONADJACENT_G1_NONADJACENT",
        "independent_audit_source": "audit_iso_n5_c5_disconnected_nonadjacent_independent_root.py",
        "independent_audit_source_sha256": "B2F7E26B8C95FDBC7D20DFECF8A87EB9F490A0FD2A8CFF3A03FED36723BB4876",
        "independent_audit_report": "iso_n5_c5_disconnected_nonadjacent_independent_audit_root_20260830.json",
        "independent_audit_report_sha256": "394EE779B2E11CD50E6662F8BD15E6592A4656B5122E24B5FCF990345016EBA0",
        "independent_audit_marker": "PASS_INDEPENDENT_EXACT_ISO_N5_C5_DISCONNECTED_NONADJACENT_AUDIT_ROOT",
    },
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load_and_pin(label: str, dependency: dict) -> dict:
    assert sha256(HERE / dependency["source"]) == dependency["source_sha256"], label
    assert sha256(HERE / dependency["report"]) == dependency["report_sha256"], label
    report = json.loads((HERE / dependency["report"]).read_text(encoding="utf-8"))
    assert report["marker"] == dependency["marker"], label
    assert "C5" in report["theorem"], label
    if "assembly_source" in dependency:
        assert sha256(HERE / dependency["assembly_source"]) == dependency["assembly_source_sha256"]
        assert sha256(HERE / dependency["assembly_report"]) == dependency["assembly_report_sha256"]
        assembly = json.loads((HERE / dependency["assembly_report"]).read_text(encoding="utf-8"))
        assert assembly["marker"] == dependency["assembly_marker"]
        assert assembly["independent_fail_closed_audit"]["producer_hashes"] == {
            dependency["report"]: dependency["report_sha256"],
            dependency["source"]: dependency["source_sha256"],
        }
    if "independent_audit_source" in dependency:
        assert sha256(HERE / dependency["independent_audit_source"]) == dependency["independent_audit_source_sha256"]
        assert sha256(HERE / dependency["independent_audit_report"]) == dependency["independent_audit_report_sha256"]
        audit = json.loads((HERE / dependency["independent_audit_report"]).read_text(encoding="utf-8"))
        assert audit["marker"] == dependency["independent_audit_marker"]
    return report


def main() -> None:
    loaded = {label: load_and_pin(label, row) for label, row in DEPENDENCIES.items()}

    # Logical trichotomy for two distinct vertices in a forest.  Connected
    # pairs are separated by whether uv is an edge; disconnected pairs form
    # the third class.  The predicates are mutually exclusive by definition.
    partition = [
        {
            "case": "adjacent",
            "predicate": "u and v lie in the same component and uv is an edge",
            "certificate": DEPENDENCIES["adjacent"]["marker"],
        },
        {
            "case": "connected_nonadjacent",
            "predicate": "u and v lie in the same component and uv is not an edge",
            "certificate": DEPENDENCIES["connected_nonadjacent"]["assembly_marker"],
        },
        {
            "case": "different_components",
            "predicate": "u and v lie in different components",
            "certificate": DEPENDENCIES["different_components"]["marker"],
        },
    ]
    assert len({row["case"] for row in partition}) == 3

    finite_counts = {
        "adjacent_mark_cells_orders_2_to_14": loaded["adjacent"]["finite_certificate"]["adjacent_mark_cells"],
        "connected_nonadjacent_mark_cells_orders_2_to_14": loaded["connected_nonadjacent"]["finite_certificate"]["connected_nonadjacent_mark_cells"],
        "different_component_componentwise_deletion_patterns_orders_0_to_12": loaded["different_components"]["phi_gap_finite_certificate"]["componentwise_deletion_checks"],
    }
    assert finite_counts == {
        "adjacent_mark_cells_orders_2_to_14": 165944,
        "connected_nonadjacent_mark_cells_orders_2_to_14": 748426,
        "different_component_componentwise_deletion_patterns_orders_0_to_12": 200255,
    }

    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite forest G and every pair of distinct vertices u,v, "
            "C5=[z^4w^4]R(E,U,V,W)-[z^3w^5]R(E,U,V,W) is nonnegative."
        ),
        "case_partition": partition,
        "partition_is_disjoint_and_exhaustive": True,
        "finite_replay_counts": finite_counts,
        "all_order_certificates": {
            "adjacent": "finite |G|<=14 plus 8 exact Bernstein branches for |A|>=13",
            "connected_nonadjacent": "finite |G|<=14 plus exceptional r=-1 and 23 exact Bernstein branches for |A|>=13",
            "different_components": "finite componentwise deletions |P|<=12 plus five all-order Phi-gap bounds and seven convolution rows",
        },
        "dependencies": DEPENDENCIES,
        "audit_status": (
            "The different-component case has an independent implementation audit. "
            "Cross-implementation audits of the adjacent and connected-nonadjacent "
            "producers are tracked separately and are not asserted here."
        ),
        "scope": (
            "Universal C5 only. This does not prove M5, M5+3*C5, g1, "
            "universal rank five, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "cases": [row["case"] for row in partition],
        "finite_replay_counts": finite_counts,
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
