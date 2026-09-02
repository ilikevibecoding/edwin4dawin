#!/usr/bin/env python3
"""Prove g1 and g2 in the pure no-parent/root-star bundle mode.

The support s is unmarked, has no parent, and has no protected marked leaf
neighbor.  With C=F(H-s), the support is isolated in H and hence D=C.  This
script proves the first two nonconstant rank-four binomial bundle
coefficients for every marked forest core C.
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
    independent_raw_g2,
)
from derive_iso_leaf_bundle_telescope_agent import bundle_components
from derive_iso_n4_bundle_g1_deepest_configuration_agent import raw_g1
from derive_iso_n4_bundle_g12_endpoint_parent_agent import (
    exact_evaluator,
    invariant_data,
    invariant_substitution,
)


HERE = Path(__file__).resolve().parent
STRUCTURE = HERE / "iso_n4_bundle_no_parent_root_star_modes_exact_agent_20260829.json"
HIGH_MOTIF = HERE / "iso_n4_bundle_g1_high_motif_payment_exact_agent_20260829.json"
I5_AUDIT = HERE / "iso_n4_bundle_g1_i5_root_configuration_equivalence_audit_agent_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g12_no_parent_pure_root_star_exact_agent_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def tensor_bernstein(expression, variables):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
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


def pure_forms():
    rules = {
        sp.Symbol(f"d{name}{rank}"): sp.Symbol(f"c{name}{rank}")
        for name in "EUVW"
        for rank in range(6)
    }
    substitution, motif_symbols = invariant_substitution()
    g1 = sp.factor(raw_g1().subs(rules).subs(substitution))
    g2 = sp.factor(independent_raw_g2().subs(rules).subs(substitution))
    motif = sp.expand(sum(sp.diff(g1, symbol) * symbol for symbol in motif_symbols))
    residual = sp.factor(g1 - motif)
    return g1, g2, sp.factor(motif), residual


def direct_bundle_coefficients(graph: nx.Graph, u: int, v: int):
    base = graph.copy()
    support = max(base.nodes(), default=-1) + 1
    base.add_node(support)  # pure no-parent support is an isolated component
    gamma1 = sum(bundle_components(base, (u, v), support, 1, 4))
    gamma2 = sum(bundle_components(base, (u, v), support, 2, 4))
    return int(gamma1), int(gamma2 - 2 * gamma1)


def finite_census(g1: sp.Expr, g2: sp.Expr):
    evaluate1, evaluate2 = exact_evaluator(g1), exact_evaluator(g2)
    forests = cells = 0
    minima = {"g1": None, "g2": None}
    by_order = {}
    for order in range(2, 6):
        local_forests = local_cells = 0
        for graph0 in nx.graph_atlas_g():
            if len(graph0) != order or not nx.is_forest(graph0):
                continue
            graph = nx.convert_node_labels_to_integers(graph0)
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            local_forests += 1
            for u, v in itertools.combinations(graph.nodes(), 2):
                data = invariant_data(graph, u, v)
                direct = direct_bundle_coefficients(graph, u, v)
                configured = (evaluate1(data), evaluate2(data))
                assert direct == configured, (order, graph6, u, v, direct, configured, data)
                for key, value in zip(("g1", "g2"), direct):
                    assert value >= 0
                    record = {
                        "value": value,
                        "order_C": order,
                        "graph6_C": graph6,
                        "marks": [u, v],
                    }
                    if minima[key] is None or value < minima[key]["value"]:
                        minima[key] = record
                cells += 1
                local_cells += 1
        by_order[str(order)] = {
            "forests": local_forests,
            "marked_pairs": local_cells,
        }
        forests += local_forests
    assert forests == 21 and cells == 147
    return {
        "orders_C": [2, 5],
        "unlabeled_forests": forests,
        "marked_pairs": cells,
        "negative": {"g1": 0, "g2": 0},
        "minima": minima,
        "by_order": by_order,
        "checks": "direct bundle Gamma coefficients equal exact invariant forms",
    }


def bernstein_certificate(expression: sp.Expr, kind: str):
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    q = sp.symbols("q", nonnegative=True)
    a, b, c = sp.symbols("a b c", nonnegative=True)
    variables = (a, b, c)
    total = sp.Integer(4) + q  # n-2, with n=6+q
    x = total * a
    y = total * (1 - a) * b
    r = total * (1 - a) * (1 - b) * c
    records = []
    branch_count = coefficient_count = 0
    minimum_q0 = None
    profiles = set()
    stream = hashlib.sha256()
    for adjacent, zu, zv in itertools.product((0, 1), repeat=3):
        if adjacent and not (zu and zv):
            continue
        du, dv = zu + x, zv + y
        edge_count = 1 + x + y + r
        wedge_upper = (
            du * (du - 1) / 2
            + dv * (dv - 1) / 2
            + r * (r + 1) / 2
        )
        replacements = {
            names["n"]: total + 2,
            names["edge_count"]: edge_count,
            names["degree_u"]: du,
            names["degree_v"]: dv,
            names["adjacent"]: adjacent,
            names["C_neighbor_excess_u"]: 0,
            names["C_neighbor_excess_v"]: 0,
            names["C_common_neighbor"]: 1,
            names["C_wedges_E"]: wedge_upper,
        }
        if kind == "g2":
            replacements.update(
                {
                    names["C_connected3_E"]: 0,
                    names["C_connected3_U"]: 0,
                    names["C_connected3_V"]: 0,
                }
            )
        lower = sp.cancel(expression.subs(replacements))
        assert sp.denom(lower) == 1
        branch_count += 1
        for degrees, index, coefficient in tensor_bernstein(lower, variables):
            profiles.add(degrees)
            q_coefficients = sp.Poly(sp.expand(coefficient), q).all_coeffs()
            assert all(value >= 0 for value in q_coefficients)
            q0 = sp.factor(coefficient.subs(q, 0))
            minimum_q0 = q0 if minimum_q0 is None or q0 < minimum_q0 else minimum_q0
            record = [adjacent, zu, zv, *index, str(coefficient)]
            stream.update(json.dumps(record, separators=(",", ":")).encode())
            coefficient_count += 1
        records.append([adjacent, zu, zv])
    assert branch_count == 5
    return {
        "orders": "n>=6",
        "q_definition": "q=n-6>=0",
        "branches": branch_count,
        "branch_list_adj_zu_zv": records,
        "degree_profiles": [list(profile) for profile in sorted(profiles)],
        "bernstein_coefficients": coefficient_count,
        "minimum_value_at_q0": str(minimum_q0),
        "all_q_power_coefficients_nonnegative": True,
        "ordered_stream_sha256": stream.hexdigest().upper(),
    }


def main() -> None:
    structure = json.loads(STRUCTURE.read_text(encoding="utf-8"))
    high = json.loads(HIGH_MOTIF.read_text(encoding="utf-8"))
    i5 = json.loads(I5_AUDIT.read_text(encoding="utf-8"))
    assert structure["marker"] == "PASS_EXACT_CANONICAL_NO_PARENT_ROOT_STAR_MODE_CLASSIFICATION_AGENT"
    assert high["marker"] == "PASS_EXACT_ISO_N4_BUNDLE_G1_HIGH_MOTIF_PAYMENT_AGENT"
    assert i5["marker"] == "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G1_I5_ROOT_CONFIGURATION_EQUIVALENCE_AUDIT_AGENT"

    g1, g2, motif, residual = pure_forms()
    nms = {str(symbol): symbol for symbol in g1.free_symbols | g2.free_symbols}
    n, e = nms["n"], nms["edge_count"]
    du, dv, adjacent = nms["degree_u"], nms["degree_v"], nms["adjacent"]
    xu, xv = nms["C_neighbor_excess_u"], nms["C_neighbor_excess_v"]
    common, wedges = nms["C_common_neighbor"], nms["C_wedges_E"]
    re, ru, rv = nms["C_connected3_E"], nms["C_connected3_U"], nms["C_connected3_V"]
    q35, r4 = nms["C_three_edge_five"], nms["C_connected4_E"]

    expected_motif = (
        2 * (n - 4) * re
        + 5 * q35
        - 5 * r4
        + (5 * n - 4) * (ru + rv)
        + 5 * re
    )
    assert sp.expand(motif - expected_motif) == 0

    # Exact monotonicity signs for the g1 residual on n>=6.
    assert sp.factor(sp.diff(residual, xu)) == 6 * n**2 - 15 * n + 8 - 2 * e - 3 * dv
    assert sp.factor(sp.diff(residual, xv)) == 6 * n**2 - 15 * n + 8 - 2 * e - 3 * du
    assert sp.expand(
        sp.diff(residual, common) + (5 * n**2 - n - 4 - 10 * e) / 2
    ) == 0
    assert sp.expand(
        sp.diff(residual, wedges)
        + (
            6 * adjacent
            - 12 * du
            - 12 * dv
            + 8 * e
            + 15 * n**2
            - 67 * n
            + 50
        )
        / 2
    ) == 0
    g1_sign_floors = {
        "neighbor_excess": 6 * n**2 - 20 * n + 13,
        "negated_common_twice": (5 * n - 6) * (n - 1),
        "negated_wedge_twice": 15 * n**2 - 71 * n + 48,
    }
    for floor in g1_sign_floors.values():
        shifted = sp.Poly(sp.expand(floor.subs(n, sp.Symbol("m") + 6)), sp.Symbol("m"))
        assert all(value >= 0 for value in shifted.all_coeffs())

    # Exact g2 monotonicity: discard positive R3/excess terms and maximize
    # the two negatively weighted common/wedge statistics.
    assert sp.diff(g2, re) == 2 and sp.diff(g2, ru) == 5 and sp.diff(g2, rv) == 5
    assert sp.expand(sp.diff(g2, xu) - 2 * (6 * n - 7)) == 0
    assert sp.expand(sp.diff(g2, xv) - 2 * (6 * n - 7)) == 0
    assert sp.expand(sp.diff(g2, common) + 5 * n + 2) == 0
    assert sp.expand(sp.diff(g2, wedges) + 3 * (5 * n - 11)) == 0

    # Edgeless forests bypass E=e-1.
    zero1 = {symbol: 0 for symbol in residual.free_symbols if symbol != n}
    zero2 = {symbol: 0 for symbol in g2.free_symbols if symbol != n}
    edgeless1 = sp.factor(residual.subs(zero1))
    edgeless2 = sp.factor(g2.subs(zero2))
    assert edgeless1 == n * (n - 1) * (65 * n**2 - 69 * n - 26) / 24
    assert edgeless2 == n * (10 * n**2 - 11 * n - 4)
    assert (65 * n**2 - 69 * n - 26).subs(n, 2) > 0
    assert (10 * n**2 - 11 * n - 4).subs(n, 2) > 0
    assert sp.diff(65 * n**2 - 69 * n - 26, n).subs(n, 2) > 0
    assert sp.diff(10 * n**2 - 11 * n - 4, n).subs(n, 2) > 0
    assert sp.diff(65 * n**2 - 69 * n - 26, n, 2) > 0
    assert sp.diff(10 * n**2 - 11 * n - 4, n, 2) > 0

    finite = finite_census(g1, g2)
    large_g1 = bernstein_certificate(residual, "g1")
    large_g2 = bernstein_certificate(g2, "g2")
    assert large_g1["bernstein_coefficients"] == 320
    assert large_g1["minimum_value_at_q0"] == "23"
    assert large_g2["bernstein_coefficients"] == 135
    assert large_g2["minimum_value_at_q0"] == "722"

    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_PURE_ROOT_STAR_AGENT",
        "theorem": (
            "For every marked forest core C in the pure canonical no-parent "
            "root-star mode D=C, the rank-four sibling-bundle coefficients "
            "g1 and g2 are nonnegative."
        ),
        "row_identity": "D=C and T_M=((1+x)^M+x)C",
        "g1": {
            "high_motif_payment": (
                "proved core 2(n-4)R3+5Q35-5R4, plus the nonnegative "
                "terms 5R3+(5n-4)(R3(G-u)+R3(G-v))"
            ),
            "residual": str(residual),
            "monotone_replacements_n_ge_6": {
                "neighbor_excess": (
                    "Both coefficients are positive; using e,d_u,d_v<=n-1 "
                    "gives the floor 6n^2-20n+13."
                ),
                "common_neighbor": (
                    "Its negated doubled coefficient is at least "
                    "(5n-6)(n-1)>0, so replace the count by one."
                ),
                "wedges": (
                    "Since d_u+d_v-adjacent<=e<=n-1, the negated doubled "
                    "coefficient is at least 15n^2-71n+48>0; replace W by "
                    "the degree-excess upper bound."
                ),
            },
            "large_order_certificate": large_g1,
            "edgeless": str(edgeless1),
            "edgeless_positivity": (
                "The quadratic factor is positive at n=2 and has positive, "
                "increasing derivative thereafter."
            ),
        },
        "g2": {
            "form": str(g2),
            "monotone_replacements_n_ge_6": (
                "Drop the positive 2R3(G)+5R3(G-u)+5R3(G-v) and positive "
                "2(6n-7) marked-neighbor-excess terms; set the common-neighbor "
                "count to one and W to its upper bound because their coefficients "
                "are -5n-2 and -3(5n-11)."
            ),
            "large_order_certificate": large_g2,
            "edgeless": str(edgeless2),
            "edgeless_positivity": (
                "The quadratic factor is positive at n=2 and has positive, "
                "increasing derivative thereafter."
            ),
        },
        "degree_excess_cone": {
            "parameters": (
                "For e>=1, x=d_u-1[d_u>0], y=d_v-1[d_v>0], "
                "r=e-1-x-y>=0 and h=n-2-(e-1)>=0."
            ),
            "wedge_bound": "W<=C(d_u,2)+C(d_v,2)+C(r+1,2)",
            "proof": (
                "The total positive-degree excess is e-c for c nontrivial "
                "components, so r is unselected excess plus c-1. Repeated "
                "convex merging concentrates all remaining wedges into r+1."
            ),
            "common_neighbor_bound": "Every two vertices in a forest have at most one common neighbor.",
        },
        "finite_census": finite,
        "dependencies": {
            path.name: sha256(path) for path in (STRUCTURE, HIGH_MOTIF, I5_AUDIT)
        },
        "scope": (
            "Exact only for k=0 in the canonical no-parent root-star "
            "classification. The k=1 and k=2 protected-leaf modes remain "
            "separate here; this is not all N4 or Erdos 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "g1_large": large_g1,
        "g2_large": large_g2,
        "finite_census": finite,
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
