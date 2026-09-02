#!/usr/bin/env python3
"""Exact symbolic audit of the cached-row and quadratic-component route."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
FINAL_PROBE = ROOT / "probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_fast_agent_v3.py"
CACHED_HELPER = ROOT / "probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_fast_agent.py"
POLARIZATION_HELPER = ROOT / "probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_fast_agent_v2.py"
ORIGINAL_PROBE = ROOT / "probe_rank8_low_low_suffix3_gap0_factored_payment_outer_cell_flint.py"
EXPECTED = {
    FINAL_PROBE.name:
        "72149062A17FF2A0FEB427BE2D15AD66E532387DDB138CB9E3C3C150615B8F89",
    CACHED_HELPER.name:
        "3205B7BF2C5FEBD6F9A28D9A091A3780E79AD63F856C69D7543C2DA453F229E9",
    POLARIZATION_HELPER.name:
        "D717BAC13AAFCB0D344B6102657ACE7618501839BC23E24F2861AD11DF9D71B5",
    ORIGINAL_PROBE.name:
        "00288AAF49B4A002240AD1DB153DA9195FDC763B84AA8BDDBCA036F70A1A8870",
}
OUTPUT = ROOT / "rank8_low_low_suffix3_gap0_fast_agent_symbolic_identity_audit_20260822.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def expression_hash(expression) -> str:
    rendered = sp.srepr(sp.expand(expression)).encode("utf-8")
    return hashlib.sha256(rendered).hexdigest().upper()


def curvature(v7, v8, v9, h):
    return v8**2 - v7 * v9 - h * v7 * v8


def margin(c7, c8, c9, h):
    return c8**2 - c7 * c9 - h * c7 * c8


def derivative(c7, c8, c9, v7, v8, v9, h):
    return (
        2 * c8 * v8 - v7 * c9 - c7 * v9
        - h * (v7 * c8 + c7 * v8)
    )


def audit_quadratic(label, expression, direction_expression, multiplier):
    polynomial = sp.Poly(sp.expand(expression), multiplier)
    assert polynomial.degree() <= 2
    base = sp.expand(polynomial.nth(0))
    linear = sp.expand(polynomial.nth(1))
    quadratic = sp.expand(polynomial.nth(2))
    assert sp.expand(quadratic - direction_expression) == 0
    at_minus = sp.expand(expression.subs(multiplier, -1))
    at_zero = sp.expand(expression.subs(multiplier, 0))
    at_plus = sp.expand(expression.subs(multiplier, 1))
    original_middle = sp.expand(4 * at_zero + at_plus - at_minus)
    component_middle = sp.expand(4 * base + 2 * linear)
    polarized_middle = sp.expand(2 * (at_zero + at_plus - direction_expression))
    assert sp.expand(original_middle - component_middle) == 0
    assert sp.expand(original_middle - polarized_middle) == 0
    assert sp.expand(at_plus - (base + linear + quadratic)) == 0
    return {
        "label": label,
        "multiplier_degree": polynomial.degree(),
        "quadratic_equals_direction_evaluation": True,
        "original_equals_component_middle": True,
        "original_equals_polarized_middle": True,
        "far_equals_base_plus_linear_plus_quadratic": True,
        "expression_sha256": expression_hash(expression),
        "base_sha256": expression_hash(base),
        "linear_sha256": expression_hash(linear),
        "quadratic_sha256": expression_hash(quadratic),
        "middle_sha256": expression_hash(original_middle),
    }


def main():
    actual = {
        path.name: sha256(path)
        for path in (FINAL_PROBE, CACHED_HELPER, POLARIZATION_HELPER, ORIGINAL_PROBE)
    }
    assert actual == EXPECTED
    m, h, capacity = sp.symbols("m h capacity")
    ratios = sp.symbols("r0:9")
    right_rows = []
    affine_checks = []
    for rank in range(10):
        factors = list(ratios[:rank])
        if rank >= 3:
            factors[2] = ratios[2] + m * h
        row = sp.sympify(sp.prod(factors))
        base = sp.expand(row.subs(m, 0))
        direction = sp.expand(sp.diff(row, m).subs(m, 0))
        assert sp.expand(row - base - m * direction) == 0
        assert sp.Poly(row, m).degree() <= 1
        right_rows.append(row)
        affine_checks.append({
            "rank": rank,
            "degree": sp.Poly(row, m).degree(),
            "identity_sha256": expression_hash(row),
        })

    c70, c71, c80, c81, c90, c91 = sp.symbols(
        "c70 c71 c80 c81 c90 c91"
    )
    v70, v71, v80, v81, v90, v91 = sp.symbols(
        "v70 v71 v80 v81 v90 v91"
    )
    c7, c8, c9 = c70 + m*c71, c80 + m*c81, c90 + m*c91
    v7, v8, v9 = v70 + m*v71, v80 + m*v81, v90 + m*v91
    curvature_expression = curvature(v7, v8, v9, h)
    curvature_direction = curvature(v71, v81, v91, h)
    strong_expression = (
        capacity * margin(c7, c8, c9, h)
        + h * derivative(c7, c8, c9, v7, v8, v9, h)
    )
    strong_direction = (
        capacity * margin(c71, c81, c91, h)
        + h * derivative(c71, c81, c91, v71, v81, v91, h)
    )
    assert m not in capacity.free_symbols
    rows = [
        audit_quadratic(
            "curvature", curvature_expression, curvature_direction, m,
        ),
        audit_quadratic("strong", strong_expression, strong_direction, m),
    ]
    report = {
        "schema": "rank8-low-low-suffix3-gap0-fast-agent-symbolic-identity-v1",
        "status": "PASS_EXACT_SYMBOLIC_CACHED_QUADRATIC_IDENTITY",
        "right_factor_rows": {
            "count": len(right_rows),
            "only_ratio_2_depends_on_multiplier": True,
            "all_affine_base_plus_direction": True,
            "rows": affine_checks,
        },
        "capacity_independence": {
            "capacity_has_no_multiplier": True,
            "reason": "capacity is the left cumulative ratio left_ratios[2]",
        },
        "quadratic_auxiliaries": rows,
        "immutable_sources": actual,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report), flush=True)


if __name__ == "__main__":
    main()
