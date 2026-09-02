#!/usr/bin/env python3
"""Canonical formula-scope audit for curvature grade 14."""
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
    "probe_rank8_low_low_a23_mixed_cross_curvature_grade14_tail_v_second_order_piece_merge_agent.py",
    "6FF273EEE009B5D79BB5C95788250EBF10C163E9E2F1E59AD439710161EDF85C",
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
    curvature = function_text(canonical, "curvature_pieces")
    row_spec = function_text(canonical, "row_spec")
    second_order = class_text(producer, "SO")
    built = function_text(producer, "build")
    pieces = function_text(producer, "pieces")

    assert "tail = [zero, zero, zero] + left[3:]" in common
    assert "base_v = {rank: convolution(tail, right_base, rank, zero)" in common
    assert "direction_v = {rank: convolution(tail, right_direction, rank, zero)" in common
    assert "base_v = common['base_v']" in curvature
    assert "direction_v = common['direction_v']" in curvature
    assert "curvature_grade(base_v, degree, zero, h)" in curvature
    assert "cross_grade(base_v, direction_v, degree, zero, h)" in curvature
    assert "curvature_grade(direction_v, degree, zero, h)" in curvature
    assert "degree <= PIECE_DEGREE_BOUNDS['curvature']['linear']" in curvature
    assert "degree <= PIECE_DEGREE_BOUNDS['curvature']['direction']" in curvature
    assert "scales = (('base', 4), ('linear', 2))" in row_spec
    assert "scales = (('base', 1), ('linear', 1), ('direction', 1))" in row_spec

    assert "self.z * other.t + self.o * other.o + self.t * other.z" in second_order
    assert "tail = [SO(zero, zero, zero), SO(zero, zero, zero), SO(zero, zero, zero)] + left[3:]" in built
    assert "weight * tail[index] * right[rank - index][0]" in built
    assert "weight * tail[index] * direction[rank - index][0]" in built
    assert "assert not pair[0].z and (not pair[1].z)" in built
    assert "curvature(v, outer, h, zero).t" in pieces
    assert "cross(v, dv, outer, h, zero).t" in pieces
    assert "curvature(dv, outer, h, zero).t" in pieces
    assert "full C" not in pieces

    surviving = [
        name
        for name, bound in (("base", 16), ("linear", 15), ("direction", 14))
        if 14 <= bound
    ]
    assert surviving == ["base", "linear", "direction"]
    base_monomials = math.comb(2 + 4, 4)
    assert base_monomials == 15
    bounds = []
    for outer in range(3):
        degree = 14 - outer
        reduced = math.comb(degree + 8, 8) - math.comb(degree + 3, 3)
        if outer == 0:
            reduced -= math.comb(degree + 4, 4)
        bounds.append(base_monomials * reduced)
    assert bounds == [4740450, 3043950, 1882725]

    report = {
        "schema": "rank8-low-low-a23-mixed-cross-curvature-grade14-formula-scope-audit-agent-v1",
        "status": "PASS_CANONICAL_GRADE14_CURVATURE_SCOPE_TAIL_V_ALL_THREE_PIECES_DISTINCT_FACES",
        "canonical_source": {"path": CANONICAL[0], "sha256": CANONICAL[1]},
        "producer_source": {"path": PRODUCER[0], "sha256": PRODUCER[1]},
        "dependency": {"path": DEPENDENCY[0], "sha256": DEPENDENCY[1]},
        "checks": {
            "canonical_oriented_left_tail_V": True,
            "full_convolution_C_excluded": True,
            "exact_base_degree": 2,
            "surviving_pieces": ["base", "linear", "direction"],
            "middle_scales": {"base": 4, "linear": 2, "direction": 0},
            "far_scales": {"base": 1, "linear": 1, "direction": 1},
            "faces_must_be_computed_separately": True,
        },
        "exact_mixed_support_universe_bounds": {
            "outer_0": bounds[0],
            "outer_1": bounds[1],
            "outer_2": bounds[2],
            "total": sum(bounds),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    output = HERE / "rank8_low_low_a23_mixed_cross_curvature_grade14_formula_scope_audit_agent_20260823.json"
    print("PASS", output, atomic_json(output, report), flush=True)


if __name__ == "__main__":
    main()
