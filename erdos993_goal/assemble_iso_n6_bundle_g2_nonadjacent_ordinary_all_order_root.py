#!/usr/bin/env python3
"""Fail-closed all-order assembly for rank-six nonadjacent ordinary-parent G2."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_ordinary_all_order_"
    "assembled_exact_root_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_"
    "ALL_ORDER_ASSEMBLY_ROOT"
)

PINS = {
    "assemble_iso_n6_bundle_g2_nonadjacent_ordinary_finite_n1_18_root.py":
        "40C751FC89DFD2F3B3A62B93BE33AF39AAB7836FEB02A6F33F91A40D28D7E102",
    "iso_n6_bundle_g2_nonadjacent_ordinary_finite_n1_18_assembled_exact_root_20260831.json":
        "48231DC37499A2AD906CF220A71695C4155B52C5DA77423FE807219B9A92E306",
    "assemble_iso_n6_bundle_g2_nonadjacent_ordinary_small_n19_root.py":
        "4D3CE6090162C799933DC66131F9C9B04E31BF47EA279A5FEE6FC0E04ECE961D",
    "iso_n6_bundle_g2_nonadjacent_ordinary_small_n19_exact_root_20260831.json":
        "297460DCFF1CF38FACA23696554973EB2DED57D3A18690AFCCAD0B480F43B618",
    "prove_iso_n6_bundle_g2_nonadjacent_ordinary_pw2_ratio_floor_root.py":
        "89C8708055BF613078F60F18A2290EF5C4FEE3649771AF8465DE1ECD4E0D9F47",
    "iso_n6_bundle_g2_nonadjacent_ordinary_pw2_ratio_floor_exact_root_20260831.json":
        "A6EA8DB36702DED69ADEE4C8D6CC7D5F3B78D65EC0625F7859D69743F5BD25FA",
    "probe_iso_n6_bundle_g2_nonadjacent_ordinary_wedge_simplex_flint_root.py":
        "8A37537B2CB5978F309039C2675DFFAC3D55DF0743712760BCBE1C8D2A97E67E",
    "run_iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_matrix_root.py":
        "358FD3ADE1F5B877D8CBA8EB76D1D37AC54EADB04A8C2C7491A49C24039534CE",
    "iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_split_pw3_wedge_matrix_exact_root_20260831.json":
        "775148393EEA04F2E7E332F7C128540D84EA5D2F801C4921FFFAE28714D73402",
    "replay_iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_matrix_root.py":
        "E1BB3C7C4A2F18E49AA466DD61934D38A068273F0CBEC2E035B8612160C97269",
    "iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_matrix_replay_exact_root_20260831.json":
        "DED424DCBE6C05C54D0038AF44EA9D409E1E0E0D6DE5FDBD7CD2FE2BA26F4FD5",
    "prove_iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_chart_cover_root.py":
        "BADC07EC8CE3BA0B6FA8CB381C430A8B3C158D78D28A7F32538F30AF9032FAC1",
    "iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_chart_cover_exact_root_20260831.json":
        "593F42AED78D6D6B736A3FAF4FC45CE5F2C5891DCF72DC920D733EA449BFC70B",
    "audit_iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_chart_cover_rank7_g5_finish.py":
        "56E9BD2A794FCFAE29B3278C804591023F41C1EEA32E135C3E8F0850E8444826",
    "iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_chart_cover_independent_audit_exact_rank7_g5_finish_20260831.json":
        "43B2FC7E20B459CE708D225811AE75F4CA15C8336F9BF0AA052DB8E49E935A89",
    "prove_iso_n6_bundle_g2_nonadjacent_ordinary_all_adjacency_masks_dominated_root_lower_rank7_g5_finish.py":
        "1D26D720EBA7BE8D15722EE5DB5793E04B10415C61739E914C71505D975D6CD1",
    "iso_n6_bundle_g2_nonadjacent_ordinary_all_adjacency_masks_dominated_root_lower_exact_rank7_g5_finish_20260831.json":
        "6FDB912F7B6F3992A3DED7A794C932380FD9B3DDBDCD5F702F54A4E550113722",
    "bridge_iso_n6_bundle_g2_nonadjacent_ordinary_four_corner_root_producer_rank7_g5_finish.py":
        "D3E6A1F2FAC2759E12686C97ADF16482567B200D8934320B6DE5D36FD16159A1",
    "iso_n6_bundle_g2_nonadjacent_ordinary_four_corner_root_producer_bridge_exact_rank7_g5_finish_20260831.json":
        "DFB5125039602403E11085D9AFEC0E65A0CCD4BA28E671DFA50421A54B714C60",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    observed = {name: sha256(HERE / name) for name in PINS}
    assert observed == PINS, (observed, PINS)

    finite = load(
        "iso_n6_bundle_g2_nonadjacent_ordinary_finite_n1_18_"
        "assembled_exact_root_20260831.json"
    )
    small = load(
        "iso_n6_bundle_g2_nonadjacent_ordinary_small_n19_exact_root_20260831.json"
    )
    ratio = load(
        "iso_n6_bundle_g2_nonadjacent_ordinary_pw2_ratio_floor_exact_root_20260831.json"
    )
    matrix = load(
        "iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_split_pw3_"
        "wedge_matrix_exact_root_20260831.json"
    )
    replay = load(
        "iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_matrix_"
        "replay_exact_root_20260831.json"
    )
    cover = load(
        "iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_chart_cover_"
        "exact_root_20260831.json"
    )
    cover_audit = load(
        "iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_chart_cover_"
        "independent_audit_exact_rank7_g5_finish_20260831.json"
    )
    masks = load(
        "iso_n6_bundle_g2_nonadjacent_ordinary_all_adjacency_masks_"
        "dominated_root_lower_exact_rank7_g5_finish_20260831.json"
    )
    bridge = load(
        "iso_n6_bundle_g2_nonadjacent_ordinary_four_corner_root_producer_"
        "bridge_exact_rank7_g5_finish_20260831.json"
    )

    assert finite["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_FINITE_N1_18_ROOT"
    )
    assert finite["aggregate"]["negative"] == 0
    assert small["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_SMALL_N19_ROOT"
    )
    assert small["certificate"]["negative"] == 0
    assert small["certificate"]["shards"] == 112
    assert small["certificate"]["byte_identical_replay_shards"] == 112
    assert ratio["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_PW2_RATIO_FLOOR_ROOT"
    )
    assert matrix["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_RATIO_FLOOR_"
        "SPLIT_PW3_WEDGE_MATRIX_ROOT"
    )
    assert matrix["shards"] == 56
    assert matrix["negative_lower_controls"] == 0
    assert matrix["negative_sign_controls"] == 0
    assert replay["marker"] == (
        "PASS_REPLAY_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_"
        "RATIO_FLOOR_MATRIX_ROOT"
    )
    assert replay["shards"] == replay["byte_identical_shards"] == 56
    assert replay["negative_lower_controls"] == 0
    assert replay["negative_sign_controls"] == 0
    assert all(row["byte_identical"] for row in replay["rows"])
    assert cover["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_RATIO_FLOOR_"
        "CHART_COVER_ROOT"
    )
    assert cover["expected_shards"] == 56
    assert cover_audit["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_RATIO_FLOOR_"
        "CHART_COVER_INDEPENDENT_AUDIT_RANK7_G5_FINISH"
    )
    assert cover_audit["shard_index"]["expected_and_actual_shards"] == 56
    assert masks["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_ALL_ADJACENCY_"
        "MASKS_DOMINATED_ROOT_LOWER_RANK7_G5_FINISH"
    )
    assert bridge["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_FOUR_CORNER_"
        "ROOT_PRODUCER_BRIDGE_RANK7_G5_FINISH"
    )
    assert matrix["runner_source_sha256"] == PINS[
        "run_iso_n6_bundle_g2_nonadjacent_ordinary_ratio_floor_matrix_root.py"
    ]
    assert replay["producer_sha256"] == matrix["source_sha256"]

    report = {
        "schema": "iso-n6-bundle-g2-nonadjacent-ordinary-all-order-assembly-v1",
        "date": "2026-08-31",
        "marker": MARKER,
        "status": (
            "PASS exact all-order rank-six nonadjacent ordinary-parent G2 assembly"
        ),
        "theorem": (
            "For every rank-six nonadjacent ordinary-parent forest bundle, for every "
            "feasible ordinary parent and all four parent-adjacency masks, G2 is "
            "nonnegative at every ambient order N>=1; N=0 is vacuous."
        ),
        "exhaustive_order_partition": [
            {
                "domain": "N=0",
                "certificate": "vacuous: an ordinary parent does not exist",
            },
            {
                "domain": "1<=N<=18",
                "certificate": finite["marker"],
            },
            {
                "domain": "N>=19 and min(mB,mC)<=6",
                "certificate": small["marker"],
            },
            {
                "domain": "N>=19 and min(mB,mC)>=7",
                "certificate": matrix["marker"],
                "forced_replay": replay["marker"],
                "chart_cover": cover["marker"],
                "independent_chart_audit": cover_audit["marker"],
                "all_parent_adjacency_masks": masks["marker"],
                "four_corner_bridge": bridge["marker"],
            },
        ],
        "logical_exhaustion": (
            "Every integer N is 0, lies in 1..18, or is at least 19. In the last "
            "case, either min(mB,mC)<=6 or both induced orders are at least seven. "
            "The chart cover exhausts both nonadjacent common-neighbor geometries; "
            "the matrix enumerates every B2/C2/D2 corner, and the structural mask "
            "transfer covers all four parent-adjacency masks."
        ),
        "matrix_audit": {
            "shards": matrix["shards"],
            "forced_byte_identical_shards": replay["byte_identical_shards"],
            "negative_lower_controls": matrix["negative_lower_controls"],
            "negative_sign_controls": matrix["negative_sign_controls"],
            "minimum": matrix["minimum"],
        },
        "pins": PINS,
        "scope_guard": (
            "This closes only the rank-six nonadjacent ordinary-parent G2 mode. "
            "Endpoint-parent G2, other rank-six G1 modes, rank-seven propagation, "
            "Newton m=0, final proof assembly, and Erdos Problem 993 remain separate."
        ),
    }
    report["source"] = Path(__file__).name
    report["source_sha256"] = sha256(Path(__file__).resolve())
    OUTPUT.write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(MARKER)
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))


if __name__ == "__main__":
    main()
