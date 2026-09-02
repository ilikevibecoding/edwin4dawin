#!/usr/bin/env python3
"""Exact m=39,40 profile bridge using the strengthened core-P4 floor."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import probe_iso_n7_bundle_g1_sum0_connected_high_degree_j4e5_profiles_rank7_g4_piecewise as cone
from prove_iso_n7_bundle_g1_connected_core_p4_capacity_floor_rank7_g4_piecewise import (
    capacity_floor,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_profiles_n39_40_"
    "exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_PROFILES_"
    "N39_40_RANK7_G4_PIECEWISE"
)
DEPENDENCIES = {
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_rank7_g4_piecewise.py":
        "300C8AF1CF91E42047B2A888908DFCC21E765778D1AD3B0E650B0713B8E64B92",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_p4_rank7_g4_piecewise.py":
        "005A3CF6E2A5F7B67D0B2EB2A0E9D63C5F9E8DD959EDAE82DA9BCBFE8BE78AF4",
    "probe_iso_n7_bundle_g1_sum0_connected_high_degree_j4e5_profiles_rank7_g4_piecewise.py":
        "5C45A8CA7DC0C7DABD6BD146FFC8D9B65B48CDC1D7605BE26A358665E6B8CAE1",
    "prove_iso_n7_bundle_g1_connected_core_p4_capacity_floor_rank7_g4_piecewise.py":
        "82CBE5C8366AAAE5AB85712E49604A93609D210DB84F2E73D2BBB873BE9C9556",
    "iso_n7_bundle_g1_connected_core_p4_capacity_floor_exact_rank7_g4_piecewise_20260831.json":
        "EDD286C46DBE25DCB3C82D8E4E7F89460BCA7F71165A2413F151E3DFA7D0573D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def admissible(parts):
    return parts and parts[0] >= 3 and sum(value >= 2 for value in parts) >= 3


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE/name) == digest, name
    p4_report = json.loads(
        (HERE/"iso_n7_bundle_g1_connected_core_p4_capacity_floor_exact_rank7_g4_piecewise_20260831.json")
        .read_text(encoding="utf-8")
    )
    assert p4_report["marker"] == (
        "PASS_EXACT_ISO_N7_BUNDLE_G1_CONNECTED_CORE_P4_CAPACITY_FLOOR_RANK7_G4_PIECEWISE"
    )
    assert p4_report["status"] == "proved exact"
    assert p4_report["coverage_gap_within_connected_tree_p4_floor_scope"] is None

    def pinned_floor(order, increments):
        assert sum(increments)+2 == order
        return capacity_floor(tuple(increments))

    cone.p4_floor = pinned_floor
    stream = hashlib.sha256()
    profiles = 0
    controls_checked = 0
    negative = 0
    minimum = None
    per_order = []
    for order in (39, 40):
        local_profiles = 0
        local_minimum = None
        for parts in cone.partitions(order-2):
            if not admissible(parts):
                continue
            value, degrees, controls, p4, jmax = cone.relaxed(order, parts)
            assert value == min(controls)
            assert p4 == capacity_floor(parts)
            for index, control in enumerate(controls):
                stream.update(
                    f"{order}|{parts}|{index}|{p4}|{jmax}|{control}\n".encode("ascii")
                )
                controls_checked += 1
                negative += control < 0
                candidate = (control, order, parts, index, p4, jmax)
                minimum = candidate if minimum is None else min(minimum, candidate)
                local_minimum = candidate if local_minimum is None else min(local_minimum, candidate)
            profiles += 1
            local_profiles += 1
        per_order.append({
            "order": order,
            "profiles": local_profiles,
            "minimum_control": str(local_minimum[0]),
            "minimum_profile": list(local_minimum[2]),
            "minimum_control_index": local_minimum[3],
            "P4_floor_at_minimum": local_minimum[4],
            "J4_upper_at_minimum": local_minimum[5],
        })

    assert profiles == 46914
    assert controls_checked == 422226
    assert negative == 0
    assert minimum == (
        cone.Fraction(145861559255, 12), 39, (12, 12, 11, 1, 1), 6, 46, 433
    )
    assert stream.hexdigest().upper() == (
        "609CF46115DC74B7F5079530D5B764CD95E6CA959261C76F1FC7EF6E266DA90A"
    )

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "At orders 39 and 40, every connected-tree degree profile with "
            "maximum degree at least four and at least three branching "
            "vertices has all nine controls of the pinned G1 relaxation "
            "nonnegative when its J4 upper endpoint uses the pinned "
            "connected-core P4 capacity floor."
        ),
        "certificate": {
            "orders": [39, 40],
            "profiles": profiles,
            "controls_checked": controls_checked,
            "negative_count": negative,
            "global_minimum_control": str(minimum[0]),
            "global_minimum_order": minimum[1],
            "global_minimum_profile": list(minimum[2]),
            "global_minimum_control_index": minimum[3],
            "global_minimum_P4_floor": minimum[4],
            "global_minimum_J4_upper": minimum[5],
            "per_order": per_order,
            "ordered_control_stream_sha256": stream.hexdigest().upper(),
        },
        "coverage_gap_within_n39_40_profile_scope": None,
        "scope": (
            "Exact degree-profile relaxation at orders 39 and 40 only. "
            "Actual connected-tree promotion still uses the separate signed "
            "support, support-cap, and endpoint-movement theorems."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "orders": [39, 40],
        "profiles": profiles,
        "controls_checked": controls_checked,
        "negative_count": negative,
        "global_minimum_control": str(minimum[0]),
        "ordered_control_stream_sha256": stream.hexdigest().upper(),
        "coverage_gap_within_n39_40_profile_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
