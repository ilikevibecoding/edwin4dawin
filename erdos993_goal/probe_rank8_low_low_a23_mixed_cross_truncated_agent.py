#!/usr/bin/env python3
"""Exact total-slack-degree truncation of the two mixed endpoint faces.

All ten ordinary slacks remain distinct.  Arithmetic is graded by their total
degree and products above a requested cutoff are discarded immediately.  The
probe reports signs only for monomials whose support meets both disjoint slack
groups A and B; it never constructs the dangerous untruncated ten-slack row.
"""

from __future__ import annotations

import argparse
import json
import math

from flint import fmpz_mpoly_ctx


BASE_NAMES = ("h", "ta", "tb", "P", "Q")
GROUP_A = ("a0", "b4", "b5", "b6", "b7")
GROUP_B = ("a4", "a5", "a6", "a7", "b0")
SLACK_NAMES = GROUP_A + GROUP_B


class Graded:
    max_degree = None
    zero = None

    def __init__(self, components):
        self.c = tuple(components)
        assert len(self.c) == self.max_degree + 1

    @classmethod
    def base(cls, polynomial):
        return cls((polynomial,) + (cls.zero,) * cls.max_degree)

    @classmethod
    def slack(cls, polynomial):
        assert cls.max_degree >= 1
        return cls((cls.zero, polynomial) + (cls.zero,) * (cls.max_degree - 1))

    def __add__(self, other):
        if not isinstance(other, Graded):
            other = Graded.base(other)
        return Graded(a + b for a, b in zip(self.c, other.c))

    __radd__ = __add__

    def __neg__(self):
        return Graded(-a for a in self.c)

    def __sub__(self, other):
        return self + (-other)

    def __rsub__(self, other):
        return Graded.base(other) - self

    def __mul__(self, other):
        if not isinstance(other, Graded):
            return Graded(component * other for component in self.c)
        result = [self.zero for _ in range(self.max_degree + 1)]
        for left_degree, left in enumerate(self.c):
            if not left:
                continue
            for right_degree, right in enumerate(other.c[: self.max_degree + 1 - left_degree]):
                if right:
                    result[left_degree + right_degree] += left * right
        return Graded(result)

    __rmul__ = __mul__

    def __pow__(self, exponent):
        assert isinstance(exponent, int) and exponent >= 0
        result = Graded.base(self.c[0].context().constant(1))
        base = self
        while exponent:
            if exponent & 1:
                result = result * base
            exponent //= 2
            if exponent:
                base = base * base
        return result


def factor_row(terminal, gaps, one):
    ratios = [None] * 9
    ratios[8] = terminal
    for index in range(7, -1, -1):
        ratios[index] = ratios[index + 1] + gaps[index]
    row = [one]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    return ratios, row


def convolution(left, right, rank, zero):
    value = zero
    for index in range(rank + 1):
        value += math.comb(rank, index) * left[index] * right[rank - index]
    return value


def curvature(values, h):
    return values[8] ** 2 - values[7] * values[9] - h * values[7] * values[8]


def cross(base, direction, h):
    return (
        2 * base[8] * direction[8]
        - base[7] * direction[9]
        - direction[7] * base[9]
        - h * (base[7] * direction[8] + direction[7] * base[8])
    )


def derivative(c_values, v_values, h):
    return (
        2 * c_values[8] * v_values[8]
        - v_values[7] * c_values[9]
        - c_values[7] * v_values[9]
        - h * (v_values[7] * c_values[8] + c_values[7] * v_values[8])
    )


def derivative_cross(base_c, direction_c, base_v, direction_v, h):
    return (
        2 * (base_c[8] * direction_v[8] + direction_c[8] * base_v[8])
        - base_v[7] * direction_c[9]
        - direction_v[7] * base_c[9]
        - base_c[7] * direction_v[9]
        - direction_c[7] * base_v[9]
        - h * (
            base_v[7] * direction_c[8]
            + direction_v[7] * base_c[8]
            + base_c[7] * direction_v[8]
            + direction_c[7] * base_v[8]
        )
    )


def build(face, label, maximum_degree):
    names = BASE_NAMES + SLACK_NAMES
    context = fmpz_mpoly_ctx.get(names, "degrevlex")
    raw = dict(zip(names, context.gens()))
    zero_raw, one_raw = context.constant(0), context.constant(1)
    Graded.max_degree = maximum_degree
    Graded.zero = zero_raw
    variables = {
        name: (
            Graded.slack(value) if name in SLACK_NAMES else Graded.base(value)
        )
        for name, value in raw.items()
    }
    zero, one = Graded.base(zero_raw), Graded.base(one_raw)
    h, ta, tb, p, q = (variables[name] for name in BASE_NAMES)
    z, w = face
    a2, a3 = (1 - z) * p, z * p
    b2, b3 = (1 - w) * q, w * q
    left_gaps = [
        2 * h + variables["a0"], h, h + a2, h + a3,
        h + variables["a4"], h + variables["a5"],
        h + variables["a6"], h + variables["a7"],
    ]
    right_gaps = [
        2 * h + variables["b0"], h, h + b2, h + b3,
        h + variables["b4"], h + variables["b5"],
        h + variables["b6"], h + variables["b7"],
    ]
    left_ratios, left = factor_row(ta, left_gaps, one)
    right_ratios, right_base = factor_row(tb, right_gaps, one)
    right_direction = [zero for _ in right_base]
    right_direction[3] = right_base[2] * h
    for rank in range(4, len(right_base)):
        right_direction[rank] = right_direction[rank - 1] * right_ratios[rank - 1]
    tail = [zero, zero, zero] + left[3:]
    base_c = {rank: convolution(left, right_base, rank, zero) for rank in (7, 8, 9)}
    direction_c = {
        rank: convolution(left, right_direction, rank, zero) for rank in (7, 8, 9)
    }
    base_v = {rank: convolution(tail, right_base, rank, zero) for rank in (7, 8, 9)}
    direction_v = {
        rank: convolution(tail, right_direction, rank, zero) for rank in (7, 8, 9)
    }
    curvature_base = curvature(base_v, h)
    curvature_linear = cross(base_v, direction_v, h)
    curvature_direction = curvature(direction_v, h)
    if label == "curvature_middle_times_4":
        return names, 4 * curvature_base + 2 * curvature_linear
    if label == "curvature_far":
        return names, curvature_base + curvature_linear + curvature_direction
    capacity = left_ratios[2]
    margin_base = capacity * curvature(base_c, h)
    margin_linear = capacity * cross(base_c, direction_c, h)
    margin_direction = capacity * curvature(direction_c, h)
    derivative_base = derivative(base_c, base_v, h)
    derivative_linear = derivative_cross(base_c, direction_c, base_v, direction_v, h)
    derivative_direction = derivative(direction_c, direction_v, h)
    strong_base = margin_base + h * derivative_base
    strong_linear = margin_linear + h * derivative_linear
    strong_direction = margin_direction + h * derivative_direction
    if label == "strong_middle_times_4":
        return names, 4 * strong_base + 2 * strong_linear
    assert label == "strong_far"
    return names, strong_base + strong_linear + strong_direction


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--face", choices=("0,1", "1,0"), required=True)
    parser.add_argument(
        "--label",
        choices=(
            "curvature_middle_times_4", "curvature_far",
            "strong_middle_times_4", "strong_far",
        ),
        required=True,
    )
    parser.add_argument("--maximum-slack-degree", type=int, choices=range(2, 18), required=True)
    args = parser.parse_args()
    face = tuple(map(int, args.face.split(",")))
    names, polynomial = build(face, args.label, args.maximum_slack_degree)
    name_index = {name: index for index, name in enumerate(names)}
    group_a_indices = tuple(name_index[name] for name in GROUP_A)
    group_b_indices = tuple(name_index[name] for name in GROUP_B)
    rows = []
    for degree, component in enumerate(polynomial.c):
        terms = negative = 0
        minimum = None
        first_negative = None
        for monomial, raw_coefficient in component.terms():
            monomial = tuple(map(int, monomial))
            if not (
                any(monomial[index] for index in group_a_indices)
                and any(monomial[index] for index in group_b_indices)
            ):
                continue
            coefficient = int(raw_coefficient)
            terms += 1
            minimum = coefficient if minimum is None else min(minimum, coefficient)
            if coefficient < 0:
                negative += 1
                if first_negative is None:
                    first_negative = {
                        "monomial": list(monomial), "coefficient": coefficient,
                    }
        rows.append({
            "total_slack_degree": degree,
            "mixed_support_terms": terms,
            "negative_terms": negative,
            "minimum": minimum,
            "first_negative": first_negative,
        })
        print("DEGREE", degree, "TERMS", terms, "NEGATIVE", negative, flush=True)
    print(json.dumps({
        "schema": "rank8-low-low-a23-mixed-cross-truncated-agent-v1",
        "face": list(face),
        "auxiliary": args.label,
        "maximum_slack_degree": args.maximum_slack_degree,
        "variables": list(names),
        "group_A": list(GROUP_A),
        "group_B": list(GROUP_B),
        "rows": rows,
        "pass": all(row["negative_terms"] == 0 for row in rows),
        "scope_warning": (
            "Only total ordinary-slack degrees through the requested cutoff "
            "are constructed. Higher-degree mixed support remains unchecked."
        ),
    }, separators=(",", ":")), flush=True)


if __name__ == "__main__":
    main()
