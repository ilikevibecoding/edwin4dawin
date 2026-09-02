#!/usr/bin/env python3
"""Inspect shift-displacement ranks of the central symmetric form."""

import sympy as sp

from verify_bottom_universal_schur_tp import central_inverse_from_blocks, reverse_identity


for d in range(3, 13):
    q = d - 1
    shift = sp.zeros(q)
    for index in range(q - 1):
        shift[index, index + 1] = 1
    central_inverse = central_inverse_from_blocks(d)
    reversal = reverse_identity(q)
    central_form = central_inverse.inv() * reversal
    inverse_form = reversal * central_inverse
    central_ranks = [
        (central_form * shift**power - (shift.T) ** power * central_form).rank()
        for power in (1, 2, 3)
    ]
    inverse_ranks = [
        (inverse_form * shift**power - (shift.T) ** power * inverse_form).rank()
        for power in (1, 2, 3)
    ]
    print(d, central_ranks, inverse_ranks)
