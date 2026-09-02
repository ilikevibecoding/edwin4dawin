#!/usr/bin/env python3
"""Test whether the symmetric rank-deficient Q1 form is a Bezout matrix."""

from __future__ import annotations

import sympy as sp

from verify_bottom_reverse_tp_offdiagonal_homotopy import homotopy_data
from verify_bottom_universal_schur_tp import reverse_identity


for d in range(3, 31):
    q = d - 1
    _, _, _, q1, _ = homotopy_data(d)
    form = sp.simplify(q1 * reverse_identity(q))
    shift = sp.zeros(q)
    for index in range(q - 1):
        shift[index, index + 1] = 1
    displacements = {
        "form*S-ST*form": form * shift - shift.T * form,
        "S*form-form*ST": shift * form - form * shift.T,
        "form*ST-S*form": form * shift.T - shift * form,
        "ST*form-form*S": shift.T * form - form * shift,
    }
    ranks = {name: matrix.rank() for name, matrix in displacements.items()}
    print(f"d={d} q={q} ranks={ranks}", flush=True)
