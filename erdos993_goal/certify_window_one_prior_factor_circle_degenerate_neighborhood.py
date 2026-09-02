"""Exact off-locus neighborhood certificate for the second-stage quartic.

The ordinary resultant certificate is singular wherever C=D=0.  This script
certifies dyadic neighborhoods containing the singular components encountered
by the global resultant verifier, without dividing by C or D.  For

    E2(X)=4*c4*rho^2*X^2 + 2*c3*rho^2*X
           + (rho^2*c2-c0-rho^4*c4),

put q=c2+2*rho^2*c4, D=-2*(rho^4*c4-c0), and

    H=2*rho^2*q-D.

On the stated box it proves, by strictly positive exact Bernstein controls,

    c3 < 0,
    c3^2 > 16*rho^2*c4^2,
    H > 0,
    H^2 > 16*rho^6*c3^2.

Since c4>=0 on the compact parameter cube, E2 is decreasing on
[-rho,rho].  The last two inequalities and
c3<0 give H+4*c3*rho^3>=0, while

    E2(rho)=(H+4*c3*rho^3)/2.

Consequently E2 has no zero with |X|<rho throughout the whole box, including
points off the exact C=D=0 locus.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from certify_window_one_prior_factor_circle_degeneracy import (
    polynomial_to_controls,
    project_with_positive_denominator,
)


HERE = Path(__file__).resolve().parent
DEFAULT_OUTPUT = (
    HERE
    / "window_one_prior_factor_circle_degenerate_neighborhood_exact_20260809.json"
)


def build_certificate() -> dict:
    a, u, v, p, t = sp.symbols("a u v p t")
    A, U, V, P, T = sp.symbols("A U V P T")
    L, z = sp.symbols("L z")
    rho2 = L * (L + 1) / 16
    root_sum, root_product = u + v, u * v

    def r0(argument: sp.Expr) -> sp.Expr:
        return (
            16 * argument**2
            + 4 * ((L + 3) * root_sum - 4) * argument
            + root_product * (L + 3) * (L + 2)
        )

    def r1(argument: sp.Expr) -> sp.Expr:
        return argument * r0(argument - 1) - p * (argument + L + 1) * r0(argument)

    c4, c3, c2, c1, c0 = sp.Poly(
        sp.expand(z * r1(z - 1) - t * (z + L) * r1(z)), z
    ).all_coeffs()
    assert sp.factor(c4 - 16 * (1 - p) * (1 - t)) == 0
    D = sp.factor(-2 * (rho2**2 * c4 - c0))
    q = sp.factor(c2 + 2 * rho2 * c4)
    H = sp.factor(2 * rho2 * q - D)
    expressions = {
        "minus_c3": -c3,
        "derivative_margin": sp.factor(c3**2 - 16 * rho2 * c4**2),
        "H_positive": H,
        "endpoint_off_locus_margin": sp.factor(H**2 - 16 * rho2**3 * c3**2),
    }
    for expression in expressions.values():
        assert sp.expand(expression - expression.xreplace({u: v, v: u})) == 0
        assert sp.expand(expression - expression.xreplace({p: t, t: p})) == 0
    charts = {
        "low_root_box": {
            "substitution": {
                a: A / 4,
                u: U / 16,
                v: V / 8,
                p: sp.Rational(1, 4) + P / 4,
                t: sp.Rational(3, 4) + T / 8,
            },
            "parameter_box": (
                "0<=a<=1/4, 0<=u<=1/16, 0<=v<=1/8, "
                "1/4<=p<=1/2, 3/4<=t<=7/8, with u-v and p-t copies"
            ),
        },
        "middle_root_box": {
            "substitution": {
                a: A / 4,
                u: sp.Rational(1, 16) + U / 16,
                v: sp.Rational(1, 16) + V / 16,
                p: sp.Rational(3, 8) + P / 8,
                t: sp.Rational(3, 4) + T / 8,
            },
            "parameter_box": (
                "0<=a<=1/4, 1/16<=u,v<=1/8, "
                "3/8<=p<=1/2, 3/4<=t<=7/8, with its p-t copy"
            ),
        },
        "degree_drop_box": {
            "substitution": {
                a: A / 4,
                u: U / 16,
                v: V / 8,
                p: sp.Rational(1, 4) + P / 8,
                t: sp.Rational(7, 8) + T / 8,
            },
            "parameter_box": (
                "0<=a<=1/4, 0<=u<=1/16, 0<=v<=1/8, "
                "1/4<=p<=3/8, 7/8<=t<=1, with u-v and p-t copies"
            ),
        },
        "upper_append_box": {
            "substitution": {
                a: A,
                u: U / 8,
                v: V / 8,
                p: sp.Rational(3, 8) + P / 8,
                t: sp.Rational(7, 8) + T / 8,
            },
            "parameter_box": (
                "0<=a<=1, 0<=u,v<=1/8, 3/8<=p<=1/2, 7/8<=t<=1, "
                "with its p-t copy"
            ),
        },
    }
    audits = {}
    for chart_name, chart_data in charts.items():
        chart_audits = {}
        for name, expression in expressions.items():
            projected_numerator, positive_denominator = project_with_positive_denominator(
                expression, L, a
            )
            chart_polynomial = sp.Poly(
                sp.expand(projected_numerator.subs(chart_data["substitution"])),
                A,
                U,
                V,
                P,
                T,
                domain=sp.QQ,
            )
            controls, metadata = polynomial_to_controls(chart_polynomial)
            minimum = min(map(int, controls.flat))
            maximum = max(map(int, controls.flat))
            assert minimum > 0
            chart_audits[name] = {
                "polynomial": metadata,
                "positive_denominator": positive_denominator,
                "chart_polynomial_sha256": hashlib.sha256(
                    str(chart_polynomial.as_expr()).encode("utf-8")
                ).hexdigest(),
                "minimum_control": minimum,
                "maximum_control": maximum,
            }
        audits[chart_name] = {
            "parameter_box": chart_data["parameter_box"],
            "audits": chart_audits,
        }

    return {
        "status": "PASS_EXACT_SECOND_STAGE_DEGENERATE_NEIGHBORHOOD",
        "claim": (
            "E2(X) has no zero with |X|<rho throughout the stated dyadic boxes, "
            "without assuming C=D=0."
        ),
        "parameter_boxes": {
            name: data["parameter_box"] for name, data in charts.items()
        },
        "chart_variables": "0<=A,U,V,P,T<=1",
        "identities": {
            "D": "-2*(rho^4*c4-c0)",
            "q": "c2+2*rho^2*c4",
            "H": "2*rho^2*q-D",
            "E2_at_rho": "(H+4*c3*rho^3)/2",
        },
        "strict_inequalities": [
            "c3<0",
            "c3^2>16*rho^2*c4^2",
            "H>0",
            "H^2>16*rho^6*c3^2",
        ],
        "consequence": (
            "c3<-4*rho*c4, so E2 is decreasing on [-rho,rho]; "
            "H>-4*c3*rho^3, so E2(rho)>0."
        ),
        "audits": audits,
    }


def main() -> None:
    report = build_certificate()
    DEFAULT_OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
