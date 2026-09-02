#!/usr/bin/env python3
"""Exact all-order active-root theorem for disconnected-M5 unique sum16.

Let P=T-u, S=N_T(u), and H=P-S.  Remove the t isolated vertices of S
from P and call the remaining active core P0.  If a is the number of active
selected vertices and e=|H|, then

    |P0|=N=e+a,  e(P0)=e,  e(H)=e-q,  1<=a<=q<=e,

where q=sum_{v in S}deg_P(v), and I(P)=(1+x)^t I(P0).  Twice unique Psi
interval sum16 has the exact Newton expansion

    2 sum16 = sum_{j=0}^6 R_j binom(t,j).

For N<=12 this replay exhausts all active rooted cores.  For N>=13 it
proves every R_j by an exact induced-deletion/forest-ratio certificate.  The
key deletion bounds are

  h3 >= C(e,3)-(e-q)(e-2),
  d_k=x_k-h_k >= C(a,k)+e C(a,k-1)-q C(a-1,k-2), k=4,5.

The latter count independent sets containing k selected vertices, or k-1
selected vertices and one H vertex, with an edge-union subtraction.

This closes unique sum16 for active rooted pairs only.  It does not close
sums14/15, arbitrary common-factor transport, all disconnected M5, or g1.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest
from probe_iso_n5_disconnected_m5_sum16_q2_component_newton_g1_nonadjacent import (
    generic_newton_rows,
)
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import at, choose
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import (
    coefficient_rows_hash,
    polynomial_hash,
    shift_and_simplex_homogenize,
    tensor_bernstein_sparse,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum16_all_active_roots_exact_g1_nonadjacent_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM16_ALL_ACTIVE_ROOTS_G1_NONADJACENT"
DEPENDENCIES = {
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
    "probe_iso_n5_disconnected_m5_sum16_q2_component_newton_g1_nonadjacent.py":
        "B938A7416091632E8725B34A029FA3F9260163CDD57CD6334C71D91A11435F59",
    "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py":
        "079C32D829AA91F29B539B869FA57C946BE0DD101AE06E6B5A80A41207AECD31",
    "prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent.py":
        "D911393AB0C386CC8CEAE2F3C78A34430F76307EB5BF298FCEB4E06374C37489",
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
}

EXPECTED = {
    "high": [
        (11110, 5760, [5, 1, 5], 72, 23046, sp.Rational(24, 5)),
        (5130, 480, [5, 1, 5], 72, 14136, sp.Rational(4, 5)),
        (2189, 192, [4, 1, 4], 50, 7538, sp.Integer(8)),
        (800, 12, [3, 1, 3], 32, 2232, sp.Integer(6)),
        (184, 4, [2, 1, 2], 18, 456, sp.Integer(14)),
        (3, 1, [1, 0, 0], 2, 4, sp.Integer(109)),
        (1, 1, [0, 0, 0], 1, 1, sp.Integer(98)),
    ],
    "low": [
        (8512, 5760, [5, 1, 5, 2], 216, 27516, sp.Rational(48, 5)),
        (4006, 480, [5, 1, 5, 2], 216, 18810, sp.Rational(4, 5)),
        (1839, 192, [4, 1, 4, 1], 100, 6740, sp.Integer(8)),
        (657, 12, [3, 1, 3, 1], 64, 2244, sp.Integer(6)),
        (149, 4, [2, 1, 2, 1], 36, 516, sp.Integer(183)),
        (3, 1, [1, 0, 0, 0], 2, 4, sp.Integer(109)),
        (1, 1, [0, 0, 0, 0], 1, 1, sp.Integer(98)),
    ],
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def finite_active_core_certificate(x, h, rows):
    evaluator = sp.lambdify((*x, *h), rows, modules="math")
    global_minima = [None] * 7
    witnesses = [None] * 7
    order_rows = {}
    tree_count = core_count = 0
    for tree_order in range(3, 14):
        local_count = 0
        local_minima = [None] * 7
        for tree0 in nx.nonisomorphic_trees(tree_order):
            tree = nx.convert_node_labels_to_integers(tree0)
            tree_count += 1
            graph6 = nx.to_graph6_bytes(tree, header=False).decode().strip()
            for root in tree:
                selected = list(tree.neighbors(root))
                # Root-leaf neighbours are precisely the isolated selected
                # vertices already extracted into the Newton factor (1+x)^t.
                if any(tree.degree(vertex) == 1 for vertex in selected):
                    continue
                p_graph = tree.copy()
                p_graph.remove_node(root)
                h_graph = tree.copy()
                h_graph.remove_nodes_from({root, *selected})
                p_values = poly_forest(p_graph)
                h_values = poly_forest(h_graph)
                arguments = (
                    *(at(p_values, rank) for rank in range(8)),
                    *(at(h_values, rank) for rank in range(7)),
                )
                values = [int(value) for value in evaluator(*arguments)]
                assert all(value >= 0 for value in values), (
                    tree_order, graph6, root, values,
                )
                for index, value in enumerate(values):
                    if global_minima[index] is None or value < global_minima[index]:
                        global_minima[index] = value
                        witnesses[index] = {
                            "active_core_order_N": tree_order - 1,
                            "tree_graph6": graph6,
                            "root": root,
                        }
                    local_minima[index] = (
                        value if local_minima[index] is None
                        else min(local_minima[index], value)
                    )
                local_count += 1
                core_count += 1
        order_rows[str(tree_order - 1)] = {
            "active_core_order_N": tree_order - 1,
            "unlabeled_tree_order": tree_order,
            "active_root_checks": local_count,
            "minimum_R0_through_R6": local_minima,
        }

    # The q=0 core is empty; all selected vertices are isolated and belong to t.
    empty = {**{x[index]: int(index == 0) for index in range(8)},
             **{h[index]: int(index == 0) for index in range(7)}}
    empty_rows = [int(row.subs(empty)) for row in rows]
    assert empty_rows == [0, 0, 0, 10, 76, 160, 98]
    assert tree_count == 2286
    assert core_count == 19081
    assert global_minima == [0, 0, 36, 231, 474, 378, 98]
    return {
        "active_core_orders_N": [2, 12],
        "unlabeled_trees": tree_count,
        "active_root_cores": core_count,
        "newton_row_checks": 7 * core_count,
        "global_minimum_R0_through_R6": global_minima,
        "minimizing_witnesses": witnesses,
        "empty_q0_core_R0_through_R6": empty_rows,
        "rows": order_rows,
        "completeness": (
            "Deleting every root-leaf neighbour removes exactly the t isolated "
            "selected components and leaves an active rooted tree of order N+1. "
            "Thus the census through tree order 13 covers every active core N<=12."
        ),
    }


def general_lower_rows(x, h, rows):
    N, R, Q = sp.symbols("N R Q", nonnegative=True)
    selected_fraction = R / 2
    a = N * selected_fraction
    e = N - a
    q = a + Q * (e - a)
    substitutions = {
        x[1]: N,
        x[2]: choose(N, 2) - e,
        h[1]: e,
        h[2]: choose(e, 2) - (e - q),
    }
    h3_floor = choose(e, 3) - (e - q) * (e - 2)
    d4_floor = choose(a, 4) + e * choose(a, 3) - q * choose(a - 1, 2)
    d5_floor = choose(a, 5) + e * choose(a, 4) - q * choose(a - 1, 3)
    expected_h_coefficients = [
        (x[1] + 8 * x[3], -2 * x[2], -6 * x[1]),
        (8 * x[2] + 1, -2 * x[1], sp.Integer(-6)),
        (8 * x[1], sp.Integer(-2), sp.Integer(0)),
        (sp.Integer(8), sp.Integer(0), sp.Integer(0)),
        (sp.Integer(0), sp.Integer(0), sp.Integer(0)),
        (sp.Integer(0), sp.Integer(0), sp.Integer(0)),
        (sp.Integer(0), sp.Integer(0), sp.Integer(0)),
    ]
    lowered = []
    coefficient_report = []
    for row_index, row in enumerate(rows):
        actual = tuple(sp.factor(row.coeff(h[rank])) for rank in (3, 4, 5))
        assert all(
            sp.expand(left - right) == 0
            for left, right in zip(actual, expected_h_coefficients[row_index])
        )
        expression = sp.expand(row.subs(substitutions).subs({
            h[3]: h3_floor,
            h[4]: x[4] - d4_floor,
            h[5]: x[5] - d5_floor,
        }))
        lowered.append(expression)
        coefficient_report.append({
            "newton_row": row_index,
            "coefficients_of_h3_h4_h5": [str(value) for value in actual],
        })
    return (N, R, Q), (a, e, q), lowered, coefficient_report


def sector_certificate(sector, core_symbols, geometry, x, lowered):
    N, R, Q = core_symbols
    a, e, q = geometry
    w, alpha = sp.symbols(f"{sector}_w {sector}_alpha", nonnegative=True)
    rho1_fixed = sp.factor(4 * (choose(N, 2) - e) / N)
    assert sp.expand(rho1_fixed - (2 * N - 6 + 2 * R)) == 0
    rho5 = 2 * (N - 5) * w
    excess = rho1_fixed - rho5 - 4
    if sector == "high":
        z = sp.symbols("high_z0:4", nonnegative=True)
        rho4 = rho5 + 1 + excess * z[3]
        rho3 = rho4 + 1 + excess * z[2]
        rho2 = rho3 + 1 + excess * z[1]
        rho1 = rho2 + 1 + excess * z[0]
        cubes = (R, Q, w)
        cone = "delta1,delta2,delta3,delta4>=1"
    else:
        z = sp.symbols("low_z0:3", nonnegative=True)
        rho4 = rho5 + 1 + excess * z[2]
        rho3 = rho4 + 1 + excess * z[1]
        rho2 = rho3 + 2 - alpha + excess * z[0]
        rho1 = rho2 + alpha
        cubes = (R, Q, w, alpha)
        cone = "delta1=alpha in [0,1], delta2>=2-alpha, delta3,delta4>=1"
    assert sp.factor(rho1 - rho1_fixed - excess * (sum(z) - 1)) == 0

    product = 1
    coefficient_substitutions = {}
    for rank, rho in zip(range(2, 7), (rho1, rho2, rho3, rho4, rho5)):
        product *= rho
        coefficient_substitutions[x[rank]] = (
            N * product / (2 ** (rank - 1) * sp.factorial(rank))
        )
    assert sp.factor(
        coefficient_substitutions[x[2]].subs(z[-1], 1 - sum(z[:-1]))
        - (choose(N, 2) - e)
    ) == 0

    reports = []
    for row_index, lower in enumerate(lowered):
        expression = lower.subs(coefficient_substitutions)
        numerator, denominator = sp.fraction(sp.together(expression))
        expected = EXPECTED[sector][row_index]
        assert denominator == expected[1]
        polynomial = sp.Poly(numerator, N, *cubes, *z)
        cube_degrees, bernstein_rows = tensor_bernstein_sparse(
            polynomial, len(cubes)
        )
        homogeneous, total_terms, minimum = shift_and_simplex_homogenize(
            bernstein_rows, len(z)
        )
        actual = (
            len(polynomial.terms()),
            int(denominator),
            cube_degrees,
            len(bernstein_rows),
            total_terms,
            minimum,
        )
        assert actual == expected, (sector, row_index, actual, expected)
        reports.append({
            "newton_row": row_index,
            "positive_denominator": str(denominator),
            "numerator_power_terms": len(polynomial.terms()),
            "numerator_power_hash": polynomial_hash(polynomial),
            "cube_variables": [str(variable) for variable in cubes],
            "cube_bernstein_degrees": cube_degrees,
            "cube_bernstein_rows": len(bernstein_rows),
            "simplex_variables": len(z),
            "nonzero_homogeneous_coefficients": total_terms,
            "minimum_homogeneous_coefficient": str(minimum),
            "ordered_homogeneous_coefficient_hash": coefficient_rows_hash(homogeneous),
        })
    return {
        "cone": cone,
        "rho_definition": "rho_j=2(j+1)x_(j+1)/x_j",
        "rho1_edge_identity": "rho1=2N-6+2R",
        "rho5_extension_ceiling": "rho5<=2(N-5)",
        "parameterization": (
            "rho5=2(N-5)w; excess rho1-rho5-4 is distributed on the "
            "displayed simplex"
        ),
        "rows": reports,
    }


def main():
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name
    x, h, rows = generic_newton_rows()
    finite = finite_active_core_certificate(x, h, rows)
    core_symbols, geometry, lowered, signs = general_lower_rows(x, h, rows)
    sectors = {
        sector: sector_certificate(sector, core_symbols, geometry, x, lowered)
        for sector in ("high", "low")
    }
    total_terms = sum(
        row["nonzero_homogeneous_coefficients"]
        for sector in sectors.values()
        for row in sector["rows"]
    )
    assert total_terms == 103244
    report = {
        "marker": MARKER,
        "theorem": (
            "For every active rooted-tree pair P=T-u, H=T-N[u], disconnected-M5 "
            "unique Psi interval sum16 is nonnegative at every order."
        ),
        "active_core_geometry": {
            "isolate_extraction": (
                "Remove the t isolated selected vertices from P; "
                "I(P)=(1+x)^t I(P0)."
            ),
            "parameters": (
                "a=number of active selected vertices, e=|H|, "
                "q=sum selected degrees, N=|P0|=e+a"
            ),
            "identities": [
                "e(P0)=e",
                "e(H)=e-q",
                "1<=a<=q<=e",
                "a/N<=1/2",
            ],
            "continuous_box": (
                "a=NR/2, e=N-a, q=a+Q(e-a), 0<=R,Q<=1"
            ),
        },
        "newton_expansion": {
            "identity": "2*sum16=sum_{j=0}^6 R_j*binom(t,j)",
            "R0_through_R6": [str(sp.factor(row)) for row in rows],
        },
        "deletion_lower_bound": {
            "h3": "C(e,3)-(e-q)(e-2)",
            "d4": "C(a,4)+e*C(a,3)-q*C(a-1,2)",
            "d5": "C(a,5)+e*C(a,4)-q*C(a-1,3)",
            "proof": (
                "For d_k, count every k-subset of the independent selected set, "
                "then pairs of a (k-1)-subset of selected vertices with one H "
                "vertex.  At most q*C(a-1,k-2) pairs contain a selected-H edge."
            ),
            "row_h3_h4_h5_coefficient_signs": signs,
        },
        "finite_N_at_most_12": finite,
        "large_order_N_at_least_13": {
            "forest_ratio_sectors": sectors,
            "total_homogeneous_coefficients": total_terms,
            "negative_coefficients": 0,
        },
        "coverage": (
            "The exact active-core census proves every Newton row for N<=12, "
            "including the empty q=0 core.  For N>=13 all seven rows pass both "
            "forest-ratio sectors.  Since every binom(t,j)>=0, sum16>=0."
        ),
        "remaining_disconnected_M5_unique_sums": [14, 15],
        "scope": (
            "Exact active-root theorem for unique sum16 only.  It does not by "
            "itself transport arbitrary common unmarked components, prove sums14/15, "
            "all disconnected M5, connected-nonadjacent M5, M5+3C5, g1, N5, "
            "or Erdos Problem 993."
        ),
        "pinned_dependencies": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(raw, encoding="utf-8", newline="\n")
    os.replace(temporary, OUTPUT)
    print(json.dumps({
        "marker": MARKER,
        "finite_active_cores": finite["active_root_cores"],
        "finite_newton_row_checks": finite["newton_row_checks"],
        "large_order_branches": 14,
        "large_order_homogeneous_coefficients": total_terms,
        "source_sha256": report["source_sha256"],
        "report_sha256": sha256(OUTPUT),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
