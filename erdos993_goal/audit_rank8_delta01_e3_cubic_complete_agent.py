#!/usr/bin/env python3
"""Independent coverage and dependency audit of the cubic e=3 assembly."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ASSEMBLY = "rank8_delta01_e3_cubic_complete_exact_agent_20260823.json"
EXPECTED_ASSEMBLY_SHA256 = "3A51CDECE37E0F74DC147F034B6EFCBE3BA72907E1655DA6FA8D6C122F54C339"
EXPECTED_ASSEMBLER_SHA256 = "F7ABE3D96F98CE26AF7859FBE2CD4E37B700B30A9FA9A42C5E2E5DEEAD6EB159"
EXPECTED_CRITICAL = {
    "rank8_delta01_e3_cubic_short_boundary_partition_exact_agent_20260822.json": "2D9CA9AC3FD68B38939A8B92434C56CAB9C6502AA157926DF9016A5794F237E2",
    "rank8_delta01_e3_cubic_boundary_universe_audit_agent_20260823.json": "480650229492873FAFD07B480E867C4EC0C00A09BDCF883BEC37DA60D725FD19",
    "rank8_delta01_e3_cubic_all_short_complete_exact_agent_20260823.json": "9BD789D715945D32D300D83815B9D6CDF0466E4F4181E3931F87DB349F75CB65",
    "rank8_delta01_e3_cubic_newton_batch_reduction_exact_agent_20260823.json": "E1500D4DADC698D9125F51E780F91D5FF2621752FC984A9A90DD1F0DB90B2076",
    "rank8_delta01_e3_cubic_stable_edge_extension_exact_agent_20260822.json": "49219FCD8766B4E584FEAC0281B491A0F0B70C5B85E4977BC2E1BB722A3CD7F7",
    "rank8_delta01_e3_cubic_stable_edge_extension_independent_audit_agent_20260822.json": "C325B2885173A3FFDB0F53E8259DA2E4825F65A4E232E358472BCC26B54104B0",
    "rank8_delta03_e3_cubic_all_long_bases_exact_root_20260823.json": "DA06DECCE08E44B2DF815ABF363909BABDCDC9366086F5AF12BDAE1B9580B4BE",
    "rank8_delta03_e3_cubic_all_long_bases_independent_audit_root_20260823.json": "16423B6B595EA4EA04E3E9F5DA24080295150A22CBC656EC6438C6D5B69E2A3D",
    "rank8_delta01_e3_cubic_skeleton_n27_n36_exact_agent_20260822.json": "81DF2C8EA2B8BD8EEED04F1C4C25A8101174B67DA44D255D2C6F9DB5632527D8",
    "rank8_delta01_e3_cubic_skeleton_n27_n36_independent_audit_agent_20260822.json": "42DDF19A1AFB20C46C59B126F7D5D3614060F11AEB04C77E4E22D4CDB9CF03E4",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    assert sha256(ROOT / ASSEMBLY) == EXPECTED_ASSEMBLY_SHA256
    assert sha256(ROOT / "assemble_rank8_delta01_e3_cubic_complete_agent.py") == EXPECTED_ASSEMBLER_SHA256
    for name, expected in EXPECTED_CRITICAL.items():
        assert sha256(ROOT / name) == expected

    assembly = load(ASSEMBLY)
    assert assembly["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_COMPLETE_N27_PLUS"
    for name, expected in assembly["immutable_inputs"].items():
        assert sha256(ROOT / name) == expected

    partition = load("rank8_delta01_e3_cubic_short_boundary_partition_exact_agent_20260822.json")
    roots = {row["root_location_orbit"]: row for row in partition["root_location_partitions"]}
    assert len(roots) == 7
    per_root_trichotomy = []
    for root, row in roots.items():
        assert row["coordinate_patterns"] == (
            row["sealed_all_long_patterns"]
            + row["mixed_long_short_patterns"]
            + row["all_short_literal_patterns"]
        )
        assert row["sealed_all_long_patterns"] == 1
        per_root_trichotomy.append({
            "root_location_orbit": root,
            "coordinate_patterns": row["coordinate_patterns"],
            "all_long": row["sealed_all_long_patterns"],
            "mixed": row["mixed_long_short_patterns"],
            "all_short": row["all_short_literal_patterns"],
            "all_short_n37_plus": row["all_short_patterns_in_uncovered_n37_plus_band"],
        })

    totals = partition["totals"]
    assert sum(row["coordinate_patterns"] for row in roots.values()) == totals["coordinate_patterns"] == 33_880_500
    assert sum(row["mixed_long_short_patterns"] for row in roots.values()) == totals["mixed_long_short_patterns"] == 20_899_091
    assert sum(row["all_short_literal_patterns"] for row in roots.values()) == totals["all_short_literal_patterns"] == 12_981_402
    assert sum(row["all_short_patterns_in_uncovered_n37_plus_band"] for row in roots.values()) == totals["all_short_patterns_in_uncovered_n37_plus_band"] == 4_670_546

    all_short = load("rank8_delta01_e3_cubic_all_short_complete_exact_agent_20260823.json")
    assert all_short["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_ALL_SHORT_COMPLETE_N27_PLUS"
    short_rows = {row["root_location_orbit"]: row for row in all_short["coverage"]["root_location_orbits"]}
    assert set(short_rows) == set(roots)
    for root in roots:
        assert short_rows[root]["cells"] == roots[root]["all_short_patterns_in_uncovered_n37_plus_band"]
        assert int(short_rows[root]["minimum0"]) > 0
        assert int(short_rows[root]["minimum1"]) > 0

    assembly_mixed = {row["root_location_orbit"]: row for row in assembly["mixed_orbit_certificates"]}
    assert set(assembly_mixed) == set(roots)
    mixed_sum = 0
    recursive_rows = []
    for root in sorted(roots):
        row = assembly_mixed[root]
        assert row["quotient_rays"] == roots[root]["mixed_long_short_patterns"]
        seal = load(row["seal"])
        assert sha256(ROOT / row["seal"]) == row["seal_sha256"]
        exhaustive_meta = seal["exhaustive_certificate"]
        audit_meta = seal["independent_audit"]
        assert sha256(ROOT / exhaustive_meta["path"]) == exhaustive_meta["sha256"] == row["exhaustive_report_sha256"]
        assert sha256(ROOT / audit_meta["path"]) == audit_meta["sha256"] == row["independent_audit_sha256"]
        exhaustive = load(exhaustive_meta["path"])
        audit = load(audit_meta["path"])
        exact_count = roots[root]["mixed_long_short_patterns"]
        assert exhaustive["raw_result"]["processed"] == exhaustive["raw_result"]["universe"] == exact_count
        assert exhaustive["raw_result"]["negative0"] == exhaustive["raw_result"]["negative1"] == 0
        assert int(exhaustive["raw_result"]["minimum_base0"]) > 0
        assert int(exhaustive["raw_result"]["minimum_base1"]) > 0
        assert int(exhaustive["raw_result"]["minimum_first0"]) > 0
        assert int(exhaustive["raw_result"]["minimum_first1"]) > 0
        assert audit["exhaustive_universe"] == exact_count
        assert len(audit["reported_minimum_witness_replays"]) == 4
        assert len(audit["spread_samples"]) == 7
        assert all(
            rank["unseen_S30_match"]
            for sample in audit["spread_samples"]
            for rank in sample["ranks"].values()
        )
        mixed_sum += exact_count
        recursive_rows.append({
            "root_location_orbit": root,
            "rays": exact_count,
            "negative0": 0,
            "negative1": 0,
            "minimum_replays": 4,
            "spread_literal_S30_checks": 14,
        })
    assert mixed_sum == 20_899_091

    bases = load("rank8_delta03_e3_cubic_all_long_bases_exact_root_20260823.json")
    base_audit = load("rank8_delta03_e3_cubic_all_long_bases_independent_audit_root_20260823.json")
    base_rows = {row["root_location_orbit"]: row for row in bases["base_cells"]}
    assert set(base_rows) == set(roots)
    assert bases["coverage"]["strictly_positive_values"] == 28
    assert base_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA03_E3_CUBIC_ALL_LONG_BASE_AUDIT"
    for root in roots:
        assert int(base_rows[root]["Delta0"]) > 0
        assert int(base_rows[root]["Delta1"]) > 0

    edge = load("rank8_delta01_e3_cubic_stable_edge_extension_exact_agent_20260822.json")
    edge_audit = load("rank8_delta01_e3_cubic_stable_edge_extension_independent_audit_agent_20260822.json")
    assert edge["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_STABLE_EDGE_EXTENSION_ALL_ROOT_ORBITS"
    assert edge_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA01_E3_CUBIC_STABLE_EDGE_EXTENSION_AUDIT"

    finite = load("rank8_delta01_e3_cubic_skeleton_n27_n36_exact_agent_20260822.json")
    finite_audit = load("rank8_delta01_e3_cubic_skeleton_n27_n36_independent_audit_agent_20260822.json")
    assert finite["status"] == "PASS_EXACT_RANK8_DELTA01_E3_CUBIC_SKELETON_ALL_ROOTS_N27_N36"
    assert finite_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA01_E3_CUBIC_SKELETON_N27_N36_AUDIT"

    payload = {
        "schema": "rank8_delta01_e3_cubic_complete_independent_audit_agent_v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA01_E3_CUBIC_COMPLETE_AUDIT",
        "assembly": ASSEMBLY,
        "assembly_sha256": EXPECTED_ASSEMBLY_SHA256,
        "assembler_sha256": EXPECTED_ASSEMBLER_SHA256,
        "per_root_trichotomy": per_root_trichotomy,
        "recursive_mixed_audits": recursive_rows,
        "totals": {
            "coordinate_patterns": 33_880_500,
            "mixed_quotient_rays": mixed_sum,
            "all_short_n37_plus_cells": 4_670_546,
            "all_long_base_cells": 7,
            "root_location_orbits": 7,
            "mixed_remainder": 0,
        },
        "coverage_logic": [
            "finite all-root census covers every order 27 through 36",
            "short/long state trichotomy is exact and disjoint in each root orbit",
            "all-short n>=37 cells are exhaustively positive",
            "every mixed ray has positive Newton base and first coefficient with all higher coefficients nonnegative",
            "all-long S=0 bases are independently positive and stable edge increments are independently positive",
        ],
        "critical_inputs": EXPECTED_CRITICAL,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "This audits only the complete cubic e=3 Delta0/Delta1 theorem. Broader connected, forest, rank-eight PGC, and Problem 993 claims remain outside scope.",
    }
    output = ROOT / "rank8_delta01_e3_cubic_complete_independent_audit_agent_20260823.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(output))


if __name__ == "__main__":
    main()

