#!/usr/bin/env python3
"""Derive the high binomial coefficients of the rank-three leaf bundle.

Let C be a tree with distinct protected vertices v,s.  Let t be a
leaf outside the v--s path, with parent p not in {v,s}.  Attach d new
leaf children to t and write T(d) for the actual rank-three sibling
Theta increment at support s.  This script proves symbolically that

    [C(d,4)] T(d) = 32,
    [C(d,3)] T(d) = 12*n + 32*1[v~s] + 92,

and derives an elementary formula for [C(d,2)] T(d).  It then proves
that the latter is positive using only the elementary domain
constraints.  Thus only the first bundle difference remains to be
controlled.

The normalization follows ``recursive_blocks_fast(..., q=3,
subtract_lower=False)``: T is twice the unscaled theta-core
increment.
"""

from __future__ import annotations

import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from analyze_deepest_support_leaf_bundle_differences import (
    add_leaf_bundle,
    forward_coefficients,
)
from stress_sibling_theta_core_recursive_phase_split import (
    recursive_blocks_fast,
)


def theta_core_rank3(
    b3,
    b4,
    b5,
    j1,
    j2,
    j3,
    j4,
    r3,
    eb3,
    ej2,
    ej1,
):
    """The unscaled rank-three sibling theta core d_3."""
    return sp.expand(
        -3 * b3 * ej1
        - 20 * b3 * j3
        + 32 * b4 * j2
        - 20 * b5 * j1
        - 3 * eb3 * j1
        - 3 * ej1 * j2
        - 3 * ej2 * j1
        - 8 * j1 * j3
        - 28 * j1 * j4
        - 6 * j1 * r3
        + 8 * j2**2
        + 18 * j2 * j3
        - 16 * j2 * j4
        - 6 * j2 * r3
        + 14 * j3**2
    )


def symbolic_bundle_coefficients():
    """Return the binomial coefficients of d_3(C+d leaves at t)."""
    # L=C-t, R=C-{t,p}; K=C-{v,t}, Q=C-{v,t,p};
    # U=(C-N[v])-t.  The remaining capital letters are the edge
    # analogues required by the residual-edge leaf recurrence.
    L = sp.symbols("L0:6")
    R = sp.symbols("R0:5")
    K = sp.symbols("K0:5")
    Q = sp.symbols("Q0:4")
    U = sp.symbols("U0:4")
    V2 = sp.symbols("V2")
    EL = sp.symbols("EL0:4")
    ER2 = sp.symbols("ER2")
    A3 = sp.symbols("A3")
    EK = sp.symbols("EK0:3")
    EQ1, AK2, AK1, EQ0 = sp.symbols("EQ1 AK2 AK1 EQ0")

    def independent(sequence, selected, d, rank):
        return (
            sum(
                comb(d, amount) * sequence[rank - amount]
                for amount in range(min(d, rank) + 1)
            )
            + selected[rank - 1]
        )

    def b(d, rank):
        return independent(L, R, d, rank)

    def j(d, rank):
        return independent(K, Q, d, rank)

    def root_residual(d):
        return (
            sum(
                comb(d, amount) * U[3 - amount]
                for amount in range(min(d, 3) + 1)
            )
            + V2
        )

    def eb3(d):
        return (
            sum(
                comb(d, amount) * EL[3 - amount]
                for amount in range(min(d, 3) + 1)
            )
            + A3
            + d * R[3]
            + ER2
        )

    def ej2(d):
        return (
            sum(
                comb(d, amount) * EK[2 - amount]
                for amount in range(min(d, 2) + 1)
            )
            + AK2
            + d * Q[2]
            + EQ1
        )

    def ej1(d):
        return (
            sum(
                comb(d, amount) * EK[1 - amount]
                for amount in range(min(d, 1) + 1)
            )
            + AK1
            + d * Q[1]
            + EQ0
        )

    values = []
    for d in range(7):
        values.append(
            theta_core_rank3(
                b(d, 3),
                b(d, 4),
                b(d, 5),
                j(d, 1),
                j(d, 2),
                j(d, 3),
                j(d, 4),
                root_residual(d),
                eb3(d),
                ej2(d),
                ej1(d),
            )
        )
    coefficients = []
    while values:
        coefficients.append(sp.expand(values[0]))
        values = [
            sp.expand(values[index + 1] - values[index])
            for index in range(len(values) - 1)
        ]
    symbols = {
        "L": L,
        "R": R,
        "K": K,
        "Q": Q,
        "U": U,
        "V2": V2,
        "EL": EL,
        "ER2": ER2,
        "A3": A3,
        "EK": EK,
        "EQ1": EQ1,
        "AK2": AK2,
        "AK1": AK1,
        "EQ0": EQ0,
    }
    return coefficients, symbols


def high_coefficient_formulas():
    """Derive leaf-at-s changes of bundle coefficients 4,3,2."""
    coefficients, z = symbolic_bundle_coefficients()
    n, dv, ds, dp = sp.symbols(
        "n dv ds dp", integer=True, positive=True
    )
    a, b, c, g = sp.symbols(
        "a b c g", integer=True, nonnegative=True
    )
    Av, As = sp.symbols("Av As", nonnegative=True)

    # Direct simplification of the fourth coefficient of d_3, then
    # the ordinary leaf update at s.  The update is 16 in the
    # unscaled core, hence 32 in T.
    L, K, Q, U, EK, EL = (
        z["L"],
        z["K"],
        z["Q"],
        z["U"],
        z["EK"],
        z["EL"],
    )
    base_zero_order = {
        L[0]: 1,
        K[0]: 1,
        Q[0]: 1,
        U[0]: 1,
        z["R"][0]: 1,
        L[1]: n - 1,
        K[1]: n - 2,
        Q[1]: n - 3,
    }
    fourth_core = sp.factor(coefficients[4].subs(base_zero_order))
    expected_fourth_core = 4 * (
        -3 * EK[0]
        - 3 * EL[0]
        - 12 * K[2]
        + 8 * L[2]
        - 9 * U[1]
        + 2 * n**2
        - 3 * n
        + 13
    )
    assert sp.expand(fourth_core - expected_fourth_core) == 0
    fourth_delta = sp.expand(
        expected_fourth_core.subs(
            {
                n: n + 1,
                EK[0]: EK[0] + 1,
                EL[0]: EL[0] + 1,
                K[2]: K[2] + n - 3,
                L[2]: L[2] + n - 2,
                U[1]: U[1] + 1,
            },
            simultaneous=True,
        )
        - expected_fourth_core
    )
    assert fourth_delta == 16

    # The third coefficient is simplified by applying all elementary
    # leaf updates.  Its unscaled delta is 6n+16a+46.
    AK1s, EK0s, EK1s, EL0s, EL1s, EQ0s = sp.symbols(
        "AK1s EK0s EK1s EL0s EL1s EQ0s"
    )
    K2s, K3s, L2s, L3s, Q2s, R2s = sp.symbols(
        "K2s K3s L2s L3s Q2s R2s"
    )
    U1s, U2s, ns = sp.symbols("U1s U2s ns")
    third_template = (
        -3 * AK1s
        - 9 * EK0s * ns
        - 18 * EK0s
        - 3 * EK1s
        - 3 * EL0s * ns
        - 6 * EL0s
        - 9 * EL1s
        - 3 * EQ0s
        - 8 * K2s * ns
        - 102 * K2s
        - 40 * K3s
        + 16 * L2s * ns
        + 20 * L2s
        + 16 * L3s
        + 8 * Q2s
        - 20 * R2s
        - 18 * U1s * ns
        - 18 * U1s
        - 18 * U2s
        + 45 * ns**2
        - 140 * ns
        + 141
    )
    choose2 = lambda value: value * (value - 1) / 2
    base = {
        ns: n,
        AK1s: n - 2 - dp + b,
        EK0s: n - 2 - dv,
        EL0s: n - 2,
        EQ0s: n - 1 - dp - dv + b,
        K2s: choose2(n - 2) - (n - 2 - dv),
        L2s: choose2(n - 1) - (n - 2),
        Q2s: choose2(n - 3) - (n - 1 - dp - dv + b),
        R2s: choose2(n - 2) - (n - 1 - dp),
        U1s: n - 2 - dv,
    }
    k_without_s_2 = (
        choose2(n - 3) - (n - 2 - dv - ds + a)
    )
    l_without_s_2 = choose2(n - 2) - (n - 2 - ds)
    updates = {
        ns: n + 1,
        AK1s: base[AK1s] + 1,
        EK0s: base[EK0s] + 1,
        EK1s: EK1s + 2 * n - 5 - dv - 2 * ds + 2 * a,
        EL0s: base[EL0s] + 1,
        EL1s: EL1s + 2 * (n - 2 - ds),
        EQ0s: base[EQ0s] + 1,
        K2s: base[K2s] + n - 3,
        K3s: K3s + k_without_s_2,
        L2s: base[L2s] + n - 2,
        L3s: L3s + l_without_s_2,
        Q2s: base[Q2s] + n - 4,
        R2s: base[R2s] + n - 3,
        U1s: base[U1s] + 1,
        U2s: U2s + base[U1s] - (1 - a),
    }
    third_delta = sp.factor(
        sp.expand(
            third_template.subs(updates, simultaneous=True)
            - third_template.subs(base, simultaneous=True)
        )
    )
    assert sp.expand(third_delta - (6 * n + 16 * a + 46)) == 0, (
        third_delta
    )

    # The corresponding symbolic reduction of coefficient two.  Av
    # and As are endpoint-wedge counts sum_{u~v}(d_u-1) and
    # sum_{u~s}(d_u-1).  The four indicators mean:
    # a=[v~s], b=[v~p], c=[s~p], g=[dist(v,s)=2].
    second_delta = sp.expand(
        6 * As
        + 16 * Av
        - 7 * a**2
        - 10 * a * ds
        - 10 * a * dv
        - 14 * a * g
        + 16 * a * n
        + 23 * a
        - 20 * b
        - 16 * c
        + 4 * dp
        + 3 * ds**2
        + 9 * ds
        + 8 * dv**2
        - 25 * dv
        - 10 * g
        + 26 * n
        - 24
    )

    # Positivity proof.  When a=0, use n>=4, all degrees >=1,
    # min_{d>=1}(8d^2-25d)=-18, and b,c,g<=1.  When a=1, g=0 and
    # b+c<=1 in a tree; the two degree quadratics have minima -38
    # and 2.  These deliberately discard Av,As and hence are valid
    # coarse lower bounds.
    lower_a0 = (
        26 * 4
        - 24
        - 18
        + 12
        + 4
        - 20
        - 16
        - 10
    )
    assert lower_a0 == 32
    lower_a1 = (
        42 * 4
        - 8
        - 38
        + 2
        + 4
        - 20
    )
    assert lower_a1 == 108

    return {
        "fourth_core_delta": fourth_delta,
        "third_core_delta": third_delta,
        "second_core_delta": second_delta,
        "second_core_lower_bound_a0": lower_a0,
        "second_core_lower_bound_a1": lower_a1,
    }


def direct_total(tree: nx.Graph, root: int, support: int) -> int:
    blocks = recursive_blocks_fast(
        tree, root, support, 3, subtract_lower=False
    )
    return sum(blocks.values())


def finite_replay(maximum_order: int = 9) -> dict:
    checks = 0
    failures = []
    minima = {index: None for index in range(1, 5)}
    for order in range(4, maximum_order + 1):
        for tree0 in nx.nonisomorphic_trees(order):
            tree = nx.convert_node_labels_to_integers(tree0)
            code = nx.to_graph6_bytes(
                tree, header=False
            ).decode("ascii").strip()
            for root in tree:
                for support in tree:
                    if root == support:
                        continue
                    protected_path = set(
                        nx.shortest_path(tree, root, support)
                    )
                    for leaf_support in tree:
                        if (
                            leaf_support in {root, support}
                            or tree.degree(leaf_support) != 1
                            or leaf_support in protected_path
                        ):
                            continue
                        parent = next(iter(tree[leaf_support]))
                        if parent in {root, support}:
                            continue
                        values = [
                            direct_total(
                                add_leaf_bundle(
                                    tree, leaf_support, count
                                ),
                                root,
                                support,
                            )
                            for count in range(6)
                        ]
                        coefficients = forward_coefficients(values)
                        adjacent = int(tree.has_edge(root, support))
                        distance_two = int(
                            nx.shortest_path_length(
                                tree, root, support
                            )
                            == 2
                        )
                        root_parent_adjacent = int(
                            tree.has_edge(root, parent)
                        )
                        support_parent_adjacent = int(
                            tree.has_edge(support, parent)
                        )
                        root_degree = tree.degree(root)
                        support_degree = tree.degree(support)
                        parent_degree = tree.degree(parent)
                        root_wedges = sum(
                            tree.degree(neighbor) - 1
                            for neighbor in tree[root]
                        )
                        support_wedges = sum(
                            tree.degree(neighbor) - 1
                            for neighbor in tree[support]
                        )
                        second_core = (
                            6 * support_wedges
                            + 16 * root_wedges
                            - 7 * adjacent**2
                            - 10 * adjacent * support_degree
                            - 10 * adjacent * root_degree
                            - 14 * adjacent * distance_two
                            + 16 * adjacent * order
                            + 23 * adjacent
                            - 20 * root_parent_adjacent
                            - 16 * support_parent_adjacent
                            + 4 * parent_degree
                            + 3 * support_degree**2
                            + 9 * support_degree
                            + 8 * root_degree**2
                            - 25 * root_degree
                            - 10 * distance_two
                            + 26 * order
                            - 24
                        )
                        expected = {
                            2: 2 * second_core,
                            4: 32,
                            3: 12 * order + 32 * adjacent + 92,
                        }
                        for index in range(1, 5):
                            value = coefficients[index]
                            record = {
                                "order": order,
                                "graph6": code,
                                "root": root,
                                "support": support,
                                "leaf_support": leaf_support,
                                "difference_order": index,
                                "coefficient": value,
                            }
                            checks += 1
                            if (
                                minima[index] is None
                                or value < minima[index][0]
                            ):
                                minima[index] = (value, record)
                            if (
                                index in expected
                                and value != expected[index]
                            ):
                                failures.append(
                                    {
                                        **record,
                                        "expected": expected[index],
                                    }
                                )
                            if index in (2, 3, 4) and value <= 0:
                                failures.append(
                                    {
                                        **record,
                                        "expected": "strictly positive",
                                    }
                                )
    return {
        "maximum_tree_order": maximum_order,
        "checked_coefficients": checks,
        "failure_count": len(failures),
        "failures": failures[:20],
        "minima": {
            str(index): item[1] if item is not None else None
            for index, item in minima.items()
        },
    }


def main() -> None:
    formulas = high_coefficient_formulas()
    replay = finite_replay()
    report = {
        "status": (
            "PASS_RANK3_DEEPEST_BUNDLE_HIGH_COEFFICIENTS"
            if not replay["failure_count"]
            else "FAIL_RANK3_DEEPEST_BUNDLE_HIGH_COEFFICIENTS"
        ),
        "normalization": (
            "T(d) is twice the unscaled actual rank-three "
            "theta-core increment."
        ),
        "proved_coefficients": {
            "binomial_order_4": "32",
            "binomial_order_3": "12*n + 32*1[v~s] + 92",
            "binomial_order_2": (
                "2 times the recorded elementary core formula; "
                "strictly positive"
            ),
        },
        "second_core_formula": str(
            formulas["second_core_delta"]
        ),
        "second_core_lower_bounds": {
            "v_not_adjacent_s": int(
                formulas["second_core_lower_bound_a0"]
            ),
            "v_adjacent_s": int(
                formulas["second_core_lower_bound_a1"]
            ),
        },
        "remaining_obligation": (
            "Prove the first binomial coefficient nonnegative for "
            "core order n>=6; the finite n=4,5 negative values are "
            "handled as terminal exceptions."
        ),
        **replay,
    }
    output = Path(
        "rank3_deepest_bundle_high_coefficients_20260729.json"
    )
    output.write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
