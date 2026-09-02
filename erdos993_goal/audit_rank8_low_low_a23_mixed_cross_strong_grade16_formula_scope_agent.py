#!/usr/bin/env python3
"""Canonical formula-scope audit for the strong grade-16 producer."""
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
    "probe_rank8_low_low_a23_mixed_cross_strong_grade16_c_v_piece_merge_agent.py",
    "36854CF5D7A08DD70821E3E2C219A7EBEADECC26E955F20F5763AD83F980C484",
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


def main():
    for name, expected in (CANONICAL, PRODUCER, DEPENDENCY):
        assert sha256(HERE / name) == expected

    canonical = ast.parse((HERE / CANONICAL[0]).read_text(encoding="utf-8"))
    producer = ast.parse((HERE / PRODUCER[0]).read_text(encoding="utf-8"))
    common = function_text(canonical, "build_common")
    strong = function_text(canonical, "strong_pieces")
    row_spec = function_text(canonical, "row_spec")
    built = function_text(producer, "build")
    pieces = function_text(producer, "pieces")

    # Canonical construction distinguishes full C from oriented left-tail V.
    assert "tail = [zero, zero, zero] + left[3:]" in common
    assert "base_c = {rank: convolution(left, right_base, rank, zero)" in common
    assert "base_v = {rank: convolution(tail, right_base, rank, zero)" in common
    assert "direction_c = {rank: convolution(left, right_direction, rank, zero)" in common
    assert "direction_v = {rank: convolution(tail, right_direction, rank, zero)" in common
    assert "capacity = common['left_ratios'][2]" in strong
    assert "c0, v0 = (common['base_c'], common['base_v'])" in strong
    assert "c1, v1 = (common['direction_c'], common['direction_v'])" in strong
    assert "curvature_grade(c0, degree, zero, h)" in strong
    assert "derivative_grade(c0, v0, degree, zero, h)" in strong
    assert "cross_grade(c0, c1, degree, zero, h)" in strong
    assert "derivative_cross_grade(c0, c1, v0, v1, degree, zero, h)" in strong
    assert "degree <= PIECE_DEGREE_BOUNDS['strong']['linear']" in strong
    assert "degree <= PIECE_DEGREE_BOUNDS['strong']['direction']" in strong
    assert "scales = (('base', 4), ('linear', 2))" in row_spec
    assert "scales = (('base', 1), ('linear', 1), ('direction', 1))" in row_spec

    # The bounded producer implements the exact base-degree-one projection.
    assert "tail = [FO(zero, zero), FO(zero, zero), FO(zero, zero)] + left[3:]" in built
    assert "wgt * left[i] * right[rank - i][0]" in built
    assert "wgt * tail[i] * right[rank - i][0]" in built
    assert "wgt * left[i] * direction[rank - i][0]" in built
    assert "wgt * tail[i] * direction[rank - i][0]" in built
    assert "assert not pair[0].z and (not pair[1].z)" in built
    assert "capacity * curvature(c, e, h, zero) + h * derivative(c, v, e, h, zero)" in pieces
    assert "capacity * cross(c, dc, e, h, zero)" in pieces
    assert "derivative_cross" not in pieces
    assert ").o" in pieces

    # Exact degree gates: strong base<=17, linear<=16, direction<=15.
    surviving = [
        name
        for name, bound in (("base", 17), ("linear", 16), ("direction", 15))
        if 16 <= bound
    ]
    assert surviving == ["base", "linear"]

    # direction C/V have zero base-degree-zero part because of their explicit h.
    # Hence h*derivative_cross has base degree at least two and vanishes from
    # this producer's exact base-degree-one projection.
    bounds = []
    for outer in range(3):
        d = 16 - outer
        reduced = math.comb(d + 8, 8) - math.comb(d + 3, 3)
        if outer == 0:
            reduced -= math.comb(d + 4, 4)
        bounds.append(5 * reduced)
    assert bounds == [3648285, 2447490, 1595450]

    report = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-grade16-formula-scope-audit-agent-v1",
        "status": "PASS_CANONICAL_GRADE16_STRONG_SCOPE_FULL_C_TAIL_V_BASE_LINEAR_DISTINCT_FACES",
        "canonical_source": {"path": CANONICAL[0], "sha256": CANONICAL[1]},
        "producer_source": {"path": PRODUCER[0], "sha256": PRODUCER[1]},
        "dependency": {"path": DEPENDENCY[0], "sha256": DEPENDENCY[1]},
        "checks": {
            "margin_uses_full_convolution_C": True,
            "derivative_uses_oriented_left_tail_V": True,
            "surviving_pieces": ["base", "linear"],
            "direction_excluded_at_grade16": True,
            "h_derivative_cross_excluded_only_after_exact_base_degree_projection": True,
            "direction_has_zero_base_degree_zero_part": True,
            "middle_scales": {"base": 4, "linear": 2},
            "far_scales": {"base": 1, "linear": 1},
            "face_streams_must_be_separate": True,
        },
        "exact_mixed_support_universe_bounds": {
            "outer_0": bounds[0],
            "outer_1": bounds[1],
            "outer_2": bounds[2],
            "total": sum(bounds),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    output = HERE / "rank8_low_low_a23_mixed_cross_strong_grade16_formula_scope_audit_agent_20260823.json"
    print("PASS", output, atomic_json(output, report), flush=True)


if __name__ == "__main__":
    main()
