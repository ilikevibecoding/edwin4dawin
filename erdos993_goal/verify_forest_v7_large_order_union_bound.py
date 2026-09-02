"""Exact replay for the universal n>=298 rank-seven residual theorem."""

from sympy import binomial, expand, expand_func, factor, symbols


def main() -> None:
    n, r = symbols("n r", integer=True, nonnegative=True)

    lower = {
        k: factor(expand_func(binomial(n, k))
                  - (n - 1) * expand_func(binomial(n - 2, k - 2)))
        for k in (5, 6, 7)
    }
    expected_lower = {
        5: (n - 20) * (n - 4) * (n - 3) * (n - 2) * (n - 1) / 120,
        6: (n - 30) * (n - 5) * (n - 4) * (n - 3) * (n - 2) * (n - 1) / 720,
        7: (n - 42) * (n - 6) * (n - 5) * (n - 4) * (n - 3) * (n - 2) * (n - 1) / 5040,
    }
    for k in (5, 6, 7):
        assert expand(lower[k] - expected_lower[k]) == 0

    upper6 = expand_func(binomial(n, 6))
    margin = factor(9 * lower[5] * lower[6]
                    + 105 * lower[5] * lower[7]
                    - 72 * upper6**2)
    cubic = n**3 - 317 * n**2 + 5910 * n - 23400
    expected_margin = (
        (n - 5) * (n - 4)**2 * (n - 3)**2 * (n - 2)**2 * (n - 1)**2
        * cubic / 28800
    )
    assert expand(margin - expected_margin) == 0

    shifted = expand(cubic.subs(n, r + 298))
    assert shifted == r**3 + 577 * r**2 + 83390 * r + 50504
    assert all(coefficient > 0 for coefficient in shifted.as_poly(r).all_coeffs())

    print("PASS_EXACT_FOREST_V7_LARGE_ORDER_UNION_BOUND_N_GE_298")
    print("shifted_cubic =", shifted)


if __name__ == "__main__":
    main()
