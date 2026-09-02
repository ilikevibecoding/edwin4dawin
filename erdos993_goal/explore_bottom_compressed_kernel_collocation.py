#!/usr/bin/env python3
"""Test opposite-order collocation of h_d(t,s)=sum H_ij t^i s^j on (0,1)."""

import sympy as sp

from verify_bottom_barycentric_sturm_reduction import super_ballot
from verify_bottom_universal_schur_tp import (
    central_inverse_from_blocks,
    neville_parameters,
    reverse_identity,
)


for d in range(3, 21):
    q = d - 1
    ballot = super_ballot(q)
    central_form = central_inverse_from_blocks(d).inv() * reverse_identity(q)
    compressed = sp.simplify(ballot * central_form * ballot.T)
    left_nodes = [sp.Rational(index + 1, q + 2) for index in range(q)]
    right_nodes = list(reversed(left_nodes))
    left = sp.Matrix(q, q, lambda row, power: left_nodes[row] ** power)
    right = sp.Matrix(q, q, lambda row, power: right_nodes[row] ** power)
    collocation = sp.simplify(left * compressed * right.T)
    try:
        row_data = neville_parameters(collocation)
        column_data = neville_parameters(collocation.T)
        parameters = [value for group in row_data + column_data for value in group]
        passing = all(value > 0 for value in parameters)
        first_bad = next((sp.factor(value) for value in parameters if value <= 0), None)
    except AssertionError as error:
        passing = False
        first_bad = str(error)
    print(f"d={d}: collocation_tp={passing}, first_bad={first_bad}")
