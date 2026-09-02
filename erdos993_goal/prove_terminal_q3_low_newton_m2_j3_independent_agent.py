#!/usr/bin/env python3
"""Independent exact proof of terminal Newton m=2 at target j=3.

The proof reconstructs the coefficient in rooted tree motif coordinates,
uses the pinned Zagreb inequality only through an explicit connected-four-set
upper bound, and reduces the remaining polynomial to four Bernstein-positive
endpoint certificates.  A literal small-tree subset audit checks every motif
identity against the original terminal margin.
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
OUTPUT = HERE / "terminal_q3_low_newton_m2_j3_exact_independent_20260829.json"
PINS = {
    "verify_tree_rank45_path_ratio.py": (
        "AB5D6E395A13BE66276D45C25EB2F869B2410B2445F78A45F4A83648CE1CA86C"
    ),
    "TREE_RANK45_PATH_RATIO_THEOREM_2026-07-28.md": (
        "7FE34CDC7F02442ABB9665A0FDC093B78331C6B93CC0793F60B06259BB7B1528"
    ),
    "audit_terminal_q3_low_newton_adversarial_agent.py": (
        "F009D46E8D3E30C26A9B1E3B30441526F108029DD3891DA14B268D9916650B4D"
    ),
    "terminal_q3_low_newton_adversarial_independent_20260829.json": (
        "A8C9D806F00551EA6C2433B4B8180CF1738D6814E1FF8CAD20173E0A9F2B0836"
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank: int):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def independent3(vertices, edges, wedges):
    return choose(vertices, 3) - edges * (vertices - 2) + wedges


def independent4(vertices, edges, wedges, connected4):
    return (
        choose(vertices, 4)
        - edges * choose(vertices - 2, 2)
        + wedges * (vertices - 4)
        + choose(edges, 2)
        - connected4
    )


def one_edge3(vertices, edges, wedges):
    return edges * (vertices - 2) - 2 * wedges


def one_edge4(vertices, edges, wedges, connected4):
    matchings = choose(edges, 2) - wedges
    return (
        edges * choose(vertices - 2, 2)
        - 2 * (wedges * (vertices - 3) + matchings)
        + 3 * connected4
    )


def kappa(left: int, right: int, union: int):
    if not max(left, right) <= union <= left + right:
        return sp.Integer(0)
    return sp.factorial(union) / (
        sp.factorial(union - left)
        * sp.factorial(union - right)
        * sp.factorial(left + right - union)
    )


def product_coefficient(left, right, degree: int):
    return sp.expand(sum(
        kappa(p, q, degree) * left[p] * right[q]
        for p in range(len(left))
        for q in range(len(right))
        if max(p, q) <= degree <= p + q
    ))


def bernstein_coefficients(expression, variable, left, right):
    parameter = sp.symbols("bernstein_parameter")
    power = sp.Poly(
        sp.expand(expression.subs(variable, left + (right - left) * parameter)),
        parameter,
    )
    degree = power.degree()
    ascending = [power.coeff_monomial(parameter**rank) for rank in range(degree + 1)]
    return [sp.factor(sum(
        ascending[rank]
        * sp.binomial(index, rank)
        / sp.binomial(degree, rank)
        for rank in range(index + 1)
    )) for index in range(degree + 1)]


def symbolic_margin():
    N, d, W, V, X, B, Y = sp.symbols(
        "N d W V X B Y", integer=True, nonnegative=True
    )

    # Whole tree G: N+1 vertices and N edges.
    i2_g = choose(N + 1, 2) - N
    i3_g = independent3(N + 1, N, W)
    i4_g = independent4(N + 1, N, W, V)
    p0 = sp.expand(i3_g + i2_g)
    p1 = (N**2 + N + 2) / 2
    p2 = N + 2
    P = [p0, p1, p2]
    s3_g = one_edge3(N + 1, N, W)
    s4_g = one_edge4(N + 1, N, W, V)
    R = [sp.expand(s4_g + s3_g), sp.expand(s3_g + N), N]

    # Rooted coordinates.  X=sum_{v~w}(deg(v)-1),
    # B=sum_{v~w}binom(deg(v)-1,2), and
    # Y=sum_{dist(w,u)=2}(deg(u)-1).
    edges_f = N - d
    wedges_f = W - choose(d, 2) - X
    root_connected4 = choose(d, 3) + B + (d - 1) * X + Y
    connected4_f = V - root_connected4
    a = sp.expand(choose(N, 2) - edges_f)
    b = sp.expand(independent3(N, edges_f, wedges_f))
    z2 = sp.expand(one_edge3(N, edges_f, wedges_f))
    z3 = sp.expand(one_edge4(N, edges_f, wedges_f, connected4_f))

    vertices_h = N - d
    edges_h = N - d - X
    wedges_h = W - choose(d, 2) - B - X - Y
    h2 = sp.expand(choose(vertices_h, 2) - edges_h)
    h3 = sp.expand(independent3(vertices_h, edges_h, wedges_h))
    c0 = sp.expand(a + z2 + h2)
    e0 = sp.expand(b + z3 + h3)
    c = [c0, a]
    e = [e0, b]

    # At target j=3, U=(i4+i3, i3+i2, i2+i1).
    U = [sp.expand(i4_g + i3_g), p0, p1]
    A = [
        sp.expand(product_coefficient(P, c, degree) - a * R[degree])
        for degree in range(3)
    ]
    Pa = [P[0] + a, P[1], P[2]]
    Q = [
        sp.expand(
            4 * b * ((c[degree] if degree < 2 else 0) + R[degree])
            - 3 * product_coefficient(Pa, e, degree)
        )
        for degree in range(3)
    ]
    delta2 = sp.factor(
        4 * a * product_coefficient(A, U, 2)
        + a * product_coefficient(P, Q, 2)
    )
    return delta2, a, (N, d, W, V, X, B, Y)


def direct_rows(graph: nx.Graph):
    vertices = list(graph)
    zero = [0] * (len(vertices) + 1)
    one = [0] * (len(vertices) + 1)
    for rank in range(len(vertices) + 1):
        for subset in itertools.combinations(vertices, rank):
            edges = graph.subgraph(subset).number_of_edges()
            if edges == 0:
                zero[rank] += 1
            elif edges == 1:
                one[rank] += 1
    return zero, one


def with_isolates(row, rank: int, isolates: int) -> int:
    return sum(
        comb(isolates, used) * row[rank - used]
        for used in range(min(rank, isolates) + 1)
        if rank - used < len(row)
    )


def graph_coordinates(tree: nx.Graph, root: int):
    degrees = dict(tree.degree())
    d = degrees[root]
    W = sum(comb(value, 2) for value in degrees.values())
    V = sum(comb(value, 3) for value in degrees.values())
    V += sum(
        (degrees[left] - 1) * (degrees[right] - 1)
        for left, right in tree.edges()
    )
    neighbors = set(tree.neighbors(root))
    X = sum(degrees[vertex] - 1 for vertex in neighbors)
    B = sum(comb(degrees[vertex] - 1, 2) for vertex in neighbors)
    distance_two = {
        other
        for vertex in neighbors
        for other in tree.neighbors(vertex)
        if other != root
    }
    Y = sum(degrees[vertex] - 1 for vertex in distance_two)
    return len(tree) - 1, d, W, V, X, B, Y


def literal_audit(delta2, variables):
    trees = roots = subset_checks = 0
    stream = hashlib.sha256()
    for order in range(4, 10):
        for tree_index, tree in enumerate(nx.nonisomorphic_trees(order)):
            tree = nx.convert_node_labels_to_integers(tree, ordering="sorted")
            whole_zero, whole_one = direct_rows(tree)
            subset_checks += 2 ** order
            graph6 = nx.to_graph6_bytes(tree, header=False).decode().strip()
            trees += 1
            for root in tree:
                f = tree.copy()
                f.remove_node(root)
                h = tree.copy()
                h.remove_nodes_from({root, *tree.neighbors(root)})
                f_zero, f_one = direct_rows(f)
                h_zero, _ = direct_rows(h)
                subset_checks += 2 ** len(f) + 2 ** len(h)
                a = f_zero[2] if len(f_zero) > 2 else 0
                b = f_zero[3] if len(f_zero) > 3 else 0
                z2 = f_one[3] if len(f_one) > 3 else 0
                z3 = f_one[4] if len(f_one) > 4 else 0
                h2 = h_zero[2] if len(h_zero) > 2 else 0
                h3 = h_zero[3] if len(h_zero) > 3 else 0
                values = []
                for shift in range(3):
                    isolates = shift + 1
                    P = with_isolates(whole_zero, 3, isolates)
                    R = with_isolates(whole_one, 4, isolates)
                    U = with_isolates(whole_zero, 4, isolates)
                    c = z2 + h2 + isolates * a
                    e = z3 + h3 + isolates * b
                    M = 4 * b * c - 3 * a * e
                    A = P * c - a * R
                    slack = P * b - a * U
                    values.append(P * (P + a) * M - 4 * A * slack)
                literal_m2 = values[2] - 2 * values[1] + values[0]
                coordinates = graph_coordinates(tree, root)
                symbolic_value = sp.cancel(delta2.subs(dict(zip(variables, coordinates))))
                assert symbolic_value.is_Integer
                symbolic_m2 = int(symbolic_value)
                assert literal_m2 == symbolic_m2, (
                    order, tree_index, root, graph6, literal_m2, symbolic_m2
                )
                roots += 1
                stream.update(
                    f"{order}|{tree_index}|{root}|{graph6}|{literal_m2}\n".encode()
                )
    return {
        "orders": [4, 9],
        "trees": trees,
        "marked_roots": roots,
        "literal_subset_masks": subset_checks,
        "stream_sha256": stream.hexdigest().upper(),
    }


def main() -> None:
    observed = {name: sha256(HERE / name) for name in PINS}
    assert observed == PINS
    finite = json.loads(
        (HERE / "terminal_q3_low_newton_adversarial_independent_20260829.json")
        .read_text(encoding="utf-8")
    )
    assert finite["status"].startswith("PASS_EXACT_FINITE_AND_ADVERSARIAL")
    assert finite["coverage"]["finite"]["trees"] == 13188
    assert finite["newton_degrees"]["2"]["negative_coefficients"] == 0

    delta2, a, variables = symbolic_margin()
    N, d, W, V, X, B, Y = variables
    assert sp.expand(2 * a - (N**2 - 3 * N + 2 * d)) == 0
    _quotient_numerator, quotient_denominator = sp.cancel(delta2 / a).as_numer_denom()
    assert not quotient_denominator.free_symbols and quotient_denominator > 0

    # Direction of the connected-four substitution.
    v_bracket = sp.factor(-4 * sp.diff(delta2, V) / (2 * a))
    expected_v_bracket = (
        21 * N**4 + 85 * N**3 - 20 * N**2 * d + 140 * N**2
        - 4 * N * W + 48 * N * X + 24 * N * d**2 + 30 * N * d
        - 78 * N - 8 * W + 96 * X + 48 * d**2 + 236 * d + 252
    )
    assert sp.expand(v_bracket - expected_v_bracket) == 0
    # Use d<=N and W<=binom(N,2), and drop the remaining positive terms.
    v_floor_from_bounds = sp.expand(
        21 * N**4 + 85 * N**3 - 20 * N**3 + 140 * N**2
        - (4 * N + 8) * choose(N, 2) - 78 * N + 252
    )
    v_floor = 21 * N**4 + 63 * N**3 + 138 * N**2 - 74 * N + 252
    assert sp.expand(v_floor_from_bounds - v_floor) == 0
    r = sp.symbols("r", integer=True, nonnegative=True)
    assert all(
        coefficient > 0
        for coefficient in sp.Poly(sp.expand(v_floor.subs(N, 15 + r)), r).coeffs()
    )

    positive_root_slope = (
        5 * N**4 + 19 * N**3 + 46 * N**2 + 12 * N * W
        + 6 * N * d + 74 * N + 24 * W + 12 * d + 84
    )
    assert sp.expand(sp.diff(delta2, B) - 2 * a * positive_root_slope) == 0
    assert sp.expand(sp.diff(delta2, Y) - 2 * a * positive_root_slope) == 0

    # Pinned Zagreb: with beta=B2 and gamma=B3, the edge-correlation
    # excess chi obeys 7chi<=2(N-3)beta-6gamma.  Also
    # 3gamma<=(N-3)beta.  Hence gamma+chi<=(N-3)beta/3 and
    # V<=N-2+N*beta/3.
    beta, gamma, chi = sp.symbols(
        "beta gamma chi", integer=True, nonnegative=True
    )
    zagreb_gamma_plus_chi = sp.factor(
        gamma + (2 * (N - 3) * beta - 6 * gamma) / 7
    )
    assert sp.factor(
        zagreb_gamma_plus_chi.subs(gamma, (N - 3) * beta / 3)
        - (N - 3) * beta / 3
    ) == 0
    v_upper = N - 2 + N * beta / 3

    lower = sp.factor(
        delta2.subs({W: N - 1 + beta, V: v_upper, B: 0, Y: 0}) / a
    )
    x_poly = sp.Poly(lower, X)
    assert x_poly.degree() == 2
    assert sp.expand(x_poly.LC() + 12 * (N + 2)) == 0

    # X counts distance-two vertices, so 0<=X<=N-d.  Concavity reduces to
    # those two endpoints.  At either endpoint the beta polynomial is concave.
    beta_low = choose(d - 1, 2)
    beta_high = beta_low + choose(N - d, 2)
    endpoints = {
        "X_zero": sp.factor(lower.subs(X, 0)),
        "X_max": sp.factor(lower.subs(X, N - d)),
    }
    expected_beta_lc = 2 * (-26 * N**2 - 217 * N + 36 * d - 318) / 3
    beta_lc_upper = sp.factor(expected_beta_lc.subs(d, N))
    assert all(
        coefficient > 0
        for coefficient in sp.Poly(
            sp.expand((-beta_lc_upper).subs(N, 15 + r)), r
        ).coeffs()
    )
    corners = {}
    for x_name, endpoint in endpoints.items():
        beta_poly = sp.Poly(endpoint, beta)
        assert beta_poly.degree() == 2
        assert sp.expand(beta_poly.LC() - expected_beta_lc) == 0
        corners[f"{x_name}_beta_low"] = sp.factor(endpoint.subs(beta, beta_low))
        corners[f"{x_name}_beta_high"] = sp.factor(endpoint.subs(beta, beta_high))

    # Each corner is nonnegative on 1<=d<=N by its Bernstein expansion.
    bernstein_report = {}
    for name, corner in corners.items():
        coefficients = bernstein_coefficients(corner, d, 1, N)
        assert len(coefficients) == 6
        stream = hashlib.sha256()
        records = []
        for index, coefficient in enumerate(coefficients):
            shifted = sp.factor(coefficient.subs(N, 15 + r))
            numerator, denominator = sp.together(shifted).as_numer_denom()
            polynomial = sp.Poly(sp.expand(numerator), r)
            assert denominator > 0
            assert all(value >= 0 for value in polynomial.coeffs())
            assert polynomial.as_expr().subs(r, 0) > 0
            stream.update((sp.srepr(coefficient) + "\n").encode())
            records.append({
                "index": index,
                "degree_after_N15_shift": polynomial.degree(),
                "term_count": len(polynomial.terms()),
                "minimum_numerator_coefficient": str(min(polynomial.coeffs())),
                "positive_denominator": str(denominator),
            })
        bernstein_report[name] = {
            "degree": len(coefficients) - 1,
            "coefficient_sha256": stream.hexdigest().upper(),
            "coefficients": records,
        }

    literal = literal_audit(delta2, variables)
    report = {
        "schema": "terminal-q3-low-newton-m2-j3-exact-independent-v1",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M2_J3",
        "claim": (
            "Every supported terminal target j=3 cell has nonnegative Newton "
            "coefficient m=2. Motif/Bernstein analysis covers N=|F|>=15; "
            "the pinned exact tree census covers N<=14."
        ),
        "motif_coordinates": {
            "N": "|F|=|G|-1",
            "d": "degree of the marked root",
            "W": "sum_v binom(deg(v),2)",
            "V": "number of connected four-vertex subtrees",
            "X": "sum_{v~w}(deg(v)-1)",
            "B": "sum_{v~w}binom(deg(v)-1,2)",
            "Y": "sum_{dist(w,u)=2}(deg(u)-1)",
        },
        "exact_reduction": {
            "V_slope": "strictly negative for N>=15",
            "B_and_Y_slopes": "nonnegative",
            "V_upper": "N-2+N*beta/3, beta=W-(N-1)",
            "X_interval": "[0,N-d]",
            "X_quadratic_leading_coefficient": str(x_poly.LC()),
            "beta_interval": [str(beta_low), str(beta_high)],
            "beta_quadratic_leading_coefficient": str(expected_beta_lc),
            "four_corner_bernstein": bernstein_report,
        },
        "literal_identity_audit": literal,
        "finite_boundary": {
            "G_orders_through": 15,
            "unlabeled_trees": finite["coverage"]["finite"]["trees"],
            "m2_negative_coefficients": finite["newton_degrees"]["2"]["negative_coefficients"],
        },
        "pins": observed,
        "scope": (
            "This closes only target j=3 at Newton degree m=2. Targets j>=4, "
            "degrees m=0,1, the complete terminal payment, and Erdos Problem "
            "993 remain separate."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(f"literal_roots={literal['marked_roots']}")
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
