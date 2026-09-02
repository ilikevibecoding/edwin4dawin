#!/usr/bin/env python3
"""Exact all-order terminal-q3 Newton m=1 proof for j=3, marked leaf.

For deg_G(w)=1, F=G-w is a tree.  The proof keeps a single common
rank-four path-surplus coordinate in A0, R0, z3, and i4(F), rather than
taking incompatible extrema.  Exact monotonicity reduces to a widened
root-motif box, certified by tensor Bernstein coefficients.
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
OUTPUT = HERE / "terminal_q3_low_newton_m1_j3_leaf_exact_independent_20260829.json"
PINS = {
    "verify_rank4_tree_path_surplus_reserve_root.py":
        "719BE60CCF0660C71293690DED81B9120922F5823BCA27EF61CD334A109D4AEC",
    "rank4_tree_path_surplus_reserve_exact_root_20260826.json":
        "301944315BFBDADD40B6DB7B5BD4912D184F5FF6167C51BD32167BFC49BAEF97",
    "audit_rank4_tree_path_surplus_reserve_root.py":
        "472B2DC9D10573E6F628CB60BE8F96F16BE11A46E652ABC75CE0BE133D509027",
    "rank4_tree_path_surplus_reserve_independent_audit_root_20260826.json":
        "01F8D577C8F64B2E6B9CBADCB5D25FD8E2AD658B8ACD3C17722992016CE4E137",
    "RANK4_TREE_PATH_SURPLUS_RESERVE_THEOREM_2026-08-26.md":
        "495AB1C891C5CF6C542F80922C03A70F92BC6DC643F94611C95DB37316913481",
    "audit_terminal_q3_low_newton_adversarial_agent.py":
        "F009D46E8D3E30C26A9B1E3B30441526F108029DD3891DA14B268D9916650B4D",
    "terminal_q3_low_newton_adversarial_independent_20260829.json":
        "A8C9D806F00551EA6C2433B4B8180CF1738D6814E1FF8CAD20173E0A9F2B0836",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def tensor_bernstein(expression: sp.Expr, variables: tuple[sp.Symbol, ...]):
    polynomial = sp.Poly(sp.expand(expression), *variables)
    degrees = tuple(polynomial.degree(variable) for variable in variables)
    output = {}
    for index in itertools.product(*[range(degree + 1) for degree in degrees]):
        value = sp.Integer(0)
        for powers in itertools.product(*[range(item + 1) for item in index]):
            coefficient = polynomial.coeff_monomial(sp.prod(
                variable**power for variable, power in zip(variables, powers)
            ))
            value += coefficient * sp.prod(
                sp.binomial(index[k], powers[k]) / sp.binomial(degrees[k], powers[k])
                for k in range(len(variables))
            )
        output[index] = sp.factor(value)
    return degrees, output


def certify_box(
    expression: sp.Expr,
    *,
    N: sp.Symbol,
    R: sp.Symbol,
    e: sp.Symbol,
) -> dict[str, object]:
    """Certify expression>=0 on N>=15 and the widened (R,e) box."""
    q, u, v = sp.symbols("q u v", nonnegative=True)
    Nbox = 15 + q
    Rbox = 1 + (Nbox - 2) * u
    emin = (Rbox - 1) * (Rbox - 2) / 2
    emax = (Nbox - 2) * (Nbox - 3) / 2
    ebox = emin + (emax - emin) * v
    boxed = sp.cancel(expression.subs(
        {N: Nbox, R: Rbox, e: ebox}, simultaneous=True
    ))
    degrees, coefficients = tensor_bernstein(boxed, (u, v))
    stream: list[str] = []
    minimum = None
    zero_power_coefficients = 0
    for index in sorted(coefficients):
        qpoly = sp.Poly(sp.expand(coefficients[index]), q)
        values = qpoly.all_coeffs()
        assert values
        assert all(value >= 0 for value in values), (index, coefficients[index])
        assert any(value > 0 for value in values), (index, coefficients[index])
        zero_power_coefficients += sum(value == 0 for value in values)
        for value in values:
            if value > 0 and (minimum is None or value < minimum):
                minimum = value
        stream.append(f"{index}:{sp.srepr(coefficients[index])}")
    assert minimum is not None and minimum > 0
    return {
        "degrees": list(degrees),
        "bernstein_coefficients": len(coefficients),
        "minimum_positive_power_coefficient": str(minimum),
        "zero_power_coefficients": zero_power_coefficients,
        "coefficient_stream_sha256": hashlib.sha256(
            "\n".join(stream).encode("ascii")
        ).hexdigest().upper(),
    }


def symbolic_certificate() -> tuple[dict[str, object], tuple[sp.Symbol, ...], sp.Expr]:
    N, R, Y, e, tau, y = sp.symbols("N R Y e tau y", nonnegative=True)
    n = N + 1
    tau_G = tau + R * (R - 1) / 2 + Y - 1
    excess_G = e + R - 1
    W = excess_G + (n - 2)

    p0 = N**3 / 6 - N**2 / 2 + N / 3 + W
    p1 = (N**2 + N + 2) / 2
    R1 = N**2 - 2 * W
    a = (N - 1) * (N - 2) / 2
    z2 = (N - 2) * (N - 3) - 2 * e
    h2 = (N - 1) * (N - 2) / 2 - (N - 1 - R)
    b = (N - 2) * (N - 3) * (N - 4) / 6 + e
    c0 = sp.expand(z2 + h2 + a)

    s2_G = 2 * ((n - 2) * (n - 3) / 2 - excess_G)
    s3_G = (
        (n - 3) * (n - 4) * (n - 5) / 2
        - 2 * (n - 4) * excess_G + 3 * tau_G
    )
    R0 = sp.expand(s3_G + s2_G)
    A0 = sp.expand(p0 * c0 - a * R0)
    A1 = sp.expand(p0 * a + p1 * c0 + p1 * a - a * R1)

    z3 = (
        (N - 3) * (N - 4) * (N - 5) / 2
        - 2 * (N - 4) * e + 3 * tau
    )
    ebar = sp.factor(1 + y + z3 / b)
    q0bar = 4 * (c0 + R0) - 3 * (p0 + a) * ebar
    q1bar = 4 * (a + R1) - 3 * p1 * ebar - 3 * (p0 + a + p1)
    pq1_over_b = sp.expand(p0 * q1bar + p1 * q0bar + p1 * q1bar)

    U1_over_b = sp.factor((b + h2 + a + (N - 1)) / b)
    f4 = (
        (N - 3) * (N - 4) * (N - 5) * (N - 6) / 24
        + (N - 4) * e - tau
    )
    U0_over_b = sp.factor(f4 / b + y + 1 + h2 / b)
    exact = sp.factor(
        4 * a * (A0 * U1_over_b + A1 * (U0_over_b + U1_over_b))
        + a * pq1_over_b
    )
    numerator, denominator = sp.together(exact).as_numer_denom()
    assert sp.factor(denominator - 144 * b) == 0

    # Necessary exact motif domain:
    # 1<=R<=N-1, C(R-1,2)<=e<=C(N-2,2),
    # 0<=Y<=N-R-1, 0<=tau<=(N-1)e/3, and 0<=y<=1.
    # The three variables Y,tau,y are adverse.  Certify their signs on a
    # slightly widened continuous (R,e) box.
    slopes = {}
    expected_adverse_denominators = {
        "Y": 6 * b,
        "tau": 12 * b,
        "y": sp.Integer(12),
    }
    for label, variable in (("Y", Y), ("tau", tau), ("y", y)):
        adverse = sp.factor(-sp.diff(exact, variable))
        adverse_num, adverse_den = sp.together(adverse).as_numer_denom()
        expected_den = expected_adverse_denominators[label]
        assert sp.factor(adverse_den - expected_den) == 0, (
            label, sp.factor(adverse_den), sp.factor(expected_den)
        )
        slope_certificate = certify_box(adverse_num, N=N, R=R, e=e)
        slope_certificate["positive_denominator"] = str(sp.factor(adverse_den))
        slopes[label] = slope_certificate

    worst = sp.factor(exact.subs({
        Y: N - R - 1,
        tau: (N - 1) * e / 3,
        y: 1,
    }))
    worst_num, worst_den = sp.together(worst).as_numer_denom()
    assert sp.factor(worst_den - 144 * b) == 0
    positivity = certify_box(worst_num, N=N, R=R, e=e)

    path_y = (N - 5) / (N - 2)
    path = sp.factor(exact.subs({R: 1, Y: 1, e: 0, tau: 0, y: path_y}))
    path_expected = sp.factor(
        (N - 1) * (
            N**8 + 38*N**7 + 30*N**6 - 436*N**5 - 1119*N**4
            + 1214*N**3 + 4400*N**2 + 5664*N + 6912
        ) / (24 * (N - 4) * (N - 3))
    )
    assert sp.factor(path - path_expected) == 0

    return ({
        "denominator": str(sp.factor(denominator)),
        "exact_numerator_degrees": {
            str(variable): sp.Poly(numerator, variable).degree()
            for variable in (R, Y, e, tau, y)
        },
        "adverse_slope_certificates": slopes,
        "worst_corner": {
            "substitution": "Y=N-R-1, tau=(N-1)e/3, y=1",
            "positivity": positivity,
        },
        "path_specialization": str(path),
    }, (N, R, Y, e, tau, y), exact)


def subset_rows(graph: nx.Graph) -> tuple[list[int], list[int]]:
    graph = nx.convert_node_labels_to_integers(graph, ordering="sorted")
    n = graph.number_of_nodes()
    edges = list(graph.edges())
    independent = [0] * (n + 1)
    one_edge = [0] * (n + 1)
    for mask in range(1 << n):
        induced = sum(((mask >> u) & 1) and ((mask >> v) & 1) for u, v in edges)
        size = mask.bit_count()
        if induced == 0:
            independent[size] += 1
        elif induced == 1:
            one_edge[size] += 1
    return independent, one_edge


def with_isolates(row: list[int], rank: int, isolates: int) -> int:
    return sum(
        comb(isolates, used) * (row[rank - used] if 0 <= rank - used < len(row) else 0)
        for used in range(min(rank, isolates) + 1)
    )


def literal_formula_audit(symbols: tuple[sp.Symbol, ...], exact: sp.Expr) -> dict[str, object]:
    Nsym, Rsym, Ysym, esym, tausym, ysym = symbols
    checks = subsets = 0
    stream: list[str] = []
    for order in range(4, 11):
        for tree_index, tree0 in enumerate(nx.nonisomorphic_trees(order)):
            tree = nx.convert_node_labels_to_integers(tree0, ordering="sorted")
            whole_zero, whole_one = subset_rows(tree)
            subsets += 1 << order
            for root in [vertex for vertex, degree in tree.degree() if degree == 1]:
                neighbor = next(iter(tree.neighbors(root)))
                forest = tree.copy()
                forest.remove_node(root)
                forest = nx.convert_node_labels_to_integers(forest, ordering="sorted")
                # Track the neighbor after relabeling by its sorted-position map.
                surviving = sorted(vertex for vertex in tree.nodes() if vertex != root)
                marked = surviving.index(neighbor)
                hforest = forest.copy()
                hforest.remove_node(marked)
                fzero, fone = subset_rows(forest)
                hzero, _ = subset_rows(hforest)
                subsets += (1 << len(forest)) + (1 << len(hforest))

                a, b = fzero[2], fzero[3]
                if not b:
                    continue
                z2, z3 = fone[3], fone[4]
                h2 = hzero[2] if len(hzero) > 2 else 0
                h3 = hzero[3] if len(hzero) > 3 else 0
                values = []
                for t in (1, 2):
                    P = with_isolates(whole_zero, 3, t)
                    R0 = with_isolates(whole_one, 4, t)
                    U = with_isolates(whole_zero, 4, t)
                    c = z2 + h2 + t * a
                    terminal_e = z3 + h3 + t * b
                    M = 4 * b * c - 3 * a * terminal_e
                    A = P * c - a * R0
                    Wmargin = P * b - a * U
                    values.append(P * (P + a) * M - 4 * A * Wmargin)
                delta1 = values[1] - values[0]

                Nvalue = order - 1
                Rvalue = forest.degree(marked)
                Yvalue = sum(forest.degree(v) - 1 for v in forest.neighbors(marked))
                evalue = sum(comb(degree - 1, 2) for _, degree in forest.degree())
                i4 = fzero[4] if len(fzero) > 4 else 0
                tauvalue = comb(Nvalue - 3, 4) + (Nvalue - 4) * evalue - i4
                rebuilt = sp.factor(exact.subs({
                    Nsym: Nvalue, Rsym: Rvalue, Ysym: Yvalue,
                    esym: evalue, tausym: tauvalue,
                    ysym: sp.Rational(h3, b),
                }))
                assert rebuilt * b == delta1, (
                    order, tree_index, root, rebuilt, b, delta1
                )
                checks += 1
                stream.append(
                    f"{order}|{tree_index}|{root}|{Nvalue}|{Rvalue}|{Yvalue}|"
                    f"{evalue}|{tauvalue}|{h3}|{b}|{delta1}"
                )
    return {
        "tree_orders": [4, 10],
        "leaf_root_formula_checks": checks,
        "subset_masks_recomputed": subsets,
        "value_stream_sha256": hashlib.sha256(
            "\n".join(stream).encode("ascii")
        ).hexdigest().upper(),
    }


def main() -> None:
    observed = {name: sha256(HERE / name) for name in PINS}
    assert observed == PINS
    rank4 = json.loads(
        (HERE / "rank4_tree_path_surplus_reserve_exact_root_20260826.json")
        .read_text(encoding="utf-8")
    )
    rank4_audit = json.loads(
        (HERE / "rank4_tree_path_surplus_reserve_independent_audit_root_20260826.json")
        .read_text(encoding="utf-8")
    )
    assert rank4["status"] == "PASS_EXACT_RANK4_TREE_PATH_SURPLUS_RESERVE_N15_PLUS"
    assert rank4_audit["status"] == "PASS_INDEPENDENT_RANK4_TREE_PATH_SURPLUS_RESERVE_AUDIT"
    finite = json.loads(
        (HERE / "terminal_q3_low_newton_adversarial_independent_20260829.json")
        .read_text(encoding="utf-8")
    )
    assert finite["newton_degrees"]["1"]["negative_coefficients"] == 0
    assert int(finite["newton_degrees"]["1"]["minimum_coefficient"]) > 0

    symbolic, symbols, exact = symbolic_certificate()
    literal = literal_formula_audit(symbols, exact)
    report = {
        "schema": "terminal-q3-low-newton-m1-j3-leaf-exact-independent-v2",
        "date": "2026-08-29",
        "status": "PASS_INDEPENDENT_EXACT_ALL_ORDER_TERMINAL_Q3_LOW_NEWTON_M1_J3_MARKED_LEAF",
        "claim": (
            "For every tree base G of order n>=15 and every marked leaf w, "
            "the Newton m=1 coefficient of the normalized untruncated "
            "terminal included-payment margin at target j=3 is nonnegative."
        ),
        "motifs": {
            "N": "|G|-1=|F|",
            "R": "degree in F of the unique neighbor of the marked leaf",
            "Y": "sum_(u adjacent root in F)(deg_F(u)-1)",
            "e": "sum_v C(deg_F(v)-1,2)",
            "tau": "T4(F)-(N-3)",
            "y": "i3(F-root)/i3(F)",
            "shared_surplus_identity": "tau_G=tau+C(R,2)+Y-1",
        },
        "domain_bounds": {
            "root_degree": "1<=R<=N-1",
            "excess": "C(R-1,2)<=e<=C(N-2,2)",
            "distance_two": "0<=Y<=N-R-1",
            "path_surplus": "0<=tau<=(N-1)e/3",
            "avoidance_ratio": "0<=y<=1",
        },
        "symbolic_certificate": symbolic,
        "literal_formula_audit": literal,
        "finite_boundary_n15": {
            "source_scope": finite["coverage"]["finite"],
            "m1_negative_coefficients_all_roots_ranks": 0,
        },
        "pins": observed,
        "scope": (
            "This proves only Newton degree m=1, target j=3, marked-degree "
            "one. It does not cover marked degree >=2, target j>=4, m=0, "
            "the full terminal payment, unimodality, or Erdos Problem 993."
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
