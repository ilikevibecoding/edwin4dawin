#!/usr/bin/env python3
"""Exact symbolic certificate for rank-three marginal tensorization.

For old star branches a_i and a new largest branch a, set

    s = number of old branches,
    e = sum_i(a_i-1),
    M = s+e,
    T = sum_i binom(a_i,2).

At rank three, the scalar tensorization slack depends on the old
forest only through M,s,T.  It is a concave quadratic in T, and

    e(e+s)/(2s) <= T <= ae/2.

For a>=2 write a=v+2, s=t+1, and

    e=s(a-1)x,  0<=x<=1.

At each endpoint for T, this script expands the slack in the degree-six
Bernstein basis in x.  Every Bernstein coefficient is then expanded in
the ordinary monomial basis in v,t.  Nonnegative monomial coefficients
give an exact positivity certificate for all v,t>=0 and x in [0,1].
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp


x, t, v, capital_t = sp.symbols(
    "x t v capital_t",
    nonnegative=True,
)
s = t + 1
a = v + 2
e = s * (a - 1) * x
m = s + e


def rank_three_slack(t2_value):
    r1 = m + s
    r2 = (
        m * (m - 1) / 2
        + m * (s - 1)
        + s * (s - 1) / 2
    )
    r3 = (
        m * (m - 1) * (m - 2) / 6
        + s * m * (m - 1) / 2
        - m * m
        + 2 * m
        + t2_value
        + m * (s - 1) * (s - 2) / 2
        + s * (s - 1) * (s - 2) / 6
    )
    k3 = (
        r3
        + (a + 1) * r2
        + a * (a - 1) * r1 / 2
        + a * (a - 1) * (a - 2) / 6
    )
    a3 = (
        3 * r3
        + 2 * (a + 1) * r2
        + a * (a - 1) * r1 / 2
    )
    return sp.factor(
        9 * m * k3 * k3
        - (m + a) * (a3 * a3 + 4 * m * r2 * r2)
    )


def bernstein_coefficients(poly, variable):
    expanded = sp.Poly(sp.expand(poly), variable)
    degree = expanded.degree()
    powers = [
        expanded.coeff_monomial(variable**j)
        for j in range(degree + 1)
    ]
    coefficients = []
    for i in range(degree + 1):
        coefficients.append(
            sp.factor(
                sum(
                    sp.Rational(
                        sp.binomial(i, j),
                        sp.binomial(degree, j),
                    )
                    * powers[j]
                    for j in range(i + 1)
                )
            )
        )
    return degree, coefficients


def inspect_endpoint(name, endpoint):
    slack = rank_three_slack(endpoint)
    degree, coefficients = bernstein_coefficients(slack, x)
    rows = []
    canonical = []
    for index, coefficient in enumerate(coefficients):
        numerator, denominator = sp.together(coefficient).as_numer_denom()
        polynomial = sp.Poly(sp.expand(numerator), v, t)
        terms = polynomial.terms()
        negative = [
            {"powers": list(powers), "coefficient": str(value)}
            for powers, value in terms
            if value < 0
        ]
        assert not negative, (name, index, negative[0])
        assert denominator > 0
        term_rows = [
            [list(powers), str(value)]
            for powers, value in terms
        ]
        canonical.append(
            {
                "index": index,
                "denominator": str(denominator),
                "terms": term_rows,
            }
        )
        rows.append(
            {
                "bernstein_index": index,
                "monomial_term_count": len(terms),
                "negative_monomial_count": len(negative),
                "denominator": str(denominator),
                "minimum_monomial_coefficient": str(
                    min(value for _, value in terms)
                ),
            }
        )
    digest = hashlib.sha256(
        json.dumps(
            canonical,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
    ).hexdigest()
    return {
        "endpoint": name,
        "bernstein_degree": degree,
        "bernstein_coefficient_count": len(coefficients),
        "total_monomial_terms": sum(
            row["monomial_term_count"] for row in rows
        ),
        "negative_monomial_count": 0,
        "coefficient_sha256": digest,
        "coefficients": rows,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    symbolic_slack = rank_three_slack(capital_t)
    concavity = sp.factor(
        sp.diff(symbolic_slack, capital_t, 2)
    )
    assert sp.simplify(concavity + 18 * a) == 0

    upper_t = a * e / 2
    lower_t = e * (e + s) / (2 * s)
    rows = [
        inspect_endpoint("T_max_ae_over_2", upper_t),
        inspect_endpoint("T_min_e_times_e_plus_s_over_2s", lower_t),
    ]
    report = {
        "status": "PASS_SYMBOLIC_PROOF",
        "rank_k": 3,
        "second_derivative_in_T": str(concavity),
        "parameterization": {
            "a": "v+2",
            "s": "t+1",
            "e": "(t+1)(v+1)x",
            "domain": "v>=0, t>=0, 0<=x<=1",
        },
        "endpoints": rows,
    }
    serialized = json.dumps(report, indent=2) + "\n"
    args.out.write_text(serialized, encoding="utf-8")
    print(serialized)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
