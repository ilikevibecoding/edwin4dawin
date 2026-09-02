#!/usr/bin/env python3
"""Independent key/constant audit of the six short-paired pendant packages."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

from audit_rank8_delta013_e2_double_claws_n23 import double_claw, path, multiply
from audit_rank8_delta2_e1_all_order import delta2


HERE = Path(__file__).resolve().parent
LONG = "L"
SOURCE = "run_rank8_delta2_e2_pendant_fixed_paired_far_bridge_long_cells.py"
REPORT = "rank8_delta2_e2_pendant_paired{paired}_far_bridge_long_cells_exact_20260820.json"
EXPECTED = {
    SOURCE: "2B60A76EB9C727712B40DA3FFA1AA5B311885081D0F5C96F6EFB35FF87594D29",
    REPORT.format(paired=1): "9BA9A2CF6623156AA13C6903CAACFD4E7CB4A4736F45E9EB0227FB6F4A577FC3",
    REPORT.format(paired=2): "0AAAE48EF9BD4EB3B2B20851EF0B0CC8A2B78F5DD131296167C1AE279353BE9F",
    REPORT.format(paired=3): "5C0F2AEE822B84536A6D0115E2EB295561AB23DE336784782AC6781E43EFBD6B",
    REPORT.format(paired=4): "90E7E9464E92F4966B1C06CFE7952DA21EF85522E76BC7F704690C8477CFAD06",
    REPORT.format(paired=5): "EAFE7F410C6638E1692B276BC54A669314E56D07AFA62AA6806915C4A80063E4",
    REPORT.format(paired=6): "1E084D94BDA6AD11C965BB747EEA937F9A70636DEFA8F460D448645C285AE223",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual_hashes == EXPECTED
    states = [0, 1, 2, 3, 4, 5, 6, LONG]
    expected_keys = {(near, tail) for near in states for tail in states}
    reports = {}
    constants_checked = 0

    for paired in range(1, 7):
        name = REPORT.format(paired=paired)
        payload = json.loads((HERE / name).read_text())
        assert payload["status"] == "PASS_EXACT_RANK8_DELTA2_E2_PENDANT_FIXED_PAIRED_FAR_BRIDGE_LONG"
        assert payload["paired_arm_length"] == paired
        assert payload["root_position_patterns"] == 64
        assert payload["positive_symbolic_cells"] == 64
        assert payload["signed_cells"] == []
        actual = {(row["near_state"], row["tail_state"]): row for row in payload["cells"]}
        assert set(actual) == expected_keys and len(actual) == 64

        for (near_state, tail_state), row in actual.items():
            near = 7 if near_state == LONG else int(near_state)
            tail = 7 if tail_state == LONG else int(tail_state)
            selected = near + tail + 1
            core = double_claw((selected, paired, 8, 7, 7))
            deletion = multiply(path(tail), double_claw((near, paired, 8, 7, 7)))
            literal = delta2(core, deletion)
            assert row["negative_coefficients"] == 0
            assert Fraction(row["minimum_coefficient"]) > 0
            assert literal == int(Fraction(row["constant_coefficient"])) > 0
            constants_checked += 1

        # Five suppressed lengths have sum at least 1+paired+8+7+7.
        # Therefore n=1+sum(lengths) is at least 24+paired >=25.
        assert 24 + paired >= 25
        reports[str(paired)] = {
            "near_tail_keys": len(actual),
            "independent_literal_constants_checked": len(actual),
        }

    payload = {
        "schema": "rank8-delta2-e2-pendant-short-paired-far-bridge-long-independent-audit-v1",
        "status": "PASS_INDEPENDENT_AUDIT_RANK8_DELTA2_E2_PENDANT_SHORT_PAIRED_FAR_BRIDGE_LONG",
        "immutable_input_hashes": EXPECTED,
        "paired_arm_lengths": [1, 2, 3, 4, 5, 6],
        "reports": reports,
        "total_no_gap_keys": 6 * len(expected_keys),
        "independent_literal_constants_checked": constants_checked,
        "scope": "selected pendant arm and root arbitrary; paired arm 1..6; two far arms >=7; bridge>=8",
        "order_guard": "every covered tree has order at least 24+paired >=25",
        "scope_guard": "this is not yet the full pendant-root e=2 family because short far arms or a bridge <=7 remain outside scope",
    }
    output = HERE / "rank8_delta2_e2_pendant_short_paired_far_bridge_long_independent_audit_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n")
    print(payload["status"])
    print("keys", payload["total_no_gap_keys"], "constants", constants_checked)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
