#!/usr/bin/env python3
"""Verify two exact nonforest counterexamples to the broad TI lemma.

Let C be the independence complex of the complete multipartite graph
with one part of size 6 and thirteen parts of size 1.  Add a universal
vertex q, then add an isolated vertex z.  The terminal set is {q,z}.

The second example has parts 6,3,3,1,...,1 (nine singleton parts).
Its deletion sequence is unimodal.  The third is a split (hence
chordal) graph for which both the rooted base and its deletion are
unimodal.
"""

from fractions import Fraction
from math import comb


def verify(part_sizes: list[int], expected_burden: Fraction) -> None:
    # The independence complex of a complete multipartite graph is a
    # union of simplices, one for each part.
    degree = max(part_sizes)
    c = [0] * (degree + 1)
    c[0] = 1
    for size in part_sizes:
        for rank in range(1, size + 1):
            c[rank] += comb(size, rank)

    # A has a universal root q, hence I(A)=C+x.
    a = c + [0]
    a[1] += 1

    # z is isolated, hence B=(1+x)I(A).
    b = [
        (a[rank] if rank < len(a) else 0)
        + (a[rank - 1] if 0 <= rank - 1 < len(a) else 0)
        for rank in range(len(a) + 1)
    ]

    rank = 3
    u = Fraction(rank * b[rank], b[rank - 1])
    rho_previous = Fraction(
        b[rank - 1] - c[rank - 1], b[rank - 1]
    )
    rho = Fraction(b[rank] - c[rank], b[rank])
    burden = (
        rank * (u + 1) * rho_previous
        - (rank + 1) * u * rho
    )

    assert burden == expected_burden

    deletion_unimodal = all(
        c[index] >= c[index - 1]
        for index in range(1, c.index(max(c)) + 1)
    ) and all(
        c[index] <= c[index - 1]
        for index in range(c.index(max(c)) + 1, len(c))
    )
    base_unimodal = all(
        a[index] >= a[index - 1]
        for index in range(1, a.index(max(a)) + 1)
    ) and all(
        a[index] <= a[index - 1]
        for index in range(a.index(max(a)) + 1, len(a))
    )

    print(f"parts={part_sizes}")
    print(f"order={sum(part_sizes) + 2}")
    print(f"deletion_coefficients={c}")
    print(f"deletion_unimodal={deletion_unimodal}")
    print(f"base_coefficients={a}")
    print(f"base_unimodal={base_unimodal}")
    print(f"rank={rank}")
    print(f"b_2={b[2]} b_3={b[3]}")
    print(f"c_2={c[2]} c_3={c[3]}")
    print(f"u={u}")
    print(f"rho_2={rho_previous} rho_3={rho}")
    print(f"burden={burden} > 0")


def main() -> None:
    verify([6] + [1] * 13, Fraction(12, 7))
    print()
    verify([6, 3, 3] + [1] * 9, Fraction(12, 43))
    print()
    verify([7] + [1] * 13, Fraction(3, 2))


if __name__ == "__main__":
    main()
