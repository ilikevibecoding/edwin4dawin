#!/usr/bin/env python3
"""Independent exact audit of the all-forest q3 <= q2 component lift.

This auditor does not import or execute the producer.  It independently
rebuilds the component convolution, the quadratic residual, a stronger
coordinatewise cap reduction, the aggregate cap certificate (including
isolates), and a literal graph-atlas sanity check.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUT = HERE / "all_forest_q3_q2_component_lift_independent_audit_20260829.json"

PINNED = {
    "verify_all_tree_q3_q2_theorem_root.py":
        "9DCD97C0BEB373CB5B2EBDA7A9A2E7F30D730FA45EEF219FAB4EF3FE03C8E1F7",
    "all_tree_q3_q2_theorem_exact_root_20260828.json":
        "6013B83860C4A5B9FC58CEA07762CA51A5CE908AC2F6849FB7EE7383F26F4A74",
    "ALL_TREE_Q3_Q2_THEOREM_2026-08-28.md":
        "47070CC3148385AB1FCE887DE00E9C82FF71805FD5CD11ACFE6E64CBC777FE3D",
    "prove_all_forest_q3_q2_component_lift_root.py":
        "6C9F956D8F37AFC462193E780284C24F995D90A644F6C6C2B129A0B9BE259B00",
    "all_forest_q3_q2_component_lift_exact_root_20260829.json":
        "71BA8A861714902FECC613150B2BA936A19100F0AB43DF5766CF8614C5E50442",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank: int):
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def coefficients(expr, *variables):
    return [coefficient for _, coefficient in sp.Poly(sp.expand(expr), *variables).terms()]


def truncated_product(polynomials, x, degree: int = 3):
    value = sp.Integer(1)
    for polynomial in polynomials:
        value = sp.Poly(sp.expand(value * polynomial), x)
        value = sum(value.coeff_monomial(x**k) * x**k for k in range(degree + 1))
    return sp.expand(value)


def audit_component_convolution():
    """Rebuild the rank <=3 disjoint-union identities literally."""
    x = sp.symbols("x")
    order = 4
    a = sp.symbols(f"a0:{order}")
    b = sp.symbols(f"b0:{order}")
    c = sp.symbols(f"c0:{order}")
    u = sp.symbols(f"u0:{order}")
    w = sp.symbols(f"w0:{order}")
    p = [a_i - 1 for a_i in a]
    independent = [
        1 + a[i] * x + b[i] * x**2 + (c[i] - u[i]) * x**3
        for i in range(order)
    ]
    one_edge = [p[i] * x + 2 * u[i] * x**2 + w[i] * x**3 for i in range(order)]
    product_i = truncated_product(independent, x)
    product_j = sp.expand(sum(
        one_edge[i] * truncated_product(
            [independent[j] for j in range(order) if j != i], x
        )
        for i in range(order)
    ))
    product_j = sum(sp.Poly(product_j, x).coeff_monomial(x**k) * x**k for k in range(4))
    N = sum(a)
    D = sum(b) + sum(a[i] * a[j] for i in range(order) for j in range(i + 1, order))
    C0 = (
        sum(c)
        + sum(b[i] * a[j] for i in range(order) for j in range(order) if i != j)
        + sum(a[i] * a[j] * a[k] for i in range(order)
              for j in range(i + 1, order) for k in range(j + 1, order))
    )
    U = sum(u)
    L0 = sum(p[i] * (N - a[i]) for i in range(order))
    rest_i2 = [
        sum(b[j] for j in range(order) if j != i)
        + sum(a[j] * a[k] for j in range(order) for k in range(j + 1, order)
              if j != i and k != i)
        for i in range(order)
    ]
    K0 = sum(p[i] * rest_i2[i] for i in range(order))
    assert sp.expand(sp.Poly(product_i, x).coeff_monomial(x**2) - D) == 0
    assert sp.expand(sp.Poly(product_i, x).coeff_monomial(x**3) - (C0 - U)) == 0
    assert sp.expand(sp.Poly(product_j, x).coeff_monomial(x**2) - (L0 + 2 * U)) == 0
    expected_s3 = sum(w) + 2 * sum(u[i] * (N - a[i]) for i in range(order)) + K0
    assert sp.expand(sp.Poly(product_j, x).coeff_monomial(x**3) - expected_s3) == 0
    return order


def residual_formula():
    """Verify the exact lower residual after the tree-component theorem."""
    D, C0, L0, K0 = sp.symbols("D C0 L0 K0")
    count = 4
    a = sp.symbols(f"a0:{count}")
    b = sp.symbols(f"b0:{count}", positive=True)
    u = sp.symbols(f"u0:{count}")
    U = sum(u)
    upper_s3 = K0 + sum(
        (2 * sum(a) - a[i] - 3) * u[i] - 3 * u[i] ** 2 / b[i]
        for i in range(count)
    )
    direct = sp.expand(3 * (C0 - U) * (L0 + 2 * U) - 2 * D * upper_s3)
    ell = [6 * C0 - 3 * L0 - 2 * D * (2 * sum(a) - a[i] - 3) for i in range(count)]
    claimed = (
        3 * C0 * L0 - 2 * D * K0
        + sum(ell[i] * u[i] for i in range(count))
        + 6 * D * sum(u[i] ** 2 / b[i] for i in range(count))
        - 6 * U**2
    )
    assert sp.expand(direct - claimed) == 0

    # Weighted Cauchy identity for the Hessian.
    B = sum(b)
    cauchy = sp.expand(B * sum(u[i] ** 2 / b[i] for i in range(count)) - sum(u) ** 2)
    squares = sum(
        (b[j] * u[i] - b[i] * u[j]) ** 2 / (b[i] * b[j])
        for i in range(count) for j in range(i + 1, count)
    )
    assert sp.factor(cauchy - squares) == 0
    return count


def maximum_derivative(component_sizes):
    """Maximum derivative in the active coordinate's feasible interval."""
    h = len(component_sizes)
    N = sum(component_sizes)
    b = [choose(a - 1, 2) for a in component_sizes]
    c = [choose(a - 1, 3) for a in component_sizes]
    D = sum(b) + sum(
        component_sizes[i] * component_sizes[j]
        for i in range(h) for j in range(i + 1, h)
    )
    C0 = (
        sum(c)
        + sum(b[i] * component_sizes[j] for i in range(h) for j in range(h) if i != j)
        + sum(component_sizes[i] * component_sizes[j] * component_sizes[k]
              for i in range(h) for j in range(i + 1, h) for k in range(j + 1, h))
    )
    L0 = sum((component_sizes[i] - 1) * (N - component_sizes[i]) for i in range(h))
    active = component_sizes[0]
    cap = choose(active - 2, 2)
    ell = 6 * C0 - 3 * L0 - 2 * D * (2 * N - active - 3)
    # Other u_j=0 maximizes the derivative; u_0=cap maximizes its own part.
    return sp.factor(ell + 12 * (D / b[0] - 1) * cap)


def mobius_kernel(active, rest):
    """Möbius interaction kernel of a selected set of rest components."""
    total = sp.Integer(0)
    count = len(rest)
    for mask in range(1 << count):
        selected = [rest[i] for i in range(count) if mask & (1 << i)]
        total += (-1) ** (count - len(selected)) * maximum_derivative([active] + selected)
    return sp.factor(total)


def audit_box_monotonicity():
    """Prove every partial derivative is <=0 throughout the component box."""
    active = sp.symbols("active", positive=True)
    rest = sp.symbols("rest0:4", positive=True)
    kernels = [mobius_kernel(active, list(rest[:k])) for k in range(5)]
    assert kernels[0] == 0
    assert kernels[4] == 0
    X = sp.symbols("X", nonnegative=True)
    shifted_stats = []
    for rank in range(1, 4):
        Y = sp.symbols(f"Y0:{rank}", nonnegative=True)
        shifted = kernels[rank].subs({active: X + 3, **{
            rest[i]: Y[i] + 1 for i in range(rank)
        }})
        numerator, denominator = sp.together(shifted).as_numer_denom()
        coeffs = coefficients(numerator, X, *Y)
        assert denominator.subs({X: 0, **{item: 0 for item in Y}}) > 0
        assert max(coeffs) < 0
        shifted_stats.append({
            "rest_rank": rank,
            "terms": len(coeffs),
            "minimum": int(min(coeffs)),
            "maximum": int(max(coeffs)),
        })
    # The set function is assembled from singleton, pair, and triple component
    # patterns, so the vanishing fourth kernel makes the displayed expansion
    # exhaustive for an arbitrary number of rest components.
    return shifted_stats


def cap_residual_aggregate():
    """Independently rebuild and prove the all-cap residual."""
    P, S2, S3, H, r, z = sp.symbols("P S2 S3 H r z")
    N = P + r + z
    B = (S2 - P) / 2
    U = (S2 - 3 * P + 2 * r) / 2
    V = (S3 - 2 * S2 - P + 2 * r) / 2
    W = (S2 - 5 * P + 8 * r - 4 * H) / 2
    D = N * (N - 1) / 2 - P
    C0 = N * (N - 1) * (N - 2) / 6 - P * (N - 2) + B
    L0 = P * (N - 2) - 2 * B
    Cstar = (S3 - 3 * S2 + 2 * P) / 6
    K0 = (
        P * choose(N - 2, 2)
        - 2 * (B * (N - 4) + choose(P, 2))
        + 3 * Cstar
    )
    ell_base = 6 * C0 - 3 * L0 - 2 * D * (2 * N - 3)
    R = sp.factor(
        3 * C0 * L0 - 2 * D * K0
        + ell_base * U + 2 * D * V + 6 * D * W - 6 * U**2
    )

    # No isolates.  T=S2+12H has a nonpositive coefficient.
    R0 = sp.factor(R.subs(z, 0))
    T = sp.symbols("T")
    R0_T = sp.factor(R0.subs(S2, T - 12 * H))
    assert H not in R0_T.free_symbols
    K = P**2 + 2 * P * r - 3 * P + r**2 - r
    assert sp.factor(sp.diff(R0_T, T) + K / 2) == 0
    X, Y = sp.symbols("X Y", nonnegative=True)
    assert sp.expand(K.subs(P, r + X) - (
        X**2 + (4 * r - 3) * X + 4 * r * (r - 1)
    )) == 0
    # Exact two-variable merge certificate for
    # f(x)=(1+x)^2+12/(1+x).
    x, y = sp.symbols("x y", nonnegative=True)
    f = lambda value: (1 + value) ** 2 + 12 / (1 + value)
    merge = sp.factor(f(x + y) + f(sp.Integer(0)) - f(x) - f(y))
    merge_num, merge_den = sp.together(merge).as_numer_denom()
    assert min(coefficients(merge_num, x, y)) > 0
    assert merge_den.subs({x: 0, y: 0}) > 0
    Tmax = X**2 + 2 * X + 13 * r - 12 + 12 / (X + 1)
    lower0 = sp.factor(R0_T.subs({P: r + X, T: Tmax}))
    bracket = (
        3 * X**3 + (12 * r - 16) * X**2
        + (12 * r**2 - 24 * r + 29) * X
        + 12 * r**2 + 12 * r
    )
    assert sp.factor(lower0 - X * (r - 1) * bracket / (2 * (X + 1))) == 0
    assert min(coefficients(sp.expand(bracket.subs(r, Y + 2)), X, Y)) > 0

    # Positive powers of the isolate count.
    A3 = sp.factor(2 * sp.expand(R).coeff(z, 3))
    A2 = sp.factor(2 * sp.expand(R).coeff(z, 2))
    A1 = sp.factor(2 * sp.expand(R).coeff(z, 1))
    assert A3 == 3 * P - 2 * r
    X2 = sp.symbols("X2", nonnegative=True)
    substitutions = {P: r + X, S2: r + 2 * X + X2}
    A2x = sp.expand(A2.subs(substitutions))
    A2lower = sp.expand(A2x.subs({H: r, X2: X**2}))
    assert sp.expand(A2lower - (
        6 * X**2 + (17 * r - 24) * X + r * (4 * r - 5)
    )) == 0
    assert min(coefficients(sp.expand(A2lower.subs(r, Y + 2)), X, Y)) > 0
    A1x = sp.expand(A1.subs(substitutions))
    assert sp.factor(sp.diff(A1x, H) + 12 * (2 * X + 4 * r - 1)) == 0
    A1h = sp.expand(A1x.subs(H, r))
    assert sp.diff(A1h, X2) == 1 - 4 * r - 2 * X
    A1lower = sp.factor(A1h.subs(X2, X**2))
    expected_A1 = (
        3 * X**3 + (19 * r - 25) * X**2
        + (28 * r**2 - 72 * r + 21) * X
        + 4 * r * (r - 1)**2
    )
    assert sp.expand(A1lower - expected_A1) == 0
    assert min(coefficients(sp.expand(A1lower.subs(r, Y + 3)), X, Y)) > 0
    assert A1lower.subs({r: 2, X: 0}) == 8
    assert min(coefficients(sp.expand(A1lower.subs({r: 2, X: Y + 1})), Y)) > 0

    # One nontrivial component plus isolates; p=1 is the only exceptional
    # coefficient pattern and is nonnegative for integer z.
    p, Z = sp.symbols("p Z", positive=True)
    one = sp.factor(R.subs({r: 1, P: p, S2: p**2, S3: p**3, H: 1 / p}))
    assert sp.factor(one.subs(p, 1) - z**2 * (z - 1) / 2) == 0
    assert sp.factor(one.subs(p, 2) - 2 * z * (z**2 + z + 1)) == 0
    one_num = sp.together(one.subs({p: X + 3, z: Z + 1})).as_numer_denom()[0]
    assert min(coefficients(sp.expand(one_num), X, Z)) > 0
    return {
        "merge_terms": len(coefficients(merge_num, x, y)),
        "no_isolate_terms": len(coefficients(sp.expand(bracket.subs(r, Y + 2)), X, Y)),
        "a2_terms": len(coefficients(sp.expand(A2lower.subs(r, Y + 2)), X, Y)),
        "a1_terms": len(coefficients(sp.expand(A1lower.subs(r, Y + 3)), X, Y)),
        "one_component_terms": len(coefficients(sp.expand(one_num), X, Z)),
    }


def direct_atlas_check():
    checked = 0
    subsets = 0
    minimum = None
    witness = None
    for graph in nx.graph_atlas_g():
        if graph.number_of_nodes() > 0 and not nx.is_forest(graph):
            continue
        checked += 1
        vertices = list(graph.nodes())
        values = {}
        for size in (2, 3, 4):
            independent = 0
            one_edge = 0
            for subset in itertools.combinations(vertices, size):
                subsets += 1
                edges = graph.subgraph(subset).number_of_edges()
                if edges == 0:
                    independent += 1
                elif edges == 1:
                    one_edge += 1
            values[size] = (independent, one_edge)
        i2 = values[2][0]
        i3 = values[3][0]
        s2 = values[3][1]
        s3 = values[4][1]
        margin = 3 * i3 * s2 - 2 * i2 * s3
        assert margin >= 0
        if minimum is None or margin < minimum:
            minimum = margin
            witness = nx.to_graph6_bytes(graph, header=False).decode().strip()
    assert checked == 80
    return {"forests": checked, "subsets": subsets, "minimum_margin": minimum, "witness": witness}


def main() -> int:
    actual = {name: sha256(HERE / name) for name in PINNED}
    assert actual == PINNED
    tree_report = json.loads((HERE / "all_tree_q3_q2_theorem_exact_root_20260828.json").read_text())
    assert tree_report["status"] == "PASS_EXACT_ALL_TREE_Q3_AT_MOST_Q2_THEOREM"
    root_report = json.loads((HERE / "all_forest_q3_q2_component_lift_exact_root_20260829.json").read_text())
    assert root_report["status"] == "PASS_EXACT_SYMBOLIC_ALL_FOREST_Q3_Q2_LIFT_FROM_ALL_TREE_THEOREM"
    convolution_rank = audit_component_convolution()
    residual_rank = residual_formula()
    derivative_stats = audit_box_monotonicity()
    cap_stats = cap_residual_aggregate()
    atlas = direct_atlas_check()
    report = {
        "schema": "all-forest-q3-q2-component-lift-independent-audit-v1",
        "status": "PASS_INDEPENDENT_EXACT_ALL_FOREST_Q3_AT_MOST_Q2_COMPONENT_LIFT_AUDIT",
        "claim": "For every finite forest F, 3*i3(F)*s2(F)-2*i2(F)*s3(F)>=0; hence q3(F)<=q2(F) whenever supported.",
        "pinned_sha256": actual,
        "independence": "The auditor does not import or execute the producer and uses a stronger Mobius cap-derivative certificate.",
        "component_convolution_symbolic_components": convolution_rank,
        "residual_symbolic_components": residual_rank,
        "maximum_derivative_kernels": derivative_stats,
        "cap_aggregate": cap_stats,
        "atlas_sanity": atlas,
        "scope": "This closes FQ32. Forest-base terminal anchor FA, terminal payment FP, and the final unimodality bridge remain separate obligations.",
    }
    report["source_sha256"] = sha256(Path(__file__).resolve())
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print("PASS_INDEPENDENT_EXACT_ALL_FOREST_Q3_AT_MOST_Q2_COMPONENT_LIFT_AUDIT")
    print("ATLAS_FORESTS", atlas["forests"])
    print("ATLAS_SUBSETS", atlas["subsets"])
    print("SOURCE", report["source_sha256"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
