#!/usr/bin/env python3
"""Symbolically verify the three-comparison C12 reduction."""

from __future__ import annotations

import sympy as sp


def check_zero(name: str, expression) -> None:
    value = sp.factor(expression)
    if value != 0:
        raise AssertionError(f"{name}: {value}")


def main() -> int:
    r, x, s, q, z, eta, eps = sp.symbols(
        "r x s q z eta eps", positive=True
    )
    k = r + 1
    u = r * x
    v = k * x - z
    theta = s / (x + s)
    q_t = sp.symbols("q_t", nonnegative=True)

    j = (
        2 * k * v * q_t
        + (k * s * (r + 4) - r * v) * q
        + 2 * k * s * (u - r) / r
        - 2 * k * theta * (v - k * u / r) ** 2
    )
    lower = (
        k
        * (
            s * (r + 4) * q
            + r / k * (k * x - z) * q
            + 2 * s * (x - 1)
            - 2 * theta * z**2
        )
    )
    check_zero(
        "substitute the curvature-comparison boundary",
        j.subs(q_t, r * q / k) - lower,
    )

    m = x + q - 1
    w = r * x - q + 1
    endpoint = sp.factor((lower / k).subs(z, m))
    check_zero(
        "endpoint form",
        endpoint
        - (
            s * (r + 4) * q
            + r / k * w * q
            + 2 * s * (x - 1)
            - 2 * theta * m**2
        ),
    )

    z_poly = (
        -2 * (x + 1) * q**2
        + (r * x**2 + 2 * r * x + 8 * x + 4) * q
        + 4 * x**2
        - 2 * x
        - 2
    )
    scalar_boundary = sp.factor(
        2
        * (
            x
            * (x + 2)
            * ((r + 4) * q / 2 + x - 1)
            - (x + 1) * (q + x - 1) ** 2
        )
    )
    check_zero("cleared scalar polynomial", z_poly - scalar_boundary)

    check_zero(
        "lower endpoint x>=1",
        z_poly.subs(q, 0) - 2 * (x - 1) * (2 * x + 1),
    )
    check_zero(
        "lower endpoint x<=1",
        z_poly.subs(q, 1 - x)
        - x * (r + 2) * (1 - x) * (x + 2),
    )
    check_zero(
        "upper endpoint q=4",
        z_poly.subs(q, 4)
        - 2 * (2 * r * x**2 + 4 * r * x + 2 * x**2 - x - 9),
    )
    check_zero(
        "upper endpoint q=rx+1",
        z_poly.subs(q, r * x + 1)
        - x * (-r**2 * x**2 + 5 * r * x + 2 * r + 4 * x + 4),
    )

    compensation_boundary = sp.factor(
        (j / k)
        .subs(q_t, (r * q + eta) / k)
        .subs(z, m + eps)
    )
    compensation_target = (
        s * (r + 4) * q
        + r / k * (k * x - m - eps) * q
        + 2 * s * (x - 1)
        + 2 * (k * x - m - eps) * eta / k
        - 2 * theta * (m + eps) ** 2
    )
    check_zero(
        "curvature-likelihood compensation boundary",
        compensation_boundary - compensation_target,
    )
    check_zero(
        "square-loss identity",
        (m + eps) ** 2 - m**2 - eps * (2 * m + eps),
    )

    a, ap, bm, b, bp, gt, gf = sp.symbols(
        "a ap bm b bp gt gf", positive=True
    )
    d_det = a * bp - b * ap
    e_det = b**2 - bm * bp
    q_t_coeff = gt / (a * ap)
    q_f_coeff = gf / (bm * b)
    v_coeff = k * ap / a
    eta_coeff = k * q_t_coeff - r * q_f_coeff
    eps_coeff = k * d_det / (a * b)
    m_coeff = k * e_det / (bm * b)
    theta_coeff = bm / (a + bm)
    clc_difference = (
        r / k * v_coeff * q_f_coeff
        + 2 * v_coeff / k * eta_coeff
        - 2
        * theta_coeff
        * eps_coeff
        * (2 * m_coeff + eps_coeff)
    )
    clc_cleared = sp.factor(
        clc_difference * (a + bm) * a**2 * bm * b**2
    )
    integral_target = (
        (a + bm)
        * b
        * (2 * k * gt * bm * b - r * a * ap * gf)
        - 2
        * k**2
        * bm
        * d_det
        * (2 * a * e_det + bm * d_det)
    )
    check_zero(
        "integral CLC form",
        clc_cleared - integral_target,
    )

    # Section 6: under r*eps <= v, C, q <= 4, and s <= 1,
    # theta(2M+eps) is bounded by r for every r >= 6.
    envelope = sp.factor(
        (2 * (x + 3) + k * x / r) / (x + 1)
    )
    check_zero(
        "likelihood-triggered envelope",
        envelope - ((3 + 1 / r) * x + 6) / (x + 1),
    )

    # The left side of CLC is exactly (v/k)H.
    h = r * q + 2 * eta
    check_zero(
        "CLC left as curvature floor",
        r / k * v * q
        + 2 * v / k * eta
        - v / k * h,
    )
    linear_scalar = sp.factor(
        v_coeff
        * (2 * k * q_t_coeff - r * q_f_coeff)
        - 2 * k * r * eps_coeff
    )
    linear_cleared = sp.factor(
        linear_scalar * a**2 * bm * b / k
    )
    linear_integral_target = (
        2 * k * gt * bm * b
        - r * a * ap * gf
        - 2 * k * r * a * bm * d_det
    )
    check_zero(
        "linear compensation integral form",
        linear_cleared - linear_integral_target,
    )

    print("PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
