#!/usr/bin/env python3
"""Independent fail-closed audit of terminal rank-three anchor ordering.

The frozen producer is never imported or executed.  This auditor reconstructs
the rank-three motif cross, replays the complete finite coefficient stream,
checks the analytic reductions and Bernstein certificates, and performs a
separate literal graph replay.
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
OUTPUT = HERE / "terminal_q3_anchor_ordering_independent_audit_20260828.json"
PRIMARY_SOURCE = HERE / "prove_terminal_q3_anchor_ordering_root.py"
PRIMARY_REPORT = HERE / "terminal_q3_anchor_ordering_exact_root_20260828.json"
EXPECTED_PRIMARY_SOURCE = "F37CCF78EAD0BEE367010FBD76A448FA7D3450226BE6FF6EC001F722A6B35D6B"
EXPECTED_PRIMARY_REPORT = "AF84F93A2CCCCF9E733D6096E51DEDB0F07B3AE6A6D303327CAF77D558CE4023"
EXPECTED_PRIMARY_STATUS = "PASS_EXACT_ALL_ORDER_TERMINAL_Q3_ANCHOR_ORDERING"
DEPENDENCIES = {
    "verify_tree_rank45_path_ratio.py": (
        "AB5D6E395A13BE66276D45C25EB2F869B2410B2445F78A45F4A83648CE1CA86C"
    ),
    "TREE_RANK45_PATH_RATIO_THEOREM_2026-07-28.md": (
        "7FE34CDC7F02442ABB9665A0FDC093B78331C6B93CC0793F60B06259BB7B1528"
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def falling_choose(value: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def rank_three_formula(
    vertices: sp.Expr,
    edges: sp.Expr,
    wedges: sp.Expr,
    four_subtrees: sp.Expr,
) -> tuple[sp.Expr, sp.Expr]:
    independent = falling_choose(vertices, 3) - edges * (vertices - 2) + wedges
    disjoint_edge_pairs = falling_choose(edges, 2) - wedges
    slides = (
        edges * falling_choose(vertices - 2, 2)
        - 2 * (wedges * (vertices - 3) + disjoint_edge_pairs)
        + 3 * four_subtrees
    )
    return sp.expand(independent), sp.expand(slides)


def reconstruct_cross() -> tuple[sp.Expr, tuple[sp.Symbol, ...]]:
    n, degree, bundle, wedges, four_subtrees, neighbor_excess = sp.symbols(
        "n degree bundle wedges four_subtrees neighbor_excess",
        integer=True,
        nonnegative=True,
    )
    iq, sq = rank_three_formula(n + bundle, n - 1, wedges, four_subtrees)
    terminal_wedges = wedges + degree + falling_choose(bundle + 1, 2)
    terminal_four = (
        four_subtrees
        + falling_choose(degree, 2)
        + falling_choose(bundle + 1, 3)
        + neighbor_excess
        + degree * bundle
    )
    it, st = rank_three_formula(
        n + bundle + 1,
        n + bundle,
        terminal_wedges,
        terminal_four,
    )
    return sp.expand(st * iq - sq * it), (
        n,
        degree,
        bundle,
        wedges,
        four_subtrees,
        neighbor_excess,
    )


def graph_statistics(tree: nx.Graph) -> tuple[int, int]:
    degrees = dict(tree.degree())
    wedges = sum(comb(value, 2) for value in degrees.values())
    four_subtrees = sum(comb(value, 3) for value in degrees.values())
    four_subtrees += sum(
        (degrees[u] - 1) * (degrees[v] - 1) for u, v in tree.edges()
    )
    return wedges, four_subtrees


def complete_finite_replay(
    cross: sp.Expr,
    symbols: tuple[sp.Symbol, ...],
    primary: dict[str, object],
) -> dict[str, object]:
    n, degree, bundle, wedges, four_subtrees, neighbor_excess = symbols
    shift = sp.symbols("shift", integer=True, nonnegative=True)
    shifted = sp.Poly(sp.expand(12 * cross.subs(bundle, shift + 1)), shift)
    assert shifted.degree() == 4
    coefficients = [shifted.coeff_monomial(shift**power) for power in range(5)]
    evaluators = [
        sp.lambdify(
            (n, degree, wedges, four_subtrees, neighbor_excess),
            coefficient,
            modules="math",
        )
        for coefficient in coefficients
    ]

    stream = hashlib.sha256()
    trees_total = marked_total = zeros = 0
    minimum: int | None = None
    per_order = []
    for order in range(1, 15):
        trees = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        tree_count = marked_count = 0
        for tree_index, tree in enumerate(trees):
            tree_count += 1
            degrees = dict(tree.degree())
            local_wedges, local_four = graph_statistics(tree)
            graph6 = nx.to_graph6_bytes(tree, header=False).decode().strip()
            for root in sorted(tree.nodes()):
                marked_count += 1
                local_neighbor_excess = sum(
                    degrees[vertex] - 1 for vertex in tree.neighbors(root)
                )
                values = tuple(
                    int(evaluator(
                        order,
                        degrees[root],
                        local_wedges,
                        local_four,
                        local_neighbor_excess,
                    ))
                    for evaluator in evaluators
                )
                assert all(value >= 0 for value in values), (
                    order,
                    tree_index,
                    root,
                    graph6,
                    values,
                )
                zeros += sum(value == 0 for value in values)
                local_minimum = min(values)
                minimum = local_minimum if minimum is None else min(minimum, local_minimum)
                stream.update(
                    (
                        f"{order},{tree_index},{root},{graph6},"
                        + ",".join(map(str, values))
                        + "\n"
                    ).encode()
                )
        trees_total += tree_count
        marked_total += marked_count
        per_order.append({
            "order": order,
            "trees": tree_count,
            "marked_trees": marked_count,
        })

    digest = stream.hexdigest().upper()
    frozen = primary["finite_certificate"]
    assert trees_total == frozen["tree_count"] == 5447
    assert marked_total == frozen["marked_tree_count"] == 72145
    assert 5 * marked_total == frozen["shifted_coefficient_count"] == 360725
    assert minimum == frozen["minimum_cleared_shifted_coefficient"] == 0
    assert zeros == frozen["zero_coefficient_count"] == 25
    assert digest == frozen["ordered_coefficient_sha256"]
    assert per_order == frozen["per_order"]
    return {
        "tree_count": trees_total,
        "marked_tree_count": marked_total,
        "coefficient_checks": 5 * marked_total,
        "minimum": minimum,
        "zero_count": zeros,
        "ordered_coefficient_sha256": digest,
    }


def is_independent(graph: nx.Graph, vertices: tuple[int, ...]) -> bool:
    chosen = set(vertices)
    return all(not (set(graph.neighbors(vertex)) & chosen) for vertex in vertices)


def literal_rank_three(graph: nx.Graph) -> tuple[int, int]:
    vertices = list(graph.nodes())
    independent = sum(
        is_independent(graph, chosen)
        for chosen in itertools.combinations(vertices, 3)
    )
    slides = 0
    for u, v in graph.edges():
        forbidden = {u, v, *graph.neighbors(u), *graph.neighbors(v)}
        residual = [vertex for vertex in vertices if vertex not in forbidden]
        slides += sum(
            not graph.has_edge(a, b) for a, b in itertools.combinations(residual, 2)
        )
    return independent, slides


def terminal_extension(base: nx.Graph, root: int, bundle: int) -> nx.Graph:
    graph = base.copy()
    next_vertex = max(graph.nodes(), default=-1) + 1
    support = next_vertex
    graph.add_edge(root, support)
    for offset in range(bundle):
        graph.add_edge(support, next_vertex + 1 + offset)
    return graph


def literal_replay(
    cross: sp.Expr, symbols: tuple[sp.Symbol, ...]
) -> dict[str, object]:
    # Clear the harmless denominator 12 and evaluate the multivariate
    # polynomial with Python integers, avoiding floating-point lambdify.
    cleared = sp.Poly(sp.expand(12 * cross), *symbols)
    assert all(value.is_Integer for value in cleared.coeffs())
    terms = [(monomial, int(value)) for monomial, value in cleared.terms()]

    def exact_cleared_value(values: tuple[int, ...]) -> int:
        return sum(
            coefficient
            * sp.prod(value**power for value, power in zip(values, monomial))
            for monomial, coefficient in terms
        )

    cells = 0
    for order in range(1, 10):
        trees = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        for tree in trees:
            degrees = dict(tree.degree())
            wedges, four_subtrees = graph_statistics(tree)
            for root in sorted(tree.nodes()):
                neighbor_excess = sum(
                    degrees[vertex] - 1 for vertex in tree.neighbors(root)
                )
                for bundle in range(1, 5):
                    terminal = terminal_extension(tree, root, bundle)
                    isolated = nx.disjoint_union(tree, nx.empty_graph(bundle))
                    it, st = literal_rank_three(terminal)
                    iq, sq = literal_rank_three(isolated)
                    literal_cross = st * iq - sq * it
                    cleared_formula_cross = exact_cleared_value((
                        order,
                        degrees[root],
                        bundle,
                        wedges,
                        four_subtrees,
                        neighbor_excess,
                    ))
                    assert 12 * literal_cross == cleared_formula_cross >= 0
                    cells += 1
    return {"orders": [1, 9], "bundle_sizes": [1, 4], "literal_cross_checks": cells}


def nonnegative_power_polynomial(expression: sp.Expr, *variables: sp.Symbol) -> bool:
    coefficients = sp.Poly(sp.expand(expression), *variables).coeffs()
    return bool(coefficients) and all(value.is_nonnegative for value in coefficients)


def bernstein_coefficients(
    expression: sp.Expr,
    variable: sp.Symbol,
    left: sp.Expr,
    right: sp.Expr,
    degree: int | None = None,
) -> list[sp.Expr]:
    y = sp.symbols("y", real=True)
    power = sp.Poly(sp.expand(expression.subs(variable, left + (right - left) * y)), y)
    source_degree = power.degree()
    target_degree = source_degree if degree is None else degree
    assert target_degree >= source_degree
    ascending = [power.coeff_monomial(y**rank) for rank in range(source_degree + 1)]
    return [
        sp.factor(sum(
            ascending[rank]
            * sp.binomial(index, rank)
            / sp.binomial(target_degree, rank)
            for rank in range(min(index, source_degree) + 1)
        ))
        for index in range(target_degree + 1)
    ]


def analytic_reconstruction(
    generic_cross: sp.Expr,
    symbols: tuple[sp.Symbol, ...],
    primary: dict[str, object],
) -> dict[str, object]:
    n, degree, bundle, wedges, four_subtrees, neighbor_excess = symbols
    B2, B3, X = sp.symbols("B2 B3 X", integer=True, nonnegative=True)
    extra = sp.symbols("extra", integer=True, nonnegative=True)
    r, s = sp.symbols("r s", integer=True, nonnegative=True)

    # Wedges=n-2+B2 and four-subtrees=n-3+B2+B3+X.
    cross = sp.expand(generic_cross.subs({
        wedges: n - 2 + B2,
        four_subtrees: n - 3 + B2 + extra,
    }))
    extra_slope = sp.factor(sp.diff(cross, extra))
    expected_extra_slope = -sp.Rational(3, 2) * (
        2 * degree + n**2 - 5 * n + 4
    )
    assert sp.expand(extra_slope - expected_extra_slope) == 0
    assert nonnegative_power_polynomial(
        (-extra_slope).subs({n: 15 + r, degree: 1}), r
    )

    neighbor_slope = sp.factor(sp.diff(cross, neighbor_excess))
    assert nonnegative_power_polynomial(
        neighbor_slope.subs({n: 15 + r, bundle: 1 + s}), r, s, B2
    )

    # The pinned Zagreb theorem and the termwise shadow
    # 3B3<= (n-4)B2 imply B3+X <= (n-4)B2/3.
    zagreb_X_upper = (2 * (n - 4) * B2 - 6 * B3) / 7
    combined = sp.factor(B3 + zagreb_X_upper)
    combined_upper = sp.factor(combined.subs(B3, (n - 4) * B2 / 3))
    assert combined_upper == (n - 4) * B2 / 3

    lower = sp.expand(cross.subs({
        extra: combined_upper,
        neighbor_excess: 0,
    }))
    lower_in_B2 = sp.Poly(lower, B2)
    assert lower_in_B2.degree() == 2 and lower_in_B2.LC() == -2

    B2_low = falling_choose(degree - 1, 2)
    B2_high = B2_low + falling_choose(n - degree - 1, 2)
    endpoints = {
        "low": sp.expand(lower.subs(B2, B2_low)),
        "high": sp.expand(lower.subs(B2, B2_high)),
    }
    frozen_endpoints = primary["analytic_certificate"]["endpoint_certificates"]
    audit_endpoints: dict[str, object] = {}

    for name, endpoint in endpoints.items():
        shifted = sp.Poly(sp.expand(endpoint.subs(bundle, s + 1)), s)
        assert shifted.degree() == 4
        records = []
        frozen_records = frozen_endpoints[name]["coefficient_certificates"]
        for power in range(5):
            coefficient = shifted.coeff_monomial(s**power)
            if name == "low" and power == 0:
                assert frozen_records[power]["method"] == "centered-square-negative-discriminant"
                records.append({"power": power, "method": "centered-square-negative-discriminant"})
                continue
            elevated_degree = 6 if name == "high" and power == 0 else None
            bernstein = bernstein_coefficients(
                coefficient,
                degree,
                1,
                n - 1,
                elevated_degree,
            )
            shifted_bernstein = [
                sp.Poly(sp.expand(value.subs(n, 15 + r)), r) for value in bernstein
            ]
            assert all(
                all(coefficient_value.is_nonnegative for coefficient_value in value.coeffs())
                for value in shifted_bernstein
            )
            stream = hashlib.sha256()
            for value in bernstein:
                stream.update((sp.srepr(value) + "\n").encode())
            digest = stream.hexdigest().upper()
            frozen_record = frozen_records[power]
            assert frozen_record["method"] == "bernstein-on-d-interval"
            assert len(bernstein) - 1 == frozen_record["bernstein_degree"]
            assert digest == frozen_record["bernstein_sha256"]
            records.append({
                "power": power,
                "bernstein_degree": len(bernstein) - 1,
                "coefficient_count": len(bernstein),
                "sha256": digest,
            })
        audit_endpoints[name] = records

    # Independently reconstruct the exceptional low-endpoint, t=1 certificate.
    centered_variable = sp.symbols("centered_variable", real=True)
    low_constant = sp.expand(endpoints["low"].subs(bundle, 1))
    centered = sp.factor(low_constant.subs(degree, (n + centered_variable) / 2))
    numerator, denominator = sp.together(centered).as_numer_denom()
    assert denominator == 192
    centered_poly = sp.Poly(numerator, centered_variable)
    square = 3 * centered_variable**2 * (centered_variable + 4) ** 2
    A = sp.factor(centered_poly.coeff_monomial(centered_variable**2) - 48)
    B = sp.factor(centered_poly.coeff_monomial(centered_variable))
    C = sp.factor(centered_poly.coeff_monomial(1))
    assert sp.expand(numerator - square - A * centered_variable**2 - B * centered_variable - C) == 0
    assert sp.expand(A - 2 * (8 * n**3 - 57 * n**2 + 148 * n - 186)) == 0
    discriminant = sp.factor(B**2 - 4 * A * C)
    negative_factor = sp.factor(-discriminant / 8)
    assert nonnegative_power_polynomial(A.subs(n, 15 + r), r)
    assert nonnegative_power_polynomial(negative_factor.subs(n, 15 + r), r)
    assert A.subs(n, 15) > 0 and negative_factor.subs(n, 15) > 0
    frozen_centered = frozen_endpoints["low"]["centered_certificate"]
    assert str(A) == frozen_centered["quadratic_a"]
    assert str(discriminant) == frozen_centered["quadratic_discriminant"]

    return {
        "orders": "n>=15",
        "extra_slope": str(extra_slope),
        "neighbor_slope": str(neighbor_slope),
        "zagreb_and_shadow_upper": str(combined_upper),
        "B2_interval": [str(B2_low), str(B2_high)],
        "concave_B2_leading_coefficient": str(lower_in_B2.LC()),
        "endpoint_certificate_replay": audit_endpoints,
        "centered_low_endpoint": {
            "quadratic_a": str(A),
            "discriminant": str(discriminant),
            "negative_discriminant_factor": str(negative_factor),
        },
    }


def main() -> None:
    assert sha256(PRIMARY_SOURCE) == EXPECTED_PRIMARY_SOURCE
    assert sha256(PRIMARY_REPORT) == EXPECTED_PRIMARY_REPORT
    observed_dependencies = {
        name: sha256(HERE / name) for name in DEPENDENCIES
    }
    assert observed_dependencies == DEPENDENCIES
    primary = json.loads(PRIMARY_REPORT.read_text(encoding="utf-8"))
    assert primary["status"] == EXPECTED_PRIMARY_STATUS
    assert primary["pinned_inputs"] == DEPENDENCIES

    cross, symbols = reconstruct_cross()
    analytic = analytic_reconstruction(cross, symbols, primary)
    finite = complete_finite_replay(cross, symbols, primary)
    literal = literal_replay(cross, symbols)

    report = {
        "status": "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_ANCHOR_ORDERING_AUDIT",
        "claim": primary["claim"],
        "frozen_primary": {
            "source": PRIMARY_SOURCE.name,
            "source_sha256": EXPECTED_PRIMARY_SOURCE,
            "report": PRIMARY_REPORT.name,
            "report_sha256": EXPECTED_PRIMARY_REPORT,
            "status": primary["status"],
        },
        "frozen_dependencies": {
            name: {
                "expected_sha256": DEPENDENCIES[name],
                "observed_sha256": observed_dependencies[name],
            }
            for name in DEPENDENCIES
        },
        "independent_reconstruction": {
            "cross": str(sp.factor(cross)),
            "finite": finite,
            "literal": literal,
            "analytic": analytic,
        },
        "scope": (
            "This independently certifies only terminal rank-three anchor "
            "ordering.  The target-rank included-self-slack payment, the full "
            "q3 envelope, and Erdos Problem 993 are not proved here."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps({"finite": finite, "literal": literal}, indent=2))
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
