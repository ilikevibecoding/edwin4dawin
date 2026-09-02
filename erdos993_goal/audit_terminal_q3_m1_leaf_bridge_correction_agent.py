#!/usr/bin/env python3
"""Exact leaf-bridge row correction and finite common-forest audit for m=1.

This proves the bridge *identity* at every rank.  It also exhausts all
nontrivial-component forest multisets through order 9 and finds the desired
sign there.  The all-order sign of the correction is deliberately left as an
explicit open lemma; this file must not be cited as an all-forest m=1 proof.
"""

from __future__ import annotations

from functools import lru_cache
import hashlib
import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp
import audit_terminal_q3_low_newton_adversarial_agent as canonical
import derive_terminal_q3_m1_leaf_bridge_correction_agent as formal


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_m1_leaf_bridge_correction_audit_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add(left, right):
    return tuple(
        (left[k] if k < len(left) else 0)
        + (right[k] if k < len(right) else 0)
        for k in range(max(len(left), len(right)))
    )


def negate(row):
    return tuple(-value for value in row)


def shift(row, amount: int):
    return (0,) * amount + tuple(row)


def subtract(left, right):
    return add(left, negate(right))


def coeff(row, rank: int) -> int:
    return row[rank] if 0 <= rank < len(row) else 0


def trim(row):
    row = list(row)
    while len(row) > 1 and row[-1] == 0:
        row.pop()
    return tuple(row)


def convolve(left, right):
    out = [0] * (len(left) + len(right) - 1)
    for p, x in enumerate(left):
        for q, y in enumerate(right):
            out[p + q] += x * y
    return tuple(out)


class Oracle:
    def __init__(self, graph: nx.Graph):
        self.graph = nx.convert_node_labels_to_integers(graph, ordering="sorted")
        self.n = len(graph)
        self.adj = [0] * self.n
        self.edges = []
        for u, v in self.graph.edges():
            self.adj[u] |= 1 << v
            self.adj[v] |= 1 << u
            self.edges.append((u, v))
        self.full = (1 << self.n) - 1

    @lru_cache(maxsize=None)
    def independent(self, mask: int):
        if not mask:
            return (1,)
        bit = mask & -mask
        v = bit.bit_length() - 1
        return add(
            self.independent(mask ^ bit),
            (0,) + self.independent(mask & ~bit & ~self.adj[v]),
        )

    @lru_cache(maxsize=None)
    def residual(self, mask: int):
        out = (0,)
        for u, v in self.edges:
            if not ((mask >> u) & 1 and (mask >> v) & 1):
                continue
            forbidden = (1 << u) | (1 << v) | self.adj[u] | self.adj[v]
            out = add(out, self.independent(mask & ~forbidden))
        return out

    def one_edge(self, mask: int):
        return shift(self.residual(mask), 2)

    def closed(self, vertex: int, mask: int):
        return ((1 << vertex) | self.adj[vertex]) & mask


def bridge_delta(oracle: Oracle, mask: int, u: int, v: int):
    """Return exact (delta I, delta one-edge, K, J) for adding uv."""
    assert (mask >> u) & 1 and (mask >> v) & 1
    assert not ((oracle.adj[u] >> v) & 1)
    ku = oracle.closed(u, mask)
    kv = oracle.closed(v, mask)
    kmask = mask & ~ku & ~kv
    K = oracle.independent(kmask)
    one_k = oracle.one_edge(kmask)
    J = (0,)
    for endpoint, other in ((u, v), (v, u)):
        neighbors = [x for x in range(oracle.n)
                     if (mask >> x) & 1 and (oracle.adj[endpoint] >> x) & 1]
        assert len(neighbors) <= 1
        for neighbor in neighbors:
            edge_closed = (
                (1 << endpoint) | (1 << neighbor)
                | oracle.adj[endpoint] | oracle.adj[neighbor]
            ) & mask
            jmask = mask & ~edge_closed & ~oracle.closed(other, mask)
            J = add(J, oracle.independent(jmask))
    delta_i = negate(shift(K, 2))
    delta_s = add(shift(K, 2), negate(shift(one_k, 2)))
    delta_s = add(delta_s, negate(shift(J, 3)))
    return trim(delta_i), trim(delta_s), K, J


def deletion_masks(oracle: Oracle, root: int):
    fmask = oracle.full & ~(1 << root)
    hmask = oracle.full & ~oracle.closed(root, oracle.full)
    return fmask, hmask


def terminal_base_rows(oracle: Oracle, root: int, target: int):
    fmask, hmask = deletion_masks(oracle, root)
    gi, gs = oracle.independent(oracle.full), oracle.one_edge(oracle.full)
    fi, fs = oracle.independent(fmask), oracle.one_edge(fmask)
    hi = oracle.independent(hmask)
    a2, b = coeff(fi, 2), coeff(fi, target)
    return (
        coeff(gi, 3) + coeff(gi, 2),
        coeff(gi, 2) + coeff(gi, 1),
        coeff(gs, 4) + coeff(gs, 3),
        coeff(gs, 3) + coeff(gs, 2),
        coeff(gi, target + 1) + coeff(gi, target),
        coeff(gi, target) + coeff(gi, target - 1),
        a2,
        b,
        coeff(fs, 3) + coeff(hi, 2) + a2,
        coeff(fs, target + 1) + coeff(hi, target) + b,
    )


def delta1(rows, target: int):
    p0, p1, r0, r1, u0, u1, a2, b, c0, e0 = rows
    A0 = p0 * c0 - a2 * r0
    A1 = p0 * a2 + p1 * c0 + p1 * a2 - a2 * r1
    Q0 = (target + 1) * b * (c0 + r0) - 3 * (p0 + a2) * e0
    Q1 = (
        (target + 1) * b * (a2 + r1)
        - 3 * p1 * e0 - 3 * b * (p0 + a2 + p1)
    )
    return (
        (target + 1) * a2 * (A0 * u1 + A1 * u0 + A1 * u1)
        + a2 * (p0 * Q1 + p1 * Q0 + p1 * Q1)
    )


def canonical_m1(oracle: Oracle, root: int, target: int):
    fmask, hmask = deletion_masks(oracle, root)

    class Adapter:
        def forest_after_deleting_root(self, _root):
            return list(oracle.independent(fmask)), list(oracle.one_edge(fmask))

        def forest_after_closed_neighborhood(self, _root):
            return list(oracle.independent(hmask)), list(oracle.one_edge(hmask))

    rows = {item[0]: item for item in canonical.terminal_rows(
        nx.Graph(), 0, list(oracle.independent(oracle.full)),
        list(oracle.one_edge(oracle.full)), Adapter(),
    )}
    return rows[target][1][1]


def predicted_row_delta(oracle: Oracle, root: int, target: int, u: int, v: int):
    fmask, hmask = deletion_masks(oracle, root)
    dgi, dgs, Kg, _ = bridge_delta(oracle, oracle.full, u, v)
    dfi, dfs, Kf, _ = bridge_delta(oracle, fmask, u, v)
    if (hmask >> u) & 1 and (hmask >> v) & 1:
        dhi, _dhs, Kh, _ = bridge_delta(oracle, hmask, u, v)
    else:
        dhi, Kh = (0,), (0,)
    return (
        coeff(dgi, 3) + coeff(dgi, 2),
        coeff(dgi, 2) + coeff(dgi, 1),
        coeff(dgs, 4) + coeff(dgs, 3),
        coeff(dgs, 3) + coeff(dgs, 2),
        coeff(dgi, target + 1) + coeff(dgi, target),
        coeff(dgi, target) + coeff(dgi, target - 1),
        coeff(dfi, 2),
        coeff(dfi, target),
        coeff(dfs, 3) + coeff(dhi, 2) + coeff(dfi, 2),
        coeff(dfs, target + 1) + coeff(dhi, target) + coeff(dfi, target),
    ), (Kg, Kf, Kh)


def component_multisets(types, total: int):
    chosen = []

    def rec(remaining, lower):
        if not remaining:
            yield tuple(chosen)
            return
        for index in range(lower, len(types)):
            size = len(types[index])
            if size > remaining:
                break
            chosen.append(index)
            yield from rec(remaining - size, index)
            chosen.pop()

    yield from rec(total, 0)


def finite_audit(max_order: int = 9):
    types = []
    for order in range(2, max_order + 1):
        types.extend(
            nx.convert_node_labels_to_integers(tree, ordering="sorted")
            for tree in nx.nonisomorphic_trees(order)
        )
    forests = bridges = cells = row_equalities = polynomial_equalities = 0
    source_supported_cells = source_cells_without_supported_bridge = 0
    positive = zero = unsupported_after_bridge = 0
    minimum = None
    minimum_cell = ""
    stream = hashlib.sha256()
    for order in range(4, max_order + 1):
        for components in component_multisets(types, order):
            if len(components) < 2:
                continue
            forests += 1
            graphs = [types[index] for index in components]
            graph = nx.disjoint_union_all(graphs)
            ranges = []
            start = 0
            for item in graphs:
                ranges.append(tuple(range(start, start + len(item))))
                start += len(item)
            source = Oracle(graph)
            joined = {}
            support_map = {}
            for root in graph:
                ci = next(k for k, vertices in enumerate(ranges) if root in vertices)
                for u in ranges[ci]:
                    if u == root or graph.degree(u) != 1:
                        continue
                    for oi, vertices in enumerate(ranges):
                        if oi == ci:
                            continue
                        for v in vertices:
                            if graph.degree(v) != 1:
                                continue
                            edge = tuple(sorted((u, v)))
                            if edge not in joined:
                                target_graph = graph.copy()
                                target_graph.add_edge(*edge)
                                joined[edge] = Oracle(target_graph)
                                bridges += 1
                            target_oracle = joined[edge]

                            fmask, hmask = deletion_masks(source, root)
                            for mask in (source.full, fmask):
                                di, ds, _K, _J = bridge_delta(source, mask, u, v)
                                assert trim(add(source.independent(mask), di)) == trim(
                                    target_oracle.independent(mask)
                                )
                                assert trim(add(source.one_edge(mask), ds)) == trim(
                                    target_oracle.one_edge(mask)
                                )
                                polynomial_equalities += 2
                            if (hmask >> u) & 1 and (hmask >> v) & 1:
                                di, ds, _K, _J = bridge_delta(source, hmask, u, v)
                                assert trim(add(source.independent(hmask), di)) == trim(
                                    target_oracle.independent(hmask)
                                )
                                assert trim(add(source.one_edge(hmask), ds)) == trim(
                                    target_oracle.one_edge(hmask)
                                )
                            else:
                                assert trim(source.independent(hmask)) == trim(
                                    target_oracle.independent(hmask)
                                )
                                assert trim(source.one_edge(hmask)) == trim(
                                    target_oracle.one_edge(hmask)
                                )
                            polynomial_equalities += 2

                            for target in range(3, order):
                                base = terminal_base_rows(source, root, target)
                                if not base[7]:
                                    continue
                                support_key = (root, target)
                                support_map.setdefault(support_key, False)
                                tree = terminal_base_rows(target_oracle, root, target)
                                delta, _kernels = predicted_row_delta(
                                    source, root, target, u, v
                                )
                                assert tuple(x + y for x, y in zip(base, delta)) == tree
                                row_equalities += 10
                                if not tree[7]:
                                    unsupported_after_bridge += 1
                                    continue
                                support_map[support_key] = True
                                forest_m1 = delta1(base, target)
                                tree_m1 = delta1(tree, target)
                                assert forest_m1 == canonical_m1(source, root, target)
                                assert tree_m1 == canonical_m1(target_oracle, root, target)
                                difference = forest_m1 - tree_m1
                                assert difference >= 0
                                cells += 1
                                positive += difference > 0
                                zero += difference == 0
                                label = (
                                    f"n={order},components={components},root={root},"
                                    f"edge={edge},j={target}"
                                )
                                stream.update(f"{label}|{difference}\n".encode())
                                if minimum is None or difference < minimum:
                                    minimum, minimum_cell = difference, label
            source_supported_cells += len(support_map)
            source_cells_without_supported_bridge += sum(
                not supported for supported in support_map.values()
            )
    return {
        "maximum_order": max_order,
        "nontrivial_component_forest_multisets": forests,
        "distinct_joined_graph_constructions": bridges,
        "supported_leaf_bridge_cells": cells,
        "full_polynomial_bridge_equalities": polynomial_equalities,
        "terminal_row_field_equalities": row_equalities,
        "positive_differences": positive,
        "zero_differences": zero,
        "source_supported_but_joined_unsupported": unsupported_after_bridge,
        "source_supported_root_target_cells": source_supported_cells,
        "source_cells_without_any_supported_leaf_bridge": (
            source_cells_without_supported_bridge
        ),
        "minimum_forest_minus_tree_m1": minimum,
        "minimum_cell": minimum_cell,
        "ordered_cell_stream_sha256": stream.hexdigest().upper(),
    }


def symbolic_record():
    data = formal.symbolic()
    polynomial = sp.Poly(sp.expand(data["expression"]), data["lambda"])
    assert polynomial.degree() == 4
    counts = [
        len(sp.Poly(
            sp.expand(polynomial.coeff_monomial(data["lambda"] ** power)),
            *data["base"], *data["corrections"], data["j"],
        ).terms())
        for power in range(1, 5)
    ]
    expression = sp.factor(data["expression"].subs(data["lambda"], 1))
    digest = hashlib.sha256((sp.srepr(expression) + "\n").encode()).hexdigest().upper()
    return {
        "lambda_degree": 4,
        "term_counts_by_positive_lambda_power": counts,
        "lambda_one_expression_sha256": digest,
        "mixed_sign_coefficients": True,
    }


def main():
    symbolic = symbolic_record()
    finite = finite_audit(9)
    report = {
        "schema": "terminal-q3-m1-leaf-bridge-correction-audit-v1",
        "date": "2026-08-29",
        "status": "PASS_EXACT_LEAF_BRIDGE_IDENTITY_AND_FINITE_COMMON_FOREST_AUDIT",
        "exact_identity": (
            "For pre-bridge leaves u,v, I'=I-x^2 K and "
            "S'=S+x^2 K-x^2 S_K-x^3 J. Applying this independently to "
            "G,F=G-w,H=G-N[w] gives all ten fixed-low/target-high m1 row "
            "corrections; every literal finite row is equal to that lift."
        ),
        "symbolic_correction": symbolic,
        "finite_common_forest_audit": finite,
        "open_lemma": (
            "Prove forest_m1-tree_m1>=0 from the exact correction for all "
            "orders and ranks. The expanded correction is mixed-sign, so "
            "the finite result is evidence only and correlated K/F/H and "
            "one-edge rows must be retained."
        ),
        "scope": (
            "This proves the bridge row identity, not its all-order sign and "
            "not the all-forest m1 theorem. Isolated components are handled "
            "separately by the already frozen isolate-shift identity once "
            "forest m2 is available."
        ),
        "canonical_source": Path(canonical.__file__).name,
        "canonical_sha256": sha256(Path(canonical.__file__)),
        "formal_source": Path(formal.__file__).name,
        "formal_sha256": sha256(Path(formal.__file__)),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(
        f"cells={finite['supported_leaf_bridge_cells']} "
        f"minimum={finite['minimum_forest_minus_tree_m1']}"
    )
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
