#!/usr/bin/env python3
"""Factor leading homogeneous u6 endpoint numerators for cone design."""

import sympy as sp
from sympy.polys.domains import QQ
from sympy.polys.fields import field

from probe_terminal_q3_m0_marked_isolate_hub_distance5_u6_sparse_ring_root import (
    delta_for,
    falling,
)


def factor_leading(label, expression, names):
    symbols = sp.symbols(" ".join(names))
    terms = expression.numer.terms()
    maximum = max(sum(monomial) for monomial, _ in terms)
    leading = sum(
        sp.Rational(str(coefficient))
        * sp.prod(symbol ** exponent for symbol, exponent in zip(symbols, monomial))
        for monomial, coefficient in terms
        if sum(monomial) == maximum
    )
    print(label, "degree", maximum, flush=True)
    print(sp.factor(leading), flush=True)


def main():
    _, q, v, y = field("q,v,y", QQ)
    a = q + v + y + 7
    b = q + y + 7
    j = y + 9
    n = a + b
    factor_leading(
        "middle_large",
        delta_for(a, b, j, falling(a, 6) / falling(n, 6), 0),
        ("q", "v", "y"),
    )
    factor_leading(
        "middle_small",
        delta_for(a, b, j, 0, falling(b, 6) / falling(n, 6)),
        ("q", "v", "y"),
    )

    _, r, s, y = field("r,s,y", QQ)
    b = r + 6
    j = r + y + 9
    a = r + y + s + 7
    n = a + b
    factor_leading(
        "tail_general",
        delta_for(a, b, j, falling(a, 6) / falling(n, 6), 0),
        ("r", "s", "y"),
    )


if __name__ == "__main__":
    main()
