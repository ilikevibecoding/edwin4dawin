#!/usr/bin/env python3
"""Fail-closed assembler for the all-order e=1 Delta0/1/3 theorem."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
EXPECTED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "probe_rank8_delta2_e1_symbolic_cell.py":
        "C04F538FB8AFDDC75088FDB89FF610806955CA5ADC316D53C604F3E2703D74F1",
    "verify_rank8_delta013_e1_center_all_order.py":
        "34119F4E4943F6E7DB6A718AEA3ECD8EA65B1BD9A92C614590E459D55E5456F9",
    "rank8_delta013_e1_center_all_order_exact_20260820.json":
        "F201A416F83EA69B77A336429F62034B2F564BB9CB26E9AB1659B96554CFE89D",
    "run_rank8_delta013_e1_arm_short_long_cells.py":
        "5F02F7CC7CCF3F573D97BD2955B7FF08C20C7AFCB8BCB5EAF75C549DAFAAEDC0",
    "rank8_delta013_e1_arm_short_long_0long_exact_20260820.json":
        "2AB267FDBB419B8A7CEFE259C33EC8931A125E33FBCE8E9461D85D971E6300C2",
    "rank8_delta013_e1_arm_short_long_1long_exact_20260820.json":
        "DEA20489D9297264DB483C36CE8CA11DB7CEA789190ACD95A6A5D5BEDE3CCE68",
    "rank8_delta013_e1_arm_short_long_2long_exact_20260820.json":
        "F8DAA76E77A4DB4C3EA5E6C854ACC0216E8D75EB2E3F6D871322A9553A709149",
    "rank8_delta013_e1_arm_short_long_3long_exact_20260820.json":
        "D717F5B0B0BBB784017E0F3CB3EBE045730ECB9BFBA6A00BA21C20A20393F199",
    "verify_rank8_delta013_e1_arm_all_long.py":
        "793504822A0A7E60584D87EB21E886956ABB23A99E934730FD9270336CD071DB",
    "rank8_delta013_e1_arm_all_long_exact_20260820.json":
        "8BF8182DE7234C20C56B673420FC30C7918C88C0CD6B0187DC6B793B224F1552",
    "probe_rank8_delta013_e1_leaf_extension.py":
        "EA9B7EC1718A75BE998EB64D992B53259673894D52ED0162462F69DF528DE928",
    "rank8_delta013_e1_leaf_extension_scout_exact_20260820.json":
        "0A42BE021839AD377DCFAE8AC5E024A2E2D1B19AD02F777C8804ED76F22B8D10",
    "rank8_delta2_e1_all_order_exact_20260820.json":
        "755DBEBDF4D0F43E6C7C6FD4A999443BAB5410F977F4741933FF63DC3B8D1F3E",
    "rank8_delta2_e1_all_order_independent_audit_exact_20260820.json":
        "6E51683EB933CAD94B2E1EFA4E054476FAC097B2F0E99A4FC47D8EB0B2035FE3",
}
RANKS = (0, 1, 3)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def state_order(value: int | str) -> int:
    return 7 if value == "L" else int(value)


def expected_patterns(long_count: int):
    other = [*range(1, 7), "L"]
    for near in [*range(0, 7), "L"]:
        for tail in [*range(0, 7), "L"]:
            for index, b in enumerate(other):
                for cc in other[index:]:
                    pattern = (near, tail, b, cc)
                    if pattern.count("L") == long_count:
                        yield pattern


def audit_rank_row(row: dict) -> None:
    assert row["negative_coefficients"] == 0
    assert row["zero_coefficients"] == 0
    assert row["nonpositive_constant"] == 0
    assert Fraction(row["minimum_coefficient"]) > 0
    assert Fraction(row["constant_coefficient"]) > 0


def audit_batch(report: dict, long_count: int) -> tuple[int, int]:
    assert report["status"] == "PASS_EXACT_POSITIVE_COEFFICIENT_CELLS"
    assert report["ranks"] == list(RANKS)
    assert report["long_segment_count"] == long_count
    universe = list(expected_patterns(long_count))
    relevant = []
    irrelevant = []
    for pattern in universe:
        base = sum(state_order(value) for value in pattern)
        if long_count == 0 and base < 21:
            irrelevant.append(pattern)
        else:
            relevant.append(pattern)
    actual = {tuple(row["pattern_near_tail_b_c"]): row for row in report["patterns"]}
    assert len(actual) == len(report["patterns"])
    assert set(actual) == set(relevant)
    assert report["patterns_checked"] == len(relevant)
    assert report["irrelevant_fixed_patterns_below_n23"] == len(irrelevant)

    total_cells = 0
    for pattern in relevant:
        row = actual[pattern]
        base = sum(state_order(value) for value in pattern)
        threshold = max(0, 21 - base)
        coordinates = [
            name
            for name, state in zip(("near", "tail", "b", "c"), pattern)
            if state == "L"
        ]
        if not coordinates or threshold == 0:
            expected_cells = {(None, 0)}
            cover_threshold = 0
        else:
            cover_threshold = math.ceil(threshold / len(coordinates))
            representatives = [
                name
                for name in coordinates
                if name != "c" or "b" not in coordinates
            ]
            expected_cells = {(name, cover_threshold) for name in representatives}
        assert {(cell["shifted_coordinate"], cell["shift"]) for cell in row["cells"]} == expected_cells
        assert row["base_segment_sum"] == base
        assert row["order_constraint_on_long_offsets"] == threshold
        assert row["cover_coordinate_threshold"] == cover_threshold
        for cell in row["cells"]:
            assert set(cell["ranks"]) == {str(rank) for rank in RANKS}
            for rank in RANKS:
                audit_rank_row(cell["ranks"][str(rank)])
        total_cells += len(row["cells"])
    assert total_cells == report["symbolic_cells_checked"]
    assert report["bad_rank_cell_count"] == 0 and report["bad_cells"] == []
    return len(relevant), total_cells


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual_hashes == EXPECTED

    center = load("rank8_delta013_e1_center_all_order_exact_20260820.json")
    assert center["status"] == "PASS_EXACT_RANK8_DELTA013_E1_CENTER_ROOT_ALL_N23_PLUS"
    assert center["no_gap"] == {
        "three_long": 1,
        "two_long_one_short": 6,
        "one_long_two_short_unordered": 21,
        "zero_long": "impossible for n>=23",
        "total_symbolic_cells": 28,
    }
    assert len(center["cells"]) == 28
    for cell in center["cells"]:
        assert set(cell["ranks"]) == {str(rank) for rank in RANKS}
        for rank in RANKS:
            row = cell["ranks"][str(rank)]
            assert row["negative_coefficients"] == 0
            assert row["zero_coefficients"] == 0
            assert Fraction(row["minimum_coefficient"]) > 0
            assert Fraction(row["constant_coefficient"]) > 0

    batch_counts = {}
    pattern_total = 0
    cell_total = 0
    for long_count in range(4):
        report = load(
            f"rank8_delta013_e1_arm_short_long_{long_count}long_exact_20260820.json"
        )
        patterns, cells = audit_batch(report, long_count)
        batch_counts[str(long_count)] = {
            "patterns": patterns,
            "symbolic_cells": cells,
        }
        pattern_total += patterns
        cell_total += cells

    all_long = load("rank8_delta013_e1_arm_all_long_exact_20260820.json")
    assert all_long["status"] == "PASS_EXACT_RANK8_DELTA013_E1_ARM_ALL_FOUR_SEGMENTS_LONG"
    assert set(all_long["ranks"]) == {str(rank) for rank in RANKS}
    for rank in RANKS:
        row = all_long["ranks"][str(rank)]
        assert row["negative_coefficients"] == 0
        assert row["zero_coefficients"] == 0
        assert Fraction(row["minimum_coefficient"]) > 0
        assert Fraction(row["constant_coefficient"]) > 0
    batch_counts["4"] = {"patterns": 1, "symbolic_cells": 1}
    pattern_total += 1
    cell_total += 1
    assert batch_counts == {
        "0": {"patterns": 24, "symbolic_cells": 24},
        "1": {"patterns": 588, "symbolic_cells": 588},
        "2": {"patterns": 154, "symbolic_cells": 205},
        "3": {"patterns": 20, "symbolic_cells": 20},
        "4": {"patterns": 1, "symbolic_cells": 1},
    }
    assert pattern_total == 787 and cell_total == 838

    scout = load("rank8_delta013_e1_leaf_extension_scout_exact_20260820.json")
    assert scout["status"] == "PASS_EXACT_SCOUT_RANK8_DELTA013_E1_LEAF_EXTENSION_ORDERS_23_35"
    assert scout["base_order_23"]["rooted_cases"] == 920
    assert all(int(value) > 0 for value in scout["base_order_23"]["minimum_values"].values())

    delta2 = load("rank8_delta2_e1_all_order_exact_20260820.json")
    delta2_audit = load("rank8_delta2_e1_all_order_independent_audit_exact_20260820.json")
    assert delta2["status"] == "PASS_EXACT_RANK8_DELTA2_E1_ALL_ORDER_N23_PLUS"
    assert delta2_audit["status"] == "PASS_INDEPENDENT_STRUCTURAL_AUDIT_RANK8_DELTA2_E1_ALL_ORDER"

    payload = {
        "schema": "rank8-delta013-e1-all-order-v1",
        "status": "PASS_EXACT_RANK8_DELTA013_E1_ALL_ORDER_N23_PLUS",
        "immutable_input_hashes": actual_hashes,
        "classification": "e=1 iff the tree is a subdivided claw with three positive arms; every root is the center or has segments near,tail>=0 and two other positive arms",
        "center_root_certificate": {"symbolic_cells": 28},
        "arm_root_certificate": {
            "short_long_patterns": pattern_total,
            "positive_symbolic_cells": cell_total,
            "by_number_of_long_segments": batch_counts,
            "no_gap": "near/tail are 0..6 or X+7; other arms are 1..6 or X+7; n>=23 is segment-sum>=21; any positive long-offset sum is covered by shifting every nonsymmetric coordinate representative by ceil(T/m), with b/c permutation symmetry",
        },
        "exact_n23_control": scout["base_order_23"],
        "theorem": "Delta^j R_1>0 for j=0,1,3 on every rooted tree core A of order n>=23 with degree surplus e=sum_v binom(deg(v)-1,2)=1",
        "combined_with_Delta2": "The independently audited Delta2 e=1 theorem closes all four pending ranks Delta0..Delta3 on this layer.",
        "scope_guard": "This closes only the e=1 layer. The layers e>=2 and global connected Q8 remain outside this theorem.",
    }
    output = HERE / "rank8_delta013_e1_all_order_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("arm_patterns", pattern_total)
    print("arm_symbolic_cells", cell_total)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
