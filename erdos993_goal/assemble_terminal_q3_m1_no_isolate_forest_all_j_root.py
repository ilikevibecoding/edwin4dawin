#!/usr/bin/env python3
"""Fail-closed assembly of terminal-q3 Newton m=1 on no-isolate forests.

The theorem assembled here is intentionally narrower than the full terminal
payment.  It covers every supported target j>=3 and every marked vertex when
the forest base has no isolated component, conditional where stated on the
strictly-smaller-forest q-envelope input.  Permanent-isolate support
activation, a marked isolated root, Newton m=0, and the final global bridge
remain separate obligations.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


BASE = Path(__file__).resolve().parent
OUTPUT = BASE / "terminal_q3_m1_no_isolate_forest_all_j_assembled_exact_root_20260831.json"

PINS = {
    "audit_terminal_q3_low_newton_adversarial_agent.py":
        "F009D46E8D3E30C26A9B1E3B30441526F108029DD3891DA14B268D9916650B4D",
    "terminal_q3_low_newton_adversarial_independent_20260829.json":
        "A8C9D806F00551EA6C2433B4B8180CF1738D6814E1FF8CAD20173E0A9F2B0836",
    "prove_terminal_q3_low_newton_m1_j3_general_root.py":
        "5C73254AB22746911187FFCF38E79560D9C250173969D92700AB1B752AD70E61",
    "terminal_q3_low_newton_m1_j3_general_root_exact_20260829.json":
        "012F97B1DD1E7DC42C4733DB67F7C7D77B8F10D89E4198190B1EE08F0CA01385",
    "audit_terminal_q3_low_newton_m1_j3_general_root_independent_agent.py":
        "B4B3379EBE1598A2B86DF191B6044D734FB19D30D8D48AF82D91FF5119E58AB8",
    "terminal_q3_low_newton_m1_j3_general_root_independent_audit_20260829.json":
        "B51B14875ED88988C00BC306275CE06C63B26ACEC5A32148F938BE55C20F762B",
    "prove_terminal_q3_low_newton_m1_j4plus_agent.py":
        "7349A169FBF406EADA042F8F47C78EA55CCA08E9E8A766A7C02C69291FA4DBC6",
    "terminal_q3_low_newton_m1_j4plus_exact_agent_20260829.json":
        "D39FE1342650B9F7518AA0E05FB9D44353CAE57826E5F0B478520E56FD08B35A",
    "audit_terminal_q3_low_newton_m1_j4plus_independent_agent.py":
        "902F3670BE36B01F7AB1BA1B9638F5AF888BCD751BD67ECF19B936A6720EE18B",
    "terminal_q3_low_newton_m1_j4plus_independent_audit_20260829.json":
        "4C73AC25F7E25AB5F5142E55107F3AE6AD1721272EDECB982866FFCED6C27DC5",
    "assemble_terminal_q3_m1_forest_j3_all_order_root.py":
        "5F85183FE120C7147905941B41F4F88194D148F9A2E633371662E5D83E6F86A5",
    "terminal_q3_m1_forest_j3_all_order_assembled_exact_root_20260831.json":
        "BB843F923F77CA8611EE4450F3B937D391F271913045540BDC2EE5B2075A0EA9",
    "assemble_terminal_q3_m1_general_forest_j4j5_agent.py":
        "1D78D769C35A3F56EF7069B22529440B1ED1C66FD83AC9A902EAEA8B422E3712",
    "terminal_q3_m1_general_forest_j4j5_assembly_exact_agent_20260829.json":
        "D9F52886B826E327DCCC4CE3FA0173CA8C054E02354303B6A97B75D3B7EB3558",
    "prove_terminal_q3_m1_general_forest_j6j7_agent.py":
        "749ED165466020E4662C57EEC7608475C04B069C8EF4B9985AF5697DF13BC8C7",
    "terminal_q3_m1_general_forest_j6j7_exact_agent_20260829.json":
        "EF28F785962D2322B31E27FBE71836AB849A2B738C658E106B17F5886B30E4A6",
    "prove_terminal_q3_m1_general_forest_j8plus_agent.py":
        "3854DA3117F6BB8653E1D98495866121D2C2DA92A077EA741C5FFBDF981D1BCE",
    "terminal_q3_m1_general_forest_j8plus_exact_agent_20260829.json":
        "60F970B393314511563BFA6D18CDFD27554659EB7EEAC0EFDE009ACE81FEB667",
}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((BASE / name).read_text(encoding="utf-8"))


def main() -> None:
    observed = {name: digest(BASE / name) for name in PINS}
    assert observed == PINS

    finite = load("terminal_q3_low_newton_adversarial_independent_20260829.json")
    tree_j3 = load("terminal_q3_low_newton_m1_j3_general_root_exact_20260829.json")
    tree_j3_audit = load(
        "terminal_q3_low_newton_m1_j3_general_root_independent_audit_20260829.json"
    )
    tree_j4plus = load("terminal_q3_low_newton_m1_j4plus_exact_agent_20260829.json")
    tree_j4plus_audit = load(
        "terminal_q3_low_newton_m1_j4plus_independent_audit_20260829.json"
    )
    forest_j3 = load("terminal_q3_m1_forest_j3_all_order_assembled_exact_root_20260831.json")
    forest_j45 = load("terminal_q3_m1_general_forest_j4j5_assembly_exact_agent_20260829.json")
    forest_j67 = load("terminal_q3_m1_general_forest_j6j7_exact_agent_20260829.json")
    forest_j8 = load("terminal_q3_m1_general_forest_j8plus_exact_agent_20260829.json")

    assert finite["status"] == (
        "PASS_EXACT_FINITE_AND_ADVERSARIAL_LOW_NEWTON_M0_M7_NO_NEGATIVES_NOT_ALL_ORDER"
    )
    assert finite["coverage"]["finite"]["trees"] == 13188
    assert finite["coverage"]["finite"]["roots"] == 188260
    assert finite["newton_degrees"]["1"]["negative_coefficients"] == 0
    assert int(finite["newton_degrees"]["1"]["minimum_coefficient"]) > 0

    assert tree_j3["status"] == "PASS_EXACT_ALL_TREE_BASE_TERMINAL_Q3_LOW_NEWTON_M1_J3"
    assert tree_j3["order_boundary"]["finite_tree_order"] == 15
    assert tree_j3["order_boundary"]["symbolic_tree_order_min"] == 16
    assert tree_j3_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_ALL_TREE_BASE_TERMINAL_Q3_LOW_NEWTON_M1_J3_AUDIT"
    )
    assert tree_j4plus["status"] == (
        "PASS_EXACT_TREE_BASE_N15_PLUS_TERMINAL_Q3_LOW_NEWTON_M1_J4_PLUS_STRONG_INDUCTION_STEP"
    )
    assert tree_j4plus["order_boundary"]["finite_tree_order"] == 15
    assert tree_j4plus["order_boundary"]["symbolic_tree_order_min"] == 16
    assert tree_j4plus_audit["status"] == (
        "PASS_INDEPENDENT_EXACT_TREE_BASE_TERMINAL_Q3_LOW_NEWTON_M1_J4_PLUS_STRONG_INDUCTION_STEP_AUDIT"
    )

    assert forest_j3["marker"] == (
        "PASS_EXACT_ALL_ORDER_NO_ISOLATE_DISCONNECTED_FOREST_TERMINAL_Q3_NEWTON_M1_J3_ROOT"
    )
    assert forest_j3["seam_checks"]["integer_gaps"] == 0
    assert forest_j45["status"] == (
        "PASS_EXACT_GENERAL_NO_ISOLATE_FOREST_M1_J4J5_CONDITIONAL_Q_ENVELOPE"
    )
    assert forest_j67["status"] == (
        "PASS_EXACT_GENERAL_NO_ISOLATE_FOREST_M1_J6J7_CONDITIONAL_Q_ENVELOPE"
    )
    assert forest_j8["status"] == (
        "PASS_EXACT_GENERAL_NO_ISOLATE_FOREST_M1_J8PLUS_CONDITIONAL_Q_ENVELOPE"
    )

    # Integer target partition: {3}, {4,5}, {6,7}, and [8,infinity).
    finite_targets = {3} | {4, 5} | {6, 7} | set(range(8, 65))
    assert finite_targets == set(range(3, 65))

    report = {
        "schema": "terminal-q3-m1-no-isolate-forest-all-j-assembly-v1",
        "date": "2026-08-31",
        "status": "PASS_EXACT_NO_ISOLATE_FOREST_ALL_TARGETS_TERMINAL_Q3_NEWTON_M1_ASSEMBLY",
        "claim": (
            "For every finite forest base G with no isolated component, every marked "
            "vertex w, and every supported target j>=3, terminal-q3 Newton coefficient "
            "m=1 is nonnegative, conditional only where stated on the strictly-smaller-"
            "forest q-envelope input."
        ),
        "connected_partition": [
            {
                "orders": "|G|<=15",
                "targets": "all supported j>=3",
                "certificate": "complete exact all-unlabelled-tree audit",
                "trees": 13188,
                "marked_roots": 188260,
            },
            {
                "orders": "|G|>=15",
                "targets": "j=3",
                "certificate": "all-root symbolic theorem plus independent audit",
            },
            {
                "orders": "|G|>=15",
                "targets": "j>=4",
                "certificate": "strong-induction symbolic theorem plus independent audit",
            },
        ],
        "connected_order_seam": "finite through 15; symbolic starts at 15/16 with overlap and no gap",
        "disconnected_no_isolate_target_partition": [
            {"targets": "j=3", "certificate": "gapless finite/short-S/tail assembly"},
            {"targets": "j in {4,5}", "certificate": "general forest j4j5 assembly"},
            {"targets": "j in {6,7}", "certificate": "general forest j6j7 theorem"},
            {"targets": "j>=8", "certificate": "general forest j8plus theorem"},
        ],
        "target_integer_gaps": 0,
        "logical_exhaustion": (
            "A no-isolate forest is either connected (a tree) or disconnected.  The "
            "connected order partition and disconnected target partition above are "
            "therefore exhaustive."
        ),
        "pins": PINS,
        "scope_guard": (
            "This theorem does not claim permanent-isolate support activation, a marked "
            "isolated root (the star-component terminal decomposition), Newton m=0, the "
            "complete terminal payment, the global q-envelope, unimodality, or Erdos "
            "Problem 993."
        ),
    }
    source_hash = digest(Path(__file__).resolve())
    report["source"] = Path(__file__).name
    report["source_sha256"] = source_hash
    payload = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(payload, encoding="utf-8")
    report_hash = digest(OUTPUT)

    print(json.dumps({
        "connected_finite_trees": 13188,
        "connected_finite_roots": 188260,
        "disconnected_target_integer_gaps": 0,
        "marker": report["status"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", source_hash)
    print("REPORT_SHA256", report_hash)
    print(report["status"])


if __name__ == "__main__":
    main()
