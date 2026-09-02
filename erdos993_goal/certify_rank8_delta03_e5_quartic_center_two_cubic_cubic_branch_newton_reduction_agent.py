#!/usr/bin/env python3
"""Exact transfer/Newton reduction for the e=5 cubic-branch root orbit."""

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
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_"
    "newton_reduction_exact_agent_20260823.json"
)
EXPECTED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json":
        "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json":
        "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json":
        "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_order27_exact_agent_20260823.json":
        "EC5F21D7FCE69D7631F3F9C7F86C40CDC9CB8E252298AFE27CCF46767D773904",
    "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_order27_independent_audit_agent_20260823.json":
        "64BF61506E66F8DBCBCBBE9A273FC064B9898A0C471EB9949F76E9B52592C875",
}


def sha256(path_value: Path) -> str:
    return hashlib.sha256(path_value.read_bytes()).hexdigest().upper()


def choose_poly(value, rank):
    return sp.prod(value - index for index in range(rank)) / sp.factorial(rank)


def path_count(order, rank):
    return choose_poly(order - rank + 1, rank)


def pair_count(left, right, rank):
    return sp.expand(sum(
        path_count(left, index) * path_count(right, rank - index)
        for index in range(rank + 1)
    ))


def literal_path(order: int, rank: int) -> int:
    top = order - rank + 1
    return math.comb(top, rank) if top >= rank >= 0 else 0


def literal_pair(left: int, right: int, rank: int) -> int:
    return sum(
        literal_path(left, index) * literal_path(right, rank - index)
        for index in range(rank + 1)
    )


def convolve(*factors: Counter[tuple[int, int]]) -> Counter[tuple[int, int]]:
    total = Counter({(0, 0): 1})
    for factor in factors:
        next_total = Counter()
        for (left_order, left_longs), left_count in total.items():
            for (right_order, right_longs), right_count in factor.items():
                next_total[(left_order + right_order, left_longs + right_longs)] += (
                    left_count * right_count
                )
        total = next_total
    return total


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    left, right = sp.symbols("LEFT RIGHT")
    transfer_rows = []
    literal_checks = 0
    for selected_branch_vertices in range(4):
        cap = 8 - selected_branch_vertices
        minimum = cap - 1
        for rank in range(cap + 1):
            assert sp.expand(
                pair_count(left + 1, right, rank)
                - pair_count(left, right + 1, rank)
            ) == 0
        for left_value in range(minimum, minimum + 9):
            for right_value in range(minimum, minimum + 9):
                for rank in range(cap + 1):
                    assert literal_pair(left_value + 1, right_value, rank) == (
                        literal_pair(left_value, right_value + 1, rank)
                    )
                    literal_checks += 1
        transfer_rows.append({
            "selected_branch_vertices": selected_branch_vertices,
            "rank_cap": cap,
            "minimum_effective_path_order": minimum,
        })

    branch_vertices = ("C0", "Q", "C1")
    endpoints = {
        "root_pendant_0": ("C0",),
        "root_pendant_1": ("C0",),
        "quartic_pendant_0": ("Q",),
        "quartic_pendant_1": ("Q",),
        "far_cubic_pendant_0": ("C1",),
        "far_cubic_pendant_1": ("C1",),
        "root_quartic_spine": ("C0", "Q"),
        "quartic_far_cubic_spine": ("Q", "C1"),
    }
    endpoint_guards = []
    for bits in itertools.product((0, 1), repeat=3):
        selected = {
            vertex for vertex, bit in zip(branch_vertices, bits) if bit
        }
        cap = 8 - len(selected)
        effective = {}
        for label, edge_endpoints in endpoints.items():
            base = 8 if label.endswith("spine") else 7
            order = base - sum(vertex in selected for vertex in edge_endpoints)
            assert order >= cap - 1
            effective[label] = order
        endpoint_guards.append({
            "selected_branch_vertices": sorted(selected),
            "rank_cap": cap,
            "effective_long_path_orders": effective,
        })

    symbols = (*c[:9], h[6], h[7])
    weights = tuple(range(9)) + (6, 7)
    expected_degrees = (28, 28, 27, 26)
    degrees = {}
    for rank in range(4):
        polynomial = sp.Poly(
            sp.expand(newton_coefficients(residual())[rank]), *symbols
        )
        degree = max(
            sum(power * weight for power, weight in zip(monomial, weights))
            for monomial, _ in polynomial.terms()
        )
        assert degree == expected_degrees[rank]
        degrees[str(rank)] = {
            "terms": len(polynomial.terms()),
            "degree_bound": degree,
        }
    matrix = sp.Matrix([
        [sp.binomial(sample, degree) for degree in range(29)]
        for sample in range(29)
    ])
    assert matrix.det() == 1 and matrix.inv() * matrix == sp.eye(29)

    pendant_states = tuple((value, value == 7) for value in range(1, 8))
    spine_states = tuple((value, value == 8) for value in range(1, 9))
    pendant_pairs = tuple(
        itertools.combinations_with_replacement(pendant_states, 2)
    )
    pair_distribution = Counter(
        (left[0] + right[0], int(left[1]) + int(right[1]))
        for left, right in pendant_pairs
    )
    spine_distribution = Counter(
        (value, int(is_long)) for value, is_long in spine_states
    )
    far_module_distribution = convolve(pair_distribution, spine_distribution)
    distribution = convolve(
        pair_distribution,       # two root-cubic pendants
        spine_distribution,      # root cubic to quartic
        pair_distribution,       # two direct quartic pendants
        far_module_distribution, # far cubic pair plus its spine
    )
    coordinate_patterns = sum(distribution.values())
    all_short_distribution = Counter()
    counts = Counter()
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
    counts["coordinate_patterns"] = coordinate_patterns
    counts["non_all_short_rays"] = counts["mixed"] + counts["all_long"]
    counts["n28_plus_records"] = (
        counts["all_short_n28_plus"] + counts["non_all_short_rays"]
    )
    assert len(pendant_pairs) == 28
    assert sum(far_module_distribution.values()) == 224
    assert counts == Counter({
        "coordinate_patterns": 1_404_928,
        "mixed": 951_138,
        "non_all_short_rays": 951_139,
        "n28_plus_records": 1_259_077,
        "all_short": 453_789,
        "all_short_n28_plus": 307_938,
        "all_short_order27": 28_876,
        "all_long": 1,
    })

    partition = json.loads(
        (ROOT / "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json")
        .read_text(encoding="utf-8")
    )
    orbit = next(
        row for row in partition["root_location_partitions"]
        if row["root_location_orbit"]
        == "quartic_center_two_cubic:cubic_branch"
    )
    assert orbit["stabilizer_order"] == 8
    assert orbit["coordinate_count"] == 8
    assert orbit["coordinate_patterns"] == counts["coordinate_patterns"]
    assert orbit["all_short_literal_patterns"] == counts["all_short"]
    assert orbit["all_short_patterns_order27"] == counts["all_short_order27"]
    assert orbit["all_short_patterns_n28_plus"] == counts["all_short_n28_plus"]
    assert orbit["mixed_long_short_patterns"] == counts["mixed"]
    assert orbit["all_long_patterns"] == counts["all_long"]
    assert {
        int(order): multiplicity
        for order, multiplicity in orbit["all_short_order_distribution"].items()
    } == dict(sorted(all_short_distribution.items()))

    payload = {
        "schema": (
            "rank8-delta03-e5-quartic-center-two-cubic-cubic-branch-"
            "newton-reduction-exact-agent-v1"
        ),
        "status": (
            "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_"
            "CUBIC_BRANCH_TRANSFER_NEWTON_REDUCTION"
        ),
        "root_orbit": "quartic_center_two_cubic:cubic_branch",
        "quotient_formula": (
            "unordered root-cubic pendant pair 28 * root-to-quartic spine 8 * "
            "unordered direct-quartic pendant pair 28 * far-cubic module "
            "(unordered pendant pair 28 * spine 8 = 224) = 1,404,928 keys"
        ),
        "canonical_coordinate_order": (
            "root pendant low,high; root-to-quartic spine; quartic pendant "
            "low,high; far-cubic pendant low,high; quartic-to-far-cubic spine"
        ),
        "order_formula": "n=1+sum(the eight stored edge lengths)",
        "quotient_counts": dict(counts),
        "all_short_order_distribution": {
            str(order): multiplicity
            for order, multiplicity in sorted(all_short_distribution.items())
        },
        "graded_path_transfer": {
            "rows": transfer_rows,
            "literal_pair_checks": literal_checks,
            "endpoint_state_guards": endpoint_guards,
            "conclusion": (
                "inside each non-all-short canonical key, every long offset "
                "enters the core and deleted coefficients only through total S"
            ),
        },
        "degree_bounds": degrees,
        "newton_gate": (
            "29 exact values P(0)..P(28); positive d0,d1 and nonnegative "
            "remaining coefficients through the exact degree prove positivity "
            "for every integer S>=0"
        ),
        "integer_newton_matrix_determinant": 1,
        "nested_order27_evidence": {
            "full_canonical_subdivisions": 92_950,
            "all_short_order27_keys_in_this_reduction": counts[
                "all_short_order27"
            ],
            "scope": "full n=27 orbit evidence is finite and separately audited",
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Reduction only. No full 1,404,928-key census was launched by this "
            "script and no sign or orbit-closure claim is made."
        ),
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
