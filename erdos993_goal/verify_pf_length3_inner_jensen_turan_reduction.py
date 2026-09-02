"""Exact Jensen/Turan reduction for the PF length-three inner problem.

The four quadratic-input values h_0,...,h_3 admit a positive two-factor
PF collision exactly when the quadratic

    W(c)=D0*c^2-E*c+D2

has a positive root c whose induced second root is positive.  After the
first positive factor, f_j=c*h_j+h_(j+1), the same W is simply the cubic-row
Turan determinant f_1^2-f_0*f_2.  Thus the inner problem is a sign-relevant
Turan-zero localization theorem for the already compatible cubic family.

The complementary invariant is the cubic Jensen polynomial

    J(t)=h0+3*h1*t+3*h2*t^2+h3*t^3.

Its discriminant is 27*(4*D0*D2-E^2).  The script proves all reductions
symbolically and records the strictly positive all-order leading invariant
at z=0.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_inner_jensen_turan_reduction_exact_20260807.json"


def digest(expressions) -> str:
    payload = ";".join(str(sp.factor(value)) for value in expressions)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def generic_identities() -> dict[str, object]:
    h0, h1, h2, h3, c, d, t = sp.symbols(
        "h0 h1 h2 h3 c d t", nonzero=True
    )
    h = (h0, h1, h2, h3)
    d0 = h1**2 - h0 * h2
    d2 = h2**2 - h1 * h3
    e = h0 * h3 - h1 * h2
    k = sp.expand(4 * d0 * d2 - e**2)
    w = sp.expand(d0 * c**2 - e * c + d2)
    f = [sp.expand(c * h[j] + h[j + 1]) for j in range(3)]
    assert sp.expand(w - (f[1] ** 2 - f[0] * f[2])) == 0

    jensen = h0 + 3 * h1 * t + 3 * h2 * t**2 + h3 * t**3
    jensen_discriminant = sp.factor(sp.discriminant(jensen, t))
    assert sp.expand(jensen_discriminant - 27 * k) == 0

    reversed_jensen = h3 + 3 * h2 * c + 3 * h1 * c**2 + h0 * c**3
    repeated_q0 = c**2 * h0 + 2 * c * h1 + h2
    repeated_q1 = c**2 * h1 + 2 * c * h2 + h3
    assert sp.expand(sp.diff(reversed_jensen, c) - 3 * repeated_q0) == 0
    assert sp.expand(reversed_jensen - c * repeated_q0 - repeated_q1) == 0

    induced_d = sp.cancel(-f[1] / f[0])
    q0 = sp.expand(c * d * h0 + (c + d) * h1 + h2)
    q1 = sp.expand(c * d * h1 + (c + d) * h2 + h3)
    assert sp.cancel(q0.subs(d, induced_d)) == 0
    assert sp.factor(
        sp.cancel(q1.subs(d, induced_d) * f[0] + w)
    ) == 0

    # On W(c)=0, the induced d is the other root.  These two residuals are
    # explicit multiples of W and avoid any appeal to a numerical root.
    root_sum_residual = sp.factor(
        sp.together((c + induced_d) * d0 - e) * f[0]
    )
    root_product_residual = sp.factor(
        sp.together(c * induced_d * d0 - d2) * f[0]
    )
    assert sp.factor(root_sum_residual - h0 * w) == 0
    assert sp.factor(root_product_residual + h1 * w) == 0

    repeated_root = sp.cancel(e / (2 * d0))
    repeated_value = sp.factor(w.subs(c, repeated_root))
    assert sp.factor(repeated_value - k / (4 * d0)) == 0

    # The Hankel-minor vector is the exact null vector of both collision rows.
    null0 = sp.expand(d2 * h0 + e * h1 + d0 * h2)
    null1 = sp.expand(d2 * h1 + e * h2 + d0 * h3)
    assert null0 == null1 == 0

    expressions = [
        d0,
        d2,
        e,
        k,
        w,
        jensen_discriminant,
        reversed_jensen,
        induced_d,
    ]
    return {
        "D0": str(d0),
        "D2": str(d2),
        "E": str(e),
        "K": str(k),
        "W": str(w),
        "jensen_discriminant": str(jensen_discriminant),
        "first_factor_turan_identity": "W(c)=f1^2-f0*f2",
        "induced_second_factor": str(induced_d),
        "root_sum_residual": "f0*(D0*(c+d)-E)=h0*W(c)",
        "root_product_residual": "f0*(D0*c*d-D2)=-h1*W(c)",
        "repeated_boundary": (
            "K=0 gives c=d=E/(2D0); equivalently the reversed Jensen "
            "cubic has a repeated positive root"
        ),
        "nullvector_identities": [
            "D2*h0+E*h1+D0*h2=0",
            "D2*h1+E*h2+D0*h3=0",
        ],
        "digest": digest(expressions),
    }


def zero_endpoint_invariant() -> dict[str, object]:
    p, alpha, scale = sp.symbols("p alpha L", positive=True)
    l0 = scale
    l1 = sp.cancel(l0 * (p + alpha) / (alpha + 1))
    l2 = sp.cancel(l1 * (p + alpha - 1) / (alpha + 2))
    l3 = sp.cancel(l2 * (p + alpha - 2) / (alpha + 3))
    d0 = sp.factor(l1**2 - l0 * l2)
    d2 = sp.factor(l2**2 - l1 * l3)
    e = sp.factor(l1 * l2 - l0 * l3)
    k = sp.factor(4 * d0 * d2 - e**2)
    expected = sp.factor(
        4
        * scale**4
        * (alpha + p) ** 2
        * (alpha + p - 1)
        * (2 * alpha + p + 1) ** 2
        * (2 * alpha + p + 2)
        / ((alpha + 1) ** 4 * (alpha + 2) ** 3 * (alpha + 3) ** 2)
    )
    assert sp.factor(k - expected) == 0
    return {
        "source_constant_terms": (
            "L_j=binomial(p+2*alpha,alpha+j), with "
            "h_j=(-z)^j*L_j+O(z^(j+1))"
        ),
        "D0_over_z2_limit": str(d0),
        "D2_over_z4_limit": str(d2),
        "E_over_z3_limit": str(e),
        "K_over_z6_limit": str(k),
        "strictly_positive_for_admissible_p_alpha": True,
        "interpretation": (
            "The quadratic filter changes only higher z-orders, so every "
            "inner homotopy starts strictly inside the Jensen-hyperbolic "
            "side K>0 with D0,D2,E>0."
        ),
    }


def main() -> None:
    generic = generic_identities()
    endpoint = zero_endpoint_invariant()
    report = {
        "status": "PASS_EXACT_PF_LENGTH3_INNER_JENSEN_TURAN_REDUCTION",
        "generic_identities": generic,
        "zero_endpoint": endpoint,
        "theorem": (
            "A positive-PF collision is equivalently a sign-relevant zero "
            "of the cubic-family Turan determinant after one positive "
            "factor.  The forbidden discriminant side is exactly failure "
            "of hyperbolicity of the cubic Jensen polynomial."
        ),
        "remaining_obligation": (
            "For 0<z<r+5 on the actual source trajectory, prove that no "
            "Turan zero f1^2-f0*f2=0 has -f1/f0>0; equivalently prove "
            "K>0 whenever D0,D2,E>0."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
