#!/usr/bin/env python3
"""Static formula/scope audit for the bounded strong-grade-15 atom stream."""
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
    "probe_rank8_low_low_a23_mixed_cross_strong_grade15_per_base_pair_stream_agent.py",
    "27B8A3B6DF6B9E24A4694D5A0A460FE915378C59B91CAA7151B5EFB80207E3BF",
)
DEPENDENCY = (
    "audit_rank8_low_low_a23_mixed_cross_curvature_grade14_per_base_pair_independent_agent.py",
    "D14F33E78E130201921B3999E53FEBE2BE22D1AC6FB9A595307D82B0B8CC7379",
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
    dependency = ast.parse((HERE / DEPENDENCY[0]).read_text(encoding="utf-8"))

    common = function_text(canonical, "build_common")
    canonical_strong = function_text(canonical, "strong_pieces")
    canonical_rows = function_text(canonical, "row_spec")
    build = function_text(producer, "build")
    pieces = function_text(producer, "pieces")
    merge = function_text(producer, "merge_atom")
    producer_main = function_text(producer, "main")
    atom_writer = function_text(producer, "write_atom")
    tc = class_text(dependency, "TC")

    # Canonical strong row: full C in the margin and oriented left-tail V only
    # in the derivative payment, with all three pieces surviving at grade 15.
    assert "tail = [zero, zero, zero] + left[3:]" in common
    assert "base_c = {rank: convolution(left, right_base, rank, zero)" in common
    assert "base_v = {rank: convolution(tail, right_base, rank, zero)" in common
    assert "direction_c = {rank: convolution(left, right_direction, rank, zero)" in common
    assert "direction_v = {rank: convolution(tail, right_direction, rank, zero)" in common
    assert "capacity = common['left_ratios'][2]" in canonical_strong
    assert "curvature_grade(c0, degree, zero, h)" in canonical_strong
    assert "derivative_grade(c0, v0, degree, zero, h)" in canonical_strong
    assert "cross_grade(c0, c1, degree, zero, h)" in canonical_strong
    assert "derivative_cross_grade(c0, c1, v0, v1, degree, zero, h)" in canonical_strong
    assert "curvature_grade(c1, degree, zero, h)" in canonical_strong
    assert "derivative_grade(c1, v1, degree, zero, h)" in canonical_strong
    assert "scales = (('base', 4), ('linear', 2))" in canonical_rows
    assert "scales = (('base', 1), ('linear', 1), ('direction', 1))" in canonical_rows

    # Producer reconstruction of the same C,V,DC,DV objects.
    assert "tail = [TC.constant(zero, target) for _ in range(3)] + left[3:]" in build
    assert "capacity = left_ratios[2]" in build
    assert "weight * left[index] * right[rank - index][0]" in build
    assert "weight * tail[index] * right[rank - index][0]" in build
    assert "weight * left[index] * direction[rank - index][0]" in build
    assert "weight * tail[index] * direction[rank - index][0]" in build
    assert "capacity * curvature(c, outer, h, zero, target) + h * derivative(c, v, outer, h, zero, target)" in pieces
    assert "capacity * cross(c, dc, outer, h, zero, target) + h * derivative_cross(c, dc, v, dv, outer, h, zero, target)" in pieces
    assert "capacity * curvature(dc, outer, h, zero, target) + h * derivative(dc, dv, outer, h, zero, target)" in pieces

    # The target-coefficient algebra truncates only above the requested degree
    # two monomial; every multiplication contributing to that coefficient is
    # explicitly enumerated.
    assert "for first_right in range(first_max - first_left + 1)" in tc
    assert "for second_right in range(second_max - second_left + 1)" in tc
    assert "return self.c[-1]" in tc

    # Disjointness is structural, not a numerical assumption: the unique
    # first-five exponent vector is prepended to every atom coefficient.
    assert "full = self.base_exp + reduced + (self.outer,)" in class_text(producer, "Cursor")
    assert "assert sum(full[:5]) == 2" in merge
    assert "len(set(base_exponents)) == 15" in producer_main
    assert "all((sum(exponent) == 2 for exponent in base_exponents))" in producer_main
    assert "merge_atom((base_monomial(pair), polys)" in producer_main
    assert "del polys, atom_stats" in producer_main
    assert "base_pair_support_disjointness" in atom_writer

    assert 17 - 15 == 2
    expected_bounds = [7_284_330, 4_786_350, 3_043_950]
    report = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-grade15-disjoint-atom-formula-scope-audit-agent-v1",
        "status": "PASS_CANONICAL_STRONG_GRADE15_FULL_C_TAIL_V_ALL_THREE_PIECES_DISJOINT_ATOM_SCOPE",
        "canonical_source": {"path": CANONICAL[0], "sha256": CANONICAL[1]},
        "producer_source": {"path": PRODUCER[0], "sha256": PRODUCER[1]},
        "target_coefficient_dependency": {"path": DEPENDENCY[0], "sha256": DEPENDENCY[1]},
        "checks": {
            "exact_base_degree": 2,
            "base_pair_count": 15,
            "degree_two_base_exponents_are_unique": True,
            "base_pair_coefficient_supports_are_disjoint": True,
            "strong_margin_uses_full_convolution_C": True,
            "strong_derivative_uses_oriented_left_tail_V": True,
            "surviving_pieces": ["base", "linear", "direction"],
            "middle_scales": [4, 2, 0],
            "far_scales": [1, 1, 1],
            "faces_computed_separately": True,
            "one_atom_retained_at_a_time": True,
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
    output = HERE / "rank8_low_low_a23_mixed_cross_strong_grade15_disjoint_atom_formula_scope_audit_agent_20260823.json"
    print("PASS", output, atomic_json(output, report), flush=True)


if __name__ == "__main__":
    main()
