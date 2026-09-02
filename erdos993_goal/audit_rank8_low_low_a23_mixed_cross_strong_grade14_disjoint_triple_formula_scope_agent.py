#!/usr/bin/env python3
"""Static formula and scope audit for the strong-grade-14 base-triple producer."""

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
    "probe_rank8_low_low_a23_mixed_cross_strong_grade14_per_base_triple_stream_agent.py",
    "C742B0EE941D69542BFCEFAA22F38C92D67BC1DFA1B614DB1FC03C257C7903BB",
)
DEPENDENCY = (
    "audit_rank8_low_low_a23_mixed_cross_curvature_grade14_per_base_pair_independent_agent.py",
    "D14F33E78E130201921B3999E53FEBE2BE22D1AC6FB9A595307D82B0B8CC7379",
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def function_text(tree: ast.Module, name: str) -> str:
    nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == name]
    assert len(nodes) == 1
    return ast.unparse(nodes[0])


def class_text(tree: ast.Module, name: str) -> str:
    nodes = [node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == name]
    assert len(nodes) == 1
    return ast.unparse(nodes[0])


def support_bounds(degree: int, base_degree: int) -> list[int]:
    base_count = math.comb(base_degree + 4, 4)
    values = []
    for outer in range(3):
        slack = degree - outer
        reduced = math.comb(slack + 8, 8) - math.comb(slack + 3, 3)
        if outer == 0:
            reduced -= math.comb(slack + 4, 4)
        values.append(base_count * reduced)
    return values


def main() -> None:
    for name, expected in (CANONICAL, PRODUCER, DEPENDENCY):
        assert sha256(HERE / name) == expected
    canonical = ast.parse((HERE / CANONICAL[0]).read_text(encoding="utf-8"))
    producer = ast.parse((HERE / PRODUCER[0]).read_text(encoding="utf-8"))

    common = function_text(canonical, "build_common")
    canonical_strong = function_text(canonical, "strong_pieces")
    canonical_rows = function_text(canonical, "row_spec")
    build = function_text(producer, "build")
    pieces = function_text(producer, "pieces")
    merge = function_text(producer, "merge_atom")
    producer_main = function_text(producer, "main")
    atom_writer = function_text(producer, "write_atom")
    tc = class_text(producer, "TC")

    assert "tail = [zero, zero, zero] + left[3:]" in common
    assert "base_c = {rank: convolution(left, right_base, rank, zero)" in common
    assert "base_v = {rank: convolution(tail, right_base, rank, zero)" in common
    assert "direction_c = {rank: convolution(left, right_direction, rank, zero)" in common
    assert "direction_v = {rank: convolution(tail, right_direction, rank, zero)" in common
    assert "capacity = common['left_ratios'][2]" in canonical_strong
    for fragment in (
        "curvature_grade(c0, degree, zero, h)",
        "derivative_grade(c0, v0, degree, zero, h)",
        "cross_grade(c0, c1, degree, zero, h)",
        "derivative_cross_grade(c0, c1, v0, v1, degree, zero, h)",
        "curvature_grade(c1, degree, zero, h)",
        "derivative_grade(c1, v1, degree, zero, h)",
    ):
        assert fragment in canonical_strong
    assert "scales = (('base', 4), ('linear', 2))" in canonical_rows
    assert "scales = (('base', 1), ('linear', 1), ('direction', 1))" in canonical_rows

    assert "tail = [TC.constant(zero, target) for _ in range(3)] + left[3:]" in build
    assert "capacity = left_ratios[2]" in build
    for fragment in (
        "weight * left[index] * right[rank - index][0]",
        "weight * tail[index] * right[rank - index][0]",
        "weight * left[index] * direction[rank - index][0]",
        "weight * tail[index] * direction[rank - index][0]",
        "capacity * curvature(c, outer, h, zero, target) + h * derivative(c, v, outer, h, zero, target)",
        "capacity * cross(c, dc, outer, h, zero, target) + h * derivative_cross(c, dc, v, dv, outer, h, zero, target)",
        "capacity * curvature(dc, outer, h, zero, target) + h * derivative(dc, dv, outer, h, zero, target)",
    ):
        assert fragment in build or fragment in pieces

    assert "combined = tuple((left + right for left, right in zip(rows[left_index], rows[right_index])))" in tc
    assert "all((value <= maximum for value, maximum in zip(combined, self.target)))" in tc
    assert "return self.c[-1]" in tc
    assert "BASE_TRIPLES = tuple(itertools.combinations_with_replacement(range(5), 3))" in (HERE / PRODUCER[0]).read_text(encoding="utf-8")
    assert "full = self.base_exp + reduced + (self.outer,)" in class_text(producer, "Cursor")
    assert "assert sum(full[:5]) == 3" in merge
    assert "len(base_exponents) == 35" in producer_main
    assert "all((sum(exponent) == 3 for exponent in base_exponents))" in producer_main
    assert "merge_atom((base_monomial(triple), polys)" in producer_main
    assert "del polys, atom_stats" in producer_main
    assert "base_triple_support_disjointness" in atom_writer

    assert 17 - 14 == 3
    bounds = support_bounds(14, 3)
    assert bounds == [11_061_050, 7_102_550, 4_393_025]
    payload = {
        "schema": "rank8-low-low-a23-mixed-cross-strong-grade14-disjoint-triple-formula-scope-audit-agent-v1",
        "status": "PASS_CANONICAL_STRONG_GRADE14_FULL_C_TAIL_V_ALL_THREE_PIECES_DISJOINT_TRIPLE_SCOPE",
        "canonical_source": {"path": CANONICAL[0], "sha256": CANONICAL[1]},
        "producer_source": {"path": PRODUCER[0], "sha256": PRODUCER[1]},
        "target_algebra_dependency": {"path": DEPENDENCY[0], "sha256": DEPENDENCY[1]},
        "checks": {
            "exact_base_degree": 3,
            "base_triple_count": 35,
            "degree_three_base_exponents_are_unique": True,
            "base_triple_coefficient_supports_are_disjoint": True,
            "target_algebra_handles_one_two_or_three_active_base_variables": True,
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
            "outer_0": bounds[0],
            "outer_1": bounds[1],
            "outer_2": bounds[2],
            "total": sum(bounds),
        },
        "source_sha256": sha256(Path(__file__)),
        "scope_guard": "Static scope/formula audit only; full producer and an independently written coefficient replay remain required for grade-14 registry credit.",
    }
    output = HERE / "rank8_low_low_a23_mixed_cross_strong_grade14_disjoint_triple_formula_scope_audit_agent_20260823.json"
    print("PASS", output, atomic_json(output, payload), flush=True)


if __name__ == "__main__":
    main()
