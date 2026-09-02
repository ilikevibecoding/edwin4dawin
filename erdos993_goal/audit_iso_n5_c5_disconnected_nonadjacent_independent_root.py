#!/usr/bin/env python3
"""Independent exact audit of the distinct-component C5 theorem.

This audit deliberately does not import the producer.  It rebuilds forest
independence rows with a rooted-tree dynamic program, enumerates every allowed
componentwise deletion through order twelve, reconstructs the five symbolic
Phi gaps, and checks the all-order bounds with a separately implemented exact
Bernstein conversion.  It also reconstructs the raw factorization and the
seven total-degree convolution rows.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
PRODUCER = HERE / "prove_iso_n5_c5_disconnected_nonadjacent_g1_nonadjacent.py"
PRODUCER_REPORT = HERE / "iso_n5_c5_disconnected_nonadjacent_exact_g1_nonadjacent_20260830.json"
OUTPUT = HERE / "iso_n5_c5_disconnected_nonadjacent_independent_audit_root_20260830.json"
EXPECTED_PRODUCER_SHA256 = "DD1112EC4A72A9DA18979084D03462AC0073E8C86927E3306142171E39134A05"
EXPECTED_REPORT_SHA256 = "51636F0BB3B599BCCF5251C0AAE8DD7D0C7689AFDFDC09E41A9B9312257A3BFD"
PRODUCER_MARKER = "PASS_EXACT_ISO_N5_C5_DISCONNECTED_NONADJACENT_G1_NONADJACENT"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N5_C5_DISCONNECTED_NONADJACENT_AUDIT_ROOT"
KNOWN_FOREST_COUNTS = {
    0: 1, 1: 1, 2: 2, 3: 3, 4: 6, 5: 10, 6: 20,
    7: 37, 8: 76, 9: 153, 10: 329, 11: 710, 12: 1601,
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add_rows(left, right):
    result = [0] * max(len(left), len(right))
    for index, value in enumerate(left):
        result[index] += value
    for index, value in enumerate(right):
        result[index] += value
    return tuple(result)


def multiply_rows(left, right):
    result = [0] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            result[i + j] += a * b
    return tuple(result)


def independent_row(graph: nx.Graph) -> tuple[int, ...]:
    """Independence polynomial via an implementation separate from producer."""
    whole = (1,)
    for vertices in nx.connected_components(graph):
        root = min(vertices)
        parent = {root: None}
        order = [root]
        for vertex in order:
            for neighbour in graph.neighbors(vertex):
                if neighbour == parent[vertex]:
                    continue
                assert neighbour not in parent, "input must be a forest"
                parent[neighbour] = vertex
                order.append(neighbour)
        excluded = {}
        included = {}
        for vertex in reversed(order):
            out_row = (1,)
            in_row = (0, 1)
            for child in graph.neighbors(vertex):
                if parent.get(child) != vertex:
                    continue
                out_row = multiply_rows(out_row, add_rows(excluded[child], included[child]))
                in_row = multiply_rows(in_row, excluded[child])
            excluded[vertex] = out_row
            included[vertex] = in_row
        whole = multiply_rows(whole, add_rows(excluded[root], included[root]))
    return whole


def forest_graphs(order: int):
    if order == 0:
        yield nx.Graph()
        return
    types = []
    for size in range(1, order + 1):
        trees = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for tree in trees:
            types.append((size, nx.convert_node_labels_to_integers(tree)))

    def build(remaining: int, first: int, chosen: tuple[int, ...]):
        if remaining == 0:
            yield nx.disjoint_union_all([types[index][1] for index in chosen])
            return
        for index in range(first, len(types)):
            size = types[index][0]
            if size > remaining:
                break
            yield from build(remaining - size, index, (*chosen, index))

    yield from build(order, 0, ())


def value_at(row, index: int):
    return row[index] if 0 <= index < len(row) else 0


def phi_from_recurrence(base, lower, left: int, right: int):
    """Build X=P+xH first, rather than reuse the producer's Phi formula."""
    length = max(len(base), len(lower) + 1)
    rooted = tuple(
        value_at(base, index) + value_at(lower, index - 1)
        for index in range(length)
    )
    return (
        value_at(base, left - 1) * value_at(rooted, right)
        + value_at(rooted, left) * value_at(base, right - 1)
    )


def five_gaps(base, lower):
    return {
        "degree4_gap2": phi_from_recurrence(base, lower, 2, 2)
        - phi_from_recurrence(base, lower, 1, 3),
        "degree5_gap2": phi_from_recurrence(base, lower, 2, 3)
        - phi_from_recurrence(base, lower, 1, 4),
        "degree6_gap2": phi_from_recurrence(base, lower, 2, 4)
        - phi_from_recurrence(base, lower, 1, 5),
        "degree6_gap3": phi_from_recurrence(base, lower, 3, 3)
        - phi_from_recurrence(base, lower, 2, 4),
        "degree7_gap3": phi_from_recurrence(base, lower, 3, 4)
        - phi_from_recurrence(base, lower, 2, 5),
    }


def finite_audit():
    totals = {"forests": 0, "patterns": 0}
    minima = {name: None for name in five_gaps((1,), (1,))}
    per_order = {}
    for order in range(13):
        forest_count = pattern_count = 0
        order_minima = {name: None for name in minima}
        for graph in forest_graphs(order):
            forest_count += 1
            base = independent_row(graph)
            assert base[1] == order if order else base == (1,)
            components = [tuple(sorted(part)) for part in nx.connected_components(graph)]
            choices = [tuple([None, *part]) for part in components]
            for selection in itertools.product(*choices):
                reduced = graph.copy()
                reduced.remove_nodes_from(vertex for vertex in selection if vertex is not None)
                lower = independent_row(reduced)
                gaps = five_gaps(base, lower)
                pattern_count += 1
                for name, value in gaps.items():
                    assert value >= 0, (order, name, value, selection)
                    order_minima[name] = value if order_minima[name] is None else min(order_minima[name], value)
                    minima[name] = value if minima[name] is None else min(minima[name], value)
        assert forest_count == KNOWN_FOREST_COUNTS[order], (order, forest_count)
        totals["forests"] += forest_count
        totals["patterns"] += pattern_count
        per_order[str(order)] = {
            "forests": forest_count,
            "componentwise_deletion_patterns": pattern_count,
            "minima": order_minima,
        }
    assert totals == {"forests": 2949, "patterns": 200255}
    return {"totals": totals, "global_minima": minima, "orders": per_order}


def choose(value, rank: int):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def to_bernstein(expression, variable):
    """Independent power-to-Bernstein conversion on the unit interval."""
    polynomial = sp.Poly(sp.expand(expression), variable)
    degree = polynomial.degree()
    ascending = [polynomial.nth(power) for power in range(degree + 1)]
    return [
        sp.factor(sum(
            ascending[power] * sp.binomial(index, power) / sp.binomial(degree, power)
            for power in range(index + 1)
        ))
        for index in range(degree + 1)
    ]


def analytic_audit():
    n, m, t, r = sp.symbols("n m t r", nonnegative=True)
    p2, p3, p4, p5 = sp.symbols("p2 p3 p4 p5", nonnegative=True)
    h2, h3, h4 = sp.symbols("h2 h3 h4", nonnegative=True)
    base = (1, n, p2, p3, p4, p5)
    lower_row = (1, m, h2, h3, h4)
    exact = five_gaps(base, lower_row)
    reconstructed = {
        "degree4_gap2": (n - 1) * p2 + 2 * m * n - h2 - p3,
        "degree5_gap2": m * p2 + n * h2 + p2**2 - p3 - h3 - p4,
        "degree6_gap2": (m + p2) * p3 + n * h3 - p4 - h4 - p5,
        "degree6_gap3": (p2 - m) * p3 + 2 * h2 * p2 - n * h3 - n * p4,
        "degree7_gap3": h2 * p3 + h3 * p2 + p3**2 - m * p4 - n * h4 - n * p5,
    }
    for name in exact:
        assert sp.expand(exact[name] - reconstructed[name]) == 0, name

    p2_floor = choose(n - 1, 2)
    p3_floor = choose(n - 2, 3)
    h2_floor = choose(m - 1, 2)
    bounds = {
        "degree4_gap2": (n - 1) * p2_floor + 2 * m * n - choose(m, 2) - choose(n, 3),
        "degree5_gap2": m * p2_floor + p2_floor**2 - choose(n, 3) - choose(m, 3) - choose(n, 4),
        "degree6_gap2": (m + p2_floor) * p3_floor - choose(n, 4) - choose(m, 4) - choose(n, 5),
        "degree6_gap3": (p2_floor - m) * p3_floor + 2 * h2_floor * p2_floor - n * choose(m, 3) - n * choose(n, 4),
        "degree7_gap3": h2_floor * p3_floor + p3_floor**2 - m * choose(n, 4) - n * choose(m, 4) - n * choose(n, 5),
    }
    slack = sp.symbols("u0:8", nonnegative=True)
    replacements = {
        "degree4_gap2": {p2: p2_floor + slack[0], h2: choose(m, 2) - slack[1], p3: choose(n, 3) - slack[2]},
        "degree5_gap2": {p2: p2_floor + slack[0], h2: slack[1], p3: choose(n, 3) - slack[2], h3: choose(m, 3) - slack[3], p4: choose(n, 4) - slack[4]},
        "degree6_gap2": {p2: p2_floor + slack[0], p3: p3_floor + slack[1], h3: slack[2], p4: choose(n, 4) - slack[3], h4: choose(m, 4) - slack[4], p5: choose(n, 5) - slack[5]},
        "degree6_gap3": {p2: p2_floor + slack[0], p3: p3_floor + slack[1], h2: h2_floor + slack[2], h3: choose(m, 3) - slack[3], p4: choose(n, 4) - slack[4]},
        "degree7_gap3": {p2: p2_floor + slack[0], p3: p3_floor + slack[1], h2: h2_floor + slack[2], h3: slack[3], p4: choose(n, 4) - slack[4], h4: choose(m, 4) - slack[5], p5: choose(n, 5) - slack[6]},
    }

    stats = {}
    for name, bound in bounds.items():
        unit_box = sp.expand(bound.subs({n: 13 + t, m: 1 + r * (12 + t)}))
        bound_rows = to_bernstein(unit_box, r)
        bound_coefficients = [
            coefficient for row in bound_rows for coefficient in sp.Poly(row, t).all_coeffs()
        ]
        assert bound_coefficients and min(bound_coefficients) > 0, name

        residual = sp.expand(
            (reconstructed[name].subs(replacements[name]) - bound)
            .subs({n: 13 + t, m: 1 + r * (12 + t)})
        )
        residual_rows = to_bernstein(residual, r)
        residual_coefficients = [
            coefficient for row in residual_rows
            for coefficient in sp.Poly(row, t, *slack).coeffs()
        ]
        assert residual_coefficients and min(residual_coefficients) >= 0, name
        stats[name] = {
            "strict_bound_minimum_scalar_coefficient": str(min(bound_coefficients)),
            "residual_minimum_scalar_coefficient": str(min(residual_coefficients)),
            "bernstein_rows": len(bound_rows),
        }

    # These are the only coefficient floors used.  Both have elementary
    # forest proofs, avoiding any appeal to an all-k path-minimization claim:
    # i2=C(n,2)-e and e<=n-1; i3=C(n,3)-e(n-2)+sum_v C(d_v,2).
    e, degree_pair_sum = sp.symbols("e degree_pair_sum", nonnegative=True)
    assert sp.expand(
        choose(n, 3) - e * (n - 2) + degree_pair_sum - choose(n - 2, 3)
        - ((n - 2) * (n - 2 - e) + degree_pair_sum)
    ) == 0

    # m=0 forces every component of P to be a singleton.
    edgeless = tuple([1, n] + [choose(n, rank) for rank in range(2, 6)])
    empty = (1,)
    m_zero = {}
    for name, expression in five_gaps(edgeless, empty).items():
        shifted = sp.Poly(sp.expand(expression.subs(n, 13 + t)), t)
        assert min(shifted.all_coeffs()) > 0, name
        m_zero[name] = str(sp.factor(expression))

    return {
        "exact_gap_formulas_reconstructed": True,
        "low_rank_floor_proof": {
            "i2": "i2(F)=binom(n,2)-e(F)>=binom(n-1,2) because e(F)<=n-1",
            "i3": (
                "i3(F)=binom(n,3)-e(F)(n-2)+sum_v binom(d(v),2). "
                "If e<=n-2 the difference from binom(n-2,3) is visibly nonnegative; "
                "if e=n-1 then F is a tree and sum_v binom(d(v),2)>=sum_v(d(v)-1)=n-2."
            ),
            "h2": "the same i2 identity with m vertices",
        },
        "positive_bounds_for_n_ge_13_and_1_le_m_le_n": stats,
        "m_zero_edgeless_exact_gaps": m_zero,
    }


def structural_audit():
    z, w = sp.symbols("z w")
    rz, rw, xz, xw, pz, pw, yz, yw, qz, qw = sp.symbols(
        "rz rw xz xw pz pw yz yw qz qw"
    )
    e_z, e_w = rz * xz * yz, rw * xw * yw
    u_z, u_w = rz * pz * yz, rw * pw * yw
    v_z, v_w = rz * xz * qz, rw * xw * qw
    q_z, q_w = rz * pz * qz, rw * pw * qw
    raw = z**2 * e_w * q_z + w**2 * e_z * q_w + z*w*(u_w*v_z + u_z*v_w)
    phi_x = z*xw*pz + w*xz*pw
    phi_y = z*yw*qz + w*yz*qw
    assert sp.expand(raw - rz*rw*phi_x*phi_y) == 0

    # Audit exactly which slice increments the central convolution uses.
    rows = []
    used = set()
    for left_degree in range(1, 8):
        right_degree = 8 - left_degree

        def symmetric_slice(prefix: str, degree: int):
            base = sp.symbols(f"{prefix}0", nonnegative=True)
            increments = sp.symbols(f"{prefix}1:{degree // 2 + 1}", nonnegative=True)
            half = [base]
            for index in range(1, degree // 2 + 1):
                half.append(base + sum(increments[:index]))
            return [half[min(index, degree-index)] for index in range(degree+1)], base, increments

        left, left_base, left_inc = symmetric_slice(f"a{left_degree}_", left_degree)
        right, right_base, right_inc = symmetric_slice(f"b{right_degree}_", right_degree)

        def coefficient(rank: int):
            return sum(
                left[index] * right[rank-index]
                for index in range(left_degree+1)
                if 0 <= rank-index <= right_degree
            )

        margin = sp.Poly(
            sp.expand(coefficient(4)-coefficient(3)),
            left_base, right_base, *(left_inc+right_inc),
        )
        assert all(coefficient >= 0 for coefficient in margin.coeffs())
        for symbol in margin.free_symbols:
            text = str(symbol)
            # final suffix is the one-based slice increment number
            increment = int(text.rsplit("_", 1)[-1])
            if increment:
                used.add(increment)
        rows.append({
            "degree_split": [left_degree, right_degree],
            "margin": str(sp.factor(margin.as_expr())),
            "minimum_scalar_coefficient": str(min(margin.coeffs())),
        })
    assert used <= {1, 2, 3}

    # First increments are automatically nonnegative for every relevant Phi
    # slice; the finite/analytic audit supplies only the inner five gaps.
    p = sp.symbols("p0:9", nonnegative=True)
    h = sp.symbols("h0:9", nonnegative=True)
    automatic = {}
    for degree in range(2, 8):
        gap = sp.Poly(
            sp.expand(phi_from_recurrence(p, h, 1, degree-1)-phi_from_recurrence(p, h, 0, degree)),
            *p, *h,
        )
        assert all(coefficient >= 0 for coefficient in gap.coeffs())
        automatic[str(degree)] = str(sp.factor(gap.as_expr()))
    return {
        "raw_factorization_residual_zero": True,
        "convolution_rows": rows,
        "automatic_outer_gaps_degrees_2_through_7": automatic,
        "slice_increment_indices_used": sorted(used),
    }


def main():
    assert sha256(PRODUCER) == EXPECTED_PRODUCER_SHA256
    assert sha256(PRODUCER_REPORT) == EXPECTED_REPORT_SHA256
    producer_report = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    assert producer_report["marker"] == PRODUCER_MARKER
    finite = finite_audit()
    analytic = analytic_audit()
    structural = structural_audit()
    report = {
        "marker": MARKER,
        "theorem_audited": producer_report["theorem"],
        "producer_source_sha256": EXPECTED_PRODUCER_SHA256,
        "producer_report_sha256": EXPECTED_REPORT_SHA256,
        "finite_independent_dp_and_enumeration": finite,
        "analytic_independent_reconstruction": analytic,
        "structural_independent_reconstruction": structural,
        "scope_guard": (
            "Distinct-component C5 only; no claim for connected nonadjacent C5, "
            "M5, g1, universal rank five, or Problem 993."
        ),
        "audit_source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "finite_forests": finite["totals"]["forests"],
        "finite_componentwise_deletion_patterns": finite["totals"]["patterns"],
        "convolution_rows": len(structural["convolution_rows"]),
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
