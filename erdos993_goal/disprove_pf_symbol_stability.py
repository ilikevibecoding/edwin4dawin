"""Exact counterexample to the overstrong PF stability-symbol lift.

The desired PF theorem only evaluates the shift family against coefficient
polynomials with negative zeros.  A tempting stronger route would require the
full bivariate algebraic symbol

    Phi_m(t,w) = sum_j binom(m,j) G_j(t) w**(m-j)

to be real stable.  This script gives a positive-direction affine line of the
symbol with one nonreal conjugate pair, already for m=2.  It does not affect
the proved length-three PF compatibility theorem.
"""

import hashlib

import sympy as sp

from prove_quartic_minimal_compatibility_resultants import X, window_polynomial


def main():
    w, z = sp.symbols("w z")
    m, p, alpha = 2, 17, 0
    u = v = sp.Rational(1, 10)
    gamma = [sp.Integer(1), -(u + v), u * v]
    rows = []
    for index in range(m + 1):
        base = window_polynomial(p - 2 * index, alpha + index, gamma)
        rows.append(sp.expand(X**index * base.as_expr()))
    symbol = sp.expand(
        sum(
            sp.binomial(m, index) * rows[index] * w ** (m - index)
            for index in range(m + 1)
        )
    )
    line = sp.Poly(
        sp.expand(
            symbol.subs(
                {
                    X: -sp.Rational(7, 6) + 5 * z,
                    w: sp.Rational(11, 6) + z,
                }
            )
        ),
        z,
        domain=sp.QQ,
    )
    _, integer = line.clear_denoms(convert=True)
    _, primitive = integer.primitive()
    if primitive.LC() < 0:
        primitive = -primitive
    intervals = primitive.intervals(eps=sp.Rational(1, 10) ** 30)
    real_roots = sum(multiplicity for _, multiplicity in intervals)
    assert primitive.degree() == 10
    assert sp.gcd(primitive, primitive.diff()).degree() == 0
    assert real_roots == 8
    coefficients = list(map(str, primitive.all_coeffs()))
    digest = hashlib.sha256(",".join(coefficients).encode("ascii")).hexdigest()
    assert digest == "9aaa145b1b4e9cbc88ae08a1f598cf124556bc7fe982663cf462dc7d33e5db58"
    print("EXACT_PF_FULL_STABILITY_SYMBOL_OBSTRUCTION")
    print(f"degree={primitive.degree()} real_roots={real_roots} nonreal_roots=2")
    print(f"primitive_sha256={digest}")


if __name__ == "__main__":
    main()
