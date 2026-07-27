"""Exact arithmetic in the real field Q(sqrt(3), sqrt(5), sqrt(11)).

Every element is a Q-linear combination of the eight basis radicals

    { sqrt(d) : d a squarefree divisor of 165 } = {1, sqrt3, sqrt5, sqrt11,
                                                   sqrt15, sqrt33, sqrt55, sqrt165}

which is closed under multiplication, so all arithmetic below is exact
(coefficients are `fractions.Fraction`).  This field contains every vertex
coordinate of the known small 5-chromatic unit-distance graphs (de Grey /
Heule / Parts), whose coordinates involve sqrt(3), sqrt(5), sqrt(11) and
their products.
"""

from __future__ import annotations

import math
from fractions import Fraction
from typing import Dict, Union

#: squarefree divisors of 165 = 3 * 5 * 11
BASIS = (1, 3, 5, 11, 15, 33, 55, 165)
_PRIMES = (3, 5, 11)

Rational = Union[int, Fraction]


class QF:
    """An element of Q(sqrt3, sqrt5, sqrt11), stored as {d: coeff of sqrt(d)}."""

    __slots__ = ("c",)

    def __init__(self, coeffs: Dict[int, Rational] | None = None):
        c: Dict[int, Fraction] = {}
        if coeffs:
            for d, q in coeffs.items():
                if d not in BASIS:
                    raise ValueError(f"{d} is not a squarefree divisor of 165")
                q = Fraction(q)
                if q != 0:
                    c[d] = q
        self.c = c

    # -- constructors ------------------------------------------------------
    @staticmethod
    def rational(q: Rational) -> "QF":
        return QF({1: Fraction(q)})

    @staticmethod
    def sqrt_rational(q: Rational) -> "QF":
        """Exact square root of a nonnegative rational, if it lies in the field.

        sqrt(p/q) = sqrt(p*q)/q; the squarefree part of p*q must divide 165.
        """
        q = Fraction(q)
        if q < 0:
            raise ValueError("negative radicand")
        if q == 0:
            return QF()
        n = q.numerator * q.denominator
        square, squarefree = 1, 1
        f = 2
        while f * f <= n:
            while n % (f * f) == 0:
                square *= f
                n //= f * f
            if n % f == 0:
                squarefree *= f
                n //= f
            f += 1
        squarefree *= n  # leftover prime
        if squarefree not in BASIS:
            raise ValueError(f"sqrt of {q}: squarefree part {squarefree} not in field")
        return QF({squarefree: Fraction(square, q.denominator)})

    # -- ring operations ---------------------------------------------------
    def _coerce(self, other) -> "QF":
        if isinstance(other, QF):
            return other
        if isinstance(other, (int, Fraction)):
            return QF.rational(other)
        return NotImplemented

    def __add__(self, other):
        o = self._coerce(other)
        if o is NotImplemented:
            return o
        c = dict(self.c)
        for d, q in o.c.items():
            c[d] = c.get(d, Fraction(0)) + q
        return QF(c)

    __radd__ = __add__

    def __neg__(self):
        return QF({d: -q for d, q in self.c.items()})

    def __sub__(self, other):
        o = self._coerce(other)
        if o is NotImplemented:
            return o
        return self + (-o)

    def __rsub__(self, other):
        return -(self - other)

    def __mul__(self, other):
        o = self._coerce(other)
        if o is NotImplemented:
            return o
        c: Dict[int, Fraction] = {}
        for d1, q1 in self.c.items():
            for d2, q2 in o.c.items():
                g = math.gcd(d1, d2)
                d = (d1 // g) * (d2 // g)  # squarefree, divides 165
                c[d] = c.get(d, Fraction(0)) + q1 * q2 * g
        return QF(c)

    __rmul__ = __mul__

    def conjugate(self, p: int) -> "QF":
        """Field automorphism sending sqrt(p) -> -sqrt(p) for p in {3, 5, 11}."""
        return QF({d: (-q if d % p == 0 else q) for d, q in self.c.items()})

    def inverse(self) -> "QF":
        """Multiplicative inverse, by rationalising with the 3 conjugations."""
        if not self.c:
            raise ZeroDivisionError("inverse of zero")
        num = QF.rational(1)
        den = self
        for p in _PRIMES:
            conj = den.conjugate(p)
            num = num * conj
            den = den * conj  # now fixed by sqrt(p) -> -sqrt(p)
        # den is rational now
        assert set(den.c) <= {1}, "rationalisation failed"
        return num * QF.rational(1 / den.c[1])

    def __truediv__(self, other):
        o = self._coerce(other)
        if o is NotImplemented:
            return o
        return self * o.inverse()

    def __rtruediv__(self, other):
        return self._coerce(other) * self.inverse()

    def __pow__(self, n: int):
        if n < 0:
            return self.inverse() ** (-n)
        out = QF.rational(1)
        for _ in range(n):
            out = out * self
        return out

    # -- predicates / conversions ------------------------------------------
    def __eq__(self, other):
        o = self._coerce(other)
        if o is NotImplemented:
            return o
        return self.c == o.c

    def __hash__(self):
        return hash(frozenset(self.c.items()))

    def is_rational(self) -> bool:
        return set(self.c) <= {1}

    def as_rational(self) -> Fraction:
        if not self.is_rational():
            raise ValueError(f"{self} is irrational")
        return self.c.get(1, Fraction(0))

    def __float__(self) -> float:
        return float(sum(float(q) * math.sqrt(d) for d, q in self.c.items()))

    def __repr__(self):
        if not self.c:
            return "0"
        parts = []
        for d in BASIS:
            if d in self.c:
                q = self.c[d]
                parts.append(str(q) if d == 1 else f"{q}*sqrt{d}")
        return " + ".join(parts).replace("+ -", "- ")


def dist2(p, q) -> QF:
    """Exact squared euclidean distance between points p, q (pairs of QF)."""
    dx = p[0] - q[0]
    dy = p[1] - q[1]
    return dx * dx + dy * dy
