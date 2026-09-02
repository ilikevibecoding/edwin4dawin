#!/usr/bin/env python3
"""Universal five-edge G2 theorem for two isolated marks and no parent."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import probe_iso_n7_bundle_g2_sum0_no_parent_five_edge_isolate_padding_rank7_g4_piecewise as probe


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g2_sum0_no_parent_five_edge_isolate_padding_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G2_SUM0_NO_PARENT_FIVE_EDGE_ISOLATE_"
    "PADDING_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "probe_iso_n7_bundle_g2_sum0_no_parent_five_edge_isolate_padding_rank7_g4_piecewise.py":
        "142433ED71CFAA7DC7BFBAE82A90A689B9C6280815126D4F26E655B93B030E28",
    "probe_iso_n7_bundle_g2_sum0_no_parent_five_edge_isolate_padding_rank7_g4_piecewise_20260831.json":
        "E8323ACF9C7AF76F091D81F0AFB3412CF52962D742A1B7CD55682AAC9C9E03BB",
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

    # Byte-identical replay of the 16-core symbolic certificate.
    probe.main()
    assert sha256(probe.OUTPUT) == DEPENDENCIES[probe.OUTPUT.name]
    raw = json.loads(probe.OUTPUT.read_text(encoding="utf-8"))
    assert raw["five_edge_isolate_free_cores"] == 16
    assert raw["negative_binomial_coefficients"] == 0
    assert raw["global_minimum_binomial_coefficient"] == "1088"
    assert raw["ordered_core_stream_sha256"] == (
        "69B906B6622AB87A15938B9DF90C586D15D840E69B8E778B99B684AAB762534F"
    )
    assert [
        sum(record["core_order"] == order for record in raw["cores"])
        for order in range(6, 11)
    ] == [6, 5, 3, 1, 1]
    assert raw["component_order_patterns"] == [
        [6], [5, 2], [4, 3], [4, 2, 2], [3, 3, 2],
        [3, 2, 2, 2], [2, 2, 2, 2, 2],
    ]

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let R be any isolate-free forest with exactly five edges and "
            "let t>=0. Form the rank-seven nonadjacent/common0/sum0 marked "
            "forest by taking W=R plus t isolated unmarked vertices and two "
            "additional distinct isolated marks u,v, with no parent deleted. "
            "Then the exact bundle coefficient G2 is strictly positive."
        ),
        "exact_sum0_reduction": {
            "shifts": "A_k=B_k=W_(k-1), Z_k=W_(k-2)",
            "literal_G2_polynomial": (
                "16W2W3+20W2W4-68W2W5-107W2W6-51W2W7-8W2W8+"
                "28W3^2+100W3W4-16W3W5-63W3W6-18W3W7+"
                "91W4^2+66W4W5+10W5^2"
            ),
            "identity_reconstructed_from_pinned_parent_algebra": True,
        },
        "gapless_five_edge_core_classification": {
            "isolate_free_core_orders": [6, 10],
            "cores_by_order_6_through_10": [6, 5, 3, 1, 1],
            "total_cores": raw["five_edge_isolate_free_cores"],
            "component_order_patterns": raw["component_order_patterns"],
            "coverage_gap": None,
        },
        "isolate_padding_certificate": {
            "basis": (
                "For every core, substitute W_k(t)=sum_j i_j(R) C(t,k-j) "
                "into the exact G2 polynomial and expand in the integer "
                "binomial basis C(t,r)."
            ),
            "negative_binomial_coefficients": raw[
                "negative_binomial_coefficients"
            ],
            "global_minimum_binomial_coefficient": raw[
                "global_minimum_binomial_coefficient"
            ],
            "ordered_core_stream_sha256": raw["ordered_core_stream_sha256"],
            "cores": raw["cores"],
        },
        "coverage_gap_within_five_edge_isolated_marks_no_parent_G2": None,
        "remaining_rank7_G2_boundary": (
            "Other five-edge marked placements/parent modes and every "
            "six-or-more-edge core remain separate."
        ),
        "scope_guard": (
            "Rank-seven G2 only; exactly five W-edges; both marks isolated "
            "(nonadjacent/common0/sum0); no parent; arbitrary additional "
            "isolate padding. This is not a universal five-edge all-parent "
            "or all-marked-geometry theorem."
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
        "coverage_gap_within_five_edge_isolated_marks_no_parent_G2": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
