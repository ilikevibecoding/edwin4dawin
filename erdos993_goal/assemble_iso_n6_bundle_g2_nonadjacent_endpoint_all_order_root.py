#!/usr/bin/env python3
"""Fail-closed all-order assembly for rank-six nonadjacent endpoint-parent G2."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_endpoint_all_order_"
    "assembled_exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
    "ALL_ORDER_ASSEMBLY_ROOT"
)

PINS = {
    "assemble_iso_n6_bundle_g2_nonadjacent_endpoint_finite_n0_18_root.py":
        "B60F453CFBBEDF6693D72F59D74EE6722B1FA39455A8855F5079D66B40AC1A6D",
    "iso_n6_bundle_g2_nonadjacent_endpoint_finite_n0_18_assembled_exact_root_20260831.json":
        "C6E152E8D8A31B6164D252F80975187F106B4053C5626170DD625130A4A55A95",
    "assemble_iso_n6_bundle_g2_nonadjacent_endpoint_small_n19_root.py":
        "58A080F414DE34F0922506BAC2595C110A65E24115C9C4690434530B0F6D2FD0",
    "iso_n6_bundle_g2_nonadjacent_endpoint_small_n19_exact_root_20260831.json":
        "B5DB327EE7C0C9F82ED03D95916A32D64B0457886B877B82329E36CF6FFD75A4",
    "probe_iso_n6_bundle_g2_nonadjacent_endpoint_wedge_small_order_flint_root.py":
        "1EE93DCD0A1DF79655654026C0442C4445AC96286D64B61868F1EEFC19A8E1EE",
    "run_iso_n6_bundle_g2_nonadjacent_endpoint_small_matrix_root.py":
        "0D37447B2E94C341B576EEEA286D0AC04EEA849A239614C0F9E2F50FC9E5F1D0",
    "iso_n6_bundle_g2_nonadjacent_endpoint_small_order_matrix_exact_root_20260831.json":
        "FF6E5F7A02CA74A2ADDAC14F029871B2648119C9551B6CD78557A06096E1A1B9",
    "replay_iso_n6_bundle_g2_nonadjacent_endpoint_small_matrix_root.py":
        "1E5758E9DD0D5D6F44444C0A709EED286A51AD927A9624B1C203C64B534CF3B2",
    "iso_n6_bundle_g2_nonadjacent_endpoint_small_order_matrix_replay_exact_root_20260831.json":
        "6602F8A151397EF13DBB986A296EF3178AD8432BA4223FFA24D7A231BECAD979",
    "prove_iso_n6_bundle_g2_nonadjacent_ordinary_pw2_ratio_floor_root.py":
        "89C8708055BF613078F60F18A2290EF5C4FEE3649771AF8465DE1ECD4E0D9F47",
    "iso_n6_bundle_g2_nonadjacent_ordinary_pw2_ratio_floor_exact_root_20260831.json":
        "A6EA8DB36702DED69ADEE4C8D6CC7D5F3B78D65EC0625F7859D69743F5BD25FA",
    "derive_iso_n6_bundle_g2_nonadjacent_endpoint_large_corner_reduction_root.py":
        "4FA64742C54885B19798E6C6ABBBCE10AD3D14347486D195041506BB29D7BCCF",
    "iso_n6_bundle_g2_nonadjacent_endpoint_large_corner_reduction_exact_root_20260831.json":
        "3121582C14362833D1BEF28FD7122EF011C171E5F2EB25FE1F2E8C481F40FC69",
    "prove_iso_n6_bundle_g2_nonadjacent_endpoint_chart_cover_root.py":
        "B2DBAB45C8DCF66082E5939B80C8A879795363B4DF8A88D96BBA360100246C5A",
    "iso_n6_bundle_g2_nonadjacent_endpoint_chart_cover_exact_root_20260831.json":
        "1B963CD26B146883A7AAB07F1221A74385F27BE655CA92D8B4B3940F616EFF3F",
    "probe_iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_wedge_flint_root.py":
        "AC3B4977FA225B33E38AAE7120478FB789C8329CB1D5001C5ED4C3FD85E214F1",
    "run_iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_matrix_root.py":
        "6100495A6121AD172EBC6B4B9587BFCF31E7F2D9DD4E1854B20822DE19F7CCDC",
    "iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_matrix_exact_root_20260831.json":
        "4BCEF15A1A52E027A32BBFC02875B1E7B5D755792C23F48A90F4C77000FAA1D7",
    "replay_iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_matrix_root.py":
        "9D6EB6FFA197F93E8B57A09BF77275527234EED27540BC215EF2729F18DA7FDA",
    "replay_iso_n6_bundle_g2_nonadjacent_endpoint_final_shard_memory_safe_root.py":
        "4337E9B67EE2BD46590E6E5960E5E4F68E36B904BB9CA031BA069218029898D6",
    "iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_wedge_common0_high_far_B_ge_C_B1_C1_D21_N19_memory_safe_replay_root_20260831.json":
        "1D7ABA824B5B529A18D3D15B70BAB563CBA4DF7D0A582A2FFA257F99E3C998CA",
    "assemble_iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_matrix_resumed_replay_root.py":
        "7833DFD74F80698BCA69F2FE91D4B92BC0B02CF1B1642D694B205A44F231E37C",
    "iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_matrix_resumed_replay_exact_root_20260831.json":
        "AC331E124322E0205749F55748A6B17553073D9A417F20E5196083181311620E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    observed = {name: sha256(HERE / name) for name in PINS}
    assert observed == PINS, (observed, PINS)

    finite = load(
        "iso_n6_bundle_g2_nonadjacent_endpoint_finite_n0_18_"
        "assembled_exact_root_20260831.json"
    )
    small = load(
        "iso_n6_bundle_g2_nonadjacent_endpoint_small_n19_exact_root_20260831.json"
    )
    small_matrix = load(
        "iso_n6_bundle_g2_nonadjacent_endpoint_small_order_matrix_"
        "exact_root_20260831.json"
    )
    small_replay = load(
        "iso_n6_bundle_g2_nonadjacent_endpoint_small_order_matrix_"
        "replay_exact_root_20260831.json"
    )
    ratio = load(
        "iso_n6_bundle_g2_nonadjacent_ordinary_pw2_ratio_floor_"
        "exact_root_20260831.json"
    )
    corner = load(
        "iso_n6_bundle_g2_nonadjacent_endpoint_large_corner_reduction_"
        "exact_root_20260831.json"
    )
    cover = load(
        "iso_n6_bundle_g2_nonadjacent_endpoint_chart_cover_"
        "exact_root_20260831.json"
    )
    large_matrix = load(
        "iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_matrix_"
        "exact_root_20260831.json"
    )
    large_replay = load(
        "iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_matrix_"
        "resumed_replay_exact_root_20260831.json"
    )

    assert finite["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_FINITE_N0_18_ROOT"
    )
    assert finite["aggregate"]["negative"] == 0
    assert finite["aggregate"]["minimum"] == 0
    assert finite["aggregate"]["N14_18_full_runs"] == 2

    assert small["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_SMALL_N19_ROOT"
    )
    assert small["certificate"]["shards"] == 224
    assert small["certificate"]["byte_identical_replay_shards"] == 224
    assert small["certificate"]["negative"] == 0
    assert small["certificate"]["minimum"] == "1/11520"

    assert small_matrix["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
        "SMALL_ORDER_MATRIX_ROOT"
    )
    assert small_matrix["runner_source_sha256"] == PINS[
        "run_iso_n6_bundle_g2_nonadjacent_endpoint_small_matrix_root.py"
    ]
    assert small_matrix["source_sha256"] == PINS[
        "probe_iso_n6_bundle_g2_nonadjacent_endpoint_wedge_small_order_flint_root.py"
    ]
    assert small_matrix["shards"] == len(small_matrix["rows"]) == 224
    assert small_matrix["negative"] == 0
    assert small_matrix["minimum"] == "1/11520"

    assert small_replay["marker"] == (
        "PASS_REPLAY_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
        "SMALL_ORDER_MATRIX_ROOT"
    )
    assert small_replay["producer_sha256"] == small_matrix["source_sha256"]
    assert small_replay["shards"] == small_replay["byte_identical_shards"] == 224
    assert small_replay["negative_controls"] == 0
    assert all(row["byte_identical"] for row in small_replay["rows"])

    assert ratio["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_PW2_"
        "RATIO_FLOOR_ROOT"
    )
    assert corner["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
        "LARGE_CORNER_REDUCTION_ROOT"
    )
    assert corner["corner_count_per_orientation"] == 8
    assert cover["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_CHART_COVER_ROOT"
    )
    assert cover["expected_shards"] == {
        "large": 112,
        "small": 224,
        "total": 336,
    }
    assert cover["corner_cover"]["corners_per_orientation"] == 8

    assert large_matrix["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
        "RATIO_FLOOR_MATRIX_ROOT"
    )
    assert large_matrix["runner_source_sha256"] == PINS[
        "run_iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_matrix_root.py"
    ]
    assert large_matrix["source_sha256"] == PINS[
        "probe_iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_wedge_flint_root.py"
    ]
    assert large_matrix["corner_reduction_report_sha256"] == PINS[
        "iso_n6_bundle_g2_nonadjacent_endpoint_large_corner_reduction_exact_root_20260831.json"
    ]
    assert large_matrix["ratio_floor_report_sha256"] == PINS[
        "iso_n6_bundle_g2_nonadjacent_ordinary_pw2_ratio_floor_exact_root_20260831.json"
    ]
    assert large_matrix["shards"] == len(large_matrix["rows"]) == 112
    assert large_matrix["negative"] == 0
    assert large_matrix["bernstein_coefficients"] == 2_091_621_840

    assert large_replay["marker"] == (
        "PASS_REPLAY_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_"
        "RATIO_FLOOR_MATRIX_RESUMED_ROOT"
    )
    assert large_replay["matrix_report_sha256"] == PINS[
        "iso_n6_bundle_g2_nonadjacent_endpoint_ratio_floor_matrix_exact_root_20260831.json"
    ]
    assert large_replay["shards"] == large_replay["byte_identical_shards"] == 112
    assert large_replay["original_forced_replay_shards"] == 111
    assert large_replay["memory_safe_final_shard_replay_shards"] == 1
    assert large_replay["negative_controls"] == 0
    assert large_replay["bernstein_coefficients"] == large_matrix["bernstein_coefficients"]
    assert all(row["byte_identical"] for row in large_replay["rows"])

    report = {
        "schema": "iso-n6-bundle-g2-nonadjacent-endpoint-all-order-assembly-v1",
        "date": "2026-08-31",
        "marker": MARKER,
        "status": (
            "PASS exact all-order rank-six nonadjacent endpoint-parent G2 assembly"
        ),
        "theorem": (
            "For every rank-six nonadjacent forest bundle with either marked "
            "endpoint as parent, G2 is nonnegative at every ambient order N>=0."
        ),
        "exhaustive_order_partition": [
            {
                "domain": "0<=N<=18",
                "certificate": finite["marker"],
            },
            {
                "domain": "N>=19 and min(mB,mC)<=6",
                "certificate": small["marker"],
                "matrix": small_matrix["marker"],
                "forced_replay": small_replay["marker"],
            },
            {
                "domain": "N>=19 and min(mB,mC)>=7",
                "certificate": large_matrix["marker"],
                "resumed_forced_replay": large_replay["marker"],
                "chart_cover": cover["marker"],
                "corner_reduction": corner["marker"],
                "ratio_floor": ratio["marker"],
            },
        ],
        "logical_exhaustion": (
            "Every integer N>=0 is at most 18 or at least 19. For N>=19, "
            "either min(mB,mC)<=6 or both induced orders are at least seven. "
            "The chart cover proves the small/large boundary is gapless, covers "
            "both nonadjacent common-neighbor geometries and both endpoint "
            "orientations, and exhausts all B2/C2/D2 corners."
        ),
        "matrix_audit": {
            "small_shards": small_matrix["shards"],
            "small_forced_byte_identical_shards": small_replay[
                "byte_identical_shards"
            ],
            "large_shards": large_matrix["shards"],
            "large_forced_byte_identical_shards": large_replay[
                "byte_identical_shards"
            ],
            "total_shards": small_matrix["shards"] + large_matrix["shards"],
            "total_tensor_bernstein_coefficients": (
                small_matrix["bernstein_coefficients"]
                + large_matrix["bernstein_coefficients"]
            ),
            "negative_controls": 0,
            "global_minimum": "0",
        },
        "pins": PINS,
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__).resolve()),
        "scope_guard": (
            "This closes only the rank-six nonadjacent endpoint-parent G2 mode. "
            "Other rank-six modes, rank-seven propagation, Newton m=0, final "
            "proof assembly, and Erdos Problem 993 remain separate."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(MARKER)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print("TOTAL_SHARDS", report["matrix_audit"]["total_shards"])
    print(
        "TOTAL_TENSOR_BERNSTEIN_COEFFICIENTS",
        report["matrix_audit"]["total_tensor_bernstein_coefficients"],
    )


if __name__ == "__main__":
    main()
