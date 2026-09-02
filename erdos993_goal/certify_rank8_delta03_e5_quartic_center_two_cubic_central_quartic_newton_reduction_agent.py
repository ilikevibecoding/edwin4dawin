#!/usr/bin/env python3
"""Exact all-order transfer/Newton reduction for the central quartic e=5 root.

This is a structural reduction only.  It enumerates the exact automorphism
quotient, proves the stable-path transfer and Newton degree bounds, and does
not make a sign claim.
"""

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
    "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_"
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
    "rank8_delta03_e5_quartic_center_two_cubic_central_root_order27_exact_agent_20260823.json":
        "FD2EE225730754AA3C7D7D5C9590EAE819DBC5FD8454A53BFCBCFF2E740E5909",
    "rank8_delta03_e5_quartic_center_two_cubic_central_root_order27_independent_audit_agent_20260823.json":
        "2C914639CF876D2D0DD436A6088A79E417A14D94A894EFFAC1E6C683E84BE443",
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


def state(value: int, long_base: int) -> tuple[int, bool]:
    return value, value == long_base


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    # The stable-path identity is checked symbolically at every possible
    # selected-branch rank cap, and literally well beyond the boundary bases.
    left, right = sp.symbols("LEFT RIGHT")
    transfer_rows = []
    literal_transfer_checks = 0
    for selected_branch_vertices in range(4):
        rank_cap = 8 - selected_branch_vertices
        minimum_order = rank_cap - 1
        for rank in range(rank_cap + 1):
            assert sp.expand(
                pair_count(left + 1, right, rank)
                - pair_count(left, right + 1, rank)
            ) == 0
        for left_value in range(minimum_order, minimum_order + 9):
            for right_value in range(minimum_order, minimum_order + 9):
                for rank in range(rank_cap + 1):
                    assert literal_pair(left_value + 1, right_value, rank) == (
                        literal_pair(left_value, right_value + 1, rank)
                    )
                    literal_transfer_checks += 1
        transfer_rows.append({
            "selected_branch_vertices": selected_branch_vertices,
            "rank_cap": rank_cap,
            "minimum_effective_path_order": minimum_order,
        })

    # Audit the endpoint-loss guard for all subsets of the branch vertices
    # Q,C0,C1.  Pendant paths lose at most their one branch endpoint; spines
    # lose at most both branch endpoints.
    branch_vertices = ("Q", "C0", "C1")
    edge_endpoints = {
        "quartic_pendant_0": ("Q",),
        "quartic_pendant_1": ("Q",),
        "cubic0_pendant_0": ("C0",),
        "cubic0_pendant_1": ("C0",),
        "cubic1_pendant_0": ("C1",),
        "cubic1_pendant_1": ("C1",),
        "quartic_cubic0_spine": ("Q", "C0"),
        "quartic_cubic1_spine": ("Q", "C1"),
    }
    endpoint_guards = []
    for bits in itertools.product((0, 1), repeat=3):
        selected = {
            vertex for vertex, bit in zip(branch_vertices, bits) if bit
        }
        rank_cap = 8 - len(selected)
        effective_orders = {}
        for label, endpoints in edge_endpoints.items():
            base = 8 if label.endswith("spine") else 7
            effective = base - sum(endpoint in selected for endpoint in endpoints)
            assert effective >= rank_cap - 1
            effective_orders[label] = effective
        endpoint_guards.append({
            "selected_branch_vertices": sorted(selected),
            "rank_cap": rank_cap,
            "effective_long_path_orders": effective_orders,
        })

    symbols = (*c[:9], h[6], h[7])
    weights = tuple(range(9)) + (6, 7)
    degree_bounds = {}
    expected_degrees = (28, 28, 27, 26)
    for rank in range(4):
        polynomial = sp.Poly(
            sp.expand(newton_coefficients(residual())[rank]), *symbols
        )
        degree = max(
            sum(power * weight for power, weight in zip(monomial, weights))
            for monomial, _ in polynomial.terms()
        )
        assert degree == expected_degrees[rank]
        degree_bounds[str(rank)] = {
            "terms": len(polynomial.terms()),
            "degree_bound": degree,
        }

    newton_matrix = sp.Matrix([
        [sp.binomial(sample, degree) for degree in range(29)]
        for sample in range(29)
    ])
    assert newton_matrix.det() == 1
    assert newton_matrix.inv() * newton_matrix == sp.eye(29)

    # Canonical quotient: Q's two direct arms are unordered.  A cubic module
    # is an unordered arm pair plus its Q--C spine.  The two modules are
    # themselves unordered.
    pendant_states = tuple(state(value, 7) for value in range(1, 8))
    spine_states = tuple(state(value, 8) for value in range(1, 9))
    quartic_pairs = tuple(itertools.combinations_with_replacement(pendant_states, 2))
    modules = tuple(
        (low, high, spine)
        for low, high in itertools.combinations_with_replacement(pendant_states, 2)
        for spine in spine_states
    )
    module_pairs = tuple(itertools.combinations_with_replacement(modules, 2))
    assert (len(quartic_pairs), len(modules), len(module_pairs)) == (28, 224, 25_200)

    counts = Counter()
    all_short_order_distribution = Counter()
    for quartic_pair in quartic_pairs:
        for module_pair in module_pairs:
            flat = (*quartic_pair, *module_pair[0], *module_pair[1])
            long_count = sum(is_long for _, is_long in flat)
            order = 1 + sum(value for value, _ in flat)
            if long_count == 0:
                counts["all_short"] += 1
                all_short_order_distribution[order] += 1
                if order == 27:
                    counts["all_short_order27"] += 1
                if order >= 28:
                    counts["all_short_n28_plus"] += 1
            elif long_count == 8:
                counts["all_long"] += 1
            else:
                counts["mixed"] += 1
    counts["coordinate_patterns"] = len(quartic_pairs) * len(module_pairs)
    counts["non_all_short_rays"] = counts["mixed"] + counts["all_long"]
    counts["n28_plus_records"] = (
        counts["all_short_n28_plus"] + counts["non_all_short_rays"]
    )
    assert counts == Counter({
        "coordinate_patterns": 705_600,
        "mixed": 477_161,
        "non_all_short_rays": 477_162,
        "n28_plus_records": 632_103,
        "all_short": 228_438,
        "all_short_n28_plus": 154_941,
        "all_short_order27": 14_526,
        "all_long": 1,
    })

    partition = json.loads(
        (ROOT / "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json")
        .read_text(encoding="utf-8")
    )
    orbit = next(
        row for row in partition["root_location_partitions"]
        if row["root_location_orbit"]
        == "quartic_center_two_cubic:central_quartic"
    )
    assert orbit["stabilizer_order"] == 16
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
    } == dict(sorted(all_short_order_distribution.items()))

    payload = {
        "schema": (
            "rank8-delta03-e5-quartic-center-two-cubic-central-quartic-"
            "newton-reduction-exact-agent-v1"
        ),
        "status": (
            "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_"
            "CENTRAL_QUARTIC_TRANSFER_NEWTON_REDUCTION"
        ),
        "root_orbit": "quartic_center_two_cubic:central_quartic",
        "quotient_formula": (
            "unordered direct quartic pendant pair C(8,2)=28; each cubic "
            "module is an unordered pendant pair times a spine, 28*8=224; "
            "the two cubic modules are unordered, C(225,2)=25,200; total "
            "28*25,200=705,600 canonical keys"
        ),
        "canonical_coordinate_order": (
            "quartic pendant low,high; first cubic pendant low,high,spine; "
            "second cubic pendant low,high,spine, with each pair and the two "
            "modules nondecreasing"
        ),
        "order_formula": "n=1+sum(the eight stored edge lengths)",
        "quotient_counts": dict(counts),
        "all_short_order_distribution": {
            str(order): multiplicity
            for order, multiplicity in sorted(all_short_order_distribution.items())
        },
        "graded_path_transfer": {
            "rows": transfer_rows,
            "literal_pair_checks": literal_transfer_checks,
            "endpoint_state_guards": endpoint_guards,
            "conclusion": (
                "inside each non-all-short canonical key, all long-edge "
                "offsets enter every rank<=8 core/deleted coefficient only "
                "through their total S"
            ),
        },
        "degree_bounds": degree_bounds,
        "newton_gate": (
            "29 exact values P(0)..P(28); d0>0, d1>0, and all remaining "
            "Newton coefficients through the exact rank-specific degree "
            "nonnegative prove strict positivity for every integer S>=0"
        ),
        "integer_newton_matrix_determinant": 1,
        "nested_order27_evidence": {
            "all_short_order27_keys": counts["all_short_order27"],
            "primary": (
                "rank8_delta03_e5_quartic_center_two_cubic_"
                "central_root_order27_exact_agent_20260823.json"
            ),
            "independent_audit": (
                "rank8_delta03_e5_quartic_center_two_cubic_"
                "central_root_order27_independent_audit_agent_20260823.json"
            ),
            "scope": "finite n=27 only; not used as an all-order sign theorem",
        },
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Exact quotient and transfer/Newton reduction only.  No full "
            "705,600-key census was launched and no sign or orbit-closure "
            "claim is made."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("COUNTS", json.dumps(payload["quotient_counts"], sort_keys=True))
    print("DEGREES", json.dumps(degree_bounds, sort_keys=True))
    print("TRANSFER_LITERAL_CHECKS", literal_transfer_checks)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
