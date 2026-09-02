#!/usr/bin/env python3
"""Fail-closed no-gap assembly of cubic e=3 Delta2/Delta3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta23_e3_cubic_complete_exact_root_20260823.json"
ORBIT_SPECS = {
    "outer_branch": (
        592_271,
        "rank8_delta23_e3_cubic_mixed_outer_branch_0_592271_exact_root_20260823.json",
        "2B7DB6DF251F5FCFEA2D1425520C5B1B1836DA9DA5302DDFF265B07443BF1020",
        "rank8_delta23_e3_cubic_mixed_outer_branch_independent_audit_root_20260823.json",
        "50C401ADC892C5A3138E0A67FCA87D9D5FB439D276D84DBAE8169337F5B730A2",
    ),
    "middle_branch": (
        296_693,
        "rank8_delta23_e3_cubic_mixed_middle_branch_0_296693_exact_root_20260823.json",
        "50CB1F80E6CED2F1BAA3ECBBBC25B286012336081627B9118C2BDEF46A7E3D04",
        "rank8_delta23_e3_cubic_mixed_middle_branch_independent_audit_root_20260823.json",
        "1A3523030D559F4C10C8C54812EA4ED698E1B6D3C3F73FE2F6B9915DA818FF1A",
    ),
    "outer_leaf": (
        1_184_543,
        "rank8_delta23_e3_cubic_mixed_outer_leaf_0_1184543_exact_root_20260823.json",
        "FB57DC1197D7BF3C1F055C8DF1B9138D5C93648678149198B8E00D2C9680298F",
        "rank8_delta23_e3_cubic_mixed_outer_leaf_independent_audit_root_20260823.json",
        "6427D60586EB63F87A071ED5F506CCE46596FE50368C78BFA4261764C7893B52",
    ),
    "middle_leaf": (
        329_795,
        "rank8_delta23_e3_cubic_mixed_middle_leaf_0_329795_exact_root_20260823.json",
        "41AB4364AF9453D4AEA235C25E0377946A63284A6106FA4268F61CB000124014",
        "rank8_delta23_e3_cubic_mixed_middle_leaf_independent_audit_root_20260823.json",
        "56342A399894ED4979564DCF55C594933886D4816869E8F6F544CCADBE9A533B",
    ),
    "outer_pendant_internal": (
        10_365_407,
        "rank8_delta23_e3_cubic_mixed_outer_pendant_internal_0_10365407_exact_root_20260823.json",
        "882826425DF23427564721409C199425736837ED5B6E958DF56F3275F0FBBD37",
        "rank8_delta23_e3_cubic_mixed_outer_pendant_internal_independent_audit_root_20260823.json",
        "A91B52D89924E3DF8D99E4E8AE9C3CDC19CD89B8F0A55D606CDFFF92E06FD404",
    ),
    "middle_pendant_internal": (
        2_893_391,
        "rank8_delta23_e3_cubic_mixed_middle_pendant_internal_0_2893391_exact_root_20260823.json",
        "7280A005A09EE6DEC86CD689B1F9BDD954674F0BD3D63A502A263C631D9A0C28",
        "rank8_delta23_e3_cubic_mixed_middle_pendant_internal_independent_audit_root_20260823.json",
        "14A25374206D462B102463F7FA2A1D0C9FC7E3CFDA1C447ED5CA66E203AD170D",
    ),
    "spine_internal": (
        5_236_991,
        "rank8_delta23_e3_cubic_mixed_spine_internal_0_5236991_exact_root_20260823.json",
        "4C7E69DC901C1B74442DCF88741F507D46ACAC65FE427FAE803AE70C0CD2D1CF",
        "rank8_delta23_e3_cubic_mixed_spine_internal_independent_audit_root_20260823.json",
        "2275952DE828CF3632DF5C6FB3678FA7D8E1EB456BE325ADAC85B0859023D76B",
    ),
}
EXPECTED = {
    "rank8_delta01_e3_cubic_short_boundary_partition_exact_agent_20260822.json":
        "2D9CA9AC3FD68B38939A8B92434C56CAB9C6502AA157926DF9016A5794F237E2",
    "rank8_delta01_e3_cubic_boundary_universe_audit_agent_20260823.json":
        "480650229492873FAFD07B480E867C4EC0C00A09BDCF883BEC37DA60D725FD19",
    "rank8_delta23_e3_cubic_skeleton_n27_n36_exact_root_20260823.json":
        "5E1B7899CC32F789319DB643932FF23FF3758BD5AEE54C452AA7882518DC6E6D",
    "rank8_delta23_e3_cubic_skeleton_n27_n36_independent_audit_root_20260823.json":
        "466F76F7BBD2665B0A6512AEA332F76AE8F8809300B0FD90654E4B61E8BA6AF3",
    "rank8_delta23_e3_cubic_all_short_complete_exact_root_20260823.json":
        "49C5B46125A078B97E2443FF5C204DE64A9B24389261359D43D00753FF00CA6D",
    "rank8_delta23_e3_cubic_all_short_complete_independent_audit_root_20260823.json":
        "D9BFA35B9840DB803E342BBDE97417F72BAFF45135C6347C8E7994713FFDE11C",
    "rank8_delta23_e3_cubic_stable_edge_extension_exact_root_20260823.json":
        "A9C34636FE0EC6DDCD8F9A4A251BFCC0A349F1D568105B83667FC3E1641FB2F6",
    "rank8_delta23_e3_cubic_stable_edge_extension_independent_audit_root_20260823.json":
        "BB33DEF8B45970C9050263C9E006DFE7A3BFBF883BC591964801B4C843B5FA5B",
    "rank8_delta03_e3_cubic_all_long_bases_exact_root_20260823.json":
        "DA06DECCE08E44B2DF815ABF363909BABDCDC9366086F5AF12BDAE1B9580B4BE",
    "rank8_delta03_e3_cubic_all_long_bases_independent_audit_root_20260823.json":
        "16423B6B595EA4EA04E3E9F5DA24080295150A22CBC656EC6438C6D5B69E2A3D",
    "rank8_delta23_e3_cubic_mixed_i256_threaded_serial_equivalence_root_20260823.json":
        "D3B17DC75D35D5435A69684C27E5D21557A95C3BFDF44713DFDA5F1F86A28996",
}
for _, primary, primary_hash, audit, audit_hash in ORBIT_SPECS.values():
    EXPECTED[primary] = primary_hash
    EXPECTED[audit] = audit_hash


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    assert all("TO_FILL" not in value for value in EXPECTED.values())
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    partition = load("rank8_delta01_e3_cubic_short_boundary_partition_exact_agent_20260822.json")
    universe = load("rank8_delta01_e3_cubic_boundary_universe_audit_agent_20260823.json")
    finite = load("rank8_delta23_e3_cubic_skeleton_n27_n36_exact_root_20260823.json")
    finite_audit = load("rank8_delta23_e3_cubic_skeleton_n27_n36_independent_audit_root_20260823.json")
    short = load("rank8_delta23_e3_cubic_all_short_complete_exact_root_20260823.json")
    short_audit = load("rank8_delta23_e3_cubic_all_short_complete_independent_audit_root_20260823.json")
    stable = load("rank8_delta23_e3_cubic_stable_edge_extension_exact_root_20260823.json")
    stable_audit = load("rank8_delta23_e3_cubic_stable_edge_extension_independent_audit_root_20260823.json")
    bases = load("rank8_delta03_e3_cubic_all_long_bases_exact_root_20260823.json")
    bases_audit = load("rank8_delta03_e3_cubic_all_long_bases_independent_audit_root_20260823.json")
    equivalence = load("rank8_delta23_e3_cubic_mixed_i256_threaded_serial_equivalence_root_20260823.json")

    assert partition["status"] == "PASS_EXACT_NO_GAP_PARTITION_REMAINING_OBLIGATIONS_EXPLICIT"
    assert universe["status"] == "PASS_EXACT_DETERMINISTIC_NO_GAP_NO_DUPLICATE_WORK_UNIVERSES"
    assert finite["status"] == "PASS_EXACT_RANK8_DELTA23_E3_CUBIC_SKELETON_ALL_ROOTS_N27_N36"
    assert finite_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA23_E3_CUBIC_SKELETON_N27_N36_AUDIT"
    assert [row["order"] for row in finite["orders"]] == list(range(27, 37))
    assert all(row["negative2"] == row["negative3"] == 0 for row in finite["orders"])
    assert short["status"] == "PASS_EXACT_RANK8_DELTA23_E3_CUBIC_ALL_SHORT_COMPLETE_N37_PLUS"
    assert short_audit["status"] == "PASS_INDEPENDENT_DELTA23_E3_CUBIC_ALL_SHORT_COMPLETE_AUDIT"
    assert short["coverage"] == {
        "root_orbits": 7,
        "patterns": 4_670_546,
        "negative_or_zero_Delta2": 0,
        "negative_or_zero_Delta3": 0,
    }
    assert stable["status"] == "PASS_EXACT_RANK8_DELTA23_E3_CUBIC_STABLE_EDGE_EXTENSION_ALL_ROOT_ORBITS"
    assert stable_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA23_E3_CUBIC_STABLE_EDGE_EXTENSION_AUDIT"
    assert stable["totals"]["root_location_orbits"] == 7
    assert stable["totals"]["extension_edge_orbits"] == 34
    assert stable["totals"]["negative_coefficients"] == 0
    assert stable["totals"]["zero_coefficients"] == 0
    assert bases["status"] == "PASS_EXACT_RANK8_DELTA03_E3_CUBIC_ALL_LONG_BASES"
    assert bases_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E3_CUBIC_ALL_LONG_BASE_AUDIT"
    assert all(int(row[f"Delta{rank}"]) > 0 for row in bases["base_cells"] for rank in (2, 3))
    assert equivalence["status"] == "PASS_EXACT_DELTA23_I256_THREADED_SERIAL_EQUIVALENCE"

    partition_rows = {row["root_location_orbit"]: row for row in partition["root_location_partitions"]}
    universe_rows = {
        row["root_location_orbit"]: row
        for row in universe["universes"] if row["mode"] == "mixed"
    }
    assert set(partition_rows) == set(universe_rows) == set(ORBIT_SPECS)

    mixed_rows = []
    for label, (count, primary_name, _, audit_name, _) in ORBIT_SPECS.items():
        primary = load(primary_name)
        audit = load(audit_name)
        assert primary["status"] == "PASS_EXACT_RANK8_DELTA23_E3_CUBIC_MIXED_NEWTON_CHUNK"
        assert primary["scope"] == {
            "root_location_orbit": label,
            "start": 0,
            "stop": count,
            "processed": count,
            "full_orbit_universe": count,
        }
        acceptance = primary["acceptance"]
        assert acceptance["Delta2_negative_or_failed_rays"] == 0
        assert acceptance["Delta3_negative_or_failed_rays"] == 0
        assert all(
            int(acceptance[key]) > 0
            for key in (
                "minimum_Delta2_base", "minimum_Delta3_base",
                "minimum_Delta2_first_difference", "minimum_Delta3_first_difference",
            )
        )
        assert primary["exact_route"]["degree_bound"] == 29
        assert primary["exact_route"]["samples_per_ray"] == 30
        assert audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA23_E3_CUBIC_MIXED_ORBIT_AUDIT"
        assert audit["root_location_orbit"] == label
        assert audit["exhaustive_report"] == primary_name
        assert audit["exhaustive_report_sha256"] == actual[primary_name]
        assert audit["coverage"]["exhaustive_rays"] == count
        assert partition_rows[label]["mixed_long_short_patterns"] == count
        assert universe_rows[label]["cells"] == count
        mixed_rows.append({
            "root_location_orbit": label,
            "quotient_rays": count,
            "minimum_Delta2_base": acceptance["minimum_Delta2_base"],
            "minimum_Delta3_base": acceptance["minimum_Delta3_base"],
            "minimum_Delta2_first_difference": acceptance["minimum_Delta2_first_difference"],
            "minimum_Delta3_first_difference": acceptance["minimum_Delta3_first_difference"],
            "exhaustive_report_sha256": actual[primary_name],
            "independent_audit_sha256": actual[audit_name],
        })

    assert sum(row["quotient_rays"] for row in mixed_rows) == 20_899_091
    assert partition["totals"]["mixed_long_short_patterns"] == 20_899_091
    assert partition["totals"]["all_short_patterns_in_uncovered_n37_plus_band"] == 4_670_546
    assert partition["totals"]["sealed_all_long_patterns"] == 7
    assert universe["totals"]["mixed"] == 20_899_091
    assert universe["totals"]["all_short_n37_plus"] == 4_670_546

    payload = {
        "schema": "rank8-delta23-e3-cubic-complete-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA23_E3_CUBIC_COMPLETE_N27_PLUS",
        "theorem": (
            "For every root of every subdivision of the five-leaf cubic e=3 "
            "skeleton of order n>=27, Delta2>0 and Delta3>0."
        ),
        "no_gap_partition": [
            "Orders 27 through 36 are covered by the literal all-root census.",
            "For n>=37, every coordinate pattern is uniquely all-short, mixed, or all-long.",
            "All-short contributes exactly 4,670,546 finite rooted patterns.",
            "Mixed contributes exactly 20,899,091 quotient rays, each proved for every S>=0 by 30 exact Newton values.",
            "All-long has seven positive S=0 bases and 34 strictly positive edge-extension orbits.",
        ],
        "sectors": {
            "finite_orders_27_36": {
                "orders": 10,
                "canonical_cores": finite["totals"]["canonical_cores"],
                "rooted_rows": finite["totals"]["rooted_rows"],
                "negative_Delta2": 0,
                "negative_Delta3": 0,
            },
            "all_short_n37_plus": short["coverage"],
            "mixed_n37_plus": {
                "root_location_orbits": 7,
                "quotient_rays": 20_899_091,
                "rows": mixed_rows,
            },
            "all_long": {
                "base_cells": 7,
                "positive_base_values_for_Delta2_Delta3": 14,
                "extension_edge_orbits": 34,
                "positive_increment_polynomials": 14,
            },
        },
        "partition_totals": {
            "root_location_orbits": 7,
            "all_short_n37_plus": 4_670_546,
            "mixed_quotient_rays": 20_899_091,
            "all_long_base_patterns": 7,
        },
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This closes only Delta2/Delta3 for the cubic e=3 skeleton. The quartic-star "
            "e=3 package, Delta0/Delta1 assembly, e=2 short boundaries, e>=4 cores, "
            "forest transfer, and Problem 993 remain separately gated."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
