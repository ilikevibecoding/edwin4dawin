#!/usr/bin/env python3
"""Universal five-edge G2 theorem for an isolated ordinary parent."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import probe_iso_n7_bundle_g2_sum0_ordinary_isolate_parent_five_edge_padding_rank7_g4_piecewise as probe


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g2_sum0_ordinary_isolate_parent_five_edge_padding_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G2_SUM0_ORDINARY_ISOLATE_PARENT_FIVE_"
    "EDGE_PADDING_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "probe_iso_n7_bundle_g2_sum0_ordinary_isolate_parent_five_edge_padding_rank7_g4_piecewise.py":
        "6B1B6013EF3BC91A1299C88D2F5E42B28AAC315EA44F0A769A2A3B6845DC21D2",
    "probe_iso_n7_bundle_g2_sum0_ordinary_isolate_parent_five_edge_padding_rank7_g4_piecewise_20260831.json":
        "7242843E34D2B9C854BBB7A109FF9B82F7E99B8CFA70E714D90C33431D2AEB07",
    "derive_iso_n7_bundle_g2_marked_partition_rank7_g5_finish.py":
        "80301590C2A984A6A0BEC24B36CE2B039DDAB2D97055FC3FEC6F205FDB5D65FB",
    "iso_n7_bundle_g2_marked_partition_exact_rank7_g5_finish_20260831.json":
        "2BF3E8A4593CF7BC6517234B48BFA0D1862680E742087D5F9D01117626B3D285",
    "derive_iso_n7_bundle_g2_parent_modes_rank7_g5_finish.py":
        "149D3A55BBA58EE12EE5492C5353C340D851E5C43F74ABDDF45B6433821ACD32",
    "iso_n7_bundle_g2_parent_modes_exact_rank7_g5_finish_20260831.json":
        "B5638922DC71C493ECB5A64EA174441CA696A8C0B243A0B8D671C730855D9ED4",
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_support_caps_rank7_g4_piecewise.py":
        "744618134C3D41A052345A237DA842941DC59D9F71937888321DD57216C647DD",
    "iso_n7_bundle_g1_sum0_connected_high_degree_support_caps_exact_rank7_g4_piecewise_20260831.json":
        "7267A522C6D5D729C762360B6B20CDF8B8FD93574D8FF6C977371542C79667C1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name

    # Byte-identical replay of the exact row reduction and all 16 core cones.
    probe.main()
    assert sha256(probe.OUTPUT) == DEPENDENCIES[probe.OUTPUT.name]
    raw = json.loads(probe.OUTPUT.read_text(encoding="utf-8"))
    assert raw["ordinary_isolated_parent_reduction_symbols"] == [
        f"X{k}" for k in range(1, 9)
    ]
    assert raw["five_edge_isolate_free_cores"] == 16
    assert raw["negative_binomial_coefficients"] == 0
    assert raw["global_minimum_binomial_coefficient"] == "2376"
    assert raw["ordered_core_stream_sha256"] == (
        "917F9DB884B8B9BFBB9D67C18812EEC9B8F74369902A888E56F5C4E5C5775DF0"
    )
    assert [
        sum(record["core_order"] == order for record in raw["cores"])
        for order in range(6, 11)
    ] == [6, 5, 3, 1, 1]

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let R be any isolate-free forest with exactly five edges and "
            "let t>=0. Take X=R plus t isolated unmarked vertices, then add "
            "a distinguished isolated ordinary parent p and two additional "
            "distinct isolated marks u,v. In the rank-seven nonadjacent/"
            "common0/sum0 ordinary-parent-p mode, the exact bundle "
            "coefficient G2 is strictly positive."
        ),
        "exact_ordinary_parent_row_identity": raw["row_identity"],
        "exact_reduced_G2_polynomial_in_X_rows": raw[
            "ordinary_isolated_parent_reduction"
        ],
        "gapless_five_edge_core_classification": {
            "isolate_free_core_orders": [6, 10],
            "cores_by_order_6_through_10": [6, 5, 3, 1, 1],
            "total_cores": raw["five_edge_isolate_free_cores"],
            "component_order_patterns": raw["component_order_patterns"],
            "coverage_gap": None,
        },
        "isolate_padding_certificate": {
            "basis": (
                "For every core, substitute X_k(t)=sum_j i_j(R) C(t,k-j) "
                "into the exact ordinary-isolated-parent G2 polynomial and "
                "expand in the integer binomial basis C(t,r)."
            ),
            "negative_binomial_coefficients": 0,
            "global_minimum_binomial_coefficient": raw[
                "global_minimum_binomial_coefficient"
            ],
            "ordered_core_stream_sha256": raw["ordered_core_stream_sha256"],
            "cores": raw["cores"],
        },
        "coverage_gap_within_five_edge_isolated_marks_ordinary_isolate_parent_G2": None,
        "remaining_rank7_G2_boundary": (
            "Ordinary parents lying in the five-edge core, other five-edge "
            "marked placements, and every six-or-more-edge core remain "
            "separate."
        ),
        "scope_guard": (
            "Rank-seven G2 only; exactly five unmarked-core edges; both "
            "marks isolated (nonadjacent/common0/sum0); the ordinary deleted "
            "parent itself isolated; arbitrary other isolate padding. This "
            "does not cover an ordinary parent incident to a core edge."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "five_edge_cores": raw["five_edge_isolate_free_cores"],
        "negative_binomial_coefficients": 0,
        "minimum_binomial_coefficient": raw[
            "global_minimum_binomial_coefficient"
        ],
        "coverage_gap_within_five_edge_isolated_marks_ordinary_isolate_parent_G2": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
