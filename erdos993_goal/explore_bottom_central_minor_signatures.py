#!/usr/bin/env python3
"""Classify signs of nonzero minors of K and KJ by index statistics."""

import itertools
from collections import defaultdict

import sympy as sp

from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


for d in range(3, 9):
    q = d - 1
    central = central_inverse_from_blocks(d).inv()
    reversed_form = central * reverse_identity(q)
    print(f"d={d}")
    for name, matrix in (("K", central), ("KJ", reversed_form)):
        stats = defaultdict(lambda: [0, 0, 0])
        examples = {}
        for order in range(1, q + 1):
            for rows in itertools.combinations(range(q), order):
                for columns in itertools.combinations(range(q), order):
                    value = sp.factor(matrix.extract(rows, columns).det())
                    key = (order, sum(rows) + sum(columns))
                    slot = 0 if value > 0 else 1 if value < 0 else 2
                    stats[key][slot] += 1
                    examples.setdefault((key, slot), (rows, columns, value))
        mixed = [
            (key, counts, examples.get((key, 0)), examples.get((key, 1)))
            for key, counts in stats.items()
            if counts[0] and counts[1]
        ]
        totals = [sum(counts[index] for counts in stats.values()) for index in range(3)]
        print(f"  {name}: totals(+,-,0)={totals}, mixed_index_classes={mixed[:3]}")
