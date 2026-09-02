#!/usr/bin/env python3
"""Exact certificate for the rank-one fixed ambient Duran product bound.

For the cubic Duran transform with two positive source parameters u,v in
(0,1] and one negative source parameter -d, this proves that the leftmost
negative transformed root -b satisfies

    b > u*v*d*(N-2)/4.

The constant-term identity then gives G2 < N*(N-1)/16.  This is the first
nontrivial rank of the all-rank product lemma needed by the forest argument.

All inequalities on the parameter box N>=9, 0<u,v<=1 are certified exactly
by rational Bernstein coefficients after writing N=9+n, n>=0.
"""

from __future__ import annotations

import hashlib
import json
from math import comb
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "actual_duran_fixed_ceiling_rank1_exact_20260809.json"

N, n, u, v, d, t, z, x = sp.symbols(
    "N n u v d t z x", real=True
)
a = u + v
b = u * v


def bernstein_controls_2d(expr: sp.Expr) -> tuple[int, int, list[sp.Expr]]:
    """Return tensor Bernstein controls on [0,1]^2 in variables u,v."""

    poly = sp.Poly(sp.expand(expr), u, v)
    degree_u = poly.degree(u)
    degree_v = poly.degree(v)
    controls: list[sp.Expr] = []
    for k in range(degree_u + 1):
        for ell in range(degree_v + 1):
            control = sp.Integer(0)
            for i in range(k + 1):
                for j in range(ell + 1):
                    control += (
                        poly.coeff_monomial(u**i * v**j)
                        * sp.Rational(comb(k, i), comb(degree_u, i))
                        * sp.Rational(comb(ell, j), comb(degree_v, j))
                    )
            controls.append(sp.factor(control))
    return degree_u, degree_v, controls


def certify_nonpositive_n_coefficients(
    label: str, expr: sp.Expr, *, require_every_control_strict: bool = True
) -> dict[str, object]:
    """Certify expr<=0 for n>=0 and (u,v) in [0,1]^2."""

    degree_u, degree_v, controls = bernstein_controls_2d(expr)
    zero_controls = 0
    for control in controls:
        if control == 0:
            zero_controls += 1
            continue
        coefficients = sp.Poly(control, n).all_coeffs()
        assert all(coefficient <= 0 for coefficient in coefficients), (
            label,
            control,
        )
        assert any(coefficient < 0 for coefficient in coefficients), (
            label,
            control,
        )
    if require_every_control_strict:
        assert zero_controls == 0, (label, zero_controls)
    return {
        "label": label,
        "degree_u": degree_u,
        "degree_v": degree_v,
        "control_count": len(controls),
        "zero_controls": zero_controls,
        "controls": [str(control) for control in controls],
    }


def main() -> None:
    # The monic cubic arising from the Duran/Pochhammer transform.
    c2 = N * d / 4 - N * a / 4 + 3
    c1 = (
        -N**2 * d * a / 16
        + N**2 * b / 16
        + N * d * a / 16
        + N * d / 4
        - N * b / 16
        - N * a / 4
        + 2
    )
    c0 = N * (N - 1) * (N - 2) * d * b / 64
    Q = sp.expand(z**3 + c2 * z**2 + c1 * z + c0)
    F = sp.expand(-Q.subs(z, -x))

    R2 = N * (N - 1) / 16
    K = b * d * (N - 2) / 4
    H = N * (1 - b) + 2 * b
    A = sp.factor(c2 - K)

    P0 = N**2 * b - N**2 - 4 * N * a - N * b + N + 32
    P1 = (
        N**2 * a * b
        - N**2 * a
        - 2 * N * a * b
        + N * a
        - 12 * N * b
        + 4 * N
        + 24 * b
    )
    P2 = N**2 * b**2 - N**2 * b - 4 * N * b**2 + 2 * N * b + 4 * b**2
    P = sp.expand(P0 + d * P1 + d**2 * P2)

    # Core algebra: F(K) has the sign of P, and P=0 gives a quadratic
    # factor whose product is exactly R^2.
    assert sp.factor(P + 64 * Q.subs(z, -K) / (d * b * (N - 2))) == 0
    assert sp.factor(c0 - K * R2) == 0
    assert sp.factor(c1 - (R2 + A * K) - P / 16) == 0
    assert sp.factor(P2 - b * (N - 2) * (N * b - N - 2 * b)) == 0

    dA = sp.factor((N * (a + 2) - 12) / H)
    dK = sp.Rational(2, 3) / b
    assert sp.factor(A.subs(d, dA) - N / 2) == 0
    assert sp.factor(K.subs(d, dK) - (N - 2) / 6) == 0

    certificates: list[dict[str, object]] = []

    # P(d)<0 throughout 0<=d<=dA.  Because P is quadratic in d, its
    # Bernstein controls after d=t*dA are P0, P0+dA*P1/2, and P(dA).
    d_interval_controls = (
        P0,
        P0 + dA * P1 / 2,
        P0 + dA * P1 + dA**2 * P2,
    )
    for index, control in enumerate(d_interval_controls):
        polynomial_control = sp.cancel(H**2 * control).subs(N, n + 9)
        assert sp.denom(polynomial_control) == 1
        certificates.append(
            certify_nonpositive_n_coefficients(
                f"H^2 times d-Bernstein control {index}",
                sp.expand(polynomial_control),
            )
        )

    # At dK, both P and P' are strictly negative.  Since P2<0, P remains
    # decreasing and negative for every d>=dK.
    P_at_dK_scaled = sp.factor((3 * b) ** 2 * P.subs(d, dK) / b)
    Pprime_at_dK_scaled = sp.factor(
        (3 * b) * sp.diff(P, d).subs(d, dK) / b
    )
    for label, expression in (
        ("(3uv)^2 P(dK)/(uv)", P_at_dK_scaled),
        ("(3uv) P'(dK)/(uv)", Pprime_at_dK_scaled),
    ):
        expression_n = sp.cancel(expression).subs(N, n + 9)
        assert sp.denom(expression_n) == 1
        certificates.append(
            certify_nonpositive_n_coefficients(
                label, sp.expand(expression_n)
            )
        )

    # When P>0 the preceding certificates force d>dA.  At x=N/4 the
    # cubic F is affine decreasing in d and is already negative at dA.
    E = sp.factor(64 * F.subs(x, N / 4) / N)
    E_slope = sp.factor(sp.diff(E, d))
    expected_slope = -(
        N * (N - 4) + a * N * (N - 1) + b * (N - 1) * (N - 2)
    )
    assert sp.expand(E_slope - expected_slope) == 0
    E_at_dA_numerator = sp.cancel(H * E.subs(d, dA))
    assert sp.denom(E_at_dA_numerator) == 1
    certificates.append(
        certify_nonpositive_n_coefficients(
            "H E(dA)",
            sp.expand(E_at_dA_numerator.subs(N, n + 9)),
        )
    )

    # Symbolic sign-chain identities used in the proof split.
    F0 = sp.factor(F.subs(x, 0))
    FK = sp.factor(F.subs(x, K))
    assert sp.factor(F0 + c0) == 0
    assert sp.factor(FK - d * b * (N - 2) * P / 64) == 0

    identity_text = {
        "Q": str(Q),
        "F": str(F),
        "K": str(K),
        "R_squared": str(R2),
        "A": str(A),
        "P": str(P),
        "P2_factorization": str(sp.factor(P2)),
        "dA": str(dA),
        "dK": str(dK),
        "E_at_N_over_4": str(E),
        "E_slope": str(E_slope),
        "F_at_K": str(FK),
    }
    identity_digest = hashlib.sha256(
        json.dumps(identity_text, sort_keys=True).encode("utf-8")
    ).hexdigest()

    payload = {
        "kind": "actual_duran_fixed_ceiling_rank1_exact_certificate",
        "date": "2026-08-09",
        "status": "PASS_EXACT_FIXED_CEILING_RANK_ONE_PROOF_CERTIFICATE",
        "domain": "N>=9, 0<u,v<=1, d>0",
        "conclusion": (
            "The leftmost negative root -b_left of the cubic Q satisfies "
            "b_left>u*v*d*(N-2)/4, hence G2<N*(N-1)/16."
        ),
        "proof_split": {
            "P_negative": (
                "F(K)<0 and F(+infinity)>0, hence the largest positive "
                "root of F is greater than K."
            ),
            "P_zero": (
                "Q=(z+K)(z^2+A z+R^2), A>N/2>2R and K<R; the "
                "larger quadratic root of F is greater than R>K."
            ),
            "P_positive": (
                "The certificates give dA<d<dK, hence 0<K<N/4. "
                "F has signs -,+,-,+ at 0,K,N/4,+infinity, so it has "
                "three positive roots and its largest root exceeds K."
            ),
        },
        "identity_digest_sha256": identity_digest,
        "identities": identity_text,
        "bernstein_certificates": certificates,
        "certificate_count": len(certificates),
        "total_bernstein_controls": sum(
            int(certificate["control_count"]) for certificate in certificates
        ),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(f"certificate_count={payload['certificate_count']}")
    print(f"total_bernstein_controls={payload['total_bernstein_controls']}")
    print(f"identity_digest_sha256={identity_digest}")
    print(f"report={REPORT}")


if __name__ == "__main__":
    main()
