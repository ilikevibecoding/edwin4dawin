"""Exact one-twentieth tail-collision bound for the three small reserves.

The universal quarter certificate is paired with a prefix floor above 1/4
except for odd r=0,1 and even r=0.  For these three cases the same cubic
Bernstein argument is stronger: all four controls on [1/20,a2] are
nonnegative.  Hence every equal-inertia tail collision is below 1/20,
which is itself below the exact small-prefix floor.
"""

from __future__ import annotations

import json
import hashlib
from collections import Counter, deque
from math import comb
from pathlib import Path

import sympy as sp

from certify_tail_collision_quarter_lemma import certify_polynomial
from certify_tail_collision_interval_flint import VARIABLES, build_controls
from derive_tail_collision_quarter_lemma import (
    C,
    R,
    U,
    V,
    iter_interval_bernstein_controls,
    load_values,
)
from prove_one_sided_adjacent_cubic_darboux_inertia import bernstein_uv_coefficients


HERE = Path(__file__).resolve().parent


def control_cube(polynomial: sp.Expr):
    poly = sp.Poly(sp.expand(polynomial), U, V, C, domain=sp.QQ.frac_field(R))
    du, dv, dc = (poly.degree(variable) for variable in (U, V, C))
    _, flat = bernstein_uv_coefficients(poly.as_expr(), R, U, V, C)
    cube = [
        [[sp.Rational(0) for _ in range(dc + 1)] for _ in range(dv + 1)]
        for _ in range(du + 1)
    ]
    for (i, j, k), value in flat:
        value = sp.cancel(value / comb(dc, k))
        assert not value.has(R)
        cube[i][j][k] = sp.Rational(value)
    return cube


def split_vector(values):
    rows = [values]
    while len(rows[-1]) > 1:
        previous = rows[-1]
        rows.append(
            [(previous[index] + previous[index + 1]) / 2 for index in range(len(previous) - 1)]
        )
    degree = len(values) - 1
    return (
        [rows[order][0] for order in range(degree + 1)],
        [rows[degree - order][order] for order in range(degree + 1)],
    )


def split_axis(cube, axis):
    dimensions = (len(cube), len(cube[0]), len(cube[0][0]))
    left = [[[sp.Rational(0) for _ in range(dimensions[2])] for _ in range(dimensions[1])] for _ in range(dimensions[0])]
    right = [[[sp.Rational(0) for _ in range(dimensions[2])] for _ in range(dimensions[1])] for _ in range(dimensions[0])]
    other_axes = [item for item in range(3) if item != axis]
    for first in range(dimensions[other_axes[0]]):
        for second in range(dimensions[other_axes[1]]):
            indices = [0, 0, 0]
            indices[other_axes[0]] = first
            indices[other_axes[1]] = second
            vector = []
            for moving in range(dimensions[axis]):
                indices[axis] = moving
                vector.append(cube[indices[0]][indices[1]][indices[2]])
            lo, hi = split_vector(vector)
            for moving in range(dimensions[axis]):
                indices[axis] = moving
                left[indices[0]][indices[1]][indices[2]] = lo[moving]
                right[indices[0]][indices[1]][indices[2]] = hi[moving]
    return left, right


def eight_children(cube):
    output = [cube]
    for axis in range(3):
        output = [child for item in output for child in split_axis(item, axis)]
    return output


def cube_values(cube):
    return [value for plane in cube for row in plane for value in row]


def cube_digest(cube):
    payload = ";".join(map(str, cube_values(cube)))
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def subdivision_certificate(numerator: sp.Expr, max_depth: int = 7):
    initial = control_cube(numerator)
    queue = deque([(initial, 0, "")])
    certified = Counter()
    visited = 0
    initial_values = cube_values(initial)
    while queue:
        cube, depth, address = queue.popleft()
        visited += 1
        values = cube_values(cube)
        if all(value > 0 for value in values):
            certified[depth] += 1
            continue
        if depth >= max_depth:
            raise AssertionError(
                f"unresolved subdivision box {address}: min={min(values)}, max={max(values)}"
            )
        for child_index, child in enumerate(eight_children(cube)):
            queue.append((child, depth + 1, address + str(child_index)))
    return {
        "initial_positive_negative_zero": [
            sum(int(bool(value > 0)) for value in initial_values),
            sum(int(bool(value < 0)) for value in initial_values),
            sum(int(bool(value == 0)) for value in initial_values),
        ],
        "initial_digest": cube_digest(initial),
        "visited_box_count": visited,
        "certified_box_count_by_depth": {
            str(depth): count for depth, count in sorted(certified.items())
        },
        "unresolved_box_count": 0,
        "max_depth": max_depth,
    }


def certify_rational_subdivision(value: sp.Expr):
    numerator, denominator = sp.fraction(sp.cancel(value))
    return {
        "numerator_subdivision": subdivision_certificate(numerator),
        "denominator_global_bernstein": certify_polynomial(denominator),
    }


def main():
    output = HERE / "small_reserve_tail_collision_one_twentieth_exact_20260806.json"
    if output.exists():
        previous = json.loads(output.read_text(encoding="utf-8"))
        report = previous if previous.get("status") == "IN_PROGRESS" else {}
    else:
        report = {}
    if not report:
        report = {
            "status": "IN_PROGRESS",
            "threshold": "1/20",
            "cases": [],
        }
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    for parity, reserve in (("odd", 0), ("odd", 1), ("even", 0)):
        print(f"loading {parity} r={reserve}", flush=True)
        values = load_values(parity, reserve)
        case = next(
            (
                item for item in report["cases"]
                if item["parity"] == parity and item["r"] == reserve
            ),
            {"parity": parity, "r": reserve, "controls": []},
        )
        for index, control_rational in enumerate(
            build_controls(values, sp.Rational(1, 20))
        ):
            if index < len(case["controls"]):
                print(f"reusing {parity} r={reserve} control {index}", flush=True)
                continue
            print(f"certifying {parity} r={reserve} control {index}", flush=True)
            numerator, denominator = control_rational.to_sympy_pair(VARIABLES)
            # The one-twentieth extension is positive but its global tensor
            # box is not coefficientwise positive.  Exact dyadic subdivision
            # supplies the missing local Bernstein certificate.
            if index < 3:
                case["controls"].append(
                    {
                        "numerator_subdivision": subdivision_certificate(numerator),
                        "denominator_global_bernstein": certify_polynomial(denominator),
                        "exact_engine": "python-flint fmpq_mpoly",
                    }
                )
            else:
                # The right-endpoint control is C(a2), independent of the
                # chosen left endpoint.  It has an explicit factor c, so its
                # compactified c=0 Bernstein face is zero rather than strict.
                # Global nonnegative controls are the appropriate certificate.
                case["controls"].append(
                    {
                        "numerator_global_bernstein": certify_polynomial(numerator),
                        "denominator_global_bernstein": certify_polynomial(denominator),
                    }
                )
            report["cases"] = [
                old for old in report["cases"]
                if not (old["parity"] == parity and old["r"] == reserve)
            ] + [case]
            output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    report["status"] = "EXACT_SMALL_RESERVE_TAIL_COLLISION_ONE_TWENTIETH"
    report["logical_implication"] = (
        "When a2<=1/20 the lower trailing interval is already below 1/20. "
        "When a2>1/20 the four nonnegative Bernstein controls make the tail "
        "collision cubic positive throughout [1/20,a2].  Combined with the "
        "universal structural signs, every equal-inertia collision in these "
        "three reserves is a ground-tail collision below 1/20."
    )
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(output, flush=True)


if __name__ == "__main__":
    main()
