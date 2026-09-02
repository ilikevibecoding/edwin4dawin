#!/usr/bin/env python3
"""Print the leading homogeneous forms of the failed u6 endpoint charts."""

from sympy.polys.domains import QQ
from sympy.polys.fields import field

from probe_terminal_q3_m0_marked_isolate_hub_distance5_u6_sparse_ring_root import (
    delta_for,
    falling,
)


def show(label, expression):
    terms = expression.numer.terms()
    maximum = max(sum(monomial) for monomial, _ in terms)
    leading = [
        (monomial, coefficient)
        for monomial, coefficient in terms
        if sum(monomial) == maximum
    ]
    print(label, "degree", maximum, "terms", len(leading))
    for monomial, coefficient in leading:
        print(monomial, coefficient)


def main():
    _, q, v, y = field("q,v,y", QQ)
    a = q + v + y + 7
    b = q + y + 7
    j = y + 9
    n = a + b
    show(
        "middle_large",
        delta_for(a, b, j, falling(a, 6) / falling(n, 6), 0),
    )
    show(
        "middle_small",
        delta_for(a, b, j, 0, falling(b, 6) / falling(n, 6)),
    )

    _, r, s, y = field("r,s,y", QQ)
    b = r + 6
    j = r + y + 9
    a = r + y + s + 7
    n = a + b
    show(
        "tail_general",
        delta_for(a, b, j, falling(a, 6) / falling(n, 6), 0),
    )


if __name__ == "__main__":
    main()
