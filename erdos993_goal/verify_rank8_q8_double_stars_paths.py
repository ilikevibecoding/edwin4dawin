#!/usr/bin/env python3
"""Exact all-order rank-eight Q8 certificates for paths and double stars."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


def choose_poly(x: sp.Expr, k: int) -> sp.Expr:
    return sp.prod(x - j for j in range(k)) / sp.factorial(k)


def q8(i7: sp.Expr, i8: sp.Expr, i9: sp.Expr) -> sp.Expr:
    return sp.expand(16 * i8**2 - i7 * i8 - 18 * i7 * i9)


def coefficient_row(poly: sp.Poly) -> dict[str, object]:
    values = poly.coeffs()
    return {
        "terms": len(values),
        "negative_coefficients": sum(1 for x in values if x < 0),
        "zero_coefficients_omitted": True,
        "minimum_positive_coefficient": str(min(values)),
    }


def main() -> None:
    n = sp.symbols("n", integer=True, nonnegative=True)
    path_q8 = sp.factor(
        sp.combsimp(
            q8(choose_poly(n - 6, 7), choose_poly(n - 7, 8), choose_poly(n - 8, 9))
        )
    )
    expected_path = (
        (n - 14)
        * (n - 13)
        * (n - 12) ** 2
        * (n - 11) ** 2
        * (n - 10) ** 2
        * (n - 9) ** 2
        * (n - 8) ** 2
        * (n - 7)
        * (5 * n**2 - 97 * n + 290)
        / 203212800
    )
    assert sp.expand(path_q8 - expected_path) == 0
    # For alpha(P_n)=ceil(n/2)>=14, n>=27.  Every displayed factor is
    # positive there, and the quadratic is increasing and positive at 27.
    assert sp.expand((5 * n**2 - 97 * n + 290).subs(n, 27)) > 0
    assert sp.diff(5 * n**2 - 97 * n + 290, n).subs(n, 27) > 0

    a, b = sp.symbols("a b", integer=True, nonnegative=True)

    def double_star_i(j: int) -> sp.Expr:
        # I(S_{a,b})=(1+x)^(a+b)+x(1+x)^a+x(1+x)^b.
        return choose_poly(a + b, j) + choose_poly(a, j - 1) + choose_poly(b, j - 1)

    ds_q8 = q8(double_star_i(7), double_star_i(8), double_star_i(9))
    rows: dict[str, dict[str, object]] = {}
    v = sp.symbols("v", integer=True, nonnegative=True)
    # By symmetry assume 1<=a<=b.  For a=1,...,6 and a+b>=14,
    # write b=14-a+v.  A nonnegative ordinary monomial expansion in v
    # certifies the entire ray.
    for fixed_a in range(1, 7):
        ray = sp.Poly(sp.expand(ds_q8.subs(a, fixed_a).subs(b, 14 - fixed_a + v)), v)
        row = coefficient_row(ray)
        assert row["negative_coefficients"] == 0
        rows[f"a={fixed_a}, b={14-fixed_a}+v"] = row

    # If a>=7, write a=7+u and b=a+v.  This single quadrant covers every
    # remaining symmetric case.
    u = sp.symbols("u", integer=True, nonnegative=True)
    quadrant = sp.Poly(sp.expand(ds_q8.subs(a, 7 + u).subs(b, 7 + u + v)), u, v)
    row = coefficient_row(quadrant)
    assert row["negative_coefficients"] == 0
    rows["a=7+u, b=7+u+v"] = row

    # The endpoint a=0 is a star with m=b+1 leaves.  For ranks >=2 its
    # coefficients are binomial(m,j), giving the following positive factor.
    m = sp.symbols("m", integer=True, nonnegative=True)
    star_q8 = sp.factor(
        sp.combsimp(q8(choose_poly(m, 7), choose_poly(m, 8), choose_poly(m, 9)))
    )
    expected_star = (
        m**2
        * (m - 7)
        * (m - 6) ** 2
        * (m - 5) ** 2
        * (m - 4) ** 2
        * (m - 3) ** 2
        * (m - 2) ** 2
        * (m - 1) ** 2
        / 203212800
    )
    assert sp.expand(star_q8 - expected_star) == 0

    output = Path(__file__).with_name("rank8_q8_double_stars_paths_exact_20260816.json")
    payload = {
        "status": "PASS_EXACT_ALL_ORDER_RANK8_Q8_PATHS_DOUBLE_STARS",
        "Q8": "16*i8^2-i7*i8-18*i7*i9",
        "path_theorem": {
            "range": "every path P_n with alpha>=14, equivalently n>=27",
            "factorization": str(path_q8),
        },
        "star_theorem": {
            "range": "every star with alpha=m>=14",
            "factorization": str(star_q8),
        },
        "double_star_theorem": {
            "range": "every double star S_(a,b), a,b>=1, a+b>=14",
            "symmetry_partition": rows,
            "certificate": "ordinary monomial coefficients are all nonnegative on each nonnegative ray/quadrant",
        },
        "warning": "All-order family theorem only; not an all-tree or all-forest Q8 theorem.",
    }
    output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("script_sha256", hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper())
    print("report_sha256", hashlib.sha256(output.read_bytes()).hexdigest().upper())


if __name__ == "__main__":
    main()
