#!/usr/bin/env python3
"""Exact sparse-edge closure of the last disconnected active-root Psi sum.

For an active rooted tree pair P=T-u, H=T-N[u], let n=|P| and e=e(P).
This replay proves unique left-centered Psi interval sum 16 (Psi total
degree eight) whenever e<=n/20.  It splits the sum into its H=P base and
the deletion differences d_k=p_k-h_k.  Fixed-edge subset bounds close the
base, while the independent one-per-component neighbour set gives explicit
lower bounds for d_4,d_5 and an upper bound for d_3.  The final polynomial
is certified on n>=13, 0<=e<=n/20 by exact Bernstein coefficients; smaller
orders are exhaustively replayed.

This is a partial disconnected M5 result, not a proof of all sum 16, all
disconnected M5, M5+3C5, g1, N5, or Erdos Problem 993.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import (
    H,
    P,
    at,
    choose,
    interval_cells,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum16_sparse_active_root_exact_g1_nonadjacent_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM16_SPARSE_ACTIVE_ROOT_G1_NONADJACENT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def bernstein_coefficients(expression, variable):
    polynomial = sp.Poly(sp.expand(expression), variable)
    degree = polynomial.degree()
    return [
        sp.factor(sum(
            sp.binomial(index, exponent) / sp.binomial(degree, exponent)
            * polynomial.nth(exponent)
            for exponent in range(index + 1)
        ))
        for index in range(degree + 1)
    ]


def symbolic_certificate() -> dict:
    n, e, t, r = sp.symbols("n e t r", nonnegative=True)
    d = sp.symbols("d0:7", nonnegative=True)
    cell = next(
        row for row in interval_cells(P, H)
        if row["psi_degree"] == 8 and row["layer"] == 0
    )
    exact = sp.expand(cell["expression"].subs({P[0]: 1, H[0]: 1, P[1]: n}))
    base = sp.expand(exact.subs({
        H[1]: n,
        **{H[index]: P[index] for index in range(2, 6)},
    }))
    expected_base = sp.Rational(1, 2) * (
        2 * n * P[3] + n * P[4] - 13 * n * P[5] - 6 * n * P[6]
        + 2 * P[2] ** 2 + 3 * P[2] * P[3] - 4 * P[2] * P[4]
        - 8 * P[2] * P[5] + 9 * P[3] ** 2 + 6 * P[3] * P[4]
    )
    assert sp.expand(base - expected_base) == 0

    h_to_d = {H[1]: n - d[1]}
    h_to_d.update({H[index]: P[index] - d[index] for index in range(2, 6)})
    correction = sp.factor(exact.subs(h_to_d) - base)
    expected_correction = (
        (6 * P[5] - P[3]) * d[1] / 2
        + (P[4] - P[2]) * d[2]
        - (n + 8 * P[3]) * d[3] / 2
        + P[2] * d[4]
        + 3 * n * d[5]
    )
    assert sp.expand(correction - expected_correction) == 0

    # The first two deletion coefficients are positive for n>=13.
    p5_floor = choose(n - 4, 5)
    p3_ceiling = choose(n, 3)
    p4_floor = choose(n - 3, 4)
    p2_ceiling = choose(n, 2)
    sign5 = sp.Poly(sp.expand((6 * p5_floor - p3_ceiling).subs(n, t + 13)), t)
    sign4 = sp.Poly(sp.expand((p4_floor - p2_ceiling).subs(n, t + 13)), t)
    assert all(value > 0 for value in sign5.coeffs())
    assert all(value > 0 for value in sign4.coeffs())

    # P is an n-vertex forest with e edges.
    p2 = choose(n, 2) - e
    lower3 = choose(n, 3) - e * (n - 2)
    lower4 = choose(n, 4) - e * choose(n - 2, 2)
    upper3 = choose(n, 3) - e * (n - 2) + choose(e, 2)
    upper4, upper5, upper6 = (choose(n, rank) for rank in (4, 5, 6))
    base_lower = sp.factor(sp.Rational(1, 2) * (
        2 * n * lower3 + n * lower4 - 13 * n * upper5 - 6 * n * upper6
        + 2 * p2**2 + 3 * p2 * lower3 - 4 * p2 * upper4
        - 8 * p2 * upper5 + 9 * lower3**2 + 6 * lower3 * lower4
    ))
    expected_base_numerator = (
        360 * e**2 * n**3 - 1440 * e**2 * n**2 + 1800 * e**2 * n - 480 * e**2
        - 82 * e * n**5 + 300 * e * n**4 - 410 * e * n**3 + 312 * e * n
        + 21 * n**6 - 55 * n**5 + 25 * n**4 + 55 * n**3 - 46 * n**2
    )
    assert sp.expand(base_lower - expected_base_numerator / 240) == 0

    # S=N_T(u) has s=n-e vertices, one in each P-component.  If q is the
    # number of P-edges incident with S, then q<=e.  Counting independent
    # sets whose intersection with S has size 4 or 3 (respectively 5 or 4)
    # gives these q=e lower endpoints.
    s_size = n - e
    d4_lower = (
        choose(s_size, 4) + choose(s_size, 3) * e
        - choose(s_size - 1, 2) * e
    )
    d5_lower = (
        choose(s_size, 5) + choose(s_size, 4) * e
        - choose(s_size - 1, 3) * e
    )
    correction_lower = sp.factor(
        -(n + 8 * upper3) * upper3 / 2
        + p2 * d4_lower + 3 * n * d5_lower
    )
    total_lower = sp.factor(base_lower + correction_lower)

    shifted = sp.expand(total_lower.subs({n: t + 13, e: r * (t + 13) / 20}))
    bernstein = bernstein_coefficients(shifted, r)
    power_rows = [sp.Poly(row, t) for row in bernstein]
    coefficients = [value for row in power_rows for value in row.coeffs()]
    assert len(bernstein) == 6
    assert all(value > 0 for value in coefficients)
    return {
        "sum16_base": str(expected_base),
        "deletion_correction": str(expected_correction),
        "fixed_edge_bounds": {
            "p2_exact": str(p2),
            "p3_lower_union": str(lower3),
            "p4_lower_union": str(lower4),
            "p3_upper_wedge": str(upper3),
            "p4_p5_p6_upper": [str(upper4), str(upper5), str(upper6)],
            "p3_upper_reason": (
                "i3=C(n,3)-e(n-2)+wedges and wedges<=C(e,2)"
            ),
        },
        "base_lower": str(base_lower),
        "deletion_bounds": {
            "d3_upper": "d3<=p3<=p3_upper_wedge",
            "d4_lower": str(d4_lower),
            "d5_lower": str(d5_lower),
            "d4_d5_counting": (
                "retain only independent sets meeting S in k or k-1 selected vertices; q<=e"
            ),
        },
        "correction_lower": str(correction_lower),
        "total_lower": str(total_lower),
        "parameterization": "n=13+t, e=r*n/20, t>=0, 0<=r<=1",
        "bernstein_degree": 5,
        "bernstein_rows": [str(row) for row in bernstein],
        "minimum_t_power_coefficient": str(min(coefficients)),
    }


def finite_certificate() -> dict:
    cell = next(
        row for row in interval_cells(P, H)
        if row["psi_degree"] == 8 and row["layer"] == 0
    )
    evaluator = sp.lambdify((*P, *H), 2 * cell["expression"], modules="math")
    roots = checks = 0
    minimum = None
    rows = {}
    for n in range(13):
        order = n + 1
        local = None
        count = 0
        candidates = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        for tree0 in candidates:
            tree = nx.convert_node_labels_to_integers(tree0)
            for root in tree:
                base_graph = tree.copy(); base_graph.remove_node(root)
                lower_graph = tree.copy(); lower_graph.remove_nodes_from({root, *tree.neighbors(root)})
                p = tuple(poly_forest(base_graph)); h = tuple(poly_forest(lower_graph))
                arguments = (
                    *(at(p, rank) for rank in range(8)),
                    *(at(h, rank) for rank in range(7)),
                )
                doubled = int(evaluator(*arguments))
                assert doubled >= 0
                value = sp.Rational(doubled, 2)
                local = value if local is None else min(local, value)
                minimum = value if minimum is None else min(minimum, value)
                roots += 1; checks += 1; count += 1
        rows[str(n)] = {"base_order": n, "root_checks": count, "minimum_sum16": str(local)}
    return {
        "base_orders": [0, 12],
        "root_checks": roots,
        "sum16_checks": checks,
        "global_minimum": str(minimum),
        "rows": rows,
    }


def main() -> None:
    symbolic = symbolic_certificate()
    finite = finite_certificate()
    report = {
        "marker": MARKER,
        "theorem": (
            "For every active rooted tree pair P=T-u, H=T-N[u], unique Psi "
            "interval sum 16 is nonnegative when e(P)<=|P|/20."
        ),
        "large_order_certificate": symbolic,
        "finite_certificate": finite,
        "dependency": {
            "source": "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py",
            "source_sha256": sha256(HERE / "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py"),
        },
        "scope": (
            "Active rooted pairs and the sparse-edge face of sum 16 only; no "
            "claim for the remaining dense face, common-component transport, all "
            "disconnected M5, M5+3C5, connected-nonadjacent M5, g1, or N5."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True, default=str) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "finite_root_checks": finite["root_checks"],
        "bernstein_rows": symbolic["bernstein_degree"] + 1,
        "minimum_t_power_coefficient": symbolic["minimum_t_power_coefficient"],
    }, indent=2, sort_keys=True), flush=True)
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper(), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
