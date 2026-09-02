#!/usr/bin/env python3
"""Fail-closed assembly of connected-nonadjacent M5 and M5+3*C5."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_connected_nonadjacent_m5_all_forest_assembled_g1_bernstein_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G1_CONNECTED_NONADJACENT_M5_ALL_FOREST_G1_BERNSTEIN"
BRANCH_MARKER = "PASS_INDEPENDENT_EXACT_ISO_N5_G1_CONNECTED_NONADJACENT_M5_ADAPTIVE_NATIVE_CONE_G1_BERNSTEIN"
PINS = {
    "derive_iso_n5_bundle_g1_no_mark_root_compact_root.py":
        "39243EEEB2C22ABE711401959804C839C5AFE3A7882691EB9FA8FC91CBE7E3E7",
    "iso_n5_bundle_g1_no_mark_root_compact_root_20260829.json":
        "9954176009C063BC69511A8DA6FF90B0E0B6ADC02BF007045E8ADF168014088B",
    "derive_iso_n5_g1_connected_nonadjacent_m5_residual_g1_bernstein.py":
        "B1085A03641C188D57AA39BA7F59013F648C6C0C797925C0CD936B6CC77AE21E",
    "iso_n5_g1_connected_nonadjacent_m5_residual_exact_g1_bernstein_20260830.json":
        "1049F2C5A37262035247F6110EBC6543F2853E4E5838FE38E5205A081C9BB3BA",
    "derive_iso_n5_g1_connected_nonadjacent_m5_adaptive_row_reduction_g1_bernstein.py":
        "5FD9F66D1D9D574A13FBF1CBE4D903CCE9721201A1BCE751674520780C0759D9",
    "iso_n5_g1_connected_nonadjacent_m5_adaptive_row_reduction_exact_g1_bernstein_20260830.json":
        "40F0572E8771C8B6519237F32D1F29DD168DE224B125FD7485D8D4CC172EB8E6",
    "audit_iso_n5_g1_connected_nonadjacent_m5_adaptive_native_cone_g1_bernstein.py":
        "617F77437A261F33E6A1E73ED240EB1816CCD8E0DCE5EFEA73EA39DF6B5278F6",
    "probe_iso_n5_g1_connected_nonadjacent_m5_adaptive_cone_g1_bernstein.py":
        "F796C3D4A9DA03724472432391A91290899C7006E8EF1D5F25365C42EC069074",
    "probe_iso_n5_g1_connected_nonadjacent_m5_s_finite_g1_bernstein.py":
        "2452D9FDEDC1D16BC06D3B3E0B15DA5C6E943010A79A07CAEA70BB4F4E8A14FC",
    "iso_n5_g1_connected_nonadjacent_m5_s_finite_probe_g1_bernstein_20260830.json":
        "B926B210096E0DA4A3AF57CBDBF47B6A791EF8EC9C549E108A61FD83920E2A75",
    "prove_iso_n5_g1_connected_nonadjacent_m5_rminus1_g1_bernstein.py":
        "596BD937BBCF3F4C168CD8DF517C93271A8B923DA635BF044AAF0FEC99F0C1F2",
    "iso_n5_g1_connected_nonadjacent_m5_rminus1_exact_g1_bernstein_20260830.json":
        "4315926C1610419C5E657D97B21CB8927D91C40C20DEA4E39FA015D4BE4EC314",
    "assemble_iso_n5_g1_connected_nonadjacent_m5_far_all_r_g1_bernstein.py":
        "F1C98A130174E49BBCD45F7DB23FCBB47020907AB23D33548362168EB79C217F",
    "iso_n5_g1_connected_nonadjacent_m5_far_all_r_assembled_g1_bernstein_20260830.json":
        "1D3635EB1930E880BD2E6EF5A25A8C015D1F1B0D3BAB20F47C48ED10B2F20D67",
    "assemble_iso_n5_c5_connected_nonadjacent_all_forest_g1_nonadjacent.py":
        "FA86DD62E1B9026AD00120EDDFA6E33B1948A0DD7F2465B1089978ACBC3ED365",
    "iso_n5_c5_connected_nonadjacent_all_forest_assembled_g1_nonadjacent_20260830.json":
        "B0239921C67B96321F52F6461EFFE6E3DEA81D12CE694C591273769F3DC58D8B",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE/name).read_text(encoding="utf-8"))


def main() -> None:
    assert {name: sha256(HERE/name) for name in PINS} == PINS
    compact = load("iso_n5_bundle_g1_no_mark_root_compact_root_20260829.json")
    residual = load("iso_n5_g1_connected_nonadjacent_m5_residual_exact_g1_bernstein_20260830.json")
    reduction = load("iso_n5_g1_connected_nonadjacent_m5_adaptive_row_reduction_exact_g1_bernstein_20260830.json")
    finite = load("iso_n5_g1_connected_nonadjacent_m5_s_finite_probe_g1_bernstein_20260830.json")
    exceptional = load("iso_n5_g1_connected_nonadjacent_m5_rminus1_exact_g1_bernstein_20260830.json")
    far = load("iso_n5_g1_connected_nonadjacent_m5_far_all_r_assembled_g1_bernstein_20260830.json")
    c5 = load("iso_n5_c5_connected_nonadjacent_all_forest_assembled_g1_nonadjacent_20260830.json")

    assert compact["marker"] == "PASS_EXACT_ISO_N5_BUNDLE_G1_NO_MARK_ROOT_COMPACT_IDENTITY_ROOT"
    assert residual["marker"] == "DERIVED_EXACT_ISO_N5_G1_CONNECTED_NONADJACENT_M5_RESIDUAL_G1_BERNSTEIN"
    assert reduction["marker"] == "DERIVED_EXACT_ISO_N5_G1_CONNECTED_NONADJACENT_M5_ADAPTIVE_ROW_REDUCTION_G1_BERNSTEIN"
    assert exceptional["marker"] == "PASS_EXACT_ISO_N5_G1_CONNECTED_NONADJACENT_M5_RMINUS1_G1_BERNSTEIN"
    assert far["marker"] == "PASS_EXACT_ISO_N5_G1_CONNECTED_NONADJACENT_M5_FAR_ALL_R_G1_BERNSTEIN"
    assert c5["marker"] == "PASS_EXACT_ISO_N5_C5_CONNECTED_NONADJACENT_ALL_FOREST_ASSEMBLED_G1_NONADJACENT"
    assert finite["finite_scope"]["orders_A"] == [0, 12]
    assert finite["finite_scope"]["unlabeled_forests"] == 15204
    assert finite["finite_scope"]["connected_nonadjacent_mark_cells"] == 748426
    assert finite["global"]["M5"]["negative"] == 0
    assert finite["global"]["S"]["negative"] == 0

    distance_two = []
    report_hashes = {}
    for sector in ("high", "low"):
        for endpoint in ("ll", "lh", "hh"):
            for order in (None,0,1,2,3,4,5,6):
                label = "large" if order is None else str(order)
                name = (
                    "iso_n5_g1_connected_nonadjacent_m5_adaptive_native_audit_"
                    f"{sector}_two_general_{label}_{endpoint}_g1_bernstein_20260830.json"
                )
                data = load(name)
                expected = {
                    "sector": sector, "distance": "two", "mode": "general",
                    "small_order": order, "endpoint": endpoint,
                }
                assert data["marker"] == BRANCH_MARKER
                assert data["branch"] == expected
                assert data["negative"] == 0
                assert data["dependencies_sha256"] == {
                    "probe_iso_n5_g1_connected_nonadjacent_m5_adaptive_cone_g1_bernstein.py": PINS[
                        "probe_iso_n5_g1_connected_nonadjacent_m5_adaptive_cone_g1_bernstein.py"
                    ],
                    "derive_iso_n5_g1_connected_nonadjacent_m5_adaptive_row_reduction_g1_bernstein.py": PINS[
                        "derive_iso_n5_g1_connected_nonadjacent_m5_adaptive_row_reduction_g1_bernstein.py"
                    ],
                }
                report_hashes[name] = sha256(HERE/name)
                distance_two.append({
                    "branch": expected,
                    "homogeneous_coefficients": data["homogeneous_coefficients"],
                    "minimum": data["minimum"],
                    "zero": data["zero"],
                    "coefficient_stream_sha256": data["coefficient_stream_sha256"],
                    "report_sha256": report_hashes[name],
                })
    assert len(distance_two) == 48
    assert len({json.dumps(row["branch"], sort_keys=True) for row in distance_two}) == 48
    assert all(row["zero"] == 0 for row in distance_two)
    distance_two_coefficients = sum(row["homogeneous_coefficients"] for row in distance_two)
    distance_two_minimum = min(Fraction(row["minimum"]) for row in distance_two)

    far_analytic = far["analytic_certificate"]
    total_coefficients = far_analytic["homogeneous_coefficients"] + distance_two_coefficients
    global_minimum = min(Fraction(far_analytic["global_minimum"]), distance_two_minimum)
    report = {
        "marker": MARKER,
        "theorems": {
            "M5": (
                "For every finite forest G and every nonadjacent u,v in one "
                "connected component, M5=2[z^4w^5]N is nonnegative."
            ),
            "S": (
                "For the same cells, M5+3*C5 is nonnegative, since both M5 and "
                "the independently frozen connected-nonadjacent C5 are nonnegative."
            ),
        },
        "exact_residual": residual["exact_connected_nonadjacent_residual"],
        "geometry_exhaustion": {
            "r_range": "r=mB+mC-n>=-1",
            "r_minus_one": "exact edgeless all-order certificate",
            "distance_at_least_three": "r>=0, all r assembled by the far theorem",
            "distance_two": "r>=0, 48 exact adaptive endpoint cones",
            "gap": "none within connected nonadjacent marks",
        },
        "finite_certificate": {
            "orders_A": finite["finite_scope"]["orders_A"],
            "unlabeled_forests": finite["finite_scope"]["unlabeled_forests"],
            "connected_nonadjacent_cells": finite["finite_scope"]["connected_nonadjacent_mark_cells"],
            "M5_negative": finite["global"]["M5"]["negative"],
            "S_negative": finite["global"]["S"]["negative"],
            "ordered_cell_stream_sha256": finite["ordered_cell_stream_sha256"],
        },
        "analytic_certificate": {
            "far_branch_count": far_analytic["branch_count"],
            "distance_two_branch_count": len(distance_two),
            "total_adaptive_branches": far_analytic["branch_count"] + len(distance_two),
            "total_homogeneous_coefficients": total_coefficients,
            "global_minimum": str(global_minimum),
            "all_coefficients_strictly_positive": True,
            "distance_two_branches": distance_two,
            "far_assembly_sha256": PINS[
                "iso_n5_g1_connected_nonadjacent_m5_far_all_r_assembled_g1_bernstein_20260830.json"
            ],
            "r_minus_one_report_sha256": PINS[
                "iso_n5_g1_connected_nonadjacent_m5_rminus1_exact_g1_bernstein_20260830.json"
            ],
        },
        "C5_payment": {
            "marker": c5["marker"],
            "assembly_report_sha256": PINS[
                "iso_n5_c5_connected_nonadjacent_all_forest_assembled_g1_nonadjacent_20260830.json"
            ],
            "conclusion": "M5>=0 and C5>=0 imply M5+3*C5>=0",
        },
        "dependencies_sha256": PINS,
        "distance_two_report_sha256": report_hashes,
        "scope": (
            "Connected-nonadjacent M5 and M5+3*C5 only. This does not prove the "
            "disconnected-nonadjacent mode, universal g1, g2, all N5, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "total_adaptive_branches": report["analytic_certificate"]["total_adaptive_branches"],
        "total_homogeneous_coefficients": total_coefficients,
        "global_minimum": str(global_minimum),
        "finite_cells": report["finite_certificate"]["connected_nonadjacent_cells"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
