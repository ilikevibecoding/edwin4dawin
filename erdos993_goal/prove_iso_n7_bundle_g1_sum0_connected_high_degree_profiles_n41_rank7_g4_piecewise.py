#!/usr/bin/env python3
"""Exact finite base for the connected high-degree G1 profile cone."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import probe_iso_n7_bundle_g1_sum0_connected_high_degree_j4e5_profiles_rank7_g4_piecewise as cone


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_connected_high_degree_profiles_n41_exact_rank7_g4_piecewise_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_PROFILES_N41_RANK7_G4_PIECEWISE"
DEPENDENCIES = {
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_rank7_g4_piecewise.py":
        "300C8AF1CF91E42047B2A888908DFCC21E765778D1AD3B0E650B0713B8E64B92",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_p4_rank7_g4_piecewise.py":
        "005A3CF6E2A5F7B67D0B2EB2A0E9D63C5F9E8DD959EDAE82DA9BCBFE8BE78AF4",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_j4e5_profiles_rank7_g4_piecewise.py":
        "5C45A8CA7DC0C7DABD6BD146FFC8D9B65B48CDC1D7605BE26A358665E6B8CAE1",
}
ORDER = 41


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def admissible(parts):
    return parts and parts[0] >= 3 and sum(value >= 2 for value in parts) >= 3


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE/name) == digest, name
    # Use only the universal connected-tree P4>=n-3 floor, exactly as in the
    # frozen growth theorem; the stronger experimental profile floor is not
    # part of this finite base.
    cone.p4_floor = lambda order, increments: order-3
    stream = hashlib.sha256()
    profiles = 0
    controls_checked = 0
    negative = 0
    minimum = None
    for parts in cone.partitions(ORDER-2):
        if not admissible(parts):
            continue
        value, degrees, controls, p4, jmax = cone.relaxed(ORDER, parts)
        assert p4 == ORDER-3
        assert value == min(controls)
        for index, control in enumerate(controls):
            stream.update(f"{parts}|{index}|{control}\n".encode("ascii"))
            controls_checked += 1
            negative += 1 if control < 0 else 0
            candidate = (control, parts, index, jmax)
            minimum = candidate if minimum is None else min(minimum, candidate)
        profiles += 1
    assert profiles == 30787
    assert controls_checked == 277083
    assert negative == 0
    assert minimum == (10808976257, (10, 10, 10, 9), 6, 532)
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "At order 41, every tree degree profile with maximum degree at "
            "least four and at least three branching vertices has all nine "
            "controls of the pinned connected-tree G1 degree-profile "
            "relaxation nonnegative."
        ),
        "profile_coordinates": (
            "partition (x_i) of 39, x_i=d_i-1; max x_i>=3 and at least "
            "three x_i>=2"
        ),
        "certificate": {
            "order": ORDER,
            "profiles": profiles,
            "controls_per_profile": 9,
            "controls_checked": controls_checked,
            "negative_count": negative,
            "minimum_control": str(minimum[0]),
            "minimum_profile": list(minimum[1]),
            "minimum_control_index": minimum[2],
            "minimum_J4_upper": minimum[3],
            "ordered_control_stream_sha256": stream.hexdigest().upper(),
        },
        "coverage_gap_within_n41_profile_scope": None,
        "scope": (
            "Exact finite degree-profile relaxation base only. Validity of "
            "the support caps and actual connected-tree G1 promotion remain "
            "separate."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "profiles": profiles,
        "controls_checked": controls_checked,
        "negative_count": negative,
        "minimum_control": str(minimum[0]),
        "ordered_control_stream_sha256": stream.hexdigest().upper(),
        "coverage_gap_within_n41_profile_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
