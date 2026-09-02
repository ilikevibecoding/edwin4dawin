#!/usr/bin/env python3
"""Fail-closed assembly of the complete rooted e=2 Delta3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta3_e2_complete_exact_root_20260823.json"
EXPECTED = {
    "rank8_delta01_e2_root_segment_partition_exact_agent_20260823.json":
        "EBAF3FED1DF2D7ACF82F4476CCC1E892131A6A8AF8B0DBFFA8BEBE689083426C",
    "rank8_delta01_e2_root_segment_partition_independent_audit_agent_20260823.json":
        "AD5AE4EEF6DEB576DD2B0EC46CAFA9EF8BC6AC2D4F08231C4837CFBC7991EC61",
    "rank8_delta013_e2_double_claws_n23_exact_20260820.json":
        "A2CA7228A172D5C8E1A1747014691F38A49BC0DE07C59D82400A80ED245A7AC9",
    "rank8_delta013_e2_double_claws_n23_independent_audit_exact_20260820.json":
        "BF988098870847459BD61B3B58C0ED8010C092130A0DFAC45735000B2FA4C027",
    "rank8_delta013_e2_length_extension_scout_exact_20260820.json":
        "49D5B53516C07B7DE085D5586158F3674B523F01B4167E8BA972AA61118F16C4",
    "rank8_delta013_e2_length_extension_independent_audit_exact_20260820.json":
        "FC336F62A58EE4C2CFB7EF6F9AF6D3BE24FA689B89841A86D656A2547CCE63A2",
    "rank8_delta013_e2_all_long_exact_20260820.json":
        "753DF4C499A78021C50E32C700B93FBCB16877003EF8265F4106D63C45AB5701",
    "rank8_delta013_e2_symmetric_long_independent_audit_exact_20260820.json":
        "7872A0B5F181B4F15FC54DDFB9E54B57E1412C3BDC620D477911192EABE55A1B",
    "rank8_delta3_e2_mixed_newton_reduction_exact_root_20260823.json":
        "8A4ACC45A27DF1394440EE7326F5404B444444F523A5FCE68712B7D112D1F7F1",
    "rank8_delta3_e2_all_short_n31_plus_exact_root_20260823.json":
        "1E666AD8D5225078FDACBFE7A625D1BCBF60B259B8E39D5CFB62E3738ADF8482",
    "rank8_delta3_e2_all_short_n31_plus_independent_audit_root_20260823.json":
        "0EECD877F1F219331B5B87A65AB7A53A682AB8ED55CBDC316528E5D9D27652C6",
    "rank8_delta3_e2_branch_mixed_newton_exact_root_20260823.json":
        "385DC3711FDF369C45C91AF19866C351C26A52352A551C3AF7D16C89EEF3E518",
    "rank8_delta3_e2_branch_mixed_newton_independent_audit_root_20260823.json":
        "20CEC54CDC68EC8F69B535FE85E80E0F131C9274635132334F2EEE62953ABA99",
    "rank8_delta3_e2_bridge_internal_mixed_newton_exact_root_20260823.json":
        "17F42A1949352FBD9A0C2E48529F02730ABE772335E2235412D44D935A99291F",
    "rank8_delta3_e2_bridge_internal_mixed_newton_independent_audit_root_20260823.json":
        "4B81BF17FED0B65A511BC3EECF568D8B6EAFB2D5F10D48014924EEF7A3736287",
    "rank8_delta3_e2_pendant_mixed_newton_exact_root_20260823.json":
        "AD7F2A669C7E6A4BAC2937D3C4E6A2B8BA52B8872D0C65B0C86899EC81B09D72",
    "rank8_delta3_e2_pendant_mixed_newton_independent_audit_root_20260823.json":
        "7444E815A29B3C14DD394249667D825D72CF79AF3808FCB275A5AD318C129013",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> None:
    assert "FILL_AFTER_AUDIT" not in EXPECTED.values()
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    partition = load("rank8_delta01_e2_root_segment_partition_exact_agent_20260823.json")
    partition_audit = load("rank8_delta01_e2_root_segment_partition_independent_audit_agent_20260823.json")
    assert partition["status"] == "PASS_EXACT_RANK8_DELTA01_E2_ROOT_SEGMENT_NO_GAP_PARTITION"
    assert partition_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA01_E2_ROOT_SEGMENT_NO_GAP_PARTITION_AUDIT"

    finite_base = load("rank8_delta013_e2_double_claws_n23_exact_20260820.json")
    finite_base_audit = load("rank8_delta013_e2_double_claws_n23_independent_audit_exact_20260820.json")
    finite_extension = load("rank8_delta013_e2_length_extension_scout_exact_20260820.json")
    finite_extension_audit = load("rank8_delta013_e2_length_extension_independent_audit_exact_20260820.json")
    assert finite_base["status"] == "PASS_EXACT_RANK8_DELTA013_E2_DOUBLE_CLAWS_N23"
    assert finite_base_audit["status"] == "PASS_INDEPENDENT_EXACT_AUDIT_RANK8_DELTA013_E2_DOUBLE_CLAWS_N23"
    assert finite_extension["status"] == "PASS_EXACT_SCOUT_RANK8_DELTA013_E2_LENGTH_EXTENSION_ORDERS_23_29"
    assert finite_extension_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA013_E2_LENGTH_EXTENSION"

    all_long = load("rank8_delta013_e2_all_long_exact_20260820.json")
    all_long_audit = load("rank8_delta013_e2_symmetric_long_independent_audit_exact_20260820.json")
    assert all_long["status"] == "PASS_EXACT_RANK8_DELTA013_E2_ALL_LONG_ROOT_CELLS"
    assert all_long_audit["status"] == "PASS_INDEPENDENT_AUDIT_RANK8_DELTA013_E2_SYMMETRIC_LONG_CELLS"

    reduction = load("rank8_delta3_e2_mixed_newton_reduction_exact_root_20260823.json")
    all_short = load("rank8_delta3_e2_all_short_n31_plus_exact_root_20260823.json")
    all_short_audit = load("rank8_delta3_e2_all_short_n31_plus_independent_audit_root_20260823.json")
    branch = load("rank8_delta3_e2_branch_mixed_newton_exact_root_20260823.json")
    branch_audit = load("rank8_delta3_e2_branch_mixed_newton_independent_audit_root_20260823.json")
    bridge = load("rank8_delta3_e2_bridge_internal_mixed_newton_exact_root_20260823.json")
    bridge_audit = load("rank8_delta3_e2_bridge_internal_mixed_newton_independent_audit_root_20260823.json")
    pendant = load("rank8_delta3_e2_pendant_mixed_newton_exact_root_20260823.json")
    pendant_audit = load("rank8_delta3_e2_pendant_mixed_newton_independent_audit_root_20260823.json")
    assert reduction["status"] == "PASS_EXACT_RANK8_DELTA3_E2_MIXED_GRADED_TRANSFER_NEWTON_REDUCTION"
    assert all_short["status"] == "PASS_EXACT_RANK8_DELTA3_E2_ALL_SHORT_N31_PLUS"
    assert all_short_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA3_E2_ALL_SHORT_N31_PLUS_AUDIT"
    assert branch["status"] == "PASS_EXACT_RANK8_DELTA3_E2_BRANCH_MIXED_ALL_RAYS"
    assert branch_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA3_E2_BRANCH_MIXED_ALL_RAYS_AUDIT"
    assert bridge["status"] == "PASS_EXACT_RANK8_DELTA3_E2_BRIDGE_INTERNAL_MIXED_ALL_RAYS"
    assert bridge_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA3_E2_BRIDGE_INTERNAL_MIXED_ALL_RAYS_AUDIT"
    assert pendant["status"] == "PASS_EXACT_RANK8_DELTA3_E2_PENDANT_MIXED_ALL_RAYS"
    assert pendant_audit["status"] == "PASS_INDEPENDENT_RANK8_DELTA3_E2_PENDANT_MIXED_ALL_RAYS_AUDIT"

    expected = {
        "branch": {"all_short": 4, "mixed": 3184, "all_long": 1},
        "pendant": {"all_short": 1829, "mixed": 57133, "all_long": 1},
        "bridge_internal": {"all_short": 579, "mixed": 14321, "all_long": 1},
    }
    mixed_reports = {"branch": branch, "pendant": pendant, "bridge_internal": bridge}
    mixed_audits = {"branch": branch_audit, "pendant": pendant_audit, "bridge_internal": bridge_audit}
    for root_type, counts in expected.items():
        root_partition = partition["roots"][root_type]
        assert root_partition["all_short_target_n31_plus_points"] == counts["all_short"]
        assert root_partition["sectors"]["mixed"] == counts["mixed"]
        assert root_partition["sectors"]["all_long"] == counts["all_long"] == 1
        assert all_short["roots"][root_type]["cells"] == counts["all_short"]
        assert all_short_audit["root_counts"][root_type] == counts["all_short"]
        assert mixed_reports[root_type]["rays"] == counts["mixed"]
        assert mixed_audits[root_type]["rays_rebuilt"] == counts["mixed"]
        assert mixed_reports[root_type]["coefficient_stream_sha256"] == mixed_audits[root_type]["coefficient_stream_sha256"]

    total_mixed = sum(row["mixed"] for row in expected.values())
    total_short = sum(row["all_short"] for row in expected.values())
    total_long = sum(row["all_long"] for row in expected.values())
    assert (total_short, total_mixed, total_long) == (2412, 74638, 3)

    payload = {
        "schema": "rank8-delta3-e2-complete-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA3_E2_COMPLETE_ALL_ROOTS_ALL_ORDERS_N23_PLUS",
        "theorem": "For every rooted degree-surplus-two tree (equivalently, every rooted double claw) of order n>=23, Delta3 R_1(A,q)>0.",
        "finite_orders": {
            "range": "23..30",
            "proof": "exact all-root order-23 base plus every one-edge length extension from source orders 23..29, independently audited",
        },
        "all_order_partition_from_n31": {
            "root_types": expected,
            "all_short_cells": total_short,
            "mixed_rays": total_mixed,
            "all_long_cells": total_long,
            "mixed_primary_values": sum(report["literal_values"] for report in mixed_reports.values()),
            "mixed_independent_values": sum(report["literal_values_rebuilt"] for report in mixed_audits.values()),
            "mixed_unseen_checks": sum(report["unseen_literal_checks"] for report in mixed_audits.values()),
            "degree_bound": 26,
            "newton_sign_gate": "d0>0 and d1..d26>=0 on every mixed quotient ray",
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "This closes Delta3 at e=2 only. Delta2 is separately gated; e>=4, forest transfer, low-low gluing, and Problem 993 remain.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("N31_PARTITION", payload["all_order_partition_from_n31"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
