#!/usr/bin/env python3
"""Exact transfer/Newton reduction for the e=5 endpoint-quartic branch root."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from collections import Counter
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_"
    "newton_reduction_exact_agent_20260823.json"
)
EXPECTED = {
    "verify_rank8_q8_terminal_reduction.py": "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json": "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_exact_agent_20260823.json": "9BC294C2738ACA7440BB1155D6C0684C7FE0AAD5BDADC835845799D85474D98E",
    "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_root_order27_independent_audit_agent_20260823.json": "DD9617A133237F67878E50FBFC723CF5B378E0EAB1995D69954EC213B21270F6",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def choose_poly(value, rank):
    return sp.prod(value - index for index in range(rank)) / sp.factorial(rank)


def path_count(order, rank):
    return choose_poly(order - rank + 1, rank)


def pair_count(left, right, rank):
    return sp.expand(sum(path_count(left, j) * path_count(right, rank - j) for j in range(rank + 1)))


def literal_path(order: int, rank: int) -> int:
    top = order - rank + 1
    return math.comb(top, rank) if top >= rank >= 0 else 0


def literal_pair(left: int, right: int, rank: int) -> int:
    return sum(literal_path(left, j) * literal_path(right, rank - j) for j in range(rank + 1))


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
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    # Stable paths may exchange a unit of offset whenever both effective path
    # orders remain at least one below the active coefficient cap.
    left, right = sp.symbols("LEFT RIGHT")
    rows = []
    literal_checks = 0
    for polynomial, initial_cap in (("core", 8), ("root_deleted", 7)):
        for selected in range(4):
            cap = initial_cap - selected
            minimum = cap - 1
            for rank in range(cap + 1):
                assert sp.expand(pair_count(left + 1, right, rank) - pair_count(left, right + 1, rank)) == 0
            for a in range(minimum, minimum + 9):
                for b in range(minimum, minimum + 9):
                    for rank in range(cap + 1):
                        assert literal_pair(a + 1, b, rank) == literal_pair(a, b + 1, rank)
                        literal_checks += 1
            rows.append({
                "polynomial": polynomial,
                "selected_branch_vertices": selected,
                "rank_cap": cap,
                "minimum_effective_path_order": minimum,
            })

    endpoint_guards = []
    for root_selected in (0, 1):
        for middle_selected, endpoint_selected in itertools.product((0, 1), repeat=2):
            selected = root_selected + middle_selected + endpoint_selected
            cap = 8 - selected
            effective = {
                "quartic_pendant_0": 7 - root_selected,
                "quartic_pendant_1": 7 - root_selected,
                "quartic_pendant_2": 7 - root_selected,
                "quartic_middle_spine": 8 - root_selected - middle_selected,
                "middle_pendant": 7 - middle_selected,
                "middle_endpoint_spine": 8 - middle_selected - endpoint_selected,
                "endpoint_pendant_0": 7 - endpoint_selected,
                "endpoint_pendant_1": 7 - endpoint_selected,
            }
            assert min(effective.values()) >= cap - 1
            endpoint_guards.append({
                "polynomial": "core",
                "root_quartic_selected": bool(root_selected),
                "middle_cubic_selected": bool(middle_selected),
                "endpoint_cubic_selected": bool(endpoint_selected),
                "rank_cap": cap,
                "effective_long_path_orders": effective,
            })
    for middle_selected, endpoint_selected in itertools.product((0, 1), repeat=2):
        selected = middle_selected + endpoint_selected
        cap = 7 - selected
        effective = {
            "quartic_pendant_0": 6,
            "quartic_pendant_1": 6,
            "quartic_pendant_2": 6,
            "quartic_middle_spine": 7 - middle_selected,
            "middle_pendant": 7 - middle_selected,
            "middle_endpoint_spine": 8 - middle_selected - endpoint_selected,
            "endpoint_pendant_0": 7 - endpoint_selected,
            "endpoint_pendant_1": 7 - endpoint_selected,
        }
        assert min(effective.values()) >= cap - 1
        endpoint_guards.append({
            "polynomial": "root_deleted",
            "middle_cubic_selected": bool(middle_selected),
            "endpoint_cubic_selected": bool(endpoint_selected),
            "rank_cap": cap,
            "effective_long_path_orders": effective,
        })

    symbols = (*c[:9], h[6], h[7])
    weights = tuple(range(9)) + (6, 7)
    degrees = {}
    for rank, expected_degree in enumerate((28, 28, 27, 26)):
        polynomial = sp.Poly(sp.expand(newton_coefficients(residual())[rank]), *symbols)
        degree = max(
            sum(power * weight for power, weight in zip(monomial, weights))
            for monomial, _ in polynomial.terms()
        )
        assert degree == expected_degree
        degrees[str(rank)] = {"terms": len(polynomial.terms()), "degree_bound": degree}
    matrix = sp.Matrix([[sp.binomial(sample, degree) for degree in range(29)] for sample in range(29)])
    assert matrix.det() == 1 and matrix.inv() * matrix == sp.eye(29)

    pendant = tuple((value, value == 7) for value in range(1, 8))
    spine = tuple((value, value == 8) for value in range(1, 9))
    quartic_triples = tuple(itertools.combinations_with_replacement(pendant, 3))
    endpoint_pairs = tuple(itertools.combinations_with_replacement(pendant, 2))
    triple_distribution = Counter(
        (sum(item[0] for item in triple), sum(int(item[1]) for item in triple))
        for triple in quartic_triples
    )
    pair_distribution = Counter(
        (sum(item[0] for item in pair), sum(int(item[1]) for item in pair))
        for pair in endpoint_pairs
    )
    pendant_distribution = Counter((value, int(long)) for value, long in pendant)
    spine_distribution = Counter((value, int(long)) for value, long in spine)
    distribution = convolve(
        triple_distribution,
        spine_distribution,
        pendant_distribution,
        spine_distribution,
        pair_distribution,
    )
    counts = Counter()
    all_short_distribution = Counter()
    for (stored_order, long_count), multiplicity in distribution.items():
        order = 1 + stored_order
        if long_count == 0:
            counts["all_short"] += multiplicity
            all_short_distribution[order] += multiplicity
            if order == 27:
                counts["all_short_order27"] += multiplicity
            if order >= 28:
                counts["all_short_n28_plus"] += multiplicity
        elif long_count == 8:
            counts["all_long"] += multiplicity
        else:
            counts["mixed"] += multiplicity
    counts["coordinate_patterns"] = sum(distribution.values())
    counts["non_all_short_rays"] = counts["mixed"] + counts["all_long"]
    counts["n28_plus_records"] = counts["all_short_n28_plus"] + counts["non_all_short_rays"]
    assert len(quartic_triples) == 84 and len(endpoint_pairs) == 28
    assert counts == Counter({
        "coordinate_patterns": 1_053_696,
        "mixed": 707_951,
        "non_all_short_rays": 707_952,
        "n28_plus_records": 941_680,
        "all_short": 345_744,
        "all_short_n28_plus": 233_728,
        "all_short_order27": 21_764,
        "all_long": 1,
    })

    partition = json.loads(
        (ROOT / "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json").read_text(encoding="utf-8")
    )
    orbit = next(
        row for row in partition["root_location_partitions"]
        if row["root_location_orbit"] == "quartic_endpoint_cubic_path:quartic_branch"
    )
    assert orbit["stabilizer_order"] == 12 and orbit["coordinate_count"] == 8
    assert orbit["coordinate_patterns"] == counts["coordinate_patterns"]
    assert orbit["all_short_literal_patterns"] == counts["all_short"]
    assert orbit["all_short_patterns_order27"] == counts["all_short_order27"]
    assert orbit["all_short_patterns_n28_plus"] == counts["all_short_n28_plus"]
    assert orbit["mixed_long_short_patterns"] == counts["mixed"] and orbit["all_long_patterns"] == 1
    assert {int(k): v for k, v in orbit["all_short_order_distribution"].items()} == dict(sorted(all_short_distribution.items()))

    payload = {
        "schema": "rank8-delta03-e5-quartic-endpoint-cubic-path-quartic-branch-newton-reduction-exact-agent-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_ENDPOINT_CUBIC_PATH_QUARTIC_BRANCH_TRANSFER_NEWTON_REDUCTION",
        "root_orbit": "quartic_endpoint_cubic_path:quartic_branch",
        "quotient_formula": "unordered quartic pendant triple C(9,3)=84 * middle module 7*8 * endpoint module C(8,2)*8=224, total 1,053,696 keys",
        "canonical_coordinate_order": "quartic pendant low,middle,high; quartic-middle spine; middle pendant; middle-endpoint spine; endpoint pendant low,high",
        "order_formula": "n=1+sum(the eight stored edge lengths)",
        "quotient_counts": dict(counts),
        "all_short_order_distribution": {str(k): v for k, v in sorted(all_short_distribution.items())},
        "graded_path_transfer": {
            "rows": rows,
            "literal_pair_checks": literal_checks,
            "endpoint_state_guards": endpoint_guards,
            "conclusion": "all long offsets enter core and root-deleted coefficients only through total S",
        },
        "degree_bounds": degrees,
        "newton_gate": "29 exact values with positive d0,d1, nonnegative remaining coefficients through the exact degree, and zero above it",
        "integer_newton_matrix_determinant": 1,
        "nested_order27_evidence": {
            "full_canonical_subdivisions": 70_854,
            "all_short_order27_keys": counts["all_short_order27"],
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Reduction only; no full census or sign claim is made by this script.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("COUNTS", json.dumps(payload["quotient_counts"], sort_keys=True))
    print("DEGREES", json.dumps(degrees, sort_keys=True))
    print("TRANSFER_LITERAL_CHECKS", literal_checks)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
