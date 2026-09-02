"""Search whether vertical gamma compatibility holds for arbitrary PF rows."""

from __future__ import annotations

import random
from fractions import Fraction

from verify_aligned_endpoint_three_ray_reduction import add, mixed_gamma
from verify_endpoint_fg_parameter_derivative_reduction import real_rooted


def mul(a, b):
    out = [Fraction(0)] * (len(a) + len(b) - 1)
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            out[i + j] += x * y
    return out


def main():
    rng = random.Random(20260813)
    for trial in range(5000):
        degree = rng.randint(3, 12)
        a = [Fraction(1)]
        for _ in range(degree):
            a = mul(a, [Fraction(1), Fraction(rng.randint(1, 50), rng.randint(1, 20))])
        s = rng.randint(1, 2 * degree - 1)
        top = mixed_gamma(a, a, s)
        low = [Fraction(0)] + mixed_gamma(a, a, s - 1)
        for q in (Fraction(1, 1000), Fraction(1), Fraction(1000)):
            if not real_rooted(add(top, low, q)):
                print("FAIL", trial, degree, s, q, a)
                return
    print("PASS")

    # Mixed-principal-minor vertical test with an arbitrary interlacing row.
    for trial in range(5000):
        degree = rng.randint(3, 10)
        roots = sorted(Fraction(rng.randint(1, 80), rng.randint(1, 20)) for _ in range(degree))
        # A(v)=prod(1+root*v).  Pick B roots strictly between those of A;
        # in the reciprocal spectral coordinate this is a generic principal
        # compression pattern.
        a = [Fraction(1)]
        for root in roots:
            a = mul(a, [Fraction(1), root])
        broots = [(roots[i] + roots[i + 1]) / 2 for i in range(degree - 1)]
        b = [Fraction(1)]
        for root in broots:
            b = mul(b, [Fraction(1), root])
        s = rng.randint(1, 2 * degree - 1)
        top = mixed_gamma(a, a, s)
        deletion = [Fraction(0)] + mixed_gamma(b, a, s - 1)
        for q in (Fraction(1, 1000), Fraction(1), Fraction(1000)):
            if not real_rooted(add(top, deletion, q)):
                print("MIXED FAIL", trial, degree, s, q, roots)
                return
    print("MIXED PASS")


if __name__ == "__main__":
    main()
