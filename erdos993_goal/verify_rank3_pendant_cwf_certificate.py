#!/usr/bin/env python3
"""Exact symbolic certificate for rank-3 pendant-hub CWF closure.

The notation continues ``verify_rank2_pendant_cwf_certificate.py``.
The old root-deleted forest B has Q components, N=Q+z vertices, and z
edges.  Besides W and c, put

    T  = number of connected three-edge subsets of B,
    WH = number of adjacent edge pairs after deleting the Q roots.

The needed fourth coefficients are

    b4 = C(N,4)-z C(N-2,2)+W(N-4)+C(z,2)-T,
    d4 = C(z,3)-(z-c)(z-2)+WH.

For P=(1+x)^R(B+D), S=xB, and factorial coefficients p_k,s_k,
this script proves

    (R-1)(p_3^2-p_4 p_2)
      +(R+1)(2p_3 s_3-p_4 s_2-s_4 p_2) >= 0

for every R,Q>=2.

The forest inequalities used are

    0 <= c <= z,
    0 <= W <= C(z,2),
    WH <= W,
    T >= max(0, (2W^2/z-W)/3)  (z>0).

The last inequality follows by taking the line graph L(B).  It has z
vertices and W edges.  Cauchy--Schwarz gives at least
2W^2/z-W length-two paths in L, while any connected three-vertex set
contains at most three such paths.

The final positivity check is finite and exact.  Shift R=r+2, Q=q+2 and
extract the 27 coefficients in r,q.  For each coefficient:

* replace WH by its upper bound W;
* use T>=0 when 2W<=z, and the line-graph bound when 2W>=z;
* discard positive c-monomials and replace c^j by z^j in negative
  c-monomials;
* parameterize each allowed W interval by t in [0,1];
* verify that all three degree-2 Bernstein coefficients in t are
  polynomials with nonnegative coefficients after shifting z by the
  appropriate endpoint.

Thus the script is an independently replayable exact certificate rather
than a numerical sample or floating-point optimization.
"""

from __future__ import annotations

import sympy as sp


def convolution(
    left: list[sp.Expr], right: list[sp.Expr]
) -> list[sp.Expr]:
    result = [sp.Integer(0)] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            result[i + j] += a * b
    return list(map(sp.expand, result))


def factorial_transform(poly: list[sp.Expr]) -> list[sp.Expr]:
    return [
        sp.factorial(index) * value
        for index, value in enumerate(poly)
    ]


def nonnegative_after_shift(
    expression: sp.Expr,
    variable: sp.Symbol,
    shifted_variable: sp.Symbol,
    offset: int,
) -> bool:
    """Coefficientwise proof on variable>=offset."""

    shifted = sp.Poly(
        sp.cancel(
            sp.expand(
                expression.subs(variable, shifted_variable + offset)
            )
        ),
        shifted_variable,
    )
    return all(value >= 0 for value in shifted.coeffs())


def relax_root_edge_count(
    expression: sp.Expr,
    c: sp.Symbol,
    z: sp.Symbol,
    W: sp.Symbol,
) -> sp.Expr:
    """Lower-bound an expression using 0<=c<=z.

    Positive monomials involving c may be discarded.  In a negative
    monomial, c^j<=z^j reverses in the useful direction after multiplying
    by its negative coefficient.
    """

    polynomial = sp.Poly(sp.expand(expression), c, z, W)
    lower = sp.Integer(0)
    for (c_power, z_power, w_power), value in polynomial.terms():
        if c_power == 0:
            lower += value * z**z_power * W**w_power
        elif value < 0:
            lower += value * z ** (z_power + c_power) * W**w_power
    return sp.expand(lower)


def bernstein_quadratic_certificate(
    expression: sp.Expr,
    W: sp.Symbol,
    W_substitution: sp.Expr,
    z: sp.Symbol,
    t: sp.Symbol,
    u: sp.Symbol,
    z_offset: int,
) -> list[sp.Expr]:
    """Return and verify the three degree-2 Bernstein coefficients."""

    in_t = sp.Poly(
        sp.cancel(sp.expand(expression.subs(W, W_substitution))),
        t,
    )
    assert in_t.degree() <= 2
    a = in_t.coeff_monomial(t**2)
    b = in_t.coeff_monomial(t)
    c0 = in_t.coeff_monomial(1)
    # a*t^2+b*t+c0 =
    # c0*(1-t)^2 + 2*(c0+b/2)*t*(1-t)
    # + (c0+b+a)*t^2.
    bernstein = [c0, c0 + b / 2, c0 + b + a]
    assert all(
        nonnegative_after_shift(item, z, u, z_offset)
        for item in bernstein
    )
    return bernstein


def main() -> int:
    R, Q, z, W, c, T, WH = sp.symbols(
        "R Q z W c T WH", nonnegative=True
    )
    r, q, t, u = sp.symbols("r q t u", nonnegative=True)
    N = Q + z

    B = [
        sp.Integer(1),
        N,
        N * (N - 1) / 2 - z,
        N * (N - 1) * (N - 2) / 6 - z * (N - 2) + W,
        N * (N - 1) * (N - 2) * (N - 3) / 24
        - z * (N - 2) * (N - 3) / 2
        + W * (N - 4)
        + z * (z - 1) / 2
        - T,
    ]
    D = [
        sp.Integer(0),
        sp.Integer(1),
        z,
        z * (z - 1) / 2 - z + c,
        z * (z - 1) * (z - 2) / 6
        - (z - c) * (z - 2)
        + WH,
    ]
    A = [sp.expand(B[i] + D[i]) for i in range(5)]
    kernel = [
        sp.Integer(1),
        R,
        R * (R - 1) / 2,
        R * (R - 1) * (R - 2) / 6,
        R * (R - 1) * (R - 2) * (R - 3) / 24,
    ]
    p = factorial_transform(convolution(kernel, A))
    s = factorial_transform([sp.Integer(0), *B])

    target = sp.expand(
        (R - 1) * (p[3] ** 2 - p[4] * p[2])
        + (R + 1)
        * (
            2 * p[3] * s[3]
            - p[4] * s[2]
            - s[4] * p[2]
        )
    )

    shifted_target = sp.Poly(
        sp.expand(target.subs({R: r + 2, Q: q + 2})),
        r,
        q,
    )
    assert len(shifted_target.terms()) == 27

    # The edgeless case z=0 has W=c=T=WH=0 and is immediate.
    edgeless = sp.Poly(
        sp.expand(
            target.subs(
                {
                    R: r + 2,
                    Q: q + 2,
                    z: 0,
                    W: 0,
                    c: 0,
                    T: 0,
                    WH: 0,
                }
            )
        ),
        r,
        q,
    )
    assert all(value > 0 for value in edgeless.coeffs())

    low_bernstein_count = 0
    high_bernstein_count = 0
    for _parameter_monomial, coefficient in shifted_target.terms():
        t_coefficient = sp.expand(sp.diff(coefficient, T))
        wh_coefficient = sp.expand(sp.diff(coefficient, WH))
        assert sp.diff(coefficient, T, 2) == 0
        assert sp.diff(coefficient, WH, 2) == 0
        assert sp.expand(t_coefficient + wh_coefficient) == 0
        assert nonnegative_after_shift(t_coefficient, z, u, 1)

        # Low-W regime: 0<=W<=z/2 and T>=0.
        low = coefficient.subs({T: 0, WH: W})
        low = relax_root_edge_count(low, c, z, W)
        low_certificate = bernstein_quadratic_certificate(
            low,
            W,
            z * t / 2,
            z,
            t,
            u,
            1,
        )
        low_bernstein_count += len(low_certificate)

        # High-W regime:
        # z/2<=W<=C(z,2), z>=2, and
        # T>=(2W^2/z-W)/3.  Multiply by positive z.
        t_lower = (2 * W**2 / z - W) / 3
        high = sp.cancel(
            z * coefficient.subs({T: t_lower, WH: W})
        )
        high = relax_root_edge_count(high, c, z, W)
        high_certificate = bernstein_quadratic_certificate(
            high,
            W,
            z / 2 + z * (z - 2) * t / 2,
            z,
            t,
            u,
            2,
        )
        high_bernstein_count += len(high_certificate)

    print(f"shifted R,Q coefficients checked: {len(shifted_target.terms())}")
    print(f"low-W Bernstein coefficients checked: {low_bernstein_count}")
    print(f"high-W Bernstein coefficients checked: {high_bernstein_count}")
    print(
        "PASS: rank-3 pendant-hub CWF reserve is nonnegative "
        "for every R,Q>=2."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
