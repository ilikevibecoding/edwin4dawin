#!/usr/bin/env python3
"""Test coefficientwise signs of the aligned prefix-integrand brackets.

For fixed support distance s, align every earlier residual D(t) to
the coefficient target of D(s).  After removing the common positive
outside powers, the c-, m-, and x-prefix inequalities reduce to three
explicit polynomial brackets.  This script constructs those brackets
using sparse exact arithmetic from the exported stable integrand and
checks their ordinary monomial coefficients.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path


# Sparse monomial key: (power_z, power_w, power_c, power_m, power_x).
Polynomial = dict[tuple[int, int, int, int, int], int]


def add(
    target: Polynomial,
    source: Polynomial,
    scalar: int = 1,
) -> None:
    for monomial, coefficient in source.items():
        value = target.get(monomial, 0) + scalar * coefficient
        if value:
            target[monomial] = value
        elif monomial in target:
            del target[monomial]


def eval_support(
    terms: list[dict],
    support: int,
) -> Polynomial:
    result: Polynomial = {}
    for item in terms:
        pz, pw, pc, pm, ps, px = item[
            "monomial_z_w_c_m_s_x"
        ]
        coefficient = int(item["coefficient"]) * support**ps
        if coefficient:
            key = (pz, pw, pc, pm, px)
            result[key] = result.get(key, 0) + coefficient
    return {key: value for key, value in result.items() if value}


def shift_parameter(
    polynomial: Polynomial,
    coordinate: int,
) -> Polynomial:
    """Substitute variable_coordinate -> variable_coordinate + 1."""

    result: Polynomial = {}
    for monomial, coefficient in polynomial.items():
        power = monomial[coordinate]
        for new_power in range(power + 1):
            shifted = list(monomial)
            shifted[coordinate] = new_power
            key = tuple(shifted)
            result[key] = result.get(key, 0) + (
                coefficient * math.comb(power, new_power)
            )
    return {key: value for key, value in result.items() if value}


def multiply_one_plus_pair(
    polynomial: Polynomial,
    power: int,
) -> Polynomial:
    """Multiply by ((1+z)(1+w))^power."""

    if power == 0:
        return dict(polynomial)
    result: Polynomial = {}
    row = [math.comb(power, index) for index in range(power + 1)]
    for monomial, coefficient in polynomial.items():
        pz, pw, pc, pm, px = monomial
        for dz, left in enumerate(row):
            for dw, right in enumerate(row):
                key = (pz + dz, pw + dw, pc, pm, px)
                result[key] = result.get(key, 0) + (
                    coefficient * left * right
                )
    return {key: value for key, value in result.items() if value}


def multiply_zw(
    polynomial: Polynomial,
    power: int,
) -> Polynomial:
    return {
        (pz + power, pw + power, pc, pm, px): coefficient
        for (pz, pw, pc, pm, px), coefficient
        in polynomial.items()
    }


def multiply_t_squared(polynomial: Polynomial) -> Polynomial:
    """Multiply by (z(1+z)+w(1+w))^2."""

    # (z+z^2+w+w^2)^2, stored with multiplicities.
    atoms = ((1, 0), (2, 0), (0, 1), (0, 2))
    multiplier: dict[tuple[int, int], int] = {}
    for left in atoms:
        for right in atoms:
            key = (left[0] + right[0], left[1] + right[1])
            multiplier[key] = multiplier.get(key, 0) + 1
    result: Polynomial = {}
    for monomial, coefficient in polynomial.items():
        pz, pw, pc, pm, px = monomial
        for (dz, dw), factor in multiplier.items():
            key = (pz + dz, pw + dw, pc, pm, px)
            result[key] = result.get(key, 0) + coefficient * factor
    return {key: value for key, value in result.items() if value}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--s-max", type=int, default=6)
    args = parser.parse_args()

    records = []
    total_negative = 0
    for parity in (0, 1):
        source = json.loads(
            Path(
                "path_isolate_p4_group_integrand_stable_"
                f"parity{parity}_terms_20260730.json"
            ).read_text(encoding="utf-8")
        )
        if source["denominator"] != "1":
            raise ValueError("expected an integral stable polynomial")
        terms = source["terms"]
        cache = {
            support: eval_support(terms, support)
            for support in range(-1, args.s_max + 1)
        }
        for support in range(-1, args.s_max + 1):
            # c bracket.
            c_bracket: Polynomial = {}
            add(
                c_bracket,
                multiply_one_plus_pair(
                    shift_parameter(cache[support], 2),
                    support + 3,
                ),
            )
            for r in range(support + 2):
                prior = multiply_one_plus_pair(
                    cache[support - r],
                    support + 1 - r,
                )
                prior = multiply_zw(prior, r)
                add(c_bracket, prior, -(r + 1))

            # x bracket.
            x_bracket: Polynomial = {}
            add(
                x_bracket,
                multiply_one_plus_pair(
                    shift_parameter(cache[support], 4),
                    support + 2,
                ),
            )
            for r in range(support + 2):
                prior = multiply_one_plus_pair(
                    cache[support - r],
                    support + 1 - r,
                )
                prior = multiply_zw(prior, r)
                add(x_bracket, prior, -1)

            # m bracket.  Coordinate index 3 is m.
            m_bracket: Polynomial = {}
            new = shift_parameter(cache[support], 3)
            new = multiply_t_squared(new)
            new = multiply_one_plus_pair(new, support + 2)
            add(m_bracket, new)
            for r in range(support + 2):
                prior = multiply_one_plus_pair(
                    cache[support - r],
                    support + 1 - r,
                )
                prior = multiply_zw(prior, r + 1)
                add(m_bracket, prior, -(r + 1))

            for coordinate, polynomial in (
                ("c", c_bracket),
                ("m", m_bracket),
                ("x", x_bracket),
            ):
                negative = [
                    (monomial, coefficient)
                    for monomial, coefficient in polynomial.items()
                    if coefficient < 0
                ]
                total_negative += len(negative)
                records.append(
                    {
                        "parity_epsilon": parity,
                        "support_distance_s": support,
                        "coordinate": coordinate,
                        "term_count": len(polynomial),
                        "negative_coefficient_count": len(negative),
                        "smallest_coefficient": min(
                            polynomial.values(), default=0
                        ),
                        "first_negative_terms": [
                            {
                                "monomial_z_w_c_m_x": list(monomial),
                                "coefficient": coefficient,
                            }
                            for monomial, coefficient in negative[:20]
                        ],
                    }
                )
                print(
                    f"epsilon={parity} s={support} "
                    f"{coordinate}: terms={len(polynomial)} "
                    f"negative={len(negative)}",
                    flush=True,
                )

    report = {
        "status": (
            "PASS_PATH_ISOLATE_P4_PREFIX_INTEGRAND_BRACKETS"
            if total_negative == 0
            else "FAIL_PATH_ISOLATE_P4_PREFIX_INTEGRAND_BRACKETS"
        ),
        "support_range": [-1, args.s_max],
        "total_negative_coefficient_count": total_negative,
        "records": records,
        "warning": (
            "A sign failure only rejects the raw coefficientwise "
            "integrand certificate; it does not reject the "
            "coefficient-extracted prefix inequality."
        ),
    }
    Path(
        "path_isolate_p4_prefix_integrand_brackets_"
        "stress_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if total_negative:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
