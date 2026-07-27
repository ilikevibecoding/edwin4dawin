import math
from fractions import Fraction

import pytest

from hadwiger_nelson.field import (
    DIM,
    RADICANDS,
    Alg,
    find_prime_with_roots,
    rat,
)


def test_basis_dimension():
    assert DIM == 16


@pytest.mark.parametrize("r", RADICANDS)
def test_sqrt_squares_to_rational(r):
    assert Alg.sqrt(r).square() == rat(r)


def test_sqrt_extracts_square_factors():
    assert Alg.sqrt(63) == Alg.sqrt(7) * 3
    assert Alg.sqrt(12) == Alg.sqrt(3) * 2
    assert Alg.sqrt(33) == Alg.sqrt(3) * Alg.sqrt(11)


def test_sqrt_rejects_outside_field():
    with pytest.raises(ValueError):
        Alg.sqrt(2)


def test_products_of_distinct_radicals_are_independent():
    """A nonzero rational combination of the 16 basis elements is nonzero."""
    element = Alg.sqrt(3) + Alg.sqrt(5) * 2 - Alg.sqrt(77) * Fraction(1, 3)
    assert not element.is_zero()
    assert element - element == Alg()


def test_arithmetic_matches_floats():
    a = Alg.sqrt(3) * Fraction(5, 6) - Alg.sqrt(11) / 4 + rat(2, 7)
    b = Alg.sqrt(15) + rat(1, 3)
    for expected, actual in (
        (float(a) + float(b), float(a + b)),
        (float(a) - float(b), float(a - b)),
        (float(a) * float(b), float(a * b)),
    ):
        assert math.isclose(expected, actual, rel_tol=1e-12, abs_tol=1e-12)


def test_rotation_identity_cos2_plus_sin2():
    """cos = 7/8, sin = sqrt(15)/8 is the rotation by 2*arcsin(1/4)."""
    cos, sin = rat(7, 8), Alg.sqrt(15) / 8
    assert cos.square() + sin.square() == rat(1)


def test_modular_reduction_is_a_ring_homomorphism():
    p, roots = find_prime_with_roots()
    a = Alg.sqrt(33) * Fraction(2, 3) + rat(5, 7)
    b = Alg.sqrt(5) - Alg.sqrt(7) * 4
    assert (a * b).mod_p(roots, p) == a.mod_p(roots, p) * b.mod_p(roots, p) % p
    assert (a + b).mod_p(roots, p) == (a.mod_p(roots, p) + b.mod_p(roots, p)) % p


def test_modular_reduction_sends_zero_to_zero():
    """The property the edge filter relies on: no unit-distance pair can be missed."""
    p, roots = find_prime_with_roots()
    zero = Alg.sqrt(12) - Alg.sqrt(3) * 2
    assert zero.is_zero()
    assert zero.mod_p(roots, p) == 0


def test_prime_has_all_square_roots():
    p, roots = find_prime_with_roots()
    for r, root in zip(RADICANDS, roots):
        assert root * root % p == r % p
