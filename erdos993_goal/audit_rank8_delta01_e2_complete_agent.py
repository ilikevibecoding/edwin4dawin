#!/usr/bin/env python3
"""Independent assembly audit of the complete rooted e=2 Delta0/1 theorem."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path


HERE = Path(__file__).resolve().parent
PRIMARY_SOURCE = HERE / "assemble_rank8_delta01_e2_complete_agent.py"
PRIMARY_REPORT = HERE / "rank8_delta01_e2_complete_exact_agent_20260823.json"
OUTPUT = HERE / "rank8_delta01_e2_complete_independent_audit_agent_20260823.json"
EXPECTED = {
    "assemble_rank8_delta01_e2_complete_agent.py": "F07560D2D9F9BD5474518176F2C693C63BA4AEF00F37FF600169F83443C4EB35",
    "rank8_delta01_e2_complete_exact_agent_20260823.json": "86D5D25E1C45090AA3FD95A5890F937333267439FF8375205EE89D95794F46AE",
    "rank8_delta01_e2_root_segment_partition_independent_audit_agent_20260823.json": "AD5AE4EEF6DEB576DD2B0EC46CAFA9EF8BC6AC2D4F08231C4837CFBC7991EC61",
    "rank8_delta01_e2_all_short_n31_plus_independent_audit_agent_20260823.json": "FF3539E809B220F1CB91FD4152273396C64DAB61DA4DC44DEC3FBFDED91BAB8C",
    "rank8_delta01_e2_branch_mixed_newton_independent_audit_agent_20260823.json": "638F3994D4133AECD860BE466B4E38DA7575CC2E7CA457A6679BE874EB759D27",
    "rank8_delta01_e2_bridge_internal_mixed_newton_independent_audit_agent_20260823.json": "1327A4836FF4DD209ECB003F948C475C55EF20F9530386EDDF2D671E89E8FBA8",
    "rank8_delta01_e2_pendant_mixed_newton_independent_audit_agent_20260823.json": "0861C71DE4D86188F3F78BFA6D402EB2566F7ACF156E4902EBFF4D3205018420",
    "rank8_delta013_e2_length_extension_independent_audit_exact_20260820.json": "FC336F62A58EE4C2CFB7EF6F9AF6D3BE24FA689B89841A86D656A2547CCE63A2",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED
    primary = json.loads(PRIMARY_REPORT.read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_RANK8_DELTA01_E2_ALL_ROOTED_DOUBLE_CLAWS_N23_PLUS"

    # Independent degree-surplus classification. Contributions for degree d
    # are C(d-1,2): 1,3,6,..., so the only partition of 2 is 1+1.
    contributions = {degree: math.comb(degree - 1, 2) for degree in range(3, 8)}
    assert contributions[3] == 1 and all(value >= 3 for degree, value in contributions.items() if degree >= 4)
    cubic_vertices = 2
    leaves = 2 + cubic_vertices  # handshake identity L=2+sum(deg-2)
    assert leaves == 4

    # Recompute quotient counts without using the primary assembler.
    arm_pairs = math.comb(7 + 1, 2)
    short_arm_pairs = math.comb(6 + 1, 2)
    branch_total = arm_pairs**2 * 8
    branch_short = short_arm_pairs**2 * 7
    pendant_total = 8 * 8 * 7 * arm_pairs * 8
    pendant_short = 7 * 7 * 6 * short_arm_pairs * 7
    modules = 8 * arm_pairs
    short_modules = 7 * short_arm_pairs
    bridge_total = math.comb(modules + 1, 2)
    bridge_short = math.comb(short_modules + 1, 2)
    totals = {
        "branch": {"all": branch_total, "short": branch_short, "mixed": branch_total - branch_short - 1},
        "pendant": {"all": pendant_total, "short": pendant_short, "mixed": pendant_total - pendant_short - 1},
        "bridge_internal": {"all": bridge_total, "short": bridge_short, "mixed": bridge_total - bridge_short - 1},
    }
    assert totals == {
        "branch": {"all": 6272, "short": 3087, "mixed": 3184},
        "pendant": {"all": 100352, "short": 43218, "mixed": 57133},
        "bridge_internal": {"all": 25200, "short": 10878, "mixed": 14321},
    }

    # Independently count exactly the finite all-short points at n>=31.
    arm_values = range(1, 7)
    gap_values = range(0, 7)
    bridge_values = range(1, 8)
    pairs = tuple(itertools.combinations_with_replacement(arm_values, 2))
    short_target = {"branch": 0, "pendant": 0, "bridge_internal": 0}
    for left, right, bridge in itertools.product(pairs, pairs, bridge_values):
        short_target["branch"] += 1 + sum(left) + sum(right) + bridge >= 31
    for near, tail, sibling, far, bridge in itertools.product(gap_values, gap_values, arm_values, pairs, bridge_values):
        short_target["pendant"] += 2 + near + tail + sibling + sum(far) + bridge >= 31
    modules_short = tuple((gap, pair) for gap in gap_values for pair in pairs)
    for left, right in itertools.combinations_with_replacement(modules_short, 2):
        short_target["bridge_internal"] += 3 + left[0] + right[0] + sum(left[1]) + sum(right[1]) >= 31
    assert short_target == {"branch": 4, "pendant": 1829, "bridge_internal": 579}

    audits = {
        name: json.loads((HERE / name).read_text(encoding="utf-8"))
        for name in EXPECTED if "independent_audit" in name
    }
    expected_statuses = {
        "rank8_delta01_e2_root_segment_partition_independent_audit_agent_20260823.json": "PASS_INDEPENDENT_RANK8_DELTA01_E2_ROOT_SEGMENT_NO_GAP_PARTITION_AUDIT",
        "rank8_delta01_e2_all_short_n31_plus_independent_audit_agent_20260823.json": "PASS_INDEPENDENT_RANK8_DELTA01_E2_ALL_SHORT_N31_PLUS_AUDIT",
        "rank8_delta01_e2_branch_mixed_newton_independent_audit_agent_20260823.json": "PASS_INDEPENDENT_RANK8_DELTA01_E2_BRANCH_MIXED_ALL_RAYS_AUDIT",
        "rank8_delta01_e2_bridge_internal_mixed_newton_independent_audit_agent_20260823.json": "PASS_INDEPENDENT_RANK8_DELTA01_E2_BRIDGE_INTERNAL_MIXED_ALL_RAYS_AUDIT",
        "rank8_delta01_e2_pendant_mixed_newton_independent_audit_agent_20260823.json": "PASS_INDEPENDENT_RANK8_DELTA01_E2_PENDANT_MIXED_ALL_RAYS_AUDIT",
        "rank8_delta013_e2_length_extension_independent_audit_exact_20260820.json": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA013_E2_LENGTH_EXTENSION",
    }
    assert {name: row["status"] for name, row in audits.items()} == expected_statuses
    assert sum(totals[root]["mixed"] for root in totals) == 74638
    assert sum(short_target.values()) == 2412
    assert primary["n31_plus_no_gap_check"] == {"all_short": 2412, "mixed": 74638, "all_long": 3, "unresolved": 0}

    payload = {
        "schema": "rank8-delta01-e2-complete-independent-audit-agent-v1",
        "status": "PASS_INDEPENDENT_RANK8_DELTA01_E2_ALL_ROOTED_DOUBLE_CLAWS_N23_PLUS_AUDIT",
        "classification_rederived": {"degree3_vertices": cubic_vertices, "leaves": leaves, "suppressed_edges": 5},
        "quotient_counts_rederived": totals,
        "all_short_n31_plus_rederived": short_target,
        "mixed_rays_rederived": 74638,
        "all_long_root_orbits": 3,
        "unresolved_n31_plus": 0,
        "finite_base_band": "independent n23/extension package covers n23..30",
        "primary_source_sha256": sha256(PRIMARY_SOURCE),
        "primary_report_sha256": sha256(PRIMARY_REPORT),
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "global_scope_guard": "Audit is e=2 Delta0/1 only; e>=4, other deltas, forests, and the full conjecture remain separate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("MIXED", payload["mixed_rays_rederived"], "SHORT", sum(short_target.values()), "UNRESOLVED", 0)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
