#!/usr/bin/env python3
"""Assemble the complete rooted e=2 Delta0/Delta1 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta01_e2_complete_exact_agent_20260823.json"
EXPECTED = {
    "rank8_delta013_e2_double_claws_n23_independent_audit_exact_20260820.json": "BF988098870847459BD61B3B58C0ED8010C092130A0DFAC45735000B2FA4C027",
    "rank8_delta013_e2_length_extension_independent_audit_exact_20260820.json": "FC336F62A58EE4C2CFB7EF6F9AF6D3BE24FA689B89841A86D656A2547CCE63A2",
    "rank8_delta013_e2_all_long_exact_20260820.json": "753DF4C499A78021C50E32C700B93FBCB16877003EF8265F4106D63C45AB5701",
    "rank8_delta01_e2_root_segment_partition_exact_agent_20260823.json": "EBAF3FED1DF2D7ACF82F4476CCC1E892131A6A8AF8B0DBFFA8BEBE689083426C",
    "rank8_delta01_e2_root_segment_partition_independent_audit_agent_20260823.json": "AD5AE4EEF6DEB576DD2B0EC46CAFA9EF8BC6AC2D4F08231C4837CFBC7991EC61",
    "rank8_delta01_e2_all_short_n31_plus_exact_agent_20260823.json": "709F31B4F96E8E8894136B73BFBB77EF579084B544FECCB247BAFB73E6ABC254",
    "rank8_delta01_e2_all_short_n31_plus_independent_audit_agent_20260823.json": "FF3539E809B220F1CB91FD4152273396C64DAB61DA4DC44DEC3FBFDED91BAB8C",
    "rank8_delta01_e2_mixed_newton_reduction_exact_agent_20260823.json": "70A4A2425768F77376086B1F0E96925FF08CDB555E7D25653DD2BA904081C690",
    "rank8_delta01_e2_branch_mixed_newton_exact_agent_20260823.json": "45E27739AA5078C8538F409088ACE255AF07DC1BDECCBBF4B66549C3B7828F40",
    "rank8_delta01_e2_branch_mixed_newton_independent_audit_agent_20260823.json": "638F3994D4133AECD860BE466B4E38DA7575CC2E7CA457A6679BE874EB759D27",
    "rank8_delta01_e2_bridge_internal_mixed_newton_exact_agent_20260823.json": "D500FC382FF11A900080A24212675B8EB589C0DB6BC78048E4FF6166E852A75D",
    "rank8_delta01_e2_bridge_internal_mixed_newton_independent_audit_agent_20260823.json": "1327A4836FF4DD209ECB003F948C475C55EF20F9530386EDDF2D671E89E8FBA8",
    "rank8_delta01_e2_pendant_mixed_newton_exact_agent_20260823.json": "EA01BB6E52591CF51ADBE4C579C16091FB2E5B302268ED956707943266150260",
    "rank8_delta01_e2_pendant_mixed_newton_independent_audit_agent_20260823.json": "0861C71DE4D86188F3F78BFA6D402EB2566F7ACF156E4902EBFF4D3205018420",
}
STATUSES = {
    "rank8_delta013_e2_double_claws_n23_independent_audit_exact_20260820.json": "PASS_INDEPENDENT_EXACT_AUDIT_RANK8_DELTA013_E2_DOUBLE_CLAWS_N23",
    "rank8_delta013_e2_length_extension_independent_audit_exact_20260820.json": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA013_E2_LENGTH_EXTENSION",
    "rank8_delta013_e2_all_long_exact_20260820.json": "PASS_EXACT_RANK8_DELTA013_E2_ALL_LONG_ROOT_CELLS",
    "rank8_delta01_e2_root_segment_partition_exact_agent_20260823.json": "PASS_EXACT_RANK8_DELTA01_E2_ROOT_SEGMENT_NO_GAP_PARTITION",
    "rank8_delta01_e2_root_segment_partition_independent_audit_agent_20260823.json": "PASS_INDEPENDENT_RANK8_DELTA01_E2_ROOT_SEGMENT_NO_GAP_PARTITION_AUDIT",
    "rank8_delta01_e2_all_short_n31_plus_exact_agent_20260823.json": "PASS_EXACT_RANK8_DELTA01_E2_ALL_SHORT_N31_PLUS",
    "rank8_delta01_e2_all_short_n31_plus_independent_audit_agent_20260823.json": "PASS_INDEPENDENT_RANK8_DELTA01_E2_ALL_SHORT_N31_PLUS_AUDIT",
    "rank8_delta01_e2_mixed_newton_reduction_exact_agent_20260823.json": "PASS_EXACT_RANK8_DELTA01_E2_MIXED_GRADED_TRANSFER_NEWTON_REDUCTION",
    "rank8_delta01_e2_branch_mixed_newton_exact_agent_20260823.json": "PASS_EXACT_RANK8_DELTA01_E2_BRANCH_MIXED_ALL_RAYS",
    "rank8_delta01_e2_branch_mixed_newton_independent_audit_agent_20260823.json": "PASS_INDEPENDENT_RANK8_DELTA01_E2_BRANCH_MIXED_ALL_RAYS_AUDIT",
    "rank8_delta01_e2_bridge_internal_mixed_newton_exact_agent_20260823.json": "PASS_EXACT_RANK8_DELTA01_E2_BRIDGE_INTERNAL_MIXED_ALL_RAYS",
    "rank8_delta01_e2_bridge_internal_mixed_newton_independent_audit_agent_20260823.json": "PASS_INDEPENDENT_RANK8_DELTA01_E2_BRIDGE_INTERNAL_MIXED_ALL_RAYS_AUDIT",
    "rank8_delta01_e2_pendant_mixed_newton_exact_agent_20260823.json": "PASS_EXACT_RANK8_DELTA01_E2_PENDANT_MIXED_ALL_RAYS",
    "rank8_delta01_e2_pendant_mixed_newton_independent_audit_agent_20260823.json": "PASS_INDEPENDENT_RANK8_DELTA01_E2_PENDANT_MIXED_ALL_RAYS_AUDIT",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    reports = {name: json.loads((HERE / name).read_text(encoding="utf-8")) for name in EXPECTED}
    assert {name: row["status"] for name, row in reports.items()} == STATUSES

    partition = reports["rank8_delta01_e2_root_segment_partition_exact_agent_20260823.json"]
    finite = reports["rank8_delta01_e2_all_short_n31_plus_exact_agent_20260823.json"]
    mixed_names = {
        "branch": "rank8_delta01_e2_branch_mixed_newton_exact_agent_20260823.json",
        "pendant": "rank8_delta01_e2_pendant_mixed_newton_exact_agent_20260823.json",
        "bridge_internal": "rank8_delta01_e2_bridge_internal_mixed_newton_exact_agent_20260823.json",
    }
    mixed_counts = {root: reports[name]["rays"] for root, name in mixed_names.items()}
    assert mixed_counts == {"branch": 3184, "pendant": 57133, "bridge_internal": 14321}
    assert sum(mixed_counts.values()) == partition["totals"]["mixed_rays"] == 74638
    assert finite["totals"] == {"cells": 2412, "rank_cells": 4824}
    assert partition["totals"]["all_long_rays_sealed"] == 3
    for name in mixed_names.values():
        for rank in ("0", "1"):
            stats = reports[name]["minimum_coefficients"][rank]
            assert stats["d0"] > 0 and stats["d1"] > 0 and stats["higher"] >= 0

    payload = {
        "schema": "rank8-delta01-e2-complete-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA01_E2_ALL_ROOTED_DOUBLE_CLAWS_N23_PLUS",
        "classification": "e=sum_v binom(deg(v)-1,2)=2 forces exactly two degree-3 vertices and no higher-degree vertex; suppression is a double claw with four leaves and five positive edges",
        "theorem": "For every rooted e=2 tree of order n>=23, Delta0 R1>0 and Delta1 R1>0.",
        "coverage": {
            "n23_to_n30": "independently audited n=23 base plus exact positive one-edge extensions through n=30",
            "n31_plus_all_short": {"rooted_points": finite["totals"]["cells"], "rank_values": finite["totals"]["rank_cells"]},
            "n31_plus_mixed": {"rays": mixed_counts, "total": sum(mixed_counts.values()), "degree_bound": 28, "samples_per_rank_ray": 29},
            "n31_plus_all_long": {"root_orbit_rays": 3, "source": "sealed Delta0..3 all-long theorem"},
        },
        "n31_plus_no_gap_check": {
            "all_short": 2412,
            "mixed": 74638,
            "all_long": 3,
            "unresolved": 0,
        },
        "independent_replays": {
            "all_short_values": 4824,
            "branch_mixed_values": 184672,
            "bridge_internal_mixed_values": 830618,
            "pendant_mixed_values": 3313714,
            "unseen_S29_checks": 6368 + 28642 + 114266,
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "global_scope_guard": "This closes only connected degree-surplus e=2 for Delta0/Delta1. The e>=4 connected layers, Delta2/Delta3 boundary layers, forest case, and Erdos Problem 993 remain separate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("COVER", payload["n31_plus_no_gap_check"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
