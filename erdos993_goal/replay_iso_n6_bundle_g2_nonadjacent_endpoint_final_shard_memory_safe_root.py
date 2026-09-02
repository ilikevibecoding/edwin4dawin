#!/usr/bin/env python3
"""Memory-safe byte-identical replay of the one endpoint shard that OOMed.

The frozen producer materializes ``list(source.terms())`` solely to count
terms.  This replay imports its exact source builder and certificate routine,
uses the equivalent constant-memory ``len(source)``, and requires the full
serialized report to equal the frozen original byte for byte.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from flint import fmpq_mpoly_ctx

import probe_iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_wedge_flint_root as producer


HERE = Path(__file__).resolve().parent
FROZEN_PRODUCER = HERE / (
    "probe_iso_n6_bundle_g2_nonadjacent_endpoint_"
    "ratio_floor_wedge_flint_root.py"
)
FROZEN_PRODUCER_SHA256 = (
    "AC3B4977FA225B33E38AAE7120478FB789C8329CB1D5001C5ED4C3FD85E214F1"
)
ORIGINAL = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_wedge_"
    "common0_high_far_B_ge_C_B1_C1_D21_N19_flint_probe_root_20260831.json"
)
ORIGINAL_SHA256 = (
    "1D7ABA824B5B529A18D3D15B70BAB563CBA4DF7D0A582A2FFA257F99E3C998CA"
)
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_wedge_"
    "common0_high_far_B_ge_C_B1_C1_D21_N19_"
    "memory_safe_replay_root_20260831.json"
)
MARKER = (
    "PASS_REPLAY_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
    "FINAL_SHARD_MEMORY_SAFE_ROOT"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(FROZEN_PRODUCER) == FROZEN_PRODUCER_SHA256
    assert sha256(ORIGINAL) == ORIGINAL_SHA256
    assert producer.sha256(producer.OCCUPATION) == producer.OCCUPATION_SHA256
    assert producer.sha256(producer.ADJACENT_REDUCTION) == producer.ADJACENT_REDUCTION_SHA256
    assert producer.sha256(producer.LARGE_REDUCTION) == producer.LARGE_REDUCTION_SHA256
    assert producer.sha256(producer.RATIO_FLOOR) == producer.RATIO_FLOOR_SHA256

    case = ("common0", "high_far", "B_ge_C", 1, 1, 1)
    geometry, chart, orientation, bmask, cmask, d2mask = case
    names = ("x", "y", "z", "w", "t", "r0", "r1", "r2", "r3", "h")
    context = fmpq_mpoly_ctx.get(names, "degrevlex")
    source, metadata = producer.build_source(
        context, geometry, chart, orientation, bmask, cmask, d2mask
    )
    source_terms = len(source)

    coefficient_context = fmpq_mpoly_ctx.get(
        ("x", "y", "z", "w", "t", "h"), "degrevlex"
    )
    target_context = fmpq_mpoly_ctx.get(
        ("x", "y", "z", "w", "t", "H"), "degrevlex"
    )
    certificate = producer.coefficient_records(
        source,
        coefficient_context,
        target_context,
        "endpoint_parent_lower",
        4096,
        prefix_count=5,
        simplex_count=4,
        tail_count=1,
        bounded_count=5,
    )
    report = {
        "marker": producer.MARKER,
        **metadata,
        "source_terms": source_terms,
        "endpoint_lower_certificate": certificate,
        "negative_controls": certificate["negative"],
        "scope": (
            "N>=19, one ordered nonadjacent endpoint-parent orientation/chart/"
            "B2/C2/D2 corner; exact relaxation probe only"
        ),
        "occupation_report_sha256": producer.OCCUPATION_SHA256,
        "adjacent_four_corner_report_sha256": producer.ADJACENT_REDUCTION_SHA256,
        "large_corner_reduction_report_sha256": producer.LARGE_REDUCTION_SHA256,
        "ratio_floor_report_sha256": producer.RATIO_FLOOR_SHA256,
        "source_sha256": FROZEN_PRODUCER_SHA256,
    }
    assert report["negative_controls"] == 0
    assert report["endpoint_lower_certificate"]["negative"] == 0
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    raw_hash = hashlib.sha256(raw.encode()).hexdigest().upper()
    assert raw_hash == ORIGINAL_SHA256, (raw_hash, ORIGINAL_SHA256)
    assert raw.encode() == ORIGINAL.read_bytes()
    OUTPUT.write_bytes(raw.encode())
    assert sha256(OUTPUT) == ORIGINAL_SHA256
    print(json.dumps({
        "marker": MARKER,
        "case": list(case),
        "source_terms": source_terms,
        "negative_controls": 0,
        "minimum": certificate["minimum"],
        "original_sha256": ORIGINAL_SHA256,
        "replay_sha256": sha256(OUTPUT),
        "byte_identical": True,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", sha256(Path(__file__)))
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
