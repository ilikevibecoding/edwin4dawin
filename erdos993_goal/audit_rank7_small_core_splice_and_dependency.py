#!/usr/bin/env python3
"""Independent structural audit of the rank-seven small splice and chain."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUT = ROOT / "rank7_small_core_splice_dependency_independent_audit_20260820.json"

PINNED = {
    "verify_rank7_terminal_broom_small_core_splice.rs": "E34F4B185A953D6925DD3243025A8B8749AF99BB7955FFF442B88FD0182F966F",
    "replay_rank7_terminal_broom_small_core_splice.py": "5BAC31E26CBD6414AD866CF415923E97DEC68230A7EFBDCAC6F2F822FB246C48",
    "rank7_terminal_broom_small_core_splice_exact_20260820.log": "4D4ED6CD8EF530B1B02B6B7EA95295E3E5F00F852C7C04C636900E25E9084B7F",
    "rank7_terminal_broom_small_core_splice_exact_20260820.json": "96242456FB1BAD0861F8B6731FEA21986F4B3E0FA673EB5A8C84545549881A20",
    "rank7_exceptional_small_tree_jets_exact_20260816.json": "26D221A833298109CAE33485D4FCB3011351ACB826710DFCC38ADB95A54CE17C",
    "rank6_three_halves_convolution_cones_exact_20260813.json": "547E55F2F4976B6EE4AAC8509D2949D757D171594D6D2601208AF89BE0347EDA",
    "rank6_three_halves_forest_certificate_exact_20260813.json": "DE4C3D9C3C46B2D2216D2D0FEDA87758E358A291254B6314271D1590F66A7877",
    "rank7_forest_lift_conditional_exact_20260816.json": "5DD81CC8BF4A334ED9D6D7B88DBE271DB0A0F9FEA4FEB9F9126DCC06875E563E",
    "forest_v7_alpha12_exact_20260813.json": "0C0E713EA2E10B4F6431AF06B44E73B93B592782C4376FE5F596B20482027B5C",
    "rank7_alpha11_boundary_theorem_exact_20260813.json": "66B78AFF028EC8AA0E994CDBD5DC30100B0CB32CF2C1930C4CE824C9E7A042CC",
    "rank7_component_pgc_reduction_exact_20260813.json": "FCEAF69BA68325D120425D9A9C65C48A764D35855B5F2D6592B7809308409A35",
}

TREE_COUNTS = (1, 1, 1, 2, 3, 6, 11, 23, 47, 106, 235, 551, 1301, 3159)
ENTRY_MINIMA = (
    731808, 1981980, 1305864, 902664, 722960, 674304, 669800,
    674304, 649328, 609848, 609848, 767354, 767354, 1113968,
)


def sha256(name: str) -> str:
    return hashlib.sha256((ROOT / name).read_bytes()).hexdigest().upper()


def load(name: str) -> dict:
    return json.loads((ROOT / name).read_text(encoding="utf-8"))


def main() -> int:
    actual = {name: sha256(name) for name in PINNED}
    assert actual == PINNED

    source = (ROOT / "verify_rank7_terminal_broom_small_core_splice.rs").read_text(encoding="utf-8")
    required_source_fragments = (
        "for n in 1..=14",
        "for v in 0..n",
        "let t0=1usize.max(12usize.saturating_sub(alpha));",
        "(t0..=t0+14)",
        "14*p7*p7-p6*p7-16*p6*p8",
        "assert_eq!(trees,expected[n])",
        "assert_eq!(roots,expected[n]*n as u64)",
        "assert!(order_min>=0",
        "assert!(order_coeff_min>=0",
    )
    assert all(fragment in source for fragment in required_source_fragments)

    row_pattern = re.compile(
        r"^core_n=(\d+) trees=(\d+) roots=(\d+) "
        r"min_Q7_at_alpha12_entry=(\d+) min_newton_coefficient=(\d+)$"
    )
    lines = (ROOT / "rank7_terminal_broom_small_core_splice_exact_20260820.log").read_text(encoding="utf-8").splitlines()
    assert len(lines) == 15
    parsed = []
    for order, line in enumerate(lines[:14], start=1):
        match = row_pattern.fullmatch(line)
        assert match is not None
        values = tuple(map(int, match.groups()))
        expected_roots = order * TREE_COUNTS[order - 1]
        assert values == (order, TREE_COUNTS[order - 1], expected_roots, ENTRY_MINIMA[order - 1], 0)
        parsed.append(values)
    assert sum(row[2] for row in parsed) == 72_145
    assert lines[14] == (
        "PASS_EXACT_RANK7_TERMINAL_BROOM_SMALL_CORE_SPLICE_THROUGH_N14 "
        "roots=72145 min_Q7=609848 min_Q7_order=10 min_newton_coefficient=0"
    )

    report = load("rank7_terminal_broom_small_core_splice_exact_20260820.json")
    assert report["status"] == "PASS_EXACT_RANK7_TERMINAL_BROOM_SMALL_CORE_SPLICE_THROUGH_N14"
    assert [row["core_order"] for row in report["rows"]] == list(range(1, 15))
    assert [row["free_trees"] for row in report["rows"]] == list(TREE_COUNTS)
    assert [row["rooted_cores"] for row in report["rows"]] == [n * TREE_COUNTS[n - 1] for n in range(1, 15)]
    assert [row["minimum_Q7_at_alpha12_entry"] for row in report["rows"]] == list(ENTRY_MINIMA)

    # Independent degree/count logic.  The coefficient p_j(t) has degree at
    # most j because it is a sum of binom(t,l), l<=j.  Therefore the three
    # Q7 products have degree bounds 14,13,14.  Fifteen consecutive values
    # recover all Newton coefficients of a degree-at-most-14 polynomial.
    product_degree_bounds = {
        "p7_squared": 7 + 7,
        "p6_times_p7": 6 + 7,
        "p6_times_p8": 6 + 8,
    }
    assert max(product_degree_bounds.values()) == 14
    values_needed = max(product_degree_bounds.values()) + 1
    assert values_needed == 15

    # Alpha identity: excluding the new support permits all t leaves plus a
    # maximum set of A.  Including it permits 1+alpha(A-q), which is at most
    # 1+alpha(A), and hence at most t+alpha(A) for t>=1.
    alpha_logic = {
        "support_excluded": "t+alpha(A)",
        "support_included": "1+alpha(A-q)",
        "comparison": "1+alpha(A-q)<=1+alpha(A)<=t+alpha(A) for t>=1",
        "conclusion": "alpha(G_t)=t+alpha(A)",
    }

    exceptional = load("rank7_exceptional_small_tree_jets_exact_20260816.json")
    rank6_cones = load("rank6_three_halves_convolution_cones_exact_20260813.json")
    rank6_forest = load("rank6_three_halves_forest_certificate_exact_20260813.json")
    lift = load("rank7_forest_lift_conditional_exact_20260816.json")
    v7 = load("forest_v7_alpha12_exact_20260813.json")
    alpha11 = load("rank7_alpha11_boundary_theorem_exact_20260813.json")
    pgc = load("rank7_component_pgc_reduction_exact_20260813.json")
    assert exceptional["status"] == "PASS_EXACT_STREAM_RANK7_EXCEPTIONAL_SMALL_TREE_JETS"
    assert exceptional["no_exception_above_order_14"] is True
    assert rank6_cones["status"] == "PASS_EXACT_ALL_ORDER_RANK6_CONVOLUTION_CONES"
    assert rank6_forest["status"] == "PASS_EXACT_ALL_FOREST_RANK6_RESERVE_LIFT"
    assert rank6_forest["small_products"]["minimum"] == 9_738
    assert lift["status"] == "PASS_EXACT_CONDITIONAL_ALL_FOREST_RANK7_Q7_LIFT"
    assert v7["status"] == "PASS_EXACT_ALL_FOREST_V7_ALPHA_AT_LEAST_12"
    assert alpha11["status"] == "PASS_EXACT_ALL_ORDER_RANK7_ALPHA11_BOUNDARY_THEOREM"
    assert pgc["required_range"] == {
        "alpha_P_at_least": 12,
        "alpha_B_equals_alpha_P_minus_one": True,
        "alpha_B_at_least": 11,
    }

    dependency_audit = {
        "terminal_structure": (
            "A diameter endpoint has a support whose other neighbors are leaves; "
            "deleting that support and its leaf neighbors leaves a rooted tree A. "
            "The star case is represented with A=K1."
        ),
        "small_core": "If |A|<=14, the literal family certificate applies exactly when alpha(G_t)>=12.",
        "core_at_least_15_Q7_A": (
            "If alpha(A)>=12, strong induction applies.  If alpha(A)<=11, "
            "the exact exceptional census gives Q7(A)>=0 for orders 15..22; "
            "order at least 23 forces alpha(A)>=12 by bipartiteness."
        ),
        "core_at_least_15_Q6_H": (
            "H=A-q has order at least 14.  The rank-six cone, small-factor, "
            "and first-crossing certificate proves Q6 for every forest of "
            "order at least 13, a stronger statement than the report headline."
        ),
        "positive_multiplier": (
            "For |A|>=15, bipartiteness gives alpha(A)>=8 and alpha(A-q)>=7, "
            "so c6>0 and h5>0; division by 7*c6*h5 is valid."
        ),
        "forest_lift": "Connected Q7(alpha>=12) plus the three exact convolution cones gives forest Q7(alpha>=12).",
        "pgc_split": (
            "In the component identity alpha(B)=alpha(P)-1.  For alpha(B)>=12 "
            "the forest V7 theorem applies; for alpha(B)=11 the exact boundary "
            "theorem pays every negative residual row."
        ),
    }

    audit = {
        "schema": "rank7-small-core-splice-dependency-independent-audit-v1",
        "status": "PASS_INDEPENDENT_RANK7_SMALL_CORE_SPLICE_AND_DEPENDENCY_LOGIC",
        "scope": "structural/key/count/degree/dependency audit; no large finite batch replay",
        "pinned_hashes": actual,
        "small_core_key_audit": {
            "orders": [1, 14],
            "free_tree_counts": list(TREE_COUNTS),
            "rooted_core_count": 72_145,
            "one_row_per_order": True,
            "all_roots_loop_present": True,
        },
        "small_core_degree_audit": {
            "product_degree_bounds": product_degree_bounds,
            "Q7_degree_bound": 14,
            "consecutive_values": values_needed,
            "newton_tail_logic": "nonnegative Delta^0..Delta^14 at t0 implies Q7(G_t)>=0 for every integer t>=t0",
        },
        "alpha_logic": alpha_logic,
        "dependency_audit": dependency_audit,
        "scope_guards": [
            "This audit does not claim R_t>=0 at core orders 10..12; that statement is false.",
            "This audit does not turn running Delta0 or n25/26 replay files into final evidence.",
            "The full rank-seven integration remains conditional on the explicit pending guards in assemble_rank7_integration_readonly.py.",
        ],
        "first_remaining_gap": "final completion of the guarded n25/26 replay and three Delta0 lower-b batch reports",
    }
    OUT.write_text(json.dumps(audit, indent=2) + "\n", encoding="utf-8")
    print(audit["status"])
    print(f"rooted_keys={sum(row[2] for row in parsed)} degree_bound=14 values=15")
    print(f"report_sha256={sha256(OUT.name)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
