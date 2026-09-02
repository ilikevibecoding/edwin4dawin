#!/usr/bin/env python3
"""Probe independent path/edgeless coefficient boxes for singleton g2 Delta.

This is a relaxation diagnostic, not a proof.  It tests the mixed piece
L(D,E) of the exact root-deletion increment when D and E are treated as
unrelated marked forests of orders n>=m.  Every independence coefficient
appearing in L is allowed to vary independently between the path floor and
the edgeless ceiling.  The bilinear box minimum is computed exactly by
enumerating the smaller E side and optimizing every D endpoint analytically.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g2_compact_polar_split_rank5_g2_alt import raw_g2


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_singleton_delta_independent_boxes_probe_rank5_g2_alt_20260830.json"
MARKER = "PROBE_ISO_N5_G2_SINGLETON_DELTA_INDEPENDENT_BOXES_RANK5_G2_ALT"


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def mixed_expression():
    drows = tuple(tuple(sp.symbols(f"d{name}0:7")) for name in "EUVW")
    erows = tuple(tuple(sp.symbols(f"e{name}0:7")) for name in "EUVW")
    t = sp.symbols("t")
    crows = tuple(tuple(
        drows[row][rank] + t * at(erows[row], rank - 1)
        for rank in range(7)
    ) for row in range(4))
    polynomial = sp.Poly(
        sp.expand(raw_g2(crows, drows) - raw_g2(drows, drows)), t
    )
    assert polynomial.degree() == 2
    return drows, erows, sp.expand(polynomial.coeff_monomial(t))


def choose(order, rank):
    return math.comb(order, rank) if 0 <= rank <= order else 0


def interval(order, rank):
    return choose(order - rank + 1, rank), choose(order, rank)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-order", type=int, default=40)
    args = parser.parse_args()

    drows, erows, expression = mixed_expression()
    n, m = sp.symbols("n m", integer=True, nonnegative=True)
    d_orders = (n, n - 1, n - 1, n - 2)
    e_orders = (m, m - 1, m - 1, m - 2)
    substitutions = {}
    for rows, orders in ((drows, d_orders), (erows, e_orders)):
        for row, order in zip(rows, orders):
            substitutions[row[0]] = 1
            substitutions[row[1]] = order
    expression = sp.expand(expression.subs(substitutions))

    d_variables = tuple(sorted(
        expression.free_symbols & set(itertools.chain.from_iterable(drows)), key=str
    ))
    e_variables = tuple(sorted(
        expression.free_symbols & set(itertools.chain.from_iterable(erows)), key=str
    ))
    assert len(d_variables) == 15
    assert len(e_variables) == 12
    assert all(sp.diff(expression, variable, 2) == 0 for variable in d_variables + e_variables)

    # Exact bilinear coefficient table after fixing i0 and i1.
    zero_all = {variable: 0 for variable in d_variables + e_variables}
    constant = sp.expand(expression.subs(zero_all))
    d_linear = [sp.expand(sp.diff(expression, variable).subs({x: 0 for x in e_variables}))
                for variable in d_variables]
    e_linear = [sp.expand(sp.diff(expression, variable).subs({x: 0 for x in d_variables}))
                for variable in e_variables]
    matrix = [[sp.expand(sp.diff(expression, dv, ev)) for ev in e_variables]
              for dv in d_variables]
    reconstructed = constant
    reconstructed += sum(value * variable for value, variable in zip(d_linear, d_variables))
    reconstructed += sum(value * variable for value, variable in zip(e_linear, e_variables))
    reconstructed += sum(
        matrix[i][j] * d_variables[i] * e_variables[j]
        for i in range(len(d_variables)) for j in range(len(e_variables))
    )
    assert sp.expand(expression - reconstructed) == 0

    scalar_symbols = (n, m)
    constant_fn = sp.lambdify(scalar_symbols, constant, "math")
    d_linear_fn = [sp.lambdify(scalar_symbols, value, "math") for value in d_linear]
    e_linear_fn = [sp.lambdify(scalar_symbols, value, "math") for value in e_linear]
    matrix_fn = [[sp.lambdify(scalar_symbols, value, "math") for value in row] for row in matrix]

    def variable_interval(variable, order_values):
        name = str(variable)
        row_index = "EUVW".index(name[1])
        rank = int(name[2:])
        return interval(order_values[row_index], rank)

    global_minimum = None
    negative_pairs = 0
    rows = []
    for nv in range(2, args.max_order + 1):
        for mv in range(2, nv + 1):
            do = (nv, nv - 1, nv - 1, nv - 2)
            eo = (mv, mv - 1, mv - 1, mv - 2)
            di = [variable_interval(variable, do) for variable in d_variables]
            ei = [variable_interval(variable, eo) for variable in e_variables]
            c0 = int(constant_fn(nv, mv))
            dl = [int(function(nv, mv)) for function in d_linear_fn]
            el = [int(function(nv, mv)) for function in e_linear_fn]
            mat = [[int(function(nv, mv)) for function in row] for row in matrix_fn]

            minimum = None
            witness = None
            for mask in range(1 << len(e_variables)):
                ev = [bounds[(mask >> index) & 1] for index, bounds in enumerate(ei)]
                value = c0 + sum(coefficient * x for coefficient, x in zip(el, ev))
                d_coefficients = [
                    dl[i] + sum(mat[i][j] * ev[j] for j in range(len(e_variables)))
                    for i in range(len(d_variables))
                ]
                dv = [bounds[0] if coefficient >= 0 else bounds[1]
                      for bounds, coefficient in zip(di, d_coefficients)]
                value += sum(coefficient * x for coefficient, x in zip(d_coefficients, dv))
                if minimum is None or value < minimum:
                    minimum = value
                    witness = {"E_mask": mask, "D_values": dv, "E_values": ev}
            record = {"n": nv, "m": mv, "minimum": minimum, "witness": witness}
            rows.append(record)
            negative_pairs += int(minimum < 0)
            if global_minimum is None or minimum < global_minimum["minimum"]:
                global_minimum = record

    report = {
        "marker": MARKER,
        "claim": "Independent coefficient-box relaxation diagnostic for the mixed Delta piece",
        "max_order": args.max_order,
        "order_pairs": len(rows),
        "D_live_variables": list(map(str, d_variables)),
        "E_live_variables": list(map(str, e_variables)),
        "E_corner_count_per_order_pair": 1 << len(e_variables),
        "negative_order_pairs": negative_pairs,
        "global_minimum": global_minimum,
        "rows": rows,
        "status": "diagnostic only; even a nonnegative finite order grid is not a theorem",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "max_order": args.max_order,
        "order_pairs": len(rows),
        "negative_order_pairs": negative_pairs,
        "global_minimum": global_minimum,
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
