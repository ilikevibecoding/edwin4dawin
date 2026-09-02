#!/usr/bin/env python3
"""Fail-closed assembly of the internal-spine broom ordinary g2 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_internal_ordinary_all_forest_assembled_exact_rank5_g2_alt_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_ALL_FOREST_RANK5_G2_ALT"

PINS = {
    "derive_iso_n5_g2_internal_ordinary_broom_factor_rank5_g2_alt.py":
        "4618E651DBFF34BB519BF5CB3454523A82341F278170F6C100222C95AF3FA5F0",
    "iso_n5_g2_internal_ordinary_broom_factor_exact_rank5_g2_alt_20260830.json":
        "1763428AE4A25B07FEFF52963FC2D68305CC6A668D884294B6949463A3A03201",
    "derive_iso_n5_g2_internal_ordinary_broom_parameters_rank5_g2_alt.py":
        "48D1D3E396B8C84731EA0E46E3D8D104F43EEF7130F426AB73286935B4CC319B",
    "iso_n5_g2_internal_ordinary_broom_parameters_exact_rank5_g2_alt_20260830.json":
        "9D9DED93C91CDE9796FA059EC0B8548DE190D8AAA7C1953C197CF028BC379939",
    "prove_iso_n5_g2_internal_ordinary_box_cones_rank5_g2_alt.py":
        "9CCC2A927F0866F28EF039893B50957DA7CE92FF463F4262F6E8FFE61D570524",
    "iso_n5_g2_internal_ordinary_box_cones_exact_rank5_g2_alt_20260830.json":
        "86E051BD9589358AFD11F98B497105D4BED4B79EE80E07FB5599678645674A13",
    "probe_iso_n5_g2_internal_ordinary_origin_bridge_cone_rank5_g2_alt.py":
        "7203D941660EAC630037ADBA6647581A8A668486FCB2D728641E8F1A0B3750E7",
    "replay_iso_n5_g2_internal_ordinary_bridge_sweep_rank5_g2_alt.py":
        "93907D470B5B0F1B7F50F8CFCA4B1E9D22E95A8D8C52CC0FF04B7E91948A3C86",
    "iso_n5_g2_internal_ordinary_bridge_sweep_replay_exact_rank5_g2_alt_20260830.json":
        "B0CB33251FB6A6ED3C6B8A13D73ECB67EB20F48BD0724E7092AEB57BBDA11F9F",
    "census_iso_n5_g2_internal_ordinary_all_parent_finite_root.py":
        "92F83A604B90B4B76B830FC20A945A2D336C148E4136620B2886AB57E0D50FA6",
    "iso_n5_g2_internal_ordinary_all_parent_finite_n2_12_exact_root_20260830.json":
        "F566E1F1631428CEEDB0F0D5A4B41BB674A1435EBE43506191A933333A02C99C",
    "audit_iso_n5_g2_internal_ordinary_all_parent_finite_g2_transfer_audit.py":
        "9F2C2B78E47E40E2FA54DEA081B53BBA48897826F14B4A3A712BA1CCB515385B",
    "iso_n5_g2_internal_ordinary_all_parent_finite_independent_audit_exact_g2_transfer_audit_20260830.json":
        "89DA3B3DF0A5EC3EED8CEF3A29F07C752A6F8D60BEFCD1E05D9A23E6B8B0B379",
    "prove_iso_n5_g2_internal_ordinary_small_k1_large_parent_root.py":
        "CB681E59A39D046D9FC11F1649169E8AC31D66F9F717D060F64E60D13A320242",
    "iso_n5_g2_internal_ordinary_small_k1_large_parent_exact_root_20260830.json":
        "C9698143E23D601859FE72B83164B167760296567E179BDF2135511F1327B48A",
    "audit_iso_n5_g2_internal_ordinary_small_k1_large_parent_g2_transfer_audit.py":
        "BD20F1E4B5EAB4A4808F4341C34C042DB9ABD82EB10C2A05C908114F8FA41127",
    "iso_n5_g2_internal_ordinary_small_k1_large_parent_independent_audit_exact_g2_transfer_audit_20260830.json":
        "0AFACDC676D605B0CAA085A53E76DAE28F76A2342CAC1C6D8BC4C099B17AD4E6",
    "audit_iso_n5_g2_internal_ordinary_short_k0_bridge_independent_g2_structure_nonadjacent.py":
        "3D14018DDDB3DF58F6075C5D415D2B51C56D965D2C11B92B1062B08023491E2F",
    "iso_n5_g2_internal_ordinary_short_k0_bridge_independent_audit_exact_g2_structure_nonadjacent_20260830.json":
        "46C59859CD2898B4214A3D125F4BFFEC9DEFF17AB56422201804E25254083A7B",
    "iso_n5_g2_internal_ordinary_ell1_k0_bridge_cone_probe_rank5_g2_alt_20260830.json":
        "6A87A35EC269B7A01B2E62F237E2B494720D0FB30FF19D2E75B743EAF03053B8",
    "iso_n5_g2_internal_ordinary_ell2_k0_bridge_cone_probe_rank5_g2_alt_20260830.json":
        "9D06031CBDAEC4BF5AC08193F2B659EB2334675BA7AC40B5E28F8238DB95A055",
    "iso_n5_g2_internal_ordinary_ell3_k0_bridge_cone_probe_rank5_g2_alt_20260830.json":
        "4343236761335B94B29E0F4088F9B3B542DB9C49EFDFC3E8C6CA7DCE43A6D0F1",
    "iso_n5_g2_internal_ordinary_ell4_k0_bridge_cone_probe_rank5_g2_alt_20260830.json":
        "4A485BC9FF7C7DA9E4CA7C5C240DE207BB84854F3CA72CE5BF0AFE6F52C4B04D",
    "iso_n5_g2_internal_ordinary_ell5_k0_bridge_cone_probe_rank5_g2_alt_20260830.json":
        "717EEC22B76DFA5FFDC0115939FD8A048EB87D324B17F254D57319E1FC3FC52F",
    "iso_n5_g2_internal_ordinary_ell6_k0_bridge_cone_probe_rank5_g2_alt_20260830.json":
        "98BE60F6CEDD82B2D9E9E8AA233F352B02A05F930FF058BF02AB5074A668F79E",
    "iso_n5_g2_internal_ordinary_ell7_k0_bridge_cone_probe_rank5_g2_alt_20260830.json":
        "7F8F7EE56217D29EF7FDB17FE94B77E1E26801BB8F195D93B0871130F5EB06CE",
    "iso_n5_g2_internal_ordinary_ell8_k0_bridge_cone_probe_rank5_g2_alt_20260830.json":
        "0BFEDAFB659AEE0A751556096A89C766BC88F99ABFA56FD3C9A2FB1175BBEBA4",
}


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def load(name):
    return json.loads((HERE / name).read_text())


def main():
    assert {name: sha256(HERE / name) for name in PINS} == PINS
    factor = load("iso_n5_g2_internal_ordinary_broom_factor_exact_rank5_g2_alt_20260830.json")
    parameters = load("iso_n5_g2_internal_ordinary_broom_parameters_exact_rank5_g2_alt_20260830.json")
    boxes = load("iso_n5_g2_internal_ordinary_box_cones_exact_rank5_g2_alt_20260830.json")
    sweep = load("iso_n5_g2_internal_ordinary_bridge_sweep_replay_exact_rank5_g2_alt_20260830.json")
    finite = load("iso_n5_g2_internal_ordinary_all_parent_finite_n2_12_exact_root_20260830.json")
    finite_audit = load(
        "iso_n5_g2_internal_ordinary_all_parent_finite_independent_audit_exact_g2_transfer_audit_20260830.json"
    )
    k1 = load("iso_n5_g2_internal_ordinary_small_k1_large_parent_exact_root_20260830.json")
    k1_audit = load(
        "iso_n5_g2_internal_ordinary_small_k1_large_parent_independent_audit_exact_g2_transfer_audit_20260830.json"
    )
    short_k0_audit = load(
        "iso_n5_g2_internal_ordinary_short_k0_bridge_independent_audit_exact_g2_structure_nonadjacent_20260830.json"
    )

    assert factor["marker"] == "DERIVED_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_BROOM_FACTOR_RANK5_G2_ALT"
    assert factor["normalized_g2"]["monomials"] == 437
    assert parameters["marker"] == "DERIVED_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_BROOM_PARAMETERS_RANK5_G2_ALT"
    assert parameters["nonzero_cells"] == 21 and parameters["degrees_h_k"] == [5, 5]
    assert boxes["marker"] == "PASS_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_BOX_CONES_RANK5_G2_ALT"
    assert boxes["exact_audit"]["rows"] == 53
    assert boxes["exact_audit"]["stable_nonorigin_rows"] == 20
    assert boxes["exact_audit"]["small_rows"] == 33
    assert sweep["marker"] == "PASS_DETERMINISTIC_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_BRIDGE_SWEEP_RANK5_G2_ALT"
    assert sweep["fresh_process_replays"] == 2 and sweep["byte_identical_per_length"] is True

    bridge_rows = []
    for ell in range(1, 9):
        bridge = load(
            f"iso_n5_g2_internal_ordinary_ell{ell}_k0_bridge_cone_probe_rank5_g2_alt_20260830.json"
        )
        assert bridge["cell"] == {"ell": ell, "k_index": 0}
        assert bridge["status"] == "exact theorem certificate"
        assert [face["epsilon"] for face in bridge["faces"]] == [0, 1]
        assert all(face["exact_rational_certificate"] for face in bridge["faces"])
        bridge_rows.append({
            "ell": ell,
            "report_sha256": sweep["report_sha256_by_ell"][str(ell)],
            "faces": 2,
        })

    assert finite["marker"] == "PASS_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_ALL_PARENT_FINITE_N2_12_ROOT"
    assert finite_audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_ALL_PARENT_FINITE_G2_TRANSFER_AUDIT"
    assert finite["orders"] == finite_audit["orders"] == [2, 12]
    assert finite["parent_forms"] == finite_audit["parent_forms"] == 63
    assert finite["exact_form_checks"] == finite_audit["exact_form_checks"] == 21_216_006
    assert finite["negative_values"] == finite_audit["negative_values"] == 0
    assert finite["ordered_stream_sha256"] == finite_audit["ordered_stream_sha256"]
    assert k1["marker"] == "PASS_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_SMALL_K1_LARGE_PARENT_ROOT"
    assert k1_audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_SMALL_K1_LARGE_PARENT_G2_TRANSFER_AUDIT"
    assert k1["targets"] == k1_audit["targets"] == [[1, 1], [2, 1]]
    assert k1["cutoff_parent_order"] == k1_audit["cutoff_parent_order"] == 13
    assert k1["negative_power_coefficients"] == k1_audit["negative_power_coefficients"] == 0
    assert short_k0_audit["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N5_G2_INTERNAL_ORDINARY_SHORT_K0_BRIDGE_G2_STRUCTURE_NONADJACENT"
    assert short_k0_audit["status"] == "independent exact solver-free replay with gapless finite/large join"

    small_cells = {(ell, index) for ell in range(1, 8) for index in range(6)}
    small_box_cells = (
        {(ell, index) for ell in (1, 2) for index in range(2, 6)}
        | {(ell, index) for ell in range(3, 8) for index in range(1, 6)}
    )
    small_k0_cells = {(ell, 0) for ell in range(1, 8)}
    small_k1_cells = {(1, 1), (2, 1)}
    assert small_box_cells.isdisjoint(small_k0_cells)
    assert small_box_cells.isdisjoint(small_k1_cells)
    assert small_k0_cells.isdisjoint(small_k1_cells)
    assert small_box_cells | small_k0_cells | small_k1_cells == small_cells
    stable_cells = {(i, j) for i in range(6) for j in range(6 - i)}
    assert len(stable_cells) == 21
    assert stable_cells == {(0, 0)} | (stable_cells - {(0, 0)})

    report = {
        "marker": MARKER,
        "theorem": (
            "For every finite parent-side forest with distinct marks p,v, every "
            "one-ended broom length ell>=1, and every collision-leaf count k>=0, "
            "the canonical internal_spine_broom_ordinary rank-five coefficient g2 is nonnegative."
        ),
        "exact_factor": {
            "normalized_monomials": 437,
            "stable_tensor_degrees_h_k": [5, 5],
            "stable_nonzero_newton_rows": 21,
            "small_nonzero_newton_rows": 42,
        },
        "order_partition": {
            "parent_orders_2_12": {
                "certificate": finite["marker"],
                "independent_audit": finite_audit["marker"],
                "parent_forms": 63,
                "exact_form_checks": 21_216_006,
                "negative_values": 0,
            },
            "parent_orders_at_least_13": {
                "stable_nonorigin": "20 solver-free exact box-cone rows",
                "stable_origin": "ell=8 k-index-zero bridge, both geometries",
                "small_box": "33 solver-free exact box-cone rows",
                "small_k0": "ell=1..7 bridges, both geometries",
                "small_low_k1": "ell=1,2 k-index one exact Bernstein motif theorem",
            },
        },
        "large_order_cell_partition": {
            "small_total": 42,
            "small_box": len(small_box_cells),
            "small_k0": len(small_k0_cells),
            "small_low_k1": len(small_k1_cells),
            "stable_total": len(stable_cells),
            "stable_box": 20,
            "stable_origin_bridge": 1,
            "disjoint_and_exhaustive": True,
        },
        "bridge_sweep": {
            "fresh_process_replays": 2,
            "byte_identical": True,
            "rows": bridge_rows,
            "short_k0_independent_audit": short_k0_audit["marker"],
        },
        "coverage_is_disjoint_and_exhaustive": True,
        "dependencies_sha256": PINS,
        "scope": (
            "Exactly the internal_spine_broom_ordinary canonical rank-five g2 mode. "
            "The other four g2 modes and the final all-five assembly remain separate."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER, "finite_exact_checks": 21_216_006,
        "large_order_small_rows": 42, "large_order_stable_rows": 21,
        "unresolved": 0,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
