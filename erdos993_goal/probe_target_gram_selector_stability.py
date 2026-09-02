"""Isolate the normalized rank-two selector behind the determinant reduction.

For spectral weights w_i and phases theta_i satisfying

    sum w_i=N,  |sum w_i theta_i|^2=N,

put A(T)=sum_(i in T) w_i and
B(T)=A(T)^2-|sum_(i in T) w_i theta_i|^2.  The determinant contraction is a
principal-minor transform of the homogeneous multi-affine selector whose
coefficient on S_X union S_Y, |S_X|+|S_Y|=d, is

    d! - 2(d-2)! A(S_X)A(S_Y) + (d-4)! B(S_X)B(S_Y).

If this selector is real stable for 2d-N>=5, standard principal-minor
apolarity proves the normalized two-slot determinant theorem.  This script
performs exact positive-direction line tests on the selector itself and
records coefficient signs at and immediately below the candidate boundary.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import random
from fractions import Fraction
from math import comb, factorial
from pathlib import Path

from flint import fmpq_poly


HERE = Path(__file__).resolve().parent
REPORT = HERE / "target_gram_selector_stability_probe_20260804.json"


def frame(N: int):
    data = {
        5: ([Fraction(3, 2), Fraction(1, 2), Fraction(5, 4), Fraction(5, 4), Fraction(1, 2)], [1, -1, 1j, 1j, -1j]),
        8: (
            [Fraction(3, 2), Fraction(3, 2), Fraction(1, 2), Fraction(1, 2),
             Fraction(3, 2), Fraction(3, 2), Fraction(1, 2), Fraction(1, 2)],
            [1, 1, -1, -1, 1j, 1j, -1j, -1j],
        ),
        9: ([Fraction(1)] * 9, [1] * 6 + [-1] * 3),
    }
    weights, phases = data[N]
    assert sum(weights) == N
    inner = sum(float(weight) * phase for weight, phase in zip(weights, phases))
    assert abs(abs(inner) ** 2 - N) < 1e-10
    return weights, phases


def subset_data(weights, phases):
    out = {}
    for mask in range(1 << len(weights)):
        indices = [index for index in range(len(weights)) if mask & (1 << index)]
        A = sum((weights[index] for index in indices), Fraction(0))
        real = sum((weights[index] * Fraction(int(phases[index].real)) for index in indices), Fraction(0))
        imag = sum((weights[index] * Fraction(int(phases[index].imag)) for index in indices), Fraction(0))
        B = A * A - real * real - imag * imag
        out[mask] = (len(indices), A, B)
    return out


def affine_product(values):
    result = fmpq_poly([1])
    for intercept, slope in values:
        result *= fmpq_poly([intercept, slope])
    return result


def selector_line(N: int, d: int, data, line):
    result = fmpq_poly()
    all_mask = (1 << N) - 1
    for mask_x, (size_x, A_x, B_x) in data.items():
        size_y = d - size_x
        if not 0 <= size_y <= N:
            continue
        complement = all_mask
        submask = complement
        while True:
            if data[submask][0] == size_y:
                A_y, B_y = data[submask][1], data[submask][2]
                weight = (
                    factorial(d)
                    - 2 * factorial(d - 2) * A_x * A_y
                    + factorial(d - 4) * B_x * B_y
                )
                variables = [line[index] for index in range(N) if mask_x & (1 << index)]
                variables += [line[N + index] for index in range(N) if submask & (1 << index)]
                result += fmpq_poly([weight.numerator]) * affine_product(variables) / weight.denominator
            if submask == 0:
                break
            submask = (submask - 1) & complement
    return result


def coefficient_signs(N: int, d: int, data):
    positive = zero = negative = 0
    minimum = None
    for mask_x, (size_x, A_x, B_x) in data.items():
        size_y = d - size_x
        if not 0 <= size_y <= N:
            continue
        for mask_y, (actual_size_y, A_y, B_y) in data.items():
            if actual_size_y != size_y:
                continue
            value = (
                factorial(d)
                - 2 * factorial(d - 2) * A_x * A_y
                + factorial(d - 4) * B_x * B_y
            )
            minimum = value if minimum is None or value < minimum else minimum
            if value > 0:
                positive += 1
            elif value < 0:
                negative += 1
            else:
                zero += 1
    return positive, zero, negative, minimum


def real_roots(poly: fmpq_poly) -> int:
    derivative = poly.derivative()
    gcd_degree = poly.gcd(derivative).degree()
    sequence = [poly / abs(poly[poly.degree()]), derivative / abs(derivative[derivative.degree()])]
    while True:
        remainder = -(sequence[-2] % sequence[-1])
        if not remainder:
            break
        remainder /= abs(remainder[remainder.degree()])
        sequence.append(remainder)

    def sign(value):
        return 1 if value > 0 else -1 if value < 0 else 0

    def variations(positive_infinity: bool):
        signs = []
        for item in sequence:
            value = sign(item[item.degree()])
            if not positive_infinity and item.degree() % 2:
                value = -value
            signs.append(value)
        return sum(left != right for left, right in zip(signs, signs[1:]))

    return variations(False) - variations(True) + gcd_degree


def main() -> None:
    rng = random.Random(993_998_20260804)
    checks = []
    first_cone_failure = None
    first_below_failure = None
    for N in (5, 8, 9):
        weights, phases = frame(N)
        data = subset_data(weights, phases)
        boundary = (N + 6) // 2
        for d in sorted({boundary - 1, boundary, min(N, boundary + 1)}):
            if d < 4:
                continue
            positive, zero, negative, minimum = coefficient_signs(N, d, data)
            for trial in range(8):
                line = [
                    (rng.randint(-12, 12), rng.randint(1, 7))
                    for _ in range(2 * N)
                ]
                polynomial = selector_line(N, d, data, line)
                roots = real_roots(polynomial)
                item = {
                    "N": N,
                    "d": d,
                    "two_d_minus_N": 2 * d - N,
                    "trial": trial,
                    "degree": polynomial.degree(),
                    "real_roots": roots,
                    "coefficient_signs": {"positive": positive, "zero": zero, "negative": negative},
                    "minimum_coefficient": str(minimum),
                    "digest": hashlib.sha256(str(polynomial).encode()).hexdigest(),
                }
                checks.append(item)
                in_cone = 2 * d - N >= 5
                if in_cone and roots != polynomial.degree() and first_cone_failure is None:
                    first_cone_failure = item
                if not in_cone and roots != polynomial.degree() and first_below_failure is None:
                    first_below_failure = item
            print(f"N={N} d={d}", flush=True)

    report = {
        "status": "SELECTOR_CONE_PROBE" if first_cone_failure is None else "CONE_FAILURE",
        "checks": checks,
        "first_cone_failure": first_cone_failure,
        "first_below_cone_failure": first_below_failure,
        "scope": "Every line/root count is exact.  A clean finite audit is not an all-order stability proof.",
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "checks": len(checks),
        "first_cone_failure": first_cone_failure,
        "first_below_cone_failure": first_below_failure,
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
