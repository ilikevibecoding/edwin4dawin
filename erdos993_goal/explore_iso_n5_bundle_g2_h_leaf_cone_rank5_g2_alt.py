#!/usr/bin/env python3
"""Discovery-only cone search for paying rank-five g2 with the forest H theorem.

The generators are H evaluated on independence polynomials of forests obtained
from the marked support forest by attaching leaves at either marked vertex and
by adding isolated vertices.  A feasible numerical cone is only a lead; this
file never promotes floating-point feasibility to a proof.
"""

from __future__ import annotations

import itertools

import networkx as nx
import numpy as np
import sympy as sp
from scipy.optimize import linprog

from derive_iso_n5_bundle_g2_compact_polar_split_rank5_g2_alt import (
    add_isolates,
    raw_g2,
)


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def add(left, right):
    return tuple(sp.expand(x + y) for x, y in zip(left, right))


def scale(row, scalar):
    return tuple(sp.expand(scalar * x) for x in row)


def convolve(left, right, maximum=6):
    return tuple(
        sp.expand(sum(at(left, j) * at(right, rank - j) for j in range(rank + 1)))
        for rank in range(maximum + 1)
    )


def binomial_row(amount, maximum=6):
    return tuple(sp.Integer(sp.binomial(amount, rank)) for rank in range(maximum + 1))


def independence_row(graph, maximum=6):
    vertices = tuple(graph)
    return tuple(sum(
        all(not graph.has_edge(x, y) for x, y in itertools.combinations(chosen, 2))
        for chosen in itertools.combinations(vertices, rank)
    ) for rank in range(maximum + 1))


def rooted_attachment_pairs(maximum_order=5):
    """Unique (A,B) with I(T)=A+B, A=I(T-r), B=x I(T-N[r])."""
    pairs = {((1, 0, 0, 0, 0, 0, 0), (0, 0, 0, 0, 0, 0, 0)): "identity"}
    for order in range(1, maximum_order + 1):
        trees = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        for tree0 in trees:
            tree = nx.convert_node_labels_to_integers(tree0)
            for root in tree:
                deleted = tree.copy(); deleted.remove_node(root)
                closed = tree.copy(); closed.remove_nodes_from([root, *tree.neighbors(root)])
                a = independence_row(deleted)
                link = independence_row(closed)
                b = (0, *link[:-1])
                pairs.setdefault((a, b), f"T{order}:{nx.to_graph6_bytes(tree, header=False).decode().strip()}:{root}")
    return [(name, tuple(map(sp.Integer, a)), tuple(map(sp.Integer, b))) for (a, b), name in pairs.items()]


def transform_u(rows, a, b):
    e, u, v, w = rows
    p = add(a, b)
    return (
        add(convolve(a, e), convolve(b, u)),
        convolve(p, u),
        add(convolve(a, v), convolve(b, w)),
        convolve(p, w),
    )


def transform_v(rows, a, b):
    e, u, v, w = rows
    p = add(a, b)
    return (
        add(convolve(a, e), convolve(b, v)),
        add(convolve(a, u), convolve(b, w)),
        convolve(p, v),
        convolve(p, w),
    )


def h_value(row):
    return sp.expand(
        2 * at(row, 1) * at(row, 4)
        - 5 * at(row, 1) * at(row, 5)
        - 6 * at(row, 1) * at(row, 6)
        + 6 * at(row, 2) * at(row, 3)
        - 8 * at(row, 2) * at(row, 5)
        + 5 * at(row, 3) ** 2
        + 6 * at(row, 3) * at(row, 4)
    )


def a2_value(row):
    return sp.expand(
        4 * at(row, 0) * at(row, 3)
        - 3 * at(row, 0) * at(row, 4)
        - 15 * at(row, 0) * at(row, 5)
        - 6 * at(row, 0) * at(row, 6)
        + 12 * at(row, 1) * at(row, 2)
        + 8 * at(row, 1) * at(row, 3)
        - 19 * at(row, 1) * at(row, 4)
        - 14 * at(row, 1) * at(row, 5)
        + 11 * at(row, 2) ** 2
        + 18 * at(row, 2) * at(row, 3)
        - 2 * at(row, 2) * at(row, 4)
        + 6 * at(row, 3) ** 2
    )


def hc_value(row):
    return sp.expand(at(row, 3) ** 2 - at(row, 1) * at(row, 5))


def leaf_increment(row, amount):
    """((1+x)^amount-1)*row."""
    shifted = convolve(binomial_row(amount), row)
    return tuple(sp.expand(x - y) for x, y in zip(shifted, row))


def vector(expression, monomials, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    terms = dict(polynomial.terms())
    return np.asarray([float(terms.get(monomial, 0)) for monomial in monomials])


def search(target, generators, variables):
    polynomials = [sp.Poly(sp.expand(target), *variables)]
    polynomials.extend(sp.Poly(sp.expand(expr), *variables) for _, expr in generators)
    monomials = sorted(set(itertools.chain.from_iterable(poly.monoms() for poly in polynomials)))
    b = vector(target, monomials, variables)
    a = np.column_stack([vector(expr, monomials, variables) for _, expr in generators])
    result = linprog(
        np.ones(len(generators)),
        A_eq=a,
        b_eq=b,
        bounds=(0, None),
        method="highs",
        options={"dual_feasibility_tolerance": 1e-9, "primal_feasibility_tolerance": 1e-9},
    )
    return result, monomials, a, b


def main():
    crows = tuple(tuple(sp.symbols(f"c{name}0:7")) for name in "EUVW")
    # No-parent mode D=C.  Zeroth coefficients are identically one.
    target = raw_g2(crows, crows)
    zero_rules = {row[0]: sp.Integer(1) for row in crows}
    target = sp.expand(target.subs(zero_rules))
    rows = tuple(tuple(sp.expand(value.subs(zero_rules)) for value in row) for row in crows)
    e, u, v, w = rows

    forest_rows = []

    def register(name, row):
        forest_rows.append((name, row))

    # Every base row is an induced forest; isolate shifts preserve forests.
    for name, row in zip("EUVW", rows):
        for isolates in range(7):
            register(f"H(I{isolates}*{name})", convolve(binomial_row(isolates), row))

    # Attach leaves at the surviving marked vertex of an induced forest.
    for leaves in range(1, 7):
        register(f"H(U+h{leaves}W)", add(u, leaf_increment(w, leaves)))
        register(f"H(V+h{leaves}W)", add(v, leaf_increment(w, leaves)))
        register(f"H(E+h{leaves}U)", add(e, leaf_increment(u, leaves)))
        register(f"H(E+h{leaves}V)", add(e, leaf_increment(v, leaves)))

    # Attach a leaves at u and b leaves at v in the original marked forest:
    # E+h_a U+h_b V+h_a h_b W.
    for a in range(1, 7):
        ha = leaf_increment(u, a)
        ba = tuple(sp.binomial(a, rank) - (1 if rank == 0 else 0) for rank in range(7))
        for b in range(1, 7):
            hb = leaf_increment(v, b)
            bb = tuple(sp.binomial(b, rank) - (1 if rank == 0 else 0) for rank in range(7))
            habw = convolve(ba, convolve(bb, w))
            register(f"H(P[{a},{b}])", add(add(add(e, ha), hb), habw))

    # General rooted-tree attachments at either mark.  These strictly contain
    # the leaf-star family and remain forests by construction.
    attachment_pairs = rooted_attachment_pairs(4)
    for uname, ua, ub in attachment_pairs:
        urows = transform_u(rows, ua, ub)
        for vname, va, vb in attachment_pairs:
            transformed = transform_v(urows, va, vb)
            row = transformed[0]
            register(f"rooted[{uname}][{vname}]:E", row)

    # Remove exact duplicate symbolic rows before building the cone.
    unique_rows = {}
    for name, row in forest_rows:
        unique_rows.setdefault(tuple(map(str, row)), (name, row))
    forest_rows = list(unique_rows.values())
    print("rooted_attachment_pairs", len(attachment_pairs), "unique_forest_rows", len(forest_rows))

    families = {
        "H_only": [(f"H:{name}", h_value(row)) for name, row in forest_rows],
        "A2_only": [(f"A2:{name}", a2_value(row)) for name, row in forest_rows],
        "H_plus_A2": [
            *((f"H:{name}", h_value(row)) for name, row in forest_rows),
            *((f"A2:{name}", a2_value(row)) for name, row in forest_rows),
        ],
        "H_plus_A2_plus_HC": [
            *((f"H:{name}", h_value(row)) for name, row in forest_rows),
            *((f"A2:{name}", a2_value(row)) for name, row in forest_rows),
            *((f"HC:{name}", hc_value(row)) for name, row in forest_rows),
        ],
    }
    for family, generators in families.items():
        variables = tuple(sorted(target.free_symbols | set().union(*(expr.free_symbols for _, expr in generators)), key=str))
        result, monomials, matrix, rhs = search(target, generators, variables)
        print({
            "mode": "no_parent_k0",
            "family": family,
            "target_terms": len(sp.Poly(target, *variables).terms()),
            "generators": len(generators),
            "ambient_monomials": len(monomials),
            "success": result.success,
            "status": result.status,
            "message": result.message,
        })
        if result.success:
            active = [(generators[i][0], result.x[i]) for i in range(len(generators)) if result.x[i] > 1e-8]
            print("active", active)
            print("max_residual", float(np.max(np.abs(matrix @ result.x - rhs))))


if __name__ == "__main__":
    main()
