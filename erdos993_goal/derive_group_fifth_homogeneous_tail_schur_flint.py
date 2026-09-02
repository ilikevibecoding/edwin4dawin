#!/usr/bin/env python3
"""Fast exact s=4 tail-Bezout derivation over FLINT rational functions."""

from __future__ import annotations

import argparse
import json
from itertools import permutations
from pathlib import Path

from flint import fmpq, fmpq_mpoly, fmpq_mpoly_ctx


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_fifth_homogeneous_tail_schur_flint_20260804.json"
CTX = fmpq_mpoly_ctx.get(["alpha", "slack"])
ALPHA_POLY, SLACK_POLY = CTX.gens()


def poly(value) -> fmpq_mpoly:
    if isinstance(value, fmpq_mpoly):
        return value
    if isinstance(value, fmpq):
        return CTX.constant(value)
    return CTX.constant(value)


class Rat:
    __slots__ = ("num", "den")

    def __init__(self, numerator=0, denominator=1, reduce: bool = True):
        numerator, denominator = poly(numerator), poly(denominator)
        if not denominator:
            raise ZeroDivisionError
        if reduce and numerator:
            common = numerator.gcd(denominator)
            if common != 1:
                numerator //= common
                denominator //= common
        if denominator.leading_coefficient() < 0:
            numerator = -numerator
            denominator = -denominator
        # QQ[alpha,slack] gcds are canonical only up to a nonzero rational
        # unit.  Fix that unit as well.  Without this step, repeated rational
        # arithmetic can carry a huge common scalar through both numerator
        # and denominator even though the represented rational function is
        # small; the terminal higher-layer couplings then suffer catastrophic
        # coefficient swell.
        unit = denominator.leading_coefficient()
        if unit != 1:
            numerator /= unit
            denominator /= unit
        self.num, self.den = numerator, denominator

    @staticmethod
    def coerce(value) -> "Rat":
        return value if isinstance(value, Rat) else Rat(value)

    def __bool__(self):
        return bool(self.num)

    def __neg__(self):
        return Rat(-self.num, self.den, reduce=False)

    def __add__(self, other):
        other = self.coerce(other)
        common = self.den.gcd(other.den)
        left = self.den // common
        right = other.den // common
        return Rat(self.num * right + other.num * left, left * other.den)

    __radd__ = __add__

    def __sub__(self, other):
        return self + (-self.coerce(other))

    def __rsub__(self, other):
        return self.coerce(other) - self

    def __mul__(self, other):
        other = self.coerce(other)
        if not self or not other:
            return Rat(0)
        left_num, left_den = self.num, self.den
        right_num, right_den = other.num, other.den
        cross1 = left_num.gcd(right_den)
        cross2 = right_num.gcd(left_den)
        return Rat(
            (left_num // cross1) * (right_num // cross2),
            (left_den // cross2) * (right_den // cross1),
            reduce=False,
        )

    __rmul__ = __mul__

    def reciprocal(self):
        if not self:
            raise ZeroDivisionError
        return Rat(self.den, self.num, reduce=False)

    def __truediv__(self, other):
        return self * self.coerce(other).reciprocal()

    def __rtruediv__(self, other):
        return self.coerce(other) / self

    def __pow__(self, exponent: int):
        if exponent < 0:
            return self.reciprocal() ** (-exponent)
        return Rat(self.num**exponent, self.den**exponent, reduce=False)

    def evaluate(self, alpha_value: int, slack_value: int):
        numerator = self.num.subs({0: alpha_value, 1: slack_value})
        denominator = self.den.subs({0: alpha_value, 1: slack_value})
        return numerator.leading_coefficient() / denominator.leading_coefficient()

    def __str__(self):
        return str(self.num) if self.den == 1 else f"({self.num})/({self.den})"


ZERO, ONE = Rat(0), Rat(1)
A, Q = Rat(ALPHA_POLY), Rat(SLACK_POLY)


def falling(value: Rat, length: int) -> Rat:
    result = ONE
    for index in range(length):
        result *= value - index
    return result


def selector_newton(p: Rat, alpha: Rat) -> list[Rat]:
    return [
        (alpha + p - 4)
        * (alpha + p - 3)
        * (2 * alpha + 2 * p - 7)
        * (2 * alpha + 2 * p - 5)
        / 6,
        -(
            4 * alpha**4
            + 16 * alpha**3 * p
            - 104 * alpha**3
            + 24 * alpha**2 * p**2
            - 312 * alpha**2 * p
            + 725 * alpha**2
            + 16 * alpha * p**3
            - 312 * alpha * p**2
            + 1450 * alpha * p
            - 2005 * alpha
            + 4 * p**4
            - 104 * p**3
            + 725 * p**2
            - 2005 * p
            + 1980
        )
        / (3 * p * (p - 1)),
        (
            4 * alpha**4
            + 16 * alpha**3 * p
            - 228 * alpha**3
            + 24 * alpha**2 * p**2
            - 684 * alpha**2 * p
            + 2375 * alpha**2
            + 16 * alpha * p**3
            - 684 * alpha * p**2
            + 4750 * alpha * p
            - 8763 * alpha
            + 4 * p**4
            - 228 * p**3
            + 2375 * p**2
            - 8763 * p
            + 10938
        )
        / (6 * falling(p, 4)),
        2
        * (
            6 * alpha**3
            + 18 * alpha**2 * p
            - 103 * alpha**2
            + 18 * alpha * p**2
            - 206 * alpha * p
            + 520 * alpha
            + 6 * p**3
            - 103 * p**2
            + 520 * p
            - 827
        )
        / falling(p, 6),
        (
            18 * alpha**2
            + 36 * alpha * p
            - 155 * alpha
            + 18 * p**2
            - 155 * p
            + 334
        )
        / falling(p, 8),
    ]


def selector_newton_s5(p: Rat, alpha: Rat) -> list[Rat]:
    return [
        (alpha + p - 5)
        * (alpha + p - 4)
        * (alpha + p - 3)
        * (2 * alpha + 2 * p - 9)
        * (2 * alpha + 2 * p - 7)
        / 15,
        -2
        * (alpha + p - 4)
        * (
            4 * alpha**4
            + 16 * alpha**3 * p
            - 144 * alpha**3
            + 24 * alpha**2 * p**2
            - 432 * alpha**2 * p
            + 1249 * alpha**2
            + 16 * alpha * p**3
            - 432 * alpha * p**2
            + 2498 * alpha * p
            - 4219 * alpha
            + 4 * p**4
            - 144 * p**3
            + 1249 * p**2
            - 4219 * p
            + 5070
        )
        / (15 * p * (p - 1)),
        (
            4 * alpha**5
            + 20 * alpha**4 * p
            - 360 * alpha**4
            + 40 * alpha**3 * p**2
            - 1440 * alpha**3 * p
            + 6255 * alpha**3
            + 40 * alpha**2 * p**3
            - 2160 * alpha**2 * p**2
            + 18765 * alpha**2 * p
            - 41940 * alpha**2
            + 20 * alpha * p**4
            - 1440 * alpha * p**3
            + 18765 * alpha * p**2
            - 83880 * alpha * p
            + 124331 * alpha
            + 4 * p**5
            - 360 * p**4
            + 6255 * p**3
            - 41940 * p**2
            + 124331 * p
            - 138030
        )
        / (15 * falling(p, 4)),
        4
        * (
            6 * alpha**4
            + 24 * alpha**3 * p
            - 185 * alpha**3
            + 36 * alpha**2 * p**2
            - 555 * alpha**2 * p
            + 1716 * alpha**2
            + 24 * alpha * p**3
            - 555 * alpha * p**2
            + 3432 * alpha * p
            - 6457 * alpha
            + 6 * p**4
            - 185 * p**3
            + 1716 * p**2
            - 6457 * p
            + 8700
        )
        / (3 * falling(p, 6)),
        2
        * (alpha + p - 5)
        * (
            18 * alpha**2
            + 36 * alpha * p
            - 179 * alpha
            + 18 * p**2
            - 179 * p
            + 446
        )
        / falling(p, 8),
    ]


def selector_for_layer(layer: int, p: Rat, alpha: Rat) -> list[Rat]:
    if layer == 4:
        return selector_newton(p, alpha)
    if layer == 5:
        return selector_newton_s5(p, alpha)
    raise ValueError(f"unsupported layer deficit {layer}")


def polynomial_add(left: list[Rat], right: list[Rat]) -> list[Rat]:
    size = max(len(left), len(right))
    result = [
        (left[i] if i < len(left) else ZERO)
        + (right[i] if i < len(right) else ZERO)
        for i in range(size)
    ]
    while len(result) > 1 and not result[-1]:
        result.pop()
    return result


def polynomial_scale(values: list[Rat], scalar: Rat) -> list[Rat]:
    return [scalar * value for value in values]


def polynomial_y_minus(values: list[Rat], diagonal: Rat) -> list[Rat]:
    return polynomial_add([ZERO] + values, polynomial_scale(values, -diagonal))


def determinant(matrix: list[list[Rat]]) -> Rat:
    order = len(matrix)
    total = ZERO
    for permutation in permutations(range(order)):
        inversions = sum(
            permutation[i] > permutation[j]
            for i in range(order)
            for j in range(i + 1, order)
        )
        term = ONE
        for row, column in enumerate(permutation):
            term *= matrix[row][column]
        total += -term if inversions % 2 else term
    return total


def shifted_boundary_selector(p: Rat, offset: int, layer: int) -> list[Rat]:
    kshift = layer - offset
    ambient = p + kshift
    formal_p = p + 2 * kshift
    formal_selector = selector_for_layer(layer, formal_p, Rat(-kshift))
    formal_nodes = [Rat(j) * (formal_p - j) for j in range(5)]
    residual_nodes = [Rat(j) * (p - j) for j in range(5)]
    values = []
    for h in range(5):
        point = kshift * ambient + residual_nodes[h]
        values.append(
            sum(
                (
                    formal_selector[order]
                    * polynomial_product
                    for order in range(5)
                    for polynomial_product in [
                        product(point - formal_nodes[j] for j in range(order))
                    ]
                ),
                ZERO,
            )
        )
    shifted: list[Rat] = []
    for h in range(5):
        remainder = values[h] - sum(
            (
                shifted[order]
                * product(residual_nodes[h] - residual_nodes[j] for j in range(order))
                for order in range(h)
            ),
            ZERO,
        )
        shifted.append(
            remainder
            / product(residual_nodes[h] - residual_nodes[j] for j in range(h))
        )
    return shifted


def product(values) -> Rat:
    result = ONE
    for value in values:
        result *= value
    return result


def derive(
    parity: str, offset: int | None = None, layer: int = 4
) -> tuple[list[Rat], list[Rat], list[list[Rat]]]:
    if offset is None:
        p = A + Q + 2 * layer + 5
        n = p / 2 if parity == "even" else (p - 1) / 2
        alpha = A
        selector = selector_for_layer(layer, p, alpha)
    else:
        threshold = 3 * offset + 5 - layer
        if parity == "even":
            minimum_n = max(5, (threshold + 1) // 2)
        else:
            minimum_n = max(5, threshold // 2)
        n = Q + minimum_n
        p = 2 * n if parity == "even" else 2 * n + 1
        alpha = Rat(layer - offset)
        selector = shifted_boundary_selector(p, offset, layer)
    beta = Rat(fmpq(-1, 2) if parity == "even" else fmpq(1, 2))
    ambient = p + alpha

    def top_coefficients(k: Rat) -> tuple[Rat, Rat]:
        total = alpha + beta
        c = -k * (k + alpha) / (2 * k + total)
        e = k * (k - 1) * (k + alpha - 1) * (k + alpha) / (
            2 * (2 * k + total - 1) * (2 * k + total)
        )
        return c, e

    def recurrence(k: Rat) -> tuple[Rat, Rat]:
        c, e = top_coefficients(k)
        c_next, e_next = top_coefficients(k + 1)
        diagonal = c - c_next
        return diagonal, e - e_next - diagonal * c

    actions = []
    for j in range(5):
        k = n - j
        c, e = top_coefficients(k)
        c_next, e_next = top_coefficients(k + 1)
        upper = Rat(j)
        diagonal = k + (j + 1) * c - upper * c_next
        lower = (k - 1) * c + (j + 2) * e - upper * e_next - diagonal * c
        actions.append((upper, diagonal, lower))

    falling_vectors = [[ONE] + [ZERO] * 4]
    for shift in range(4):
        output = [ZERO] * 5
        for j, coefficient in enumerate(falling_vectors[-1]):
            upper, diagonal, lower = actions[j]
            if j:
                output[j - 1] += coefficient * upper
            output[j] += coefficient * (diagonal - shift)
            if j < 4:
                output[j + 1] += coefficient * lower
        falling_vectors.append(output)
    vector = [
        sum(
            (
                selector[h]
                * falling(ambient, h)
                * falling_vectors[h][index]
                for h in range(5)
            ),
            ZERO,
        )
        for index in range(5)
    ]
    connection = [value / vector[0] for value in vector]

    m = n - 4
    U_previous, U = [ZERO], [ONE]
    V_previous, V = [-ONE], [ZERO]
    U_values, V_values = [U], [V]
    for step in range(4):
        diagonal, subdiagonal = recurrence(m + step)
        U_next = polynomial_add(
            polynomial_y_minus(U, diagonal),
            polynomial_scale(U_previous, -subdiagonal),
        )
        V_next = polynomial_add(
            polynomial_y_minus(V, diagonal),
            polynomial_scale(V_previous, -subdiagonal),
        )
        U_previous, U = U, U_next
        V_previous, V = V, V_next
        U_values.append(U)
        V_values.append(V)
    tail_A, tail_B = [ZERO], [ZERO]
    for j in range(5):
        tail_A = polynomial_add(
            tail_A, polynomial_scale(U_values[4 - j], connection[j])
        )
        tail_B = polynomial_add(
            tail_B, polynomial_scale(V_values[4 - j], connection[j])
        )
    while len(tail_A) > 1 and not tail_A[-1]:
        tail_A.pop()
    while len(tail_B) > 1 and not tail_B[-1]:
        tail_B.pop()
    assert len(tail_A) == 5 and len(tail_B) == 4
    tail_B = [value / tail_B[-1] for value in tail_B]

    matrix = [[ZERO for _ in range(4)] for _ in range(4)]
    padded_B = tail_B + [ZERO]
    for i in range(4 + 1):
        for j in range(i):
            coefficient = tail_A[i] * padded_B[j] - tail_A[j] * padded_B[i]
            for k in range(i - j):
                matrix[i - 1 - k][j + k] += coefficient
    if matrix[0][0].evaluate(0, 1) < 0:
        matrix = [[-value for value in row] for row in matrix]
    return tail_A, tail_B, matrix


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("even", "odd"), default="even")
    parser.add_argument("--max-minor", type=int, choices=(1, 2, 3, 4), default=4)
    parser.add_argument("--layer", type=int, choices=(4, 5), default=4)
    parser.add_argument("--offset", type=int)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    if args.offset is not None and not 0 <= args.offset < args.layer:
        parser.error("offset must satisfy 0 <= offset < layer")
    tail_A, tail_B, matrix = derive(args.parity, args.offset, args.layer)
    print("tail and Bezout matrix derived", flush=True)
    records = []
    for order in range(1, args.max_minor + 1):
        minor = determinant([row[:order] for row in matrix[:order]])
        numerator_positive = all(value > 0 for value in minor.num.coeffs())
        denominator_positive = all(value > 0 for value in minor.den.coeffs())
        record = {
            "order": order,
            "numerator_terms": len(list(minor.num.terms())),
            "denominator_terms": len(list(minor.den.terms())),
            "numerator_coefficientwise_positive": numerator_positive,
            "denominator_coefficientwise_positive": denominator_positive,
            "numerator_factorization": str(minor.num.factor()),
            "denominator_factorization": str(minor.den.factor()),
        }
        records.append(record)
        print(
            {key: value for key, value in record.items() if "factorization" not in key},
            flush=True,
        )
    report = {
        "status": "FLINT_SYMBOLIC_TAIL_SCHUR_DERIVATION",
        "layer_deficit": args.layer,
        "parity": args.parity,
        "offset": args.offset,
        "jacobi_degree_shift": (
            (5 if args.layer == 4 or args.offset < 4 else 6)
            if args.offset is not None
            else None
        ),
        "A4": list(map(str, tail_A)),
        "B3_monic": list(map(str, tail_B)),
        "records": records,
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(args.output)


if __name__ == "__main__":
    main()
