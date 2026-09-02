#!/usr/bin/env python3
"""Independent exact audit of the parent-rooted g1 cone certificate.

This file independently reconstructs the parent-rooted residual after the
proved high-motif payment, verifies every monotone replacement used in its
large-order lower bound, and certifies that lower bound on the full relaxed
degree-excess simplex for n >= 12.

The primary certificate uses the total-degree Bernstein basis on a simplex,
not the stick-breaking tensor basis used by the discovery script.  A complete
finite census for 3 <= n <= 11 is replayed independently from unlabeled forest
component multisets.  The scope remains the canonical deepest-ordinary
singleton-parent bundle cell only.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb, factorial
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
CONFIG_REPORT = HERE / "iso_n4_bundle_g1_deepest_configuration_exact_agent_20260829.json"
PARENT_REPORT = HERE / "iso_n4_bundle_g1_parent_residual_exact_agent_20260829.json"
ROOT_REPORT = HERE / "iso_n4_bundle_g1_parent_residual_root_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g1_parent_cone_complete_independent_audit_g1_bernstein_20260829.json"

FOREST_COUNTS = {
    3: 3,
    4: 6,
    5: 10,
    6: 20,
    7: 37,
    8: 76,
    9: 153,
    10: 329,
    11: 710,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose2(value: sp.Expr) -> sp.Expr:
    return sp.expand(value * (value - 1) / 2)


def reconstruct_parent_residual() -> tuple[sp.Expr, dict[str, sp.Symbol]]:
    """Reconstruct from the upstream configuration identity, not the parent report."""
    source = json.loads(CONFIG_REPORT.read_text(encoding="utf-8"))
    assert source["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_DEEPEST_CONFIGURATION_REDUCTION_AGENT"
    full = sp.sympify(source["form"])
    motif = sp.sympify(source["motif_part"])
    residual = sp.expand(full - motif)
    assert sp.expand(residual - sp.sympify(source["residual_without_high_motifs"])) == 0

    names = {str(symbol): symbol for symbol in residual.free_symbols}
    e = names["edge_count"]
    wedges = names["C_wedges_E"]
    du, dv = names["degree_u"], names["degree_v"]
    xu, xv = names["C_neighbor_excess_u"], names["C_neighbor_excess_v"]
    de = names["D_edges"]
    d_wedges = names["D_wedges_E"]
    ddu, ddv = names["D_degree_u"], names["D_degree_v"]
    dxu, dxv = names["D_neighbor_excess_u"], names["D_neighbor_excess_v"]

    dp, xp = sp.symbols(
        "parent_degree parent_neighbor_excess", integer=True, nonnegative=True
    )
    apu, apv = sp.symbols(
        "parent_adjacent_u parent_adjacent_v", integer=True, nonnegative=True
    )
    cpu, cpv = sp.symbols(
        "parent_common_neighbor_u parent_common_neighbor_v",
        integer=True,
        nonnegative=True,
    )
    rules = {
        de: e - dp,
        d_wedges: wedges - choose2(dp) - xp,
        ddu: du - apu,
        ddv: dv - apv,
        dxu: xu - apu * (dp - 1) - cpu,
        dxv: xv - apv * (dp - 1) - cpv,
    }
    parent = sp.expand(residual.subs(rules))
    for boolean in (names["adjacent"], apu, apv):
        parent = sp.rem(
            sp.Poly(parent, boolean), sp.Poly(boolean**2 - boolean, boolean)
        ).as_expr()
    parent = sp.factor(parent)

    recorded = json.loads(PARENT_REPORT.read_text(encoding="utf-8"))
    assert recorded["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_PARENT_ROOTED_RESIDUAL_REDUCTION_AGENT"
    parent_locals = {str(symbol): symbol for symbol in parent.free_symbols}
    assert sp.expand(
        parent - sp.sympify(recorded["parent_rooted_form"], locals=parent_locals)
    ) == 0

    # The parallel root derivation uses shorter names.  Rename it to the
    # independent symbols and require literal polynomial equality.
    root = json.loads(ROOT_REPORT.read_text(encoding="utf-8"))
    assert root["marker"] == "DERIVED_EXACT_ISO_N4_BUNDLE_G1_PARENT_ROOTED_RESIDUAL"
    root_locals = {
        **parent_locals,
        "degree_p": dp,
        "neighbor_excess_p": xp,
        "adjacent_pu": apu,
        "adjacent_pv": apv,
        "common_neighbor_pu": cpu,
        "common_neighbor_pv": cpv,
    }
    root_form = sp.sympify(root["rooted_residual"], locals=root_locals)
    assert sp.expand(parent - root_form) == 0
    return parent, {str(symbol): symbol for symbol in parent.free_symbols}


def feasible_boolean_branches():
    """All branches consistent with positivity of degree and triangle exclusion."""
    for auv, apu, apv in itertools.product((0, 1), repeat=3):
        if auv and apu and apv:
            continue
        for zu, zv, zp in itertools.product((0, 1), repeat=3):
            if auv and not (zu and zv):
                continue
            if apu and not (zu and zp):
                continue
            if apv and not (zv and zp):
                continue
            yield auv, apu, apv, zu, zv, zp


def lower_bound(parent: sp.Expr, names: dict[str, sp.Symbol], branch, values):
    """Apply exactly the audited monotone replacements."""
    n, e, du, dv, dp = values
    auv, apu, apv, _zu, _zv, _zp = branch
    wedge_upper = choose2(du) + choose2(dv) + choose2(dp) + choose2(values.r + 1)
    return sp.factor(
        parent.subs(
            {
                names["n"]: n,
                names["edge_count"]: e,
                names["degree_u"]: du,
                names["degree_v"]: dv,
                names["parent_degree"]: dp,
                names["adjacent"]: auv,
                names["parent_adjacent_u"]: apu,
                names["parent_adjacent_v"]: apv,
                names["C_neighbor_excess_u"]: 0,
                names["C_neighbor_excess_v"]: 0,
                names["parent_neighbor_excess"]: 0,
                names["C_common_neighbor"]: 1,
                names["parent_common_neighbor_u"]: 1,
                names["parent_common_neighbor_v"]: 1,
                names["C_wedges_E"]: wedge_upper,
            }
        )
    )


class ConeValues(tuple):
    """Tuple n,e,du,dv,dp with the auxiliary remainder attached."""

    def __new__(cls, n, e, du, dv, dp, r):
        value = tuple.__new__(cls, (n, e, du, dv, dp))
        value.r = r
        return value


def falling(value: int, degree: int) -> int:
    return factorial(value) // factorial(value - degree)


def compositions(total: int, parts: int):
    if parts == 1:
        yield (total,)
        return
    for first in range(total + 1):
        for tail in compositions(total - first, parts - 1):
            yield (first, *tail)


def simplex_bernstein_coefficients(
    polynomial: sp.Expr,
    variables: tuple[sp.Symbol, ...],
    degree: int,
):
    """Convert a polynomial on sum(t_i)<=1 to total-degree Bernstein form."""
    power_poly = sp.Poly(sp.expand(polynomial), *variables)
    power = dict(power_poly.terms())
    assert max(sum(monomial) for monomial in power) <= degree
    # alpha[0] is the unused barycentric coordinate; the remaining entries
    # correspond to variables in their declared order.
    for alpha in compositions(degree, len(variables) + 1):
        selected = alpha[1:]
        coefficient = 0
        for beta, value in power.items():
            total_beta = sum(beta)
            if all(b <= a for b, a in zip(beta, selected)):
                multiplier = sp.Integer(1)
                for a, b in zip(selected, beta):
                    multiplier *= falling(a, b)
                multiplier /= falling(degree, total_beta)
                coefficient += value * multiplier
        yield alpha, sp.factor(coefficient)


def reconstruct_simplex_bernstein(
    coefficients,
    variables: tuple[sp.Symbol, ...],
    degree: int,
) -> sp.Expr:
    """Invert the coefficient list, giving an exact check of the conversion."""
    unused = 1 - sum(variables)
    answer = 0
    for alpha, coefficient in coefficients:
        multinomial = factorial(degree)
        for entry in alpha:
            multinomial //= factorial(entry)
        term = sp.Integer(multinomial) * unused ** alpha[0]
        for variable, exponent in zip(variables, alpha[1:]):
            term *= variable**exponent
        answer += coefficient * term
    return sp.expand(answer)


def nonnegative_power_coefficients(expression: sp.Expr, variable: sp.Symbol) -> bool:
    return all(coefficient >= 0 for coefficient in sp.Poly(sp.expand(expression), variable).all_coeffs())


def monotonicity_audit(parent: sp.Expr, names: dict[str, sp.Symbol]):
    n, e = names["n"], names["edge_count"]
    du, dv = names["degree_u"], names["degree_v"]
    a = names["adjacent"]
    coefficients = {
        variable: sp.factor(sp.diff(parent, names[variable]))
        for variable in (
            "C_neighbor_excess_u",
            "C_neighbor_excess_v",
            "parent_neighbor_excess",
            "C_common_neighbor",
            "parent_common_neighbor_u",
            "parent_common_neighbor_v",
            "C_wedges_E",
        )
    }
    expected = {
        "C_neighbor_excess_u": 6 * n**2 - 15 * n + 3 - 2 * e - 3 * dv,
        "C_neighbor_excess_v": 6 * n**2 - 15 * n + 3 - 2 * e - 3 * du,
        "parent_neighbor_excess": 7 * n - 17,
        "C_common_neighbor": -(5 * n**2 - n - 4 - 10 * e) / 2,
        "parent_common_neighbor_u": 4 - 5 * n,
        "parent_common_neighbor_v": 4 - 5 * n,
        "C_wedges_E": -(6 * a - 12 * du - 12 * dv + 8 * e + 15 * n**2 - 67 * n + 36) / 2,
    }
    for variable, value in expected.items():
        assert sp.expand(coefficients[variable] - value) == 0

    # Exact elementary lower bounds valid for n>=12, e<=n-1,
    # du+dv-a<=e.  Every displayed polynomial has nonnegative coefficients
    # after n=12+m.
    m = sp.symbols("m", nonnegative=True)
    sign_margins = {
        "neighbor_u_or_v": sp.expand((6 * n**2 - 15 * n + 3 - 5 * e).subs({n: 12 + m, e: 11 + m})),
        "common_uv_negated_twice": sp.expand((5 * n**2 - n - 4 - 10 * e).subs({n: 12 + m, e: 11 + m})),
        "wedge_negated_twice": sp.expand((15 * n**2 - 67 * n + 36 - 4 * e - 6).subs({n: 12 + m, e: 11 + m})),
        "parent_excess": sp.expand((7 * n - 17).subs(n, 12 + m)),
        "parent_common_negated": sp.expand((5 * n - 4).subs(n, 12 + m)),
    }
    assert all(nonnegative_power_coefficients(value, m) for value in sign_margins.values())
    return {
        "exact_coefficients": {key: str(value) for key, value in coefficients.items()},
        "n12_plus_m_sign_margins": {key: str(value) for key, value in sign_margins.items()},
    }


def large_order_simplex_certificate(parent: sp.Expr, names: dict[str, sp.Symbol]):
    m = sp.symbols("m", nonnegative=True)
    t = sp.symbols("s_x s_y s_z s_r", nonnegative=True)
    sx, sy, sz, sr = t
    total = 10 + m
    x, y, z, r = (total * coordinate for coordinate in t)
    n = 12 + m
    rows = []
    all_coefficients = 0
    global_minimum = None
    for branch in feasible_boolean_branches():
        auv, apu, apv, zu, zv, zp = branch
        values = ConeValues(
            n,
            1 + x + y + z + r,
            zu + x,
            zv + y,
            zp + z,
            r,
        )
        polynomial = sp.cancel(lower_bound(parent, names, branch, values))
        assert sp.denom(polynomial) == 1
        degree = max(sum(monomial) for monomial in sp.Poly(polynomial, *t).monoms())
        first_bad = None
        count = 0
        local_minimum = None
        local_minimum_record = None
        coefficients = list(simplex_bernstein_coefficients(polynomial, t, degree))
        assert sp.expand(
            reconstruct_simplex_bernstein(coefficients, t, degree) - polynomial
        ) == 0
        for alpha, coefficient in coefficients:
            count += 1
            power_coefficients = tuple(sp.Poly(sp.expand(coefficient), m).all_coeffs())
            if not all(value >= 0 for value in power_coefficients) and first_bad is None:
                first_bad = {
                    "alpha_h_x_y_z_r": list(alpha),
                    "coefficient": str(coefficient),
                    "power_coefficients": list(map(str, power_coefficients)),
                }
            value_at_zero = sp.factor(coefficient.subs(m, 0))
            if local_minimum is None or value_at_zero < local_minimum:
                local_minimum = value_at_zero
                local_minimum_record = {
                    "alpha_h_x_y_z_r": list(alpha),
                    "coefficient": str(coefficient),
                }
        assert first_bad is None
        row = {
            "adjacent_uv_pu_pv": [auv, apu, apv],
            "positive_degree_u_v_p": [zu, zv, zp],
            "simplex_degree": degree,
            "coefficient_count": count,
            "minimum_at_m0": str(local_minimum),
            "minimum_record": local_minimum_record,
        }
        rows.append(row)
        all_coefficients += count
        if global_minimum is None or local_minimum < global_minimum[0]:
            global_minimum = (local_minimum, row)
    assert len(rows) == 17
    branch_counts = {}
    for row in rows:
        edge_count = sum(row["adjacent_uv_pu_pv"])
        branch_counts[str(edge_count)] = branch_counts.get(str(edge_count), 0) + 1
    assert branch_counts == {"0": 8, "1": 6, "2": 3}
    return {
        "parameterization": (
            "For e>=1, x_t=d_t-1[d_t>0], r=e-1-x_u-x_v-x_p, "
            "h=n-2-(e-1); hence x_u+x_v+x_p+r+h=n-2. Set n=12+m "
            "and divide the five parts by 10+m."
        ),
        "basis": "total-degree Bernstein basis on the four-simplex",
        "branches": len(rows),
        "branches_by_selected_edge_count": branch_counts,
        "coefficient_count": all_coefficients,
        "exact_basis_reconstruction_checks": len(rows),
        "all_coefficients_power_nonnegative_in_m": True,
        "global_minimum_at_m0": str(global_minimum[0]),
        "global_minimum_branch": global_minimum[1],
        "rows": rows,
    }


def unlabeled_forests(order: int):
    """Generate component multisets; labels only choose a representative."""
    types = []
    for size in range(1, order + 1):
        candidates = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for graph in candidates:
            types.append((size, nx.convert_node_labels_to_integers(graph)))

    def extend(remaining: int, start: int, chosen: tuple[int, ...]):
        if remaining == 0:
            yield nx.disjoint_union_all([types[index][1] for index in chosen])
            return
        for index in range(start, len(types)):
            size = types[index][0]
            if size > remaining:
                break
            yield from extend(remaining - size, index, (*chosen, index))

    yield from extend(order, 0, ())


def integer_evaluator(expression: sp.Expr):
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

    def evaluate(values: dict[str, int]) -> int:
        vector = tuple(values[name] for name in names)
        numerator = 0
        for monomial, coefficient in terms:
            term = coefficient
            for base, exponent in zip(vector, monomial):
                if exponent:
                    term *= base**exponent
            numerator += term
        assert numerator % denominator == 0
        return numerator // denominator

    return evaluate


def graph_invariants(graph: nx.Graph, u: int, v: int, p: int):
    degree = dict(graph.degree())
    neighbors = {vertex: set(graph.neighbors(vertex)) for vertex in graph}
    excess = {
        vertex: sum(degree[other] - 1 for other in neighbors[vertex])
        for vertex in graph
    }
    common = lambda left, right: len(neighbors[left] & neighbors[right])
    return {
        "n": len(graph),
        "edge_count": graph.number_of_edges(),
        "degree_u": degree[u],
        "degree_v": degree[v],
        "parent_degree": degree[p],
        "adjacent": int(v in neighbors[u]),
        "parent_adjacent_u": int(u in neighbors[p]),
        "parent_adjacent_v": int(v in neighbors[p]),
        "C_neighbor_excess_u": excess[u],
        "C_neighbor_excess_v": excess[v],
        "parent_neighbor_excess": excess[p],
        "C_common_neighbor": common(u, v),
        "parent_common_neighbor_u": common(p, u),
        "parent_common_neighbor_v": common(p, v),
        "C_wedges_E": sum(comb(value, 2) for value in degree.values()),
    }


def finite_census(parent: sp.Expr):
    evaluate = integer_evaluator(parent)
    total_forests = 0
    total_cells = 0
    minimum = None
    by_order = {}
    for order in range(3, 12):
        forests = list(unlabeled_forests(order))
        assert len(forests) == FOREST_COUNTS[order]
        local_cells = 0
        local_minimum = None
        for graph in forests:
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for u, v in itertools.combinations(graph.nodes(), 2):
                for p in graph:
                    if p in (u, v):
                        continue
                    value = evaluate(graph_invariants(graph, u, v, p))
                    record = {
                        "value": value,
                        "order": order,
                        "graph6": graph6,
                        "marks": [u, v],
                        "parent": p,
                    }
                    if minimum is None or value < minimum["value"]:
                        minimum = record
                    if local_minimum is None or value < local_minimum["value"]:
                        local_minimum = record
                    assert value >= 0
                    total_cells += 1
                    local_cells += 1
        expected = FOREST_COUNTS[order] * comb(order, 2) * (order - 2)
        assert local_cells == expected
        by_order[str(order)] = {
            "forest_types": len(forests),
            "marked_parent_cells": local_cells,
            "minimum": local_minimum,
        }
        total_forests += len(forests)
        print(json.dumps({"order": order, **by_order[str(order)]}, sort_keys=True), flush=True)
    return {
        "orders": [3, 11],
        "forest_types": total_forests,
        "marked_parent_cells": total_cells,
        "negative": 0,
        "minimum": minimum,
        "by_order": by_order,
    }


def main() -> None:
    parent, names = reconstruct_parent_residual()
    swap_marks = {
        names["degree_u"]: names["degree_v"],
        names["degree_v"]: names["degree_u"],
        names["C_neighbor_excess_u"]: names["C_neighbor_excess_v"],
        names["C_neighbor_excess_v"]: names["C_neighbor_excess_u"],
        names["parent_adjacent_u"]: names["parent_adjacent_v"],
        names["parent_adjacent_v"]: names["parent_adjacent_u"],
        names["parent_common_neighbor_u"]: names["parent_common_neighbor_v"],
        names["parent_common_neighbor_v"]: names["parent_common_neighbor_u"],
    }
    assert sp.expand(parent - parent.xreplace(swap_marks)) == 0
    monotonicity = monotonicity_audit(parent, names)
    large_order = large_order_simplex_certificate(parent, names)
    finite = finite_census(parent)

    # Edgeless forests bypass E=e-1.  Their exact residual is positive for
    # n>=3 because the cubic and its first derivative are positive at 3 and
    # the second derivative remains positive thereafter.
    n = names["n"]
    zero_values = {
        symbol: 0 for symbol in parent.free_symbols if symbol != n
    }
    edgeless = sp.factor(parent.subs(zero_values))
    expected = (n - 1) * (65 * n**3 - 89 * n**2 - 238 * n + 192) / 24
    assert sp.expand(edgeless - expected) == 0

    report = {
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G1_PARENT_CONE_COMPLETE_G1_BERNSTEIN",
        "theorem": (
            "For every forest G of order n>=3 and every three distinct vertices "
            "u,v,p, the exact parent-rooted residual remaining after the proved "
            "high-motif payment is nonnegative. For n>=12 this follows from the "
            "degree-excess cone and a simplex Bernstein certificate; n=3..11 "
            "are covered by a complete exact unlabeled-forest census."
        ),
        "identity_reconstruction": {
            "upstream_configuration_report": CONFIG_REPORT.name,
            "matches_agent_parent_form": True,
            "matches_root_parent_form_after_symbol_renaming": True,
            "symmetric_under_exchange_of_u_and_v": True,
        },
        "monotone_lower_bound": monotonicity,
        "degree_excess_cone": {
            "lemma": (
                "For a nonempty forest with c nontrivial components, total "
                "degree excess sum max(d-1,0)=e-c. Thus "
                "r=e-1-x_u-x_v-x_p equals unselected excess plus c-1 and is "
                "nonnegative. Convex concentration gives W<=C(d_u,2)+C(d_v,2)+"
                "C(d_p,2)+C(r+1,2)."
            ),
            "common_neighbor_cap": (
                "Any two vertices in a forest have at most one common neighbor, "
                "otherwise they lie on a four-cycle."
            ),
        },
        "large_order_certificate": large_order,
        "finite_census": finite,
        "edgeless_branch": {
            "residual": str(edgeless),
            "positivity": (
                "At n=3 the cubic factor is 432 and its derivative is 983; "
                "the second derivative 390n-178 is positive for n>=3."
            ),
        },
        "conclusion": (
            "Combining this residual theorem with the separately proved "
            "high-motif payment proves g1>=0 in the canonical deepest-ordinary "
            "singleton-parent bundle case."
        ),
        "scope": (
            "This proves only the canonical deepest-ordinary singleton-parent "
            "g1 cell with p distinct from u,v. It does not cover endpoint-parent "
            "cells, non-singleton support, all g1 bundle cells, all N4, or "
            "Erdos Problem 993."
        ),
        "dependencies": {
            path.name: sha256(path)
            for path in (CONFIG_REPORT, PARENT_REPORT, ROOT_REPORT)
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "large_order": {
            key: value for key, value in large_order.items() if key != "rows"
        },
        "finite_census": {
            key: value for key, value in finite.items() if key != "by_order"
        },
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
