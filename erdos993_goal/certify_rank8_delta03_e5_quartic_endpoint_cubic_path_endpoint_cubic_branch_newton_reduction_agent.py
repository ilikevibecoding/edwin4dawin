#!/usr/bin/env python3
"""Exact transfer/Newton reduction for the e=5 endpoint-cubic root orbit."""

from __future__ import annotations

import hashlib
import itertools
import json
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_newton_reduction_exact_agent_20260823.json"
EXPECTED = {
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json": "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "certify_rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_newton_reduction_agent.py": "194215385B124CEAEAC698C21B2E22B5D20A2D9ECDE3501F2C5934D8343972B0",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_newton_reduction_exact_agent_20260823.json": "F94CFF3557CFA4AA1E3F7FDDA89125420570ED3D50438B0AA20C51E03FDFA55E",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def convolve(*factors: Counter[tuple[int, int]]) -> Counter[tuple[int, int]]:
    total = Counter({(0, 0): 1})
    for factor in factors:
        out = Counter()
        for (a, x), ac in total.items():
            for (b, y), bc in factor.items():
                out[(a + b, x + y)] += ac * bc
        total = out
    return total


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}; assert actual == EXPECTED
    universal = json.loads((ROOT / "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_newton_reduction_exact_agent_20260823.json").read_text(encoding="utf-8"))
    assert universal["status"] == "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_CENTER_CUBIC_BRANCH_TRANSFER_NEWTON_REDUCTION"
    assert universal["graded_path_transfer"]["literal_pair_checks"] == 4_536
    assert universal["degree_bounds"] == {"0": {"terms": 15, "degree_bound": 28}, "1": {"terms": 18, "degree_bound": 28}, "2": {"terms": 22, "degree_bound": 27}, "3": {"terms": 26, "degree_bound": 26}}
    assert universal["integer_newton_matrix_determinant"] == 1

    endpoint_guards = []
    for root_selected, middle_selected, quartic_selected in itertools.product((0, 1), repeat=3):
        cap = 8 - root_selected - middle_selected - quartic_selected
        effective = {
            "root_endpoint_pendant_0": 7 - root_selected,
            "root_endpoint_pendant_1": 7 - root_selected,
            "root_middle_spine": 8 - root_selected - middle_selected,
            "middle_pendant": 7 - middle_selected,
            "middle_quartic_spine": 8 - middle_selected - quartic_selected,
            "quartic_pendant_0": 7 - quartic_selected,
            "quartic_pendant_1": 7 - quartic_selected,
            "quartic_pendant_2": 7 - quartic_selected,
        }
        assert min(effective.values()) >= cap - 1
        endpoint_guards.append({"polynomial": "core", "root_endpoint_selected": bool(root_selected), "middle_selected": bool(middle_selected), "quartic_selected": bool(quartic_selected), "rank_cap": cap, "effective_long_path_orders": effective})
    for middle_selected, quartic_selected in itertools.product((0, 1), repeat=2):
        cap = 7 - middle_selected - quartic_selected
        effective = {
            "root_endpoint_pendant_0": 6,
            "root_endpoint_pendant_1": 6,
            "root_middle_spine": 7 - middle_selected,
            "middle_pendant": 7 - middle_selected,
            "middle_quartic_spine": 8 - middle_selected - quartic_selected,
            "quartic_pendant_0": 7 - quartic_selected,
            "quartic_pendant_1": 7 - quartic_selected,
            "quartic_pendant_2": 7 - quartic_selected,
        }
        assert min(effective.values()) >= cap - 1
        endpoint_guards.append({"polynomial": "root_deleted", "middle_selected": bool(middle_selected), "quartic_selected": bool(quartic_selected), "rank_cap": cap, "effective_long_path_orders": effective})

    pendant = tuple((value, value == 7) for value in range(1, 8)); spine = tuple((value, value == 8) for value in range(1, 9))
    root_pairs = tuple(itertools.combinations_with_replacement(pendant, 2)); quartic_triples = tuple(itertools.combinations_with_replacement(pendant, 3))
    pair_distribution = Counter((sum(x[0] for x in row), sum(int(x[1]) for x in row)) for row in root_pairs)
    triple_distribution = Counter((sum(x[0] for x in row), sum(int(x[1]) for x in row)) for row in quartic_triples)
    pendant_distribution = Counter((value, int(long)) for value, long in pendant); spine_distribution = Counter((value, int(long)) for value, long in spine)
    distribution = convolve(pair_distribution, spine_distribution, pendant_distribution, spine_distribution, triple_distribution)
    counts = Counter(); order_distribution = Counter()
    for (stored_order, long_count), multiplicity in distribution.items():
        order = 1 + stored_order
        if long_count == 0:
            counts["all_short"] += multiplicity; order_distribution[order] += multiplicity
            if order == 27: counts["all_short_order27"] += multiplicity
            if order >= 28: counts["all_short_n28_plus"] += multiplicity
        elif long_count == 8: counts["all_long"] += multiplicity
        else: counts["mixed"] += multiplicity
    counts["coordinate_patterns"] = sum(distribution.values()); counts["non_all_short_rays"] = counts["mixed"] + counts["all_long"]; counts["n28_plus_records"] = counts["all_short_n28_plus"] + counts["non_all_short_rays"]
    assert len(root_pairs) == 28 and len(quartic_triples) == 84
    assert counts == Counter({"coordinate_patterns": 1_053_696, "mixed": 707_951, "non_all_short_rays": 707_952, "n28_plus_records": 941_680, "all_short": 345_744, "all_short_n28_plus": 233_728, "all_short_order27": 21_764, "all_long": 1})
    partition = json.loads((ROOT / "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json").read_text(encoding="utf-8"))
    orbit = next(row for row in partition["root_location_partitions"] if row["root_location_orbit"] == "quartic_endpoint_cubic_path:endpoint_cubic_branch")
    assert orbit["stabilizer_order"] == 12 and orbit["coordinate_patterns"] == counts["coordinate_patterns"]
    assert orbit["all_short_literal_patterns"] == counts["all_short"] and orbit["all_short_patterns_order27"] == counts["all_short_order27"] and orbit["all_short_patterns_n28_plus"] == counts["all_short_n28_plus"]
    assert orbit["mixed_long_short_patterns"] == counts["mixed"] and orbit["all_long_patterns"] == 1
    assert {int(k): v for k, v in orbit["all_short_order_distribution"].items()} == dict(sorted(order_distribution.items()))
    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-endpoint-cubic-branch-newton-reduction-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_ENDPOINT_CUBIC_BRANCH_TRANSFER_NEWTON_REDUCTION",
        "root_orbit": "quartic_endpoint_cubic_path:endpoint_cubic_branch",
        "quotient_formula": "root endpoint pendant pair C(8,2)=28 * root-middle spine 8 * middle pendant 7 * middle-quartic spine 8 * quartic pendant triple C(9,3)=84, total 1,053,696 keys",
        "canonical_coordinate_order": "root endpoint pendant low,high; root-middle spine; middle pendant; middle-quartic spine; quartic pendant low,middle,high",
        "order_formula": "n=1+sum(the eight stored edge lengths)", "quotient_counts": dict(counts),
        "all_short_order_distribution": {str(k): v for k, v in sorted(order_distribution.items())},
        "graded_path_transfer": {"universal_rows": universal["graded_path_transfer"]["rows"], "literal_pair_checks": 4_536, "endpoint_state_guards": endpoint_guards, "conclusion": "all long offsets enter core and root-deleted coefficients only through total S"},
        "degree_bounds": universal["degree_bounds"], "newton_gate": universal["newton_gate"], "integer_newton_matrix_determinant": 1,
        "order27_requirement": {"status": "OPEN_AT_REDUCTION_CREATION", "full_canonical_subdivisions_expected": 70_854, "all_short_order27_keys": counts["all_short_order27"]},
        "immutable_input_hashes": actual, "source_sha256": sha256(Path(__file__)), "scope_guard": "Reduction only; no full census or sign claim is made by this script.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"]); print("COUNTS", json.dumps(payload["quotient_counts"], sort_keys=True)); print("TRANSFER_LITERAL_CHECKS", 4_536); print("SOURCE", payload["source_sha256"]); print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
