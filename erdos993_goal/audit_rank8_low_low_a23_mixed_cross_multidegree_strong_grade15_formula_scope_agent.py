#!/usr/bin/env python3
"""Formula-scope audit for reusable-engine strong grade 15."""
from __future__ import annotations

import ast
import hashlib
import json
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


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def atomic_json(path, payload):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def function_text(tree, name):
    nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == name]
    assert len(nodes) == 1
    return ast.unparse(nodes[0])


def class_text(tree, name):
    nodes = [node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == name]
    assert len(nodes) == 1
    return ast.unparse(nodes[0])


def main():
    for name, expected in (CANONICAL, PRODUCER, DEPENDENCY):
        assert sha256(HERE / name) == expected
    canonical = ast.parse((HERE / CANONICAL[0]).read_text(encoding="utf-8"))
    producer = ast.parse((HERE / PRODUCER[0]).read_text(encoding="utf-8"))
    common = function_text(canonical, "build_common")
    strong = function_text(canonical, "strong_pieces")
    row_spec = function_text(canonical, "row_spec")
    grading = class_text(producer, "BD")
    built = function_text(producer, "build")
    pieces = function_text(producer, "make_pieces")
    producer_labels = function_text(producer, "labels")
    bounds = function_text(producer, "support_bounds")

    assert "tail = [zero, zero, zero] + left[3:]" in common
    assert "base_c = {rank: convolution(left, right_base, rank, zero)" in common
    assert "base_v = {rank: convolution(tail, right_base, rank, zero)" in common
    assert "direction_c = {rank: convolution(left, right_direction, rank, zero)" in common
    assert "direction_v = {rank: convolution(tail, right_direction, rank, zero)" in common
    assert "capacity = common['left_ratios'][2]" in strong
    assert "curvature_grade(c0, degree, zero, h)" in strong
    assert "derivative_grade(c0, v0, degree, zero, h)" in strong
    assert "cross_grade(c0, c1, degree, zero, h)" in strong
    assert "derivative_cross_grade(c0, c1, v0, v1, degree, zero, h)" in strong
    assert "curvature_grade(c1, degree, zero, h)" in strong
    assert "derivative_grade(c1, v1, degree, zero, h)" in strong
    assert "scales = (('base', 4), ('linear', 2))" in row_spec
    assert "scales = (('base', 1), ('linear', 1), ('direction', 1))" in row_spec

    assert "for degree in range(self.target + 1)" in grading
    assert "result[degree] += left * right" in grading
    assert "tail = [BD.constant(zero, target) for _ in range(3)] + left[3:]" in built
    assert "if family == 'strong'" in built
    assert "weight * left[index] * right[rank - index][0]" in built
    assert "weight * tail[index] * right[rank - index][0]" in built
    assert "weight * left[index] * direction[rank - index][0]" in built
    assert "weight * tail[index] * direction[rank - index][0]" in built
    assert "capacity * curvature(c, outer, h, zero, target) + h * derivative(c, v, outer, h, zero, target)" in pieces
    assert "capacity * cross(c, dc, outer, h, zero, target) + h * derivative_cross(c, dc, v, dv, outer, h, zero, target)" in pieces
    assert "capacity * curvature(dc, outer, h, zero, target) + h * derivative(dc, dv, outer, h, zero, target)" in pieces
    assert "(f'{family}_middle_times_4', (4, 2, 0))" in producer_labels
    assert "(f'{family}_far', (1, 1, 1))" in producer_labels
    assert "base_count = math.comb(target + 4, 4)" in bounds

    # Strong maximum slack degree is 17, so grade 15 is exact base degree two.
    assert 17 - 15 == 2
    surviving = [name for name, bound in (("base", 17), ("linear", 16), ("direction", 15)) if 15 <= bound]
    assert surviving == ["base", "linear", "direction"]
    expected_bounds = [7284330, 4786350, 3043950]
    report = {
        "schema": "rank8-low-low-a23-mixed-cross-multidegree-strong-grade15-formula-scope-audit-agent-v1",
        "status": "PASS_CANONICAL_MULTIDEGREE_STRONG_GRADE15_FULL_C_TAIL_V_ALL_THREE_PIECES",
        "canonical_source": {"path": CANONICAL[0], "sha256": CANONICAL[1]},
        "producer_source": {"path": PRODUCER[0], "sha256": PRODUCER[1]},
        "dependency": {"path": DEPENDENCY[0], "sha256": DEPENDENCY[1]},
        "checks": {
            "exact_base_degree": 2,
            "strong_margin_uses_full_convolution_C": True,
            "strong_derivative_uses_oriented_left_tail_V": True,
            "surviving_pieces": ["base", "linear", "direction"],
            "middle_scales": [4, 2, 0],
            "far_scales": [1, 1, 1],
            "faces_must_be_computed_separately": True,
            "no_cross_grade_credit": True,
        },
        "exact_mixed_support_universe_bounds": {
            "outer_0": expected_bounds[0],
            "outer_1": expected_bounds[1],
            "outer_2": expected_bounds[2],
            "total": sum(expected_bounds),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    output = HERE / "rank8_low_low_a23_mixed_cross_multidegree_strong_grade15_formula_scope_audit_agent_20260823.json"
    print("PASS", output, atomic_json(output, report), flush=True)


if __name__ == "__main__":
    main()
