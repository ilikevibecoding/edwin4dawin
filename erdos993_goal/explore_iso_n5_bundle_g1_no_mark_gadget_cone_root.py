#!/usr/bin/env python3
"""Search proved-gadget cones for the no-mark-root rank-five g1 form.

This is a discovery helper, not a theorem certificate.  In the no-mark-root
mode D=C.  We ask whether the exact g1 form is a nonnegative linear
combination of already available fixed-rank forest functionals evaluated on
small leaf-star gadgets over the same marked four-minor cell.
"""

from __future__ import annotations

import itertools
import json
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog

import derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein as canonical


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def add_isolates(row, number, maximum=6):
    return tuple(
        sp.expand(sum(sp.binomial(number, j) * at(row, rank - j) for j in range(rank + 1)))
        for rank in range(maximum + 1)
    )


def add_xd(crow, drow):
    return tuple(sp.expand(at(crow, rank) + at(drow, rank - 1)) for rank in range(7))


def q(row, rank):
    return sp.expand(
        rank * at(row, rank) ** 2
        + at(row, rank - 1) ** 2
        - (rank + 1) * at(row, rank - 1) * at(row, rank + 1)
    )


def strong_q(row, rank):
    return sp.expand(2 * q(row, rank) - at(row, rank - 1) * at(row, rank))


def h_reserve(row):
    return sp.expand(
        2 * at(row, 1) * at(row, 4) - 5 * at(row, 1) * at(row, 5)
        - 6 * at(row, 1) * at(row, 6) + 6 * at(row, 2) * at(row, 3)
        - 8 * at(row, 2) * at(row, 5) + 5 * at(row, 3) ** 2
        + 6 * at(row, 3) * at(row, 4)
    )


def leaf_d(left, right, rank):
    return sp.expand(
        at(right, rank - 1) ** 2
        + 2 * rank * at(left, rank) * at(right, rank - 1)
        + 2 * at(left, rank - 1) * at(right, rank - 2)
        - (rank + 1) * at(left, rank - 1) * at(right, rank)
        - (rank + 1) * at(right, rank - 2) * at(left, rank + 1)
        - at(right, rank - 2) * at(right, rank)
    )


def cross(rows, rank):
    _e, u, v, w = rows
    p = tuple(at(u, index) + at(w, index - 1) for index in range(7))
    return sp.expand(q(p, rank) + leaf_d(v, w, rank))


def main():
    crows, drows, raw_g1, _raw_g2 = canonical.raw_coefficients()
    d_equals_c = {
        dsymbol: csymbol
        for drow, crow in zip(drows, crows)
        for dsymbol, csymbol in zip(drow, crow)
    }
    target = sp.expand(raw_g1.subs(d_equals_c))
    compact = json.loads(
        (Path(__file__).resolve().parent / "iso_n5_bundle_g1_no_mark_root_compact_root_20260829.json")
        .read_text(encoding="utf-8")
    )
    named_targets = {
        "g1": target,
        "M5": sp.sympify(compact["raw_forms"]["M5"]),
        "C5": sp.sympify(compact["raw_forms"]["C5"]),
        "M5_plus_3C5": sp.sympify(compact["raw_forms"]["M5_plus_3C5"]),
        "N4": sp.sympify(compact["raw_forms"]["N4"]),
    }

    # The underlying no-mark-root base is represented by C together with a
    # support s and a variable number of sibling leaves.  Deleting s removes
    # the shifted C contribution because D=C in this mode.
    def graph_row(number, deleted):
        index = int("u" in deleted) + 2 * int("v" in deleted)
        remaining = number - sum(name.startswith("a") for name in deleted)
        cpart = add_isolates(crows[index], remaining)
        if "s" in deleted:
            return cpart
        return add_xd(cpart, crows[index])

    def four_rows(number, first, second):
        return tuple(
            graph_row(number, deleted)
            for deleted in (set(), {first}, {second}, {first, second})
        )

    candidates = []
    # Direct marked forest C and its isolate shifts are legitimate inputs to
    # the same proved fixed-rank functionals and include the all-N4 payment.
    for isolates in range(9):
        rows = tuple(add_isolates(row, isolates) for row in crows)
        for kind, expression in (
            ("C4", cross(rows, 4)), ("C5", cross(rows, 5)),
            ("Q4", q(rows[0], 4)), ("Q5", q(rows[0], 5)),
            ("S4", strong_q(rows[0], 4)), ("S5", strong_q(rows[0], 5)),
            ("N3", sp.expand(canonical.nested(rows, 3))),
            ("N4", sp.expand(canonical.nested(rows, 4))),
            *(tuple((f"H_{name}", h_reserve(row)) for name, row in zip("EUVW", rows))),
        ):
            if expression != 0:
                candidates.append((f"{kind}:C+{isolates}K1", expression))
    for number in range(7):
        vertices = ["u", "v", "s", *(f"a{j}" for j in range(number))]
        seen = set()
        for first, second in itertools.combinations(vertices, 2):
            rows = four_rows(number, first, second)
            expressions = (
                ("C4", cross(rows, 4)),
                ("C5", cross(rows, 5)),
                ("Q4", q(rows[0], 4)),
                ("Q5", q(rows[0], 5)),
                ("S4", strong_q(rows[0], 4)),
                ("S5", strong_q(rows[0], 5)),
                ("N3", sp.expand(canonical.nested(rows, 3))),
                ("N4", sp.expand(canonical.nested(rows, 4))),
                *(tuple((f"H_{name}", h_reserve(row)) for name, row in zip("EUVW", rows))),
            )
            for kind, expression in expressions:
                key = sp.srepr(expression)
                if key in seen or expression == 0:
                    continue
                seen.add(key)
                candidates.append((f"{kind}:B{number}:{first},{second}", expression))

    variables = tuple(symbol for row in crows for symbol in row)
    print("CANDIDATES", len(candidates))
    candidate_polynomials = [sp.Poly(expression, *variables) for _name, expression in candidates]
    candidate_dictionaries = [dict(polynomial.terms()) for polynomial in candidate_polynomials]
    for target_name, target_expression in named_targets.items():
        target_polynomial = sp.Poly(target_expression, *variables)
        target_dictionary = dict(target_polynomial.terms())
        monomials = sorted(set(target_dictionary).union(*(dictionary for dictionary in candidate_dictionaries)))
        matrix = np.zeros((len(monomials), len(candidates)))
        rhs = np.zeros(len(monomials))
        for row_index, monomial in enumerate(monomials):
            rhs[row_index] = float(target_dictionary.get(monomial, 0))
            for column_index, dictionary in enumerate(candidate_dictionaries):
                matrix[row_index, column_index] = float(dictionary.get(monomial, 0))
        result = linprog(
            np.ones(len(candidates)), A_eq=matrix, b_eq=rhs,
            bounds=(0, None), method="highs",
        )
        print("TARGET", target_name, "TERMS", len(target_polynomial.terms()),
              "MONOMIALS", len(monomials), "FEASIBLE", result.success)
        if not result.success:
            continue
        residual = target_expression
        for value, (name, expression) in zip(result.x, candidates):
            if value > 1e-8:
                rational = sp.Rational(str(float(value))).limit_denominator(10000)
                print(" ", name, rational)
                residual = sp.expand(residual - rational * expression)
        print(" EXACT_RESIDUAL_ZERO", residual == 0)


if __name__ == "__main__":
    main()
