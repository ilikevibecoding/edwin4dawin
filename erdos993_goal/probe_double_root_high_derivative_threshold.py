#!/usr/bin/env python3
"""Exact adversarial probe with the endpoint's common double root retained.

The broad proper-position theorem is false.  The actual defect-three pair has
more structure: g and h share their largest root 0 with multiplicity two.
This script tests the corresponding narrower statement over rational-rooted
g and arbitrary exact interlacers h satisfying that boundary condition.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

import sympy as sp


X, Y, q = sp.symbols("X Y q")
OUT = Path("double_root_high_derivative_threshold_probe_20260802.json")
RNG = random.Random(993_20260802 + 1)


def derivative_square(poly: sp.Expr, order: int) -> sp.Expr:
    other = poly.subs(X, Y)
    return sp.expand(sum(
        sp.binomial(order, a) * sp.diff(poly, X, a)
        * sp.diff(other, Y, order - a)
        for a in range(order + 1)
    ))


def endpoint_target(g: sp.Expr, h: sp.Expr, d: int) -> sp.Expr:
    return sp.expand(derivative_square(g, d) - derivative_square(h, d - 2))


def g_roots(N: int, variant: int) -> list[sp.Rational]:
    if variant == 0:
        return [sp.Rational(-i) for i in range(N - 2, 0, -1)]
    if variant == 1:
        return [sp.Rational(-(i * i)) for i in range(N - 2, 0, -1)]
    if variant == 2:
        return [sp.Rational(-(2**i)) for i in range(N - 3, -1, -1)]
    if variant == 3:
        values = []
        current = sp.Rational(0)
        for i in range(N - 2):
            current -= sp.Rational(2 + (3 * i) % 7, 3)
            values.append(current)
        return sorted(values)
    raise ValueError(variant)


def critical_intervals(p0: sp.Poly) -> list[tuple[sp.Rational, sp.Rational]]:
    raw = p0.intervals(eps=sp.Rational(1, 10**18))
    intervals = [(sp.Rational(ab[0]), sp.Rational(ab[1])) for ab, mult in raw for _ in range(mult)]
    assert len(intervals) == p0.degree()
    assert all(right < 0 for left, right in intervals)
    return intervals


def between(left_interval: tuple[sp.Rational, sp.Rational],
            right_interval: tuple[sp.Rational, sp.Rational],
            numerator: int, denominator: int) -> sp.Rational:
    left = sum(left_interval) / 2
    right = sum(right_interval) / 2
    value = ((denominator - numerator) * left + numerator * right) / denominator
    assert left_interval[1] < value < right_interval[0]
    return value


def interlacer_h(g: sp.Expr, pattern: int) -> tuple[sp.Expr, list[sp.Rational], sp.Expr]:
    gp = sp.Poly(sp.diff(g, X), X)
    assert gp.nth(0) == 0
    p0 = sp.Poly(sp.cancel(gp.as_expr() / X), X)
    intervals = critical_intervals(p0)
    choices = {
        0: (1, 2),
        1: (1, 100),
        2: (99, 100),
        3: (1, 10**5),
        4: (10**5 - 1, 10**5),
    }
    q_roots: list[sp.Rational] = []
    for i in range(len(intervals) - 1):
        if pattern == 5:
            num, den = ((1, 10**4) if i % 2 == 0 else (10**4 - 1, 10**4))
        elif pattern == 6:
            den = 10**6
            num = RNG.randint(1, den - 1)
        else:
            num, den = choices[pattern]
        q_roots.append(between(intervals[i], intervals[i + 1], num, den))
    q_roots.append(sp.Rational(0))
    q_expr = sp.expand(p0.LC() * sp.prod(X - root for root in q_roots))
    q_poly = sp.Poly(q_expr, X)
    assert q_poly.LC() == p0.LC()
    h = sp.expand(X * q_expr)
    assert sp.Poly(h, X).LC() == gp.LC()
    assert sp.rem(sp.Poly(g, X), sp.Poly(X**2, X)) == 0
    assert sp.rem(sp.Poly(h, X), sp.Poly(X**2, X)) == 0
    # Exact alternating-root certificate after cancelling the common X.
    assert int(p0.count_roots(-sp.oo, sp.oo)) == p0.degree()
    assert int(q_poly.count_roots(-sp.oo, sp.oo)) == q_poly.degree()
    for i, root in enumerate(q_roots[:-1]):
        assert intervals[i][1] < root < intervals[i + 1][0]
    assert intervals[-1][1] < q_roots[-1]
    return h, q_roots, p0.as_expr()


def primitive_line(poly: sp.Expr) -> tuple[sp.Poly, dict[str, object]]:
    ax, ay = RNG.randint(-220, 120), RNG.randint(-220, 120)
    bx, by = RNG.randint(1, 50), RNG.randint(1, 50)
    raw = sp.Poly(sp.expand(poly.subs({X: ax + bx*q, Y: ay + by*q})), q)
    values = [sp.Rational(raw.nth(k)) for k in range(raw.degree() + 1)]
    denominator = sp.ilcm(*[value.q for value in values])
    integers = [int(value * denominator) for value in values]
    divisor = abs(math.gcd(*integers))
    coefficients = [value // divisor for value in integers]
    line = sp.Poly(sum(value*q**k for k, value in enumerate(coefficients)), q)
    real = int(line.count_roots(-sp.oo, sp.oo))
    return line, {
        "X": f"{ax}+{bx}q",
        "Y": f"{ay}+{by}q",
        "degree": line.degree(),
        "real_roots_with_multiplicity": real,
        "nonreal_roots": line.degree() - real,
        "primitive_integer_coefficients_ascending": coefficients,
    }


def main() -> None:
    cases: list[dict[str, object]] = []
    first_failure = None
    total_lines = 0
    lower_failures = 0
    for N in range(4, 13):
        d0 = (N + 3) // 2
        for variant in range(4):
            roots = g_roots(N, variant)
            g = sp.expand(X**2 * sp.prod(X - root for root in roots))
            # count_roots counts the double boundary zero once here.
            assert int(sp.Poly(g, X).count_roots(-sp.oo, sp.oo)) == N - 1
            for pattern in range(7):
                h, q_roots, p0 = interlacer_h(g, pattern)
                threshold = endpoint_target(g, h, d0)
                lower = endpoint_target(g, h, d0 - 1)
                case = {
                    "N": N,
                    "d0": d0,
                    "g_variant": variant,
                    "g_nonzero_roots": [str(root) for root in roots],
                    "interlacer_pattern": pattern,
                    "q_roots_after_common_X_cancellation": [str(root) for root in q_roots],
                    "threshold_lines": 0,
                    "threshold_failures": 0,
                    "lower_control_failure": 0,
                }
                for _ in range(12):
                    _, record = primitive_line(threshold)
                    total_lines += 1
                    case["threshold_lines"] += 1
                    if record["nonreal_roots"]:
                        case["threshold_failures"] += 1
                        first_failure = {
                            "case": case,
                            "line": record,
                            "g": str(g),
                            "g_prime_over_X": str(p0),
                            "h": str(h),
                        }
                        break
                _, control = primitive_line(lower)
                if control["nonreal_roots"]:
                    case["lower_control_failure"] = 1
                    lower_failures += 1
                cases.append(case)
                print(
                    f"N={N} g={variant} h={pattern} d0={d0} "
                    f"threshold_fail={case['threshold_failures']} "
                    f"lower_fail={case['lower_control_failure']}",
                    flush=True,
                )
                if first_failure:
                    break
            if first_failure:
                break
        if first_failure:
            break

    report = {
        "kind": "double_root_high_derivative_threshold_probe",
        "date": "2026-08-02",
        "narrowed_statement": (
            "The proposed high-derivative stability conclusion, additionally "
            "assuming g and h share their largest root with multiplicity two."
        ),
        "status": "COUNTEREXAMPLE" if first_failure else "NO_COUNTEREXAMPLE_IN_EXACT_PROBE",
        "exact_threshold_line_tests": total_lines,
        "lower_order_control_failures": lower_failures,
        "cases": cases,
        "first_threshold_failure": first_failure,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "exact_threshold_line_tests": total_lines,
        "lower_order_control_failures": lower_failures,
        "cases": len(cases),
        "output": str(OUT.resolve()),
    }, indent=2))


if __name__ == "__main__":
    main()
