#!/usr/bin/env python3
"""Independent exact audit of the all-order active-root sum12 theorem.

This replay does not import the theorem's bound builder.  It reconstructs
Psi and unique interval sum12 from the kernel definitions, rederives its
deletion-difference coefficients and valid d3/d4 endpoints, rebuilds all
four sparse/dense high/low cones with local Bernstein code, compares every
ordered homogeneous-coefficient hash, and independently repeats the finite
rooted-tree census.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import os
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest
from prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent import H, P


HERE = Path(__file__).resolve().parent
THEOREM_REPORT = HERE / "iso_n5_disconnected_m5_sum12_all_order_exact_root_20260830.json"
OUTPUT = HERE / "iso_n5_disconnected_m5_sum12_all_order_independent_audit_g1_nonadjacent_20260830.json"
MARKER = "PASS_INDEPENDENT_AUDIT_ISO_N5_DISCONNECTED_M5_SUM12_ALL_ORDER_G1_NONADJACENT"
PINNED = {
    "prove_iso_n5_disconnected_m5_sum12_all_order_root.py":
        "EB4580A683DAC81BC45FCC8539A2106303B0D4F4B58436D4A1FF72CCACFED63F",
    "iso_n5_disconnected_m5_sum12_all_order_exact_root_20260830.json":
        "D07FC4E79CF146A92FBFB7E07CAF6149C81BECCA2A424A8C53E60C35A89C4604",
    "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py":
        "079C32D829AA91F29B539B869FA57C946BE0DD101AE06E6B5A80A41207AECD31",
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, index):
    return row[index] if 0 <= index < len(row) else 0


def choose(value, rank):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def phi_coefficient(p, h, left, right):
    return (
        at(p, left - 1) * at(p, right)
        + at(p, left) * at(p, right - 1)
        + at(p, left - 1) * at(h, right - 1)
        + at(h, left - 1) * at(p, right - 1)
    )


def kernel_coefficient(row, left, right):
    return (
        at(row, left - 1) * at(row, right - 1)
        + sp.Rational(1, 2) * (
            (left + right) * at(row, left) * at(row, right)
            - (right + 1) * at(row, left - 1) * at(row, right + 1)
            - (left + 1) * at(row, left + 1) * at(row, right - 1)
        )
    )


def psi_coefficient(p, h, left, right):
    x = tuple(at(p, index) + at(h, index - 1) for index in range(10))
    c = tuple(at(x, index) + at(p, index - 1) for index in range(10))
    return sp.expand(
        kernel_coefficient(c, left, right)
        - kernel_coefficient(x, left, right)
        - kernel_coefficient(p, left - 1, right - 1)
        - sp.Rational(1, 2) * phi_coefficient(p, h, left - 1, right - 1)
    )


def derive_sum12_lower():
    # Unique sum12 is the Psi-degree-six, layer-zero interval [1,4].
    expression = sp.expand(sum(
        psi_coefficient(P, H, left, 6 - left) for left in range(1, 5)
    ))
    n, s, q = sp.symbols("n s q", nonnegative=True)
    d = sp.symbols("d0:6", nonnegative=True)
    deletion_form = sp.expand(
        expression
        .subs({H[index]: P[index] - d[index] for index in range(1, 6)})
        .subs({P[0]: 1, H[0]: 1, P[1]: n})
    )
    coefficients = tuple(sp.factor(sp.diff(deletion_form, d[index])) for index in range(1, 6))
    expected = (-n - P[3], -1, -n, 2, 0)
    assert coefficients == expected

    d2 = choose(s, 2) + s * (n - s) - q
    # d3=p3-h3<=p3 because h3>=0.  The d3 coefficient is -n.
    d3_upper = P[3]
    # Count d4 sets meeting S in four or three vertices.  A root-neighbour
    # is excluded once for every selected triple containing its root.
    d4_lower = (
        choose(s, 4) + choose(s, 3) * (n - s)
        - choose(s - 1, 2) * q
    )
    lower = sp.expand(deletion_form.subs({
        d[1]: s,
        d[2]: d2,
        d[3]: d3_upper,
        d[4]: d4_lower,
    }))
    expected_lower = (
        n**2 + 2 * n * P[2] + sp.Rational(3, 2) * n * P[3]
        - n * P[4] + n * s**3 / 3 - n * s**2 - 4 * n * s / 3
        + P[2] * P[3] + 2 * P[2] - P[3] * s
        + sp.Rational(3, 2) * P[3] - 4 * P[4] - 5 * P[5]
        - q * s**2 + 3 * q * s - q - s**4 / 4
        + s**3 / 2 + 3 * s**2 / 4
    )
    assert sp.expand(lower - expected_lower) == 0, sp.factor(lower - expected_lower)
    return (n, s, q), expression, deletion_form, coefficients, d2, d4_lower, lower


def bernstein_coefficients(expression, variable):
    polynomial = sp.Poly(sp.expand(expression), variable)
    degree = polynomial.degree()
    return [sp.cancel(sum(
        sp.binomial(index, exponent) / sp.binomial(degree, exponent)
        * polynomial.nth(exponent)
        for exponent in range(index + 1)
    )) for index in range(degree + 1)]


def tensor_bernstein(expression, variables):
    rows = [expression]
    for variable in variables:
        rows = [
            coefficient
            for row in rows
            for coefficient in bernstein_coefficients(row, variable)
        ]
    return rows


def homogeneous_audit(expression, simplex, order_variable):
    polynomial = sp.Poly(sp.expand(expression), order_variable, *simplex)
    degree = max(sum(monomial[1:]) for monomial, _ in polynomial.terms())
    simplex_sum = sum(simplex)
    homogeneous = sp.Poly(sp.expand(sum(
        coefficient * order_variable ** monomial[0]
        * sp.prod(variable ** exponent for variable, exponent in zip(simplex, monomial[1:]))
        * simplex_sum ** (degree - sum(monomial[1:]))
        for monomial, coefficient in polynomial.terms()
    )), order_variable, *simplex)
    payload = "\n".join(
        f"{','.join(map(str, monomial))}:{coefficient}"
        for monomial, coefficient in homogeneous.terms()
    ).encode()
    coefficients = homogeneous.coeffs()
    return {
        "degree": degree,
        "terms": len(homogeneous.terms()),
        "negative": len([value for value in coefficients if value < 0]),
        "zero": len([value for value in coefficients if value == 0]),
        "minimum": str(min(coefficients)),
        "ordered_coefficient_hash": hashlib.sha256(payload).hexdigest().upper(),
    }


def build_cone_independently(lower, symbols, branch, sector):
    n, s, q = symbols
    rho1, rho2, rho3, rho4 = sp.symbols("rho1:5", nonnegative=True)
    ratio_bound = sp.expand(lower.subs({
        P[2]: n * rho1 / 4,
        P[3]: n * rho1 * rho2 / 24,
        P[4]: n * rho1 * rho2 * rho3 / 192,
        P[5]: n * rho1 * rho2 * rho3 * rho4 / 1920,
    }))
    r, v, w, alpha, t = sp.symbols("r v w alpha t", nonnegative=True)
    if branch == "sparse":
        s_value = 1 + r * (n - 4) / 4
        y = sp.symbols(f"audit_{sector}_sparse_y0:4", nonnegative=True)
    else:
        s_value = n / 4 + 3 * n * r / 4
        y = sp.symbols(f"audit_{sector}_dense_y0:3", nonnegative=True)
    rho1_value = 2 * n - 6 + 4 * s_value / n
    budget = rho1_value - 3
    if branch == "sparse":
        rho4_value = budget * y[0]
        rho3_value = rho4_value + 1 + budget * y[1]
        if sector == "high":
            rho2_value = rho3_value + 1 + budget * y[2]
            identity = rho1_value - rho2_value - 1 - budget * y[3]
            cubes = (r, v)
        else:
            rho2_value = rho3_value + 2 - alpha + budget * y[2]
            identity = rho1_value - rho2_value - alpha - budget * y[3]
            cubes = (r, v, alpha)
        assert sp.factor(identity - budget * (1 - sum(y))) == 0
    else:
        rho4_value = 2 * (n - 4) * w
        remaining = budget - rho4_value
        rho3_value = rho4_value + 1 + remaining * y[0]
        if sector == "high":
            rho2_value = rho3_value + 1 + remaining * y[1]
            identity = rho1_value - rho2_value - 1 - remaining * y[2]
            cubes = (r, v, w)
        else:
            rho2_value = rho3_value + 2 - alpha + remaining * y[1]
            identity = rho1_value - rho2_value - alpha - remaining * y[2]
            cubes = (r, v, w, alpha)
        assert sp.factor(identity - remaining * (1 - sum(y))) == 0

    rational = sp.cancel(ratio_bound.subs({
        s: s_value,
        q: v * (n - s_value),
        rho1: rho1_value,
        rho2: rho2_value,
        rho3: rho3_value,
        rho4: rho4_value,
    }))
    numerator, denominator = sp.fraction(rational)
    denominator = sp.factor(denominator)
    shifted = sp.expand(numerator.subs(n, t + 13))
    cube_rows = tensor_bernstein(shifted, cubes)
    audits = [homogeneous_audit(row, y, t) for row in cube_rows]
    return {
        "branch": branch,
        "sector": sector,
        "denominator": str(denominator),
        "cube_variables": [str(variable) for variable in cubes],
        "cube_rows": len(cube_rows),
        "simplex_variables": len(y),
        "simplex_terms": sum(row["terms"] for row in audits),
        "negative": sum(row["negative"] for row in audits),
        "zero": sum(row["zero"] for row in audits),
        "minimum": str(min(sp.Rational(row["minimum"]) for row in audits)),
        "row_audits": audits,
    }


def finite_audit(expression, theorem_report):
    evaluator = sp.lambdify((*P, *H), 2 * expression, modules="math")
    total_trees = total_roots = 0
    minima = []
    for n in range(13):
        order = n + 1
        candidates = [nx.empty_graph(1)] if order == 1 else nx.nonisomorphic_trees(order)
        local = None
        trees = roots = 0
        for tree0 in candidates:
            tree = nx.convert_node_labels_to_integers(tree0)
            trees += 1
            for root in tree:
                p_graph = tree.copy()
                p_graph.remove_node(root)
                h_graph = tree.copy()
                h_graph.remove_nodes_from({root, *tree.neighbors(root)})
                p = poly_forest(p_graph)
                h = poly_forest(h_graph)
                value = sp.Rational(int(round(evaluator(
                    *(at(p, rank) for rank in range(8)),
                    *(at(h, rank) for rank in range(7)),
                ))), 2)
                assert value >= 0
                local = value if local is None else min(local, value)
                roots += 1
        expected = theorem_report["small_order_certificate"]["rows"][str(n)]
        assert trees == expected["unlabeled_trees"]
        assert roots == expected["vertex_root_checks"]
        assert str(local) == expected["minimum_proved_interval_sums"][0]
        minima.append(str(local))
        total_trees += trees
        total_roots += roots
    assert total_trees == 2288 and total_roots == 27919
    return {
        "unlabeled_trees": total_trees,
        "root_checks": total_roots,
        "ordered_minima_by_base_order_0_through_12": minima,
    }


def main():
    for name, expected in PINNED.items():
        assert sha256(HERE / name) == expected, name
    theorem = json.loads(THEOREM_REPORT.read_text(encoding="utf-8"))
    assert theorem["marker"] == "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM12_ALL_ORDER_ROOT"

    symbols, expression, deletion_form, coefficients, d2, d4_lower, lower = derive_sum12_lower()
    assert str(lower) == theorem["exact_interval"]["resulting_lower_bound"]
    finite = finite_audit(expression, theorem)

    cones = {}
    for branch, sector in itertools.product(("sparse", "dense"), ("high", "low")):
        key = f"{branch}_{sector}"
        result = build_cone_independently(lower, symbols, branch, sector)
        expected = theorem["large_order_certificate"]["cones"][key]
        for field in (
            "denominator", "cube_rows", "simplex_variables", "simplex_terms",
            "negative", "zero", "minimum",
        ):
            assert result[field] == expected[field], (key, field)
        assert [row["ordered_coefficient_hash"] for row in result["row_audits"]] == [
            row["ordered_coefficient_hash"] for row in expected["row_audits"]
        ]
        assert [row["terms"] for row in result["row_audits"]] == [
            row["terms"] for row in expected["row_audits"]
        ]
        cones[key] = {
            "cube_rows": result["cube_rows"],
            "homogeneous_terms": result["simplex_terms"],
            "minimum": result["minimum"],
            "ordered_row_hashes": [
                row["ordered_coefficient_hash"] for row in result["row_audits"]
            ],
        }
    assert sum(row["homogeneous_terms"] for row in cones.values()) == 8691

    report = {
        "marker": MARKER,
        "audited_theorem_marker": theorem["marker"],
        "independent_interval_derivation": {
            "construction": "sum_{left=1}^4 Psi(left,6-left) from local kernel definitions",
            "deletion_coefficients_d1_through_d5": [str(value) for value in coefficients],
            "d2_exact": str(d2),
            "d3_endpoint": "d3<=p3 because d3=p3-h3 and h3>=0",
            "d4_lower": str(d4_lower),
            "resulting_lower_bound": str(lower),
        },
        "independent_large_order_cones": cones,
        "total_homogeneous_terms": 8691,
        "independent_finite_census": finite,
        "pinned_inputs": PINNED,
        "scope": (
            "Independent audit of the active-root unique sum12 theorem only. "
            "It does not prove sums14-16, transported common factors, all M5, "
            "g1, N5, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(raw, encoding="utf-8", newline="\n")
    os.replace(temporary, OUTPUT)
    print(json.dumps({
        "marker": MARKER,
        "finite_root_checks": finite["root_checks"],
        "cones": len(cones),
        "homogeneous_terms": report["total_homogeneous_terms"],
        "source_sha256": report["source_sha256"],
        "report_sha256": sha256(OUTPUT),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
