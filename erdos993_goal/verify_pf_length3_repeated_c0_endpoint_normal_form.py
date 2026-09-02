"""Exact second-order c=0 endpoint normal form for odd parity.

Use q=t^2/1024 and B=sign*c*t*d/16.  After removing the common
t- and c-orders, the first A1 face is a multiple of the resultant.
Subtract that multiple and divide by c.  On the remaining resultant
factor G=0, both orientation remainders have the sign of B.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp

from certify_pf_length3_repeated_branch_core import compactified, strip_common_axis
from certify_pf_length3_repeated_positive_root_orientation import remove_positive_content
from verify_pf_length3_repeated_resultant_reduction import build


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_repeated_c0_endpoint_normal_form_exact_20260807.json"


def positive_coefficients(expr, variables):
    poly = sp.Poly(sp.cancel(expr), *variables)
    return all(coefficient > 0 for coefficient in poly.coeffs())


def verify_sign(sign):
    source = build("odd", return_polynomials=True, include_alternate=False)
    ambient = source["ring"]
    rr, zz, uu, vv, cc = ambient.gens
    resultant = remove_positive_content(source["resultant"])[0]
    m0 = remove_positive_content(source["orientation0"])[0]
    m1 = remove_positive_content(source["orientation1"])[0]

    fr, target_data = compactified(
        resultant, sign, Fraction(0), Fraction(1, 16), "2c", 1024
    )
    fm0, _ = compactified(m0, sign, Fraction(0), Fraction(1, 16), "2c", 1024)
    fm1, _ = compactified(m1, sign, Fraction(0), Fraction(1, 16), "2c", 1024)
    t, d, u, v, C, c, q, h = target_data
    au = c * u - 4 * c - 2 * u - 1
    av = c * v - 4 * c - 2 * v - 1
    fa0 = (c + 1) ** 5 * fm0 + 128 * (2 * c - 1) * au * av * h**3 * fr
    fa1 = (
        (c + 1) ** 7 * fm1
        + 512 * (c - 2) * (2 * c - 1) * au * av * h**4 * fr
    )

    normalized = []
    orders = []
    for poly in (fr, fa0, fa1):
        poly, t_order = strip_common_axis(poly, 0)
        poly, c_order = strip_common_axis(poly, 4)
        normalized.append(poly)
        orders.append((t_order, c_order))
    assert orders == [(2, 2), (3, 2), (3, 2)]
    rpoly, a0poly, a1poly = normalized
    rface = rpoly.evaluate(4, 0)
    a0face = a0poly.evaluate(4, 0)
    a1face = a1poly.evaluate(4, 0)

    # The first A1 endpoint face is tangent to the resultant.  Remove it
    # exactly and take the next c coefficient.
    quotient, remainder = divmod(a1face, rface)
    assert not remainder
    lifted = a1poly.ring.from_dict(
        {monomial + (0,): coefficient for monomial, coefficient in quotient.terms()}
    )
    a1next = a1poly - lifted * rpoly
    a1next, next_c_order = strip_common_axis(a1next, 4)
    assert next_c_order == 1
    a1next_face = a1next.evaluate(4, 0)

    face_ring = rface.ring
    tt, dd, uu0, vv0 = face_ring.gens
    g = (
        17 * dd**2 * tt**4
        + 8448 * dd**2 * tt**2
        + 1048576 * dd**2
        + sign * (816 * dd * tt**3 + 196608 * dd * tt)
        + 9216 * tt**2
        - 786432
    )
    brackets = (
        dd * (17 * tt**2 + 4096) + sign * 480 * tt,
        dd * (13 * tt**4 + 12288 * tt**2 + 2097152)
        + sign * (384 * tt**3 + 294912 * tt),
    )
    branch_remainders = []
    for poly, bracket in zip((a0face, a1next_face), brackets):
        _, branch_remainder = divmod(poly, g)
        ratio = sp.cancel(branch_remainder.as_expr() / bracket.as_expr())
        assert sp.denom(ratio).is_number
        assert positive_coefficients(sign * ratio, (tt.as_expr(), uu0.as_expr(), vv0.as_expr()))
        branch_remainders.append(branch_remainder)

    threshold_checks = []
    if sign < 0:
        gexpr = g.as_expr()
        texpr, dexpr = tt.as_expr(), dd.as_expr()
        threshold_data = (
            (17 * texpr**2 + 4096, 480 * texpr),
            (
                13 * texpr**4 + 12288 * texpr**2 + 2097152,
                384 * texpr**3 + 294912 * texpr,
            ),
        )
        expected = (
            -1536
            * (texpr**2 + 2048)
            * (3 * texpr**2 + 1024)
            * (17 * texpr**2 + 4096),
            -3072
            * (texpr**2 + 256)
            * (texpr**2 + 1024)
            * (texpr**2 + 2048) ** 2
            * (3 * texpr**2 + 1024),
        )
        for (slope, intercept), expected_value in zip(threshold_data, expected):
            value = sp.factor(slope**2 * gexpr.subs(dexpr, intercept / slope))
            assert sp.factor(value - expected_value) == 0
            threshold_checks.append(str(value))

    payload = ";".join(
        str(value)
        for value in (g, brackets, branch_remainders, threshold_checks, orders)
    )
    return {
        "B_sign": "positive" if sign > 0 else "negative",
        "common_orders_t_c": orders,
        "resultant_branch_factor": str(g),
        "orientation_linear_factors": [str(value) for value in brackets],
        "branch_remainder_term_counts": [len(value.terms()) for value in branch_remainders],
        "negative_branch_threshold_checks": threshold_checks,
        "sha256": hashlib.sha256(payload.encode("utf-8")).hexdigest(),
    }


def main():
    records = [verify_sign(sign) for sign in (1, -1)]
    report = {
        "status": "PASS_EXACT_PF_LENGTH3_REPEATED_C0_ENDPOINT_NORMAL_FORM_ODD",
        "parity": "odd",
        "coordinates": "q=t^2/1024, B=sign*c*t*d/16",
        "records": records,
        "sign_conclusion": (
            "At the c=0 projective endpoint, after one additional resultant "
            "subtraction for A1, both orientation remainders have the sign of B."
        ),
        "remaining_obligation": (
            "Turn the strict endpoint signs into a finite exact collar and "
            "derive the even-parity endpoint normal form."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(OUTPUT)


if __name__ == "__main__":
    main()
