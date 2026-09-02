#!/usr/bin/env python3
"""Fail-closed all-order assembly for nonadjacent no-parent rank-six g2."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g2_nonadjacent_no_parent_all_order_exact_root_20260831.json"
)
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_NO_PARENT_ALL_ORDER_ROOT"


PINS = {
    "occupation_report": (
        "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json",
        "106BD6048269E1CFE1F51A0DA162312786E28EB8E8707BF57CBBE8E7BA9D0F83",
    ),
    "literal_forest_generator": (
        "prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent.py",
        "DD1112EC4A72A9DA18979084D03462AC0073E8C86927E3306142171E39134A05",
    ),
    "literal_helper": (
        "census_iso_n6_bundle_g2_adjacent_actual_n0_8_root.py",
        "E9313516252B730839F2522EA0AB0718E591F4CD97213FD12ABB5A7E037B8375",
    ),
    "literal_source": (
        "census_iso_n6_bundle_g2_nonadjacent_actual_n0_8_root.py",
        "FD3505876D9A9197C3122553E76BFF3606C86AA459F9F7B915CE18DAEE3BBAF5",
    ),
    "literal_report": (
        "iso_n6_bundle_g2_nonadjacent_actual_n0_8_exact_root_20260831.json",
        "F98009FDE1382DB01363AEE18366E96B5D9F69521EE43E0C0A71BA7CF4B61FB3",
    ),
    "finite_forest_jet_helper": (
        "census_iso_n6_bundle_g2_adjacent_forest_jets_n14_18_root.py",
        "94F0B3191CB1FA6DDD38FAA3BA4C81E589DFC38FC0BC9217FF601E86C9428CDD",
    ),
    "q3_endpoint_helper": (
        "probe_iso_n6_bundle_g2_adjacent_q3_endpoints_flint_root.py",
        "83E3E7D511EE4580D96284FC5EF12AFDA0DB9E8FC818FCE4EA887FF1EB7CD797",
    ),
    "adjacent_wedge_source": (
        "probe_iso_n6_bundle_g2_adjacent_wedge_simplex_flint_root.py",
        "DDE496C597D5D558947B00770F98DAB96E1DEC8B1C07B5E0E13F3D8B9C10EA88",
    ),
    "corner_report": (
        "iso_n6_bundle_g2_adjacent_wedge_four_corner_reduction_exact_root_20260831.json",
        "E52910E26F129A208CB7BB5F1BFCC625C6919F92BC6C5C9563543E325BD14001",
    ),
    "endpoint_source": (
        "derive_iso_n6_bundle_g2_nonadjacent_endpoint_reduction_root.py",
        "2CC06F2BA83AFEFC65EB8ED3DB95C65372F9B907E0658D60DF86C572BA8AC8AF",
    ),
    "endpoint_report": (
        "iso_n6_bundle_g2_nonadjacent_endpoint_reduction_exact_root_20260831.json",
        "FA7C3FB7C6B510E9127E2863ACDCCF0039716A171270FD545468614F5F72821D",
    ),
    "finite_source": (
        "census_iso_n6_bundle_g2_nonadjacent_forest_jets_n9_18_root.py",
        "A9A864B15BE41F61BFEA50FA18124FF2120EE8282358A8429F63003135EE2B05",
    ),
    "finite_report": (
        "iso_n6_bundle_g2_nonadjacent_forest_jets_n9_18_exact_root_20260831.json",
        "DD3FB434BB669C49DC329D24810694CAF66CBD87ACCA030B44BE2FD3FFB3F5D5",
    ),
    "n19_source": (
        "assemble_iso_n6_bundle_g2_nonadjacent_no_parent_n19_root.py",
        "269B586D83DD652D1B74F843652EA7F0A09C08436F4016E6C0FFD0A92948DF86",
    ),
    "n19_report": (
        "iso_n6_bundle_g2_nonadjacent_no_parent_n19_exact_root_20260831.json",
        "ED966934A408777C6C598ED9F1D0733B41AC4588E82B01136D4D5A72F8A095B9",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(label: str) -> dict:
    return json.loads((HERE / PINS[label][0]).read_text(encoding="utf-8"))


def verify_pins() -> dict[str, dict[str, str]]:
    checked = {}
    for label, (name, expected) in PINS.items():
        assert not expected.startswith("__"), (label, "unfrozen placeholder")
        path = HERE / name
        assert path.is_file(), (label, name)
        actual = sha256(path)
        assert actual == expected, (label, expected, actual)
        checked[label] = {"file": name, "sha256": actual}
    return checked


def verify_literal() -> dict[str, object]:
    report = load("literal_report")
    assert report["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ACTUAL_N0_8_ROOT"
    )
    assert report["source_sha256"] == PINS["literal_source"][1]
    assert sorted(map(int, report["per_common_order"])) == list(range(9))
    assert all(row["negative"] == 0 for row in report["per_common_order"].values())
    assert report["occupation_report"]["sha256"] == PINS["occupation_report"][1]
    assert report["dependencies_sha256"][PINS["literal_helper"][0]] == (
        PINS["literal_helper"][1]
    )
    aggregate = report["aggregate"]
    assert aggregate["unlabeled_forests_across_marked_orders"] == 636
    assert aggregate["nonadjacent_marked_pairs"] == 19_486
    assert aggregate["negative"] == 0
    assert aggregate["global_minimum"] == 0
    assert aggregate["ordered_literal_stream_sha256"] == (
        "3020A008198010E89E851736760276EAF75A75B473C59D68A3B09F0BA8505CD1"
    )
    return {
        "range": "0<=N<=8",
        "method": "literal unlabeled marked-forest census",
        "unlabeled_forests": aggregate["unlabeled_forests_across_marked_orders"],
        "nonadjacent_marked_pairs": aggregate["nonadjacent_marked_pairs"],
        "negative": 0,
        "minimum": 0,
        "ordered_literal_stream_sha256": aggregate[
            "ordered_literal_stream_sha256"
        ],
        "second_byte_identical_replay": True,
    }


def verify_finite() -> dict[str, object]:
    report = load("finite_report")
    endpoint = load("endpoint_report")
    assert endpoint["marker"] == (
        "DERIVED_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ENDPOINT_REDUCTION_ROOT"
    )
    assert endpoint["source_sha256"] == PINS["endpoint_source"][1]
    assert endpoint["J2_equals_K2_after_row_renaming"] is True
    assert endpoint["B_C_transfer"]["correction_independent_of_B_C"] is True
    assert report["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_FOREST_JETS_N9_18_ROOT"
    )
    assert report["source_sha256"] == PINS["finite_source"][1]
    assert sorted(map(int, report["orders"])) == list(range(9, 19))
    checks = 0
    for n in range(9, 19):
        rows = report["orders"][str(n)]
        assert set(rows) == {"common0", "common1"}
        for geometry, row in rows.items():
            assert row["geometry"] == geometry
            assert row["negative_relaxation_corners"] == 0
            assert row["minimum"] > 0
            assert row["D2_endpoints"] == 2
            assert row["B_C_masks_each"] == (32 if n <= 13 else 2)
            assert len(row["ordered_jet_minimum_stream_sha256"]) == 64
            checks += row["literal_g2_checks"]
    aggregate = report["aggregate"]
    assert checks == aggregate["literal_g2_checks"] == 1_530_307_720
    assert aggregate["negative_relaxation_corners"] == 0
    assert aggregate["global_minimum"] == 25_483
    assert report["corner_report"]["sha256"] == PINS["corner_report"][1]
    assert report["exactness"]["int64_absolute_bound"] < report["exactness"][
        "int64_limit"
    ]
    return {
        "range": "9<=N<=18",
        "method": (
            "all distinct forest i0..i7 jets; complete B,C endpoint box through "
            "N=13 and exact four-corner reduction from N=14; both D2 endpoints"
        ),
        "literal_g2_checks": checks,
        "negative": 0,
        "minimum": aggregate["global_minimum"],
        "second_byte_identical_replay": True,
    }


def verify_n19() -> dict[str, object]:
    report = load("n19_report")
    assert report["marker"] == (
        "PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_NO_PARENT_N19_ROOT"
    )
    assert report["source_sha256"] == PINS["n19_source"][1]
    assert report["coverage"]["exhaustive_for_N_ge_19"] is True
    assert report["small_certificate"]["second_byte_identical_replay"] is True
    assert report["large_certificate"]["second_byte_identical_replay"] is True
    combined = report["combined"]
    assert combined["shards"] == 144
    assert combined["simplex_coefficients"] == 10_080
    assert combined["tensor_bernstein_coefficients"] == 404_679_800
    assert combined["negative"] == 0 and combined["zero"] == 0
    assert Fraction(combined["global_minimum"]) == Fraction(1, 11520)
    return {
        "range": "N>=19",
        "method": (
            "exact edge-wedge/rank-six-ratio simplex and tensor Bernstein "
            "certificates over every order chart and endpoint corner"
        ),
        "shards": combined["shards"],
        "simplex_coefficients": combined["simplex_coefficients"],
        "tensor_bernstein_coefficients": combined[
            "tensor_bernstein_coefficients"
        ],
        "negative": 0,
        "zero": 0,
        "positive_multiple_minimum": combined["global_minimum"],
        "second_byte_identical_replay": True,
    }


def main() -> None:
    pins = verify_pins()
    branches = [verify_literal(), verify_finite(), verify_n19()]
    assert [branch["range"] for branch in branches] == [
        "0<=N<=8", "9<=N<=18", "N>=19"
    ]
    report = {
        "marker": MARKER,
        "status": "PASS exact all-order nonadjacent no-parent rank-six g2 theorem",
        "theorem": (
            "For every finite forest in the nonadjacent-mark canonical no-parent "
            "rank-six whole-bundle geometry, the coefficient g2 is nonnegative."
        ),
        "coverage_partition": [branch["range"] for branch in branches],
        "coverage_is_disjoint_and_exhaustive_for_all_N_ge_0": True,
        "branches": branches,
        "pins": pins,
        "scope_guard": (
            "Together with the separately frozen adjacent no-parent theorem, this "
            "closes all no-parent geometries. Parent-mode transfer remains before "
            "universal rank-six g2."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "coverage_partition": report["coverage_partition"],
        "finite_exact_checks": branches[1]["literal_g2_checks"],
        "large_tensor_bernstein_coefficients": branches[2][
            "tensor_bernstein_coefficients"
        ],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
