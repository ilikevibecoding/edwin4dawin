#!/usr/bin/env python3
"""Exact audit of the affine Euler-transfer and homogeneous-block identities."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_affine_bridge_reaggregated_boundary_layers import sources as qr_sources
from probe_affine_bridge_shifted_predecessors import sources as bp_sources


def add_shifted(*terms):
    result = {}
    for scalar, source, dz, dw in terms:
        for powers, value in source.items():
            key = (powers[0] + dz, powers[1] + dw, *powers[2:])
            result[key] = sp.expand(result.get(key, 0) + scalar * value)
    return {key: value for key, value in result.items() if value != 0}


def source_identity(package, parity):
    base, reserve = bp_sources(package, parity)
    q_source, r_source = qr_sources(package, parity)
    reconstructed_base = add_shifted(
        (1, q_source, 0, 0),
        (1, q_source, 1, 0),
        (1, q_source, 0, 1),
        (1, r_source, 1, 0),
        (1, r_source, 0, 1),
    )
    reconstructed_reserve = add_shifted(
        (1, r_source, 1, 0),
        (1, r_source, 0, 1),
    )
    base_keys = set(base) | set(reconstructed_base)
    reserve_keys = set(reserve) | set(reconstructed_reserve)
    assert all(
        sp.expand(base.get(key, 0) - reconstructed_base.get(key, 0)) == 0
        for key in base_keys
    )
    assert all(
        sp.expand(reserve.get(key, 0) - reconstructed_reserve.get(key, 0)) == 0
        for key in reserve_keys
    )
    return {
        "package": package,
        "parity": parity,
        "base_key_count": len(base_keys),
        "reserve_key_count": len(reserve_keys),
        "identity": "B=(1+z+w)Q+(z+w)R and P=(z+w)R",
    }


def coefficient(poly, z, w, i, j):
    return sp.Poly(sp.expand(poly), z, w).coeff_monomial(z**i * w**j)


def formal_audit():
    z, w = sp.symbols("z w")
    V = 1 + z + w
    s = z + w
    q_poly = 2 - 3*z + 5*w + 7*z*w + 11*z**2 + 13*w**2
    r_poly = 17 + 19*z + 23*w + 29*z*w + 31*z**2 + 37*w**2
    x_poly = (
        41 + 43*z + 47*w + 53*z*w + 59*z**2 + 61*w**2
        + 67*z**2*w + 71*z*w**2
    )
    euler = lambda f: sp.expand(z * sp.diff(f, z) + w * sp.diff(f, w))
    euler_checks = 0
    adjoint_checks = 0
    homogeneous_checks = 0
    for order in range(9):
        left = sp.expand(V**order * (V*q_poly + s*r_poly + order*s*r_poly))
        right = sp.expand(V**(order + 1)*q_poly + r_poly*euler(V**(order + 1)))
        assert sp.expand(left - right) == 0
        euler_checks += 1
        for target in range(1, 13):
            f = V**(order + 1)
            g = x_poly * r_poly
            left_coefficient = coefficient(g * euler(f), z, w, target, target)
            right_coefficient = coefficient(
                f * (2*target*g - euler(g)), z, w, target, target
            )
            assert left_coefficient == right_coefficient
            adjoint_checks += 1
            j_poly = sp.expand(
                x_poly*q_poly + 2*target*x_poly*r_poly - euler(x_poly*r_poly)
            )
            for h in range(7):
                lhs = coefficient(s**h*j_poly, z, w, target, target)
                q_h = coefficient(s**h*x_poly*q_poly, z, w, target, target)
                rho_h = coefficient(s**h*x_poly*r_poly, z, w, target, target)
                assert lhs == q_h + h*rho_h
                homogeneous_checks += 1
    return {
        "Euler_kernel_checks": euler_checks,
        "diagonal_adjoint_checks": adjoint_checks,
        "homogeneous_layer_checks": homogeneous_checks,
    }


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def main():
    sources = [
        source_identity(package, parity)
        for package in ("group", "bottom")
        for parity in (0, 1)
    ]
    report = {
        "status": "PASS_AFFINE_BRIDGE_EULER_TRANSFER_IDENTITY",
        "source_identities": sources,
        "formal_audit": formal_audit(),
        "theorem": (
            "For X=A^aT^b, D=m+k+5, E=z*d_z+w*d_w, "
            "[z^Dw^D]XV^k(B+kP)=[z^Dw^D]V^(k+1)"
            "{XQ+(2D-E)(XR)}; its h-layer is q_h+h*rho_h."
        ),
        "boundary_note": (
            "The diagonal adjoint is a finite polynomial coefficient identity; "
            "there is no omitted analytic boundary term."
        ),
    }
    output = Path("affine_bridge_euler_transfer_identity_exact_20260812.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    print("script_sha256", sha256(Path(__file__)))
    print("report_sha256", sha256(output))


if __name__ == "__main__":
    main()
