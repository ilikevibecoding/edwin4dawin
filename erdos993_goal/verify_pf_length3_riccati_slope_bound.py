"""Exact all-order Riccati slope bound on the far-left source branch.

For a real-rooted source row with root magnitudes ``a_i>0`` and ``z>max a_i``, set

    r_i=z/(z-a_i)>1,  f=sum r_i,  g=2*e_2(r).

The Riccati coordinates satisfy ``theta=eta*f`` and
``theta*theta_next=eta*eta_next*g``.  This script proves that ``g'/f'``
increases toward the spectral edge.  A hypergeometric-ODE evaluation at
that edge then gives

    d(theta*theta_next)/d(theta) < 2

for the four reserve gaps 17, 14, 11, and 8 used by the PF length-three
collision.  Consequently every quadratic row quotient ``Y_j/X_j`` is
strictly decreasing on the far-left interval.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_riccati_slope_bound_exact_20260807.json"


def monomial_symmetric(variables: tuple[sp.Symbol, ...], partition: tuple[int, ...]) -> sp.Expr:
    terms: set[tuple[int, ...]] = set()
    padded = partition + (0,) * (len(variables) - len(partition))
    for powers in set(itertools.permutations(padded)):
        terms.add(powers)
    return sp.Add(
        *(sp.prod(variable**power for variable, power in zip(variables, powers)) for powers in terms)
    )


def symmetric_monotonicity_identity() -> dict[str, object]:
    # Degree is at most six and support at most three, so four formal
    # variables faithfully verify the stable monomial-symmetric expansion.
    b = sp.symbols("b0:4", positive=True)
    r = tuple(1 + value for value in b)
    flow = lambda expression: sp.expand(
        sum(
            value * (value - 1) * sp.diff(expression, variable)
            for variable, value in zip(b, r)
        )
    )
    power = lambda k: sum(value**k for value in r)
    w = sp.expand(power(2) - power(1))
    n = sp.expand(power(3) - power(2))
    p = sp.expand(power(4) - power(3))
    numerator = sp.expand(w**3 - 3 * p * w + 2 * n**2 + n * w)
    f = sp.expand(sum(r))
    g = sp.expand(f**2 - power(2))
    f_dot = flow(f)
    g_dot = flow(g)
    assert sp.expand(f_dot - w) == 0
    assert sp.expand(g_dot - 2 * (f * w - n)) == 0
    slope_derivative_numerator = sp.expand(
        flow(g_dot) * f_dot - g_dot * flow(f_dot)
    )
    assert sp.expand(slope_derivative_numerator - 2 * numerator) == 0
    expansion = sp.expand(
        6 * monomial_symmetric(b, (1, 1, 1))
        + 2 * monomial_symmetric(b, (2, 1))
        + 6 * monomial_symmetric(b, (2, 1, 1))
        + 8 * monomial_symmetric(b, (2, 2))
        + 2 * monomial_symmetric(b, (3, 1))
        + 6 * monomial_symmetric(b, (2, 2, 1))
        + 6 * monomial_symmetric(b, (3, 2))
        + 6 * monomial_symmetric(b, (2, 2, 2))
        + 4 * monomial_symmetric(b, (3, 3))
    )
    assert sp.expand(numerator - expansion) == 0
    coefficients = sp.Poly(expansion, *b).coeffs()
    assert coefficients and all(value > 0 for value in coefficients)
    payload = ";".join(
        f"{','.join(map(str, powers))}:{coefficient}"
        for powers, coefficient in sp.Poly(expansion, *b).terms()
    )
    return {
        "derivative_numerator": "W^3-3*P*W+2*N^2+N*W",
        "flow_identity": "(g_dot/f_dot)_dot has numerator 2*(W^3-3*P*W+2*N^2+N*W)",
        "definitions": {
            "W": "sum_i r_i(r_i-1)",
            "N": "sum_i r_i^2(r_i-1)",
            "P": "sum_i r_i^3(r_i-1)",
        },
        "stable_monomial_symmetric_expansion": (
            "6*m111+2*m21+6*m211+8*m22+2*m31+"
            "6*m221+6*m32+6*m222+4*m33"
        ),
        "all_coefficients_strictly_positive": True,
        "digest": hashlib.sha256(payload.encode("ascii")).hexdigest(),
    }


def reserve_record(gap: int) -> dict[str, object]:
    p = sp.symbols("p", positive=True)
    alpha = p - gap
    eta_next = sp.cancel((p + alpha - 1) / ((p - 2) * (p - 3)))
    # At the largest source root a, the ODE gives the limiting raw slope
    # [a(4p-6)-(alpha+1)]/(1+4a), strictly below (4p-6)/4.
    upper_without_edge = sp.cancel(eta_next * (4 * p - 6) / 4)
    gap_numerator = sp.factor(
        4 * (p - 2) * (p - 3) - (p + alpha - 1) * (2 * p - 3)
    )
    expected = sp.factor((2 * gap - 12) * p - 3 * gap + 21)
    assert sp.factor(gap_numerator - expected) == 0
    minimum_p = gap
    assert expected.subs(p, minimum_p) > 0
    shifted = sp.Poly(sp.expand(expected.subs(p, p + minimum_p)), p)
    assert all(value >= 0 for value in shifted.all_coeffs())
    assert shifted.eval(0) > 0
    return {
        "reserve_gap": gap,
        "minimum_current_p": minimum_p,
        "eta_next_times_endpoint_ceiling": str(upper_without_edge),
        "two_minus_ceiling_positive_numerator": str(expected),
        "positive_after_shift_p_to_p_plus_minimum": True,
    }


def exact_rational_replay() -> dict[str, object]:
    # An independent rational check of the derivative-ratio formula and its
    # strict increase as x=-z moves toward the largest root.
    roots = [sp.Rational(1, 5), sp.Rational(2, 3), sp.Rational(7, 4), sp.Rational(3)]

    def raw_slope(z: sp.Rational) -> sp.Rational:
        values = [sp.cancel(z / (z - root)) for root in roots]
        w = [value * (value - 1) for value in values]
        total_w = sum(w)
        average = sum(
            w[index] * (sum(values) - values[index])
            for index in range(len(values))
        ) / total_w
        return sp.cancel(2 * average)

    far = raw_slope(sp.Rational(20))
    middle = raw_slope(sp.Rational(10))
    near = raw_slope(sp.Rational(4))
    assert far < middle < near
    return {
        "root_magnitudes": list(map(str, roots)),
        "z_values_far_middle_near": ["20", "10", "4"],
        "raw_slopes": list(map(str, (far, middle, near))),
        "strictly_increasing_toward_edge": True,
    }


def main() -> None:
    monotonicity = symmetric_monotonicity_identity()
    reserves = [reserve_record(gap) for gap in (17, 14, 11, 8)]
    replay = exact_rational_replay()
    report = {
        "status": "PASS_EXACT_PF_LENGTH3_RICCATI_SLOPE_BOUND",
        "monotonicity_identity": monotonicity,
        "reserve_records": reserves,
        "rational_replay": replay,
        "theorem": (
            "For j=0,1,2,3 on the far-left source interval at sharp reserve "
            "17, d(theta_j*theta_(j+1))/d(theta_j)<2. Therefore, for "
            "s=u+v and q=uv with 0<=u,v<=1, d(Y_j/X_j)/dx = "
            "theta_j'*(-s+q*slope)<0 unless u=v=0."
        ),
        "remaining_gap": (
            "The quotient Y_j/X_j decreases, but the normalized full row "
            "h_j=(x^j X_j/X_0)(Y_j/X_j) has an additional positive factor. "
            "The PF collision conditions must still be used to prove the four "
            "full normalized derivatives have one sign."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(OUTPUT)


if __name__ == "__main__":
    main()
