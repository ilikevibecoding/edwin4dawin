#!/usr/bin/env python3
"""Exact arbitrary-component transport theorem for disconnected-M5 sum16.

After the isolated selected vertices have been extracted into ``(1+x)^t``, let
``P0`` be a forest, let ``S`` contain one active vertex in each selected
component of ``P0``, and put ``H=P0-S``.  If there are ``a`` selected
components, ``b`` unselected components, ``E`` edges of ``P0``, and
``q=sum(deg_P0(s): s in S)``, then

    N=|P0|=E+a+b,  |H|=E+b=N-a,  e(H)=E-q,
    b>=0,  1<=a<=q<=E.

Twice the unique disconnected-M5 Psi interval sum16 has the exact Newton
expansion ``sum(R_j*binom(t,j),j=0..6)``.  This file proves every ``R_j``:
all componentwise-deletion cores through N=12 are enumerated exactly, and
N>=13 is covered by an exact forest-ratio/tensor-Bernstein certificate.

Strict scope: unique sum16 under the displayed componentwise-deletion
geometry.  This is not by itself a theorem for the other unique sums,
disconnected M5, g1, all N5, or Erdos Problem 993.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import mul, poly_forest
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
OUTPUT = HERE / (
    "iso_n5_disconnected_m5_sum16_componentwise_deletion_exact_"
    "g1_bernstein_20260830.json"
)
MARKER = (
    "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM16_COMPONENTWISE_DELETION_"
    "G1_BERNSTEIN"
)
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
EXPECTED_FINITE_HASH = (
    "89799664D4FB3DABFE2CC0AF664659AF1DC020AA2057AED518ED5D9A8B4E8FB7"
)
EXPECTED = {
    "high": [
        (34244, 5760, [5, 5, 1, 5], 432, 170672, sp.Rational(24, 5),
         "383D72AF0ED17506B874EFB526C6A8E60984C07DAF9B3DDF6B8AE6009F16F32A",
         "01EB1DA7B2D70FF34F2AED263BC2AD8AC0A0C94399EC6C0FC1AC4A86065A5084"),
        (14557, 480, [5, 4, 1, 5], 360, 80284, sp.Rational(4, 5),
         "CF79FB44EBF7ABAFE5CAF2B417D16BC67302A5122D99280962C33A25434B8292",
         "511BA1A34C8B87973979E2DCA03E47595EDCE81CFB033C06EBFCE8D4A908D97F"),
        (5728, 192, [4, 4, 1, 4], 250, 45838, sp.Integer(8),
         "390A4BF6273ED0B2FD3760C0EC8B480A4BEE0FE90B10761001B8CF02230AB0BC",
         "CEB1C8C4362E6606E4865B74E7ED1A4825A5ADEF830D703ECB1A1593D4DE4262"),
        (1745, 12, [3, 3, 1, 3], 128, 10678, sp.Integer(6),
         "4ADD73DED47DD47BB94EFEDFFC768CF62EBA3190963D87668F64A155258E9E07",
         "023B220926451A458C24BE7C4C68E0E235A0BE061EA1EA89ECD0EE267FEBAF2B"),
        (322, 4, [2, 2, 1, 2], 54, 1596, sp.Integer(14),
         "746A595741865BB890924A0449059BD58C41E0F9AB260F0BF9F666653F594A55",
         "DC1D6DA7EEF3DDEA81FFCBF0CB94996E3258A0145E0171910E1DD0C542EC5CC6"),
        (5, 1, [1, 1, 0, 0], 4, 8, sp.Integer(92),
         "33EED22929C25D96FD0C0870A6D2E29C380310861C42A833DB70E716A3B70153",
         "42868DA5F2B70FA73F199247C3BEA1907FAEE9006479A68DD0A55A131A63792C"),
        (1, 1, [0, 0, 0, 0], 1, 1, sp.Integer(98),
         "BA6EB48DC8BCDED0E874B32C63F01A4658A43588197372483B3D97F6E6296373",
         "3DD4CD36B25F028B9807BDE132F837834481742C9C0ECFEB05D9EF61ECD4738C"),
    ],
    "low": [
        (24619, 5760, [5, 5, 1, 5, 2], 1296, 196554, sp.Rational(48, 5),
         "CAC06BEDB77BC6513582BA82654CBE1A1AEA08B90EA02DDC5DDBD98A3A4508FB",
         "1B5151A1926E491C602DE4422F3F851C1D6596C6FF675303DCEC084538158428"),
        (10793, 480, [5, 4, 1, 5, 2], 1080, 104742, sp.Rational(4, 5),
         "CB958DEF37FF8C8B248DCEAA7F5D1320A3008D9B0C8945C29AE37D3C46FD9110",
         "498D20DDADF478853D24DC32FB8E61DD82B3EF238B69642CC7AE61CFF921D714"),
        (4600, 192, [4, 4, 1, 4, 1], 500, 39744, sp.Integer(8),
         "A86AB677D81679572E6566421BA8ADC691B3C2BCDE629192F96FAD39B11A56FD",
         "D69D3AF8DEE2A4F590BB93C67965680A56C07C8872CCFF7A38296D0A9B686BEE"),
        (1368, 12, [3, 3, 1, 3, 1], 256, 10472, sp.Integer(6),
         "5125F7E44D4F3690D3177FBC5D48B48ECCAF16E784050E10300E0F69D7FFEEE1",
         "35D1B6BC6BFF211C02E6EA7048D01527B251F0058595C27A05925361FA181958"),
        (251, 4, [2, 2, 1, 2, 1], 108, 1776, sp.Integer(140),
         "ADD082506EDC98B33C8549668570B62F185AD98DFC42D65360E2BC0B6994F206",
         "642BF44715B1CD286B22569245B35903E751A0A0106D9D0069779E5BBD45FC68"),
        (5, 1, [1, 1, 0, 0, 0], 4, 8, sp.Integer(92),
         "33EED22929C25D96FD0C0870A6D2E29C380310861C42A833DB70E716A3B70153",
         "D4332C8739D45306E832B6D2EE7B12AA495B9D7679F065BCF9D4AEEB00ADDAD8"),
        (1, 1, [0, 0, 0, 0, 0], 1, 1, sp.Integer(98),
         "BA6EB48DC8BCDED0E874B32C63F01A4658A43588197372483B3D97F6E6296373",
         "CBFFDD7F97564632A32F8D3BC654774D2B527BA2C44819DF9E82129D6C0503D6"),
    ],
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def object_hash(value) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(payload).hexdigest().upper()


def unlabeled_forests(order: int):
    """One representative of every unlabeled forest of the given order."""
    types = []
    for size in range(1, order + 1):
        candidates = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for graph in candidates:
            types.append((size, nx.convert_node_labels_to_integers(graph)))

    def extend(remaining, start, chosen):
        if remaining == 0:
            yield nx.disjoint_union_all([types[index][1] for index in chosen])
            return
        for index in range(start, len(types)):
            size = types[index][0]
            if size > remaining:
                break
            yield from extend(remaining - size, index, (*chosen, index))

    yield from extend(order, 0, ())


def finite_componentwise_certificate(x, h, rows):
    """Exhaust every active one-root-per-selected-component core N<=12."""
    evaluator = sp.lambdify((*x, *h), rows, modules="math")
    global_minima = [None] * 7
    witnesses = [None] * 7
    order_rows = {}
    forest_count = cell_count = 0

    for order in range(2, 13):
        local_forests = local_cells = 0
        local_minima = [None] * 7
        for forest in unlabeled_forests(order):
            forest = nx.convert_node_labels_to_integers(forest)
            local_forests += 1
            forest_count += 1
            components = [
                tuple(sorted(component))
                for component in nx.connected_components(forest)
            ]
            # Build H coefficientwise from its components.  This is exactly the
            # same census as deleting vertices in the full graph, but avoids an
            # exponential independent-set recomputation for every root tuple.
            component_choices = []
            p_values = [1]
            for component in components:
                graph = forest.subgraph(component).copy()
                full = poly_forest(graph)
                p_values = mul(p_values, full)
                options = [(None, full)]
                if len(component) >= 2:
                    for vertex in component:
                        deleted = graph.copy()
                        deleted.remove_node(vertex)
                        options.append((vertex, poly_forest(deleted)))
                component_choices.append(tuple(options))

            for selection in itertools.product(*component_choices):
                selected = tuple(
                    vertex for vertex, _ in selection if vertex is not None
                )
                if not selected:
                    continue
                h_values = [1]
                for _, component_polynomial in selection:
                    h_values = mul(h_values, component_polynomial)
                arguments = (
                    *(at(p_values, rank) for rank in range(8)),
                    *(at(h_values, rank) for rank in range(7)),
                )
                values = [int(value) for value in evaluator(*arguments)]

                edge_count = forest.number_of_edges()
                selected_degree = sum(forest.degree(vertex) for vertex in selected)
                unselected_components = len(components) - len(selected)
                assert order == edge_count + len(selected) + unselected_components
                assert 1 <= len(selected) <= selected_degree <= edge_count
                assert order - len(selected) == edge_count + unselected_components
                assert edge_count - selected_degree >= 0
                assert all(value >= 0 for value in values), (
                    order,
                    nx.to_graph6_bytes(forest, header=False).decode().strip(),
                    selected,
                    values,
                )

                for index, value in enumerate(values):
                    if global_minima[index] is None or value < global_minima[index]:
                        global_minima[index] = value
                        witnesses[index] = {
                            "core_order_N": order,
                            "forest_graph6": nx.to_graph6_bytes(
                                forest, header=False
                            ).decode().strip(),
                            "selected_vertices": list(selected),
                        }
                    local_minima[index] = (
                        value if local_minima[index] is None
                        else min(local_minima[index], value)
                    )
                local_cells += 1
                cell_count += 1

        order_rows[str(order)] = {
            "core_order_N": order,
            "unlabeled_forests": local_forests,
            "componentwise_deletion_cells": local_cells,
            "minimum_R0_through_R6": local_minima,
        }

    return {
        "core_orders_N": [2, 12],
        "unlabeled_forests": forest_count,
        "componentwise_deletion_cells": cell_count,
        "newton_row_checks": 7 * cell_count,
        "global_minimum_R0_through_R6": global_minima,
        "minimizing_witnesses": witnesses,
        "rows": order_rows,
        "completeness": (
            "Every forest is a multiset of unlabeled tree types.  In each "
            "component the product chooses either no deleted vertex or one "
            "active vertex; excluding the all-unselected choice gives exactly "
            "the displayed geometry with a>=1 after isolated selected vertices "
            "have been extracted."
        ),
    }


def general_lower_rows(x, h, rows):
    N, A, B, Q = sp.symbols("N A B Q", nonnegative=True)
    a = N * A / 2
    b = N * (1 - A) * B
    E = N - a - b
    m = N - a
    q = a + Q * (E - a)
    assert sp.expand(N - (E + a + b)) == 0
    assert sp.expand(m - (E + b)) == 0
    assert sp.factor(E - a - N * (1 - A) * (1 - B)) == 0

    substitutions = {
        x[1]: N,
        x[2]: choose(N, 2) - E,
        h[1]: m,
        h[2]: choose(m, 2) - (E - q),
    }
    h3_floor = choose(m, 3) - (E - q) * (m - 2)
    d4_floor = choose(a, 4) + m * choose(a, 3) - q * choose(a - 1, 2)
    d5_floor = choose(a, 5) + m * choose(a, 4) - q * choose(a - 1, 3)

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
        lowered.append(sp.expand(row.subs(substitutions).subs({
            h[3]: h3_floor,
            h[4]: x[4] - d4_floor,
            h[5]: x[5] - d5_floor,
        })))
        coefficient_report.append({
            "newton_row": row_index,
            "coefficients_of_h3_h4_h5": [str(value) for value in actual],
        })
    return (N, A, B, Q), (a, b, E, m, q), lowered, coefficient_report


def sector_certificate(sector, core_symbols, geometry, x, lowered):
    N, A, B, Q = core_symbols
    _, _, E, _, _ = geometry
    w, alpha = sp.symbols(f"{sector}_w {sector}_alpha", nonnegative=True)
    rho1_fixed = sp.factor(4 * (choose(N, 2) - E) / N)
    expected_rho1 = 2 * N - 6 + 2 * A + 4 * B * (1 - A)
    assert sp.expand(rho1_fixed - expected_rho1) == 0
    rho5 = 2 * (N - 5) * w
    excess = rho1_fixed - rho5 - 4

    if sector == "high":
        z = sp.symbols("high_z0:4", nonnegative=True)
        rho4 = rho5 + 1 + excess * z[3]
        rho3 = rho4 + 1 + excess * z[2]
        rho2 = rho3 + 1 + excess * z[1]
        rho1 = rho2 + 1 + excess * z[0]
        cubes = (A, B, Q, w)
        cone = "delta1,delta2,delta3,delta4>=1"
    else:
        z = sp.symbols("low_z0:3", nonnegative=True)
        rho4 = rho5 + 1 + excess * z[2]
        rho3 = rho4 + 1 + excess * z[1]
        rho2 = rho3 + 2 - alpha + excess * z[0]
        rho1 = rho2 + alpha
        cubes = (A, B, Q, w, alpha)
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
        - (choose(N, 2) - E)
    ) == 0

    reports = []
    for row_index, lower in enumerate(lowered):
        expression = lower.subs(coefficient_substitutions)
        numerator, denominator = sp.fraction(sp.together(expression))
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
            polynomial_hash(polynomial),
            coefficient_rows_hash(homogeneous),
        )
        assert actual == EXPECTED[sector][row_index], (
            sector, row_index, actual, EXPECTED[sector][row_index]
        )
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
        "rho1_edge_identity": "rho1=2N-6+2A+4B(1-A)",
        "rho5_extension_ceiling": "rho5<=2(N-5)",
        "parameterization": (
            "rho5=2(N-5)w; excess rho1-rho5-4 is distributed over "
            "the displayed simplex"
        ),
        "rows": reports,
    }


def main():
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name

    x, h, rows = generic_newton_rows()
    finite = finite_componentwise_certificate(x, h, rows)
    assert finite["unlabeled_forests"] == 2947
    assert finite["componentwise_deletion_cells"] == 72600
    assert finite["newton_row_checks"] == 508200
    assert finite["global_minimum_R0_through_R6"] == [0, 0, 36, 231, 474, 378, 98]
    assert object_hash(finite) == EXPECTED_FINITE_HASH
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
    assert total_terms == 662374

    report = {
        "marker": MARKER,
        "theorem": (
            "For every forest P0, every independent set S containing one active "
            "vertex in each selected component and no vertex in each unselected "
            "component, and H=P0-S, disconnected-M5 unique Psi interval sum16 "
            "is nonnegative after adjoining any number t of isolated selected "
            "vertices to P0."
        ),
        "componentwise_deletion_geometry": {
            "isolate_extraction": (
                "Remove the t isolated selected components from P; "
                "I(P)=(1+x)^t I(P0), while H is unchanged."
            ),
            "parameters": (
                "a=selected active components, b=unselected components, "
                "E=e(P0), q=sum selected degrees, N=|P0|"
            ),
            "identities": [
                "N=E+a+b",
                "|H|=E+b=N-a",
                "e(H)=E-q",
                "b>=0 and 1<=a<=q<=E",
            ],
            "continuous_box": (
                "a=NA/2, b=N(1-A)B, E=N-a-b, "
                "q=a+Q(E-a), 0<=A,B,Q<=1"
            ),
            "surjectivity": (
                "For every valid geometry take A=2a/N, "
                "B=b/(N-2a) when N>2a, and Q=(q-a)/(E-a) when E>a; "
                "the zero-denominator boundary values are forced and are "
                "reached by continuity."
            ),
        },
        "newton_expansion": {
            "identity": "2*sum16=sum_{j=0}^6 R_j*binom(t,j)",
            "R0_through_R6": [str(sp.factor(row)) for row in rows],
        },
        "deletion_lower_bounds": {
            "h3": "C(N-a,3)-(E-q)(N-a-2)",
            "d4": "C(a,4)+(N-a)C(a,3)-q C(a-1,2)",
            "d5": "C(a,5)+(N-a)C(a,4)-q C(a-1,3)",
            "proof": (
                "The h3 floor is the edge-union bound in H.  For d_k=x_k-h_k, "
                "count all k-subsets of S and all pairs of a (k-1)-subset of S "
                "with one H vertex, then subtract at most "
                "q*C(a-1,k-2) pairs containing a selected-H edge."
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
            "The exact census proves all seven Newton rows for 2<=N<=12. "
            "For N>=13 every row passes both exact forest-ratio sectors. "
            "Since binom(t,j)>=0, unique sum16 is nonnegative for every t>=0."
        ),
        "scope": (
            "Exact theorem for unique disconnected-M5 sum16 under arbitrary "
            "componentwise deletion with at least one active selected component. "
            "It does not itself prove the other unique sums, all disconnected M5, "
            "g1, all N5, or Erdos Problem 993."
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
        "finite_unlabeled_forests": finite["unlabeled_forests"],
        "finite_componentwise_cells": finite["componentwise_deletion_cells"],
        "finite_newton_row_checks": finite["newton_row_checks"],
        "large_order_branches": 14,
        "large_order_homogeneous_coefficients": total_terms,
        "source_sha256": report["source_sha256"],
        "report_sha256": sha256(OUTPUT),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
