#!/usr/bin/env python3
"""Fail-closed all-order assembly of internal-spine ordinary-parent g1.

The internal ordinary broom has length ell>=1 and collision-leaf count k>=0.
For ell=1,...,7 its literal expansion has exactly the seven Newton rows
binom(k,j), j=0,...,6.  The j=0 row is covered by the ell=1,2 exact mode
transfers and the literal ell=3,...,7 theorem; rows j=1,...,4 have exact
finite/large joins; rows j=5,6 have solver-free interval certificates.

For ell=8+h, h>=0, the frozen large-broom assembler proves every nonzero
tensor-Newton cell in (h,k).  This source pins those artifacts, reconstructs
the literal seven-row support, and verifies disjoint exhaustive coverage.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_g1_internal_endpoint_broom_parameters_root import tensor_binomial
from derive_iso_n5_g1_internal_ordinary_broom_factor_root import ordinary_expression
from derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root import child_rows


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_internal_ordinary_all_forest_exact_root_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_ALL_FOREST_ROOT"

PINS = {
    "derive_iso_n5_g1_internal_ordinary_broom_factor_root.py":
        "183528806BCBEBC38C9C2D1830D86CE83BD5567FD4DA333CFFAEA8FE406C5605",
    "iso_n5_g1_internal_ordinary_broom_factor_root_20260830.json":
        "0FBB991352B7736DC4CE7A28932FB60CD8B3CA9ACBADB2F91F16C306F7DE4DF8",
    "derive_iso_n5_g1_internal_ordinary_small_broom_parameters_root.py":
        "8ED18D7C3116B83527A08471B0820319FFBB134E4FDA086070AB760F1F122E6B",
    "iso_n5_g1_internal_ordinary_small_broom_parameters_exact_root_20260830.json":
        "62B4298DB9973653242530EE1F1D7209E98C4E1EE4217C73AB5C8328D375A4A3",
    "prove_iso_n5_g1_internal_ordinary_k0_ell1_2_mode_transfer_g1_bernstein.py":
        "D97CA82592E4DF0731430D65F61175E1AB90545F5F6C1FD006278E13E04EDEF7",
    "iso_n5_g1_internal_ordinary_k0_ell1_2_mode_transfer_exact_g1_bernstein_20260830.json":
        "ACBA45DD666BAEB0AB7C457EAFF81A8D760E8753B1B5FD21863D2F80DC92A906",
    "audit_iso_n5_g1_internal_ordinary_k0_ell1_2_mode_transfer_independent_g1_nonadjacent.py":
        "73D1B945F0AF2522E445DD41D9ABFC71F6D4482A74AD352FE1CF46536F6E995E",
    "iso_n5_g1_internal_ordinary_k0_ell1_2_mode_transfer_independent_audit_g1_nonadjacent_20260830.json":
        "AB6E60CEC26D687FE015E1CB702E4AD2DC6693435A917796FE035BA48B8D6527",
    "prove_iso_n5_g1_internal_ordinary_small_k0_ell3_7_literal_all_parent_g1_nonadjacent.py":
        "1004A6D5C2E2163278E72463C2225D988EAE1765E789DEB68CDFF54360D1680B",
    "iso_n5_g1_internal_ordinary_small_k0_ell3_7_literal_all_parent_exact_g1_nonadjacent_20260830.json":
        "DEA3CEA8EE74E28A3AF02BE416462BC280EE081DF9C3690065F8CF5EEB4461F4",
    "assemble_iso_n5_g1_internal_ordinary_small_k1_all_parent_root.py":
        "541AD1C826649593B5173D25BA7CC97646538881F98B1DCAFC857AE5269C7627",
    "iso_n5_g1_internal_ordinary_small_k1_all_parent_exact_root_20260830.json":
        "C7D57DA45B77AE48BA256522C517422833A457EE023161329342B0EFD2A9FFEB",
    "assemble_iso_n5_g1_internal_ordinary_small_k2_all_parent_root.py":
        "F96A727E0CCB5E3C5A7729DC2F8F5D6312CEBB6237D0515BEB1EE5B45607A92F",
    "iso_n5_g1_internal_ordinary_small_k2_all_parent_exact_root_20260830.json":
        "89C21995F8AD64FCE68E6DFEA0F10BE853E176A996E3D70F6FA034C2219B6E34",
    "assemble_iso_n5_g1_internal_ordinary_small_k3_all_parent_root.py":
        "B67E91711A9ABDBEB99E1743D461CF4D30CE7109FF98C28112862673F891B299",
    "iso_n5_g1_internal_ordinary_small_k3_all_parent_exact_root_20260830.json":
        "343E43E7DDB7051484E90C6A30BDA0246F0EA4899E530AB80AB6C69E8DDF5A86",
    "assemble_iso_n5_g1_internal_ordinary_small_k4_all_parent_root.py":
        "B463A498D01906D64BE10E14E7E66F1512B0ADB773F746B4EB70FCB69251B227",
    "iso_n5_g1_internal_ordinary_small_k4_all_parent_exact_root_20260830.json":
        "7DBC9F6B222CE32704DA9222AB6A9EFA37AA70208D41B050ED915307872A4E17",
    "prove_iso_n5_g1_internal_ordinary_small_high_k_interval_root.py":
        "41900AAB81028005F93508F33D06D2179D53B898D1E673BF86A37C2F6CCE5873",
    "iso_n5_g1_internal_ordinary_small_high_k_interval_exact_root_20260830.json":
        "7335845AF2D651A9D95D1A20EA7FBEC1F9D071303FE50EA1D5A3ED23534A4966",
    "assemble_iso_n5_g1_internal_ordinary_large_broom_all_cells_root.py":
        "A0476528106614FE742329DE5215486D8E746DDDB54768E3FDC63C6E02C703C7",
    "iso_n5_g1_internal_ordinary_large_broom_all_cells_exact_root_20260830.json":
        "FB4BA62E9EE8007C463A903F0A1A32145AA17133E373D16673440773DCE6BEBD",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def literal_newton_support():
    expression, rows = ordinary_expression()
    k = sp.symbols("k", integer=True, nonnegative=True)
    result = {}
    for ell in range(1, 8):
        actual = child_rows(ell, k)
        rules = {
            rows[name][rank]: actual[index][rank]
            for index, name in enumerate(("X", "U", "Y", "Z"))
            for rank in range(1, 7)
        }
        degrees, coefficients = tensor_binomial(
            sp.expand(expression.subs(rules)), (k,)
        )
        nonzero = tuple(
            index[0] for index, value in sorted(coefficients.items()) if value != 0
        )
        assert degrees == (6,)
        assert nonzero == tuple(range(7))
        result[ell] = nonzero
    return result


def main() -> None:
    assert {name: sha256(HERE / name) for name in PINS} == PINS

    factor = load("iso_n5_g1_internal_ordinary_broom_factor_root_20260830.json")
    parameters = load(
        "iso_n5_g1_internal_ordinary_small_broom_parameters_exact_root_20260830.json"
    )
    transfer = load(
        "iso_n5_g1_internal_ordinary_k0_ell1_2_mode_transfer_exact_g1_bernstein_20260830.json"
    )
    transfer_audit = load(
        "iso_n5_g1_internal_ordinary_k0_ell1_2_mode_transfer_independent_audit_g1_nonadjacent_20260830.json"
    )
    literal = load(
        "iso_n5_g1_internal_ordinary_small_k0_ell3_7_literal_all_parent_exact_g1_nonadjacent_20260830.json"
    )
    rows = {
        index: load(
            f"iso_n5_g1_internal_ordinary_small_k{index}_all_parent_exact_root_20260830.json"
        )
        for index in range(1, 5)
    }
    high = load(
        "iso_n5_g1_internal_ordinary_small_high_k_interval_exact_root_20260830.json"
    )
    large = load(
        "iso_n5_g1_internal_ordinary_large_broom_all_cells_exact_root_20260830.json"
    )

    assert factor["marker"] == "DERIVED_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_BROOM_FACTOR_ROOT"
    assert parameters["marker"] == "DERIVED_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_BROOM_PARAMETERS_ROOT"
    assert parameters["lengths"] == list(range(1, 8))
    assert parameters["collision_leaf_domain"] == "integer k>=0"
    assert all(
        row["degree_k"] == 6
        and row["coefficient_cells"] == 7
        and row["nonzero_parent_forms"] == 7
        for row in parameters["per_length"]
    )
    support = literal_newton_support()

    assert transfer["marker"] == (
        "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_K0_ELL1_2_MODE_TRANSFER_G1_BERNSTEIN"
    )
    assert transfer["source_sha256"] == PINS[
        "prove_iso_n5_g1_internal_ordinary_k0_ell1_2_mode_transfer_g1_bernstein.py"
    ]
    assert transfer["mode_transfers"]["ell1"]["raw_difference"] == 0
    assert transfer["mode_transfers"]["ell2"]["raw_difference"] == 0
    transfer_faces = {
        (face["ell"], face["k"], face["parent_geometry"])
        for face in transfer["closed_literal_faces"]
    }
    assert transfer_faces == {
        (ell, 0, geometry)
        for ell in (1, 2)
        for geometry in ("adjacent", "nonadjacent")
    }
    assert set(transfer["parent_geometry_coverage"]) == {
        "p adjacent to v",
        "p connected and nonadjacent to v",
        "p and v in distinct components",
    }
    assert transfer_audit["marker"] == (
        "PASS_INDEPENDENT_AUDIT_ISO_N5_G1_INTERNAL_ORDINARY_K0_ELL1_2_MODE_TRANSFER_G1_NONADJACENT"
    )
    assert transfer_audit["pinned_sha256"]["transfer_source"] == PINS[
        "prove_iso_n5_g1_internal_ordinary_k0_ell1_2_mode_transfer_g1_bernstein.py"
    ]
    assert transfer_audit["pinned_sha256"]["transfer_report"] == PINS[
        "iso_n5_g1_internal_ordinary_k0_ell1_2_mode_transfer_exact_g1_bernstein_20260830.json"
    ]
    assert transfer_audit["independent_reconstruction"]["ell1_raw_difference"] == 0
    assert transfer_audit["independent_reconstruction"]["ell2_raw_difference"] == 0
    assert transfer_audit["independent_reconstruction"]["graph_recurrence_audit"][
        "ordered_parent_mark_cells"
    ] == 2448

    assert literal["marker"] == (
        "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K0_ELL3_7_LITERAL_ALL_PARENT_G1_NONADJACENT"
    )
    literal_faces = {
        (face["ell"], face["epsilon"], face["geometry"])
        for face in literal["faces"]
    }
    assert literal_faces == {
        (ell, epsilon, "adjacent" if epsilon == 0 else "nonadjacent")
        for ell in range(3, 8)
        for epsilon in (0, 1)
    }
    assert all(
        sp.Rational(face["minimum_positive_residual_coefficient"]) > 0
        for face in literal["faces"]
    )

    markers = {
        1: "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K1_ALL_PARENT_ROOT",
        2: "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K2_ALL_PARENT_ROOT",
        3: "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K3_ALL_PARENT_ROOT",
        4: "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_K4_ALL_PARENT_ROOT",
    }
    for index, theorem in rows.items():
        assert theorem["marker"] == markers[index]
        assert theorem["cells"] == [[ell, index] for ell in range(1, 8)]
        assert theorem["coverage"] == {
            "finite": "all parent forests and ordered distinct marks with A-order 0..9",
            "large": "all parent forests and both parent-mark geometries with A-order at least 10",
        }
        assert theorem["finite_certificate"]["negative_values"] == 0
        large_certificate = theorem["large_certificate"]
        if "minimum_positive_power_coefficient" in large_certificate:
            assert sp.Rational(
                large_certificate["minimum_positive_power_coefficient"]
            ) > 0
        elif "minimum_power_coefficient" in large_certificate:
            assert sp.Rational(large_certificate["minimum_power_coefficient"]) > 0
        else:
            assert index == 4
            assert large_certificate["faces"] == 2
            assert large_certificate["rows_per_face"] == [7, 7]
            assert large_certificate["nonadjacent_positive_corrections"] == 7

    assert high["marker"] == (
        "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_SMALL_HIGH_K_INTERVAL_ROOT"
    )
    assert high["lengths"] == [1, 7]
    assert high["k_indices"] == [5, 6]
    assert {(face["epsilon"], face["geometry"]) for face in high["faces"]} == {
        (0, "adjacent"), (1, "nonadjacent")
    }
    assert all(face["rows"] == 14 for face in high["faces"])
    assert all(
        sp.Rational(face["minimum_residual_coefficient"]) > 0
        for face in high["faces"]
    )

    small_groups = {
        "k0_ell1_2_mode_transfer": {
            (ell, 0, epsilon) for ell in (1, 2) for epsilon in (0, 1)
        },
        "k0_ell3_7_literal": {
            (ell, 0, epsilon) for ell in range(3, 8) for epsilon in (0, 1)
        },
        **{
            f"k{index}_finite_large_join": {
                (ell, index, epsilon)
                for ell in range(1, 8) for epsilon in (0, 1)
            }
            for index in range(1, 5)
        },
        "k5_6_interval": {
            (ell, index, epsilon)
            for ell in range(1, 8)
            for index in (5, 6)
            for epsilon in (0, 1)
        },
    }
    counted = [cell for group in small_groups.values() for cell in group]
    expected = {
        (ell, index, epsilon)
        for ell in range(1, 8)
        for index in range(7)
        for epsilon in (0, 1)
    }
    assert len(counted) == len(set(counted)) == 98
    assert set(counted) == expected
    assert all(support[ell] == tuple(range(7)) for ell in support)

    assert large["marker"] == (
        "PASS_EXACT_ISO_N5_G1_INTERNAL_ORDINARY_LARGE_BROOM_ALL_CELLS_ROOT"
    )
    assert large["coverage_count"] == 28
    assert large["duplicate_cells"] == 0
    assert large["missing_cells"] == []
    assert large["tensor_degrees_h_k"] == [6, 6]
    assert "every ell>=8" in large["status"]

    report = {
        "marker": MARKER,
        "theorem": (
            "For every ell>=1, k>=0, every finite parent forest, and every "
            "ordinary-parent placement relative to the second mark, the "
            "rank-five internal-spine/broom ordinary-parent coefficient g1 "
            "is nonnegative."
        ),
        "parameter_domain": {
            "broom_length": "integer ell>=1",
            "collision_leaves": "integer k>=0",
            "parent_placements": [
                "adjacent",
                "connected nonadjacent",
                "disconnected",
            ],
        },
        "small_brooms": {
            "lengths": [1, 7],
            "literal_newton_indices": list(range(7)),
            "coverage_groups": {
                name: [list(cell) for cell in sorted(group)]
                for name, group in small_groups.items()
            },
            "coverage_count": len(counted),
            "duplicates": len(counted) - len(set(counted)),
            "missing": [list(cell) for cell in sorted(expected - set(counted))],
            "integer_conclusion": (
                "Every binom(k,j) is nonnegative for integer k>=0, so the "
                "seven nonnegative literal Newton rows imply g1>=0."
            ),
        },
        "large_brooms": {
            "lengths": "ell=8+h, integer h>=0",
            "tensor_newton_cells": large["coverage_count"],
            "missing": large["missing_cells"],
            "integer_conclusion": (
                "Every binom(h,i)binom(k,j) is nonnegative for integers "
                "h,k>=0, so the exhaustive nonnegative tensor cells imply g1>=0."
            ),
        },
        "replay": {
            "all_dependency_hashes_matched": True,
            "literal_small_support_reconstructed": True,
            "small_coverage_disjoint_and_exhaustive": True,
            "large_coverage_disjoint_and_exhaustive": True,
        },
        "dependencies_sha256": PINS,
        "status": "exact all-order theorem for the complete internal-spine ordinary-parent g1 mode",
        "scope": (
            "This closes exactly internal_spine_broom_ordinary g1. Other "
            "canonical modes are imported only through the ell=1,2 transfer; "
            "g2, full N5 induction, and Erdos Problem 993 remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "small_coverage_count": report["small_brooms"]["coverage_count"],
        "small_duplicates": report["small_brooms"]["duplicates"],
        "small_missing": report["small_brooms"]["missing"],
        "large_tensor_cells": report["large_brooms"]["tensor_newton_cells"],
        "large_missing": report["large_brooms"]["missing"],
        "source_sha256": report["source_sha256"],
        "status": report["status"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
