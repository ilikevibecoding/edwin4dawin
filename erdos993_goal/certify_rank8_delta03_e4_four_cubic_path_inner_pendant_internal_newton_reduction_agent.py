#!/usr/bin/env python3
"""Exact transfer/Newton reduction for path inner-pendant-internal roots."""

from __future__ import annotations

import hashlib
import json
import math
from collections import Counter
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / (
    "rank8_delta03_e4_four_cubic_path_inner_pendant_internal_"
    "newton_reduction_exact_agent_20260823.json"
)
EXPECTED = {
    "verify_rank8_q8_terminal_reduction.py":
        "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "rank8_stable_path_offset_transfer_exact_agent_20260822.json":
        "3F690BA0FC7CC82EBE40467016C848D53E458744BCFC1FA2CF1EB3C01B507D7D",
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json":
        "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json":
        "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json":
        "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json":
        "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
    "rank8_delta03_e4_bistar_complete_exact_agent_20260823.json":
        "67D0D9288F3C276523B6B2C91F68D0216E32C259C5D179E56F920E392D39E6A4",
    "rank8_delta03_e4_bistar_complete_independent_audit_agent_20260823.json":
        "094E8B7C13737C20037A0BB162A16D3351E5B4553D41EEC9914B9E46757CDF4F",
    "rank8_delta03_e4_four_cubic_path_inner_branch_all_order_exact_agent_20260823.json":
        "7F2ACF697E086BBDDEDCDA66B90DE160442D858A9E317AA2FDC729ABDD759A10",
    "rank8_delta03_e4_four_cubic_path_inner_branch_all_order_independent_audit_agent_20260823.json":
        "2EC6D582AA8C9E029E2CD2880BA89A4B3F5561F86238623B836F0F56D1048952",
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


def literal_path(order, rank):
    top = order - rank + 1
    return math.comb(top, rank) if top >= rank >= 0 else 0


def literal_pair(left, right, rank):
    return sum(
        literal_path(left, index) * literal_path(right, rank - index)
        for index in range(rank + 1)
    )


def convolve(*factors: Counter[int]) -> Counter[int]:
    total = Counter({0: 1})
    for factor in factors:
        next_total: Counter[int] = Counter()
        for left, left_count in total.items():
            for right, right_count in factor.items():
                next_total[left + right] += left_count * right_count
        total = next_total
    return total


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    left, right = sp.symbols("LEFT RIGHT")
    rows = []
    literal_checks = 0
    for polynomial, initial_cap, maximum_selected in (
        ("core", 8, 5),
        ("root_deleted", 7, 4),
    ):
        for selected in range(maximum_selected + 1):
            cap = initial_cap - selected
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
            rows.append({
                "polynomial": polynomial,
                "selected_vertices": selected,
                "rank_cap": cap,
                "minimum_path_order": minimum,
            })

    endpoint_state_guards = []
    for root_selected in range(2):
        for s0 in range(2):
            for s1 in range(2):
                for s2 in range(2):
                    for s3 in range(2):
                        selected = root_selected + s0 + s1 + s2 + s3
                        cap = 8 - selected
                        orders = {
                            "root_tail": 7 - root_selected,
                            "root_to_inner_near_gap": 7 - root_selected - s1,
                            "left_outer_pendant_a": 7 - s0,
                            "left_outer_pendant_b": 7 - s0,
                            "first_spine": 7 - s0 - s1,
                            "middle_spine": 7 - s1 - s2,
                            "other_inner_pendant": 7 - s2,
                            "final_spine": 7 - s2 - s3,
                            "right_outer_pendant_a": 7 - s3,
                            "right_outer_pendant_b": 7 - s3,
                        }
                        assert min(orders.values()) >= cap - 1
                        endpoint_state_guards.append({
                            "polynomial": "core",
                            "selected_state": [root_selected, s0, s1, s2, s3],
                            "rank_cap": cap,
                            "minimum_long_path_orders": orders,
                        })
    for s0 in range(2):
        for s1 in range(2):
            for s2 in range(2):
                for s3 in range(2):
                    selected = s0 + s1 + s2 + s3
                    cap = 7 - selected
                    orders = {
                        "detached_tail_component": 7,
                        "inner_near_gap_after_root_deletion": 7 - s1,
                        "left_outer_pendant_a": 7 - s0,
                        "left_outer_pendant_b": 7 - s0,
                        "first_spine": 7 - s0 - s1,
                        "middle_spine": 7 - s1 - s2,
                        "other_inner_pendant": 7 - s2,
                        "final_spine": 7 - s2 - s3,
                        "right_outer_pendant_a": 7 - s3,
                        "right_outer_pendant_b": 7 - s3,
                    }
                    assert min(orders.values()) >= cap - 1
                    endpoint_state_guards.append({
                        "polynomial": "root_deleted",
                        "selected_state": [s0, s1, s2, s3],
                        "rank_cap": cap,
                        "minimum_long_path_orders": orders,
                    })

    symbols = (*c[:9], h[6], h[7])
    weights = tuple(range(9)) + (6, 7)
    degrees = {}
    for rank in range(4):
        polynomial = sp.Poly(sp.expand(newton_coefficients(residual())[rank]), *symbols)
        degree = max(
            sum(power * weight for power, weight in zip(monomial, weights))
            for monomial, _ in polynomial.terms()
        )
        assert degree == (28, 28, 27, 26)[rank]
        degrees[str(rank)] = {
            "terms": len(polynomial.terms()),
            "degree_bound": degree,
        }
    matrix = sp.Matrix([
        [sp.binomial(sample, degree) for degree in range(29)]
        for sample in range(29)
    ])
    assert matrix.det() == 1

    near_gap = Counter(range(0, 7))
    pendant = Counter(range(1, 7))
    spine = Counter(range(1, 8))
    outer_pair = Counter(
        low + high
        for low in range(1, 7)
        for high in range(low, 7)
    )
    order_sums = convolve(
        near_gap,
        pendant,  # selected-edge tail component
        outer_pair,
        spine,
        spine,
        pendant,  # other inner pendant
        spine,
        outer_pair,
    )
    all_short = sum(order_sums.values())
    all_short_n27 = sum(
        multiplicity
        for stored_sum, multiplicity in order_sums.items()
        if 2 + stored_sum >= 27
    )
    total = 8 * 7 * 28 * 8 * 8 * 7 * 8 * 28
    assert (total, all_short, all_short_n27) == (
        157_351_936,
        38_118_276,
        37_143_771,
    )

    partition = json.loads(
        (ROOT / "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json")
        .read_text(encoding="utf-8")
    )
    orbit = next(
        row for row in partition["root_location_partitions"]
        if row["root_location_orbit"] == "four_cubic_path:inner_pendant_internal"
    )
    assert orbit["coordinate_patterns"] == total
    assert orbit["all_short_literal_patterns"] == all_short
    assert orbit["all_short_patterns_n27_plus"] == all_short_n27

    rays = total - all_short
    payload = {
        "schema": (
            "rank8-delta03-e4-four-cubic-path-inner-pendant-internal-"
            "newton-reduction-exact-agent-v1"
        ),
        "status": (
            "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_"
            "INNER_PENDANT_INTERNAL_TRANSFER_NEWTON_REDUCTION"
        ),
        "root_orbit": "four_cubic_path:inner_pendant_internal",
        "quotient_formula": (
            "near gap 8 * tail 7 * left unordered outer pair 28 * first "
            "spine 8 * middle spine 8 * other inner pendant 7 * final spine 8 * "
            "right unordered outer pair 28 = 157,351,936 keys"
        ),
        "coordinate_order": (
            "near gap; tail component; left outer pendant pair; first spine; "
            "middle spine; other inner pendant; final spine; right outer pendant pair"
        ),
        "order_formula": "n=2+sum(the ten stored coordinates)",
        "sectors": {
            "all_short": all_short,
            "all_short_n27_plus": all_short_n27,
            "mixed_rays": rays - 1,
            "all_long_rays": 1,
            "non_all_short_rays": rays,
        },
        "graded_path_transfer": {
            "rows": rows,
            "literal_checks": literal_checks,
            "endpoint_state_guards": endpoint_state_guards,
            "state_guard": (
                "the near gap has long base 7, its tail and ordinary pendants "
                "have long base 7, and spines have long base 8; after every "
                "root/cubic endpoint selection each long path factor remains "
                "at least rank_cap-1"
            ),
            "deleted_component_identity": (
                "deleting the degree-two root yields a detached tail path and "
                "the remaining four-cubic-path component with the near gap as "
                "the selected inner cubic's pendant arm; the forest/path-pair "
                "identity transfers one unit between every pair of long coordinates"
            ),
            "conclusion": (
                "within each non-all-short key all ten long offsets enter both "
                "the full-core and root-deleted coefficients only through total S"
            ),
        },
        "degree_bounds": degrees,
        "newton_gate": (
            "29 exact values; positive d0,d1, nonnegative higher coefficients "
            "through the rank-specific degree, zero above it"
        ),
        "integer_newton_matrix_determinant": 1,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": (
            "Reduction only; no sign claim until all 37,143,771 finite cells and "
            "119,233,660 rays pass a producer and independent literal audit."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SECTORS", payload["sectors"])
    print("DEGREES", degrees, "LITERAL", literal_checks)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
