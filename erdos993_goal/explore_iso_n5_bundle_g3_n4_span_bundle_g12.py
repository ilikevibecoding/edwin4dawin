#!/usr/bin/env python3
"""Search exact low-rank functional decompositions of rank-five bundle g3.

Discovery only.  A successful identity is useful because every candidate row
has a direct graph interpretation; an infeasible span is recorded as a failed
relaxation, not as evidence about the sign of g3.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from derive_iso_n4_bundle_polynomial_root import add_xd, isolate_multiply, nested_rank


HERE = Path(__file__).resolve().parent


def coefficient_vector(expressions):
    monomials = sorted(
        set().union(*(sp.Poly(sp.expand(e), *SYMBOLS).monoms() for e in expressions)),
        reverse=True,
    )
    vectors = []
    for expression in expressions:
        table = dict(sp.Poly(sp.expand(expression), *SYMBOLS).terms())
        vectors.append(sp.Matrix([table.get(monomial, 0) for monomial in monomials]))
    return monomials, vectors


root = json.loads((HERE / "iso_n5_whole_bundle_binomial_symbolic_root_20260829.json").read_text())
G3 = sp.sympify(root["binomial_coefficients"][3]["factor"])
C = tuple(tuple(sp.symbols(f"c{name}0:7")) for name in "EUVW")
D = tuple(tuple(sp.symbols(f"d{name}0:7")) for name in "EUVW")
SYMBOLS = tuple(sorted(G3.free_symbols, key=str))


def main():
    candidates = {}
    for number in range(7):
        candidates[f"N4_T{number}"] = nested_rank(
            add_xd(isolate_multiply(C, number, 6), D), 4
        )
        candidates[f"N4_C{number}"] = nested_rank(isolate_multiply(C, number, 6), 4)
        candidates[f"N4_D{number}"] = nested_rank(isolate_multiply(D, number, 6), 4)

    names = list(candidates)
    monomials, vectors = coefficient_vector([G3] + [candidates[name] for name in names])
    matrix = sp.Matrix.hstack(*vectors[1:])
    target = vectors[0]
    solution = sp.linsolve((matrix, target))
    print("monomials", len(monomials), "candidates", len(names), "rank", matrix.rank())
    print("solution", solution)


if __name__ == "__main__":
    main()
