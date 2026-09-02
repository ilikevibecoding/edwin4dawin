#!/usr/bin/env python3
"""Exact transfer/Newton reduction for the four-cubic-path inner-leaf root."""

from __future__ import annotations

import hashlib
import json
import math
from collections import Counter
from pathlib import Path

import sympy as sp

from verify_rank8_q8_terminal_reduction import c, h, newton_coefficients, residual


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta03_e4_four_cubic_path_inner_leaf_newton_reduction_exact_root_20260823.json"
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
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json":
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json":
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
    "rank8_delta03_e4_bistar_complete_exact_agent_20260823.json":
        "67D0D9288F3C276523B6B2C91F68D0216E32C259C5D179E56F920E392D39E6A4",
    "rank8_delta03_e4_bistar_complete_independent_audit_agent_20260823.json":
        "094E8B7C13737C20037A0BB162A16D3351E5B4553D41EEC9914B9E46757CDF4F",
    "rank8_delta03_e4_four_cubic_star_center_branch_all_order_exact_root_20260823.json":
        "0D9F29ACA9AD714C77841A91111A4542546E18190C6600EEBCA315EA8DC0508C",
    "rank8_delta03_e4_four_cubic_star_center_branch_all_order_independent_audit_root_20260823.json":
        "8043EEBCE2D48F340AAC9D99FB9ABCB10004933209F588AFDC407008BC3534C5",
    "rank8_delta03_e4_four_cubic_star_outer_branch_all_order_exact_agent_20260823.json":
        "1A14F2C8C8FEF0C26D2AFF04CAE430CF433984EA20DB2A90337A1C08614FAED0",
    "rank8_delta03_e4_four_cubic_star_outer_branch_all_order_independent_audit_agent_20260823.json":
        "FB87BF49A8F46C053A0E3097980A2909611357CEC1A4B7C99A79DF9E588E1BCD",
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


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED

    left_symbol, right_symbol = sp.symbols("A B")
    rows = []
    literal_checks = 0
    for polynomial, initial_cap, max_selected in (
        ("core", 8, 4),
        ("root_deleted", 7, 4),
    ):
        for selected in range(max_selected + 1):
            cap = initial_cap - selected
            minimum = cap - 1
            for rank in range(cap + 1):
                assert sp.expand(
                    pair_count(left_symbol + 1, right_symbol, rank)
                    - pair_count(left_symbol, right_symbol + 1, rank)
                ) == 0
            for left in range(minimum, minimum + 9):
                for right in range(minimum, minimum + 9):
                    for rank in range(cap + 1):
                        assert literal_pair(left + 1, right, rank) == literal_pair(left, right + 1, rank)
                        literal_checks += 1
            rows.append({
                "polynomial": polynomial,
                "selected_branch_vertices": selected,
                "rank_cap": cap,
                "minimum_path_order": minimum,
            })

    endpoint_state_guards = []
    for s0 in range(2):
        for s1 in range(2):
            for s2 in range(2):
                for s3 in range(2):
                    selected = s0 + s1 + s2 + s3
                    cap = 8 - selected
                    orders = {
                        "left_outer_pendant": 7 - s0,
                        "first_spine": 7 - s0 - s1,
                        "left_inner_pendant": 7 - s1,
                        "middle_spine": 7 - s1 - s2,
                        "right_inner_pendant": 7 - s2,
                        "final_spine": 7 - s2 - s3,
                        "right_outer_pendant": 7 - s3,
                    }
                    assert min(orders.values()) >= cap - 1
                    endpoint_state_guards.append({
                        "polynomial": "core",
                        "selected_state": [s0, s1, s2, s3],
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
                        "left_outer_pendant": 7 - s0,
                        "first_spine": 7 - s0 - s1,
                        "root_inner_arm_after_leaf_deletion": 6 - s1,
                        "middle_spine": 7 - s1 - s2,
                        "right_inner_pendant": 7 - s2,
                        "final_spine": 7 - s2 - s3,
                        "right_outer_pendant": 7 - s3,
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
        degrees[str(rank)] = {"terms": len(polynomial.terms()), "degree_bound": degree}
    matrix = sp.Matrix([
        [sp.binomial(sample, degree) for degree in range(29)]
        for sample in range(29)
    ])
    assert matrix.det() == 1

    outer_pair_sums = Counter(
        left + right
        for left in range(1, 7)
        for right in range(left, 7)
    )
    spine_sums = Counter(range(1, 8))
    pendant_sums = Counter(range(1, 7))
    total_sums = Counter({0: 1})
    for factor in (
        outer_pair_sums, spine_sums, pendant_sums, spine_sums,
        pendant_sums, spine_sums, outer_pair_sums,
    ):
        next_sums = Counter()
        for partial, multiplicity in total_sums.items():
            for value, factor_multiplicity in factor.items():
                next_sums[partial + value] += multiplicity * factor_multiplicity
        total_sums = next_sums

    all_short = sum(total_sums.values())
    all_short_n27 = sum(
        multiplicity for edge_sum, multiplicity in total_sums.items()
        if 1 + edge_sum >= 27
    )
    total = 28 * 8 * 7 * 8 * 7 * 8 * 28
    assert (total, all_short, all_short_n27) == (19_668_992, 5_445_468, 4_950_075)

    payload = {
        "schema": "rank8-delta03-e4-four-cubic-path-inner-leaf-newton-reduction-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA03_E4_FOUR_CUBIC_PATH_INNER_LEAF_TRANSFER_NEWTON_REDUCTION",
        "root_orbit": "four_cubic_path:inner_leaf",
        "quotient_formula": "two independently unordered outer pendant-arm pairs (28 each), three spine states (8 each), and two distinguished inner pendant-arm states (7 each), one containing the root, giving 19,668,992 keys",
        "sectors": {
            "all_short": all_short,
            "all_short_n27_plus": all_short_n27,
            "mixed_rays": total - all_short - 1,
            "all_long_rays": 1,
            "non_all_short_rays": total - all_short,
        },
        "graded_path_transfer": {
            "rows": rows,
            "literal_checks": literal_checks,
            "endpoint_state_guards": endpoint_state_guards,
            "state_guard": "ordinary pendant arms use long base 7 and the three branch-to-branch spines use long base 8; deleting the rooted inner terminal leaf shortens only its distinguished inner arm from 7 to 6, and every long path remains above the selected-vertex graded cap",
            "conclusion": "within each non-all-short key all nine long offsets enter both the core and root-deleted coefficients only through total S",
        },
        "degree_bounds": degrees,
        "newton_gate": "29 exact values; positive d0,d1, nonnegative higher coefficients through the exact degree, zero above it",
        "integer_newton_matrix_determinant": 1,
        "immutable_input_hashes": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Reduction/count only; no sign claim until every finite cell and ray passes primary and independent literal audits.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("SECTORS", payload["sectors"])
    print("DEGREES", degrees, "LITERAL", literal_checks)
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
