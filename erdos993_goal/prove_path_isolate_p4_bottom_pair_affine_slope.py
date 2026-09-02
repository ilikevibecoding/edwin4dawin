#!/usr/bin/env python3
"""Certify the positive support-distance slope of the P4 bottom pair."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


z, w, m, x = sp.symbols("z w m x")
T = z * (1 + z) + w * (1 + w)
A = (1 + z) * (1 + w)


def canonical_hash(poly: sp.Poly) -> str:
    payload = "\n".join(
        f"{monomial}:{coefficient}"
        for monomial, coefficient in poly.terms()
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def load_bottom(parity: int) -> tuple[sp.Expr, sp.Expr]:
    source = json.loads(
        Path(
            "path_isolate_p4_bottom_pair_lift_integrand_"
            f"parity{parity}_terms_20260801.json"
        ).read_text(encoding="utf-8")
    )
    constant = sp.Integer(0)
    slope = sp.Integer(0)
    for item in source["terms"]:
        pz, pw, pm, ps, px = item["monomial_z_w_m_s_x"]
        if ps not in (0, 1):
            raise AssertionError((parity, ps))
        term = (
            sp.Integer(item["coefficient"])
            * z**pz
            * w**pw
            * m**pm
            * x**px
        )
        if ps:
            slope += term
        else:
            constant += term
    return sp.expand(constant), sp.expand(slope)


def load_group_slope() -> sp.Expr:
    source = json.loads(
        Path(
            "path_isolate_p4_group_integrand_stable_"
            "parity0_terms_20260730.json"
        ).read_text(encoding="utf-8")
    )
    result = sp.Integer(0)
    for item in source["terms"]:
        pz, pw, pc, pm, ps, px = item[
            "monomial_z_w_c_m_s_x"
        ]
        if ps:
            result += (
                sp.Integer(item["coefficient"])
                * z**pz
                * w**pw
                * sp.Symbol("c") ** pc
                * m**pm
                * x**px
            )
    result = sp.expand(result)
    assert not result.has(sp.Symbol("c"), m, x)
    return result


def main() -> None:
    parts = [load_bottom(parity) for parity in (0, 1)]
    group_slope = load_group_slope()
    common_positive = (
        z**2
        * w**2
        * (1 + z)
        * (1 + w)
        * (z + w)
        * (z**2 + w**2)
        * T**5
        * (
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
    )

    records = []
    for parity, (constant, slope) in enumerate(parts):
        slope_poly = sp.Poly(slope, z, w, m)
        assert not slope.has(x)
        assert all(value > 0 for value in slope_poly.coeffs())

        positive_quotient = sp.Poly(
            sp.cancel(slope / common_positive), z, w, m
        )
        assert sp.expand(
            slope - common_positive * positive_quotient.as_expr()
        ) == 0
        assert all(
            value > 0 for value in positive_quotient.coeffs()
        )

        # With n=s+1, the signed constant is A-J.
        n_constant = sp.Poly(
            sp.cancel(
                (constant - slope) / (z**2 * w**2 * T**3)
            ),
            z,
            w,
            m,
            x,
        )
        assert sp.expand(
            constant
            - slope
            - z**2 * w**2 * T**3 * n_constant.as_expr()
        ) == 0
        records.append(
            {
                "parity_epsilon": parity,
                "slope_term_count": len(slope_poly.terms()),
                "slope_degrees_z_w_m": list(
                    map(int, slope_poly.degree_list())
                ),
                "slope_smallest_coefficient": int(
                    min(slope_poly.coeffs())
                ),
                "slope_sha256": canonical_hash(slope_poly),
                "positive_quotient_term_count": len(
                    positive_quotient.terms()
                ),
                "positive_quotient_degrees_z_w_m": list(
                    map(int, positive_quotient.degree_list())
                ),
                "positive_quotient_smallest_coefficient": int(
                    min(positive_quotient.coeffs())
                ),
                "n_constant_term_count": len(n_constant.terms()),
                "n_constant_degrees_z_w_m_x": list(
                    map(int, n_constant.degree_list())
                ),
                "n_constant_sha256": canonical_hash(n_constant),
            }
        )

    parity_difference = sp.expand(parts[1][1] - parts[0][1])
    assert sp.expand(
        parity_difference - z * w * A * group_slope
    ) == 0
    difference_poly = sp.Poly(parity_difference, z, w)
    assert all(value > 0 for value in difference_poly.coeffs())

    report = {
        "status": "PASS_PATH_ISOLATE_P4_BOTTOM_PAIR_AFFINE_SLOPE",
        "identity": (
            "P_e=z^2*w^2*T^3*K_e+(s+1)J_e"
        ),
        "slope_parameter_dependence": (
            "J_e depends linearly on m and is independent of s,x"
        ),
        "common_positive_slope_factor": str(common_positive),
        "parity_difference_identity": (
            "J_1-J_0=z*w*(1+z)*(1+w)*J_group"
        ),
        "parity_difference_term_count": len(
            difference_poly.terms()
        ),
        "parity_difference_sha256": canonical_hash(
            difference_poly
        ),
        "records": records,
    }
    Path(
        "path_isolate_p4_bottom_pair_affine_slope_20260801.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
