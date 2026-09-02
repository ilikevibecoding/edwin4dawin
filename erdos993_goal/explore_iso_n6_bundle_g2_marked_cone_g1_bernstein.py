#!/usr/bin/env python3
"""Diagnostic exact algebra for the universal rank-six bundle coefficient g2.

This file is exploratory only.  It reconstructs the literal Newton
coefficient and prints its W/A/B/Z marked partition and D-linear
coefficients.  It asserts no sign theorem.
"""

import itertools

import networkx as nx
import sympy as sp

from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    add_xd,
    forward_differences,
    isolate_multiply,
    nested,
    independence_row,
)


def reconstruct(index=2):
    crows = tuple(tuple(sp.symbols(f"c{name}0:8")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:8")) for name in "EUVW")
    base = add_xd(crows, drows)
    gamma = []
    for amount in range(11):
        bundled = add_xd(isolate_multiply(crows, amount), drows)
        lower = sum(
            nested(isolate_multiply(crows, offset), 5)
            for offset in range(amount)
        )
        gamma.append(sp.expand(nested(bundled, 6) - nested(base, 6) - lower))
    return forward_differences(gamma)[index]


def finite_probe(expression, n, rows):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    arguments = tuple(sorted(names, key=str))
    evaluate = sp.lambdify(tuple(names[name] for name in arguments), expression, "math")
    minimum = None
    witness = None
    cells = 0
    negative = 0
    for graph0 in nx.graph_atlas_g():
        if not (2 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        nodes = tuple(graph)
        order = len(graph)
        graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
        for u, v in itertools.combinations(nodes, 2):
            crows = []
            for removed in ((), (u,), (v,), (u, v)):
                reduced = graph.copy()
                reduced.remove_nodes_from(removed)
                crows.append(independence_row(reduced, 7))
            ce, cu, cv, cw = crows
            categories = {}
            for rank in range(2, 8):
                categories[f"W{rank}"] = cw[rank]
                categories[f"A{rank}"] = cu[rank] - cw[rank]
                categories[f"B{rank}"] = cv[rank] - cw[rank]
                categories[f"Z{rank}"] = ce[rank] - cu[rank] - cv[rank] + cw[rank]
            for mask in range(1 << order):
                dgraph = graph.subgraph(
                    node for node in nodes if mask & (1 << node)
                ).copy()
                drows = []
                for removed in ((), (u,), (v,), (u, v)):
                    reduced = dgraph.copy()
                    reduced.remove_nodes_from(removed)
                    drows.append(independence_row(reduced, 7))
                de, du, dv, dw = drows
                values = {"n": order, **categories}
                values.update({
                    "dE4": de[4], "dE5": de[5], "dE6": de[6],
                    "dU3": du[3], "dU4": du[4], "dU5": du[5],
                    "dV3": dv[3], "dV4": dv[4], "dV5": dv[5],
                    "dW2": dw[2], "dW3": dw[3], "dW4": dw[4],
                })
                value = int(evaluate(*(values[name] for name in arguments)))
                cells += 1
                if value < 0:
                    negative += 1
                if minimum is None or value < minimum:
                    minimum = value
                    witness = (order, graph6, u, v, mask, value)
    print("finite", cells, "negative", negative, "minimum", minimum, "witness", witness)


def main():
    generic = reconstruct()
    n, q, eu, ev = sp.symbols("n q epsilon_u epsilon_v")
    structural = {}
    for family in "EUVW":
        structural[sp.Symbol(f"c{family}0")] = 1
        structural[sp.Symbol(f"d{family}0")] = 1
    structural.update({
        sp.Symbol("cE1"): n,
        sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1,
        sp.Symbol("cW1"): n - 2,
        sp.Symbol("dE1"): q,
        sp.Symbol("dU1"): q - eu,
        sp.Symbol("dV1"): q - ev,
        sp.Symbol("dW1"): q - eu - ev,
    })
    raw = sp.expand(generic.subs(structural))
    rows = {
        family: {
            rank: sp.symbols(f"{family}{rank}", nonnegative=True)
            for rank in range(2, 8)
        }
        for family in "WABZ"
    }
    rules = {}
    for rank in range(2, 8):
        w, a, b, z = (rows[family][rank] for family in "WABZ")
        rules.update({
            sp.Symbol(f"cW{rank}"): w,
            sp.Symbol(f"cU{rank}"): w + a,
            sp.Symbol(f"cV{rank}"): w + b,
            sp.Symbol(f"cE{rank}"): w + a + b + z,
        })
    expression = sp.expand(raw.subs(rules))
    symbols = sorted(expression.free_symbols, key=str)
    polynomial = sp.Poly(expression, *symbols)
    print("generic terms", len(sp.Poly(generic, *sorted(generic.free_symbols, key=str)).terms()))
    print("raw terms", len(sp.Poly(raw, *sorted(raw.free_symbols, key=str)).terms()))
    print(
        "partition terms", len(polynomial.terms()), "negative",
        sum(1 for coefficient in polynomial.coeffs() if coefficient.is_negative is True),
    )
    dvars = [symbol for symbol in symbols if str(symbol).startswith("d") and str(symbol)[1] in "EUVW"]
    print("D variables", list(map(str, dvars)))
    for symbol in dvars:
        print(str(symbol), "=>", sp.factor(sp.diff(expression, symbol)))
    cpart = expression.subs({symbol: 0 for symbol in dvars})
    print("C part terms", len(sp.Poly(cpart, *sorted(cpart.free_symbols, key=str)).terms()))
    print("C part=", sp.factor(cpart))
    finite_probe(expression, n, rows)


if __name__ == "__main__":
    main()
