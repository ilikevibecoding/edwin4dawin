#!/usr/bin/env python3
"""Fail-closed assembler for all seven root orbits of one e=5 skeleton at n=27."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_exact_agent_20260823.json"

ORBIT_ROWS = (
    {
        "orbit": "central_quartic", "kind": "suppressed_vertex", "representative": 0,
        "skeleton_orbit_size": 1, "stabilizer_order": 16, "canonical": 46685,
        "producer": "rank8_delta03_e5_quartic_center_two_cubic_central_root_order27_exact_agent_20260823.json",
        "producer_sha256": "FD2EE225730754AA3C7D7D5C9590EAE819DBC5FD8454A53BFCBCFF2E740E5909",
        "audit": "rank8_delta03_e5_quartic_center_two_cubic_central_root_order27_independent_audit_agent_20260823.json",
        "audit_sha256": "2C914639CF876D2D0DD436A6088A79E417A14D94A894EFFAC1E6C683E84BE443",
    },
    {
        "orbit": "cubic_branch", "kind": "suppressed_vertex", "representative": 1,
        "skeleton_orbit_size": 2, "stabilizer_order": 8, "canonical": 92950,
        "producer": "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_order27_exact_agent_20260823.json",
        "producer_sha256": "EC5F21D7FCE69D7631F3F9C7F86C40CDC9CB8E252298AFE27CCF46767D773904",
        "audit": "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_order27_independent_audit_agent_20260823.json",
        "audit_sha256": "64BF61506E66F8DBCBCBBE9A273FC064B9898A0C471EB9949F76E9B52592C875",
    },
    {
        "orbit": "quartic_leaf", "kind": "suppressed_vertex", "representative": 3,
        "skeleton_orbit_size": 2, "stabilizer_order": 8, "canonical": 80938,
        "producer": "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_order27_exact_agent_20260823.json",
        "producer_sha256": "ED2E0153F6ABF4C921558C69324F3C7ECEA949994ADB0C7CCE1231DBFE48A6E1",
        "audit": "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_order27_independent_audit_agent_20260823.json",
        "audit_sha256": "04F8AA0B4F30436FB8598DF351B468DCF7690BCE5B4F05898CD5080D64D1C94A",
    },
    {
        "orbit": "cubic_leaf", "kind": "suppressed_vertex", "representative": 5,
        "skeleton_orbit_size": 4, "stabilizer_order": 4, "canonical": 161161,
        "producer": "rank8_delta03_e5_quartic_center_two_cubic_cubic_leaf_order27_exact_agent_20260823.json",
        "producer_sha256": "800D7BF3C48B3F2311B4DA5E4EBA3A568472594ADD5B85168FE78D1EEC275A83",
        "audit": "rank8_delta03_e5_quartic_center_two_cubic_cubic_leaf_order27_independent_audit_agent_20260823.json",
        "audit_sha256": "39A252A879F63884CA7070836700BF2B7CEB04C4EF610AA47A4F37DD9C82955C",
    },
    {
        "orbit": "center_cubic_spine_internal", "kind": "suppressed_edge_interior", "representative": 0,
        "skeleton_orbit_size": 2, "stabilizer_order": 8, "canonical": 223938,
        "producer": "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_order27_exact_agent_20260823.json",
        "producer_sha256": "838BA38551A8B91238CB85CF04FDC46A044A84D35784D655325B3894751FAFB0",
        "audit": "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_order27_independent_audit_agent_20260823.json",
        "audit_sha256": "E62F15BF42783137B4597401F21F74208659C7187E9E6E9AEA2ACEE7F3A8FBB1",
    },
    {
        "orbit": "quartic_pendant_internal", "kind": "suppressed_edge_interior", "representative": 2,
        "skeleton_orbit_size": 2, "stabilizer_order": 8, "canonical": 191267,
        "producer": "rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_order27_exact_agent_20260823.json",
        "producer_sha256": "49F913A9869E0896A465695A80A523726FD4BA3B7124D18EB8B38C054C5BCD73",
        "audit": "rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_order27_independent_audit_agent_20260823.json",
        "audit_sha256": "9E410DD3D45DB35D4D7977CFB3F55A13EAD51023AEBA0F43AD51076B3D57348C",
    },
    {
        "orbit": "cubic_pendant_internal", "kind": "suppressed_edge_interior", "representative": 4,
        "skeleton_orbit_size": 4, "stabilizer_order": 4, "canonical": 379665,
        "producer": "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_order27_exact_agent_20260823.json",
        "producer_sha256": "0FCBABF9F2A14E06F8C5BCE7316F97F636E66FF32370BF844D1D607B903A83E1",
        "audit": "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_order27_independent_audit_agent_20260823.json",
        "audit_sha256": "F14CF20662843BD3CB7340019887600C21493C574537AA28109D761C5A511221",
    },
)


def stable_bytes(path: Path) -> bytes:
    before = path.stat()
    data = path.read_bytes()
    after = path.stat()
    assert before.st_size == after.st_size == len(data), f"moving size: {path.name}"
    assert before.st_mtime_ns == after.st_mtime_ns, f"moving mtime: {path.name}"
    return data


def sha256(path: Path) -> str:
    return hashlib.sha256(stable_bytes(path)).hexdigest().upper()


def load(path: Path) -> dict:
    return json.loads(stable_bytes(path).decode("utf-8"))


def main() -> int:
    evidence = []
    for row in ORBIT_ROWS:
        producer_path = HERE / row["producer"]
        audit_path = HERE / row["audit"]
        assert sha256(producer_path) == row["producer_sha256"], row["producer"]
        assert sha256(audit_path) == row["audit_sha256"], row["audit"]
        producer = load(producer_path)
        audit = load(audit_path)
        assert producer["order"] == 27
        assert producer["degree_surplus"] == 5
        assert producer["suppressed_skeleton"] == "quartic_center_two_cubic"
        assert producer["root_orbit"] == row["orbit"]
        producer_stabilizer = producer.get(
            "rooted_automorphism_group_order",
            16 if row["orbit"] == "central_quartic" else None,
        )
        assert producer_stabilizer == row["stabilizer_order"]
        assert producer["canonical_subdivisions"] == row["canonical"]
        assert producer["literal_root_checks"] == row["canonical"]
        assert producer["nonpositive"] == [0, 0, 0, 0]
        assert producer["status"].startswith("PASS_EXACT_RANK8_DELTA03_E5_")
        no_gap = audit["no_gap_enumeration"]
        raw_key = (
            "raw_positive_compositions"
            if row["kind"] == "suppressed_vertex"
            else "raw_positive_root_split_compositions"
        )
        assert no_gap[raw_key] == (480700 if row["kind"] == "suppressed_vertex" else 1081575)
        assert no_gap["burnside_orbits"] == no_gap["direct_canonical_representatives"] == row["canonical"]
        checks = audit["exact_checks"]
        assert checks["literal_tree_checks"] == row["canonical"]
        assert checks["literal_deletion_forest_checks"] == row["canonical"]
        assert checks["nonpositive"] == [0, 0, 0, 0]
        assert checks["minimum_replays"] == 4
        assert audit["status"].startswith("PASS_INDEPENDENT_RANK8_DELTA03_E5_")
        assert audit["immutable_input_hashes"][row["producer"]] == row["producer_sha256"]
        for rank in range(4):
            primary_minimum = producer["minima"][str(rank)]
            replay = audit["minimum_replays"][rank]
            assert replay["delta"] == rank
            assert replay["value"] == int(primary_minimum["value"])
            assert replay["lengths"] == primary_minimum["lengths"]
            assert replay["root"] == primary_minimum["root"]
            assert replay["core"] == primary_minimum["core"]
            assert replay["deleted"] == primary_minimum["deleted"]
            if row["kind"] == "suppressed_edge_interior":
                assert replay["root_segments"] == primary_minimum["root_segments"]
        evidence.append({
            "root_orbit": row["orbit"],
            "root_location_kind": row["kind"],
            "representative_index": row["representative"],
            "skeleton_orbit_size": row["skeleton_orbit_size"],
            "rooted_stabilizer_order": row["stabilizer_order"],
            "raw_configurations_before_rooted_quotient": no_gap[raw_key],
            "canonical_rooted_configurations": row["canonical"],
            "nonpositive_Delta0_3": [0, 0, 0, 0],
            "producer": row["producer"],
            "producer_sha256": row["producer_sha256"],
            "independent_audit": row["audit"],
            "independent_audit_sha256": row["audit_sha256"],
            "independent_value_stream_sha256": audit["independent_value_stream_sha256"],
        })

    vertex_rows = [row for row in evidence if row["root_location_kind"] == "suppressed_vertex"]
    edge_rows = [row for row in evidence if row["root_location_kind"] == "suppressed_edge_interior"]
    assert sum(row["skeleton_orbit_size"] for row in vertex_rows) == 9
    assert sum(row["skeleton_orbit_size"] for row in edge_rows) == 8
    total = sum(row["canonical_rooted_configurations"] for row in evidence)
    assert total == 1176604

    payload = {
        "schema": "rank8-delta03-e5-quartic-center-two-cubic-order27-all-roots-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_ALL_ROOTS_ORDER27",
        "exact_scope": {
            "order": 27,
            "degree_surplus": 5,
            "suppressed_skeleton": "quartic_center_two_cubic",
            "suppressed_vertex_count": 9,
            "suppressed_edge_count": 8,
            "Delta_indices": [0, 1, 2, 3],
        },
        "root_location_partition": {
            "suppressed_vertex_orbits": [row["root_orbit"] for row in vertex_rows],
            "suppressed_vertex_orbit_sizes": [row["skeleton_orbit_size"] for row in vertex_rows],
            "suppressed_edge_interior_orbits": [row["root_orbit"] for row in edge_rows],
            "suppressed_edge_orbit_sizes": [row["skeleton_orbit_size"] for row in edge_rows],
            "root_orbits_total": len(evidence),
            "gaps": 0,
            "overlaps": 0,
        },
        "orbit_evidence": evidence,
        "totals": {
            "canonical_rooted_isomorphism_classes": total,
            "producer_literal_tree_checks": total,
            "independent_literal_tree_checks": total,
            "independent_literal_deletion_forest_checks": total,
            "nonpositive_Delta0_3": [0, 0, 0, 0],
            "minimum_replays": 4 * len(evidence),
        },
        "proof_booleans": {
            "all_seven_root_location_orbits_partitioned": True,
            "this_skeleton_all_roots_order27_Delta0_3_complete": True,
            "all_e5_skeletons_order27_complete": False,
            "connected_Q8_complete": False,
            "forest_Q8_complete": False,
            "rank8_PGC_complete": False,
            "problem_993_solved": False,
        },
        "assembler_source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "This closes all roots only for the single suppressed skeleton quartic_center_two_cubic "
            "at n=27 and e=5. Other e=5 skeletons, n>=28, connected Q8, forest Q8, rank-eight PGC, "
            "and Problem 993 remain open."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("ROOT_ORBITS", len(evidence), "CANONICAL_ROOTED", total, "NONPOS", payload["totals"]["nonpositive_Delta0_3"])
    print("SOURCE", payload["assembler_source_sha256"])
    print("REPORT", sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
