#!/usr/bin/env python3
"""Certify the universal positive support-distance slope of the P4 lift.

The stable two-layer residual integrand exported by
``derive_path_isolate_p4_group_integrand.py`` is a polynomial

    P_e(z,w,c,m,s,x) = A_e(z,w,c,m,x) + s J(z,w).

This script proves, directly from both sparse parity exports, that the
coefficient of ``s`` is parity- and parameter-independent, has the
explicit positive factorization recorded below, and that the constant
part after changing to ``n=s+1`` has the common factor ``T^3``, where
``T=z(1+z)+w(1+w)``.  These facts are exact symbolic identities.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


z, w, c, m, s, x = sp.symbols("z w c m s x")
T = z * (1 + z) + w * (1 + w)


def load_parts(parity: int) -> tuple[sp.Expr, sp.Expr]:
    source_path = Path(
        "path_isolate_p4_group_integrand_stable_"
        f"parity{parity}_terms_20260730.json"
    )
    source = json.loads(source_path.read_text(encoding="utf-8"))
    constant = sp.Integer(0)
    slope = sp.Integer(0)
    for item in source["terms"]:
        pz, pw, pc, pm, ps, px = item[
            "monomial_z_w_c_m_s_x"
        ]
        if ps not in (0, 1):
            raise AssertionError((parity, ps))
        term = (
            sp.Integer(item["coefficient"])
            * z**pz
            * w**pw
            * c**pc
            * m**pm
            * x**px
        )
        if ps == 0:
            constant += term
        else:
            slope += term
    return sp.expand(constant), sp.expand(slope)


def canonical_hash(poly: sp.Poly) -> str:
    payload = "\n".join(
        f"{monomial}:{coefficient}"
        for monomial, coefficient in poly.terms()
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def main() -> None:
    parts = [load_parts(parity) for parity in (0, 1)]
    slopes = [part[1] for part in parts]
    assert sp.expand(slopes[0] - slopes[1]) == 0

    positive_tail = (
        2 * w**2 * z**2
        + 4 * w**2 * z
        + 3 * w**2
        + 4 * w * z**2
        + 8 * w * z
        + 6 * w
        + 3 * z**2
        + 6 * z
        + 4
    )
    positive_core = (
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
    expected_slope = (
        w**2
        * z**2
        * (1 + w)
        * (w + z)
        * (w**2 + z**2)
        * (1 + z)
        * T**5
        * positive_tail
        * positive_core
    )
    assert sp.expand(slopes[0] - expected_slope) == 0

    slope_poly = sp.Poly(slopes[0], z, w)
    assert all(value > 0 for value in slope_poly.coeffs())
    assert not slopes[0].has(c, m, s, x)

    constant_records = []
    for parity, (constant, slope) in enumerate(parts):
        # With n=s+1, P=A+sJ=(A-J)+nJ.
        n_constant = sp.Poly(
            sp.cancel((constant - slope) / T**3),
            z,
            w,
            c,
            m,
            x,
        )
        assert sp.expand(
            constant - slope - T**3 * n_constant.as_expr()
        ) == 0
        constant_records.append(
            {
                "parity_epsilon": parity,
                "n_constant_after_T3_term_count": len(
                    n_constant.terms()
                ),
                "n_constant_degrees_z_w_c_m_x": list(
                    map(int, n_constant.degree_list())
                ),
                "n_constant_sha256": canonical_hash(n_constant),
            }
        )

    report = {
        "status": "PASS_PATH_ISOLATE_P4_RESIDUAL_AFFINE_SLOPE",
        "identity": "P_e=A_e+sJ=T^3 K_e+(s+1)J",
        "parities_identical_slope": True,
        "slope_parameter_independent": True,
        "slope_term_count": len(slope_poly.terms()),
        "slope_degrees_z_w": list(map(int, slope_poly.degree_list())),
        "slope_smallest_coefficient": int(min(slope_poly.coeffs())),
        "slope_sha256": canonical_hash(slope_poly),
        "positive_factorization": str(expected_slope),
        "common_constant_factor": "T^3",
        "slope_factor": "T^5 times a positive polynomial",
        "constant_records": constant_records,
        "consequence": (
            "For n=s+1, every Newton coefficient splits into the "
            "signed T^3 K_e contribution and the universal positive "
            "k*R*U^(k-1)*J contribution."
        ),
    }
    output = Path(
        "path_isolate_p4_residual_affine_slope_20260801.json"
    )
    output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
