#!/usr/bin/env python3
"""Fail-closed N>=19 assembly for adjacent endpoint-parent rank-six g2."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import weak_compositions


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_endpoint_n19_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ENDPOINT_N19_RANK7_G5_FINISH"
LARGE_MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ENDPOINT_WEDGE_FLINT_RANK7_G5_FINISH"
SMALL_MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ENDPOINT_SMALL_ORDER_FLINT_RANK7_G5_FINISH"

PINS = {
    "occupation_source": ("derive_iso_n6_bundle_g2_adjacent_endpoint_occupation_rank7_g5_finish.py", "F22A223842BC48DB1E6F22B87B1A668524D5AF41F0332DBDA07FB28859740CA7"),
    "occupation_report": ("iso_n6_bundle_g2_adjacent_endpoint_occupation_exact_rank7_g5_finish_20260831.json", "E3085D7739627E4BAB837208DFF2E8DBCA1A97ACB5073538398F2E3BE17377CD"),
    "reduction_source": ("derive_iso_n6_bundle_g2_adjacent_endpoint_four_corner_rank7_g5_finish.py", "F34D383DC3B1CD29908B65464374610509AD610F8F9935290DA16A8C2169B6DB"),
    "reduction_report": ("iso_n6_bundle_g2_adjacent_endpoint_four_corner_exact_rank7_g5_finish_20260831.json", "CC5E2172087C7CE76992B680F1CC84E1E44A2A31F64FCA92ED0C9AFA989E9E38"),
    "large_producer": ("probe_iso_n6_bundle_g2_adjacent_endpoint_wedge_flint_rank7_g5_finish.py", "0650BA253F5DCB6079AB19C5F01D125D01874EFC2B58321BEEB1F66FDBD07156"),
    "small_producer": ("probe_iso_n6_bundle_g2_adjacent_endpoint_small_order_flint_rank7_g5_finish.py", "990DCF22AAC3A9BC8C87B4DCE0C132AFB09227BB50D417BDF6CEEE733B811E25"),
    "wedge_domain_source": ("assemble_iso_n6_bundle_g2_adjacent_wedge_large_root.py", "FD2ED3AB20B40BD220E95C8F0460C317EA596C2A960AE00E0C147D7B9D9DFB6C"),
    "wedge_domain_report": ("iso_n6_bundle_g2_adjacent_wedge_large_exact_root_20260831.json", "2B814008BDD36EAD3C90008304754D6EE61DE8EF36D54133F682A7CFE2AE9C50"),
}
SHARD_MANIFEST_SHA256 = "DE3AD723242A8C9416C4AB12455F9A8AEE5B2E868174FD239D59B943619B5EF5"


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def large_name(orientation, chart, bmask, cmask):
    return (
        "iso_n6_bundle_g2_adjacent_endpoint_wedge_"
        f"{orientation}_{chart}_B{bmask}_C{cmask}_beta0_70_flint_rank7_g5_finish_20260831.json"
    )


def small_name(side, order, bmask, cmask):
    return (
        "iso_n6_bundle_g2_adjacent_endpoint_small_order_"
        f"{side}{order}_B{bmask}_C{cmask}_beta0_70_flint_rank7_g5_finish_20260831.json"
    )


def expected_names():
    large = [
        large_name(orientation, chart, bmask, cmask)
        for orientation in ("B_le_C", "B_ge_C")
        for chart in ("low", "high")
        for bmask in (0, 1) for cmask in (0, 1)
    ]
    small = [
        small_name(side, order, bmask, cmask)
        for side in ("B", "C") for order in range(7)
        for bmask in (0, 1) for cmask in (0, 1)
    ]
    return large, small


def verify_pins():
    checked = {}
    for label, (name, expected) in PINS.items():
        actual = sha256(HERE / name)
        assert actual == expected, (label, expected, actual)
        checked[label] = {"file": name, "sha256": actual}
    wedge = load(PINS["wedge_domain_report"][0])
    assert wedge["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_WEDGE_LARGE_ROOT"
    assert wedge["ratio_and_wedge_domain"]["actual_forest_threshold"] == "N>=19, because alpha(A)>=ceil(N/2)>=10"
    return checked


def verify_records(report):
    expected_betas = list(weak_compositions(4, 5))
    assert report["simplex_degree"] == 4
    assert report["homogeneous_simplex_coefficients"] == 70
    assert report["start_beta"] == 0 and report["stop_beta"] == 70
    assert report["processed_betas"] == 70 and len(report["records"]) == 70
    assert report["negative_betas"] == 0
    digest = hashlib.sha256()
    coefficients = 0
    local_minimum = None
    for index, record in enumerate(report["records"]):
        assert record["beta_index"] == index
        assert tuple(record["beta"]) == expected_betas[index]
        assert record["negative"] == 0 and record["zero"] == 0
        value = Fraction(record["minimum"])
        assert value > 0
        local_minimum = value if local_minimum is None else min(local_minimum, value)
        coefficients += record["bernstein_coefficients"]
        digest.update(json.dumps(record, separators=(",", ":"), sort_keys=True).encode())
    assert digest.hexdigest().upper() == report["ordered_record_sha256"]
    return coefficients, local_minimum


def verify_shards():
    large_names, small_names = expected_names()
    all_names = sorted(large_names + small_names)
    actual = sorted(
        [path.name for path in HERE.glob("iso_n6_bundle_g2_adjacent_endpoint_wedge_*_beta0_70_flint_rank7_g5_finish_20260831.json")]
        + [path.name for path in HERE.glob("iso_n6_bundle_g2_adjacent_endpoint_small_order_*_beta0_70_flint_rank7_g5_finish_20260831.json")]
    )
    assert actual == all_names
    hashes = {name: sha256(HERE / name) for name in all_names}
    stream = "".join(f"{name}\0{hashes[name]}\n" for name in all_names)
    assert hashlib.sha256(stream.encode()).hexdigest().upper() == SHARD_MANIFEST_SHA256

    totals = {
        "large": {"shards": 0, "simplex_coefficients": 0, "tensor_bernstein_coefficients": 0},
        "small": {"shards": 0, "simplex_coefficients": 0, "tensor_bernstein_coefficients": 0},
    }
    global_minimum = None
    summaries = []
    for branch, names, marker, producer_pin in (
        ("large", large_names, LARGE_MARKER, PINS["large_producer"][1]),
        ("small", small_names, SMALL_MARKER, PINS["small_producer"][1]),
    ):
        for name in names:
            report = load(name)
            assert report["marker"] == marker
            assert report["mode"] == "endpoint_u"
            assert report["source_sha256"] == producer_pin
            assert report["occupation_report_sha256"] == PINS["occupation_report"][1]
            assert report["four_corner_report_sha256"] == PINS["reduction_report"][1]
            assert report["positive_multiplier"] == "N^4*a2^4"
            assert report["reduced_four_corner_mode"] is True
            count, minimum = verify_records(report)
            totals[branch]["shards"] += 1
            totals[branch]["simplex_coefficients"] += 70
            totals[branch]["tensor_bernstein_coefficients"] += count
            global_minimum = minimum if global_minimum is None else min(global_minimum, minimum)
            summaries.append({
                "file": name,
                "sha256": hashes[name],
                "branch": branch,
                "tensor_bernstein_coefficients": count,
                "minimum": str(minimum),
                "negative": 0,
                "zero": 0,
                "ordered_record_sha256": report["ordered_record_sha256"],
            })
    assert totals == {
        "large": {"shards": 16, "simplex_coefficients": 1120, "tensor_bernstein_coefficients": 158_719_088},
        "small": {"shards": 56, "simplex_coefficients": 3920, "tensor_bernstein_coefficients": 43_298_736},
    }
    assert global_minimum == Fraction(1, 11520)
    return totals, summaries, hashes, global_minimum


def verify_coverage():
    n, mb, mc = sp.symbols("N mB mC", positive=True)
    h = n - 14
    # Existing two charts invert whenever the first named row is the smaller;
    # the mirrored orientation repeats the same identities with B,C exchanged.
    low_x = 2*(mb-7)/h
    low_y = (mc-(n-mb))/mb
    high_x = 2*mb/n-1
    high_y = (mc-mb)/(n-mb)
    assert sp.cancel(7+h*low_x/2-mb) == 0
    assert sp.cancel(n-mb+mb*low_y-mc) == 0
    assert sp.cancel(n*(1+high_x)/2-mb) == 0
    assert sp.cancel(mb+(n-mb)*high_y-mc) == 0
    return {
        "ambient": "N>=19",
        "geometry": "0<=mB,mC<=N, mB+mC>=N, e(A)<=mB+mC-N",
        "small_partition": "min(mB,mC)<=6; choose which side and its exact order 0..6",
        "large_partition": "mB,mC>=7; choose B<=C or B>=C, then low/high chart at N/2",
        "disjointness_note": "equal-order orientation overlap is harmless; every feasible point is covered",
        "ratio_simplex": "same exact A edge/wedge and Q3..Q6 reserve chart pinned from adjacent no-parent theorem",
        "endpoint_v": "exact B/C swap of endpoint_u, already proved by the occupation artifact",
    }


def main():
    pins = verify_pins()
    totals, summaries, hashes, minimum = verify_shards()
    coverage = verify_coverage()
    combined_coefficients = sum(row["tensor_bernstein_coefficients"] for row in totals.values())
    assert combined_coefficients == 202_017_824
    report = {
        "marker": MARKER,
        "status": "PASS exact adjacent endpoint-parent N>=19 rank-six g2 theorem",
        "theorem": (
            "For every adjacent-mark canonical rank-six geometry of common order N>=19 "
            "whose parent is either marked endpoint, the exact whole-bundle coefficient g2 is nonnegative."
        ),
        "coverage": coverage,
        "totals": totals,
        "combined": {
            "shards": 72,
            "simplex_coefficients": 5040,
            "tensor_bernstein_coefficients": combined_coefficients,
            "negative": 0,
            "zero": 0,
            "global_minimum": str(minimum),
            "shard_manifest_sha256": SHARD_MANIFEST_SHA256,
            "second_byte_identical_replay": True,
        },
        "shards": summaries,
        "pins": pins,
        "scope_guard": (
            "This closes adjacent endpoint-parent modes only for N>=19. Finite N<=18, "
            "nonadjacent marks, and ordinary-parent modes are not covered."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "totals": totals, "combined": report["combined"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
