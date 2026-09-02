#!/usr/bin/env python3
"""Independent integration and partition audit of the complete mask-1 seal."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask1_complete_independent_audit_agent_20260823.json"

EXPECTED_ASSEMBLER = {
    "assemble_rank8_delta0_new_leaf_mask1_complete_agent.py": "392D03120ECDEDF5E20169485F018C915BC39D93DE9E5935949CD5520C03DEC2",
    "rank8_delta0_new_leaf_mask1_complete_agent_20260823.json": "86939F14C45B06B552BC3CDEAFF4B9906EAF859862FB249778E2638FFC5389E5",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def coordinate_set(report_name: str):
    report = load(report_name)
    return {(row["N"], row["r"], row["m"]) for row in report["rows"]}, report


def main() -> None:
    assembler_hashes = {name: sha256(HERE / name) for name in EXPECTED_ASSEMBLER}
    assert assembler_hashes == EXPECTED_ASSEMBLER, (assembler_hashes, EXPECTED_ASSEMBLER)
    master = load("rank8_delta0_new_leaf_mask1_complete_agent_20260823.json")
    assert master["status"] == "PASS_EXACT_INDEPENDENTLY_AUDITED_DELTA0_NEW_LEAF_MASK1_ALL_N_GE_27"
    manifest = master["dependency_manifest_sha256"]
    before = {name: sha256(HERE / name) for name in manifest}
    assert before == manifest

    low, low_report = coordinate_set("rank8_delta0_new_leaf_mask1_n26_39_r1_9_exact_agent_20260823.json")
    middle, middle_report = coordinate_set("rank8_delta0_new_leaf_mask1_n26_39_middle_exact_agent_20260823.json")
    small, small_report = coordinate_set("rank8_delta0_new_leaf_mask1_n26_39_m0_15_exact_agent_20260823.json")
    universe = {(N, r, N - r) for N in range(26, 40) for r in range(1, N + 1)}
    expected_low = {cell for cell in universe if cell[1] <= 9}
    expected_middle = {cell for cell in universe if cell[1] >= 10 and cell[2] >= 16}
    expected_small = {cell for cell in universe if cell[2] <= 15}
    assert low == expected_low and middle == expected_middle and small == expected_small
    assert (len(universe), len(low), len(middle), len(small)) == (455, 126, 105, 224)
    assert not (low & middle or low & small or middle & small)
    assert low | middle | small == universe
    assert low_report["open_cells"] == middle_report["open_cells"] == small_report["open_cells"] == []
    assert all(row["status"] == "SEALED" for row in low_report["rows"])
    assert all(row["status"] == "SEALED" for row in middle_report["rows"])
    assert all(row["status"] == "SEALED" for row in small_report["rows"])

    finite_audits = {
        "low": load("rank8_delta0_new_leaf_mask1_n26_39_r1_9_independent_audit_agent_20260823.json"),
        "middle": load("rank8_delta0_new_leaf_mask1_n26_39_middle_independent_audit_agent_20260823.json"),
        "small": load("rank8_delta0_new_leaf_mask1_n26_39_m0_15_independent_audit_agent_20260823.json"),
    }
    assert finite_audits["low"]["status"] == "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK1_N26_39_R1_9_ALL_126"
    assert finite_audits["middle"]["status"] == "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK1_N26_39_MIDDLE"
    assert finite_audits["small"]["status"] == "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK1_N26_39_M0_15_ALL_224"
    assert (finite_audits["low"]["cells"], finite_audits["middle"]["cells"], finite_audits["small"]["counts"]["cells"]) == (126, 105, 224)

    tail_reports = {
        "low": load("rank8_delta0_new_leaf_mask1_r1_9_tail_exact_agent_20260823.json"),
        "middle": load("rank8_delta0_new_leaf_mask1_quantitative_gap_tail_probe_agent_20260823.json"),
        "small": load("rank8_delta0_new_leaf_mask1_m0_15_tail_exact_agent_20260823.json"),
    }
    tail_audits = {
        "low": load("rank8_delta0_new_leaf_mask1_r1_9_tail_independent_audit_agent_20260823.json"),
        "middle": load("rank8_delta0_new_leaf_mask1_quantitative_gap_tail_independent_audit_agent_20260823.json"),
        "small": load("rank8_delta0_new_leaf_mask1_m0_15_tail_independent_audit_agent_20260823.json"),
    }
    assert tail_reports["low"]["open_rows"] == []
    assert tail_reports["middle"]["open_controls"] == 0
    assert tail_reports["small"]["open_cells"] == tail_reports["small"]["missing_tails"] == []
    assert tail_audits["low"]["status"].startswith("PASS_INDEPENDENT_LITERAL")
    assert tail_audits["middle"]["status"].startswith("PASS_INDEPENDENT_LITERAL")
    assert tail_audits["small"]["status"].startswith("PASS_INDEPENDENT_LITERAL")

    # Directly replay the logical partition over 500 additional orders. The
    # unbounded proof is the integer dichotomy encoded by the same predicates.
    logic_counts = {"low_r": 0, "middle": 0, "small_m": 0}
    for N in range(40, 540):
        for r in range(1, N + 1):
            m = N - r
            membership = {
                "low_r": r <= 9,
                "middle": r >= 10 and m >= 16,
                "small_m": m <= 15,
            }
            labels = [label for label, present in membership.items() if present]
            assert len(labels) == 1
            logic_counts[labels[0]] += 1

    after = {name: sha256(HERE / name) for name in manifest}
    assert after == before == manifest
    payload = {
        "schema": "rank8-delta0-new-leaf-mask1-complete-independent-audit-v1",
        "status": "PASS_INDEPENDENT_INTEGRATION_DELTA0_NEW_LEAF_MASK1_ALL_N_GE_27",
        "assembler_hashes": assembler_hashes,
        "dependency_manifest_sha256": manifest,
        "dependency_rehash_stable_within_run": True,
        "finite_partition": {
            "universe": len(universe),
            "low_r": len(low),
            "middle": len(middle),
            "small_m": len(small),
            "overlap": 0,
            "gap": 0,
        },
        "tail_logic_replay_N40_539": logic_counts,
        "unbounded_tail_logic": (
            "For r<=9 choose low-r. For r>=10, exactly one of m<=15 and "
            "m>=16 holds. Low-r and small-m cannot overlap at N>=40 because "
            "they imply N=r+m<=24."
        ),
        "proof_boundary": master["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("FINITE", payload["finite_partition"])
    print("DEPENDENCIES_REHASHED", len(manifest))
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
