#!/usr/bin/env python3
"""Universal five-edge G2 theorem for an ordinary parent in the core."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import probe_iso_n7_bundle_g2_sum0_ordinary_core_parent_five_edge_padding_rank7_g4_piecewise as probe


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g2_sum0_ordinary_core_parent_five_edge_padding_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G2_SUM0_ORDINARY_CORE_PARENT_FIVE_"
    "EDGE_PADDING_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "probe_iso_n7_bundle_g2_sum0_ordinary_core_parent_five_edge_padding_rank7_g4_piecewise.py":
        "FC0C725B46AA24F99E22BE9032151EE51FB49FBF9DD6FFC9FE637F9AE8954BFE",
    "probe_iso_n7_bundle_g2_sum0_ordinary_core_parent_five_edge_padding_rank7_g4_piecewise_20260831.json":
        "CC699C7A9F769B85D92D0B41195ABF63B58FC121F2BFD29776339B32191CFEDA",
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

    # Byte-identical replay of every literal core-vertex parent placement.
    probe.main()
    assert sha256(probe.OUTPUT) == DEPENDENCIES[probe.OUTPUT.name]
    raw = json.loads(probe.OUTPUT.read_text(encoding="utf-8"))
    assert raw["five_edge_isolate_free_cores"] == 16
    assert raw["literal_core_vertex_parent_placements"] == 114
    assert raw["negative_binomial_coefficients"] == 0
    assert raw["negative_values_at_zero_padding"] == 0
    assert raw["global_minimum_binomial_coefficient"] == "752"
    assert raw["global_minimum_value_at_zero_padding"] == "752"
    assert raw["ordered_placement_stream_sha256"] == (
        "30D745E1D5AAFFE801FE24840990DF38745AC1DAFF13540C35CA14F411D4CCB0"
    )
    assert [
        sum(
            1 for record in raw["placements"]
            if record["core_order"] == order
            and record["parent_vertex"] == 0
        )
        for order in range(6, 11)
    ] == [6, 5, 3, 1, 1]

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let R be any isolate-free forest with exactly five edges, let "
            "t>=0, and put W=R plus t isolated unmarked vertices. Add two "
            "distinct isolated marks u,v and choose any ordinary parent p "
            "among the vertices of R. In the rank-seven nonadjacent/common0/"
            "sum0 ordinary-parent-p mode, the exact bundle coefficient G2 "
            "is strictly positive."
        ),
        "exact_ordinary_parent_row_identity": raw["row_identity"],
        "exact_reduced_G2_polynomial_in_W_and_Q_rows": raw[
            "ordinary_core_parent_reduction"
        ],
        "gapless_five_edge_core_parent_classification": {
            "isolate_free_core_orders": [6, 10],
            "cores_by_order_6_through_10": [6, 5, 3, 1, 1],
            "total_cores": raw["five_edge_isolate_free_cores"],
            "literal_core_vertex_parent_placements": raw[
                "literal_core_vertex_parent_placements"
            ],
            "component_order_patterns": raw["component_order_patterns"],
            "coverage_gap": None,
        },
        "isolate_padding_certificate": {
            "basis": (
                "For every literal (R,p), substitute the exact padded "
                "independence rows of R and R-N[p] and expand G2 in the "
                "integer binomial basis C(t,r)."
            ),
            "negative_binomial_coefficients": 0,
            "global_minimum_binomial_coefficient": raw[
                "global_minimum_binomial_coefficient"
            ],
            "global_minimum_value_at_zero_padding": raw[
                "global_minimum_value_at_zero_padding"
            ],
            "ordered_placement_stream_sha256": raw[
                "ordered_placement_stream_sha256"
            ],
            "placements": raw["placements"],
        },
        "coverage_gap_within_five_edge_isolated_marks_ordinary_core_parent_G2": None,
        "remaining_rank7_G2_boundary": (
            "Other five-edge marked placements and every six-or-more-edge "
            "core remain separate."
        ),
        "scope_guard": (
            "Rank-seven G2 only; exactly five unmarked-core edges; both "
            "marks isolated (nonadjacent/common0/sum0); the ordinary deleted "
            "parent lies in the isolate-free core; arbitrary isolate padding."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "five_edge_cores": raw["five_edge_isolate_free_cores"],
        "literal_core_vertex_parent_placements": raw[
            "literal_core_vertex_parent_placements"
        ],
        "negative_binomial_coefficients": 0,
        "minimum_binomial_coefficient": raw[
            "global_minimum_binomial_coefficient"
        ],
        "coverage_gap_within_five_edge_isolated_marks_ordinary_core_parent_G2": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
