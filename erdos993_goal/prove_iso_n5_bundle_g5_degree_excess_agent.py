#!/usr/bin/env python3
"""Prove the rank-five whole-sibling-bundle coefficient g5 is nonnegative.

The proof starts from the exact 35-term forest-invariant reduction.  It pays
the D contribution directly, then uses two-mark degree-excess variables and
an exact tensor-Bernstein certificate on the remaining forest cone.  The
edgeless C branch is separate.  A finite raw/configuration replay is included
as an audit of the reduction, not as part of the all-order sign proof.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_iso_n4_bundle_g2_deepest_ordinary_independent_agent import (
    independent_poly_bruteforce,
)
from derive_iso_n5_bundle_g5_forest_invariant_agent import derive_raw_g5


HERE = Path(__file__).resolve().parent
CONFIG_SOURCE = HERE / "derive_iso_n5_bundle_g5_forest_invariant_agent.py"
CONFIG = HERE / "iso_n5_bundle_g5_forest_invariant_exact_agent_20260829.json"
OUTPUT = HERE / "iso_n5_bundle_g5_degree_excess_exact_agent_20260829.json"
FOREST_COUNTS = {2: 2, 3: 3, 4: 6, 5: 10, 6: 20}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def tensor_bernstein(expression: sp.Expr, variables: tuple[sp.Symbol, ...]):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(max(0, polynomial.degree(variable)) for variable in variables)
    power = dict(polynomial.terms())
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = 0
        for monomial, coefficient in power.items():
            if all(j <= k for j, k in zip(monomial, index)):
                multiplier = 1
                for j, k, degree in zip(monomial, index, degrees):
                    multiplier *= sp.binomial(k, j) / sp.binomial(degree, j)
                value += coefficient * multiplier
        yield degrees, index, sp.factor(value)


def exact_evaluator(expression: sp.Expr):
    symbols = tuple(sorted(expression.free_symbols, key=str))
    names = tuple(map(str, symbols))
    polynomial = sp.Poly(sp.expand(expression), *symbols)
    denominator = 1
    for coefficient in polynomial.coeffs():
        denominator = sp.ilcm(denominator, int(coefficient.q))
    terms = tuple(
        (monomial, int(coefficient * denominator))
        for monomial, coefficient in polynomial.terms()
    )

    def evaluate(data: dict[str, int]) -> int:
        vector = tuple(data[name] for name in names)
        numerator = 0
        for monomial, coefficient in terms:
            value = coefficient
            for base, exponent in zip(vector, monomial):
                if exponent:
                    value *= base**exponent
            numerator += value
        assert numerator % denominator == 0
        return numerator // denominator

    return evaluate


def unlabeled_forests(order: int):
    tree_types = []
    for size in range(1, order + 1):
        trees = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for tree in trees:
            tree_types.append((size, nx.convert_node_labels_to_integers(tree)))

    def extend(remaining: int, start: int, chosen: tuple[int, ...]):
        if remaining == 0:
            yield nx.disjoint_union_all([tree_types[index][1] for index in chosen])
            return
        for index in range(start, len(tree_types)):
            size = tree_types[index][0]
            if size > remaining:
                break
            yield from extend(remaining - size, index, (*chosen, index))

    yield from extend(order, 0, ())


def at(row, rank: int) -> int:
    return int(row[rank]) if 0 <= rank < len(row) else 0


def minor_rows_numeric(graph: nx.Graph, marks: tuple[int, int]):
    u, v = marks
    rows = []
    for removed in ((), (u,), (v,), (u, v)):
        reduced = graph.copy()
        reduced.remove_nodes_from(removed)
        polynomial = independent_poly_bruteforce(reduced)
        rows.append(tuple(at(polynomial, rank) for rank in range(7)))
    return tuple(rows)


def isolate_rows_numeric(rows, number: int):
    return tuple(
        tuple(
            sum(comb(number, shift) * at(row, rank - shift) for shift in range(rank + 1))
            for rank in range(7)
        )
        for row in rows
    )


def add_xd_numeric(rows, drows):
    return tuple(
        tuple(at(row, rank) + at(drow, rank - 1) for rank in range(7))
        for row, drow in zip(rows, drows)
    )


def nested_numeric(rows, rank: int) -> int:
    e, u, v, w = rows
    r = rank
    return int(
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def finite_difference_g5(crows, drows) -> int:
    t0 = add_xd_numeric(crows, drows)

    def gamma(number: int) -> int:
        tm = add_xd_numeric(isolate_rows_numeric(crows, number), drows)
        lower = sum(
            nested_numeric(isolate_rows_numeric(crows, t), 4)
            for t in range(number)
        )
        return nested_numeric(tm, 5) - nested_numeric(t0, 5) - lower

    return sum(
        (-1) ** (5 - number) * comb(5, number) * gamma(number)
        for number in range(6)
    )


def invariant_data(cgraph: nx.Graph, dgraph: nx.Graph, u: int, v: int):
    cdegree = dict(cgraph.degree())
    eu, ev = int(u in dgraph), int(v in dgraph)
    ddu = dgraph.degree(u) if eu else 0
    ddv = dgraph.degree(v) if ev else 0
    return {
        "n": len(cgraph),
        "q": len(dgraph),
        "epsilon_u": eu,
        "epsilon_v": ev,
        "C_edges": cgraph.number_of_edges(),
        "C_degree_u": cdegree[u],
        "C_degree_v": cdegree[v],
        "C_adjacent": int(cgraph.has_edge(u, v)),
        "C_wedges": sum(comb(degree, 2) for degree in cdegree.values()),
        "C_neighbor_excess_u": sum(cdegree[x] - 1 for x in cgraph.neighbors(u)),
        "C_neighbor_excess_v": sum(cdegree[x] - 1 for x in cgraph.neighbors(v)),
        "C_common_neighbor": len(set(cgraph.neighbors(u)) & set(cgraph.neighbors(v))),
        "D_edges": dgraph.number_of_edges(),
        "D_degree_u": ddu,
        "D_degree_v": ddv,
        "D_adjacent": int(eu and ev and dgraph.has_edge(u, v)),
    }


def raw_row_data(crows, drows):
    data = {}
    for prefix, rows in (("c", crows), ("d", drows)):
        for name, row in zip("EUVW", rows):
            for rank in range(7):
                data[f"{prefix}{name}{rank}"] = at(row, rank)
    return data


def main() -> None:
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    assert config["marker"] == "PASS_EXACT_ISO_N5_BUNDLE_G5_FOREST_INVARIANT_REDUCTION_AGENT"
    expression = sp.sympify(config["forest_invariant_form"])
    raw = derive_raw_g5()
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    n, q = names["n"], names["q"]
    eu, ev = names["epsilon_u"], names["epsilon_v"]
    e = names["C_edges"]
    du, dv = names["C_degree_u"], names["C_degree_v"]
    adjacent = names["C_adjacent"]
    wedges = names["C_wedges"]
    xu, xv = names["C_neighbor_excess_u"], names["C_neighbor_excess_v"]
    common = names["C_common_neighbor"]

    dblock = (
        2 * names["D_edges"]
        + 4 * names["D_degree_u"]
        + 4 * names["D_degree_v"]
        - 10 * names["D_adjacent"]
    )
    residual = sp.expand(expression - dblock)
    assert not residual.has(
        names["D_edges"], names["D_degree_u"],
        names["D_degree_v"], names["D_adjacent"],
    )
    derivatives = {
        "C_adjacent": sp.factor(sp.diff(residual, adjacent)),
        "C_neighbor_excess_u": sp.factor(sp.diff(residual, xu)),
        "C_neighbor_excess_v": sp.factor(sp.diff(residual, xv)),
        "C_common_neighbor": sp.factor(sp.diff(residual, common)),
        "C_wedges": sp.factor(sp.diff(residual, wedges)),
        "q": sp.factor(sp.diff(residual, q)),
    }
    assert sp.expand(derivatives["C_adjacent"] - (36 * n + 20 - 20 * du - 20 * dv)) == 0
    assert derivatives["C_neighbor_excess_u"] == derivatives["C_neighbor_excess_v"] == 36
    assert derivatives["C_common_neighbor"] == -20
    assert derivatives["C_wedges"] == -42
    assert sp.expand(derivatives["q"] - (-2 * q - 6 * n - 4 * eu - 4 * ev - 1)) == 0

    # Edgeless C lies outside e-1 parameterization.  D is then edgeless too.
    t = sp.symbols("t", nonnegative=True)
    edgeless = {}
    edgeless_expected = {
        (0, 0): 84 * n**2 + 85 * n + 26,
        (0, 1): 84 * n**2 + 79 * n + 38,
        (1, 0): 84 * n**2 + 79 * n + 38,
        (1, 1): 84 * n**2 + 73 * n + 50,
    }
    for epsilon_u, epsilon_v in itertools.product((0, 1), repeat=2):
        survival = epsilon_u + epsilon_v
        substitutions = {
            q: n - 2 + survival,
            eu: epsilon_u,
            ev: epsilon_v,
            e: 0,
            du: 0,
            dv: 0,
            adjacent: 0,
            wedges: 0,
            xu: 0,
            xv: 0,
            common: 0,
            names["D_edges"]: 0,
            names["D_degree_u"]: 0,
            names["D_degree_v"]: 0,
            names["D_adjacent"]: 0,
        }
        value = sp.factor(expression.subs(substitutions))
        assert sp.expand(value - edgeless_expected[(epsilon_u, epsilon_v)]) == 0
        shifted = sp.Poly(sp.expand(value.subs(n, t + 2)), t)
        assert all(coefficient > 0 for coefficient in shifted.all_coeffs())
        edgeless[f"{epsilon_u}{epsilon_v}"] = {
            "form": str(value),
            "n_minus_2_power_coefficients": list(map(str, shifted.all_coeffs())),
        }

    # For e>=1 write x=du-1[du>0], y=dv-1[dv>0],
    # r=e-1-x-y.  Then x,y,r>=0 and x+y+r<=n-2.
    a, b, c = sp.symbols("a b c", nonnegative=True)
    box = (a, b, c)
    total = t
    stream = []
    profiles = set()
    minimum = None
    minimum_witness = None
    branch_minima = {}
    for epsilon_u, epsilon_v, zu, zv in itertools.product((0, 1), repeat=4):
        x = total * a if zu else 0
        remaining = total * (1 - a) if zu else total
        y = remaining * b if zv else 0
        remaining = remaining * (1 - b) if zv else remaining
        r = remaining * c
        edge_count = 1 + x + y + r
        degree_u = zu + x
        degree_v = zv + y
        wedge_upper = (
            degree_u * (degree_u - 1) / 2
            + degree_v * (degree_v - 1) / 2
            + r * (r + 1) / 2
        )
        survival = epsilon_u + epsilon_v
        substitutions = {
            n: t + 2,
            q: t + survival,
            eu: epsilon_u,
            ev: epsilon_v,
            e: edge_count,
            du: degree_u,
            dv: degree_v,
            adjacent: 0,
            wedges: wedge_upper,
            xu: 0,
            xv: 0,
            common: zu * zv,
            names["D_edges"]: 0,
            names["D_degree_u"]: 0,
            names["D_degree_v"]: 0,
            names["D_adjacent"]: 0,
        }
        lower = sp.factor(expression.subs(substitutions))
        branch = (epsilon_u, epsilon_v, zu, zv)
        local_minimum = None
        for degrees, index, coefficient in tensor_bernstein(lower, box):
            profiles.add(degrees)
            t_polynomial = sp.Poly(sp.expand(coefficient), t)
            t_coefficients = t_polynomial.all_coeffs()
            assert all(value >= 0 for value in t_coefficients)
            at_zero = sp.factor(coefficient.subs(t, 0))
            if local_minimum is None or at_zero < local_minimum:
                local_minimum = at_zero
            witness = {
                "branch_eu_ev_zu_zv": list(branch),
                "degree_profile": list(degrees),
                "index": list(index),
                "coefficient": str(coefficient),
                "t_power_coefficients_descending": list(map(str, t_coefficients)),
            }
            if minimum is None or at_zero < minimum:
                minimum = at_zero
                minimum_witness = witness
            stream.append(witness)
        branch_minima["".join(map(str, branch))] = str(local_minimum)
    assert len(stream) == 192
    assert minimum == 408
    assert profiles == {(0, 0, 2), (0, 2, 2), (2, 0, 2), (2, 2, 2)}

    # Exact raw/configuration/finite-difference replay on every induced D of
    # every unlabeled C forest through order six.
    evaluate_raw = exact_evaluator(raw)
    evaluate_config = exact_evaluator(expression)
    total_forests = 0
    total_cells = 0
    minimum_direct = None
    by_order = {}
    for order, expected_forests in FOREST_COUNTS.items():
        forests = list(unlabeled_forests(order))
        assert len(forests) == expected_forests
        local_cells = 0
        for cgraph in forests:
            cgraph = nx.convert_node_labels_to_integers(cgraph)
            vertices = tuple(cgraph.nodes())
            graph6 = nx.to_graph6_bytes(cgraph, header=False).decode().strip()
            for u, v in itertools.combinations(vertices, 2):
                crows = minor_rows_numeric(cgraph, (u, v))
                for mask in range(1 << order):
                    removed = [vertices[index] for index in range(order) if mask & (1 << index)]
                    dgraph = cgraph.copy()
                    dgraph.remove_nodes_from(removed)
                    drows = minor_rows_numeric(dgraph, (u, v))
                    raw_value = evaluate_raw(raw_row_data(crows, drows))
                    config_value = evaluate_config(invariant_data(cgraph, dgraph, u, v))
                    finite_difference_value = finite_difference_g5(crows, drows)
                    assert raw_value == config_value == finite_difference_value
                    assert raw_value >= 0
                    record = {
                        "value": raw_value,
                        "order_C": order,
                        "graph6_C": graph6,
                        "marks": [u, v],
                        "removed_mask": mask,
                    }
                    if minimum_direct is None or raw_value < minimum_direct["value"]:
                        minimum_direct = record
                    total_cells += 1
                    local_cells += 1
        expected_cells = expected_forests * comb(order, 2) * (1 << order)
        assert local_cells == expected_cells
        by_order[str(order)] = {
            "unlabeled_C_forests": expected_forests,
            "marked_induced_D_cells": local_cells,
        }
        total_forests += expected_forests

    report = {
        "marker": "PASS_EXACT_ISO_N5_BUNDLE_G5_DEGREE_EXCESS_AGENT",
        "theorem": (
            "For every rank-five whole-sibling-bundle forest cell with two "
            "distinct protected marks, the coefficient g5=[binom(M,5)]Gamma_M "
            "is nonnegative."
        ),
        "forest_invariant_form": str(expression),
        "payments": {
            "D_block": str(dblock),
            "D_block_proof": (
                "If D_adjacent=0 this is manifestly nonnegative. If it is 1, "
                "D_edges,D_degree_u,D_degree_v are all at least 1, so the block "
                "is 2(D_edges-1)+4(D_degree_u-1)+4(D_degree_v-1)."
            ),
            "C_adjacency": (
                "Its coefficient is 36n+20-20(du+dv)>=16n+20 because a forest "
                "satisfies du+dv<=n; hence it may be dropped."
            ),
            "C_neighbor_excess": "Both coefficients are +36 and are dropped.",
            "C_common_neighbor": (
                "Its coefficient is -20; common(u,v)<=z_u z_v in a forest."
            ),
            "q": (
                "The q derivative is strictly negative, and deleting every "
                "nonsurviving protected mark gives q<=n-2+epsilon_u+epsilon_v."
            ),
            "wedge_cap": (
                "For e>=1, x=du-z_u,y=dv-z_v,r=e-1-x-y are nonnegative and "
                "W<=C(du,2)+C(dv,2)+C(r+1,2)."
            ),
        },
        "derivatives": {key: str(value) for key, value in derivatives.items()},
        "edgeless_C": edgeless,
        "bernstein_certificate": {
            "orders": "n>=2 with e_C>=1",
            "q_definition": "t=n-2>=0",
            "branches_epsilon_u_epsilon_v_z_u_z_v": 16,
            "degree_profiles": [list(profile) for profile in sorted(profiles)],
            "coefficients": len(stream),
            "all_t_power_coefficients_nonnegative": True,
            "minimum_at_t0": str(minimum),
            "minimum_witness": minimum_witness,
            "branch_minima_at_t0": branch_minima,
            "ordered_stream_sha256": hashlib.sha256(
                json.dumps(stream, separators=(",", ":"), sort_keys=True).encode()
            ).hexdigest().upper(),
            "stick_breaking": (
                "Allocate t successively to active x, active y, r, and unused "
                "slack with box variables a,b,c in [0,1]."
            ),
        },
        "finite_replay": {
            "C_orders": [2, 6],
            "unlabeled_C_forests": total_forests,
            "marked_induced_D_cells": total_cells,
            "minimum": minimum_direct,
            "by_order": by_order,
            "checks": (
                "raw 38-monomial row coefficient = 35-term forest-invariant "
                "form = fifth finite difference of the defining Gamma_M"
            ),
        },
        "scope": (
            "Exact universal sign theorem for the rank-five whole-bundle "
            "coefficient g5 only. It does not assert g1-g4, the separate g6-g8 "
            "coefficients, the full rank-five Bundle Payment Lemma, all N5, or "
            "Erdos Problem 993."
        ),
        "dependencies": {
            CONFIG_SOURCE.name: sha256(CONFIG_SOURCE),
            CONFIG.name: sha256(CONFIG),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "theorem": report["theorem"],
        "bernstein_certificate": report["bernstein_certificate"],
        "finite_replay": report["finite_replay"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
