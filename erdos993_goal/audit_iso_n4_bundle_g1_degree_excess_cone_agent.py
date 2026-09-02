#!/usr/bin/env python3
"""Independent exact audit of the degree-excess wedge cone used for g1.

For a forest F with e>=1 and distinct vertices u,v,p, put

  z_t = 1[d(t)>0],  x_t=d(t)-z_t,  E=e-1,
  r=E-x_u-x_v-x_p.

The audited lemma is

  r>=0,
  W(F)<=C(d(u),2)+C(d(v),2)+C(d(p),2)+C(r+1,2).

The proof is an all-order forest argument.  The included graph-atlas census
is only a replay, not the basis of the theorem.  The edgeless branch e=0 is
explicitly outside the parameterization because E=-1 there.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_bundle_g1_degree_excess_cone_independent_audit_agent_20260829.json"
ROOT_RESIDUAL = HERE / "iso_n4_bundle_g1_parent_residual_root_20260829.json"


def positive_components(graph: nx.Graph) -> int:
    return sum(1 for component in nx.connected_components(graph) if len(component) >= 2)


def check_cell(graph: nx.Graph, marks: tuple[int, int, int]):
    edges = graph.number_of_edges()
    assert edges >= 1
    degrees = [graph.degree(vertex) for vertex in marks]
    excess = [degree - int(degree > 0) for degree in degrees]
    remainder = edges - 1 - sum(excess)
    wedges = sum(comb(degree, 2) for _, degree in graph.degree())
    upper = sum(comb(degree, 2) for degree in degrees) + comb(remainder + 1, 2)
    components = positive_components(graph)
    all_excess = sum(max(graph.degree(vertex) - 1, 0) for vertex in graph)
    unselected_excess = all_excess - sum(excess)
    assert all_excess == edges - components
    assert remainder == unselected_excess + components - 1
    assert remainder >= unselected_excess >= 0
    assert upper >= wedges
    return {
        "slack": upper - wedges,
        "r": remainder,
        "unselected_excess": unselected_excess,
        "positive_components": components,
    }


def edgeless_residual():
    dependency = json.loads(ROOT_RESIDUAL.read_text(encoding="utf-8"))
    assert dependency["marker"] == "DERIVED_EXACT_ISO_N4_BUNDLE_G1_PARENT_ROOTED_RESIDUAL"
    expression = sp.sympify(dependency["rooted_residual"])
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    n = names["n"]
    value = sp.factor(
        expression.subs({symbol: 0 for symbol in expression.free_symbols if symbol != n})
    )
    expected = sp.factor((n - 1) * (65 * n**3 - 89 * n**2 - 238 * n + 192) / 24)
    assert sp.expand(value - expected) == 0
    # At n=3 the cubic is 432.  Its derivative is already positive there:
    # f'(n)=195n^2-178n-238, f'(3)=983, and f''(n)=390n-178>0.
    cubic = 65 * n**3 - 89 * n**2 - 238 * n + 192
    assert cubic.subs(n, 3) == 432
    assert sp.diff(cubic, n).subs(n, 3) == 983
    assert sp.diff(cubic, n, 2).subs(n, 3) > 0
    return str(value)


def main():
    cells = 0
    minimum_slack = None
    maximum_slack = None
    equality_cells = 0
    first_maximum = None
    by_order = {}
    for order in range(3, 8):
        local = 0
        for graph0 in nx.graph_atlas_g():
            if len(graph0) != order or not nx.is_forest(graph0) or graph0.number_of_edges() == 0:
                continue
            graph = nx.convert_node_labels_to_integers(graph0)
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for marks in itertools.permutations(graph.nodes(), 3):
                result = check_cell(graph, marks)
                slack = result["slack"]
                minimum_slack = slack if minimum_slack is None else min(minimum_slack, slack)
                if maximum_slack is None or slack > maximum_slack:
                    maximum_slack = slack
                    first_maximum = {
                        "order": order,
                        "graph6": graph6,
                        "ordered_u_v_p": list(marks),
                        **result,
                    }
                equality_cells += int(slack == 0)
                cells += 1
                local += 1
        by_order[str(order)] = local

    report = {
        "marker": "PASS_INDEPENDENT_EXACT_ISO_N4_BUNDLE_G1_DEGREE_EXCESS_CONE_AUDIT_AGENT",
        "theorem": {
            "scope": "Every finite forest with e>=1 and every three distinct selected vertices.",
            "parameters": "x_t=d(t)-1[d(t)>0], r=e-1-x_u-x_v-x_p",
            "conclusion": (
                "r>=0 and W<=C(d_u,2)+C(d_v,2)+C(d_p,2)+C(r+1,2)"
            ),
            "proof": (
                "If c is the number of nontrivial components, the total degree "
                "excess sum_v max(d(v)-1,0) is e-c.  Thus r equals the unselected "
                "excess plus c-1.  For nonnegative remaining excesses y_i, repeated "
                "use of C(a+1,2)+C(b+1,2)<=C(a+b+1,2) concentrates all remaining "
                "wedges into one vertex, and monotonicity replaces their sum by r."
            ),
        },
        "edgeless_branch": {
            "status": "separate exact positive branch for n>=3",
            "residual": edgeless_residual(),
            "reason_separate": "The cone uses E=e-1, which is negative at e=0.",
        },
        "finite_replay": {
            "scope": "All graph-atlas forests of orders 3..7 with e>=1; all ordered distinct u,v,p.",
            "cells": cells,
            "by_order": by_order,
            "minimum_slack": minimum_slack,
            "maximum_slack": maximum_slack,
            "equality_cells": equality_cells,
            "first_maximum": first_maximum,
        },
        "dependency": {
            "edgeless_residual_report": ROOT_RESIDUAL.name,
            "sha256": hashlib.sha256(ROOT_RESIDUAL.read_bytes()).hexdigest().upper(),
        },
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
