#!/usr/bin/env python3
"""Verify an exact nonforest failure of terminal component (B).

Let D be the independence complex of the complete split graph with
an independent part X of size six and a clique U of size six, with
all X--U edges present.  Let J=D|U and add a new vertex p with link J.

At r=3, the comparison

    r D_r/D_(r-1) <= 1 + r (D+xJ)_r/(D+xJ)_(r-1)

fails by 1/7.  This shows that component (B) is not a generic
simplicial-complex or graph inequality; a forest proof must use
acyclicity/sparsity.
"""

from __future__ import annotations

from fractions import Fraction
from math import comb


r = 3
x_size = 6
u_size = 6

# D consists of every subset of X and the singleton subsets of U,
# with the empty face shared.
d = [
    1,
    x_size + u_size,
    comb(x_size, 2),
    comb(x_size, 3),
]

# J=D|U consists of the empty face and the six U singletons.
j = [1, u_size, 0, 0]

# B=D+xJ.
b = [
    d[rank] + (j[rank - 1] if rank else 0)
    for rank in range(4)
]

deletion_mean = Fraction(r * d[r], d[r - 1])
full_mean = Fraction(r * b[r], b[r - 1])
margin = 1 + full_mean - deletion_mean

assert d == [1, 12, 15, 20]
assert j == [1, 6, 0, 0]
assert b == [1, 13, 21, 20]
assert deletion_mean == 4
assert full_mean == Fraction(20, 7)
assert margin == Fraction(-1, 7)

coefficient_margin = (
    d[r - 1] ** 2
    + d[r - 1] * j[r - 2]
    + r
    * (
        d[r - 1] * j[r - 1]
        - d[r] * j[r - 2]
    )
)
assert coefficient_margin == -45

print("present-component dense split-graph failure: PASS")
print(f"D={d}, J={j}, D+xJ={b}")
print(
    f"rank {r}: 1+u_(D+xJ)-u_D = "
    f"{margin} = {float(margin):.12g}"
)
print(f"cleared coefficient margin = {coefficient_margin}")
