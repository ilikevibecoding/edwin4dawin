#!/usr/bin/env python3
"""Exact order-26 G1 theorem for trees containing a degree-two vertex.

Suppressing a degree-two vertex produces an eligible order-25 tree.  The
frozen order-25 minimum pays the exact worst lower bound for the subdivision
increment obtained from the normalized-shadow-chain profile certificate.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import probe_iso_n7_bundle_g1_edge_subdivision_normalized_shadow_chain_rank7_g4_piecewise as probe


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_no_parent_n26_degree2_subdivision_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_NO_PARENT_N26_DEGREE2_SUBDIVISION_"
    "RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "probe_iso_n7_bundle_g1_edge_subdivision_normalized_shadow_chain_rank7_g4_piecewise.py":
        "451F5073E906A6C2A1465228C2038065CA2FF5054B66022CC45837F41F45931F",
    "probe_iso_n7_bundle_g1_edge_subdivision_normalized_shadow_chain_rank7_g4_piecewise_20260831.json":
        "B1DCF8D9DBF057532B00D4ACE35FD3C582E2677260D0CE76E497175C595B6A37",
    "derive_iso_n7_bundle_g1_edge_subdivision_q_increment_shadow_obstruction_rank7_g4_piecewise.py":
        "3337E701EAE2E534F78E013F93FE3AA2437978794A3849FA44E7D67C4A9C8DB9",
    "iso_n7_bundle_g1_edge_subdivision_q_increment_shadow_obstruction_exact_rank7_g4_piecewise_20260831.json":
        "84CFD187FD13E8445E40129C83B11A5FBC69E62B2EDBC2F9803E0E08F4381A90",
    "derive_iso_n7_bundle_g1_edge_subdivision_g2_profile_cone_obstruction_rank7_g4_piecewise.py":
        "0023B1FDAE66FF2B446ABA956E4573B2E1DCAB1EC43436795DD697EA3CC6CA51",
    "iso_n7_bundle_g1_edge_subdivision_g2_profile_cone_obstruction_exact_rank7_g4_piecewise_20260831.json":
        "1F62A92CD0D19132942097FB020A04FEEBC210F7FB021ECC533CB0A6CEC7E65C",
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n25_gentree_shards_v2_rank7_g4_piecewise.py":
        "8F591FE6BABBBA2A458346C5BBF1C10E17CDCAFB08A7468E7A3A5FE90F93D5FD",
    "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n25_gentree_shards_v2_exact_rank7_g4_piecewise_20260831.json":
        "8CABC6621CDC3A5BA8CB86318DB740997A186F403798140FF5A26B9B3A84BA92",
}
EXPECTED_PROBE = {
    "profiles": 1002,
    "g2_endpoint_cases": 1958,
    "bernstein_controls": 123354,
    "negative_controls": 13,
    "zero_controls": 0,
    "minimum_control": "-1748196305/42",
    "minimum_profile": [2, 2, 2] + [1]*16,
    "minimum_g2": 233,
    "minimum_prefix": 1,
    "minimum_control_index": 6,
    "ordered_certificate_stream_sha256": (
        "59BE981CDC2ACAC668959416F0C139CCC06C7CF97E16EEA9AFA031E4E2A710B1"
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE / name) == digest, name

    # Byte-identical replay of the complete bounded profile certificate.
    probe.main()
    assert sha256(probe.OUTPUT) == DEPENDENCIES[probe.OUTPUT.name]
    raw = json.loads(probe.OUTPUT.read_text(encoding="utf-8"))
    for key, value in EXPECTED_PROBE.items():
        assert raw[key] == value, key

    order25 = json.loads((
        HERE /
        "iso_n7_bundle_g1_sum0_connected_high_degree_no_parent_n25_"
        "gentree_shards_v2_exact_rank7_g4_piecewise_20260831.json"
    ).read_text(encoding="utf-8"))
    assert order25["status"] == "proved exact"
    assert order25["coverage_gap_within_stated_actual_n25_scope"] is None
    old_minimum = Fraction(
        order25["gapless_census"]["global_minimum"]["minimum_value"]
    )
    increment_lower = Fraction(raw["minimum_control"])
    final_lower = old_minimum + increment_lower
    assert old_minimum == 19_817_975_778
    assert increment_lower == Fraction(-1_748_196_305, 42)
    assert final_lower == Fraction(830_606_786_371, 42) > 0

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Every connected 26-vertex tree W with maximum degree at least "
            "four, at least three branching vertices, and at least one "
            "degree-two vertex has strictly positive rank-seven common0/sum0 "
            "no-parent coefficient G1."
        ),
        "suppression_reduction": {
            "statement": (
                "Suppress a degree-two vertex of W. The result T is a "
                "25-vertex tree with the same degrees other than deleting "
                "that degree-two vertex, hence T retains maximum degree>=4 "
                "and at least three branching vertices. W is an edge "
                "subdivision of this eligible T."
            ),
            "old_order": 25,
            "contracted_profile_order": 24,
        },
        "normalized_shadow_increment_certificate": {
            "exact_identity": (
                "I(W)-I(T)=x I(T/uv), and the induced G1 difference is the "
                "pinned q subdivision increment with exact split-degree G2."
            ),
            "high_row_chain": [
                "6 H6 <= 19 H5", "7 H7 <= 18 H6", "8 H8 <= 17 H7"
            ],
            "monotonicity": (
                "For all seven normalized-shadow prefix candidates and every "
                "admissible G2, the H6,H7,H8 coefficients are strictly "
                "negative. Substitution of the chained upper bounds is "
                "therefore a rigorous lower relaxation."
            ),
            "degree_profiles": raw["profiles"],
            "eligible_split_degree_endpoint_cases": raw["g2_endpoint_cases"],
            "exact_bernstein_controls": raw["bernstein_controls"],
            "negative_increment_controls": raw["negative_controls"],
            "worst_increment_lower_bound": raw["minimum_control"],
            "ordered_certificate_stream_sha256": raw[
                "ordered_certificate_stream_sha256"
            ],
            "note": (
                "The 13 negative controls are harmless: the theorem uses "
                "their exact global lower bound, not a false claim that every "
                "subdivision increment is nonnegative."
            ),
        },
        "payment": {
            "frozen_order25_global_minimum": str(old_minimum),
            "subdivision_increment_lower_bound": str(increment_lower),
            "resulting_order26_lower_bound": str(final_lower),
            "strictly_positive": True,
        },
        "coverage_gap_within_stated_n26_degree2_scope": None,
        "remaining_actual_n26_scope": (
            "Connected 26-vertex trees in the same G1 cell with no "
            "degree-two vertex. Orders 27..31 also remain open."
        ),
        "scope_guard": (
            "This is an exact theorem only for the rank-seven G1 "
            "common0/sum0 no-parent cell at order 26 with a degree-two "
            "vertex. It does not promote the degree-two-free order-26 lane "
            "or any order 27..31."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "order": 26,
        "degree_two_lane": "proved exact",
        "resulting_lower_bound": str(final_lower),
        "coverage_gap_within_stated_n26_degree2_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
