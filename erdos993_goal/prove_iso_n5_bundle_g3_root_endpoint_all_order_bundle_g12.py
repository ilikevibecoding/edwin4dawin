#!/usr/bin/env python3
"""All-order rank-five g3 theorem for two canonical bundle modes.

This proves g3>=0 when the support neighbourhood is empty (the unmarked
root-star k=0 mode) and when it is exactly one protected endpoint (the
singleton endpoint-parent mode).  Orders n>=8 use an exact total-degree
simplex Bernstein certificate after the universal high-motif incidence
theorem.  Orders 2<=n<=7 are an exhaustive exact unlabeled-forest check.

No assertion is made for the other three modes, for all of N5, or for
Problem 993.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb, factorial
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
CONFIG_SOURCE = HERE / "derive_iso_n5_bundle_g3_five_mode_configuration_bundle_g12.py"
CONFIG_REPORT = HERE / "iso_n5_bundle_g3_five_mode_configuration_bundle_g12_20260829.json"
MOTIF_SOURCE = HERE / "prove_iso_n5_bundle_g3_high_motif_reduction_bundle_g12.py"
MOTIF_REPORT = HERE / "iso_n5_bundle_g3_high_motif_reduction_bundle_g12_20260829.json"
OUTPUT = HERE / "iso_n5_bundle_g3_root_endpoint_all_order_bundle_g12_20260829.json"
MARKER = "PASS_EXACT_ISO_N5_BUNDLE_G3_ROOT_ENDPOINT_ALL_ORDER_BUNDLE_G12"


def sha256(path: Path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def nested(rows, rank):
    e, u, v, w = rows
    r = rank
    return (
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def multiply(left, right, maximum=6):
    return tuple(
        sum(at(left, j) * at(right, rank - j) for j in range(rank + 1))
        for rank in range(maximum + 1)
    )


def isolates(number, maximum=6):
    return tuple(comb(number, rank) if rank <= number else 0 for rank in range(maximum + 1))


def isolate_rows(rows, number, maximum=6):
    factor = isolates(number, maximum)
    return tuple(multiply(row, factor, maximum) for row in rows)


def add_xd(crows, drows):
    return tuple(
        tuple(at(crow, rank) + at(drow, rank - 1) for rank in range(7))
        for crow, drow in zip(crows, drows)
    )


def forward(values):
    values = list(values)
    answer = []
    while values:
        answer.append(values[0])
        values = [values[j + 1] - values[j] for j in range(len(values) - 1)]
    return answer


def g3_rows(crows, drows):
    t0 = add_xd(crows, drows)
    values = []
    for number in range(4):
        top = nested(add_xd(isolate_rows(crows, number), drows), 5)
        lower = sum(nested(isolate_rows(crows, t), 4) for t in range(number))
        values.append(top - nested(t0, 5) - lower)
    return int(forward(values)[3])


def independence_row(graph):
    nodes = tuple(graph.nodes())
    return tuple(
        sum(
            all(not graph.has_edge(a, b) for a, b in itertools.combinations(chosen, 2))
            for chosen in itertools.combinations(nodes, rank)
        )
        for rank in range(7)
    )


def marked_rows(graph, u, v):
    answer = []
    for removed in ((), (u,), (v,), (u, v)):
        minor = graph.copy(); minor.remove_nodes_from(removed)
        answer.append(independence_row(minor))
    return tuple(answer)


def falling(value, degree):
    return factorial(value) // factorial(value - degree)


def compositions(total, parts):
    if parts == 1:
        yield (total,)
        return
    for first in range(total + 1):
        for tail in compositions(total - first, parts - 1):
            yield (first, *tail)


def simplex_coefficients(polynomial, variables, degree):
    power = dict(sp.Poly(sp.expand(polynomial), *variables).terms())
    for alpha in compositions(degree, len(variables) + 1):
        selected = alpha[1:]
        coefficient = 0
        for beta, value in power.items():
            if all(b <= a for b, a in zip(beta, selected)):
                multiplier = sp.Integer(1)
                for aa, bb in zip(selected, beta):
                    multiplier *= falling(aa, bb)
                multiplier /= falling(degree, sum(beta))
                coefficient += value * multiplier
        yield alpha, sp.factor(coefficient)


def reconstruct_simplex(coefficients, variables, degree):
    unused = 1 - sum(variables)
    result = 0
    for alpha, coefficient in coefficients:
        multinomial = factorial(degree)
        for entry in alpha:
            multinomial //= factorial(entry)
        term = sp.Integer(multinomial) * unused ** alpha[0]
        for variable, exponent in zip(variables, alpha[1:]):
            term *= variable**exponent
        result += coefficient * term
    return sp.expand(result)


def power_nonnegative(expression, variable):
    return all(c >= 0 for c in sp.Poly(sp.expand(expression), variable).all_coeffs())


def bernstein_certificate(expression, variables, tail_variable):
    polynomial = sp.cancel(expression)
    assert sp.denom(polynomial) == 1
    degree = max(sum(monomial) for monomial in sp.Poly(polynomial, *variables).monoms())
    coefficients = list(simplex_coefficients(polynomial, variables, degree))
    assert sp.expand(reconstruct_simplex(coefficients, variables, degree) - polynomial) == 0
    assert all(power_nonnegative(value, tail_variable) for _, value in coefficients)
    minimum = min(sp.factor(value.subs(tail_variable, 0)) for _, value in coefficients)
    return {
        "degree": degree,
        "coefficient_count": len(coefficients),
        "minimum_at_tail_zero": str(minimum),
        "coefficient_stream_sha256": hashlib.sha256(
            "".join(f"{alpha}:{sp.srepr(value)}" for alpha, value in coefficients).encode()
        ).hexdigest().upper(),
    }


def tail_proof(config):
    n = sp.Symbol("n")
    edge = sp.Symbol("C_edges")
    du, dv, adjacent = sp.symbols("C_degree_u C_degree_v C_adjacent")
    wedges = sp.Symbol("C_wedges")
    xu, xv = sp.symbols("C_neighbor_excess_u C_neighbor_excess_v")
    common = sp.Symbol("C_common_neighbor")
    m = sp.Symbol("m", nonnegative=True)
    sx, sy, sr = sp.symbols("sx sy sr", nonnegative=True)
    simplex = (sx, sy, sr)
    rows = []
    total_coefficients = 0
    modes = {"no_mark_root_k0": 18, "singleton_endpoint": 8}
    for mode, motif_charge in modes.items():
        residual = sp.sympify(config["modes"][mode]["residual_without_high_motifs"])
        for a, zu, zv in itertools.product((0, 1), repeat=3):
            length = 7 + m - a - zu - zv  # n=8+m
            x, y, r = zu * length * sx, zv * length * sy, length * sr
            structural = {
                n: 8 + m,
                adjacent: a,
                du: a + zu + x,
                dv: a + zv + y,
                edge: a + zu + zv + x + y + r,
            }
            wedge_cap = (
                (a + zu + x) * (a + zu + x - 1) / 2
                + (a + zv + y) * (a + zv + y - 1) / 2
                + (r + zu + zv) * (r + zu + zv - 1) / 2
            )
            if a == 0:
                r3_both_bound = zu * zv * (n - 3)
            else:
                marked_excess = du + dv - 2
                r3_both_bound = (
                    marked_excess * (marked_excess - 1) / 2
                    + xu + xv - du - dv + 2
                )
            charged = sp.expand(residual - motif_charge * r3_both_bound)
            expected_signs = {
                wedges: -1,
                xu: 1,
                xv: 1,
                common: -1,
            }
            sign_certificates = {}
            for variable, sign in expected_signs.items():
                derivative = sp.expand(sign * sp.diff(charged, variable).subs(structural))
                sign_certificates[str(variable)] = bernstein_certificate(derivative, simplex, m)
            lower = sp.expand(charged.subs(structural).subs({
                wedges: wedge_cap,
                xu: 0,
                xv: 0,
                common: (1 - a) * zu * zv,
            }))
            certificate = bernstein_certificate(lower, simplex, m)
            total_coefficients += certificate["coefficient_count"]
            rows.append({
                "mode": mode,
                "adjacent_positive_external_u_external_v": [a, zu, zv],
                "lower": certificate,
                "monotonicity": sign_certificates,
            })
    assert len(rows) == 16
    return {
        "range": "n>=8, written n=8+m",
        "parameterization": (
            "du=a+zu+x, dv=a+zv+y, e=a+zu+zv+x+y+r; "
            "x,y vanish when the corresponding z is zero and "
            "x+y+r<=n-1-a-zu-zv"
        ),
        "wedge_cap": "W<=C(du,2)+C(dv,2)+C(r+zu+zv,2)",
        "basis": "exact total-degree Bernstein basis on sx+sy+sr<=1",
        "branches": len(rows),
        "lower_coefficient_count": total_coefficients,
        "all_basis_inversions_exact": True,
        "all_tail_power_coefficients_nonnegative": True,
        "rows": rows,
    }


def finite_proof():
    counts = {"no_mark_root_k0": 0, "singleton_endpoint_orientations": 0}
    minima = {"no_mark_root_k0": None, "singleton_endpoint": None}
    order_counts = {}
    for graph0 in nx.graph_atlas_g():
        if not (2 <= len(graph0) <= 7 and nx.is_forest(graph0)):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        order_counts.setdefault(str(len(graph)), {"forests": 0, "mark_pairs": 0})
        order_counts[str(len(graph))]["forests"] += 1
        for u, v in itertools.combinations(graph.nodes(), 2):
            order_counts[str(len(graph))]["mark_pairs"] += 1
            crows = marked_rows(graph, u, v)
            value = g3_rows(crows, crows)
            assert value >= 0
            counts["no_mark_root_k0"] += 1
            minima["no_mark_root_k0"] = value if minima["no_mark_root_k0"] is None else min(minima["no_mark_root_k0"], value)
            for endpoint in (u, v):
                reduced = graph.copy(); reduced.remove_node(endpoint)
                drows = marked_rows(reduced, u, v)
                value = g3_rows(crows, drows)
                assert value >= 0
                counts["singleton_endpoint_orientations"] += 1
                minima["singleton_endpoint"] = value if minima["singleton_endpoint"] is None else min(minima["singleton_endpoint"], value)
    assert counts == {"no_mark_root_k0": 1224, "singleton_endpoint_orientations": 2448}
    assert minima == {"no_mark_root_k0": 18, "singleton_endpoint": 18}
    return {
        "range": "2<=n<=7",
        "complete_scope": "all unlabeled forests in the graph atlas, every mark pair, both endpoint orientations",
        "counts": counts,
        "minima": minima,
        "order_counts": order_counts,
        "role": "exhaustive finite branch of the theorem, not extrapolated beyond n=7",
    }


def main():
    config = json.loads(CONFIG_REPORT.read_text(encoding="utf-8"))
    motif = json.loads(MOTIF_REPORT.read_text(encoding="utf-8"))
    assert config["marker"] == "PASS_EXACT_ISO_N5_BUNDLE_G3_FIVE_MODE_CONFIGURATION_BUNDLE_G12"
    assert motif["marker"] == "PASS_EXACT_ISO_N5_BUNDLE_G3_HIGH_MOTIF_REDUCTION_BUNDLE_G12"
    assert config["source_sha256"] == sha256(CONFIG_SOURCE)
    assert motif["source_sha256"] == sha256(MOTIF_SOURCE)
    assert motif["specialized"]["no_mark_root_k0"]["rigorous_lower_bound"] == "-18*R3_both"
    assert motif["specialized"]["singleton_endpoint"]["rigorous_lower_bound"] == "-8*R3_both"
    tail = tail_proof(config)
    finite = finite_proof()
    report = {
        "marker": MARKER,
        "theorem": (
            "The rank-five whole-bundle coefficient g3 is nonnegative in the "
            "canonical no-mark-root k0 mode and in either singleton endpoint-parent mode, at every order n>=2."
        ),
        "high_motif_input": {
            "no_mark_root_k0": "high layer >= -18 R3_both",
            "singleton_endpoint": "high layer >= -8 R3_both",
        },
        "R3_both_bounds": {
            "uv_edge": (
                "exactly C(du+dv-2,2)+Xu+Xv-du-dv+2"
            ),
            "uv_nonedge": (
                "at most n-3 when both degrees are positive, else zero; "
                "distance two gives one extension of the unique path and distance three gives one path"
            ),
        },
        "wedge_cap_proof": (
            "In H=G-{u,v}, W(H)<=C(r,2). With h in {0,1,2} protected marks "
            "having H-neighbours, forest acyclicity permits at most one attachment "
            "per mark per H-component; the attachment contribution is at most hr "
            "and the unique possible common attachment contributes at most one. "
            "Thus W(G)<=C(du,2)+C(dv,2)+C(r+h,2)."
        ),
        "large_order_certificate": tail,
        "finite_certificate": finite,
        "scope": (
            "These two rank-five g3 modes only. Singleton ordinary and both "
            "internal-spine broom modes remain open; no all-N5 or Problem 993 claim."
        ),
        "dependencies": {
            CONFIG_SOURCE.name: sha256(CONFIG_SOURCE),
            CONFIG_REPORT.name: sha256(CONFIG_REPORT),
            MOTIF_SOURCE.name: sha256(MOTIF_SOURCE),
            MOTIF_REPORT.name: sha256(MOTIF_REPORT),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "theorem": report["theorem"],
        "large_order_branches": tail["branches"],
        "large_order_lower_coefficients": tail["lower_coefficient_count"],
        "finite_counts": finite["counts"],
        "finite_minima": finite["minima"],
        "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
