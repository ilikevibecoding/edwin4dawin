#!/usr/bin/env python3
"""Fail-closed theorem wrapper for all small-broom k=5,6 rows."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from probe_iso_n5_g1_internal_ordinary_small_high_k_interval_root import (
    main as exact_replay,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_small_high_k_interval_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_HIGH_K_INTERVAL_ROOT"

DEPENDENCIES = {
    "derive_iso_n5_g1_internal_endpoint_broom_factor_root.py":
        "89324C9B5C2E80B4E365B208FB896F0DB7E57579CC3381EEA8798E6A34EDA4F0",
    "derive_iso_n5_g1_internal_endpoint_broom_parameters_root.py":
        "2582BFF4BBA40A2B11D27AB5A3256D291271EB45BF61827D60EC5ADB220B2879",
    "derive_iso_n5_g1_internal_ordinary_broom_factor_root.py":
        "183528806BCBEBC38C9C2D1830D86CE83BD5567FD4DA333CFFAEA8FE406C5605",
    "derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root.py":
        "8ED18D7C3116B83527A08471B0820319FFBB134E4FDA086070AB760F1F122E6B",
    "prove_iso_n5_disconnected_m5_all_componentwise_g1_nonadjacent.py":
        "FCA5115C5D303352DBBC001B305207D583219335326BC48D0C4BFEEE90FB5C1B",
    "iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json":
        "27E70D94ED97F659E62D63527365906D33123EFDB4E6F8168951061B83BFCCA1",
    "probe_iso_n5_g1_internal_ordinary_small_high_k_interval_root.py":
        "B614AA52F4E572C572AC2D2474D7E0DBAFC65B1B86BB5493F15C1A52C5F46F81",
    "iso_n5_g1_internal_ordinary_small_high_k_interval_probe_root_20260830.json":
        "4E94C6136C7671625E34C3AF2014AC32F2A8B9A7ECFA528B3A280125D1C7C9D3",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert {name: sha256(HERE / name) for name in DEPENDENCIES} == DEPENDENCIES
    interval = json.loads(
        (HERE / "iso_n5_disconnected_m5_all_componentwise_exact_g1_nonadjacent_20260830.json")
        .read_text(encoding="utf-8")
    )
    assert interval["marker"] == (
        "PASS_EXACT_ISO_N5_DISCONNECTED_M5_ALL_COMPONENTWISE_G1_NONADJACENT"
    )
    sum5 = next(
        row for row in interval["unique_sums_1_through_8"]["rows"]
        if row["unique_sum"] == 5
    )
    assert sum5["lower_bound"] == "(m + 3*n + 1)/2"

    # The producer contains no numerical optimization: rerun its symbolic
    # expansion and exact coefficient checks, then require byte identity.
    exact_replay()
    probe_name = (
        "iso_n5_g1_internal_ordinary_small_high_k_interval_probe_root_20260830.json"
    )
    assert sha256(HERE / probe_name) == DEPENDENCIES[probe_name]
    probe = json.loads((HERE / probe_name).read_text(encoding="utf-8"))
    assert probe["marker"] == (
        "PROBE_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_HIGH_K_INTERVAL_ROOT"
    )
    assert len(probe["faces"]) == 2
    for face in probe["faces"]:
        assert face["closed_rows"] == 14
        assert len(face["rows"]) == 14
        assert {(row["ell"], row["k_index"]) for row in face["rows"]} == {
            (ell, k_index) for ell in range(1, 8) for k_index in (5, 6)
        }
        assert all(row["negative_coefficients"] == 0 for row in face["rows"])
        assert all(
            row["payment_weight"] == (28 if row["k_index"] == 5 else 0)
            for row in face["rows"]
        )

    report = {
        "marker": MARKER,
        "theorem": (
            "For every ell=1..7, integer k>=0, finite parent-side forest, "
            "and both parent-mark geometries, the k-Newton coefficients 5 and "
            "6 of internal-spine/broom ordinary-parent g1 are nonnegative."
        ),
        "lengths": [1, 7],
        "k_indices": [5, 6],
        "faces": [
            {
                "epsilon": face["epsilon"],
                "geometry": face["geometry"],
                "rows": len(face["rows"]),
                "minimum_residual_coefficient": min(
                    row["minimum_coefficient"] for row in face["rows"]
                ),
                "residual_streams": {
                    f"ell{row['ell']}_k{row['k_index']}": row[
                        "residual_stream_sha256"
                    ]
                    for row in face["rows"]
                },
            }
            for face in probe["faces"]
        ],
        "proof": {
            "k_index_6": "coefficientwise nonnegative in parent partition coordinates",
            "k_index_5": (
                "target minus 28 times rooted-deletion interval sum 5 after "
                "adjoining six isolates is coefficientwise nonnegative"
            ),
        },
        "dependencies_sha256": DEPENDENCIES,
        "status": "solver-free exact all-parent theorem for the two high k rows",
        "scope": (
            "Only k-Newton indices 5 and 6 for ell=1..7.  Indices 0..4, "
            "the whole mode, other modes, and Erdos Problem 993 remain separate."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "lengths": report["lengths"],
        "k_indices": report["k_indices"],
        "face_rows": [face["rows"] for face in report["faces"]],
        "status": report["status"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
