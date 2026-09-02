#!/usr/bin/env python3
"""Fail-closed all-target assembly for hub-distance-three double brooms."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "terminal_q3_m0_marked_isolate_hub_distance3_double_broom_all_j_"
    "assembled_exact_root_20260831.json"
)
NOTE = HERE / (
    "TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE3_DOUBLE_BROOM_ALL_J_"
    "ASSEMBLY_ROOT_2026-08-31.md"
)
MARKER = (
    "PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_"
    "HUB_DISTANCE3_DOUBLE_BROOM_ASSEMBLY_ROOT"
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
    "middle_source": (
        "prove_terminal_q3_m0_marked_isolate_hub_distance3_"
        "double_broom_middle_all_order_root.py",
        "A50EFB7E8342001C61FA6E2096E6B6514810995E4A3385ABC502C3F21ABAB0FF",
    ),
    "middle_report": (
        "terminal_q3_m0_marked_isolate_hub_distance3_double_broom_middle_"
        "all_order_exact_root_20260831.json",
        "13141C25B005355874D061C94327B7F314B50BD97897A5240981D90093C8923F",
    ),
    "tail_source": (
        "prove_terminal_q3_m0_marked_isolate_hub_distance3_"
        "double_broom_tail_all_order_root.py",
        "20B8A1D69AFA92C1103B9F7792948A1AEE17E9E8C83E1262AB3C5F36A7F45E1E",
    ),
    "tail_report": (
        "terminal_q3_m0_marked_isolate_hub_distance3_double_broom_tail_"
        "all_order_exact_root_20260831.json",
        "AF51011F85772AA8A066DFF8961DE25FAC479D348C66C4A82434775D49B21BFC",
    ),
}

EXPECTED = {
    "j3_report": "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_M0_MARKED_ISOLATE_J3_ROOT",
    "middle_report": (
        "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_M0_MARKED_ISOLATE_"
        "HUB_DISTANCE3_DOUBLE_BROOM_MIDDLE_ROOT"
    ),
    "tail_report": (
        "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_M0_MARKED_ISOLATE_"
        "HUB_DISTANCE3_DOUBLE_BROOM_TAIL_ROOT"
    ),
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

    exhaustive_partition = [
        {
            "domain": "j=3, every a>=b>=1",
            "certificate": EXPECTED["j3_report"],
        },
        {
            "domain": "b=1, every supported j>=4",
            "certificate": EXPECTED["tail_report"],
        },
        {
            "domain": "b>=2, 4<=j<=b+2",
            "certificate": EXPECTED["middle_report"],
        },
        {
            "domain": "b>=2, j>=b+3",
            "certificate": EXPECTED["tail_report"],
        },
    ]
    report = {
        "status": MARKER,
        "theorem": (
            "For terminal-q3 Newton degree m=0 with an isolated marked root "
            "and the mandatory terminal leaf, if the connected no-isolate "
            "remainder is a sorted double broom T_(a,b,3) whose two hubs are "
            "at distance three and a>=b>=1, then the exact payment margin is "
            "nonnegative for every supported target j>=3."
        ),
        "classification": (
            "The target j=3 is universal. If b=1, every j>=4 lies in the "
            "tail j>=b+3. If b>=2, exactly one of 4<=j<=b+2 and j>=b+3 "
            "holds for every integer target j>=4."
        ),
        "exhaustive_partition": exhaustive_partition,
        "logical_exhaustion": (
            "The inequalities j<=b+2 and j>=b+3 are complementary on "
            "integers, and the b=1 boundary starts the tail at j=4."
        ),
        "component_replay": {
            "j3": "dual byte-identical",
            "middle": "dual byte-identical",
            "tail": "dual byte-identical",
        },
        "coverage_gap_within_scope": None,
        "scope_guard": (
            "This closes one connected hub-distance-three remainder family "
            "in the isolated-marked-root m=0 lane. Arbitrary diameter-four "
            "or larger trees, disconnected remainders, nonisolated marked "
            "roots, the complete terminal payment, and Erdos Problem 993 "
            "remain separate."
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
        "partition_cells": len(exhaustive_partition),
        "coverage_gap_within_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", sha256(OUTPUT))
    print(MARKER)


if __name__ == "__main__":
    main()
