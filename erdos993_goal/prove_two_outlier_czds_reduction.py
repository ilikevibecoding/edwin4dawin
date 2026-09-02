#!/usr/bin/env python3
"""Exact replay for the CZDS reduction of the two-outlier window lemma.

Let ``Gamma`` have two roots in ``[1,infinity)`` and all remaining roots on
the negative axis.  Then

    C(z) = (1+z)^p Gamma(z/(1+z)^2)

has exactly four non-real zeros.  The coefficient multiplier

    lambda_j = binom(p+2*a, a+j)

is a complex-zero-decreasing sequence on polynomials of degree at most p:
up to a positive constant it is the product of the two reciprocal-factorial
CZDS ``1/(a+j)!`` and ``1/(p+a-j)!`` (the latter is obtained from the former
by degree-p reversal).  Hence the windowed polynomial W has at most four
non-real zeros.

The recursion

    S_{p,a}[(t+c)Gamma]
      = c S_{p,a}[Gamma] + t S_{p-2,a+1}[Gamma]

and the proved degree-two base show inductively that every coefficient of S
is positive when ``p-a >= 4*deg(Gamma)-3``.  Therefore S has no nonnegative
real zeros.  Since a non-real conjugate pair of S lifts under
``t=z/(1+z)^2`` to four non-real zeros of W, S has at most one non-real
conjugate pair and every one of its real zeros is negative.

The argument above is all order.  This script independently replays the
coefficient positivity, transform identities, and exact Sturm bound over a
finite rational test set.  It does not assert that the last possible
conjugate pair is absent.
"""

from __future__ import annotations

import argparse
import json
import random
from fractions import Fraction
from pathlib import Path

from flint import fmpq, fmpq_poly

from probe_two_outlier_gamma_binomial_window import (
    factored_transform,
    gamma_from_roots,
    gamma_to_palindromic,
    sturm_chain,
    variations,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "two_outlier_czds_reduction_theorem_20260805.json"


def window_row(gamma: list[Fraction], p: int, alpha: int) -> list[Fraction]:
    import math

    row = gamma_to_palindromic(gamma, p)
    ell = p + 2 * alpha
    return [
        coefficient * math.comb(ell, alpha + j)
        for j, coefficient in enumerate(row)
    ]


def real_root_count(coefficients: list[Fraction]) -> tuple[int, int]:
    polynomial = fmpq_poly(
        [fmpq(value.numerator, value.denominator) for value in coefficients]
    )
    chain = sturm_chain(coefficients)
    real = variations(chain, "-inf") - variations(chain, "+inf")
    return real, polynomial.degree()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-degree", type=int, default=16)
    parser.add_argument("--trials", type=int, default=20)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()

    randomizer = random.Random(993127)
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

    positivity_checks = 0
    czds_bound_checks = 0
    transform_checks = 0
    maximum_output_degree = 0
    records = []
    for degree in range(2, args.max_degree + 1):
        degree_checks = 0
        for alpha in (0, 1, 3, 7):
            for excess in (0, 1, 4):
                p = alpha + 4 * degree - 3 + excess
                for _ in range(args.trials):
                    negative_moduli = [
                        randomizer.choice(negative_pool)
                        for _ in range(degree - 2)
                    ]
                    positive_roots = (
                        randomizer.choice(positive_pool),
                        randomizer.choice(positive_pool),
                    )
                    gamma = gamma_from_roots(negative_moduli, positive_roots)
                    transformed = factored_transform(gamma, p, alpha)
                    assert all(coefficient > 0 for coefficient in transformed)
                    positivity_checks += len(transformed)

                    direct = window_row(gamma, p, alpha)
                    rebuilt = gamma_to_palindromic(transformed, p)
                    assert direct == rebuilt
                    transform_checks += 1

                    real, output_degree = real_root_count(direct)
                    assert output_degree - real <= 4
                    czds_bound_checks += 1
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
        "status": "ALL_ORDER_TWO_OUTLIER_CZDS_REDUCTION",
        "theorem": (
            "Under the two-outlier hypotheses and reserve p-a>=4m-3, "
            "the output gamma polynomial S has strictly positive "
            "coefficients, every real zero of S is negative, and S has "
            "at most one non-real conjugate pair."
        ),
        "proof": [
            "C has exactly four non-real zeros: one reciprocal-conjugate pair for each positive gamma root",
            "the shifted binomial window is a product of reciprocal-factorial complex-zero-decreasing sequences",
            "therefore the window W has at most four non-real zeros",
            "the degree-two theorem plus S[(t+c)Gamma]=cS[Gamma]+tS_shift[Gamma] proves coefficient positivity by induction",
            "a non-real conjugate pair of S lifts to four non-real zeros of W, so at most one pair remains",
        ],
        "exact_replay": {
            "max_gamma_degree": args.max_degree,
            "positivity_checks": positivity_checks,
            "transform_checks": transform_checks,
            "czds_bound_checks": czds_bound_checks,
            "maximum_window_degree": maximum_output_degree,
            "records": records,
        },
        "remaining_obligation": (
            "Exclude the single possible conjugate pair, equivalently "
            "prove nonnegativity of the discriminant or a no-double-root "
            "continuation criterion."
        ),
    }
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["exact_replay"], indent=2))
    print(args.output)


if __name__ == "__main__":
    main()
