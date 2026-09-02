#!/usr/bin/env python3
"""Audit the fixed tail inequalities for ground-root Schur deflation.

For the Darboux current matrix A, eliminate its final coordinate at a shift
tau.  The resulting matrix S(tau) and the adjacent matrix H share a classical
prefix and differ only in a 2x2 tail.  Their tail Weyl equality numerator is

    N_tau(y)=(y-s_tau) * (L*(y-e)-f) + b*(y-e),

where L=a-d.  This audit targets L>0, G=f-L*(1-e)>0, and
G0=(1-q1)*G-b*(1-e)>0.  Since s_tau<=q1 for 0<=tau<q2, these inequalities
give N_tau(1)<0 uniformly.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import sympy as sp

from audit_one_sided_darboux_bernstein import bernstein_audit


HERE = Path(__file__).resolve().parent
R, U, V, C = sp.symbols("r u v c", nonnegative=True)


def positive_denominator_factors(expression: sp.Expr) -> list[dict[str, object]]:
    _, denominator = sp.fraction(sp.cancel(expression))
    constant, factors = sp.factor_list(denominator)
    assert constant > 0
    records = []
    for index, (factor, exponent) in enumerate(factors):
        if not factor.has(U, V, C):
            polynomial = sp.Poly(factor, R, domain=sp.QQ)
            assert all(value >= 0 for value in polynomial.all_coeffs())
            assert polynomial.eval(0) > 0
            records.append(
                {
                    "index": index,
                    "exponent": int(exponent),
                    "parameter_free": True,
                    "factor": str(factor),
                }
            )
        else:
            audit = bernstein_audit(f"denominator_factor_{index}", factor)
            assert audit["strict_positive_bernstein_certificate"]
            audit["exponent"] = int(exponent)
            records.append(audit)
    return records


def one_parity(
    parity: str,
    r_value: int | None = None,
    expressions_only: bool = False,
    components_only: bool = False,
) -> dict[str, object]:
    local = {"r": R, "u": U, "v": V, "c": C}
    tail_raw = json.loads(
        (HERE / f"one_sided_darboux_{parity}_tail_cache_20260806.json").read_text(
            encoding="utf-8"
        )
    )
    expression_raw = json.loads(
        (HERE / f"one_sided_darboux_{parity}_expression_cache_20260806.json").read_text(
            encoding="utf-8"
        )
    )
    current = {
        name: sp.sympify(value, locals=local)
        for name, value in tail_raw["current"].items()
    }
    adjacent = {
        name: sp.sympify(value, locals=local)
        for name, value in tail_raw["adjacent"].items()
    }
    expressions = {
        name: sp.sympify(value, locals=local)
        for name, value in expression_raw["expressions"].items()
    }
    if r_value is not None:
        substitution = {R: sp.Integer(r_value)}
        current = {name: sp.cancel(value.subs(substitution)) for name, value in current.items()}
        adjacent = {name: sp.cancel(value.subs(substitution)) for name, value in adjacent.items()}
        expressions = {name: sp.cancel(value.subs(substitution)) for name, value in expressions.items()}

    q1 = expressions["current_penultimate_cholesky_pivot"]
    q2 = expressions["current_last_cholesky_pivot"]
    b0 = current["b_previous"]
    b1 = current["terminal"]
    q0 = sp.cancel(b0 / (current["d_previous"] - q1))
    a = sp.cancel(q0 + b0 / q0)
    b = sp.cancel(q1 * b0 / q0)
    d = adjacent["d_previous"]
    e = adjacent["d_last"]
    f = adjacent["terminal"]

    lead = sp.cancel(a - d)
    endpoint_bracket = sp.cancel(f - lead * (1 - e))
    endpoint_margin_at_zero_shift = sp.cancel(
        (1 - q1) * endpoint_bracket - b * (1 - e)
    )
    shift_slope_denominator = sp.cancel(
        (b1 / q1 - (1 - q1)) * endpoint_bracket + b * (1 - e)
    )

    # A lower bound for the smallest y-root tau comes from the third inverse
    # power sum: tau >= (sum_i y_i^(-3))^(-1/3).  The y/t relation is
    # y=-4t/(1-4t), so if x_i=-1/t_i then y_i^(-1)=1+x_i/4.
    if parity == "odd":
        p = 2 * R + 13
        alpha = 2 * R
        degree = R + 6
    else:
        p = 2 * R + 14
        alpha = 2 * R + 1
        degree = R + 7
    if r_value is not None:
        p = p.subs(R, r_value)
        alpha = alpha.subs(R, r_value)
        degree = degree.subs(R, r_value)
    source = [C, 1 - C * (U + V), C * U * V - (U + V), U * V]

    def falling(value: sp.Expr, count: int) -> sp.Expr:
        return sp.prod(value - index for index in range(count))

    def reduced(k: int) -> sp.Expr:
        ambient = p + alpha
        return sp.cancel(
            sum(
                source[h]
                * falling(ambient, h)
                * falling(sp.Integer(k), h)
                / falling(p, 2 * h)
                for h in range(min(k, 3) + 1)
            )
        )

    def coefficient_ratio(k: int) -> sp.Expr:
        return sp.cancel(
            falling(p, 2 * k)
            / (sp.rf(alpha + 1, k) * sp.factorial(k))
            * reduced(k)
            / C
        )

    a1, a2, a3 = (coefficient_ratio(k) for k in (1, 2, 3))
    x_power_1 = a1
    x_power_2 = sp.cancel(a1**2 - 2 * a2)
    x_power_3 = sp.cancel(a1**3 - 3 * a1 * a2 + 3 * a3)
    reciprocal_y_power_3 = sp.cancel(
        degree
        + sp.Rational(3, 4) * x_power_1
        + sp.Rational(3, 16) * x_power_2
        + sp.Rational(1, 64) * x_power_3
    )
    third_moment_threshold_margin = None
    if not components_only:
        third_moment_threshold_margin = sp.cancel(
            shift_slope_denominator**3
            + q2**3
            * endpoint_margin_at_zero_shift**3
            * reciprocal_y_power_3
        )
    targets = {
        "tail_weyl_quadratic_lead": lead,
        "endpoint_bracket": endpoint_bracket,
        "endpoint_margin_at_zero_shift": endpoint_margin_at_zero_shift,
        "shift_slope_denominator": shift_slope_denominator,
        "current_last_cholesky_pivot": q2,
        "third_inverse_y_power_sum": reciprocal_y_power_3,
    }
    if third_moment_threshold_margin is not None:
        targets["third_moment_threshold_margin"] = third_moment_threshold_margin
    numerator_audits = []
    denominator_audits = []
    if not expressions_only:
        for name, expression in targets.items():
            numerator, _ = sp.fraction(sp.cancel(expression))
            audit = bernstein_audit(f"{name}_numerator", numerator)
            numerator_audits.append(audit)
            denominator_audits.extend(positive_denominator_factors(expression))

    return {
        "parity": parity,
        "r_specialization": r_value,
        "target_expressions": {name: str(value) for name, value in targets.items()},
        "numerator_audits": numerator_audits,
        "denominator_audits": denominator_audits,
        "expressions_only": expressions_only,
        "all_three_numerators_strictly_positive": (not expressions_only) and all(
            bool(record["strict_positive_bernstein_certificate"])
            for record in numerator_audits
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even", "both"), default="both")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--r-value", type=int)
    parser.add_argument("--expressions-only", action="store_true")
    parser.add_argument("--components-only", action="store_true")
    args = parser.parse_args()
    parities = ("odd", "even") if args.parity == "both" else (args.parity,)
    records = [
        one_parity(
            parity,
            args.r_value,
            args.expressions_only,
            args.components_only,
        )
        for parity in parities
    ]
    report = {
        "status": "GROUND_DEFLATED_TAIL_ENDPOINT_AUDIT",
        "records": records,
        "all_certified": all(
            bool(record["all_three_numerators_strictly_positive"])
            for record in records
        ),
        "scope": (
            "If certified, these fixed tail signs combine with the closest-root theorem "
            "to put the two roots of the tail-Weyl equality numerator outside [tau,1]."
        ),
    }
    output = args.output or HERE / "ground_deflated_tail_endpoint_audit_20260806.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "all_certified": report["all_certified"]}, indent=2))
    print(output)


if __name__ == "__main__":
    main()
