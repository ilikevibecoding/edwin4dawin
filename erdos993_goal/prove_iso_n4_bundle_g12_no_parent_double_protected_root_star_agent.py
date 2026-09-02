#!/usr/bin/env python3
"""Prove g1 and g2 for the double-protected no-parent root star.

Here the unmarked support s has no parent and both protected marks u,v are
leaf neighbors left outside the full unmarked sibling bundle.  After deleting
s, both marks are isolated.  If K=I(R) is the independence polynomial of the
remaining unmarked forest, then

  C=((1+x)^2 K,(1+x)K,(1+x)K,K),  D=(K,K,K,K).

The exact rank-four g1/g2 forms reduce to the order, edge, wedge, and small
connected-edge motifs of R.  A one-variable Bernstein certificate proves the
remaining forms for every order.
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
    independent_raw_g2,
    i2,
    i3,
    i4,
)
from derive_iso_leaf_bundle_telescope_agent import bundle_components
from derive_iso_n4_bundle_g1_deepest_configuration_agent import i5, raw_g1
from derive_iso_n4_bundle_g12_endpoint_parent_agent import (
    connected_edges,
    exact_evaluator,
    three_edge_five,
)


HERE = Path(__file__).resolve().parent
STRUCTURE = HERE / "iso_n4_bundle_no_parent_root_star_modes_exact_agent_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g12_no_parent_double_protected_root_star_exact_agent_20260829.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def isolate_convolution(row, number: int):
    return tuple(
        sp.expand(
            sum(sp.binomial(number, shift) * row[rank - shift] for shift in range(rank + 1))
        )
        for rank in range(6)
    )


def raw_and_invariant_forms():
    k = tuple(sp.Symbol(f"k{rank}") for rank in range(6))
    crows = {
        "E": isolate_convolution(k, 2),
        "U": isolate_convolution(k, 1),
        "V": isolate_convolution(k, 1),
        "W": k,
    }
    drows = {name: k for name in "EUVW"}
    rules = {
        **{
            sp.Symbol(f"c{name}{rank}"): crows[name][rank]
            for name in "EUVW"
            for rank in range(6)
        },
        **{
            sp.Symbol(f"d{name}{rank}"): drows[name][rank]
            for name in "EUVW"
            for rank in range(6)
        },
    }
    raw1 = sp.factor(raw_g1().subs(rules))
    raw2 = sp.factor(independent_raw_g2().subs(rules))
    m, e, wedges, r3, q35, r4 = sp.symbols(
        "m edge_count wedges connected3 three_edge_five connected4",
        integer=True,
        nonnegative=True,
    )
    forest = {
        k[0]: 1,
        k[1]: m,
        k[2]: i2(m, e),
        k[3]: i3(m, e, wedges),
        k[4]: i4(m, e, wedges, r3),
        k[5]: i5(m, e, wedges, r3, q35, r4),
    }
    g1 = sp.factor(raw1.subs(forest))
    g2 = sp.factor(raw2.subs(forest))
    motif1 = sp.expand(sum(sp.diff(g1, symbol) * symbol for symbol in (r3, q35, r4)))
    motif2 = sp.expand(sp.diff(g2, r3) * r3)
    return {
        "k_symbols": k,
        "raw_g1": raw1,
        "raw_g2": raw2,
        "g1": g1,
        "g2": g2,
        "motif1": sp.factor(motif1),
        "motif2": sp.factor(motif2),
        "residual1": sp.factor(g1 - motif1),
        "residual2": sp.factor(g2 - motif2),
    }


def bernstein_coefficients(expression: sp.Expr, variable: sp.Symbol):
    polynomial = sp.Poly(sp.expand(expression), variable)
    degree = polynomial.degree()
    power = [polynomial.nth(index) for index in range(degree + 1)]
    return tuple(
        sp.factor(
            sum(
                power[j] * sp.binomial(i, j) / sp.binomial(degree, j)
                for j in range(i + 1)
            )
        )
        for i in range(degree + 1)
    )


def expected_certificates(forms):
    m, e, wedges = sp.symbols(
        "m edge_count wedges", integer=True, nonnegative=True
    )
    q = sp.symbols("q", integer=True, nonnegative=True)
    a = sp.symbols("a", nonnegative=True)
    wedge_upper = e * (e - 1) / 2
    lower1 = sp.factor(
        forms["residual1"].subs(wedges, wedge_upper).subs({m: q + 1, e: q * a})
    )
    lower2 = sp.factor(
        forms["residual2"].subs(wedges, wedge_upper).subs({m: q + 1, e: q * a})
    )
    coefficients1 = bernstein_coefficients(lower1, a)
    coefficients2 = bernstein_coefficients(lower2, a)
    expected1 = (
        (q + 2) * (65 * q**3 + 452 * q**2 + 891 * q + 552) / 24,
        (235 * q**4 + 1728 * q**3 + 4367 * q**2 + 5454 * q + 3312) / 72,
        (q + 3) * (185 * q**3 + 969 * q**2 + 934 * q + 1104) / 72,
        (5 * q**4 + 110 * q**3 + 423 * q**2 + 262 * q + 368) / 8,
    )
    expected2 = (
        (q + 2) * (10 * q**2 + 55 * q + 69),
        (50 * q**3 + 301 * q**2 + 632 * q + 552) / 4,
        (15 * q**3 + 135 * q**2 + 274 * q + 276) / 2,
    )
    assert all(sp.expand(left - right) == 0 for left, right in zip(coefficients1, expected1))
    assert all(sp.expand(left - right) == 0 for left, right in zip(coefficients2, expected2))
    for coefficient in (*coefficients1, *coefficients2):
        assert all(value >= 0 for value in sp.Poly(sp.expand(coefficient), q).all_coeffs())
    return {
        "q_definition": "q=m-1>=0",
        "edge_parameter": "edge_count=q*a, 0<=a<=1",
        "g1_degree": 3,
        "g1_coefficients": list(map(str, coefficients1)),
        "g1_minimum_at_q0": str(min(value.subs(q, 0) for value in coefficients1)),
        "g2_degree": 2,
        "g2_coefficients": list(map(str, coefficients2)),
        "g2_minimum_at_q0": str(min(value.subs(q, 0) for value in coefficients2)),
        "all_q_power_coefficients_nonnegative": True,
    }


def invariant_values(graph: nx.Graph):
    return {
        "m": len(graph),
        "edge_count": graph.number_of_edges(),
        "wedges": sum(comb(degree, 2) for _, degree in graph.degree()),
        "connected3": connected_edges(graph, 3),
        "three_edge_five": three_edge_five(graph),
        "connected4": connected_edges(graph, 4),
    }


def direct_coefficients(graph: nx.Graph):
    base = graph.copy()
    next_vertex = max(base.nodes(), default=-1) + 1
    u, v, support = next_vertex, next_vertex + 1, next_vertex + 2
    base.add_edges_from(((support, u), (support, v)))
    gamma1 = sum(bundle_components(base, (u, v), support, 1, 4))
    gamma2 = sum(bundle_components(base, (u, v), support, 2, 4))
    return int(gamma1), int(gamma2 - 2 * gamma1)


def finite_replay(forms):
    evaluate1 = exact_evaluator(forms["g1"])
    evaluate2 = exact_evaluator(forms["g2"])
    raw_evaluate1 = exact_evaluator(forms["raw_g1"])
    raw_evaluate2 = exact_evaluator(forms["raw_g2"])
    k_symbols = forms["k_symbols"]
    counts = 0
    minima = {"g1": None, "g2": None}
    by_order = {}
    for order in range(0, 8):
        candidates = [nx.empty_graph(0)] if order == 0 else [
            nx.convert_node_labels_to_integers(graph)
            for graph in nx.graph_atlas_g()
            if len(graph) == order and nx.is_forest(graph)
        ]
        local = 0
        for graph in candidates:
            polynomial = independent_poly_bruteforce(graph)
            kvals = {
                str(k_symbols[index]): polynomial[index] if index < len(polynomial) else 0
                for index in range(6)
            }
            raw = (raw_evaluate1(kvals), raw_evaluate2(kvals))
            configured = (
                evaluate1(invariant_values(graph)),
                evaluate2(invariant_values(graph)),
            )
            direct = direct_coefficients(graph)
            assert direct == raw == configured
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            for key, value in zip(("g1", "g2"), direct):
                assert value >= 0
                record = {"value": value, "order_R": order, "graph6_R": graph6}
                if minima[key] is None or value < minima[key]["value"]:
                    minima[key] = record
            counts += 1
            local += 1
        by_order[str(order)] = local
    assert counts == 80
    return {
        "orders_R": [0, 7],
        "unlabeled_forests": counts,
        "by_order": by_order,
        "minima": minima,
        "negative": {"g1": 0, "g2": 0},
        "checks": "direct bundle Gamma = raw K-row form = forest-invariant form",
    }


def main() -> None:
    structure = json.loads(STRUCTURE.read_text(encoding="utf-8"))
    assert structure["marker"] == "PASS_EXACT_CANONICAL_NO_PARENT_ROOT_STAR_MODE_CLASSIFICATION_AGENT"
    forms = raw_and_invariant_forms()
    names = {str(symbol): symbol for symbol in forms["g1"].free_symbols | forms["g2"].free_symbols}
    m, e, wedges = names["m"], names["edge_count"], names["wedges"]
    r3, q35, r4 = names["connected3"], names["three_edge_five"], names["connected4"]
    assert sp.expand(forms["motif1"] - (5 * q35 + (12 * m + 13) * r3 - 5 * r4)) == 0
    assert forms["motif2"] == 12 * r3

    # Motif positivity.  Count containments A subset B, where A is a
    # connected 3-edge tree and B a connected 4-edge tree.  Each A has at
    # most m-4 extensions; each B has at least two leaf deletions.  Hence
    # 2R4 <= (m-4)R3 whenever R4 can occur, and the displayed payment is >=0.
    # Q35 is independently nonnegative.

    derivative1 = sp.factor(sp.diff(forms["residual1"], wedges))
    derivative2 = sp.factor(sp.diff(forms["residual2"], wedges))
    assert sp.expand(derivative1 + (8 * e + 15 * m**2 - 7 * m - 64) / 2) == 0
    assert sp.expand(derivative2 + 3 * (5 * m - 1)) == 0
    # For m>=3 the first bracket is positive even at e=0.  For m=1,2,
    # every forest has e<=1 and W=C(e,2)=0 exactly.  Thus replacing W by
    # C(e,2) is valid for every actual forest with m>=1.
    assert (15 * m**2 - 7 * m - 64).subs(m, 3) > 0

    certificate = expected_certificates(forms)
    assert certificate["g1_minimum_at_q0"] == "46"
    assert certificate["g2_minimum_at_q0"] == "138"

    empty_values = {
        m: 0,
        e: 0,
        wedges: 0,
        r3: 0,
        q35: 0,
        r4: 0,
    }
    empty = {
        "g1": int(forms["g1"].subs(empty_values)),
        "g2": int(forms["g2"].subs(empty_values)),
    }
    assert empty == {"g1": 2, "g2": 24}
    finite = finite_replay(forms)

    report = {
        "marker": "PASS_EXACT_ISO_N4_BUNDLE_G12_NO_PARENT_DOUBLE_PROTECTED_ROOT_STAR_AGENT",
        "theorem": (
            "For every unmarked forest R, the canonical no-parent root-star "
            "bundle with both protected marks as leaf neighbors has g1>=0 and g2>=0."
        ),
        "row_structure": (
            "C=((1+x)^2K,(1+x)K,(1+x)K,K), D=(K,K,K,K), K=I(R)"
        ),
        "g1": {
            "form": str(forms["g1"]),
            "motif_payment": str(forms["motif1"]),
            "motif_proof": (
                "Q35>=0 and the connected-subtree containment count gives "
                "2R4<=(m-4)R3; hence 5Q35+(12m+13)R3-5R4>=0."
            ),
            "residual": str(forms["residual1"]),
        },
        "g2": {
            "form": str(forms["g2"]),
            "motif_payment": "12R3>=0",
            "residual": str(forms["residual2"]),
        },
        "wedge_reduction": {
            "bound": "W<=C(e,2), 0<=e<=m-1",
            "g1_derivative": str(derivative1),
            "g2_derivative": str(derivative2),
            "small_order_note": (
                "For m=1,2, W=C(e,2)=0; for m>=3 both derivatives are negative."
            ),
        },
        "bernstein_certificate": certificate,
        "empty_R": empty,
        "finite_replay": finite,
        "dependency": {STRUCTURE.name: sha256(STRUCTURE)},
        "scope": (
            "Exact only for k=2 in the canonical no-parent root-star "
            "classification. It does not cover arbitrary D=(C_W,...,C_W) "
            "without the isolated-mark C constraint, all N4, or Erdos 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "bernstein_certificate": certificate,
        "empty_R": empty,
        "finite_replay": finite,
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
