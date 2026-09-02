#!/usr/bin/env python3
"""Fail-closed assembler for the all-order e=1 Delta2 theorem."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path


HERE = Path(__file__).resolve().parent
EXPECTED = {
    "verify_rank8_q8_terminal_reduction.py": "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "probe_rank8_delta2_e1_symbolic_cell.py": "C04F538FB8AFDDC75088FDB89FF610806955CA5ADC316D53C604F3E2703D74F1",
    "verify_rank8_delta2_e1_subdivided_claw.py": "76D2D0871041E84AFE6C1839D27DE2602B3FCBDEEE33C94190FA242EBBB28CB7",
    "rank8_delta2_e1_subdivided_claw_exact_20260820.json": "DD8267EE2779408CC7D6D0333AABB20390282A49D5ABC70C716B16219AC8EF6C",
    "verify_rank8_delta2_e1_center_all_order.py": "8D2C88C78AA9909E441AF4E5ACFD08083E00CC2EC15C7FD94719770257AAA958",
    "rank8_delta2_e1_center_all_order_exact_20260820.json": "E59852D1F2647C975302133501DE19FFB3FED922BC5DDB10BA07F36356599B6F",
    "run_rank8_delta2_e1_arm_short_long_cells.py": "29884626B28507DA01208D5C67F22EB41A31F132C3543CB1E3967ABFAAD40014",
    "rank8_delta2_e1_arm_short_long_0long_exact_20260820.json": "38B9C3640EDEF3CC970F01EC9BDD568E27D7A234802437DBD74C00B70214C687",
    "rank8_delta2_e1_arm_short_long_1long_exact_20260820.json": "9698A27B11C1F327BA8911DACD42868358A893EE6B581BAE73EB55B60B807547",
    "rank8_delta2_e1_arm_short_long_2long_exact_20260820.json": "1FD79D647090CAAF87B9217A9766A74E5C55D75789E369C66F9146814AC2A3A5",
    "rank8_delta2_e1_arm_short_long_3long_exact_20260820.json": "EF5ED4D529BC7C49547F8B04F0E527422E1EE8F5C81D08F5EFAC7937B7F79498",
    "rank8_delta2_e1_arm_short_long_4long_exact_20260820.json": "20F34B6423D64B2307E4224A7BBFA6EA7C82E28E6D07267C108F10A158B5B902",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def positive(value: str) -> bool:
    return Fraction(value) > 0


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


def audit_batch(report: dict, long_count: int) -> tuple[int, int]:
    assert report["status"] == "PASS_POSITIVE_COEFFICIENT_CELLS"
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
        coordinates = [name for name, state in zip(("near", "tail", "b", "c"), pattern) if state == "L"]
        if not coordinates or threshold == 0:
            expected_cells = {(None, 0)}
            cover_threshold = 0
        else:
            cover_threshold = math.ceil(threshold / len(coordinates))
            representatives = [name for name in coordinates if name != "c" or "b" not in coordinates]
            expected_cells = {(name, cover_threshold) for name in representatives}
        actual_cells = {(cell["shifted_coordinate"], cell["shift"]) for cell in row["cells"]}
        assert actual_cells == expected_cells
        assert row["base_segment_sum"] == base
        assert row["order_constraint_on_long_offsets"] == threshold
        assert row["cover_coordinate_threshold"] == cover_threshold
        for cell in row["cells"]:
            assert cell["negative_coefficients"] == 0
            assert positive(cell["minimum_coefficient"])
            assert positive(cell["constant_coefficient"])
        total_cells += len(row["cells"])
    assert total_cells == report["symbolic_cells_checked"]
    assert report["negative_cell_count"] == 0 and report["negative_cells"] == []
    return len(relevant), total_cells


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual_hashes == EXPECTED

    n23 = load("rank8_delta2_e1_subdivided_claw_exact_20260820.json")
    assert n23["status"] == "PASS_EXACT_RANK8_DELTA2_E1_N23_ALL_ROOTED_ORBITS"
    assert n23["n23"]["unordered_arm_triples"] == 40
    assert n23["n23"]["rooted_orbits"] == 865
    assert n23["n23"]["negative_rooted_orbits"] == 0
    assert positive(n23["n23"]["minimum_Delta2"])

    center = load("rank8_delta2_e1_center_all_order_exact_20260820.json")
    assert center["status"] == "PASS_EXACT_RANK8_DELTA2_E1_CENTER_ROOT_ALL_N23_PLUS"
    assert center["no_gap"] == {
        "three_long": 1,
        "two_long_one_short": 6,
        "one_long_two_short_unordered": 21,
        "zero_long": "impossible for n>=23",
        "total_symbolic_cells": 28,
    }
    assert len(center["cells"]) == 28
    assert all(row["negative_coefficients"] == 0 for row in center["cells"])
    assert all(positive(row["minimum_coefficient"]) and positive(row["constant_coefficient"]) for row in center["cells"])

    batch_counts = {}
    pattern_total = 0
    cell_total = 0
    for long_count in range(5):
        report = load(f"rank8_delta2_e1_arm_short_long_{long_count}long_exact_20260820.json")
        patterns, cells = audit_batch(report, long_count)
        batch_counts[str(long_count)] = {"patterns": patterns, "symbolic_cells": cells}
        pattern_total += patterns
        cell_total += cells
    assert batch_counts == {
        "0": {"patterns": 24, "symbolic_cells": 24},
        "1": {"patterns": 588, "symbolic_cells": 588},
        "2": {"patterns": 154, "symbolic_cells": 205},
        "3": {"patterns": 20, "symbolic_cells": 20},
        "4": {"patterns": 1, "symbolic_cells": 1},
    }
    assert pattern_total == 787 and cell_total == 838

    payload = {
        "schema": "rank8-delta2-e1-all-order-v1",
        "status": "PASS_EXACT_RANK8_DELTA2_E1_ALL_ORDER_N23_PLUS",
        "immutable_input_hashes": actual_hashes,
        "classification": "e=1 iff the tree is a subdivided claw with three positive arms; a root is either the center or lies at a specified distance on one arm",
        "coefficient_parameterization": n23["exact_independence_parameterization"],
        "center_root_certificate": {"symbolic_cells": 28, "report": EXPECTED["rank8_delta2_e1_center_all_order_exact_20260820.json"]},
        "arm_root_certificate": {
            "short_long_patterns": pattern_total,
            "positive_symbolic_cells": cell_total,
            "by_number_of_long_segments": batch_counts,
            "no_gap": "near/tail are 0..6 or X+7; other arms are 1..6 or X+7; n>=23 is segment-sum>=21; positive order-sum constraints are covered by shifting every nonsymmetric coordinate representative by ceil(T/m), with b/c permutation symmetry",
        },
        "exact_n23_control": {
            "unordered_arm_triples": 40,
            "rooted_orbits": 865,
            "minimum_Delta2": n23["n23"]["minimum_Delta2"],
        },
        "theorem": "Delta^2 R_1>0 for every rooted tree core A of order n>=23 with degree surplus e=sum_v binom(deg(v)-1,2)=1",
        "scope_guard": "This closes only the e=1 layer of Delta2. The layers e>=2 and Delta0,Delta1,Delta3 remain outside this theorem.",
    }
    output = HERE / "rank8_delta2_e1_all_order_exact_20260820.json"
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("arm_patterns", pattern_total)
    print("arm_symbolic_cells", cell_total)
    print("source_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
