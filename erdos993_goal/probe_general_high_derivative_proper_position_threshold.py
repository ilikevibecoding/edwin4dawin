#!/usr/bin/env python3
"""Adversarial exact tests for the proposed high-derivative theorem.

Proposed statement.  Let g be a real-rooted polynomial of degree N, put
p=g', and let h have degree N-1, the same leading coefficient as p, with
h/p mapping the upper half-plane to the lower half-plane.  Then

  (Dx+Dy)^d[g(x)g(y)]-(Dx+Dy)^(d-2)[h(x)h(y)]

is real stable for d >= floor((N+3)/2).

Unlike the first tests, this script samples the full positive-residue cone

  h/p = 1 + sum_i alpha_i/(x-s_i),  alpha_i>0,

where the roots s_i of p are rational.  We choose g as a hyperbolic
antiderivative of p.  Every hypothesis is therefore exact, not numerical.
Line restrictions are counted by exact Sturm arithmetic.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

import sympy as sp


X, Y, q = sp.symbols("X Y q")
OUT = Path("general_high_derivative_proper_position_threshold_probe_20260802.json")
RNG = random.Random(993_20260802)


def critical_grid(N: int, variant: int) -> list[sp.Rational]:
    """Return N-1 distinct rational critical points."""
    offset = -(N - 2) // 2
    base = [sp.Rational(offset + i) for i in range(N - 1)]
    if variant == 0:
        return base
    if variant == 1:
        # Mild asymmetric rational perturbation, preserving order.
        return [value + sp.Rational((i % 3) - 1, 7) for i, value in enumerate(base)]
    if variant == 2:
        # Nonuniform gaps with an exact affine recentering.
        points = [sp.Rational(0)]
        for i in range(1, N - 1):
            points.append(points[-1] + sp.Rational(3 + (i % 4), 3))
        center = (points[0] + points[-1]) / 2
        return [value - center for value in points]
    raise ValueError(variant)


def hyperbolic_antiderivative(
    critical_roots: list[sp.Rational],
) -> tuple[sp.Expr, sp.Expr, sp.Rational, tuple[sp.Rational, sp.Rational]]:
    """Construct p and a rigorously hyperbolic antiderivative g."""
    p = sp.Poly(sp.prod(X - root for root in critical_roots), X).as_expr()
    primitive = sp.integrate(p, X)
    lower: list[sp.Rational] = []
    upper: list[sp.Rational] = []
    for i, root in enumerate(critical_roots):
        left_sign = -1 if ((len(critical_roots) - i) % 2) else 1
        right_sign = -left_sign
        level = sp.Rational(-primitive.subs(X, root))
        if left_sign > 0 and right_sign < 0:  # local maximum must be positive
            lower.append(level)
        else:  # local minimum must be negative
            upper.append(level)
    lo = max(lower) if lower else sp.Rational(-10**9)
    hi = min(upper) if upper else sp.Rational(10**9)
    if not lo < hi:
        raise ValueError(f"no hyperbolic integration constant: {lo} !< {hi}")
    constant = (lo + hi) / 2
    g = sp.Poly(primitive + constant, X).as_expr()
    gp = sp.Poly(sp.diff(g, X), X)
    assert sp.expand(gp.as_expr() - p) == 0
    assert int(sp.Poly(g, X).count_roots(-sp.oo, sp.oo)) == len(critical_roots) + 1
    return g, p, constant, (lo, hi)


def residue_vector(length: int, sample: int) -> list[sp.Rational]:
    """Positive vectors ranging over balanced and highly skewed rays."""
    if sample == 0:
        return [sp.Rational(1) for _ in range(length)]
    if sample == 1:
        return [sp.Rational(10 ** (i % 5)) for i in range(length)]
    if sample == 2:
        return [sp.Rational(10 ** ((length - 1 - i) % 5)) for i in range(length)]
    if sample == 3:
        return [sp.Rational(1, 10 ** (i % 5)) for i in range(length)]
    if sample == 4:
        return [sp.Rational(10 ** ((2 * i + 1) % 7)) for i in range(length)]
    return [sp.Rational(RNG.randint(1, 10**6), RNG.randint(1, 10**3)) for _ in range(length)]


def positive_residue_interlacer(
    p: sp.Expr,
    roots: list[sp.Rational],
    residues: list[sp.Rational],
) -> sp.Expr:
    h = sp.expand(
        p
        + sum(
            alpha * sp.cancel(p / (X - root))
            for root, alpha in zip(roots, residues, strict=True)
        )
    )
    h_poly = sp.Poly(h, X)
    p_poly = sp.Poly(p, X)
    assert h_poly.degree() == p_poly.degree()
    assert h_poly.LC() == p_poly.LC()
    assert int(h_poly.count_roots(-sp.oo, sp.oo)) == h_poly.degree()
    # Exact interlacing location: one h-root to the left and one in every
    # finite gap.  The positive-residue formula itself certifies orientation.
    assert int(h_poly.count_roots(-sp.oo, roots[0])) == 1
    for left, right in zip(roots[:-1], roots[1:], strict=True):
        assert int(h_poly.count_roots(left, right)) == 1
    return h


def derivative_square(poly: sp.Expr, order: int) -> sp.Expr:
    other = poly.subs(X, Y)
    return sp.expand(
        sum(
            sp.binomial(order, a)
            * sp.diff(poly, X, a)
            * sp.diff(other, Y, order - a)
            for a in range(order + 1)
        )
    )


def target(g: sp.Expr, h: sp.Expr, d: int) -> sp.Expr:
    return sp.expand(derivative_square(g, d) - derivative_square(h, d - 2))


def primitive_integer_poly(poly: sp.Poly) -> tuple[sp.Poly, list[int]]:
    coeffs = [sp.Rational(poly.nth(k)) for k in range(poly.degree() + 1)]
    denominator = sp.ilcm(*[value.q for value in coeffs])
    integers = [int(value * denominator) for value in coeffs]
    divisor = abs(math.gcd(*integers))
    primitive = [value // divisor for value in integers]
    return sp.Poly(sum(value * q**k for k, value in enumerate(primitive)), q), primitive


def exact_line_record(poly: sp.Expr, line_index: int) -> dict[str, object]:
    # Positive directions are required by the line characterization of
    # multivariate stability.  Large offsets probe far outside the root hull.
    ax = RNG.randint(-180, 180)
    ay = RNG.randint(-180, 180)
    bx = RNG.randint(1, 45)
    by = RNG.randint(1, 45)
    line = sp.Poly(sp.expand(poly.subs({X: ax + bx * q, Y: ay + by * q})), q)
    line, coefficients = primitive_integer_poly(line)
    degree = line.degree()
    real = int(line.count_roots(-sp.oo, sp.oo))
    return {
        "line_index": line_index,
        "X": f"{ax}+{bx}q",
        "Y": f"{ay}+{by}q",
        "degree": degree,
        "real_roots_with_multiplicity": real,
        "nonreal_roots": degree - real,
        "primitive_integer_coefficients_ascending": coefficients,
    }


def main() -> None:
    cases: list[dict[str, object]] = []
    first_failure: dict[str, object] | None = None
    threshold_lines = 0
    lower_control_failures = 0

    for N in range(4, 13):
        d0 = (N + 3) // 2
        for grid_variant in range(3):
            roots = critical_grid(N, grid_variant)
            try:
                g, p, constant, interval = hyperbolic_antiderivative(roots)
            except ValueError:
                continue
            for residue_sample in range(7):
                residues = residue_vector(len(roots), residue_sample)
                h = positive_residue_interlacer(p, roots, residues)
                threshold = target(g, h, d0)
                lower = target(g, h, d0 - 1) if d0 >= 3 else None
                case = {
                    "N": N,
                    "d0": d0,
                    "grid_variant": grid_variant,
                    "critical_roots": [str(value) for value in roots],
                    "integration_constant": str(constant),
                    "hyperbolic_constant_interval": [str(interval[0]), str(interval[1])],
                    "residue_sample": residue_sample,
                    "residues": [str(value) for value in residues],
                    "threshold_lines": 0,
                    "threshold_failures": 0,
                    "lower_control_nonstable_lines": 0,
                }
                for line_index in range(10):
                    record = exact_line_record(threshold, line_index)
                    threshold_lines += 1
                    case["threshold_lines"] = int(case["threshold_lines"]) + 1
                    if record["nonreal_roots"]:
                        case["threshold_failures"] = int(case["threshold_failures"]) + 1
                        first_failure = {
                            "case": case,
                            "line": record,
                            "g": str(g),
                            "p": str(p),
                            "h": str(h),
                        }
                        break
                if lower is not None:
                    control = exact_line_record(lower, 0)
                    if control["nonreal_roots"]:
                        case["lower_control_nonstable_lines"] = 1
                        lower_control_failures += 1
                cases.append(case)
                print(
                    f"N={N} grid={grid_variant} h={residue_sample} "
                    f"d0={d0} threshold_fail={case['threshold_failures']} "
                    f"lower_fail={case['lower_control_nonstable_lines']}",
                    flush=True,
                )
                if first_failure is not None:
                    break
            if first_failure is not None:
                break
        if first_failure is not None:
            break

    report = {
        "kind": "general_high_derivative_proper_position_threshold_probe",
        "date": "2026-08-02",
        "proposed_theorem": (
            "If g is hyperbolic of degree N, h has the same leading coefficient "
            "as g', and h/g' is a lower-half-plane Pick function, then "
            "S^d(g tensor g)-S^(d-2)(h tensor h) is stable for "
            "d>=floor((N+3)/2)."
        ),
        "construction_certificate": (
            "p=g' has listed rational roots; g is an exact antiderivative with "
            "constant inside the listed hyperbolicity interval; "
            "h/p=1+sum alpha_i/(X-s_i) with every listed alpha_i positive."
        ),
        "status": "COUNTEREXAMPLE" if first_failure else "NO_COUNTEREXAMPLE_IN_EXACT_PROBE",
        "threshold_line_tests": threshold_lines,
        "lower_order_control_failures": lower_control_failures,
        "cases": cases,
        "first_threshold_failure": first_failure,
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "threshold_line_tests": threshold_lines,
        "lower_order_control_failures": lower_control_failures,
        "cases": len(cases),
        "output": str(OUT.resolve()),
    }, indent=2))


if __name__ == "__main__":
    main()
