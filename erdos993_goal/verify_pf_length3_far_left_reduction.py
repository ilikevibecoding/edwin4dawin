"""Exact algebra for the far-left PF length-three collision reduction."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_far_left_reduction_exact_20260807.json"


def digest(value: sp.Expr) -> str:
    return hashlib.sha256(str(sp.factor(value)).encode("utf-8")).hexdigest()


def main() -> None:
    z, s, q, sigma = sp.symbols("z s q sigma")
    r = sp.symbols("R0:8")
    eta = sp.symbols("eta0:8", nonzero=True)

    def p(j):
        return r[j] - s * z * r[j + 1] + q * z**2 * r[j + 2]

    def g(j):
        return z**j * p(j)

    g_values = [g(j) for j in range(4)]
    d0 = sp.expand(g_values[1] ** 2 - g_values[0] * g_values[2])
    d2 = sp.expand(g_values[2] ** 2 - g_values[1] * g_values[3])
    e = sp.expand(g_values[0] * g_values[3] - g_values[1] * g_values[2])
    h = sp.expand(e**2 - 4 * d0 * d2)
    assert sp.expand(d2 * g_values[0] + e * g_values[1] + d0 * g_values[2]) == 0
    assert sp.expand(d2 * g_values[1] + e * g_values[2] + d0 * g_values[3]) == 0

    # On x=-z to the left of every source root,
    # R_j,z=-sigma*R_j+R_(j+1)/eta_j.  The common -sigma flow is an
    # amplitude derivative and cancels from both scalar triple products.
    def rz(j):
        return -sigma * r[j] + r[j + 1] / eta[j]

    def pz(j):
        return sp.expand(
            rz(j)
            - s * (r[j + 1] + z * rz(j + 1))
            + q * (2 * z * r[j + 2] + z**2 * rz(j + 2))
        )

    def gx(j):
        # x=-z, so d/dx=-d/dz.  Retain the full sigma term here; its
        # cancellation is checked below rather than assumed.
        return sp.expand(-(j * z ** (j - 1) * p(j) + z**j * pz(j)))

    derivatives = [gx(j) for j in range(4)]
    a = sp.expand(d2 * derivatives[0] + e * derivatives[1] + d0 * derivatives[2])
    b = sp.expand(d2 * derivatives[1] + e * derivatives[2] + d0 * derivatives[3])
    assert not a.has(sigma)
    assert not b.has(sigma)

    # Independent scalar-triple-product replay.
    matrix_a = sp.Matrix(
        [
            g_values[:3],
            g_values[1:4],
            derivatives[:3],
        ]
    )
    matrix_b = sp.Matrix(
        [
            g_values[:3],
            g_values[1:4],
            derivatives[1:4],
        ]
    )
    assert sp.expand(a + matrix_a.det()) == 0
    assert sp.expand(b + matrix_b.det()) == 0

    report = {
        "status": "PASS_EXACT_PF_LENGTH3_FAR_LEFT_REDUCTION",
        "identities": {
            "far_left_source": (
                "X_j=(-1)^(n+j)|X_0| R_j, with R_j=kappa_j*j!*e_j(1/(rho_i-x))>0"
            ),
            "quadratic_row": "G_j=(-1)^n*z^j*|X_0|*P_j; P_j=R_j-s*z*R_(j+1)+q*z^2*R_(j+2)",
            "kernel_vector": "(a0,a1,a2) proportional to (D2,E,D0)",
            "pf_gap": "H=E^2-4*D0*D2",
            "flow": "dR_j/dz=-sigma*R_j+R_(j+1)/eta_j",
            "collision_derivatives": "A=-det(g0..g2;g1..g3;g0'..g2'), B=-det(g0..g2;g1..g3;g1'..g3')",
        },
        "checks": {
            "two_kernel_cross_products_zero": True,
            "common_amplitude_flow_cancels_from_A": True,
            "common_amplitude_flow_cancels_from_B": True,
            "two_scalar_triple_product_identities": True,
        },
        "expression_data": {
            "D0_terms": len(sp.Poly(d0, *r[:5], z, s, q).terms()),
            "D2_terms": len(sp.Poly(d2, *r[1:6], z, s, q).terms()),
            "E_terms": len(sp.Poly(e, *r[:6], z, s, q).terms()),
            "H_digest": digest(h),
            "A_digest": digest(a),
            "B_digest": digest(b),
        },
        "remaining_implication": (
            "For the positive elementary-symmetric sequence R_j and reserve-17 "
            "eta_j, prove that D0,D2,E one-signed and H>=0 imply A*B>0."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(OUTPUT)


if __name__ == "__main__":
    main()
