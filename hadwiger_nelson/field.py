"""Exact arithmetic in the multiquadratic field K = Q(sqrt 3, sqrt 5, sqrt 7, sqrt 11).

Every coordinate appearing in the unit-distance graphs of this package lives in K:

* the triangular lattice and de Grey's point set S contribute sqrt(3) and sqrt(11)
  (and sqrt(33) = sqrt(3) * sqrt(11)),
* the rotation by 2*arcsin(1/4) has (cos, sin) = (7/8, sqrt(15)/8), contributing sqrt(5),
* the rotations by pi/2 +- arcsin(1/8) have (cos, sin) = (-+1/8, 3*sqrt(7)/8),
  contributing sqrt(7).

Since 3, 5, 7, 11 are distinct primes, the 16 products sqrt(prod T) for T a subset of
{3, 5, 7, 11} form a Q-basis of K, so an element has a *unique* coefficient vector and
equality testing is exact.  Elements are stored as a length-16 tuple of Fractions indexed
by the bitmask of T.
"""

from __future__ import annotations

import math
from fractions import Fraction
from typing import Iterable, Sequence

RADICANDS: tuple[int, ...] = (3, 5, 7, 11)
DIM = 1 << len(RADICANDS)

_ZERO = Fraction(0)

# _FACTOR[m] = product of the radicands selected by bitmask m.  Used for multiplication:
# sqrt(a)*sqrt(b) contributes the rational factor prod(a & b) to the basis element a ^ b.
_FACTOR: tuple[int, ...] = tuple(
    math.prod(r for i, r in enumerate(RADICANDS) if m >> i & 1) for m in range(DIM)
)

_NUMERIC_BASIS: tuple[float, ...] = tuple(float(math.isqrt(f)) if math.isqrt(f) ** 2 == f else math.sqrt(f) for f in _FACTOR)


class Alg:
    """An element of K, i.e. sum_m c[m] * sqrt(_FACTOR[m])."""

    __slots__ = ("c",)

    def __init__(self, coeffs: Sequence[Fraction] | None = None) -> None:
        if coeffs is None:
            self.c: tuple[Fraction, ...] = (_ZERO,) * DIM
        else:
            if len(coeffs) != DIM:
                raise ValueError(f"expected {DIM} coefficients, got {len(coeffs)}")
            self.c = tuple(coeffs)

    # -- constructors ---------------------------------------------------------------
    @staticmethod
    def rational(value: Fraction | int) -> "Alg":
        coeffs = [_ZERO] * DIM
        coeffs[0] = Fraction(value)
        return Alg(coeffs)

    @staticmethod
    def sqrt(radicand: int) -> "Alg":
        """sqrt(radicand) for any radicand that is a product of a square and a subset of RADICANDS."""
        square = 1
        remaining = radicand
        for p in (2, 3, 5, 7, 11, 13):
            while remaining % (p * p) == 0:
                remaining //= p * p
                square *= p
        mask = _FACTOR.index(remaining) if remaining in _FACTOR else -1
        if mask < 0:
            raise ValueError(f"sqrt({radicand}) does not lie in {RADICANDS}-multiquadratic field")
        coeffs = [_ZERO] * DIM
        coeffs[mask] = Fraction(square)
        return Alg(coeffs)

    # -- ring operations ------------------------------------------------------------
    def __add__(self, other: "Alg") -> "Alg":
        return Alg([a + b for a, b in zip(self.c, other.c)])

    def __sub__(self, other: "Alg") -> "Alg":
        return Alg([a - b for a, b in zip(self.c, other.c)])

    def __neg__(self) -> "Alg":
        return Alg([-a for a in self.c])

    def __mul__(self, other: "Alg | Fraction | int") -> "Alg":
        if not isinstance(other, Alg):
            f = Fraction(other)
            return Alg([a * f for a in self.c])
        out = [_ZERO] * DIM
        for i, a in enumerate(self.c):
            if a:
                for j, b in enumerate(other.c):
                    if b:
                        out[i ^ j] += a * b * _FACTOR[i & j]
        return Alg(out)

    __rmul__ = __mul__

    def __truediv__(self, other: Fraction | int) -> "Alg":
        f = Fraction(other)
        return Alg([a / f for a in self.c])

    def square(self) -> "Alg":
        return self * self

    # -- comparison / hashing -------------------------------------------------------
    def is_zero(self) -> bool:
        return not any(self.c)

    def __eq__(self, other: object) -> bool:
        return isinstance(other, Alg) and self.c == other.c

    def __hash__(self) -> int:
        return hash(self.c)

    def __float__(self) -> float:
        return math.fsum(float(a) * b for a, b in zip(self.c, _NUMERIC_BASIS) if a)

    def __repr__(self) -> str:
        parts = []
        for m, a in enumerate(self.c):
            if not a:
                continue
            parts.append(str(a) if m == 0 else f"{a}*sqrt{_FACTOR[m]}")
        return " + ".join(parts) if parts else "0"

    # -- reduction to a finite field ------------------------------------------------
    def mod_p(self, roots: Sequence[int], p: int) -> int:
        """Image under the ring homomorphism K -> F_p sending sqrt(RADICANDS[i]) to roots[i].

        `roots[i]` must satisfy roots[i]^2 == RADICANDS[i] (mod p), and p must not divide
        any coefficient denominator.  Because this is a ring homomorphism, a zero element
        always maps to 0; that one-sided guarantee is what makes the modular pre-filter in
        `geometry.py` free of false negatives.
        """
        basis = _basis_mod_p(roots, p)
        total = 0
        for m, a in enumerate(self.c):
            if a:
                total += (a.numerator % p) * pow(a.denominator, -1, p) % p * basis[m]
        return total % p


def _basis_mod_p(roots: Sequence[int], p: int) -> list[int]:
    basis = [1] * DIM
    for m in range(1, DIM):
        low = m & -m
        i = low.bit_length() - 1
        basis[m] = basis[m ^ low] * roots[i] % p
    return basis


ZERO = Alg.rational(0)
ONE = Alg.rational(1)


def rat(numerator: int, denominator: int = 1) -> Alg:
    return Alg.rational(Fraction(numerator, denominator))


def combo(*terms: tuple[Fraction | int, int]) -> Alg:
    """Build sum(coefficient * sqrt(radicand)) from (coefficient, radicand) pairs."""
    total = Alg()
    for coefficient, radicand in terms:
        total = total + Alg.sqrt(radicand) * Fraction(coefficient)
    return total


def find_prime_with_roots(radicands: Iterable[int] = RADICANDS, lower: int = 10**9) -> tuple[int, tuple[int, ...]]:
    """Smallest prime p >= lower such that every radicand is a quadratic residue mod p.

    Returns (p, roots).  p is kept below 2^31 so that products of residues stay inside
    int64 and the pairwise filter can be vectorised with numpy.
    """
    radicands = tuple(radicands)
    candidate = lower | 1
    while True:
        if _is_prime(candidate) and all(pow(r, (candidate - 1) // 2, candidate) == 1 for r in radicands):
            roots = tuple(_sqrt_mod_p(r, candidate) for r in radicands)
            return candidate, roots
        candidate += 2


def _is_prime(n: int) -> bool:
    if n < 2:
        return False
    for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        if n % p == 0:
            return n == p
    d, s = n - 1, 0
    while d % 2 == 0:
        d //= 2
        s += 1
    for a in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
        x = pow(a, d, n)
        if x in (1, n - 1):
            continue
        for _ in range(s - 1):
            x = x * x % n
            if x == n - 1:
                break
        else:
            return False
    return True


def _sqrt_mod_p(a: int, p: int) -> int:
    """Tonelli-Shanks."""
    a %= p
    if a == 0:
        return 0
    if p % 4 == 3:
        return pow(a, (p + 1) // 4, p)
    q, s = p - 1, 0
    while q % 2 == 0:
        q //= 2
        s += 1
    z = 2
    while pow(z, (p - 1) // 2, p) != p - 1:
        z += 1
    m, c, t, r = s, pow(z, q, p), pow(a, q, p), pow(a, (q + 1) // 2, p)
    while t != 1:
        i, t2 = 0, t
        while t2 != 1:
            t2 = t2 * t2 % p
            i += 1
        b = pow(c, 1 << (m - i - 1), p)
        m, c = i, b * b % p
        t = t * c % p
        r = r * b % p
    return r
