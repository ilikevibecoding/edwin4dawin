#!/usr/bin/env python3
"""Certify the exact curvature/reserve identities in the stable P4 lifts.

For both the positive-intersection group lift and the repaired bottom-pair
lift, the bounded signed kernel is quadratic in the isolate coordinate x.
This script proves that its x^2 coefficient is exactly -(z-w)^2 times a
coefficientwise-positive polynomial D, while the positive support-distance
slope is exactly T^3*Lambda times the same D (with the normalization used
by the corresponding lift).  All checks are exact over ZZ.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


z, w, c, m, s, x = sp.symbols("z w c m s x")
T = z * (1 + z) + w * (1 + w)
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
CORE = (
    w**5 * z
    + w**5
    + 3 * w**4 * z
    + 3 * w**4
    + 2 * w**3 * z**3
    + 4 * w**3 * z**2
    + 5 * w**3 * z
    + 3 * w**3
    + 4 * w**2 * z**3
    + 8 * w**2 * z**2
    + 5 * w**2 * z
    + w**2
    + w * z**5
    + 3 * w * z**4
    + 5 * w * z**3
    + 5 * w * z**2
    + w * z
    + z**5
    + 3 * z**4
    + 3 * z**3
    + z**2
)
BASE = (1 + z) * (1 + w) * (z + w) * (z**2 + w**2) * T**2


def canonical_hash(poly: sp.Poly) -> str:
    payload = "\n".join(
        f"{monomial}:{coefficient}"
        for monomial, coefficient in poly.terms()
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def split_sparse(path: Path, keys: str) -> tuple[sp.Expr, sp.Expr]:
    data = json.loads(path.read_text(encoding="utf-8"))
    variables = {"z": z, "w": w, "c": c, "m": m, "s": s, "x": x}
    constant = sp.Integer(0)
    slope = sp.Integer(0)
    monomial_key = "monomial_" + "_".join(keys)
    for item in data["terms"]:
        powers = item[monomial_key]
        exponent = dict(zip(keys, powers, strict=True))
        ps = exponent.pop("s")
        if ps not in (0, 1):
            raise AssertionError((path.name, ps))
        term = sp.Integer(item["coefficient"])
        for name, power in exponent.items():
            term *= variables[name] ** power
        if ps:
            slope += term
        else:
            constant += term
    return sp.expand(constant), sp.expand(slope)


def positive_record(name: str, expression: sp.Expr, *gens: sp.Symbol) -> dict:
    poly = sp.Poly(expression, *gens)
    coefficients = poly.coeffs()
    assert coefficients and all(value > 0 for value in coefficients)
    return {
        "name": name,
        "term_count": len(poly.terms()),
        "degrees": list(map(int, poly.degree_list())),
        "smallest_coefficient": int(min(coefficients)),
        "sha256": canonical_hash(poly),
    }


def main() -> None:
    group_parts = [
        split_sparse(
            Path(
                "path_isolate_p4_group_integrand_stable_"
                f"parity{parity}_terms_20260730.json"
            ),
            "zwcmsx",
        )
        for parity in (0, 1)
    ]
    bottom_parts = [
        split_sparse(
            Path(
                "path_isolate_p4_bottom_pair_lift_integrand_"
                f"parity{parity}_terms_20260801.json"
            ),
            "zwmsx",
        )
        for parity in (0, 1)
    ]

    d_group = sp.expand(z**2 * w**2 * BASE * CORE)
    group_positive = positive_record("D_group", d_group, z, w)
    group_records = []
    group_slope = None
    for parity, (constant, slope) in enumerate(group_parts):
        kernel = sp.Poly(
            sp.cancel((constant - slope) / T**3), z, w, c, m, x
        )
        assert sp.expand(constant - slope - T**3 * kernel.as_expr()) == 0
        x2 = sp.Poly(kernel.as_expr(), x).coeff_monomial(x**2)
        assert sp.expand(x2 + (z - w) ** 2 * d_group) == 0
        assert not x2.has(c, m)
        assert sp.expand(slope - T**3 * LAMBDA * d_group) == 0
        if group_slope is None:
            group_slope = slope
        else:
            assert sp.expand(slope - group_slope) == 0
        group_records.append(
            {
                "parity_epsilon": parity,
                "kernel_x2_sha256": canonical_hash(sp.Poly(x2, z, w)),
                "kernel_x2_degrees_z_w": list(
                    map(int, sp.Poly(x2, z, w).degree_list())
                ),
                "identity": "[x^2]K_e=-(z-w)^2 D_group",
                "reserve_identity": "J=T^3 Lambda D_group",
            }
        )

    common_bottom_slope_factor = z**2 * w**2 * (1 + z) * (1 + w) * (
        z + w
    ) * (z**2 + w**2) * T**5 * LAMBDA
    bottom_records = []
    for parity, (constant, slope) in enumerate(bottom_parts):
        quotient = sp.Poly(
            sp.cancel(slope / common_bottom_slope_factor), z, w, m
        )
        assert sp.expand(
            slope - common_bottom_slope_factor * quotient.as_expr()
        ) == 0
        assert all(value > 0 for value in quotient.coeffs())
        d_pair = sp.expand(BASE * quotient.as_expr())
        d_pair_positive = positive_record(
            f"D_pair_{parity}", d_pair, z, w, m
        )

        kernel = sp.Poly(
            sp.cancel((constant - slope) / (z**2 * w**2 * T**3)),
            z,
            w,
            m,
            x,
        )
        assert sp.expand(
            constant
            - slope
            - z**2 * w**2 * T**3 * kernel.as_expr()
        ) == 0
        x2 = sp.Poly(kernel.as_expr(), x).coeff_monomial(x**2)
        assert sp.expand(x2 + (z - w) ** 2 * d_pair) == 0
        assert sp.expand(slope - z**2 * w**2 * T**3 * LAMBDA * d_pair) == 0
        bottom_records.append(
            {
                "parity_epsilon": parity,
                "positive_factor": d_pair_positive,
                "kernel_x2_sha256": canonical_hash(sp.Poly(x2, z, w, m)),
                "kernel_x2_degrees_z_w_m": list(
                    map(int, sp.Poly(x2, z, w, m).degree_list())
                ),
                "identity": f"[x^2]K_pair_{parity}=-(z-w)^2 D_pair_{parity}",
                "reserve_identity": (
                    f"J_pair_{parity}=z^2 w^2 T^3 Lambda D_pair_{parity}"
                ),
            }
        )

    report = {
        "status": "PASS_PATH_ISOLATE_P4_CURVATURE_RESERVE_IDENTITY",
        "definitions": {
            "T": "z(1+z)+w(1+w)",
            "Lambda": str(LAMBDA),
            "D_group": "z^2 w^2 (1+z)(1+w)(z+w)(z^2+w^2) T^2 Core",
            "D_pair_e": (
                "(1+z)(1+w)(z+w)(z^2+w^2) T^2 R_e, "
                "where R_e is the positive 80-term bottom slope quotient"
            ),
        },
        "group_positive_factor": group_positive,
        "group_records": group_records,
        "bottom_pair_records": bottom_records,
        "coefficient_consequence": (
            "For any symmetric multiplier M whose homogeneous coefficient "
            "slices rise weakly from each edge to their center, the extracted "
            "diagonal contribution of -(z-w)^2 D M is nonnegative."
        ),
    }
    output = Path("path_isolate_p4_curvature_reserve_identity_20260801.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
