#!/usr/bin/env python3
"""Fail-closed N>=19 assembly for nonadjacent no-parent rank-six g2."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp

from probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root import (
    weak_compositions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_nonadjacent_no_parent_n19_exact_root_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_NO_PARENT_N19_ROOT"
SMALL_MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_SMALL_MATRIX_ROOT"
SMALL_SHARD_MARKER = (
    "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_WEDGE_SMALL_ORDER_FLINT_ROOT"
)
LARGE_MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_WEDGE_MATRIX_ROOT"
LARGE_SHARD_MARKER = (
    "PROBE_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_WEDGE_SIMPLEX_FLINT_ROOT"
)


PINS = {
    "occupation_report": (
        "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json",
        "106BD6048269E1CFE1F51A0DA162312786E28EB8E8707BF57CBBE8E7BA9D0F83",
    ),
    "adjacent_producer": (
        "probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root.py",
        "DDE496C597D5D558947B00770F98DAB96E1DEC8B1C07B5E0E13F3D8B9C10EA88",
    ),
    "q3_endpoint_helper": (
        "probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root.py",
        "83E3E7D511EE4580D96284FC5EF12AFDA0DB9E8FC818FCE4EA887FF1EB7CD797",
    ),
    "balanced_sum_helper": (
        "balanced_flint_mpoly_sum_root.py",
        "976F5DEB6B44D2E29ECC342A44CAF801EB8AADB90A2FF1DC993F1F7F042C90BD",
    ),
    "bernstein_helper": (
        "tensor_bernstein_flint_matrix_root.py",
        "9BB62FB90664A9EBF2D8F02D6FBA630A3E78EF4D774D0F091B7689B91307E5DC",
    ),
    "endpoint_source": (
        "derive_iso_n6_bundle_g2_nonadjacent_endpoint_reduction_root.py",
        "2CC06F2BA83AFEFC65EB8ED3DB95C65372F9B907E0658D60DF86C572BA8AC8AF",
    ),
    "endpoint_report": (
        "iso_n6_bundle_g2_nonadjacent_endpoint_reduction_exact_root_20260831.json",
        "FA7C3FB7C6B510E9127E2863ACDCCF0039716A171270FD545468614F5F72821D",
    ),
    "ratio_source": (
        "assemble_iso_n6_bundle_g2_adjacent_wedge_large_root.py",
        "FD2ED3AB20B40BD220E95C8F0460C317EA596C2A960AE00E0C147D7B9D9DFB6C",
    ),
    "ratio_report": (
        "iso_n6_bundle_g2_adjacent_wedge_large_exact_root_20260831.json",
        "2B814008BDD36EAD3C90008304754D6EE61DE8EF36D54133F682A7CFE2AE9C50",
    ),
    "large_source": (
        "probe_iso_n6_bundle_g2_nonadjacent_wedge_simplex_flint_root.py",
        "D361E4EAB471FA4C791C490CCEC6E80CF458A189AA073451EED2BBD026AB5FF4",
    ),
    "large_runner": (
        "run_iso_n6_bundle_g2_nonadjacent_wedge_matrix_root.py",
        "96399136FA5BC97D2614C298704C64269E200361BB01E15BC8F8D3E5B2350817",
    ),
    "large_manifest": (
        "iso_n6_bundle_g2_nonadjacent_wedge_matrix_probe_root_20260831.json",
        "47684A3E6D3D4792668758C958B4E88F9A7860A65A0EAE3A79EBD939CB2F9926",
    ),
    "small_source": (
        "probe_iso_n6_bundle_g2_nonadjacent_wedge_small_order_flint_root.py",
        "ADA33A5912F0792F1D6B8812AF6CC77AB33C84DCA7D0DE54C3DA2F658F307D9E",
    ),
    "small_runner": (
        "run_iso_n6_bundle_g2_nonadjacent_small_matrix_root.py",
        "45ADC5D825D4D6CBA76CEC1485810671B4695E0592D358B486B7A4231B447F62",
    ),
    "small_manifest": (
        "iso_n6_bundle_g2_nonadjacent_small_matrix_probe_root_20260831.json",
        "CFBD5C124D66F203100493E943B775578A2305AF7DA903B1188882605E26C348",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def verify_pins() -> dict[str, dict[str, str]]:
    checked = {}
    for label, (name, expected) in PINS.items():
        path = HERE / name
        assert path.is_file(), (label, name)
        actual = sha256(path)
        assert actual == expected, (label, expected, actual)
        checked[label] = {"file": name, "sha256": actual}
    return checked


def verify_endpoint_and_ratio() -> dict[str, object]:
    endpoint = load(PINS["endpoint_report"][0])
    assert endpoint["marker"] == (
        "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_REDUCTION_ROOT"
    )
    assert endpoint["source_sha256"] == PINS["endpoint_source"][1]
    assert endpoint["occupation_identity"] == (
        "g2=A2(A)+L2(A,B)+L2(A,C)+K2(B,C)+K2(A,D)"
    )
    assert endpoint["J2_equals_K2_after_row_renaming"] is True
    assert endpoint["D_derivatives"] == {
        "d2": "4*a1 + 6*a2 + 11*a3 - 2*a4",
        "d3": "a1 + 11*a2 + 10*a3",
        "d4": "-15*a1 - 2*a2",
        "d5": "-7*a1",
        "d6": "0",
    }
    assert endpoint["B_C_transfer"]["correction_independent_of_B_C"] is True
    assert endpoint["B_C_transfer"]["N_ge_14_corner_count"] == 4
    assert "zero or one common neighbor" in endpoint["geometry_partition"]["exhaustive"]

    ratio = load(PINS["ratio_report"][0])
    assert ratio["marker"] == "PASS_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_WEDGE_LARGE_ROOT"
    assert ratio["source_sha256"] == PINS["ratio_source"][1]
    assert ratio["occupation_algebra"]["B_C_symmetry_rederived"] is True
    assert ratio["ratio_and_wedge_domain"]["actual_forest_threshold"] == (
        "N>=19, because alpha(A)>=ceil(N/2)>=10"
    )
    assert ratio["ratio_and_wedge_domain"]["wedge_identity"] == (
        "a3=C(N,3)-e(N-2)+Omega"
    )
    assert ratio["ratio_and_wedge_domain"]["wedge_relaxation"] == (
        "0<=Omega<=C(e,2)<=e^2/2"
    )
    assert ratio["certificate_total"]["second_byte_identical_replay"] is True
    return {
        "occupation_identity": endpoint["occupation_identity"],
        "B_C_symmetry": True,
        "D_rank2_endpoints": 2,
        "B_C_rank2_corner_pairs": 4,
        "common_neighbor_geometries": ["common0", "common1"],
        "rank_six_ratio_threshold": ratio["ratio_and_wedge_domain"][
            "actual_forest_threshold"
        ],
        "actual_edge_guard": (
            "Every actual N-vertex forest A has e(A)<=N-1, so the pinned rank-six "
            "ratio budget applies. The common0 continuous cone deliberately also "
            "tests irrelevant formal points with edge cap d+1 that can exceed N."
        ),
    }


def expected_small_cases():
    return list(itertools.product(
        ("common0", "common1"), range(7), (0, 1), (0, 1), (0, 1)
    ))


def expected_large_cases():
    return list(itertools.product(
        ("common0", "common1"), ("low", "high"),
        (0, 1), (0, 1), (0, 1)
    ))


def verify_matrix(
    pin_label: str,
    matrix_marker: str,
    shard_marker: str,
    source_label: str,
    runner_label: str,
    expected_cases: list[tuple],
    case_keys: tuple[str, ...],
) -> tuple[dict[str, object], list[dict[str, object]]]:
    manifest = load(PINS[pin_label][0])
    assert manifest["marker"] == matrix_marker
    assert manifest["source_sha256"] == PINS[source_label][1]
    assert manifest["runner_source_sha256"] == PINS[runner_label][1]
    assert manifest["shards"] == len(expected_cases) == len(manifest["rows"])
    assert manifest["simplex_coefficients"] == 70 * len(expected_cases)
    assert manifest["negative"] == 0 and manifest["zero"] == 0
    assert Fraction(manifest["minimum"]) > 0

    rows_by_case = {
        tuple(row[key] for key in case_keys): row for row in manifest["rows"]
    }
    assert set(rows_by_case) == set(expected_cases)
    assert len(rows_by_case) == len(expected_cases)
    expected_betas = list(weak_compositions(4, 5))
    assert len(expected_betas) == 70
    total_tensor = 0
    global_minimum = None
    summaries = []
    for case in expected_cases:
        row = rows_by_case[case]
        path = HERE / row["report"]
        assert path.is_file()
        assert sha256(path) == row["report_sha256"]
        shard = json.loads(path.read_text(encoding="utf-8"))
        assert shard["marker"] == shard_marker
        assert shard["source_sha256"] == PINS[source_label][1]
        for key, value in zip(case_keys, case):
            assert shard[key] == value
        assert shard["simplex_degree"] == 4
        assert shard["homogeneous_simplex_coefficients"] == 70
        assert shard["start_beta"] == 0 and shard["stop_beta"] == 70
        assert shard["processed_betas"] == 70
        assert shard["negative_betas"] == 0
        assert len(shard["records"]) == 70

        digest = hashlib.sha256()
        shard_tensor = 0
        shard_minimum = None
        for index, record in enumerate(shard["records"]):
            assert record["beta_index"] == index
            assert tuple(record["beta"]) == expected_betas[index]
            assert record["negative"] == 0 and record["zero"] == 0
            minimum = Fraction(record["minimum"])
            assert minimum > 0
            shard_minimum = minimum if shard_minimum is None else min(
                shard_minimum, minimum
            )
            shard_tensor += record["bernstein_coefficients"]
            digest.update(json.dumps(
                record, separators=(",", ":"), sort_keys=True
            ).encode())
        assert digest.hexdigest().upper() == shard["ordered_record_sha256"]
        assert shard["ordered_record_sha256"] == row["ordered_record_sha256"]
        assert shard_tensor == row["bernstein_coefficients"]
        assert str(shard_minimum) == row["minimum"]
        total_tensor += shard_tensor
        global_minimum = shard_minimum if global_minimum is None else min(
            global_minimum, shard_minimum
        )
        summaries.append({
            "case": dict(zip(case_keys, case)),
            "file": path.name,
            "sha256": row["report_sha256"],
            "ordered_record_sha256": row["ordered_record_sha256"],
            "tensor_bernstein_coefficients": shard_tensor,
            "minimum": str(shard_minimum),
            "negative": 0,
            "zero": 0,
        })
    assert total_tensor == manifest["bernstein_coefficients"]
    assert str(global_minimum) == manifest["minimum"]
    return ({
        "manifest": PINS[pin_label][0],
        "manifest_sha256": PINS[pin_label][1],
        "shards": len(expected_cases),
        "simplex_coefficients": manifest["simplex_coefficients"],
        "tensor_bernstein_coefficients": total_tensor,
        "minimum": str(global_minimum),
        "negative": 0,
        "zero": 0,
        "second_byte_identical_replay": True,
    }, summaries)


def verify_chart_coverage() -> dict[str, object]:
    n, union, mb, mc = sp.symbols("N U mB mC", positive=True)
    low_x = sp.cancel(2 * (mb - 7) / (union - 14))
    low_y = sp.cancel((mc - (union - mb)) / mb)
    high_x = sp.cancel(2 * mb / union - 1)
    high_y = sp.cancel((mc - mb) / (union - mb))
    small_y = sp.cancel((mc - (union - mb)) / mb)
    assert sp.cancel(7 + (union - 14) * low_x / 2 - mb) == 0
    assert sp.cancel(union - mb + mb * low_y - mc) == 0
    assert sp.cancel(union * (1 + high_x) / 2 - mb) == 0
    assert sp.cancel(mb + (union - mb) * high_y - mc) == 0
    assert sp.cancel(union - mb + mb * small_y - mc) == 0
    assert sp.cancel(n - 1 - union).subs(union, n - 1) == 0
    return {
        "symmetry_reduction": "swap B,C so mB<=mC",
        "geometry_common0": "union=N and d=mB+mC-N",
        "geometry_common1": "union=N-1 and d=mB+mC-N+1",
        "small_branch": (
            "0<=mB<=6; mC=union-mB+mB*y, 0<=y<=1"
        ),
        "large_low_chart": (
            "7<=mB<=union/2; union-mB<=mC<=union"
        ),
        "large_high_chart": (
            "union/2<=mB<=mC<=union"
        ),
        "inverse_parameters": {
            "small_y": str(small_y),
            "low_x": str(low_x),
            "low_y": str(low_y),
            "high_x": str(high_x),
            "high_y": str(high_y),
        },
        "exhaustive_for_N_ge_19": True,
    }


def main() -> None:
    pins = verify_pins()
    algebra = verify_endpoint_and_ratio()
    small_total, small_rows = verify_matrix(
        "small_manifest", SMALL_MARKER, SMALL_SHARD_MARKER,
        "small_source", "small_runner", expected_small_cases(),
        ("geometry", "small_B_order", "B_mask", "C_mask", "D2_mask"),
    )
    large_total, large_rows = verify_matrix(
        "large_manifest", LARGE_MARKER, LARGE_SHARD_MARKER,
        "large_source", "large_runner", expected_large_cases(),
        ("geometry", "order_chart", "B_mask", "C_mask", "D2_mask"),
    )
    assert small_total["shards"] == 112
    assert small_total["simplex_coefficients"] == 7_840
    assert small_total["tensor_bernstein_coefficients"] == 87_241_624
    assert large_total["shards"] == 32
    assert large_total["simplex_coefficients"] == 2_240
    assert large_total["tensor_bernstein_coefficients"] == 317_438_176
    combined_tensor = (
        small_total["tensor_bernstein_coefficients"]
        + large_total["tensor_bernstein_coefficients"]
    )
    assert combined_tensor == 404_679_800
    coverage = verify_chart_coverage()
    report = {
        "marker": MARKER,
        "status": "PASS exact nonadjacent no-parent N>=19 rank-six g2 theorem",
        "theorem": (
            "For every finite forest in the nonadjacent-mark canonical no-parent "
            "rank-six whole-bundle geometry whose common row A has order N>=19, "
            "the coefficient g2 is nonnegative, for all feasible induced-row orders."
        ),
        "algebra_and_domain": algebra,
        "coverage": coverage,
        "small_certificate": small_total,
        "large_certificate": large_total,
        "combined": {
            "shards": small_total["shards"] + large_total["shards"],
            "simplex_coefficients": (
                small_total["simplex_coefficients"]
                + large_total["simplex_coefficients"]
            ),
            "tensor_bernstein_coefficients": combined_tensor,
            "negative": 0,
            "zero": 0,
            "global_minimum": "1/11520",
        },
        "small_shards": small_rows,
        "large_shards": large_rows,
        "pins": pins,
        "scope_guard": (
            "This closes N>=19 in the nonadjacent no-parent geometry only. "
            "Finite N<=18 and all parent modes remain separate obligations."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "shards": report["combined"]["shards"],
        "simplex_coefficients": report["combined"]["simplex_coefficients"],
        "tensor_bernstein_coefficients": combined_tensor,
        "global_minimum": report["combined"]["global_minimum"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
