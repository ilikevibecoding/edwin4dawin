#!/usr/bin/env python3
"""Probe complete color-switching orbits for the coupled ordinary r=4 gap.

This is a route diagnostic, not a positivity proof.  It expands the exact
rank-four coupled gap as weights on ordered independent-set pairs, groups a
pair by all switches of the connected components of its symmetric
difference, and tests whether the commutative C*C products can be oriented
so every complete orbit is nonnegative.
"""

from __future__ import annotations

from fractions import Fraction
import itertools
import json
from pathlib import Path

import networkx as nx
import numpy as np
from scipy.optimize import linprog
import sympy as sp

from prove_iso_compact_ordinary_prefix_r2_r3_root import (
    compact_pieces,
    generic_rows,
)
from verify_iso_compact_ordinary_allrank_split_counterexample_root import (
    graph6,
    ordinary_cell,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_compact_ordinary_r4_switching_orbit_probe_root_20260829.json"


def expanded_terms():
    C = generic_rows("c", 6)
    H = generic_rows("h", 6)
    expression = sp.expand(sum(compact_pieces(C, H, 4)))
    out = []
    for term in sp.Add.make_args(expression):
        coefficient, rest = term.as_coeff_Mul()
        factors = []
        for factor in rest.as_ordered_factors():
            if factor.is_Pow:
                factors.extend([str(factor.base)] * int(factor.exp))
            else:
                factors.append(str(factor))
        out.append((int(coefficient), factors))
    return expression, out


EXPRESSION, TERMS = expanded_terms()
VARIABLE_TERMS = []
FIXED_TERMS = []
for coefficient, factors in TERMS:
    prefixes = [factor[0] for factor in factors]
    variable = (
        len(factors) == 1
        and prefixes == ["c"]
        or len(factors) == 2
        and prefixes == ["c", "c"]
        and factors[0] != factors[1]
    )
    (VARIABLE_TERMS if variable else FIXED_TERMS).append((coefficient, factors))


def matches(variable: str, chosen: set[int], u, v) -> int:
    row = variable[1]
    rank = int(variable[2:])
    return int(
        len(chosen) == rank
        and not (row in "UW" and u in chosen)
        and not (row in "VW" and v in chosen)
    )


def allocated_weight(I: set[int], J: set[int], u, v, T: set[int]):
    """Return b,a with pair weight b+sum a_i lambda_i.

    lambda orients a commutative C*C product (or a single C factor paired
    with the empty set) between (I,J) and (J,I).  Any lambda gives the same
    global polynomial after summing all ordered pairs.
    """
    constant = 0
    linear = [0] * len(VARIABLE_TERMS)
    for coefficient, factors in FIXED_TERMS:
        prefixes = [factor[0] for factor in factors]
        if len(factors) == 2 and prefixes == ["c", "c"]:
            constant += (
                coefficient
                * matches(factors[0], I, u, v)
                * matches(factors[1], J, u, v)
            )
        elif len(factors) == 2 and sorted(prefixes) == ["c", "h"]:
            if not J.intersection(T):
                c_factor = next(x for x in factors if x[0] == "c")
                h_factor = next(x for x in factors if x[0] == "h")
                constant += (
                    coefficient
                    * matches(c_factor, I, u, v)
                    * matches(h_factor, J, u, v)
                )
        elif len(factors) == 1 and prefixes == ["h"]:
            if not I and not J.intersection(T):
                constant += coefficient * matches(factors[0], J, u, v)
        else:
            raise AssertionError((coefficient, factors))

    for index, (coefficient, factors) in enumerate(VARIABLE_TERMS):
        if len(factors) == 2:
            forward = matches(factors[0], I, u, v) * matches(
                factors[1], J, u, v
            )
            reverse = matches(factors[1], I, u, v) * matches(
                factors[0], J, u, v
            )
        else:
            forward = matches(factors[0], I, u, v) * int(not J)
            reverse = matches(factors[0], J, u, v) * int(not I)
        constant += coefficient * reverse
        linear[index] += coefficient * (forward - reverse)
    return constant, tuple(linear)


def independent_sets(graph: nx.Graph):
    vertices = tuple(graph)
    out = []
    for mask in range(1 << len(vertices)):
        chosen = {vertices[index] for index in range(len(vertices)) if mask >> index & 1}
        if all(not (x in chosen and y in chosen) for x, y in graph.edges()):
            out.append(chosen)
    return out


def switch_orbit(graph: nx.Graph, I: set[int], J: set[int]):
    symmetric = I.symmetric_difference(J)
    components = (
        [set(part) for part in nx.connected_components(graph.subgraph(symmetric))]
        if symmetric
        else []
    )
    orbit = set()
    for mask in range(1 << len(components)):
        left, right = set(I), set(J)
        for index, component in enumerate(components):
            if mask >> index & 1:
                old_left = left.intersection(component)
                old_right = right.intersection(component)
                left = left.difference(component).union(old_right)
                right = right.difference(component).union(old_left)
        orbit.add((frozenset(left), frozenset(right)))
    return tuple(sorted(orbit, key=lambda pair: (tuple(sorted(pair[0])), tuple(sorted(pair[1])))))


def constraint_system():
    constraints = {}
    symmetric_minimum = None
    symmetric_negative = 0
    checked = 0
    for order in range(6):
        graphs = (
            [nx.empty_graph()]
            if order == 0
            else [
                nx.convert_node_labels_to_integers(graph)
                for graph in nx.graph_atlas_g()
                if len(graph) == order and nx.is_forest(graph)
            ]
        )
        for graph in graphs:
            vertices = set(graph)
            sets = independent_sets(graph)
            graph_components = (
                [set(part) for part in nx.connected_components(graph)]
                if order
                else []
            )
            seen_orbits = set()
            for I in sets:
                for J in sets:
                    if I.union(J) != vertices or len(I) + len(J) > 5:
                        continue
                    orbit = switch_orbit(graph, I, J)
                    if orbit in seen_orbits:
                        continue
                    seen_orbits.add(orbit)
                    for tmask in range(1 << order):
                        T = {vertex for vertex in vertices if tmask >> vertex & 1}
                        if any(len(T.intersection(part)) > 1 for part in graph_components):
                            continue
                        locations = [None, *sorted(vertices)]
                        for u in locations:
                            for v in locations:
                                if u is not None and u == v:
                                    continue
                                constant = 0
                                linear = [0] * len(VARIABLE_TERMS)
                                symmetric_value = Fraction(0)
                                for left0, right0 in orbit:
                                    base, vector = allocated_weight(
                                        set(left0), set(right0), u, v, T
                                    )
                                    constant += base
                                    linear = [x + y for x, y in zip(linear, vector)]
                                    symmetric_value += Fraction(base) + sum(
                                        Fraction(entry, 2) for entry in vector
                                    )
                                metadata = {
                                    "union_order": order,
                                    "union_edges": list(graph.edges()),
                                    "T": sorted(T),
                                    "u": u,
                                    "v": v,
                                    "orbit": [
                                        [sorted(left0), sorted(right0)]
                                        for left0, right0 in orbit
                                    ],
                                }
                                constraints.setdefault(
                                    (constant, tuple(linear)), metadata
                                )
                                checked += 1
                                if symmetric_value < 0:
                                    symmetric_negative += 1
                                if (
                                    symmetric_minimum is None
                                    or symmetric_value < symmetric_minimum[0]
                                ):
                                    symmetric_minimum = (
                                        symmetric_value,
                                        metadata,
                                    )
    return constraints, checked, symmetric_negative, symmetric_minimum


def feasible(keys, bounded: bool) -> bool:
    matrix = np.array([[-entry for entry in linear] for _, linear in keys], dtype=float)
    rhs = np.array([constant for constant, _ in keys], dtype=float)
    bounds = [(0, 1)] * len(VARIABLE_TERMS) if bounded else [(None, None)] * len(VARIABLE_TERMS)
    result = linprog(
        np.zeros(len(VARIABLE_TERMS)),
        A_ub=matrix,
        b_ub=rhs,
        bounds=bounds,
        method="highs-ds",
    )
    return bool(result.success)


def irreducible_infeasible(keys, bounded: bool):
    core = list(keys)
    changed = True
    while changed:
        changed = False
        for key in tuple(core):
            trial = [item for item in core if item != key]
            if trial and not feasible(trial, bounded):
                core = trial
                changed = True
    return core


def main() -> None:
    # A realizable rank-four cell containing the orientation-independent
    # negative complete orbit.  T is empty, so H=C.
    D = nx.Graph()
    D.add_nodes_from(range(5))
    D.add_edges_from(((1, 3), (2, 3), (3, 4)))
    marks = (0, 3)
    T = set()
    bad_orbit = switch_orbit(D, {0, 1, 2, 4}, {3})
    orbit_constant = 0
    orbit_linear = [0] * len(VARIABLE_TERMS)
    for left0, right0 in bad_orbit:
        base, vector = allocated_weight(
            set(left0), set(right0), marks[0], marks[1], T
        )
        orbit_constant += base
        orbit_linear = [x + y for x, y in zip(orbit_linear, vector)]
    assert orbit_constant == -20
    assert orbit_linear == [0] * len(VARIABLE_TERMS)

    B = D.copy()
    support, leaf = 5, 6
    B.add_edge(support, leaf)
    cell = ordinary_cell(B, marks[0], marks[1], leaf, 4)
    assert cell["alpha_W"] == 3
    assert cell["full_gap"] == 838

    # Check that the allocated ordered-pair expansion reconstructs the whole
    # exact cell for lambda=1/2.  This validates the orbit weights against the
    # original compact formula rather than treating them as a formal proxy.
    total_weight = Fraction(0)
    for I in independent_sets(D):
        for J in independent_sets(D):
            base, vector = allocated_weight(I, J, marks[0], marks[1], T)
            total_weight += Fraction(base) + sum(
                Fraction(entry, 2) for entry in vector
            )
    assert total_weight == cell["full_gap"]

    constraints, checked, symmetric_negative, symmetric_minimum = constraint_system()
    keys = list(constraints)
    bounded_feasible = feasible(keys, bounded=True)
    unbounded_feasible = feasible(keys, bounded=False)
    core = irreducible_infeasible(keys, bounded=not unbounded_feasible)
    print("constraints", len(keys), "variables", len(VARIABLE_TERMS))
    print("bounded feasible", bounded_feasible, "unbounded feasible", unbounded_feasible)
    print("IIS size", len(core))
    for key in core:
        constant, linear = key
        print("constraint", constant, [(i, x) for i, x in enumerate(linear) if x])
        print("metadata", constraints[key])

    report = {
        "marker": "PROBE_EXACT_ISO_COMPACT_ORDINARY_R4_SWITCHING_ORBIT",
        "rank": 4,
        "expanded_term_count": len(TERMS),
        "orientation_variables": len(VARIABLE_TERMS),
        "abstract_cells_checked": checked,
        "unique_linear_constraints": len(keys),
        "symmetric_allocation": {
            "negative": symmetric_negative,
            "minimum": str(symmetric_minimum[0]),
            "witness": symmetric_minimum[1],
        },
        "bounded_orientation_feasible": bounded_feasible,
        "unbounded_orientation_feasible": unbounded_feasible,
        "realizable_orbit_obstruction": {
            "D_graph6": graph6(D),
            "D_edges": list(D.edges()),
            "marks": {"u": marks[0], "v": marks[1]},
            "T": [],
            "ambient_B_graph6": graph6(B),
            "ordinary_leaf": {"z": leaf, "support": support},
            "rank": 4,
            "alpha_W": cell["alpha_W"],
            "orbit": [
                [sorted(left0), sorted(right0)] for left0, right0 in bad_orbit
            ],
            "orbit_sum": orbit_constant,
            "orientation_vector": {},
            "whole_cell_gap": cell["full_gap"],
            "whole_cell_weight_reconstruction": str(total_weight),
        },
        "irreducible_infeasible_core": [
            {
                "constant": constant,
                "linear": {str(i): x for i, x in enumerate(linear) if x},
                "metadata": constraints[(constant, linear)],
            }
            for constant, linear in core
        ],
        "variable_terms": [
            {"index": index, "coefficient": coefficient, "factors": factors}
            for index, (coefficient, factors) in enumerate(VARIABLE_TERMS)
        ],
        "scope": (
            "Exact finite route diagnostic. Infeasibility says the direct "
            "complete-orbit proof with only commutative product orientation "
            "cannot make every rank-four orbit nonnegative. It does not "
            "refute the full coupled gap or rank-four FML."
        ),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_bytes(raw.encode("utf-8"))
    print(report["marker"])


if __name__ == "__main__":
    main()
