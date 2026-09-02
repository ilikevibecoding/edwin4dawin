#!/usr/bin/env python3
"""Fail-closed all-target assembly for marked-isolate diameter<=3 trees."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "terminal_q3_m0_marked_isolate_diameter_le3_tree_all_j_"
    "assembled_exact_root_20260831.json"
)
NOTE = HERE / (
    "TERMINAL_Q3_M0_MARKED_ISOLATE_DIAMETER_LE3_TREE_ALL_J_ROOT_"
    "2026-08-31.md"
)
MARKER = (
    "PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_"
    "DIAMETER_LE3_TREE_ASSEMBLY_ROOT"
)

PINS = {
    "j3_source": (
        "prove_terminal_q3_m0_marked_isolate_j3_all_order_root.py",
        "8D39EE9ECDD3075053833C14B4A4ACCEADFB7174AC92C64D0F375826CCD6B558",
    ),
    "j3_report": (
        "terminal_q3_m0_marked_isolate_j3_all_order_exact_root_20260831.json",
        "0E9D2C9F7338A87645D4EF3BE00008F6370C8B77084A823D451F84C0F08EDCBD",
    ),
    "star_source": (
        "prove_terminal_q3_m0_marked_isolate_star_all_j_root.py",
        "E65C21751E87BABB173596E1A589F8B136BC8832B588460DEC180028B00C684D",
    ),
    "star_report": (
        "terminal_q3_m0_marked_isolate_star_all_j_exact_root_20260831.json",
        "3C599579985E7B6CCC94AFC0CE0AD247EE14B104933772346CEE79C41F8803DA",
    ),
    "small1_source": (
        "prove_terminal_q3_m0_marked_isolate_subdivided_star_all_j_root.py",
        "2941BBF812AF08B29A7E5720B44E990F4D1281C881DE5976D6FD284993661B31",
    ),
    "small1_report": (
        "terminal_q3_m0_marked_isolate_subdivided_star_all_j_exact_root_20260831.json",
        "8717CB21FF4F5793C03DB2A5B35A254ADAA6F899D9BB76F79E3BEDE9BDE46800",
    ),
    "small2_source": (
        "prove_terminal_q3_m0_marked_isolate_double_star_small2_all_j_root.py",
        "202715083AF3682B1CE69D636D3F4C5F853FC9BD768338A8582A8AF0FB85E856",
    ),
    "small2_report": (
        "terminal_q3_m0_marked_isolate_double_star_small2_all_j_exact_root_20260831.json",
        "8126702C15E146B11B9441128E7FB9AD84F5960801A2C3B458467BB2BF8BCE08",
    ),
    "middle_source": (
        "prove_terminal_q3_m0_marked_isolate_double_star_middle_all_order_root.py",
        "9906FF5C4C41B5E89C967035965FFC864E0B48BC31B4076CCD17AC34B3940EE3",
    ),
    "middle_report": (
        "terminal_q3_m0_marked_isolate_double_star_middle_all_order_exact_root_20260831.json",
        "97097960FE972AC301086BC6BB82F46F448F79865FF98C00279E1D6633C44FEC",
    ),
    "tail_source": (
        "prove_terminal_q3_m0_marked_isolate_double_star_tail_all_order_root.py",
        "244D2C97D151DD4232DAD69036402C025388B4B4F6BF0816787A7C4FB0B2670B",
    ),
    "tail_report": (
        "terminal_q3_m0_marked_isolate_double_star_tail_all_order_exact_root_20260831.json",
        "FB7B61A4FD9D8E3EC4414EE5EB271F5DE1B537D46A4431CAF25AF0031276076F",
    ),
}

EXPECTED = {
    "j3_report": "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_M0_MARKED_ISOLATE_J3_ROOT",
    "star_report": "PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_STAR_ROOT",
    "small1_report": "PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_SUBDIVIDED_STAR_ROOT",
    "small2_report": "PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_DOUBLE_STAR_SMALL2_ROOT",
    "middle_report": "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_M0_MARKED_ISOLATE_DOUBLE_STAR_MIDDLE_ROOT",
    "tail_report": "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_M0_MARKED_ISOLATE_DOUBLE_STAR_TAIL_ROOT",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    observed = {}
    for label, (name, expected_hash) in PINS.items():
        actual_hash = sha256(HERE / name)
        assert actual_hash == expected_hash, (label, expected_hash, actual_hash)
        observed[label] = {"file": name, "sha256": actual_hash}

    reports = {}
    for label, expected_status in EXPECTED.items():
        name = PINS[label][0]
        report = json.loads((HERE / name).read_text(encoding="utf-8"))
        assert report["status"] == expected_status
        assert report["coverage_gap_within_scope"] is None
        source_label = label.replace("_report", "_source")
        assert report["source_sha256"] == PINS[source_label][1]
        reports[label] = report

    report = {
        "status": MARKER,
        "theorem": (
            "For terminal-q3 Newton degree m=0 with an isolated marked root "
            "and the mandatory terminal leaf, if the no-isolate connected "
            "remainder is any tree of diameter at most three, then the exact "
            "payment margin is nonnegative for every supported target j>=3."
        ),
        "classification": (
            "A connected tree of diameter at most two is a star K_(1,L). "
            "A connected tree of diameter three is uniquely a sorted double "
            "star D_(a,b) with a>=b>=1."
        ),
        "exhaustive_partition": [
            {
                "domain": "target j=3, every remainder",
                "certificate": EXPECTED["j3_report"],
            },
            {
                "domain": "star remainder (diameter<=2), every supported j>=3",
                "certificate": EXPECTED["star_report"],
            },
            {
                "domain": "double star D_(a,1), every supported j>=3",
                "certificate": EXPECTED["small1_report"],
            },
            {
                "domain": "double star D_(a,2), every supported j>=3",
                "certificate": EXPECTED["small2_report"],
            },
            {
                "domain": "double star D_(a,b), a>=b>=3, 4<=j<=b+2",
                "certificate": EXPECTED["middle_report"],
            },
            {
                "domain": "double star D_(a,b), a>=b>=2, j>=b+3",
                "certificate": EXPECTED["tail_report"],
            },
        ],
        "logical_exhaustion": (
            "For j=3 use the arbitrary-forest boundary.  For j>=4, a "
            "diameter-three tree has smaller side b=1, b=2, or b>=3. "
            "The first two are complete all-target theorems.  If b>=3, "
            "exactly one of j<=b+2 or j>=b+3 holds, with no missing integer "
            "target. Stars are a separate complete diameter-two class."
        ),
        "component_replay": {
            "star": "dual byte-identical",
            "small_side_1": "dual byte-identical",
            "small_side_2": "dual byte-identical",
            "middle": "dual byte-identical",
            "tail": "dual byte-identical",
        },
        "coverage_gap_within_scope": None,
        "scope_guard": (
            "This closes connected remainder trees of diameter at most three "
            "in the isolated-marked-root m=0 lane. Disconnected remainders, "
            "trees of diameter at least four, other forests, nonisolated "
            "marked roots, the complete terminal payment, and Erdos Problem "
            "993 remain separate."
        ),
        "pins": observed,
        "note": NOTE.name,
        "note_sha256": sha256(NOTE),
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(json.dumps({
        "status": MARKER,
        "partition_cells": len(report["exhaustive_partition"]),
        "coverage_gap_within_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
