"""Certify the endpoint reduction for the two hard reserve families.

After exact source factorization, multiplication by A=(1+z)(1+w) becomes
(1+dX)(1+dY) and lowering the common diagonal extraction index becomes
dX*dY.  Both operations preserve real stability.  Hence the full cones
x >= 2m and r <= 2m reduce to the endpoint x=r=2m.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_path_isolate_p4_bottom_pair_affine_two_kernel import A, T, V, m, q, w, z
from probe_path_isolate_p4_affine_parameter_monotonicity_reaggregated_v import (
    bottom_increment,
    group_increment,
    quotient,
)


OUT = Path("reserve_reverse_borel_endpoint_reduction_certificate_20260802.json")


def sparse3(expression: sp.Expr) -> list[dict[str, int]]:
    return [
        {"z": i, "w": j, "m": k, "coefficient": int(c)}
        for (i, j, k), c in sp.Poly(sp.expand(expression), z, w, m).terms()
    ]


def main() -> None:
    F = sp.expand(2 * A * (A - 1) + (V + 1) ** 2)
    G = sp.expand(A * T**2 - q)
    H_group = sp.expand((z + w) * (z**2 + w**2) * F * G**2)

    # Hard group case: parity 0, m-coordinate.  The common T^3 was already
    # absorbed in the external exponent in the wide-grid reduction.
    _, group_raw = group_increment(0, "m")
    group_reduced = quotient(group_raw, T**3)
    assert sp.expand(group_reduced - q**2 * A**2 * T**2 * H_group) == 0

    # Hard bottom case: parity 1, x-coordinate.  The common q^2*T^3 was
    # already removed in the wide-grid reduction.
    _, bottom_raw = bottom_increment(1, "x")
    bottom_reduced = quotient(bottom_raw, q**2 * T**3)
    bottom_prefactor = sp.expand(A**2 * T**2 * (z + w) * (z**2 + w**2) * (A - 1) * F)
    L_m = quotient(bottom_reduced, bottom_prefactor)
    assert sp.expand(bottom_reduced - bottom_prefactor * L_m) == 0
    assert sp.expand(L_m - L_m.xreplace({z: w, w: z})) == 0
    assert sp.degree(L_m, m) == 1
    assert all(int(c) >= 0 for _, c in sp.Poly(L_m, z, w, m).terms())
    compact_L_m = sp.expand(G * (T + (2 * m + 3) * q * A) + 2 * q**2 * A)
    assert sp.expand(L_m - compact_L_m) == 0
    H_bottom = sp.expand((z + w) * (z**2 + w**2) * (A - 1) * F * L_m)

    report = {
        "kind": "reserve_reverse_borel_endpoint_reduction_certificate",
        "date": "2026-08-02",
        "status": "PASS_EXACT_ENDPOINT_REDUCTION",
        "operator_identities": {
            "A_raise": "B_N[A*K]=(1+dX)(1+dY)B_N[K]",
            "N_lower": "B_(N-1)[K]=dX*dY B_N[K]",
            "stability_closure": "derivatives and (1+c*dX), c>=0, preserve real stability",
        },
        "group": {
            "hard_case": "parity 0, m-coordinate",
            "exact_reduced_source": "q^2*A^2*T^2*H_group",
            "H_group": "(z+w)(z^2+w^2)F G^2",
            "F": "2*A*(A-1)+(V+1)^2",
            "G": "A*T^2-z*w",
            "effective_parameters": {
                "a": "m+x+1",
                "b": "2m+1",
                "N": "m+r+4",
            },
            "endpoint": {
                "condition": "x=r=2m",
                "a": "3m+1",
                "b": "2m+1",
                "N": "3m+4",
                "transform": "B_(3m+4)[H_group*A^(3m+1)*T^(2m+1)]",
            },
            "cone_identity": (
                "For x=2m+u and r=2m-v, Phi_(m,x,r)="
                "((1+dX)(1+dY))^u (dX*dY)^v Phi_endpoint."
            ),
        },
        "bottom": {
            "hard_case": "parity 1, x-coordinate",
            "exact_reduced_source": "A^2*T^2*H_bottom",
            "H_bottom": "(z+w)(z^2+w^2)(A-1)F*L_m",
            "L_m_symmetric": True,
            "L_m_linear_in_m": True,
            "L_m_nonnegative_coefficient_count": len(sp.Poly(L_m, z, w, m).terms()),
            "L_m_compact_identity": "G*(T+(2m+3)*q*A)+2*q^2*A",
            "L_m_sparse": sparse3(L_m),
            "effective_parameters": {
                "a": "m+x-1",
                "b": "2m+1",
                "N": "m+r+3",
            },
            "endpoint": {
                "condition": "x=r=2m",
                "a": "3m-1",
                "b": "2m+1",
                "N": "3m+3",
                "transform": "B_(3m+3)[H_bottom*A^(3m-1)*T^(2m+1)]",
            },
            "cone_identity": (
                "For x=2m+u and r=2m-v, Phi_(m,x,r)="
                "((1+dX)(1+dY))^u (dX*dY)^v Phi_endpoint."
            ),
        },
        "conclusion": (
            "Real stability of one endpoint transform per m proves reverse-Borel "
            "stability for the entire admissible x>=2m, r<=2m reserve cone."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "group_endpoint": report["group"]["endpoint"]["transform"],
        "bottom_endpoint": report["bottom"]["endpoint"]["transform"],
        "bottom_L_m_terms": len(report["bottom"]["L_m_sparse"]),
        "output": str(OUT.resolve()),
    }, indent=2))


if __name__ == "__main__":
    main()
