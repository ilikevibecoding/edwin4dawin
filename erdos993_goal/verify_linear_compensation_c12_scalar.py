#!/usr/bin/env python3
"""Exact Bernstein proof of the linear-package C12 scalar lemma.

This proves only the scalar implication recorded in Section 6 of
THREE_COMPARISON_C12_REDUCTION_2026-07-28.md.  The three graph-theoretic
hypotheses of that lemma remain conjectural.
"""

from __future__ import annotations

from itertools import product

import sympy as sp


def tensor_bernstein_coefficients(poly, variables):
    expanded = sp.Poly(sp.expand(poly), *variables)
    degrees = tuple(expanded.degree(variable) for variable in variables)
    power = dict(expanded.terms())
    output = []
    for index in product(*(range(degree + 1) for degree in degrees)):
        value = 0
        for monomial, coefficient in power.items():
            if all(j <= i for j, i in zip(monomial, index)):
                multiplier = 1
                for j, i, degree in zip(
                    monomial, index, degrees
                ):
                    multiplier *= (
                        sp.binomial(i, j)
                        / sp.binomial(degree, j)
                    )
                value += coefficient * multiplier
        output.append((sp.factor(value), index))
    return degrees, output


def main() -> int:
    R, X, Y = sp.symbols("R X Y", nonnegative=True)
    r = 6 / R
    k = r + 1
    curvature_floor = sp.Integer(7)

    certificates = []

    def certify(name, q, x):
        # Y parameterizes s in [x/(x+1),1].
        s = (x + Y) / (x + 1)
        m_value = x + q - 1
        z_max = x + r * m_value / k
        v_at_max = k * x - z_max
        baseline = (r + 4) * q + 2 * (x - 1)

        # Multiplying
        #
        #   2 theta z^2 - s*baseline - 7v/k
        #
        # by x+s gives P.  We certify -P >= 0.
        p_value = sp.factor(
            2 * s * z_max**2
            - s * baseline * (x + s)
            - curvature_floor
            * v_at_max
            * (x + s)
            / k
        )
        numerator, denominator = sp.together(-p_value).as_numer_denom()
        numerator = sp.factor(numerator)
        degrees, coefficients = tensor_bernstein_coefficients(
            numerator, (R, X, Y)
        )
        minimum, minimum_index = min(coefficients)
        assert minimum >= 0, (
            name,
            minimum,
            minimum_index,
            sp.factor(denominator),
        )
        certificates.append(
            {
                "case": name,
                "degrees": degrees,
                "coefficient_count": len(coefficients),
                "minimum": minimum,
                "minimum_index": minimum_index,
                "denominator": sp.factor(denominator),
            }
        )

    # Put R=6/r, so r>=6 is exactly 0<R<=1.  Convexity in q
    # reduces the admissible interval to its lower and upper endpoints.
    threshold_z = 6 / (12 + R)  # r/(2r+1)

    # Lower endpoint q=0, first on the compact interval
    # r/(2r+1) <= x <= 1 and then on 1 <= x < infinity.
    certify(
        "q=0, bounded x",
        sp.Integer(0),
        threshold_z + (1 - threshold_z) * X,
    )
    certify("q=0, unbounded x", sp.Integer(0), 1 / X)

    # Upper endpoint q=4, first on 3/r <= x <= 1 and then on
    # 1 <= x < infinity.
    certify(
        "q=4, bounded x",
        sp.Integer(4),
        R / 2 + (1 - R / 2) * X,
    )
    certify("q=4, unbounded x", sp.Integer(4), 1 / X)

    # When q=0 is cut off by z_max>=0, the lower endpoint is
    # q_Z=1-(2+1/r)x, where z_max=0.
    x_z = threshold_z * X
    q_z = 1 - (2 + R / 6) * x_z
    certify("z_max=0", q_z, x_z)

    # When q=4 is cut off by w>=0, the upper endpoint is
    # q_W=rx+1, where v_at_max=0.
    x_w = R * X / 2
    q_w = r * x_w + 1
    certify("w=0", q_w, x_w)

    assert sum(item["coefficient_count"] for item in certificates) == 465
    print("PASS")
    for item in certificates:
        print(
            item["case"],
            "degrees=",
            item["degrees"],
            "coefficients=",
            item["coefficient_count"],
            "minimum=",
            item["minimum"],
            "at",
            item["minimum_index"],
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
