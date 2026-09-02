#!/usr/bin/env python3
"""Independent, fail-closed audit of terminal-q3 Newton degree m=2, j>=4.

This file deliberately does not import the producer.  It rebuilds the
binomial-product algebra, the two-parameter endpoint reduction, and every
integer-cone certificate.  It also realizes the prescribed-root incidence
injection on every rooted forest in the NetworkX graph atlas (orders <= 7).

The atlas computation is a finite sanity audit of the injection.  The
all-order content is the explicit injection and the symbolic positivity
certificate; the script never promotes the atlas check into a proof.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "terminal_q3_low_newton_m2_j4plus_independent_audit_20260829.json"
PINS = {
    "prove_terminal_q3_low_newton_m2_j4plus_agent.py":
        "15D2DDA0571B27B752774C2C55807DE54E146C676DFE2BB0BB3660C258CF7E65",
    "terminal_q3_low_newton_m2_j4plus_exact_agent_20260829.json":
        "7DF40F60CAD088D731B7D30E6246E0FF542359A128578AE328D3EBC25C3152A4",
    "ROOTED_FOREST_EXTENSION_FLOOR_2026-08-28.md":
        "8AA07C316270045F9CBFCA2B5A04E04994100DCF87F02EB99B84A61080A1458E",
    "audit_terminal_q3_low_newton_adversarial_agent.py":
        "F009D46E8D3E30C26A9B1E3B30441526F108029DD3891DA14B268D9916650B4D",
    "terminal_q3_low_newton_adversarial_independent_20260829.json":
        "A8C9D806F00551EA6C2433B4B8180CF1738D6814E1FF8CAD20173E0A9F2B0836",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def binomial_product(left: int, right: int, degree: int) -> sp.Integer:
    """Coefficient of C(t-1,degree) in C(t-1,left)C(t-1,right)."""
    if degree < max(left, right) or degree > left + right:
        return sp.Integer(0)
    return sp.factorial(degree) // (
        sp.factorial(degree - left)
        * sp.factorial(degree - right)
        * sp.factorial(left + right - degree)
    )


def strictly_positive_poly(expr: sp.Expr, variables: tuple[sp.Symbol, ...]) -> dict[str, object]:
    poly = sp.Poly(sp.expand(expr), *variables)
    coefficients = poly.coeffs()
    assert coefficients
    assert all(value > 0 for value in coefficients), (variables, poly)
    return {
        "degree": poly.total_degree(),
        "term_count": len(poly.terms()),
        "minimum_coefficient": str(min(coefficients)),
        "coefficient_sha256": hashlib.sha256(
            "|".join(str(value) for value in coefficients).encode("ascii")
        ).hexdigest().upper(),
    }


def positive_cone(expr: sp.Expr, j: sp.Symbol, r: sp.Symbol) -> dict[str, object]:
    """Cover r>=1, j>=4, j+r>=15 by a high cone and ten strips."""
    k, q = sp.symbols("k q", integer=True, nonnegative=True)
    numerator, denominator = sp.together(expr).as_numer_denom()
    denominator = sp.factor(denominator)

    # Every factor in the denominators used here is positive for r>=1,j>=4.
    # A coefficient check in r is stronger than a point sample for this form.
    denominator_poly = sp.Poly(sp.expand(denominator), r)
    assert all(value >= 0 for value in denominator_poly.coeffs())
    assert denominator.subs(r, 1) > 0

    high = strictly_positive_poly(
        numerator.subs({j: 4 + k, r: 11 + q}), (k, q)
    )
    strips: list[dict[str, object]] = []
    for fixed_r in range(1, 11):
        # j+r>=15, so j=15-r+q on this strip.
        certificate = strictly_positive_poly(
            numerator.subs({r: fixed_r, j: 15 - fixed_r + q}), (q,)
        )
        strips.append({"r": fixed_r, "minimum_j": 15 - fixed_r, **certificate})
    return {"denominator": str(denominator), "high_cone": high, "strips": strips}


def positive_r_zero(expr: sp.Expr, j: sp.Symbol, r: sp.Symbol) -> dict[str, object]:
    q = sp.symbols("q", integer=True, nonnegative=True)
    numerator, denominator = sp.together(expr.subs({r: 0, j: 15 + q})).as_numer_denom()
    assert denominator > 0
    return {"denominator": str(denominator), **strictly_positive_poly(numerator, (q,))}


def independent_sets(graph: nx.Graph) -> list[tuple[int, ...]]:
    nodes = sorted(graph.nodes())
    output: list[tuple[int, ...]] = []
    for size in range(len(nodes) + 1):
        for selected in itertools.combinations(nodes, size):
            chosen = set(selected)
            if all(not (u in chosen and v in chosen) for u, v in graph.edges()):
                output.append(selected)
    return output


def rooted_orientation(
    graph: nx.Graph, roots: tuple[int, ...]
) -> tuple[dict[int, int | None], dict[int, tuple[int, ...]]]:
    parent: dict[int, int | None] = {}
    children: dict[int, list[int]] = {vertex: [] for vertex in graph.nodes()}
    for root in roots:
        parent[root] = None
        queue = [root]
        while queue:
            vertex = queue.pop(0)
            for neighbor in sorted(graph.neighbors(vertex)):
                if neighbor == parent[vertex]:
                    continue
                assert neighbor not in parent
                parent[neighbor] = vertex
                children[vertex].append(neighbor)
                queue.append(neighbor)
    assert len(parent) == graph.number_of_nodes()
    return parent, {v: tuple(sorted(values)) for v, values in children.items()}


def audit_one_rooting(graph: nx.Graph, roots: tuple[int, ...]) -> dict[str, int]:
    parent, children = rooted_orientation(graph, roots)
    root_set = set(roots)
    all_independent = independent_sets(graph)
    by_rank: dict[int, list[tuple[int, ...]]] = {}
    for selected in all_independent:
        by_rank.setdefault(len(selected), []).append(selected)

    rank_audits = 0
    masks_audited = 0
    mapped_downward = 0
    for rank, sets in by_rank.items():
        rank_audits += 1
        b = len(sets)
        h = sum(not (set(selected) & root_set) for selected in sets)
        up_count = 0
        down_count = 0
        bad_extensions = 0
        degree_one_extensions = 0
        images: dict[tuple[tuple[int, ...], int, int], tuple[tuple[int, ...], int, int]] = {}

        for selected_tuple in sets:
            masks_audited += 1
            selected = set(selected_tuple)
            upward = {
                (selected_tuple, vertex, parent[vertex])
                for vertex in selected
                if parent[vertex] is not None
            }
            up_count += len(upward)

            for upper in sorted(selected):
                for lower in children[upper]:
                    assert lower not in selected
                    down_count += 1
                    selected_children = [z for z in children[lower] if z in selected]
                    source = (selected_tuple, upper, lower)
                    if not selected_children:
                        image_set = tuple(sorted((selected - {upper}) | {lower}))
                        image = (image_set, lower, upper)
                    else:
                        least_child = min(selected_children)
                        image = (selected_tuple, least_child, lower)
                    # The constructed image must be an upward selected incidence,
                    # and distinct downward incidences must have distinct images.
                    image_selected, image_vertex, image_parent = image
                    assert parent[image_vertex] == image_parent
                    assert image_vertex in image_selected
                    assert all(
                        not (u in image_selected and v in image_selected)
                        for u, v in graph.edges()
                    )
                    assert image not in images, (graph.edges(), roots, image, images[image], source)
                    images[image] = source
                    mapped_downward += 1

            for outside in set(graph.nodes()) - selected:
                neighbors = sum(neighbor in selected for neighbor in graph.neighbors(outside))
                if neighbors:
                    bad_extensions += 1
                if neighbors == 1:
                    degree_one_extensions += 1

        # The injection just audited proves down<=up.  The final inequality
        # follows because every independent set not avoiding all roots has at
        # least one selected root.
        assert down_count <= up_count
        assert up_count <= (rank - 1) * b + h if rank else up_count == 0
        degree_sum = up_count + down_count
        assert bad_extensions <= degree_sum

        # Every one-edge (rank+1)-set has exactly two endpoint deletions.
        one_edge_sets = 0
        for union in itertools.combinations(sorted(graph.nodes()), rank + 1):
            induced_edges = sum(u in union and v in union for u, v in graph.edges())
            one_edge_sets += induced_edges == 1
        assert degree_one_extensions == 2 * one_edge_sets

        # Exact extension double count.
        next_count = len(by_rank.get(rank + 1, []))
        assert (graph.number_of_nodes() - rank) * b == (rank + 1) * next_count + bad_extensions

    return {
        "rank_audits": rank_audits,
        "independent_masks_with_rooting": masks_audited,
        "mapped_downward_incidences": mapped_downward,
    }


def literal_forest_audit() -> dict[str, int]:
    totals = {
        "forests": 0,
        "rootings": 0,
        "rank_audits": 0,
        "independent_masks_with_rooting": 0,
        "mapped_downward_incidences": 0,
    }
    for graph in nx.graph_atlas_g():
        if graph.number_of_nodes() == 0 or not nx.is_forest(graph):
            continue
        totals["forests"] += 1
        components = [tuple(sorted(component)) for component in nx.connected_components(graph)]
        for roots in itertools.product(*components):
            totals["rootings"] += 1
            result = audit_one_rooting(graph, tuple(roots))
            for key, value in result.items():
                totals[key] += value
    return totals


def symbolic_audit(producer: dict[str, object]) -> dict[str, object]:
    N, j, r, a, b, e, W, y = sp.symbols(
        "N j r a b e W y", nonnegative=True
    )

    # Rebuild the three coefficients of P from the tree triple identity.
    p0 = sp.expand(N * (N - 1) * (N + 1) / 6 - N * (N - 1) / 2 + W)
    p1 = (N**2 + N + 2) / 2
    p2 = N + 2
    P = (p0, p1, p2)

    # Lower Q coefficient by coefficient.  Positive c/R pieces are retained
    # only where their exact or lower values are known; every omitted piece
    # has a nonnegative multiplier.  The adverse e pieces are left exact.
    q0 = (j + 1) * b * a - 3 * e * (p0 + a)
    q1 = (
        (j + 1) * b * (a + N**2 - 2 * W)
        - 3 * e * p1
        - 3 * b * (p0 + a + p1)
    )
    q2 = (j + 1) * b * N - 3 * e * p2 - 6 * b * (p1 + p2)
    Q = (q0, q1, q2)

    pq2 = sp.expand(sum(
        binomial_product(left, right, 2) * P[left] * Q[right]
        for left in range(3)
        for right in range(3)
    ))
    nonzero_kernel = {
        (left, right): int(binomial_product(left, right, 2))
        for left in range(3)
        for right in range(3)
        if binomial_product(left, right, 2)
    }
    assert nonzero_kernel == {
        (0, 2): 1, (1, 1): 2, (1, 2): 2,
        (2, 0): 1, (2, 1): 2, (2, 2): 1,
    }

    # e has a strictly adverse sign.  Thus e/b<=j+2y may be substituted in
    # the lower bound without reversing the inequality.
    adverse_e = sp.factor(-sp.diff(pq2, e))
    assert all(value > 0 for value in sp.Poly(adverse_e, N, W, a).coeffs())
    remainder_over_b = sp.factor(pq2.subs(e, b * (j + 2 * y)) / b)

    # Anchor bounds A1/a and A2/a, preserving the W correlation in A1.
    A1 = sp.expand(p0 + N + 2 + 2 * W)
    A2 = N**2 + 3 * N + 8
    S1 = j / (r + 1)
    S2 = j * (j - 1) / ((r + 1) * (r + 2))
    H1 = j * y / r
    U0_extension = (N - 2 * j + 3 + (j - 1) * y) / (j + 1)

    # Independently sum the retained AU kernel terms:
    # [AU]_2=A0U2+2A1U1+2A1U2+A2U0+2A2U1+A2U2.
    # U0/b>=U0_extension+H1,
    # U1/b>=1+S1+H1, U2/b>=S1+S2.
    U0 = U0_extension + H1
    U1 = 1 + S1 + H1
    U2 = S1 + S2
    retained = sp.expand(2 * A1 * (U1 + U2) + A2 * (U0 + 2 * U1 + U2))

    normalized = sp.factor((j + 1) * a * retained + remainder_over_b)
    normalized = sp.factor(normalized.subs(N, j + r))
    assert sp.Poly(normalized, a).degree() == 1
    slope = sp.factor(sp.diff(normalized, a))
    a_floor = (N - 1) * (N - 2) / 2
    floor_gap = sp.factor(normalized.subs(a, a_floor.subs(N, j + r)))
    for expression in (slope, floor_gap):
        assert sp.Poly(expression, W).degree() <= 1
        assert sp.Poly(expression, y).degree() <= 1

    W_endpoints = {
        "path": (j + r) - 1,
        "star": (j + r) * (j + r - 1) / 2,
    }
    corners: dict[str, object] = {"slope": {}, "floor_gap": {}}
    for y_value, (W_name, W_value) in itertools.product((0, 1), W_endpoints.items()):
        name = f"y{y_value}_{W_name}"
        corners["slope"][name] = positive_cone(
            slope.subs({y: y_value, W: W_value}), j, r
        )
        corners["floor_gap"][name] = positive_cone(
            floor_gap.subs({y: y_value, W: W_value}), j, r
        )

    # r=0 means H has order <j, so h_j=0 and y=0.  No H shadow is used.
    retained_r0 = sp.expand(
        2 * A1 * ((1 + S1) + (S1 + S2))
        + A2 * (U0_extension.subs(y, 0) + 2 * (1 + S1) + (S1 + S2))
    )
    normalized_r0 = sp.factor(
        ((j + 1) * a * retained_r0 + remainder_over_b.subs(y, 0)).subs(N, j + r)
    )
    slope_r0 = sp.factor(sp.diff(normalized_r0, a))
    floor_r0 = sp.factor(normalized_r0.subs(a, a_floor.subs(N, j + r)))
    r0: dict[str, object] = {"slope": {}, "floor_gap": {}}
    for W_name, W_value in W_endpoints.items():
        r0["slope"][W_name] = positive_r_zero(slope_r0.subs(W, W_value), j, r)
        r0["floor_gap"][W_name] = positive_r_zero(floor_r0.subs(W, W_value), j, r)

    # Cross-check only after the independent reconstruction has succeeded.
    algebra = producer["exact_algebra"]
    parse_locals = {"N": N, "j": j, "r": r, "a": a, "b": b,
                    "e0": e, "W": W, "y": y}
    parse = lambda value: sp.sympify(value, locals=parse_locals)
    assert sp.expand(parse(algebra["p0"]) - p0) == 0
    assert sp.expand(parse(algebra["p1"]) - p1) == 0
    assert sp.expand(parse(algebra["p2"]) - p2) == 0
    for observed, rebuilt in zip(algebra["Q_lower"], Q):
        assert sp.expand(parse(observed) - rebuilt) == 0
    assert sp.expand(parse(algebra["PQ2_lower"]) - pq2) == 0
    assert sp.expand(parse(algebra["adverse_e_derivative"]) - adverse_e) == 0
    assert sp.expand(parse(producer["anchor_bounds"]["A1_over_a"]) - A1) == 0
    assert sp.expand(parse(producer["anchor_bounds"]["A2_over_a"]) - A2) == 0
    assert sp.expand(parse(producer["retained_AU2_over_ab"]) - retained) == 0

    return {
        "p0": str(p0),
        "Q_lower": [str(sp.factor(value)) for value in Q],
        "PQ2_lower": str(sp.factor(pq2)),
        "adverse_e_derivative": str(adverse_e),
        "A1_over_a": str(A1),
        "A2_over_a": str(A2),
        "retained_AU2_over_ab": str(retained),
        "positive_corners_r_positive": corners,
        "positive_endpoints_r_zero": r0,
    }


def main() -> None:
    observed_pins = {name: sha256(HERE / name) for name in PINS}
    assert observed_pins == PINS
    producer = json.loads(
        (HERE / "terminal_q3_low_newton_m2_j4plus_exact_agent_20260829.json")
        .read_text(encoding="utf-8")
    )
    assert producer["status"] == (
        "PASS_EXACT_TREE_BASE_N15_PLUS_TERMINAL_Q3_LOW_NEWTON_M2_J4_PLUS"
    )
    finite = json.loads(
        (HERE / "terminal_q3_low_newton_adversarial_independent_20260829.json")
        .read_text(encoding="utf-8")
    )
    assert finite["newton_degrees"]["2"]["negative_coefficients"] == 0
    assert int(finite["newton_degrees"]["2"]["minimum_coefficient"]) > 0

    symbolic = symbolic_audit(producer)
    literal = literal_forest_audit()
    assert literal["forests"] > 0 and literal["mapped_downward_incidences"] > 0

    report = {
        "schema": "terminal-q3-low-newton-m2-j4plus-independent-audit-v1",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_EXACT_TERMINAL_Q3_LOW_NEWTON_M2_J4_PLUS_AUDIT",
        "claim": (
            "The producer's all-order m=2,j>=4 lower-bound chain, endpoint "
            "reduction, integer-cone cover, r=0 edge case, and finite n=15 "
            "boundary have been independently rebuilt and pass exactly."
        ),
        "bound_direction_audit": {
            "adverse_variable": "-d([PQ]_2)/d(e0)>0, so the upper e0 bound lowers the margin",
            "incidence": "downward incidences inject into upward incidences",
            "refined_degree_sum": "D_j<=2[(j-1)b+h_j]",
            "one_edge_pairs": "2z_j<=D_j",
            "combined_e0": "e0/b<=j+2(h_j/b)",
            "extension": "(j+1)f_(j+1)=(N-j)b-C_j with C_j<=D_j",
            "a_endpoint": "positive a-slope plus a>=C(N-1,2)",
            "W_y_endpoints": "bilinear interpolation on [N-1,C(N,2)]x[0,1]",
            "r_zero": "r=0 forces h_j=0; no division by r is used",
        },
        "symbolic_reconstruction": symbolic,
        "literal_injection_audit_not_proof": {
            **literal,
            "scope": "all unlabeled atlas forests of orders 1..7, every component-root choice and rank",
        },
        "finite_boundary": {
            "scope": finite["coverage"]["finite"],
            "m2_negative_coefficients": 0,
            "m2_minimum_coefficient": finite["newton_degrees"]["2"]["minimum_coefficient"],
        },
        "pins": observed_pins,
        "scope": (
            "This is an independent audit of Newton degree m=2 for j>=4. "
            "The atlas run is finite evidence only; the explicit injection and "
            "symbolic certificates carry the all-order argument. It does not "
            "cover j=3, m=0,1, or the complete conjecture."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(literal, sort_keys=True))
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
