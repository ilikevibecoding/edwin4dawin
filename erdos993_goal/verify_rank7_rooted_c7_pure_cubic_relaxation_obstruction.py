#!/usr/bin/env python3
"""Exact no-go point for reusing the old pure-cubic terminal cone as C7 proof."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

import prove_rank7_pure_cubic_b2_5_joint_bernstein as cone
import prove_rank7_pure_cubic_b2_5_rooted_c7 as cross_runner


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank7_rooted_c7_pure_cubic_relaxation_obstruction_exact_20260820.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def text(value: sp.Expr) -> str:
    value = sp.factor(value)
    numerator, denominator = sp.fraction(value)
    return f"{numerator}/{denominator}"


def main() -> int:
    cross_runner.install_cross_objective()
    n, p, q, r, edge_e = 23, 0, 7, 1, 20
    template, lower, upper, feasibility = cone.base_cell(n, p, q, r, 0, edge_e)
    point = {cone.U: sp.Rational(17, 20), cone.V: 0, cone.Z: 0, cone.A: 0}
    active = upper[0]
    raw_constraints = [value - active for value in upper[1:]]
    raw_constraints += [active - value for value in lower]
    raw_constraints += list(feasibility)
    evaluated_constraints = [sp.factor(value.subs(point)) for value in raw_constraints]
    assert all(value >= 0 for value in evaluated_constraints)
    raw_cross = sp.factor(template.subs(cone.BVAR, active).subs(point))
    assert raw_cross < 0

    normalized, constraints, _, _ = cone.cell(n, p, q, r, 0, "upper", 0, edge_e)
    normalized_cross = sp.factor(normalized.subs(point))
    normalized_constraints = [sp.factor(value.subs(point)) for value in constraints]
    assert normalized_cross < 0
    assert all(value >= 0 for value in normalized_constraints)

    report = {
        "status": "PASS_EXACT_ROOTED_C7_PURE_CUBIC_RELAXATION_OBSTRUCTION",
        "meaning": (
            "The coefficient cone used for the proved pure-cubic terminal residual "
            "contains an exact feasible formal point with C7<0. Extra literal "
            "root-neighborhood or subdivision coupling is necessary."
        ),
        "cell": {"n": n, "k": p - q, "p": p, "q": q, "root_degree": r, "edge_e": edge_e},
        "unit_cube_point": {"U": "17/20", "V": "0/1", "Z": "0/1", "A": "0/1"},
        "active_endpoint": "b=(m-4)*a/5",
        "active_b": text(active.subs(point)),
        "raw_constraints": [text(value) for value in evaluated_constraints],
        "raw_C7": text(raw_cross),
        "normalized_constraints": [text(value) for value in normalized_constraints],
        "normalized_C7_numerator": text(normalized_cross),
        "tree_counterexample": False,
        "warning": (
            "This point belongs to a safe outer coefficient enclosure. It is not "
            "asserted to be realized by any tree and does not contradict the exact "
            "B2=5 terminal-broom theorem."
        ),
        "artifacts": {
            path.name: sha256(path)
            for path in (
                HERE / "prove_rank7_pure_cubic_b2_5_joint_bernstein.py",
                HERE / "prove_rank7_pure_cubic_b2_5_rooted_c7.py",
                Path(__file__).resolve(),
            )
        },
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"raw C7={report['raw_C7']}")
    print(f"wrote {OUTPUT.name}; sha256={sha256(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
