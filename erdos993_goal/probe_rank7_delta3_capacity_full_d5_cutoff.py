#!/usr/bin/env python3
"""Repair Delta3's fake root corner while retaining the full D5 interval."""

from __future__ import annotations

import argparse
from pathlib import Path

import sympy as sp

from explore_rank4_three_halves_grouped import minimum_with_index, tensor_bernstein_fast


SOURCE = Path(__file__).with_name("probe_rank7_terminal_broom_delta3_full_d5_cutoff.py")
REPLACEMENTS = {
    'T, W, A = sp.symbols("T W A", nonnegative=True)':
        'T, W, A, S = sp.symbols("T W A S", nonnegative=True)',
    '''s_value = sp.S.One if es else sp.Rational(1, 2)
    root_d = sp.S.One if ed else sp.Rational(1, 2)''':
        '''K = sp.factor((n - 6) * x6 / 5)
    s0 = sp.factor(1 - 1 / (2 * K))
    s_value = sp.factor(s0 + (1 - s0) * S)
    root_d = sp.factor(1 - K * (1 - s_value))
    assert sp.factor(root_d - (sp.Rational(1, 2) + S / 2)) == 0''',
    'source_variables = (n, w, x, U, V)':
        'source_variables = (n, w, x, U, V, S)',
    'box = (T, W, A, U, V)':
        'box = (T, W, A, U, V, S)',
    'for mapped_value in (order, w_value, x_value, U, V):':
        'for mapped_value in (order, w_value, x_value, U, V, S):',
}


def load():
    text = SOURCE.read_text(encoding="utf-8")
    for old, new in REPLACEMENTS.items():
        assert text.count(old) == 1, old
        text = text.replace(old, new)
    namespace = {
        "__name__": "rank7_delta3_capacity_full_d5_cutoff_module",
        "__file__": str(SOURCE),
    }
    exec(compile(text, str(SOURCE), "exec"), namespace)
    return namespace


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cutoff", type=int, required=True)
    args = parser.parse_args()
    namespace = load()
    numerator, denominator, box = namespace["mapped"](args.cutoff, (0, 1, 0))
    npoly = sp.Poly(numerator, *box, domain=sp.QQ)
    print("capacity 5*i5(J)<=(m-4)*i4(J), m<=n-2", flush=True)
    print("full_D5 retained", flush=True)
    print("terms", len(npoly.terms()), "degrees", npoly.degree_list(), flush=True)
    ddegrees, dcoefficients = tensor_bernstein_fast(denominator, box)
    dminimum, dindex = minimum_with_index(dcoefficients)
    print("denominator", ddegrees, dcoefficients.size, dminimum, dindex, flush=True)
    assert dminimum >= 0
    degrees, coefficients = tensor_bernstein_fast(numerator, box)
    minimum, index = minimum_with_index(coefficients)
    print("numerator", degrees, coefficients.size, minimum, index, flush=True)
    assert minimum >= 0
    print("PASS_DELTA3_CAPACITY_FULL_D5_CUTOFF", args.cutoff)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
