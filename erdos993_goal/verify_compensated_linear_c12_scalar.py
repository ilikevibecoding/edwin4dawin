#!/usr/bin/env python3
"""Exact Bernstein proof of the compensated-linear C12 scalar lemma.

The graph-theoretic compensation inequality certified as sufficient here
remains conjectural.
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

    certificates = []

    # Replay the cleared coefficient form of the graph compensation.
    aa, ap, bm, bb, bp = sp.symbols(
        "a ap bm b bp", positive=True
    )
    gt, gf, dnum = sp.symbols("GT GF D", nonnegative=True)
    kk, rr = sp.symbols("k r", positive=True)
    vv = kk * ap / aa
    hh = 2 * kk * gt / (aa * ap) - rr * gf / (bm * bb)
    eps = kk * dnum / (aa * bb)
    cleared = sp.factor(
        (vv * hh - 2 * kk * rr * eps)
        * aa**2
        * bm
        * bb
        / kk
    )
    expected_cleared = (
        2 * kk * bm * bb * gt
        - rr * aa * ap * gf
        - 2 * kk * rr * aa * bm * dnum
    )
    assert sp.expand(cleared - expected_cleared) == 0

    def certify(name, q, x):
        s = (x + Y) / (x + 1)
        w = r * x - q + 1
        m_value = x + q - 1
        epsilon_max = 4 * w / (r + 4)
        z = m_value + epsilon_max
        baseline = (r + 4) * q + 2 * (x - 1)

        # This is (x+s) times
        #
        #   s*baseline + 2r*epsilon_max - 2 theta*z^2,
        #
        # where theta=s/(x+s).
        p_value = sp.factor(
            s * baseline * (x + s)
            + 2 * r * epsilon_max * (x + s)
            - 2 * s * z**2
        )
        numerator, denominator = sp.together(p_value).as_numer_denom()
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

    # Feasibility at epsilon_max is z>=0 and w>=0.  The expression is
    # concave in q, so only the four possible endpoints are needed.
    threshold_z = 6 / (30 + 4 * R)  # r/(5r+4)

    certify(
        "q=0, bounded x",
        sp.Integer(0),
        threshold_z + (1 - threshold_z) * X,
    )
    certify("q=0, unbounded x", sp.Integer(0), 1 / X)

    certify(
        "q=4, bounded x",
        sp.Integer(4),
        R / 2 + (1 - R / 2) * X,
    )
    certify("q=4, unbounded x", sp.Integer(4), 1 / X)

    x_z = threshold_z * X
    q_z = 1 - (5 + 2 * R / 3) * x_z
    certify("z=0", q_z, x_z)

    x_w = R * X / 2
    q_w = r * x_w + 1
    certify("w=0", q_w, x_w)

    print("PASS")
    print(
        "total coefficients=",
        sum(item["coefficient_count"] for item in certificates),
    )
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
