#!/usr/bin/env python3
"""Fail-closed classifier for the still-open rank-seven G2/G3 obligations.

The report pins the exact marked/parent algebra and finite base, then records
the exhaustive marked-geometry and ordinary-parent adjacency split.  It is a
scope certificate only: no large-order sign theorem is asserted here.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    marked_geometry_branches,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g23_large_order_residual_classifier_exact_rank7_g5_finish_20260831.json"
MARKER = "CLASSIFIED_EXACT_ISO_N7_BUNDLE_G23_LARGE_ORDER_RESIDUALS_RANK7_G5_FINISH"
FILES = {
    "g2_marked_source": "derive_iso_n7_bundle_g2_marked_partition_rank7_g5_finish.py",
    "g2_marked_report": "iso_n7_bundle_g2_marked_partition_exact_rank7_g5_finish_20260831.json",
    "g2_parent_source": "derive_iso_n7_bundle_g2_parent_modes_rank7_g5_finish.py",
    "g2_parent_report": "iso_n7_bundle_g2_parent_modes_exact_rank7_g5_finish_20260831.json",
    "g3_marked_source": "derive_iso_n7_bundle_g3_marked_partition_rank7_g4_piecewise.py",
    "g3_marked_report": "iso_n7_bundle_g3_marked_partition_exact_rank7_g4_piecewise_20260831.json",
    "g3_parent_source": "derive_iso_n7_bundle_g3_parent_modes_rank7_g4_piecewise.py",
    "g3_parent_report": "iso_n7_bundle_g3_parent_modes_exact_rank7_g4_piecewise_20260831.json",
    "finite_source": "assemble_iso_n7_bundle_g123_finite_n2_10_rank7_g4_piecewise.py",
    "finite_report": "iso_n7_bundle_g123_finite_n2_10_assembled_exact_rank7_g4_piecewise_20260831.json",
    "geometry_source": "prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein.py",
}
EXPECTED = {
    "g2_marked_source": "80301590C2A984A6A0BEC24B36CE2B039DDAB2D97055FC3FEC6F205FDB5D65FB",
    "g2_marked_report": "2BF3E8A4593CF7BC6517234B48BFA0D1862680E742087D5F9D01117626B3D285",
    "g2_parent_source": "149D3A55BBA58EE12EE5492C5353C340D851E5C43F74ABDDF45B6433821ACD32",
    "g2_parent_report": "B5638922DC71C493ECB5A64EA174441CA696A8C0B243A0B8D671C730855D9ED4",
    "g3_marked_source": "40CADA088220A0648405A6ECF64C8FD5EDE4AF26F6E5D74BCF7755753198D7CD",
    "g3_marked_report": "1678E5D6E117AAD2FF4EA1DA40D811E60B9ABCD69CD9A98873C77DE6EB551094",
    "g3_parent_source": "60147C54B07805ACBD8D688D2A86F907134C192E945ACFDA82049B3AC1167EA0",
    "g3_parent_report": "6977AF4DC4A353F5520BF6ED4450F0594DDDB7F8541128D28D52B8E77A4EB132",
    "finite_source": "B938DDCC0F798036EC1B01EA92169D4A5EF24A784754D42733CFA74C3240F5D9",
    "finite_report": "12457F9ADFFCFD268F19375566E488A8C9D2A25CC581597D5196705DC08E94D5",
    "geometry_source": "6B3106BCEE7F7ECA68C4C5B6861EF018E7E2023DFD8BA091CDAC1EA1FB0085A6",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(key: str) -> dict:
    path = HERE / FILES[key]
    assert sha256(path) == EXPECTED[key], key
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    for key in FILES:
        assert sha256(HERE / FILES[key]) == EXPECTED[key], key
    g2_marked = load("g2_marked_report")
    g2_parent = load("g2_parent_report")
    g3_marked = load("g3_marked_report")
    g3_parent = load("g3_parent_report")
    finite = load("finite_report")
    assert g2_marked["marker"] == (
        "DERIVED_EXACT_ISO_N7_BUNDLE_G2_MARKED_PARTITION_RANK7_G5_FINISH"
    )
    assert g2_parent["marker"] == (
        "DERIVED_EXACT_ISO_N7_BUNDLE_G2_PARENT_MODES_RANK7_G5_FINISH"
    )
    assert g3_marked["marker"] == (
        "DERIVED_EXACT_ISO_N7_BUNDLE_G3_MARKED_PARTITION_RANK7_G4_PIECEWISE"
    )
    assert g3_parent["marker"] == (
        "DERIVED_EXACT_ISO_N7_BUNDLE_G3_PARENT_MODES_RANK7_G4_PIECEWISE"
    )
    assert finite["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G123_FINITE_N2_10_ASSEMBLED_RANK7_G4_PIECEWISE"
    )
    assert finite["orders"] == [2, 10] and finite["negative_count"] == 0
    for parent in (g2_parent, g3_parent):
        assert tuple(parent["modes"]) == (
            "endpoint_u", "endpoint_v", "no_parent", "ordinary_parent"
        )
        assert parent["endpoint_symmetry_checked"] is True

    m, a, b, c, d = sp.symbols("m a b c d", nonnegative=True)
    geometry_labels = [
        row[0] for row in marked_geometry_branches(m, a, b, c, d)
    ]
    assert geometry_labels == [
        "adjacent",
        "nonadjacent_common1",
        "nonadjacent_common0_sum0",
        "nonadjacent_common0_sum1",
        "nonadjacent_common0_sum_ge2",
    ]

    # If p is an ordinary deleted parent, PF counts sets containing p.
    # A includes v, B includes u, and Z includes both, so adjacency to a mark
    # forces the corresponding P families to zero exactly.
    masks = {
        "p_u0_v0": {
            "active_P_families": ["PW", "PA", "PB", "PZ"],
            "geometries": geometry_labels,
        },
        "p_u1_v0": {
            "active_P_families": ["PW", "PA"],
            "forced_zero_P_families": ["PB", "PZ"],
            "geometries": [label for label in geometry_labels if label != "nonadjacent_common0_sum0"],
        },
        "p_u0_v1": {
            "active_P_families": ["PW", "PB"],
            "forced_zero_P_families": ["PA", "PZ"],
            "geometries": [label for label in geometry_labels if label != "nonadjacent_common0_sum0"],
        },
        "p_u1_v1": {
            "active_P_families": ["PW"],
            "forced_zero_P_families": ["PA", "PB", "PZ"],
            "geometries": ["nonadjacent_common1"],
        },
    }
    assert sum(len(row["geometries"]) for row in masks.values()) == 14

    per_coefficient_literal = 5 + 5 + 5 + 14
    per_coefficient_symmetry_quotient = 5 + 5 + 14
    assert per_coefficient_literal == 29
    assert per_coefficient_symmetry_quotient == 24
    report = {
        "marker": MARKER,
        "status": "exact scope classifier; no large-order sign theorem asserted",
        "closed": {
            "orders": "2<=n<=10",
            "coefficients": ["G2", "G3"],
            "modes_and_geometries": "all literal canonical bundle cells",
            "method": "pinned exact finite exhaustion",
        },
        "open_before_new_work": {
            "orders": "n>=11",
            "coefficients": ["G2", "G3"],
            "parent_modes": ["no_parent", "endpoint_u", "endpoint_v", "ordinary_parent"],
            "marked_geometries": geometry_labels,
            "ordinary_parent_adjacency_masks": masks,
            "literal_branch_obligations_per_coefficient": per_coefficient_literal,
            "literal_branch_obligations_total": 2 * per_coefficient_literal,
            "endpoint_symmetry_quotient_per_coefficient": per_coefficient_symmetry_quotient,
            "endpoint_symmetry_quotient_total": 2 * per_coefficient_symmetry_quotient,
        },
        "smallest_selected_residual": {
            "branch": "edgeless C = nonadjacent/common0/sum0 with zero W edges",
            "coefficients": ["G2", "G3"],
            "modes": ["no_parent", "endpoint_u", "endpoint_v", "ordinary_parent"],
            "reason": "one order parameter and no moment/deletion uncertainty",
        },
        "fail_closed_notes": [
            "The endpoint_u/v symmetry removes duplicate proof work but not literal cells.",
            "Ordinary-parent masks are listed separately because their active P-loss families differ.",
            "Finite evidence and algebraic reconstruction are not promoted to a universal sign theorem.",
        ],
        "dependencies_sha256": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "finite_closed": report["closed"],
        "large_order_literal_branches": 2 * per_coefficient_literal,
        "large_order_symmetry_quotient": 2 * per_coefficient_symmetry_quotient,
        "selected": report["smallest_selected_residual"]["branch"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
