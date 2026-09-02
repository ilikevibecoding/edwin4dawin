#!/usr/bin/env python3
"""Fail-closed assembly of the complete cubic e=3 Delta0/Delta1 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
EXPECTED = {
    "rank8_delta01_e3_cubic_skeleton_n27_n36_exact_agent_20260822.json": "81DF2C8EA2B8BD8EEED04F1C4C25A8101174B67DA44D255D2C6F9DB5632527D8",
    "rank8_delta01_e3_cubic_skeleton_n27_n36_independent_audit_agent_20260822.json": "42DDF19A1AFB20C46C59B126F7D5D3614060F11AEB04C77E4E22D4CDB9CF03E4",
    "rank8_delta01_e3_cubic_short_boundary_partition_exact_agent_20260822.json": "2D9CA9AC3FD68B38939A8B92434C56CAB9C6502AA157926DF9016A5794F237E2",
    "rank8_delta01_e3_cubic_boundary_universe_audit_agent_20260823.json": "480650229492873FAFD07B480E867C4EC0C00A09BDCF883BEC37DA60D725FD19",
    "rank8_delta01_e3_cubic_newton_batch_reduction_exact_agent_20260823.json": "E1500D4DADC698D9125F51E780F91D5FF2621752FC984A9A90DD1F0DB90B2076",
    "rank8_delta01_e3_cubic_all_short_complete_exact_agent_20260823.json": "9BD789D715945D32D300D83815B9D6CDF0466E4F4181E3931F87DB349F75CB65",
    "rank8_delta01_e3_cubic_stable_34_to_7_reduction_exact_agent_20260822.json": "223675665029E5F5482D1855D85B7A04DBC376C587E62C457145C10777E46475",
    "rank8_delta01_e3_cubic_stable_edge_extension_exact_agent_20260822.json": "49219FCD8766B4E584FEAC0281B491A0F0B70C5B85E4977BC2E1BB722A3CD7F7",
    "rank8_delta01_e3_cubic_stable_edge_extension_independent_audit_agent_20260822.json": "C325B2885173A3FFDB0F53E8259DA2E4825F65A4E232E358472BCC26B54104B0",
    "rank8_delta03_e3_cubic_all_long_bases_exact_root_20260823.json": "DA06DECCE08E44B2DF815ABF363909BABDCDC9366086F5AF12BDAE1B9580B4BE",
    "rank8_delta03_e3_cubic_all_long_bases_independent_audit_root_20260823.json": "16423B6B595EA4EA04E3E9F5DA24080295150A22CBC656EC6438C6D5B69E2A3D",
    "rank8_delta01_e3_cubic_mixed_outer_branch_complete_exact_agent_20260823.json": "F5057CDF3ADBD94FF6D0811B612663CC8E38239F7DC9BCDB9ED573D7446AD01F",
    "rank8_delta01_e3_cubic_mixed_middle_branch_complete_exact_agent_20260823.json": "0BC397BE333C1749D874F0E87D7791BB79A44A1ACC325F00DB00E05635F8B6E2",
    "rank8_delta01_e3_cubic_mixed_outer_leaf_complete_exact_agent_20260823.json": "37DEDB237EDF4D993E9BFAE0B79E34D274C11E687E6A26E7472F55B0538A6E8B",
    "rank8_delta01_e3_cubic_mixed_middle_leaf_complete_exact_agent_20260823.json": "2CCA38325B6C63F4482D1AA80458E271DD0C8B631FE6334F7A5C74C4A95AF69D",
    "rank8_delta01_e3_cubic_mixed_outer_pendant_internal_complete_exact_agent_20260823.json": "540435BF0356C131E0E27F574E920BC9BE7883DEC025D7D9E2A112899CF818D8",
    "rank8_delta01_e3_cubic_mixed_middle_pendant_internal_complete_exact_agent_20260823.json": "27A33445FB34417A8561A632D5F76AA04DEB7946A0433E8667EACEEC3A227C12",
    "rank8_delta01_e3_cubic_mixed_spine_internal_complete_exact_agent_20260823.json": "0EB1320B4DC74F02200A307C4E4C73AB40191A0B6D18B3541FD8E6239703A875",
}

MIXED_SEALS = {
    "outer_branch": ("rank8_delta01_e3_cubic_mixed_outer_branch_complete_exact_agent_20260823.json", 592_271),
    "middle_branch": ("rank8_delta01_e3_cubic_mixed_middle_branch_complete_exact_agent_20260823.json", 296_693),
    "outer_leaf": ("rank8_delta01_e3_cubic_mixed_outer_leaf_complete_exact_agent_20260823.json", 1_184_543),
    "middle_leaf": ("rank8_delta01_e3_cubic_mixed_middle_leaf_complete_exact_agent_20260823.json", 329_795),
    "outer_pendant_internal": ("rank8_delta01_e3_cubic_mixed_outer_pendant_internal_complete_exact_agent_20260823.json", 10_365_407),
    "middle_pendant_internal": ("rank8_delta01_e3_cubic_mixed_middle_pendant_internal_complete_exact_agent_20260823.json", 2_893_391),
    "spine_internal": ("rank8_delta01_e3_cubic_mixed_spine_internal_complete_exact_agent_20260823.json", 5_236_991),
}

STATUSES = {
    "rank8_delta01_e3_cubic_skeleton_n27_n36_exact_agent_20260822.json": "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_SKELETON_ALL_ROOTS_N27_N36",
    "rank8_delta01_e3_cubic_skeleton_n27_n36_independent_audit_agent_20260822.json": "PASS_INDEPENDENT_RANK8_DELTA01_E3_CUBIC_SKELETON_N27_N36_AUDIT",
    "rank8_delta01_e3_cubic_short_boundary_partition_exact_agent_20260822.json": "PASS_EXACT_NO_GAP_PARTITION_REMAINING_OBLIGATIONS_EXPLICIT",
    "rank8_delta01_e3_cubic_boundary_universe_audit_agent_20260823.json": "PASS_EXACT_DETERMINISTIC_NO_GAP_NO_DUPLICATE_WORK_UNIVERSES",
    "rank8_delta01_e3_cubic_newton_batch_reduction_exact_agent_20260823.json": "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_MIXED_NEWTON_REDUCTION",
    "rank8_delta01_e3_cubic_all_short_complete_exact_agent_20260823.json": "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_ALL_SHORT_COMPLETE_N27_PLUS",
    "rank8_delta01_e3_cubic_stable_34_to_7_reduction_exact_agent_20260822.json": "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_STABLE_34_ORBITS_TO_7_CELLS",
    "rank8_delta01_e3_cubic_stable_edge_extension_exact_agent_20260822.json": "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_STABLE_EDGE_EXTENSION_ALL_ROOT_ORBITS",
    "rank8_delta01_e3_cubic_stable_edge_extension_independent_audit_agent_20260822.json": "PASS_INDEPENDENT_RANK8_DELTA01_E3_CUBIC_STABLE_EDGE_EXTENSION_AUDIT",
    "rank8_delta03_e3_cubic_all_long_bases_exact_root_20260823.json": "PASS_EXACT_RANK8_DELTA03_E3_CUBIC_ALL_LONG_BASES",
    "rank8_delta03_e3_cubic_all_long_bases_independent_audit_root_20260823.json": "PASS_INDEPENDENT_RANK8_DELTA03_E3_CUBIC_ALL_LONG_BASE_AUDIT",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    for name, status in STATUSES.items():
        assert load(name)["status"] == status

    partition = load("rank8_delta01_e3_cubic_short_boundary_partition_exact_agent_20260822.json")
    totals = partition["totals"]
    assert totals["root_location_orbits"] == 7
    assert totals["coordinate_patterns"] == 33_880_500
    assert totals["sealed_all_long_patterns"] == 7
    assert totals["mixed_long_short_patterns"] == 20_899_091
    assert totals["all_short_literal_patterns"] == 12_981_402
    assert totals["all_short_patterns_in_uncovered_n37_plus_band"] == 4_670_546
    assert totals["coordinate_patterns"] == (
        totals["sealed_all_long_patterns"]
        + totals["mixed_long_short_patterns"]
        + totals["all_short_literal_patterns"]
    )
    partition_rows = {row["root_location_orbit"]: row for row in partition["root_location_partitions"]}
    assert set(partition_rows) == set(MIXED_SEALS)

    mixed_rows = []
    mixed_sum = 0
    for root, (seal_name, expected_count) in MIXED_SEALS.items():
        seal = load(seal_name)
        assert seal["scope"]["root_orbit"] == root
        exhaustive = seal["exhaustive_certificate"]
        audit = seal["independent_audit"]
        assert exhaustive["quotient_rays"] == expected_count
        assert exhaustive["negative_Delta0_Newton_cells"] == 0
        assert exhaustive["negative_Delta1_Newton_cells"] == 0
        assert partition_rows[root]["mixed_long_short_patterns"] == expected_count
        assert sha256(ROOT / exhaustive["path"]) == exhaustive["sha256"]
        assert sha256(ROOT / audit["path"]) == audit["sha256"]
        raw = load(exhaustive["path"])
        independent = load(audit["path"])
        assert raw["raw_result"]["processed"] == raw["raw_result"]["universe"] == expected_count
        assert raw["raw_result"]["negative0"] == raw["raw_result"]["negative1"] == 0
        assert independent["status"] in {
            "PASS_INDEPENDENT_LITERAL_TREE_NEWTON_AND_I256_UNIT_AUDIT",
            "PASS_INDEPENDENT_LITERAL_TREE_NEWTON_AND_I256_THREADED_UNIT_AUDIT",
        }
        assert independent["exhaustive_universe"] == expected_count
        mixed_sum += expected_count
        mixed_rows.append({
            "root_location_orbit": root,
            "quotient_rays": expected_count,
            "seal": seal_name,
            "seal_sha256": EXPECTED[seal_name],
            "exhaustive_report_sha256": exhaustive["sha256"],
            "independent_audit_sha256": audit["sha256"],
        })
    assert mixed_sum == totals["mixed_long_short_patterns"] == 20_899_091

    bases = load("rank8_delta03_e3_cubic_all_long_bases_exact_root_20260823.json")
    base_audit = load("rank8_delta03_e3_cubic_all_long_bases_independent_audit_root_20260823.json")
    assert bases["coverage"] == {
        "root_location_orbits": 7,
        "ranks_per_orbit": 4,
        "strictly_positive_values": 28,
        "orders": [61, 62, 69],
    }
    assert {row["root_location_orbit"] for row in bases["base_cells"]} == set(MIXED_SEALS)
    for row in bases["base_cells"]:
        assert int(row["Delta0"]) > 0 and int(row["Delta1"]) > 0
    assert base_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E3_CUBIC_ALL_LONG_BASE_AUDIT"

    finite = load("rank8_delta01_e3_cubic_skeleton_n27_n36_exact_agent_20260822.json")
    finite_audit = load("rank8_delta01_e3_cubic_skeleton_n27_n36_independent_audit_agent_20260822.json")
    all_short = load("rank8_delta01_e3_cubic_all_short_complete_exact_agent_20260823.json")
    assert finite["status"] == STATUSES["rank8_delta01_e3_cubic_skeleton_n27_n36_exact_agent_20260822.json"]
    assert finite_audit["status"] == STATUSES["rank8_delta01_e3_cubic_skeleton_n27_n36_independent_audit_agent_20260822.json"]
    assert all_short["status"] == STATUSES["rank8_delta01_e3_cubic_all_short_complete_exact_agent_20260823.json"]

    payload = {
        "schema": "rank8_delta01_e3_cubic_complete_exact_agent_v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_COMPLETE_N27_PLUS",
        "theorem": "For every rooted subdivision A of the five-leaf cubic skeleton with exactly three degree-three vertices and |A|>=27, Delta0(A)>0 and Delta1(A)>0.",
        "exact_order_partition": [
            {
                "orders": "27<=n<=36",
                "roots": "all literal roots",
                "certificate": "exact finite all-root census plus independent audit",
            },
            {
                "orders": "n>=37, all-short coordinates",
                "roots": "all seven root-location orbits",
                "certificate": "4,670,546 exact finite quotient cells with independent audits",
            },
            {
                "orders": "n>=37, mixed short/long coordinates",
                "roots": "all seven root-location orbits",
                "certificate": "20,899,091 exact degree-29 Newton rays; every ray offset S>=0; independent literal audits",
            },
            {
                "orders": "all-long stable region",
                "roots": "all seven root-location orbits",
                "certificate": "seven strictly positive audited S=0 bases plus positive audited edge-extension increments",
            },
        ],
        "partition_accounting": {
            "coordinate_patterns": 33_880_500,
            "all_long_patterns": 7,
            "mixed_quotient_rays": mixed_sum,
            "all_short_literal_patterns": 12_981_402,
            "all_short_uncovered_n37_plus_cells": 4_670_546,
            "root_location_orbits": 7,
            "no_gaps_or_duplicates": True,
        },
        "mixed_orbit_certificates": mixed_rows,
        "all_long_base_gate": {
            "positive_Delta0_Delta1_bases": 14,
            "base_orders": [61, 62, 69],
            "base_report_sha256": EXPECTED["rank8_delta03_e3_cubic_all_long_bases_exact_root_20260823.json"],
            "base_audit_sha256": EXPECTED["rank8_delta03_e3_cubic_all_long_bases_independent_audit_root_20260823.json"],
            "positive_increment_report_sha256": EXPECTED["rank8_delta01_e3_cubic_stable_edge_extension_exact_agent_20260822.json"],
            "positive_increment_audit_sha256": EXPECTED["rank8_delta01_e3_cubic_stable_edge_extension_independent_audit_agent_20260822.json"],
        },
        "connected_ledger_effect": {
            "closed": "the cubic e=3 skeleton is removed from the connected Delta0/Delta1 remainder for every n>=27",
            "remaining_Delta0_Delta1": "degree-surplus e=2 double-claw short-boundary cells at n>=31 outside the finite/thin/all-long closures, and all e>=4 families at n>=27",
            "remaining_Delta2": "degree-surplus e=2 residual short-boundary/non-pendant cells, including pendant bridges 2..7 and bridge one with a far arm <=6, plus all e>=3 families at n>=27",
            "remaining_Delta3": "degree-surplus e=2 short-boundary cells at n>=31 outside the finite/thin/all-long closures, plus all e>=3 families at n>=27",
        },
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This closes only Delta0/Delta1 for the cubic e=3 skeleton. It does not close the broader connected remainder, forest Q8, rank-eight PGC, or Erdos Problem 993.",
    }
    output = ROOT / "rank8_delta01_e3_cubic_complete_exact_agent_20260823.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(output))


if __name__ == "__main__":
    main()

