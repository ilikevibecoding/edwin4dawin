#!/usr/bin/env python3
"""Exact audit of the abstract two-outlier gamma/window reduction.

For ``deg Gamma <= floor(p/2)`` define

    C(z) = (1+z)^p Gamma(z/(1+z)^2),
    W(z) = sum_j binom(p+2a, a+j) [z^j]C(z) z^j,
    W(z) = (1+z)^p S(z/(1+z)^2).

The coefficient transform from Gamma to S has the exact factorization

    [t^k]S = (p+2a)!/((p-2k)!(a+k)!)
               * sum_{h<=k} gamma_h (p-2h)!
                   /((p+a-h)!(k-h)!).

The script checks this identity directly and probes the proposed theorem:
if Gamma has two roots in [1,infinity), all its other roots are negative,
and p-a >= 4 deg(Gamma)-3, then S has only negative real roots.

The root-location assertion remains a conjectural lemma; all root counts in
this replay are nevertheless exact Sturm counts over QQ.
"""

from __future__ import annotations

import argparse
import json
import math
import random
from fractions import Fraction
from pathlib import Path

from flint import fmpq, fmpq_poly


HERE = Path(__file__).resolve().parent
REPORT = HERE / "two_outlier_gamma_binomial_window_probe_20260805.json"


def multiply(left: list[Fraction], right: list[Fraction]) -> list[Fraction]:
    out = [Fraction(0)] * (len(left) + len(right) - 1)
    for i, x in enumerate(left):
        for j, y in enumerate(right):
            out[i + j] += x * y
    return out


def gamma_from_roots(
    negative_moduli: list[Fraction], positive_roots: tuple[Fraction, Fraction]
) -> list[Fraction]:
    out = [Fraction(1)]
    for modulus in negative_moduli:
        out = multiply(out, [modulus, Fraction(1)])
    for root in positive_roots:
        out = multiply(out, [-root, Fraction(1)])
    return out


def gamma_to_palindromic(gamma: list[Fraction], p: int) -> list[Fraction]:
    out = [Fraction(0)] * (p + 1)
    for h, coefficient in enumerate(gamma):
        for j in range(p - 2 * h + 1):
            out[h + j] += coefficient * math.comb(p - 2 * h, j)
    return out


def palindromic_to_gamma(row: list[Fraction], p: int) -> list[Fraction]:
    remainder = list(row)
    out: list[Fraction] = []
    for h in range(p // 2 + 1):
        coefficient = remainder[h]
        out.append(coefficient)
        for j in range(p - 2 * h + 1):
            remainder[h + j] -= coefficient * math.comb(p - 2 * h, j)
    assert not any(remainder)
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def direct_transform(gamma: list[Fraction], p: int, alpha: int) -> list[Fraction]:
    row = gamma_to_palindromic(gamma, p)
    ell = p + 2 * alpha
    windowed = [
        coefficient * math.comb(ell, alpha + j)
        for j, coefficient in enumerate(row)
    ]
    return palindromic_to_gamma(windowed, p)


def factored_transform(gamma: list[Fraction], p: int, alpha: int) -> list[Fraction]:
    ell = p + 2 * alpha
    degree = p // 2
    out: list[Fraction] = []
    for k in range(degree + 1):
        inner = sum(
            (
                gamma[h]
                * Fraction(
                    math.factorial(p - 2 * h),
                    math.factorial(p + alpha - h) * math.factorial(k - h),
                )
                for h in range(min(k, len(gamma) - 1) + 1)
            ),
            Fraction(0),
        )
        out.append(
            Fraction(
                math.factorial(ell),
                math.factorial(p - 2 * k) * math.factorial(alpha + k),
            )
            * inner
        )
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def sturm_chain(coefficients: list[Fraction]) -> list[fmpq_poly]:
    polynomial = fmpq_poly(
        [fmpq(value.numerator, value.denominator) for value in coefficients]
    )
    chain = [polynomial, polynomial.derivative()]
    while chain[-1].degree() > 0:
        remainder = -(chain[-2] % chain[-1])
        if remainder.is_zero():
            break
        leading = remainder[remainder.degree()]
        remainder = remainder / (leading if leading > 0 else -leading)
        chain.append(remainder)
    return chain


def variations(chain: list[fmpq_poly], endpoint: str | fmpq) -> int:
    signs: list[int] = []
    for polynomial in chain:
        if endpoint == "-inf":
            sign = 1 if polynomial[polynomial.degree()] > 0 else -1
            if polynomial.degree() % 2:
                sign = -sign
        elif endpoint == "+inf":
            sign = 1 if polynomial[polynomial.degree()] > 0 else -1
        else:
            value = polynomial(endpoint)
            sign = (value > 0) - (value < 0)
        if sign:
            signs.append(sign)
    return sum(left != right for left, right in zip(signs, signs[1:]))


def negative_root_count(coefficients: list[Fraction]) -> tuple[int, int]:
    chain = sturm_chain(coefficients)
    polynomial = chain[0]
    count = variations(chain, "-inf") - variations(chain, fmpq(0))
    return count, polynomial.degree()


def rational_choice(randomizer: random.Random, values: list[Fraction]) -> Fraction:
    return values[randomizer.randrange(len(values))]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-degree", type=int, default=14)
    parser.add_argument("--trials", type=int, default=12)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    randomizer = random.Random(993)
    negative_pool = [
        Fraction(1, 25),
        Fraction(1, 5),
        Fraction(1, 2),
        Fraction(1),
        Fraction(2),
        Fraction(5),
        Fraction(25),
    ]
    positive_pool = [
        Fraction(1),
        Fraction(11, 10),
        Fraction(3, 2),
        Fraction(2),
        Fraction(5),
        Fraction(25),
    ]
    alphas = [0, 1, 3, 7]
    reserve_excesses = [0, 2]

    identity_checks = 0
    exact_root_checks = 0
    maximum_output_degree = 0
    records = []
    for degree in range(2, args.max_degree + 1):
        degree_checks = 0
        for alpha in alphas:
            for excess in reserve_excesses:
                p = alpha + 4 * degree - 3 + excess
                for _ in range(args.trials):
                    negative_moduli = [
                        rational_choice(randomizer, negative_pool)
                        for _ in range(degree - 2)
                    ]
                    positive_roots = (
                        rational_choice(randomizer, positive_pool),
                        rational_choice(randomizer, positive_pool),
                    )
                    gamma = gamma_from_roots(negative_moduli, positive_roots)
                    direct = direct_transform(gamma, p, alpha)
                    factored = factored_transform(gamma, p, alpha)
                    assert direct == factored
                    identity_checks += 1
                    negative, output_degree = negative_root_count(direct)
                    assert negative == output_degree
                    exact_root_checks += 1
                    degree_checks += 1
                    maximum_output_degree = max(maximum_output_degree, output_degree)
        records.append(
            {
                "gamma_degree": degree,
                "minimum_reserve": 4 * degree - 3,
                "exact_instances": degree_checks,
            }
        )

    report = {
        "status": "EXACT_TWO_OUTLIER_GAMMA_WINDOW_PROBE",
        "proved_transform_identity": (
            "S_k=(p+2a)!/((p-2k)!(a+k)!) times "
            "sum_{h<=k} gamma_h (p-2h)!/((p+a-h)!(k-h)!)."
        ),
        "candidate_lemma": (
            "If Gamma has exactly two roots in [1,infinity), all remaining "
            "roots are negative, and p-a >= 4 deg(Gamma)-3, then the "
            "gamma polynomial after the binomial window is negative-rooted."
        ),
        "identity_checks": identity_checks,
        "exact_sturm_checks": exact_root_checks,
        "maximum_gamma_degree": args.max_degree,
        "maximum_output_degree": maximum_output_degree,
        "alphas": alphas,
        "reserve_excesses": reserve_excesses,
        "trials_per_parameter_pair": args.trials,
        "records": records,
        "scope": (
            "The coefficient-transform identity is an all-order proof.  "
            "The two-outlier root-location assertion is exact finite "
            "evidence and is not yet a theorem."
        ),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print(args.output)


if __name__ == "__main__":
    main()
