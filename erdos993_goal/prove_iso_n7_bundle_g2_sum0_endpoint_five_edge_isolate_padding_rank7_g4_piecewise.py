#!/usr/bin/env python3
"""Universal five-edge G2 theorem for isolated marks and endpoint parents."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import probe_iso_n7_bundle_g2_sum0_endpoint_five_edge_isolate_padding_rank7_g4_piecewise as probe


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g2_sum0_endpoint_five_edge_isolate_padding_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G2_SUM0_ENDPOINT_FIVE_EDGE_ISOLATE_"
    "PADDING_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "probe_iso_n7_bundle_g2_sum0_endpoint_five_edge_isolate_padding_rank7_g4_piecewise.py":
        "8C12519A48DE7A79370747CD87A0B948FD62ADBB071702D9B20B3FC74EFC5780",
    "probe_iso_n7_bundle_g2_sum0_endpoint_five_edge_isolate_padding_rank7_g4_piecewise_20260831.json":
        "C8ED56945475DDC6BDDE479C1FC6B500575034F2DF060EEA81E4FA0BC50A47DB",
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
    "prove_iso_n7_bundle_g2_sum0_no_parent_five_edge_isolate_padding_rank7_g4_piecewise.py":
        "CD8C791FFBCCB3B35A3B41F6C66DDA68EF0EDE249E6A8D3B927E5FE798E33B02",
    "iso_n7_bundle_g2_sum0_no_parent_five_edge_isolate_padding_exact_rank7_g4_piecewise_20260831.json":
        "E1DF140B3FE72BCE18721DD714B5431128E0C66F6BF411481FC74C291EFCAF6C",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name

    # Byte-identical replay of both endpoint reductions and all 16 core cones.
    probe.main()
    assert sha256(probe.OUTPUT) == DEPENDENCIES[probe.OUTPUT.name]
    raw = json.loads(probe.OUTPUT.read_text(encoding="utf-8"))
    assert raw["endpoint_u_v_symbolically_identical"] is True
    assert raw["five_edge_isolate_free_cores"] == 16
    assert raw["negative_binomial_coefficients"] == 0
    assert raw["global_minimum_binomial_coefficient"] == "896"
    assert raw["ordered_core_stream_sha256"] == (
        "E5AF418ACF85DD60E9407C7A53FE6A2D8A56A24FB474C8CB80B17EC7B41E0327"
    )
    assert [
        sum(record["core_order"] == order for record in raw["cores"])
        for order in range(6, 11)
    ] == [6, 5, 3, 1, 1]

    component_patterns = sorted({
        tuple(record["component_orders"]) for record in raw["cores"]
    }, reverse=True)
    expected_patterns = sorted({
        (6,), (5, 2), (4, 3), (4, 2, 2), (3, 3, 2),
        (3, 2, 2, 2), (2, 2, 2, 2, 2),
    }, reverse=True)
    assert component_patterns == expected_patterns

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let R be any isolate-free forest with exactly five edges and "
            "let t>=0. Put W=R plus t isolated unmarked vertices and take "
            "the rank-seven nonadjacent/common0/sum0 geometry with two "
            "additional distinct isolated marks u,v. In either endpoint-u "
            "or endpoint-v parent mode, the exact bundle coefficient G2 is "
            "strictly positive."
        ),
        "exact_endpoint_sum0_reduction": {
            "shifts": "A_k=B_k=W_(k-1), Z_k=W_(k-2)",
            "endpoint_u_v_symbolically_identical": True,
            "literal_G2_polynomial": (
                "12W2W3+18W2W4-51W2W5-99W2W6-51W2W7-8W2W8+"
                "26W3^2+87W3W4-14W3W5-63W3W6-18W3W7+"
                "85W4^2+66W4W5+10W5^2"
            ),
            "identity_reconstructed_from_pinned_parent_algebra": True,
        },
        "gapless_five_edge_core_classification": {
            "isolate_free_core_orders": [6, 10],
            "cores_by_order_6_through_10": [6, 5, 3, 1, 1],
            "total_cores": raw["five_edge_isolate_free_cores"],
            "component_order_patterns": [list(item) for item in expected_patterns],
            "coverage_gap": None,
        },
        "isolate_padding_certificate": {
            "basis": (
                "For every core, substitute W_k(t)=sum_j i_j(R) C(t,k-j) "
                "into the exact endpoint G2 polynomial and expand in the "
                "integer binomial basis C(t,r)."
            ),
            "negative_binomial_coefficients": 0,
            "global_minimum_binomial_coefficient": raw[
                "global_minimum_binomial_coefficient"
            ],
            "ordered_core_stream_sha256": raw["ordered_core_stream_sha256"],
            "cores": raw["cores"],
        },
        "coverage_gap_within_five_edge_isolated_marks_endpoint_G2": None,
        "remaining_rank7_G2_boundary": (
            "Ordinary-parent five-edge modes, other five-edge marked "
            "placements, and every six-or-more-edge core remain separate."
        ),
        "scope_guard": (
            "Rank-seven G2 only; exactly five W-edges; both marks isolated "
            "(nonadjacent/common0/sum0); endpoint-u or endpoint-v parent "
            "mode; arbitrary additional isolate padding. This is not a "
            "universal five-edge all-parent or all-marked-geometry theorem."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "endpoint_modes": ["endpoint_u", "endpoint_v"],
        "five_edge_cores": raw["five_edge_isolate_free_cores"],
        "negative_binomial_coefficients": 0,
        "minimum_binomial_coefficient": raw[
            "global_minimum_binomial_coefficient"
        ],
        "coverage_gap_within_five_edge_isolated_marks_endpoint_G2": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
