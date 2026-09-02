#!/usr/bin/env python3
"""Exact discriminant certificates for the two minimal quartic boundaries.

Put

    Gamma(t) = (1-u*t)(1-v*t)(t+c)(t+d),
    0 <= u,v <= 1,  c,d > 0.

At the two minimal reserve boundaries ``(p,alpha)=(13,0),(14,1)`` the
shifted-binomial window image ``S`` has degree six or seven.  Write

    q = sqrt(c*d) > 0,
    z = c+d-2*sqrt(c*d) >= 0.

Thus ``c+d=2*q+z`` and ``c*d=q^2``.  This script constructs ``S`` and its
degree-six discriminant exactly over QQ[u,v,q,z].  It then converts only
the bounded variables u and v from the power basis to the tensor Bernstein
basis.  Every nonzero coefficient left in the ordinary q,z power basis is
strictly positive.  A support check at every Bernstein index includes a
positive z^0 term, so the discriminant is strictly positive for q>0,
including all endpoints of the u,v square and the repeated-factor face
z=0.

The previously proved complex-zero-decreasing reduction says that S has at
most one nonreal conjugate pair and that every real zero is negative.  The
sign of a real polynomial's discriminant is (-1)^s, up to a positive
factor, when it has s conjugate pairs.  Strict positivity therefore rules
out the last possible pair and proves that S is negative-rooted.

No floating-point arithmetic is used in the certificate.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
import time
from collections import defaultdict
from fractions import Fraction
from pathlib import Path

import flint
from flint import fmpq, fmpq_mpoly, fmpq_mpoly_ctx, fmpq_poly

from probe_two_outlier_gamma_binomial_window import (
    direct_transform,
    factored_transform,
    negative_root_count,
)


HERE = Path(__file__).resolve().parent
REPORT = HERE / "two_outlier_two_negative_minimal_boundaries_theorem_20260805.json"
VARIABLES = ("x", "u", "v", "q", "z")
CTX = fmpq_mpoly_ctx.get(VARIABLES)
X, U, V, Q, Z = (CTX.gen(index) for index in range(len(VARIABLES)))


def qq(value: int | Fraction) -> fmpq:
    value = Fraction(value)
    return fmpq(value.numerator, value.denominator)


def gamma_polynomial() -> list[fmpq_mpoly]:
    """Coefficients of (1-ut)(1-vt)(t^2+(2q+z)t+q^2)."""
    bounded_sum = U + V
    bounded_product = U * V
    negative_sum = 2 * Q + Z
    negative_product = Q**2
    return [
        negative_product,
        negative_sum - negative_product * bounded_sum,
        1 - negative_sum * bounded_sum + negative_product * bounded_product,
        -bounded_sum + negative_sum * bounded_product,
        bounded_product,
    ]


def transformed_polynomial(p: int = 13, alpha: int = 0) -> fmpq_mpoly:
    """Build equation (717) exactly as a polynomial in x,u,v,q,z."""
    gamma = gamma_polynomial()
    degree = p // 2
    output = CTX.constant(0)
    for k in range(degree + 1):
        inner = CTX.constant(0)
        for h in range(min(k, len(gamma) - 1) + 1):
            scalar = Fraction(
                math.factorial(p - 2 * h),
                math.factorial(p + alpha - h) * math.factorial(k - h),
            )
            inner += gamma[h] * qq(scalar)
        prefactor = Fraction(
            math.factorial(p + 2 * alpha),
            math.factorial(p - 2 * k) * math.factorial(alpha + k),
        )
        output += X**k * qq(prefactor) * inner
    assert output.degrees()[0] == degree
    return output


def polynomial_digest(
    coefficients: dict[tuple[int, ...], fmpq], *, scale_invariant: bool = False
) -> str:
    items = sorted((index, value) for index, value in coefficients.items() if value)
    if scale_invariant:
        scale = items[0][1]
        items = [(index, value / scale) for index, value in items]
    payload = ";".join(
        f"{','.join(map(str, index))}:{value}" for index, value in items
    )
    return hashlib.sha256(payload.encode("ascii")).hexdigest()


def bernstein_uv(
    coefficients: dict[tuple[int, int, int, int], fmpq],
    degree_u: int,
    degree_v: int,
) -> dict[tuple[int, int, int, int], fmpq]:
    """Power-to-Bernstein conversion in u,v, retaining q,z powers."""
    output: dict[tuple[int, int, int, int], fmpq] = defaultdict(fmpq)
    for (a, b, q_degree, z_degree), coefficient in coefficients.items():
        for i in range(a, degree_u + 1):
            multiplier_u = qq(Fraction(math.comb(i, a), math.comb(degree_u, a)))
            for j in range(b, degree_v + 1):
                multiplier_v = qq(
                    Fraction(math.comb(j, b), math.comb(degree_v, b))
                )
                index = (i, j, q_degree, z_degree)
                output[index] += coefficient * multiplier_u * multiplier_v
    return {index: value for index, value in output.items() if value}


def specialize_x_polynomial(
    polynomial: fmpq_mpoly,
    u_value: Fraction,
    v_value: Fraction,
    q_value: Fraction,
    z_value: Fraction,
) -> fmpq_poly:
    values = tuple(map(qq, (u_value, v_value, q_value, z_value)))
    coefficients: dict[int, fmpq] = defaultdict(fmpq)
    for monomial, coefficient in polynomial.to_dict().items():
        x_degree, *parameter_degrees = monomial
        specialized = coefficient
        for value, degree in zip(values, parameter_degrees):
            specialized *= value**degree
        coefficients[x_degree] += specialized
    maximum = max(coefficients, default=0)
    return fmpq_poly([coefficients[index] for index in range(maximum + 1)])


def evaluate_parameter_polynomial(
    coefficients: dict[tuple[int, int, int, int], fmpq],
    u_value: Fraction,
    v_value: Fraction,
    q_value: Fraction,
    z_value: Fraction,
) -> fmpq:
    values = tuple(map(qq, (u_value, v_value, q_value, z_value)))
    output = fmpq(0)
    for monomial, coefficient in coefficients.items():
        term = coefficient
        for value, degree in zip(values, monomial):
            term *= value**degree
        output += term
    return output


def rational_gamma(
    u_value: Fraction,
    v_value: Fraction,
    q_value: Fraction,
    z_value: Fraction,
) -> list[Fraction]:
    bounded_sum = u_value + v_value
    bounded_product = u_value * v_value
    negative_sum = 2 * q_value + z_value
    negative_product = q_value**2
    return [
        negative_product,
        negative_sum - negative_product * bounded_sum,
        1 - negative_sum * bounded_sum + negative_product * bounded_product,
        -bounded_sum + negative_sum * bounded_product,
        bounded_product,
    ]


def exact_replay(
    transformed: fmpq_mpoly,
    discriminant_coefficients: dict[tuple[int, int, int, int], fmpq],
    p: int,
    alpha: int,
    random_trials: int,
) -> dict[str, object]:
    """Independent transform, discriminant, and exact-Sturm comparisons."""
    fixed = [
        (Fraction(0), Fraction(0), Fraction(1), Fraction(0)),
        (Fraction(1), Fraction(1), Fraction(1), Fraction(0)),
        (Fraction(1, 5), Fraction(4, 5), Fraction(1, 7), Fraction(0)),
        (Fraction(1, 3), Fraction(2, 3), Fraction(5, 2), Fraction(7, 4)),
    ]
    randomizer = random.Random(993142)
    bounded = [Fraction(0), Fraction(1, 25), Fraction(1, 5), Fraction(1, 2), Fraction(4, 5), Fraction(1)]
    positive = [Fraction(1, 25), Fraction(1, 5), Fraction(1), Fraction(5), Fraction(25)]
    nonnegative = [Fraction(0), Fraction(1, 25), Fraction(1, 2), Fraction(5), Fraction(25)]
    samples = list(fixed)
    for _ in range(random_trials):
        samples.append(
            (
                randomizer.choice(bounded),
                randomizer.choice(bounded),
                randomizer.choice(positive),
                randomizer.choice(nonnegative),
            )
        )

    transform_checks = 0
    discriminant_checks = 0
    sturm_checks = 0
    for u_value, v_value, q_value, z_value in samples:
        gamma = rational_gamma(u_value, v_value, q_value, z_value)
        direct = direct_transform(gamma, p, alpha)
        factored = factored_transform(gamma, p, alpha)
        assert direct == factored
        specialized = specialize_x_polynomial(
            transformed, u_value, v_value, q_value, z_value
        )
        expected = fmpq_poly(
            [qq(coefficient) for coefficient in factored]
        )
        assert specialized == expected
        transform_checks += 1

        exact_discriminant = evaluate_parameter_polynomial(
            discriminant_coefficients,
            u_value,
            v_value,
            q_value,
            z_value,
        )
        assert exact_discriminant == specialized.discriminant()
        assert exact_discriminant > 0
        discriminant_checks += 1

        negative, degree = negative_root_count(factored)
        assert degree == p // 2 and negative == degree
        sturm_checks += 1

    return {
        "sample_count": len(samples),
        "direct_vs_factored_transform_checks": transform_checks,
        "multivariate_vs_univariate_discriminant_checks": discriminant_checks,
        "exact_sturm_negative_root_checks": sturm_checks,
    }


def derive(p: int, alpha: int, random_trials: int) -> dict[str, object]:
    expected_counts = {
        (13, 0): {
            "power_terms": 12090,
            "power_negative": 5998,
            "bernstein_positive": 14278,
        },
        (14, 1): {
            "power_terms": 25082,
            "power_negative": 12468,
            "bernstein_positive": 28054,
        },
    }
    assert (p, alpha) in expected_counts
    expected = expected_counts[p, alpha]
    started = time.perf_counter()
    transformed = transformed_polynomial(p, alpha)
    transform_seconds = time.perf_counter() - started
    output_degree = p // 2
    assert transformed.degrees() == (output_degree, 1, 1, 2, 1)

    started_discriminant = time.perf_counter()
    discriminant = transformed.discriminant(0)
    discriminant_seconds = time.perf_counter() - started_discriminant
    assert discriminant.degrees()[0] == 0
    discriminant_dict_full = discriminant.to_dict()
    discriminant_coefficients = {
        (monomial[1], monomial[2], monomial[3], monomial[4]): coefficient
        for monomial, coefficient in discriminant_dict_full.items()
    }
    degrees = tuple(discriminant.degrees()[index] for index in range(1, 5))
    parameter_degree = 2 * output_degree - 2
    assert degrees == (
        parameter_degree,
        parameter_degree,
        2 * parameter_degree,
        parameter_degree,
    )
    raw_negative_count = sum(value < 0 for value in discriminant_coefficients.values())
    assert len(discriminant_coefficients) == expected["power_terms"]
    assert raw_negative_count == expected["power_negative"]

    started_factor = time.perf_counter()
    unit, factors = discriminant.factor()
    factor_seconds = time.perf_counter() - started_factor
    assert unit > 0
    assert len(factors) == 1 and factors[0][1] == 1
    irreducible, exponent = factors[0]
    assert irreducible.degrees() == (0, *degrees)

    started_bernstein = time.perf_counter()
    bernstein = bernstein_uv(discriminant_coefficients, degrees[0], degrees[1])
    bernstein_seconds = time.perf_counter() - started_bernstein
    positive_count = sum(value > 0 for value in bernstein.values())
    negative_count = sum(value < 0 for value in bernstein.values())
    assert len(bernstein) == positive_count == expected["bernstein_positive"]
    assert negative_count == 0

    lattice_size = (degrees[0] + 1) * (degrees[1] + 1) * (degrees[2] + 1) * (degrees[3] + 1)
    zero_count = lattice_size - len(bernstein)

    # For each Bernstein basis element, the q,z coefficient polynomial has
    # a positive z^0 monomial.  Since q>0, this proves strict positivity even
    # at z=0.  It is stronger than what endpoint coverage alone requires.
    z_zero_support: dict[tuple[int, int], list[int]] = defaultdict(list)
    for (i, j, q_degree, z_degree), coefficient in bernstein.items():
        if z_degree == 0 and coefficient > 0:
            z_zero_support[i, j].append(q_degree)
    assert len(z_zero_support) == (degrees[0] + 1) * (degrees[1] + 1)
    assert all(z_zero_support[index] for index in z_zero_support)

    # The discriminant and its Bernstein certificate must respect u<->v.
    assert all(
        discriminant_coefficients.get((b, a, q_degree, z_degree), fmpq(0))
        == coefficient
        for (a, b, q_degree, z_degree), coefficient in discriminant_coefficients.items()
    )
    assert all(
        bernstein.get((j, i, q_degree, z_degree), fmpq(0)) == coefficient
        for (i, j, q_degree, z_degree), coefficient in bernstein.items()
    )

    replay = exact_replay(
        transformed, discriminant_coefficients, p, alpha, random_trials
    )
    total_seconds = time.perf_counter() - started

    support_records = []
    for i in range(degrees[0] + 1):
        for j in range(degrees[1] + 1):
            local = {
                (q_degree, z_degree): coefficient
                for (ii, jj, q_degree, z_degree), coefficient in bernstein.items()
                if ii == i and jj == j
            }
            support_records.append(
                {
                    "bernstein_index_u_v": [i, j],
                    "positive_q_z_term_count": len(local),
                    "z_zero_q_degrees": sorted(z_zero_support[i, j]),
                    "scale_invariant_digest": polynomial_digest(
                        local, scale_invariant=True
                    ),
                }
            )

    return {
        "status": "MINIMAL_QUARTIC_TWO_OUTLIER_BOUNDARY_THEOREM",
        "theorem": (
            "For Gamma(t)=(1-u t)(1-v t)(t+c)(t+d), 0<=u,v<=1 and c,d>0, "
            f"the shifted-binomial-window image S_{{{p},{alpha}}}[Gamma] has "
            f"{output_degree} distinct negative real roots."
        ),
        "parameterization": {
            "q": "sqrt(c*d)>0",
            "z": "c+d-2*sqrt(c*d)>=0",
            "negative_quadratic": "t^2+(2q+z)t+q^2",
        },
        "logical_dependencies": [
            "The all-order CZDS reduction gives at most one nonreal conjugate pair and no nonnegative real roots.",
            "For a real polynomial with at most one conjugate pair, a strictly positive discriminant excludes that pair.",
        ],
        "window": {"p": p, "alpha": alpha, "degree": output_degree},
        "exact_polynomial": {
            "variables": list(VARIABLES),
            "transformed_degrees_x_u_v_q_z": list(transformed.degrees()),
            "transformed_term_count": len(transformed.to_dict()),
            "transformed_scale_invariant_digest": polynomial_digest(
                transformed.to_dict(), scale_invariant=True
            ),
        },
        "discriminant": {
            "degrees_u_v_q_z": list(degrees),
            "power_basis_term_count": len(discriminant_coefficients),
            "power_basis_negative_coefficient_count": raw_negative_count,
            "scale_invariant_digest": polynomial_digest(
                discriminant_coefficients, scale_invariant=True
            ),
            "factorization": {
                "positive_unit": str(unit),
                "irreducible_factor_count": len(factors),
                "factor_exponent": exponent,
                "factor_degrees_x_u_v_q_z": list(irreducible.degrees()),
            },
        },
        "bernstein_certificate": {
            "bounded_variables": ["u", "v"],
            "tensor_degree": [degrees[0], degrees[1]],
            "ordinary_nonnegative_variables": ["q", "z"],
            "nonzero_coefficient_count": len(bernstein),
            "strictly_positive_coefficient_count": positive_count,
            "negative_coefficient_count": negative_count,
            "full_lattice_size": lattice_size,
            "zero_coefficient_count": zero_count,
            "all_121_bernstein_indices_have_positive_z_zero_support": True,
            "scale_invariant_digest": polynomial_digest(
                bernstein, scale_invariant=True
            ),
            "support_by_bernstein_index": support_records,
        },
        "exact_replay": replay,
        "software": {
            "python_flint_version": flint.__version__,
            "arithmetic": "exact fmpq/fmpq_poly/fmpq_mpoly only",
        },
        "timings_seconds_non_certificate_metadata": {
            "transform": transform_seconds,
            "discriminant": discriminant_seconds,
            "factorization": factor_seconds,
            "bernstein_conversion": bernstein_seconds,
            "total": total_seconds,
        },
        "scope": (
            f"This closes the p={p}, alpha={alpha} quartic boundary.  The infinite "
            "family p-alpha=13 remains a separate obligation."
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--random-trials", type=int, default=24)
    parser.add_argument("--output", type=Path, default=REPORT)
    args = parser.parse_args()
    boundaries = [
        derive(13, 0, args.random_trials),
        derive(14, 1, args.random_trials),
    ]
    report = {
        "status": "MINIMAL_QUARTIC_TWO_OUTLIER_BOTH_PARITIES_THEOREM",
        "theorem": (
            "For Gamma(t)=(1-u t)(1-v t)(t+c)(t+d), 0<=u,v<=1 and c,d>0, "
            "both minimal p-alpha=13 parity representatives S_{13,0} and "
            "S_{14,1} have only distinct negative real roots."
        ),
        "boundaries": boundaries,
        "scope": (
            "Both minimal parity representatives are proved.  Propagation along "
            "the infinite boundary p-alpha=13 remains to be established."
        ),
    }
    args.output.write_text(
        json.dumps(report, indent=2, default=int) + "\n", encoding="utf-8"
    )
    summary = {
        "status": report["status"],
        "boundaries": [
            {
                "window": boundary["window"],
                "power_terms": boundary["discriminant"]["power_basis_term_count"],
                "power_negative": boundary["discriminant"]["power_basis_negative_coefficient_count"],
                "bernstein_positive": boundary["bernstein_certificate"]["strictly_positive_coefficient_count"],
                "bernstein_negative": boundary["bernstein_certificate"]["negative_coefficient_count"],
                "bernstein_digest": boundary["bernstein_certificate"]["scale_invariant_digest"],
                "exact_replay": boundary["exact_replay"],
            }
            for boundary in boundaries
        ],
    }
    print(json.dumps(summary, indent=2, default=int), flush=True)
    print(args.output, flush=True)


if __name__ == "__main__":
    main()
