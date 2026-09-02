#!/usr/bin/env python3
"""Explore the exact singleton-endpoint residual for disconnected marks.

This is a symbolic reduction probe.  It keeps the rooted-component relations

    X=P+xH,  Y=Q+xJ,
    (E,U,V,W)=(XY,PY,XQ,PQ),
    QE=HY, QV=HQ,

and derives F=N4(C)+Corr_ep exactly.  No sign is asserted here.
"""

from __future__ import annotations

import json
from pathlib import Path
import itertools

import networkx as nx
import sympy as sp

from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    kernel_coefficient,
    psi_coefficient,
)
from prove_iso_n4_bundle_g1_endpoint_parent_agent import unlabeled_forests
from probe_iso_leaf_cross_remainder_root import poly_forest


def at(row, index):
    return row[index] if 0 <= index < len(row) else 0


def conv(left, right, length=8):
    return tuple(
        sp.expand(sum(at(left, i) * at(right, k - i) for i in range(k + 1)))
        for k in range(length)
    )


def shift(row, length=8):
    return tuple(at(row, k - 1) for k in range(length))


def add(left, right):
    return tuple(sp.expand(a + b) for a, b in zip(left, right))


def nested_coefficient(rows, left, right):
    """Coefficient of the nested compact N operator, from its definition."""
    E, U, V, W = rows
    EU = add(E, shift(U))
    VW = add(V, shift(W))

    def leaf(a, c, i, j):
        ac = add(a, shift(c))
        return sp.expand(
            kernel_coefficient(ac, i, j)
            - kernel_coefficient(a, i, j)
            - kernel_coefficient(c, i - 1, j - 1)
        )

    return sp.expand(
        leaf(EU, VW, left, right)
        - leaf(E, V, left, right)
        - leaf(U, W, left - 1, right - 1)
    )


def endpoint_correction(U, W, QE, QV):
    return sp.expand(
        -2 * at(U, 2) * at(QV, 1)
        + 6 * at(U, 2) * at(QV, 3)
        - 10 * at(U, 3) * at(QV, 2)
        + 6 * at(U, 4) * at(QV, 1)
        - 2 * at(W, 1) * at(QE, 2)
        + 6 * at(W, 1) * at(QE, 4)
        + at(W, 1) * at(QV, 3)
        - 10 * at(W, 2) * at(QE, 3)
        - 2 * at(W, 2) * at(QV, 2)
        + 6 * at(W, 3) * at(QE, 2)
        + at(W, 3) * at(QV, 1)
    )


def numeric_delta(U, W, QE, QV):
    return (
        at(QE, 2) * at(W, 3) - 2 * at(QE, 3) * at(W, 2) + at(QE, 4) * at(W, 1)
        + at(U, 2) * at(QV, 3) - 2 * at(U, 3) * at(QV, 2) + at(U, 4) * at(QV, 1)
    )


def rank3_block(A, B):
    return at(A, 2) * at(B, 3) - 2 * at(A, 3) * at(B, 2) + at(A, 4) * at(B, 1)


def numeric_n4_deleted(U, W):
    return (
        2 * at(U, 2) * at(W, 2) - at(U, 2) * at(W, 3) - 5 * at(U, 2) * at(W, 4)
        + 2 * at(U, 3) * at(W, 1) + 2 * at(U, 3) * at(W, 2) + 3 * at(U, 3) * at(W, 3)
        - at(U, 4) * at(W, 1) + 3 * at(U, 4) * at(W, 2) - 5 * at(U, 5) * at(W, 1)
        - at(W, 1) * at(W, 4) + at(W, 2) * at(W, 3)
    )


def finite_split(max_order=10):
    result = {}
    for order in range(2, max_order + 1):
        mins = {"delta": None, "n4d": None, "f": None, "actual_minus_u_isolated": None,
                "u_isolated_face": None}
        negatives = {key: 0 for key in mins}
        cells = 0
        witnesses = {}
        for graph0 in unlabeled_forests(order):
            graph = nx.convert_node_labels_to_integers(graph0)
            for u, v in itertools.permutations(graph.nodes(), 2):
                gu = graph.copy(); gu.remove_node(u)
                gw = graph.copy(); gw.remove_nodes_from((u, v))
                qe = graph.copy(); qe.remove_nodes_from((u, *graph.neighbors(u)))
                qv = qe.copy()
                if v in qv:
                    qv.remove_node(v)
                rows = [tuple(poly_forest(value)) for value in (gu, gw, qe, qv)]
                U, W, QE, QV = rows
                values = {
                    "delta": numeric_delta(U, W, QE, QV),
                    "n4d": numeric_n4_deleted(U, W),
                }
                values["f"] = values["delta"] + values["n4d"]
                values["u_isolated_face"] = values["n4d"] + 2 * rank3_block(U, W)
                values["actual_minus_u_isolated"] = values["f"] - values["u_isolated_face"]
                for name, value in values.items():
                    negatives[name] += int(value < 0)
                    if mins[name] is None or value < mins[name]:
                        mins[name] = value
                        witnesses[name] = {
                            "graph6": nx.to_graph6_bytes(graph, header=False).decode().strip(),
                            "u": u, "v": v,
                            "distance": None if not nx.has_path(graph, u, v) else nx.shortest_path_length(graph, u, v),
                        }
                cells += 1
        result[order] = {"cells": cells, "minima": mins, "negatives": negatives, "witnesses": witnesses}
        print("FINITE_SPLIT", order, result[order], flush=True)
    return result


def main():
    P = (1, *sp.symbols("p1:8"))
    H = (1, *sp.symbols("h1:8"))
    Q = (1, *sp.symbols("q1:8"))
    J = (1, *sp.symbols("j1:8"))
    X = add(P, shift(H))
    Y = add(Q, shift(J))
    E, U, V, W = conv(X, Y), conv(P, Y), conv(X, Q), conv(P, Q)
    QE, QV = conv(H, Y), conv(H, Q)
    n4 = nested_coefficient((E, U, V, W), 4, 4)
    correction = endpoint_correction(U, W, QE, QV)
    residual = sp.expand(n4 + correction)
    print("N4_TERMS", len(sp.Add.make_args(n4)))
    print("CORR_TERMS", len(sp.Add.make_args(correction)))
    print("F_TERMS", len(sp.Add.make_args(residual)))
    print("F_FACTORED", sp.factor(residual))
    # Root-isolated faces are useful for recognizing any product identity.
    for label, rules in (
        ("H_EQ_P", dict(zip(H[1:], P[1:]))),
        ("J_EQ_Q", dict(zip(J[1:], Q[1:]))),
        ("BOTH_ROOTS_ISOLATED", dict(zip(H[1:], P[1:])) | dict(zip(J[1:], Q[1:]))),
        ("SECOND_COMPONENT_EDGE", {Q[k]: 0 for k in range(2, 8)} | {J[k]: 0 for k in range(1, 8)}),
        ("PARENT_MARK_U_ISOLATED", {P[k]: 0 for k in range(1, 8)} | {H[k]: 0 for k in range(1, 8)}),
        ("OTHER_MARK_V_ISOLATED", {Q[k]: 0 for k in range(1, 8)} | {J[k]: 0 for k in range(1, 8)}),
    ):
        value = sp.factor(residual.subs(rules))
        print(label, len(sp.Add.make_args(sp.expand(value))), value)

    isolated_u = sp.expand(residual.subs(
        {P[k]: 0 for k in range(1, 8)} | {H[k]: 0 for k in range(1, 8)}
    ))
    psi_cells = [sp.expand(psi_coefficient(Q, J, i, degree - i))
                 for degree in range(2, 9) for i in range(degree + 1)]
    psi_names = [(degree, i, degree - i)
                 for degree in range(2, 9) for i in range(degree + 1)]
    variables = sorted(set().union(
        isolated_u.free_symbols, *(cell.free_symbols for cell in psi_cells)
    ), key=str)
    monomials = sorted(set().union(
        sp.Poly(isolated_u, *variables).monoms(),
        *(sp.Poly(cell, *variables).monoms() for cell in psi_cells),
    ))
    matrix = sp.Matrix([[sp.Poly(cell, *variables).coeff_monomial(monomial)
                         for cell in psi_cells] for monomial in monomials])
    target = sp.Matrix([sp.Poly(isolated_u, *variables).coeff_monomial(monomial)
                        for monomial in monomials])
    solution = sp.linsolve((matrix, target))
    print("ISOLATED_U_PSI_SPAN", solution)
    if solution is not sp.EmptySet:
        vector = next(iter(solution))
        sparse = [(psi_names[i], value) for i, value in enumerate(vector) if value != 0]
        print("ISOLATED_U_PSI_SPARSE", sparse)

    # Compare the isolated-parent face against the already proved rank-four
    # singleton-endpoint form after adjoining the isolated marked vertex.
    rank4 = sp.sympify(json.loads(Path(
        "iso_n4_bundle_g12_endpoint_parent_exact_agent_20260829.json"
    ).read_text())["raw_forms"]["g1"])
    rank4_rules = {}
    rank4_rows = {
        "E": add(Y, shift(Y)),
        "U": Y,
        "V": add(Q, shift(Q)),
        "W": Q,
    }
    for name, row in rank4_rows.items():
        for index, value in enumerate(row):
            rank4_rules[sp.Symbol(f"c{name}{index}")] = value
    specialized_rank4 = sp.expand(rank4.subs(rank4_rules))
    print("ISOLATED_U_MINUS_RANK4_ENDPOINT", sp.factor(isolated_u - specialized_rank4))

    # Generic deletion-square comparison with rank-four endpoint Gamma_1.
    gu = (1, *sp.symbols("gu1:8"))
    gw = (1, *sp.symbols("gw1:8"))
    ge = (1, *sp.symbols("ge1:8"))
    gv = (1, *sp.symbols("gv1:8"))
    generic_f = sp.expand(
        nested_coefficient((add(gu, shift(ge)), gu, add(gw, shift(gv)), gw), 4, 4)
        + endpoint_correction(gu, gw, ge, gv)
    )
    generic_rank4_rules = {}
    for name, row in {
        "E": add(gu, shift(ge)), "U": gu,
        "V": add(gw, shift(gv)), "W": gw,
    }.items():
        generic_rank4_rules.update({sp.Symbol(f"c{name}{i}"): value for i, value in enumerate(row)})
    generic_rank4 = sp.expand(rank4.subs(generic_rank4_rules))
    generic_difference = sp.factor(generic_f - generic_rank4)
    print("GENERIC_F_TERMS", len(sp.Add.make_args(generic_f)))
    print("GENERIC_F", sp.factor(generic_f))
    print("GENERIC_F_MINUS_RANK4_ENDPOINT_TERMS", len(sp.Add.make_args(sp.expand(generic_difference))))
    print("GENERIC_F_MINUS_RANK4_ENDPOINT", generic_difference)
    n4_deleted = nested_coefficient((gu, gu, gw, gw), 4, 4)
    print("GENERIC_N4_DELETED", sp.factor(n4_deleted))
    print("GENERIC_F_MINUS_N4_DELETED", sp.factor(generic_f - n4_deleted))
    finite_split()


if __name__ == "__main__":
    main()
