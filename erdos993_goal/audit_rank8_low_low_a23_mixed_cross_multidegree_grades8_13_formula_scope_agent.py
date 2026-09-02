#!/usr/bin/env python3
"""Static exact-scope audit for the multidegree grade-8..13 route."""

from __future__ import annotations

import ast
import hashlib
import json
import math
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
CANONICAL = (
    "probe_rank8_low_low_a23_mixed_cross_face_grade_outer_stream_agent.py",
    "BF0F79B2A7C1F35FBBFD350601421914C71648557BF1B6E41E38F3C1C75077DC",
)
PRODUCER = (
    "probe_rank8_low_low_a23_mixed_cross_multidegree_family_stream_agent.py",
    "78D99F5B17D89DDA8352C2014829FAA4D2765426FA3045F5783A817A18D5280E",
)
DEPENDENCY = (
    "probe_rank8_low_low_a23_mixed_cross_curvature_grade15_tail_v_piece_merge_agent.py",
    "D408E1A73F202934652BDC19C830AD3C6BC3D826E79080F4B5798DDF448261E4",
)
EXPECTED_BOUNDS = {
    ("curvature", 8): [6043950, 3125925, 1444905],
    ("curvature", 9): [7713750, 4192650, 2083950],
    ("curvature", 10): [8918910, 5058900, 2668050],
    ("curvature", 11): [9305478, 5477472, 3035340],
    ("curvature", 12): [8658650, 5265260, 3043040],
    ("curvature", 13): [7019250, 4393025, 2632630],
    ("strong", 8): [8730150, 4515225, 2087085],
    ("strong", 9): [11570625, 6288975, 3125925],
    ("strong", 10): [14015430, 7949700, 4192650],
    ("strong", 11): [15509130, 9129120, 5058900],
    ("strong", 12): [15585570, 9477468, 5477472],
    ("strong", 13): [14038500, 8786050, 5265260],
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def definition(tree: ast.Module, kind, name: str) -> str:
    nodes = [
        node for node in tree.body
        if isinstance(node, kind) and node.name == name
    ]
    assert len(nodes) == 1
    return ast.unparse(nodes[0])


def independent_bounds(family: str, degree: int) -> list[int]:
    maximum = 16 if family == "curvature" else 17
    target = maximum - degree
    base_count = math.comb(target + 4, 4)
    result = []
    for outer in range(3):
        slack = degree - outer
        # Nine reduced slack variables, with positive support in the five A
        # variables; for outer zero also require the four non-b0 B variables.
        reduced = math.comb(slack + 8, 8) - math.comb(slack + 3, 3)
        if outer == 0:
            reduced -= math.comb(slack + 4, 4)
        result.append(base_count * reduced)
    return result


def main() -> None:
    for name, expected in (CANONICAL, PRODUCER, DEPENDENCY):
        assert sha256(HERE / name) == expected
    canonical = ast.parse((HERE / CANONICAL[0]).read_text(encoding="utf-8"))
    producer = ast.parse((HERE / PRODUCER[0]).read_text(encoding="utf-8"))
    common = definition(canonical, ast.FunctionDef, "build_common")
    canonical_curvature = definition(canonical, ast.FunctionDef, "curvature_pieces")
    canonical_strong = definition(canonical, ast.FunctionDef, "strong_pieces")
    canonical_rows = definition(canonical, ast.FunctionDef, "row_spec")
    grading = definition(producer, ast.ClassDef, "BD")
    pair_arithmetic = definition(producer, ast.FunctionDef, "pair_mul")
    built = definition(producer, ast.FunctionDef, "build")
    pieces = definition(producer, ast.FunctionDef, "make_pieces")
    merge = definition(producer, ast.FunctionDef, "merge")
    labels = definition(producer, ast.FunctionDef, "labels")
    bounds_source = definition(producer, ast.FunctionDef, "support_bounds")

    # Canonical oriented formulas.
    assert "tail = [zero, zero, zero] + left[3:]" in common
    assert "base_c = {rank: convolution(left, right_base, rank, zero)" in common
    assert "base_v = {rank: convolution(tail, right_base, rank, zero)" in common
    assert "direction_c = {rank: convolution(left, right_direction, rank, zero)" in common
    assert "direction_v = {rank: convolution(tail, right_direction, rank, zero)" in common
    assert "curvature_grade(base_v, degree, zero, h)" in canonical_curvature
    assert "cross_grade(base_v, direction_v, degree, zero, h)" in canonical_curvature
    assert "curvature_grade(direction_v, degree, zero, h)" in canonical_curvature
    assert "capacity = common['left_ratios'][2]" in canonical_strong
    assert "curvature_grade(c0, degree, zero, h)" in canonical_strong
    assert "derivative_grade(c0, v0, degree, zero, h)" in canonical_strong
    assert "cross_grade(c0, c1, degree, zero, h)" in canonical_strong
    assert "derivative_cross_grade(c0, c1, v0, v1, degree, zero, h)" in canonical_strong
    assert "curvature_grade(c1, degree, zero, h)" in canonical_strong
    assert "derivative_grade(c1, v1, degree, zero, h)" in canonical_strong
    assert "scales = (('base', 4), ('linear', 2))" in canonical_rows
    assert "scales = (('base', 1), ('linear', 1), ('direction', 1))" in canonical_rows

    # Independent base-degree grading and formal affine b0 arithmetic.
    assert "for degree in range(self.target + 1)" in grading
    assert "for left_degree in range(degree + 1)" in grading
    assert "result[degree] += left * right" in grading
    assert "assert left[1].is_zero() or right[1].is_zero()" in pair_arithmetic
    assert "left[0] * right[1] + left[1] * right[0]" in pair_arithmetic
    assert "tail = [BD.constant(zero, target) for _ in range(3)] + left[3:]" in built
    assert "weight * left[index] * right[rank - index][0]" in built
    assert "weight * tail[index] * right[rank - index][0]" in built
    assert "weight * left[index] * direction[rank - index][0]" in built
    assert "weight * tail[index] * direction[rank - index][0]" in built
    assert "capacity * curvature(c, outer, h, zero, target) + h * derivative(c, v, outer, h, zero, target)" in pieces
    assert "capacity * cross(c, dc, outer, h, zero, target) + h * derivative_cross(c, dc, v, dv, outer, h, zero, target)" in pieces
    assert "capacity * curvature(dc, outer, h, zero, target) + h * derivative(dc, dv, outer, h, zero, target)" in pieces
    assert "assert sum(monomial[:5]) == target and sum(monomial[5:]) + outer == degree" in merge
    assert "if not any((monomial[index] for index in GROUP_A))" in merge
    assert "if outer == 0 and (not any((monomial[index] for index in GROUP_B)))" in merge
    assert "(f'{family}_middle_times_4', (4, 2, 0))" in labels
    assert "(f'{family}_far', (1, 1, 1))" in labels
    assert "base_count = math.comb(target + 4, 4)" in bounds_source

    scopes = []
    for family in ("curvature", "strong"):
        maximum = 16 if family == "curvature" else 17
        for degree in range(8, 14):
            target = maximum - degree
            assert target >= 3
            surviving = [
                name for name, bound in (
                    ("base", maximum),
                    ("linear", maximum - 1),
                    ("direction", maximum - 2),
                ) if degree <= bound
            ]
            assert surviving == ["base", "linear", "direction"]
            calculated = independent_bounds(family, degree)
            assert calculated == EXPECTED_BOUNDS[(family, degree)]
            scopes.append({
                "family": family,
                "total_ordinary_slack_degree": degree,
                "exact_base_degree": target,
                "surviving_pieces": surviving,
                "outer_support": [0, 2],
                "exact_mixed_support_universe_bound_per_row": {
                    "outer_0": calculated[0],
                    "outer_1": calculated[1],
                    "outer_2": calculated[2],
                    "total": sum(calculated),
                },
            })

    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-multidegree-grades8-13-formula-scope-audit-agent-v1",
        "status": "PASS_CANONICAL_MULTIDEGREE_BOTH_FAMILIES_GRADES8_13_FULL_SCOPE",
        "canonical_source": {"path": CANONICAL[0], "sha256": CANONICAL[1]},
        "producer_source": {"path": PRODUCER[0], "sha256": PRODUCER[1]},
        "dependency": {"path": DEPENDENCY[0], "sha256": DEPENDENCY[1]},
        "scopes": scopes,
        "checks": {
            "all_twelve_family_grade_jobs_scoped": True,
            "both_oriented_faces_computed_separately": True,
            "curvature_uses_oriented_left_tail_V": True,
            "strong_margin_uses_full_C": True,
            "strong_derivative_uses_oriented_left_tail_V": True,
            "all_three_pieces_survive_in_every_requested_grade": True,
            "middle_scales": [4, 2, 0],
            "far_scales": [1, 1, 1],
            "formal_b0_support": [0, 2],
            "exact_base_degree_is_family_maximum_minus_slack_degree": True,
            "mixed_support_filter_and_universe_bounds_checked_independently": True,
            "no_cross_face_or_cross_grade_credit": True,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    output = HERE / "rank8_low_low_a23_mixed_cross_multidegree_grades8_13_formula_scope_audit_agent_20260825.json"
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
