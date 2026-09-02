#!/usr/bin/env python3
"""Assemble the four exact Delta2 live-path tensors for every n>=35."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta2_attachment_floor_n35plus_assembled_root_20260826.json"
EXPECTED = {
    "rank8_delta2_lcross_k1_attachment_floor_tail35_exact_root_20260826.json":
        "00860979907DF5E22F518944AB93596F03E83CD70300EA08C340D1887733B6F3",
    "rank8_delta2_lcross_k7_attachment_floor_n28plus_exact_agent_20260825.json":
        "E101B7FF7A56B4A58C3F07EB807355C5F90F2F3502782203BC0EC8CF43609108",
    "rank8_delta2_ucap_k1_attachment_floor_n28plus_exact_agent_20260825.json":
        "38EA3F7EA229A4B83E8700F539428997A190AA48B4D729B14BC498E7B28C6CBF",
    "rank8_delta2_ucap_k7_attachment_floor_n28plus_exact_agent_20260825.json":
        "21B03E592F1A74BF5B1096B58F798553DBD2F029DF71C289D0F8C1E9A0B86666",
    "certify_rank8_delta2_lcross_k1_attachment_floor_tail35_root.py":
        "0B5704DBB701E91EFC82D990714E16C8606FB9C1F398018FE6A8409BFA84C37C",
    "audit_rank8_delta2_lcross_k1_attachment_floor_tail35_root.py":
        "A5F604E48E0A2F0A09A5B16627B9CF810C8597FF2264B866F568EE1F297CF3AD",
    "rank8_delta2_lcross_k1_attachment_floor_tail35_independent_audit_root_20260826.json":
        "2C5145F40B600663AE77EAC37E5C20848EFBA9BC7F51913D50516CB527C13719",
    "rank8_delta23_live_path_attachment_floor_box_mappings_independent_audit_agent_20260825.json":
        "4EA7C717C4F8C85699E77847E298CD0C47E38766D7D94C1EAFEFCBDC2A5F77DB",
    "rank8_q8_terminal_delta2_reduction_exact_20260820.json":
        "3808552D9ED786FAB5B87E217E10121275769144B6600FB2570B051CF8C0496D",
    "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json":
        "9F691B70DB4240B056EE92D1424D2A9269DF0224C9CE9A22A2C2F00EA89B8C9D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict[str, object]:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    mapping = load(
        "rank8_delta23_live_path_attachment_floor_box_mappings_"
        "independent_audit_agent_20260825.json"
    )
    reduction = load("rank8_q8_terminal_delta2_reduction_exact_20260820.json")
    floor_audit = load(
        "rank8_root_deletion_attachment_floor_independent_audit_root_20260825.json"
    )
    tail_audit = load(
        "rank8_delta2_lcross_k1_attachment_floor_tail35_"
        "independent_audit_root_20260826.json"
    )
    assert mapping["status"] == (
        "PASS_INDEPENDENT_EXACT_DELTA23_ATTACHMENT_FLOOR_BOX_MAPPING_AUDIT"
    )
    assert reduction["status"] == (
        "PASS_EXACT_RANK8_TERMINAL_DELTA2_REDUCTION_FOUR_LIVE_PATHS"
    )
    assert floor_audit["status"] == "PASS_INDEPENDENT_ROOT_DELETION_ATTACHMENT_FLOOR_AUDIT"
    assert tail_audit["status"] == (
        "PASS_INDEPENDENT_DELTA2_LCROSS_K1_ATTACHMENT_FLOOR_TAIL35_AUDIT"
    )

    reports = {
        (1, "lcross"): (
            "rank8_delta2_lcross_k1_attachment_floor_tail35_exact_root_20260826.json",
            "PASS_EXACT_DELTA2_LCROSS_K1_ATTACHMENT_FLOOR_TAIL35",
        ),
        (7, "lcross"): (
            "rank8_delta2_lcross_k7_attachment_floor_n28plus_exact_agent_20260825.json",
            "PASS_EXACT_DELTA2_LIVE_PATH_WITH_ATTACHMENT_FLOOR",
        ),
        (1, "ucap"): (
            "rank8_delta2_ucap_k1_attachment_floor_n28plus_exact_agent_20260825.json",
            "PASS_EXACT_DELTA2_LIVE_PATH_WITH_ATTACHMENT_FLOOR",
        ),
        (7, "ucap"): (
            "rank8_delta2_ucap_k7_attachment_floor_n28plus_exact_agent_20260825.json",
            "PASS_EXACT_DELTA2_LIVE_PATH_WITH_ATTACHMENT_FLOOR",
        ),
    }
    rows = []
    aggregate = {"boxes": 0, "coefficients": 0, "negative": 0, "zero": 0, "positive": 0}
    for (k, piece), (name, status) in reports.items():
        report = load(name)
        assert report["status"] == status
        assert report["Delta"] == 2
        assert report["D6_k"] == k
        assert report["capacity_piece"] == piece
        assert report["mapped_degrees"] == [38, 12, 12, 12, 8, 2]
        assert report["bernstein_coefficients"] == 2_313_441
        assert report["coefficient_sign_counts"] == {
            "negative": 0, "zero": 0, "positive": 2_313_441,
        }
        counts = report["coefficient_sign_counts"]
        aggregate["boxes"] += 1
        aggregate["coefficients"] += report["bernstein_coefficients"]
        for key in ("negative", "zero", "positive"):
            aggregate[key] += counts[key]
        rows.append({
            "D6_k": k,
            "capacity_piece": piece,
            "report": name,
            "report_sha256": actual[name],
            "native_order_scope": report["order_scope"],
            "minimum": report["minimum"],
            "minimum_index": report["minimum_index"],
        })
    assert set(reports) == {(1, "lcross"), (7, "lcross"), (1, "ucap"), (7, "ucap")}
    assert aggregate == {
        "boxes": 4, "coefficients": 9_253_764,
        "negative": 0, "zero": 0, "positive": 9_253_764,
    }

    payload = {
        "schema": "rank8-delta2-attachment-floor-n35plus-assembled-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_TERMINAL_GATE_FOR_ALL_ROOTED_TREES_N35_PLUS",
        "theorem": (
            "For every rooted tree core of order n>=35, the rank-eight terminal "
            "Delta2 residual is nonnegative throughout the exact rank-six defect "
            "interval and root-capacity polygon."
        ),
        "logical_bridge": [
            "The exact structural reduction is concave across the rank-six defect interval, leaving k=1 and k=7.",
            "The root polygon reduces to lower-cross and upper-capacity paths plus their endpoints.",
            "The attachment-incidence theorem excludes the h7=0 face for n>=35.",
            "The four exact tensors cover both live paths at both defect endpoints; three hold already for n>=28 and the final k=1 lower-cross tensor holds for n>=35.",
        ],
        "tensor_rows": rows,
        "aggregate": aggregate,
        "remaining_finite_band": "orders 28 through 34 for k=1 lower-cross only",
        "proof_boundary": (
            "This closes the reduced Delta2 terminal gate only for n>=35. "
            "Orders 28..34 and other global rank-eight obligations remain separate."
        ),
        "pinned_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"])
    print("BOXES", aggregate["boxes"], "COEFFICIENTS", aggregate["coefficients"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
