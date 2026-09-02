"""Small exact multivariate rational-function wrapper backed by python-flint.

SymPy's generic multivariate ``cancel`` can use several gigabytes on the tail
collision controls.  FLINT's native multivariate gcd arithmetic performs the
same exact reductions with much smaller intermediate objects.  This module is
deliberately minimal: it only implements the operations needed by the collision
certificate and provides lossless conversion to and from SymPy.
"""

from __future__ import annotations

from dataclasses import dataclass
from fractions import Fraction

import sympy as sp
from flint import fmpq, fmpq_mpoly, fmpq_mpoly_ctx


NAMES = ("r", "u", "v", "c")
CTX = fmpq_mpoly_ctx.get(NAMES, "lex")


def _sympy_poly_to_flint(value: sp.Expr, variables: tuple[sp.Symbol, ...]) -> fmpq_mpoly:
    polynomial = sp.Poly(sp.expand(value), *variables, domain=sp.QQ)
    return CTX.from_dict(
        {
            tuple(map(int, powers)): fmpq(int(coefficient.p), int(coefficient.q))
            for powers, coefficient in polynomial.terms()
        }
    )


def flint_poly_to_sympy(value: fmpq_mpoly, variables: tuple[sp.Symbol, ...]) -> sp.Expr:
    output = sp.Integer(0)
    for powers, coefficient in value.to_dict().items():
        monomial = sp.Rational(int(coefficient.p), int(coefficient.q))
        for variable, power in zip(variables, powers):
            monomial *= variable ** int(power)
        output += monomial
    return output


@dataclass(frozen=True)
class FlintRational:
    numerator: fmpq_mpoly
    denominator: fmpq_mpoly

    @classmethod
    def reduced(cls, numerator: fmpq_mpoly, denominator: fmpq_mpoly) -> "FlintRational":
        if denominator.is_zero():
            raise ZeroDivisionError
        if numerator.is_zero():
            return cls(CTX.constant(0), CTX.constant(1))
        common = numerator.gcd(denominator)
        return cls(numerator // common, denominator // common)

    @classmethod
    def from_sympy(
        cls, value: sp.Expr, variables: tuple[sp.Symbol, ...]
    ) -> "FlintRational":
        # ``fraction`` alone does not combine a sum of rational terms.  The
        # cached tail atoms are small enough to normalize once at this import
        # boundary; all large subsequent arithmetic remains inside FLINT.
        numerator, denominator = sp.fraction(sp.cancel(value))
        return cls.reduced(
            _sympy_poly_to_flint(numerator, variables),
            _sympy_poly_to_flint(denominator, variables),
        )

    @classmethod
    def constant(cls, value: int | Fraction | sp.Rational) -> "FlintRational":
        rational = sp.Rational(value)
        return cls(
            CTX.constant(fmpq(int(rational.p), int(rational.q))),
            CTX.constant(1),
        )

    def _coerce(self, other) -> "FlintRational":
        if isinstance(other, FlintRational):
            return other
        return self.constant(other)

    def __neg__(self) -> "FlintRational":
        return FlintRational(-self.numerator, self.denominator)

    def __add__(self, other) -> "FlintRational":
        other = self._coerce(other)
        common_denominator = self.denominator.gcd(other.denominator)
        left_denominator = self.denominator // common_denominator
        right_denominator = other.denominator // common_denominator
        numerator = (
            self.numerator * right_denominator
            + other.numerator * left_denominator
        )
        # For reduced inputs, any remaining common factor divides the old
        # denominator gcd.  Cancelling only there avoids a second large gcd.
        residual = numerator.gcd(common_denominator)
        denominator = left_denominator * (other.denominator // residual)
        return FlintRational(numerator // residual, denominator)

    def __radd__(self, other) -> "FlintRational":
        return self + other

    def __sub__(self, other) -> "FlintRational":
        return self + (-self._coerce(other))

    def __rsub__(self, other) -> "FlintRational":
        return self._coerce(other) - self

    def __mul__(self, other) -> "FlintRational":
        other = self._coerce(other)
        cross_left = self.numerator.gcd(other.denominator)
        cross_right = other.numerator.gcd(self.denominator)
        return FlintRational(
            (self.numerator // cross_left) * (other.numerator // cross_right),
            (self.denominator // cross_right) * (other.denominator // cross_left),
        )

    def __rmul__(self, other) -> "FlintRational":
        return self * other

    def reciprocal(self) -> "FlintRational":
        if self.numerator.is_zero():
            raise ZeroDivisionError
        return FlintRational.reduced(self.denominator, self.numerator)

    def __truediv__(self, other) -> "FlintRational":
        return self * self._coerce(other).reciprocal()

    def __rtruediv__(self, other) -> "FlintRational":
        return self._coerce(other) / self

    def __pow__(self, exponent: int) -> "FlintRational":
        if exponent < 0:
            return self.reciprocal() ** (-exponent)
        return FlintRational(self.numerator**exponent, self.denominator**exponent)

    def equals(self, other) -> bool:
        other = self._coerce(other)
        return self.numerator * other.denominator == other.numerator * self.denominator

    def term_counts(self) -> tuple[int, int]:
        return len(self.numerator), len(self.denominator)

    def evaluate(self, values) -> Fraction:
        converted = []
        for value in values:
            rational = sp.Rational(value)
            converted.append(fmpq(int(rational.p), int(rational.q)))
        numerator = self.numerator(*converted)
        denominator = self.denominator(*converted)
        quotient = numerator / denominator
        return Fraction(int(quotient.p), int(quotient.q))

    def to_sympy_pair(
        self, variables: tuple[sp.Symbol, ...]
    ) -> tuple[sp.Expr, sp.Expr]:
        return (
            flint_poly_to_sympy(self.numerator, variables),
            flint_poly_to_sympy(self.denominator, variables),
        )
