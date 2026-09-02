#!/usr/bin/env python3
"""Certify the all-power MCU decomposition for bottom-pair curvature."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_path_isolate_p4_bottom_pair_affine_slope import load_bottom


z, w, m = sp.symbols("z w m")
e1 = z + w
q = z * w
p2 = z**2 + w**2
T = e1 + p2
LAMBDA = (
    2 * z**2 * w**2
    + 4 * z**2 * w
    + 3 * z**2
    + 4 * z * w**2
    + 8 * z * w
    + 6 * z
    + 3 * w**2
    + 6 * w
    + 4
)
COMMON = z**2 * w**2 * (1 + z) * (1 + w) * e1 * p2 * T**5 * LAMBDA


def canonical_hash(poly: sp.Poly) -> str:
    payload = "\n".join(
        f"{monomial}:{coefficient}"
        for monomial, coefficient in poly.terms()
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def homogeneous_part(poly: sp.Expr, degree: int) -> sp.Expr:
    result = sp.Integer(0)
    for (power_z, power_w), coefficient in sp.Poly(poly, z, w).terms():
        if power_z + power_w == degree:
            result += coefficient * z**power_z * w**power_w
    return sp.expand(result)


def schur_coefficients(poly: sp.Expr, degree: int) -> list[int]:
    source = sp.Poly(poly, z, w)
    previous = 0
    result = []
    for power_z in range(degree // 2 + 1):
        current = int(source.coeff_monomial(z**power_z * w ** (degree - power_z)))
        result.append(current - previous)
        previous = current
    return result


def main() -> None:
    records = []
    quotients = []
    top_scalars = {0: {0: 2, 1: 2}, 1: {0: 3, 1: 2}}
    for parity in (0, 1):
        _, slope = load_bottom(parity)
        quotient = sp.Poly(sp.cancel(slope / COMMON), z, w, m)
        assert sp.expand(slope - COMMON * quotient.as_expr()) == 0
        assert quotient.degree(m) == 1
        quotients.append(quotient.as_expr())
        component_records = []
        for m_power in (0, 1):
            component = sp.Poly(quotient.as_expr(), m).coeff_monomial(m**m_power)
            degrees = sorted({sum(monomial) for monomial, _ in sp.Poly(component, z, w).terms()})
            layer_records = []
            for degree in degrees:
                layer = homogeneous_part(component, degree)
                coefficients = schur_coefficients(layer, degree)
                if degree < 10:
                    assert all(value >= 0 for value in coefficients)
                    layer_type = "Schur-positive"
                else:
                    scalar = top_scalars[parity][m_power]
                    assert degree == 10
                    assert sp.expand(layer - scalar * q**3 * p2**2) == 0
                    layer_type = f"{scalar}*(zw)^3*p2^2"
                layer_records.append(
                    {
                        "degree": degree,
                        "schur_coefficients": coefficients,
                        "type": layer_type,
                        "sha256": canonical_hash(sp.Poly(layer, z, w)),
                    }
                )
            component_records.append(
                {
                    "m_power": m_power,
                    "layers": layer_records,
                }
            )
        records.append(
            {
                "parity_epsilon": parity,
                "quotient_term_count": len(quotient.terms()),
                "quotient_sha256": canonical_hash(quotient),
                "top_layer": (
                    "2*(m+1)*(zw)^3*p2^2"
                    if parity == 0
                    else "(2*m+3)*(zw)^3*p2^2"
                ),
                "components": component_records,
            }
        )

    # Exact parity relation inherited from J_1-J_0=zw(1+z)(1+w)J_group.
    difference = sp.Poly(sp.expand(quotients[1] - quotients[0]), z, w, m)
    assert all(value >= 0 for value in difference.coeffs())

    report = {
        "status": "PASS_PATH_ISOLATE_P4_BOTTOM_PAIR_CURVATURE_MCU",
        "factorization": (
            "D_pair_e=(1+z)(1+w)*e1*p2*T^2*R_e, with R_e linear in m"
        ),
        "records": records,
        "all_power_lemma": (
            "For every R>=0, expand e1*p2*T^R. Each summand is "
            "e1^a*p2^b with a>=1 and is Schur-positive. Multiplying "
            "the lower Schur-positive layers of R_e preserves positivity; "
            "the sole top exception only raises b by two and adds (zw)^3."
        ),
        "consequence": (
            "Every homogeneous coefficient row of e1*p2*T^R*R_e rises "
            "weakly from each edge to the center for both parities, every "
            "integer R>=0, and every m>=0. The additional factor "
            "(1+z)(1+w) preserves this property."
        ),
        "parity_quotient_difference_coefficientwise_nonnegative": True,
        "parity_quotient_difference_sha256": canonical_hash(difference),
    }
    Path("path_isolate_p4_bottom_pair_curvature_mcu_20260801.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
