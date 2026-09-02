"""Exact Riccati/affine reduction for the PF length-three far-left problem.

For the source-one derivative chain

    X_j=S_(p-2j,alpha+j)[1],

put ``theta_j=x*X_(j+1)/X_j`` at ``x=-z``.  The hypergeometric ODE for
``X_j`` makes ``theta_j*theta_(j+1)`` affine in ``theta_j``.  Hence the
quadratic two-positive-root row

    Y_j=X_j-s*x*X_(j+1)+q*x^2*X_(j+2)

has ``Y_j/X_j`` affine in the single Riccati coordinate ``theta_j``.
The script proves the symbolic identities and replays the normalized rows,
their derivatives, and the two collision scalar products exactly.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from prove_quartic_minimal_compatibility_resultants import X, window_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_riccati_affine_reduction_exact_20260807.json"


def digest(expressions: list[sp.Expr]) -> str:
    payload = ";".join(str(sp.factor(value)) for value in expressions)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def symbolic_checks() -> dict[str, object]:
    p, alpha, z, theta, s, q = sp.symbols(
        "p alpha z theta s q", nonzero=True
    )
    eta0 = (p + alpha) / (p * (p - 1))
    eta1 = (p + alpha - 1) / ((p - 2) * (p - 3))
    theta_product = sp.cancel(
        eta1
        / (1 + 4 * z)
        * (
            (z * (4 * p - 6) - (alpha + 1)) * theta
            - z * (p + alpha)
        )
    )

    # At t=-z the source ODE is
    # (1+4z)D^2+[alpha-z(4p-2)]D+z*p*(p-1)=0,
    # with D=X theta/eta0 and
    # D^2/X=theta/eta0+theta*theta_next/(eta0*eta1).
    ode_residual = sp.factor(
        (1 + 4 * z) * (theta / eta0 + theta_product / (eta0 * eta1))
        + (alpha - z * (4 * p - 2)) * theta / eta0
        + z * p * (p - 1)
    )
    assert ode_residual == 0

    phi = sp.expand(1 - s * theta + q * theta_product)
    affine = sp.Poly(phi, theta)
    assert affine.degree() == 1
    expected_constant = sp.cancel(
        1 - q * eta1 * z * (p + alpha) / (1 + 4 * z)
    )
    expected_linear = sp.cancel(
        -s
        + q
        * eta1
        * (z * (4 * p - 6) - (alpha + 1))
        / (1 + 4 * z)
    )
    assert sp.factor(affine.coeff_monomial(1) - expected_constant) == 0
    assert sp.factor(affine.coeff_monomial(theta) - expected_linear) == 0

    return {
        "source_ode": (
            "D(D+alpha)X=t(p-2D)(p-2D-1)X, D=t*d/dt"
        ),
        "riccati_product": str(theta_product),
        "phi_constant": str(expected_constant),
        "phi_theta_coefficient": str(expected_linear),
        "symbolic_digest": digest(
            [theta_product, expected_constant, expected_linear]
        ),
    }


def one_replay(
    p: int, alpha: int, z: sp.Rational, u: sp.Rational, v: sp.Rational
) -> dict[str, object]:
    x = -z
    source = [
        window_polynomial(p - 2 * j, alpha + j, [sp.Integer(1)])
        for j in range(7)
    ]
    source_values = [poly.eval(x) for poly in source]
    assert all(value != 0 for value in source_values)
    eta = [
        sp.Rational(p + alpha - j, (p - 2 * j) * (p - 2 * j - 1))
        for j in range(7)
    ]
    theta = [
        sp.cancel(x * source_values[j + 1] / source_values[j])
        for j in range(6)
    ]
    assert all(value > 0 for value in theta)

    riccati_residuals = []
    for j in range(5):
        current_p, current_alpha = p - 2 * j, alpha + j
        predicted_product = sp.cancel(
            eta[j + 1]
            / (1 + 4 * z)
            * (
                (
                    z * (4 * current_p - 6)
                    - (current_alpha + 1)
                )
                * theta[j]
                - z * (current_p + current_alpha)
            )
        )
        residual = sp.factor(theta[j] * theta[j + 1] - predicted_product)
        assert residual == 0
        riccati_residuals.append(residual)

    s, q = u + v, u * v
    gamma = [sp.Integer(1), -s, q]
    rows = [
        sp.Poly(
            X**j
            * window_polynomial(p - 2 * j, alpha + j, gamma).as_expr(),
            X,
            domain=sp.QQ,
        )
        for j in range(4)
    ]
    row_values = [poly.eval(x) for poly in rows]
    row_derivatives = [poly.diff().eval(x) for poly in rows]

    phi = [
        sp.cancel(1 - s * theta[j] + q * theta[j] * theta[j + 1])
        for j in range(5)
    ]
    products = [sp.Integer(1)]
    for value in theta[:4]:
        products.append(sp.cancel(products[-1] * value))
    normalized = [sp.cancel(products[j] * phi[j]) for j in range(4)]
    assert all(
        sp.factor(row_values[j] / source_values[0] - normalized[j]) == 0
        for j in range(4)
    )

    theta_derivatives = [
        sp.cancel(
            theta[j]
            / x
            * (1 + theta[j + 1] / eta[j + 1] - theta[j] / eta[j])
        )
        for j in range(5)
    ]
    phi_derivatives = [
        sp.cancel(
            -s * theta_derivatives[j]
            + q
            * (
                theta_derivatives[j] * theta[j + 1]
                + theta[j] * theta_derivatives[j + 1]
            )
        )
        for j in range(4)
    ]
    product_derivatives = [sp.Integer(0)]
    for j in range(1, 4):
        product_derivatives.append(
            sp.cancel(
                products[j]
                * sum(
                    theta_derivatives[k] / theta[k] for k in range(j)
                )
            )
        )
    normalized_derivatives = [
        sp.cancel(
            product_derivatives[j] * phi[j]
            + products[j] * phi_derivatives[j]
        )
        for j in range(4)
    ]
    source_log_derivative = sp.cancel(source[0].diff().eval(x) / source_values[0])
    assert all(
        sp.factor(
            row_derivatives[j] / source_values[0]
            - source_log_derivative * normalized[j]
            - normalized_derivatives[j]
        )
        == 0
        for j in range(4)
    )

    def minors(values: list[sp.Expr]) -> tuple[sp.Expr, sp.Expr, sp.Expr]:
        d0 = sp.cancel(values[1] ** 2 - values[0] * values[2])
        d2 = sp.cancel(values[2] ** 2 - values[1] * values[3])
        e = sp.cancel(values[0] * values[3] - values[1] * values[2])
        return d0, d2, e

    raw_d0, raw_d2, raw_e = minors(row_values)
    norm_d0, norm_d2, norm_e = minors(normalized)
    source_square = source_values[0] ** 2
    assert all(
        sp.factor(raw - source_square * norm) == 0
        for raw, norm in zip(
            (raw_d0, raw_d2, raw_e),
            (norm_d0, norm_d2, norm_e),
        )
    )
    raw_a = sp.cancel(
        raw_d2 * row_derivatives[0]
        + raw_e * row_derivatives[1]
        + raw_d0 * row_derivatives[2]
    )
    raw_b = sp.cancel(
        raw_d2 * row_derivatives[1]
        + raw_e * row_derivatives[2]
        + raw_d0 * row_derivatives[3]
    )
    norm_a = sp.cancel(
        norm_d2 * normalized_derivatives[0]
        + norm_e * normalized_derivatives[1]
        + norm_d0 * normalized_derivatives[2]
    )
    norm_b = sp.cancel(
        norm_d2 * normalized_derivatives[1]
        + norm_e * normalized_derivatives[2]
        + norm_d0 * normalized_derivatives[3]
    )
    source_cube = source_values[0] ** 3
    assert sp.factor(raw_a - source_cube * norm_a) == 0
    assert sp.factor(raw_b - source_cube * norm_b) == 0

    return {
        "p": p,
        "alpha": alpha,
        "z": str(z),
        "u": str(u),
        "v": str(v),
        "theta_positive": True,
        "riccati_identity_count": len(riccati_residuals),
        "normalized_row_identity_count": 4,
        "normalized_derivative_identity_count": 4,
        "collision_scalar_product_identity_count": 2,
        "theta_digest": digest(theta),
        "normalized_row_digest": digest(normalized),
    }


def main() -> None:
    symbolic = symbolic_checks()
    replays = [
        one_replay(17, 0, sp.Rational(100), sp.Rational(1, 10), sp.Rational(1)),
        one_replay(18, 1, sp.Rational(200), sp.Rational(1, 5), sp.Rational(4, 5)),
        one_replay(23, 6, sp.Rational(100), sp.Rational(1, 10), sp.Rational(1)),
        one_replay(26, 9, sp.Rational(300), sp.Rational(1, 3), sp.Rational(3, 4)),
    ]
    report = {
        "status": "PASS_EXACT_PF_LENGTH3_RICCATI_AFFINE_REDUCTION",
        "symbolic": symbolic,
        "replays": replays,
        "conclusion": (
            "The far-left collision data and both derivative scalar products "
            "are rational functions of (p,alpha,z,theta_0,u,v), with every "
            "later theta generated by the displayed first-order Riccati map."
        ),
        "remaining_implication": (
            "On the actual Jacobi Weyl branch at p-alpha=17, prove that the "
            "PF minor conditions force the two normalized scalar products to "
            "have the same nonzero sign."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(OUTPUT)


if __name__ == "__main__":
    main()
