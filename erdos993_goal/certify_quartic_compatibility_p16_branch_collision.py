#!/usr/bin/env python3
"""Exact p=16 interior collision and branch-alignment certificate."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from certify_quartic_compatibility_p16_subdivision import (
    C_PARAMETER,
    U,
    V,
    Y,
    raw_changed,
    residual_polynomial,
)
from prove_quartic_minimal_compatibility_resultants import primitive_digest
from verify_adjacent_cubic_trailing_minor_interlacer import intervals


HERE = Path(__file__).resolve().parent
REPORT = HERE / "quartic_compatibility_p16_branch_collision_20260806.json"


def text_interval(interval: tuple[sp.Rational, sp.Rational]) -> list[str]:
    return [str(interval[0]), str(interval[1])]


def rows(c: sp.Rational) -> tuple[sp.Poly, sp.Poly]:
    u = sp.Rational(1, 100)
    v = sp.Rational(99, 100)
    gamma = [c, 1 - c * (u + v), -(u + v) + c * u * v, u * v]
    current = raw_changed(16, 3, gamma)
    adjacent = raw_changed(14, 4, gamma)
    shifted = sp.Poly(-Y * adjacent.as_expr() / 4, Y, domain=sp.QQ)
    return current, shifted


def endpoint_record(c: sp.Rational) -> dict[str, object]:
    current, shifted = rows(c)
    current_roots = intervals(current)
    shifted_roots = intervals(shifted, allow_zero=True)
    assert len(current_roots) == len(shifted_roots) == 8
    lower_branches_alternate = all(
        shifted_roots[index][1] < current_roots[index][0]
        and current_roots[index][1] < shifted_roots[index + 1][0]
        for index in range(7)
    )
    assert lower_branches_alternate
    if current_roots[-1][1] < shifted_roots[-1][0]:
        top_order = "current_below_shifted"
    elif shifted_roots[-1][1] < current_roots[-1][0]:
        top_order = "shifted_below_current"
    else:
        raise AssertionError("top root intervals were not disjoint")
    return {
        "c": str(c),
        "lower_seven_branch_alternation": True,
        "top_root_order": top_order,
        "current_top_root_interval": text_interval(current_roots[-1]),
        "shifted_top_root_interval": text_interval(shifted_roots[-1]),
        "current_digest": primitive_digest(current),
        "shifted_digest": primitive_digest(shifted),
    }


def main() -> None:
    u = sp.Rational(1, 100)
    v = sp.Rational(99, 100)
    residual = residual_polynomial(16, 3)
    specialized = sp.Poly(
        residual.as_expr().subs({U: u, V: v}),
        C_PARAMETER,
        domain=sp.QQ,
    )
    real_roots = specialized.intervals(eps=sp.Rational(1, 10) ** 12)
    negative = [item for item in real_roots if item[0][1] < 0]
    positive = [item for item in real_roots if item[0][0] > 0]
    assert len(negative) == 5
    assert len(positive) == 1 and positive[0][1] == 1
    collision_interval = positive[0][0]
    lower = endpoint_record(collision_interval[0])
    upper = endpoint_record(collision_interval[1])
    assert lower["top_root_order"] != upper["top_root_order"]
    assert specialized.eval(collision_interval[0]) * specialized.eval(
        collision_interval[1]
    ) < 0
    report = {
        "status": "EXACT_INTERIOR_BRANCH_ALIGNED_COLLISION_AT_P16",
        "boundary": {"p": 16, "alpha": 3},
        "parameters": {"u": "1/100", "v": "99/100"},
        "residual_resultant_degree_in_c": specialized.degree(),
        "real_root_counts_negative_positive": [5, 1],
        "unique_positive_simple_collision_interval": text_interval(
            collision_interval
        ),
        "endpoint_sign_change": True,
        "lower_endpoint": lower,
        "upper_endpoint": upper,
        "branch_classification": (
            "The lower seven branches alternate at both endpoints, while "
            "only the two largest roots exchange order. Since the interval "
            "contains exactly one simple resultant zero, that zero is a "
            "same-index collision of the largest roots."
        ),
        "logical_scope": (
            "This disproves uniform resultant nonvanishing at p=16. It does "
            "not disprove compatibility: the collision is weakly interlacing "
            "and branch-aligned."
        ),
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
