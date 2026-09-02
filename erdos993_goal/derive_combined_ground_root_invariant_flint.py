#!/usr/bin/env python3
"""Derive the continued-fraction invariant polynomial with FLINT.

The nested rational tail expressions are too large for a direct SymPy
``cancel``.  This script converts each already-reduced component to a FLINT
four-variable rational function and performs the exact arithmetic there.
"""

from __future__ import annotations

import argparse
import gc
import json
from pathlib import Path

import sympy as sp
from flint import fmpq, fmpq_mpoly, fmpq_mpoly_ctx


HERE = Path(__file__).resolve().parent
R, U, V, C = sp.symbols("r u v c")
CTX = fmpq_mpoly_ctx.get(["r", "u", "v", "c"])
RR, UU, VV, CC = CTX.gens()


def poly(value) -> fmpq_mpoly:
    if isinstance(value, fmpq_mpoly):
        return value
    if isinstance(value, fmpq):
        return CTX.constant(value)
    return CTX.constant(value)


class Rat:
    __slots__ = ("num", "den")

    def __init__(self, numerator=0, denominator=1, reduce: bool = True):
        numerator, denominator = poly(numerator), poly(denominator)
        if not denominator:
            raise ZeroDivisionError
        if reduce and numerator:
            common = numerator.gcd(denominator)
            if common != 1:
                numerator //= common
                denominator //= common
        if denominator.leading_coefficient() < 0:
            numerator, denominator = -numerator, -denominator
        unit = denominator.leading_coefficient()
        if unit != 1:
            numerator /= unit
            denominator /= unit
        self.num, self.den = numerator, denominator

    @staticmethod
    def coerce(value):
        return value if isinstance(value, Rat) else Rat(value)

    def __bool__(self):
        return bool(self.num)

    def __neg__(self):
        return Rat(-self.num, self.den, reduce=False)

    def __add__(self, other):
        other = self.coerce(other)
        common = self.den.gcd(other.den)
        left, right = self.den // common, other.den // common
        return Rat(self.num * right + other.num * left, left * other.den)

    __radd__ = __add__

    def __sub__(self, other):
        return self + (-self.coerce(other))

    def __rsub__(self, other):
        return self.coerce(other) - self

    def __mul__(self, other):
        other = self.coerce(other)
        if not self or not other:
            return Rat(0)
        cross1 = self.num.gcd(other.den)
        cross2 = other.num.gcd(self.den)
        return Rat(
            (self.num // cross1) * (other.num // cross2),
            (self.den // cross2) * (other.den // cross1),
            reduce=False,
        )

    __rmul__ = __mul__

    def reciprocal(self):
        if not self:
            raise ZeroDivisionError
        return Rat(self.den, self.num, reduce=False)

    def __truediv__(self, other):
        return self * self.coerce(other).reciprocal()

    def __rtruediv__(self, other):
        return self.coerce(other) / self

    def __pow__(self, exponent: int):
        if exponent < 0:
            return self.reciprocal() ** (-exponent)
        return Rat(self.num**exponent, self.den**exponent, reduce=False)


def flint_poly(expression: sp.Expr) -> fmpq_mpoly:
    polynomial = sp.Poly(expression, R, U, V, C, domain=sp.QQ)
    return CTX.from_dict(
        {
            monomial: fmpq(str(coefficient))
            for monomial, coefficient in polynomial.terms()
        }
    )


def parse_rat(value: str) -> Rat:
    expression = sp.sympify(value, locals={"r": R, "u": U, "v": V, "c": C})
    numerator, denominator = sp.fraction(expression)
    numerator_flint = flint_poly(numerator)
    denominator_flint = flint_poly(denominator)
    result = Rat(numerator_flint, denominator_flint)
    del expression, numerator, denominator, numerator_flint, denominator_flint
    gc.collect()
    return result


def degrees(terms) -> list[int]:
    materialized = list(terms)
    return [int(max(monomial[axis] for monomial, _ in materialized)) for axis in range(4)]


def serialize(polynomial: fmpq_mpoly):
    return [
        [[int(value) for value in monomial], str(coefficient)]
        for monomial, coefficient in polynomial.terms()
    ]


def derive(parity: str, factor: bool = False) -> dict[str, object]:
    components = json.loads(
        (HERE / f"ground_deflated_tail_endpoint_{parity}_symbolic_components_20260806.json").read_text(
            encoding="utf-8"
        )
    )["records"][0]["target_expressions"]
    tail = json.loads(
        (HERE / f"one_sided_darboux_{parity}_tail_cache_20260806.json").read_text(
            encoding="utf-8"
        )
    )["current"]
    g0 = parse_rat(components["endpoint_margin_at_zero_shift"])
    slope = parse_rat(components["shift_slope_denominator"])
    q2 = parse_rat(components["current_last_cholesky_pivot"])
    d_previous = parse_rat(tail["d_previous"])
    d_last = parse_rat(tail["d_last"])
    terminal = parse_rat(tail["terminal"])
    b_previous = parse_rat(tail["b_previous"])
    if parity == "odd":
        n, alpha, beta = Rat(RR + 4), Rat(2 * RR), Rat(fmpq(1, 2))
    else:
        n, alpha, beta = Rat(RR + 5), Rat(2 * RR + 1), Rat(fmpq(-1, 2))
    k = n - 1
    classical_diagonal = (
        alpha**2
        + alpha * beta
        + 2 * alpha * k
        + alpha
        + 2 * beta * k
        + beta
        + 2 * k**2
        + 2 * k
    ) / ((alpha + beta + 2 * k) * (alpha + beta + 2 * k + 2))
    classical_subdiagonal = (
        k
        * (alpha + k)
        * (beta + k)
        * (alpha + beta + k)
        / (
            (alpha + beta + 2 * k) ** 2
            * (alpha + beta + 2 * k - 1)
            * (alpha + beta + 2 * k + 1)
        )
    )
    threshold = -q2 * g0 / slope
    left = d_previous - threshold
    right = d_last - threshold
    schur_numerator = left * right - terminal
    # This is (positive denominator)^2 times M*(d_k-T-b_k*M)-1,
    # with M=schur_numerator/(b_previous*right).
    invariant = (
        schur_numerator
        * (classical_diagonal - threshold)
        * b_previous
        * right
        - classical_subdiagonal * schur_numerator**2
        - (b_previous * right) ** 2
    )
    numerator_terms = list(invariant.num.terms())
    denominator_terms = list(invariant.den.terms())
    report = {
        "status": "EXACT_CONTINUED_FRACTION_INVARIANT_DERIVATION",
        "parity": parity,
        "identity": (
            "invariant numerator has the sign of "
            "M*(d_classical-T-b_classical*M)-1 when b_previous, "
            "d_last-T, and the recorded denominator are positive"
        ),
        "invariant_numerator": serialize(invariant.num),
        "invariant_denominator": serialize(invariant.den),
        "numerator_terms": len(numerator_terms),
        "denominator_terms": len(denominator_terms),
        "numerator_degrees_r_u_v_c": degrees(numerator_terms),
        "denominator_degrees_r_u_v_c": degrees(denominator_terms),
    }
    if factor:
        numerator_unit, numerator_factors = invariant.num.factor()
        denominator_unit, denominator_factors = invariant.den.factor()
        report["numerator_factorization"] = {
            "unit": str(numerator_unit),
            "factors": [
                {
                    "exponent": int(exponent),
                    "terms": len(list(value.terms())),
                    "degrees_r_u_v_c": degrees(value.terms()),
                    "polynomial": serialize(value),
                }
                for value, exponent in numerator_factors
            ],
        }
        report["denominator_factorization"] = {
            "unit": str(denominator_unit),
            "factors": [
                {
                    "exponent": int(exponent),
                    "terms": len(list(value.terms())),
                    "degrees_r_u_v_c": degrees(value.terms()),
                    "polynomial": serialize(value),
                }
                for value, exponent in denominator_factors
            ],
        }
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--parity", choices=("odd", "even"), default="odd")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--factor", action="store_true")
    args = parser.parse_args()
    report = derive(args.parity, args.factor)
    output = args.output or HERE / f"combined_ground_root_invariant_{args.parity}_exact_20260806.json"
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {key: value for key, value in report.items() if "invariant_" not in key},
            indent=2,
        )
    )
    print(output)


if __name__ == "__main__":
    main()
