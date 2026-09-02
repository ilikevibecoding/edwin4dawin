#!/usr/bin/env python3
"""Exact q=1 active-root theorem for disconnected M5 unique sum16.

Let P=T-u, S=N_T(u), H=P-S, e=e(P), and
q=sum_{v in S}deg_P(v).  When q=1, all but one P-component are isolated
vertices of S.  The nontrivial component is a tree X whose selected S-vertex
is a leaf, and H is the tree obtained by deleting that leaf.  Thus, for
t=|S|-1,

    I(P;x)=(1+x)^t I(X;x),     I(X;x)=I(H;x)+x I(H-w;x).

Twice unique Psi interval sum16 has an exact Newton expansion
sum_{j=0}^6 R_j binom(t,j).  This replay proves every R_j nonnegative.
Orders |H|<=12 are exhaustively audited.  For |H|>=13, R_3,...,R_6 have
elementary edge-union certificates, while R_0,R_1,R_2 have exact pinned
high/low forest-ratio cone certificates after one more vertex split at w.

This proves sum16 only on q=1 active rooted pairs.  It does not prove q>=2,
arbitrary common-factor transport, all disconnected M5, M5+3C5, or g1.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
import os
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
    unique_expressions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_sum16_q1_active_root_exact_g1_nonadjacent_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_DISCONNECTED_M5_SUM16_Q1_ACTIVE_ROOT_G1_NONADJACENT"
DEPENDENCIES = {
    "probe_iso_leaf_cross_remainder_root.py":
        "A9C643C3A223E004365E5013A2433517BC60073D1B230D92477FFDC7E3B6A5F1",
    "prove_iso_n5_disconnected_m5_middle_interval_g1_nonadjacent.py":
        "079C32D829AA91F29B539B869FA57C946BE0DD101AE06E6B5A80A41207AECD31",
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
}
EXPECTED_RATIO_ROWS = {
    "high": [
        (6364, [3, 5], 24, 14464, sp.Rational(2, 5)),
        (2942, [2, 5], 18, 6177, sp.Rational(4, 5)),
        (1392, [1, 4], 10, 3070, sp.Integer(20)),
    ],
    "low": [
        (5120, [3, 5, 2], 72, 16368, sp.Rational(4, 5)),
        (2378, [2, 5, 2], 54, 7965, sp.Rational(4, 5)),
        (1208, [1, 4, 1], 20, 2624, sp.Integer(20)),
    ],
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def polynomial_hash(polynomial: sp.Poly) -> str:
    payload = "\n".join(
        f"{','.join(map(str, monomial))}:{coefficient}"
        for monomial, coefficient in polynomial.terms()
    ).encode()
    return hashlib.sha256(payload).hexdigest().upper()


def coefficient_rows_hash(rows) -> str:
    lines = []
    for row_index, row in enumerate(rows):
        for monomial in sorted(row):
            value = row[monomial]
            if value:
                lines.append(
                    f"{row_index}|{','.join(map(str, monomial))}|{value}"
                )
    return hashlib.sha256("\n".join(lines).encode()).hexdigest().upper()


def symbolic_newton_rows():
    """Derive twice sum16 and its binomial(t,j) coefficients."""
    t = sp.symbols("t", integer=True, nonnegative=True)
    a = sp.symbols("a0:7", nonnegative=True)  # I(H)
    g = sp.symbols("g0:6", nonnegative=True)  # I(H-w)
    x = tuple(at(a, rank) + at(g, rank - 1) for rank in range(7))
    p = tuple(sp.expand(sum(
        sp.binomial(t, j) * at(x, rank - j) for j in range(rank + 1)
    )) for rank in range(8))
    expression = unique_expressions(interval_cells(P, H))[15]
    twice = sp.expand(sp.expand_func(
        (2 * expression)
        .subs({P[rank]: p[rank] for rank in range(8)})
        .subs({H[rank]: a[rank] for rank in range(7)})
        .subs({a[0]: 1, g[0]: 1, g[1]: a[1] - 1})
    ))
    assert sp.degree(twice, t) == 6
    rows = []
    reconstructed = 0
    for rank in range(7):
        row = sp.expand(sum(
            (-1) ** (rank - j) * sp.binomial(rank, j) * twice.subs(t, j)
            for j in range(rank + 1)
        ))
        rows.append(row)
        reconstructed += row * sp.binomial(t, rank)
    assert sp.expand(sp.expand_func(reconstructed) - twice) == 0
    return t, a, g, twice, rows


def finite_certificate(a, g, rows):
    evaluator = sp.lambdify((*a, *g), rows, modules="math")
    totals = {
        "unlabeled_trees": 0,
        "marked_vertices": 0,
        "newton_row_checks": 0,
    }
    global_minima = [None] * 7
    order_rows = {}
    for e in range(1, 13):
        candidates = [nx.empty_graph(1)] if e == 1 else nx.nonisomorphic_trees(e)
        tree_count = vertex_count = 0
        local_minima = [None] * 7
        for tree0 in candidates:
            tree = nx.convert_node_labels_to_integers(tree0)
            tree_count += 1
            a_values = poly_forest(tree)
            for w in tree:
                lower = tree.copy()
                lower.remove_node(w)
                g_values = poly_forest(lower)
                arguments = (
                    *(at(a_values, rank) for rank in range(7)),
                    *(at(g_values, rank) for rank in range(6)),
                )
                values = [int(round(value)) for value in evaluator(*arguments)]
                assert all(value >= 0 for value in values), (e, w, values)
                for index, value in enumerate(values):
                    local_minima[index] = (
                        value if local_minima[index] is None
                        else min(local_minima[index], value)
                    )
                    global_minima[index] = (
                        value if global_minima[index] is None
                        else min(global_minima[index], value)
                    )
                vertex_count += 1
        totals["unlabeled_trees"] += tree_count
        totals["marked_vertices"] += vertex_count
        totals["newton_row_checks"] += 7 * vertex_count
        order_rows[str(e)] = {
            "H_order_e": e,
            "unlabeled_trees": tree_count,
            "marked_attachment_vertices": vertex_count,
            "minimum_R0_through_R6": local_minima,
        }
    return {
        **totals,
        "H_orders": [1, 12],
        "global_minimum_R0_through_R6": global_minima,
        "rows": order_rows,
        "role": "complete finite branch for q=1; the large-order proof is symbolic",
    }


def termwise_easy_rows_certificate(a, g, rows):
    """R3,...,R6 from literal edge-union floors and binomial ceilings."""
    e, t = sp.symbols("e t", nonnegative=True)
    variables = (*a[3:7], *g[2:6])
    lower = {}
    upper = {}
    # H is an e-vertex tree with e-1 edges.
    for rank in range(3, 7):
        lower[a[rank]] = (
            choose(e, rank) - (e - 1) * choose(e - 2, rank - 2)
        )
        upper[a[rank]] = choose(e, rank)
    # G=H-w is an (e-1)-vertex forest with at most e-2 edges.
    for rank in range(2, 6):
        lower[g[rank]] = (
            choose(e - 1, rank) - (e - 2) * choose(e - 3, rank - 2)
        )
        upper[g[rank]] = choose(e - 1, rank)

    expected = [
        (11 * e**3 + 210 * e**2 + 277 * e + 195) / 3,
        2 * (14 * e**2 + 127 * e + 96),
        6 * (20 * e + 43),
        sp.Integer(98),
    ]
    reports = []
    for row_index, expected_bound in zip(range(3, 7), expected):
        expression = sp.expand(rows[row_index].subs({
            a[1]: e,
            a[2]: choose(e - 1, 2),
        }))
        polynomial = sp.Poly(expression, *variables)
        bound = 0
        for monomial, coefficient in polynomial.terms():
            shifted_coefficient = sp.Poly(
                sp.expand(coefficient.subs(e, t + 13)), t
            )
            if all(value >= 0 for value in shifted_coefficient.coeffs()):
                endpoint = lower
            elif all(value <= 0 for value in shifted_coefficient.coeffs()):
                endpoint = upper
            else:
                raise AssertionError((row_index, monomial, coefficient))
            term = coefficient
            for variable, power in zip(variables, monomial):
                term *= endpoint[variable] ** power
            bound += term
        bound = sp.factor(bound)
        assert sp.expand(bound - expected_bound) == 0
        shifted = sp.Poly(sp.expand(bound.subs(e, t + 13)), t)
        assert all(value > 0 for value in shifted.coeffs())
        reports.append({
            "newton_row": row_index,
            "lower_bound": str(bound),
            "at_e_equals_13_plus_t_power_coefficients": [
                str(value) for value in shifted.all_coeffs()
            ],
            "minimum_positive_power_coefficient": str(min(shifted.coeffs())),
        })
    return {
        "H_coefficient_bounds": (
            "C(e,k)-(e-1)C(e-2,k-2)<=a_k<=C(e,k), from the edge union bound"
        ),
        "G_coefficient_bounds": (
            "C(e-1,k)-(e-2)C(e-3,k-2)<=g_k<=C(e-1,k)"
        ),
        "rows": reports,
    }


def hard_row_lower_bounds(a, g, rows):
    """Split H=(H-w)+x(H-N[w]) and lower-bound R0,R1,R2."""
    e, m, t = sp.symbols("e m t", nonnegative=True)
    b = sp.symbols("b0:5", nonnegative=True)  # I(H-N[w])
    split = {g[rank]: a[rank] - b[rank - 1] for rank in range(2, 6)}
    lowers = []
    reports = []
    expected_b_coefficients = [
        (
            -6 * a[3] - 2 * e**2 + 5 * e + 6 * m - 5,
            4 * e**2 + 3 * e + 1,
            6 * (e + 1),
        ),
        (e**2 + 14 * e + 9, 7 * (2 * e + 3), sp.Integer(6)),
        (2 * (8 * e + 23), sp.Integer(20), sp.Integer(0)),
    ]
    for row_index in range(3):
        expression = sp.expand(
            rows[row_index]
            .subs(split)
            .subs({a[1]: e, a[2]: choose(e - 1, 2), b[1]: m})
        )
        coefficients = tuple(sp.factor(expression.coeff(b[rank])) for rank in (2, 3, 4))
        assert all(
            sp.expand(left - right) == 0
            for left, right in zip(coefficients, expected_b_coefficients[row_index])
        )
        if row_index == 0:
            # m=e-1-deg_H(w)<=e-2.  Hence the b2 coefficient is at most
            # -2e^2+11e-17<0 for e>=13.  Also b2<=C(m,2).
            endpoint = sp.expand((-2 * e**2 + 11 * e - 17).subs(e, t + 13))
            assert all(value < 0 for value in sp.Poly(endpoint, t).coeffs())
            expression = expression.subs(b[2], choose(m, 2))
        else:
            expression = expression.subs(b[2], 0)
        expression = sp.factor(expression.subs({b[3]: 0, b[4]: 0}))
        lowers.append(expression)
        reports.append({
            "newton_row": row_index,
            "b2_b3_b4_coefficients": [str(value) for value in coefficients],
            "lower_bound": str(expression),
        })
    return (e, m), lowers, {
        "vertex_split": "H=(H-w)+x(H-N[w]); b_k=i_k(H-N[w]), m=b1=e-1-deg_H(w)",
        "domain": "e>=13, 0<=m<=e-2",
        "termwise_rules": (
            "For R0 its b2 coefficient is negative and b2<=C(m,2), while "
            "b3,b4 have positive coefficients and are discarded.  For R1,R2 "
            "all b2,b3,b4 coefficients are nonnegative and are discarded."
        ),
        "rows": reports,
    }


def weak_compositions(total: int, length: int):
    if length == 1:
        yield (total,)
        return
    for first in range(total + 1):
        for rest in weak_compositions(total - first, length - 1):
            yield (first, *rest)


def multinomial(total: int, exponents) -> int:
    value = math.factorial(total)
    for exponent in exponents:
        value //= math.factorial(exponent)
    return value


def tensor_bernstein_sparse(polynomial: sp.Poly, cube_count: int):
    """Power-to-tensor-Bernstein transform, retaining the other monomials."""
    terms = polynomial.terms()
    degrees = [
        max(monomial[1 + index] for monomial, _ in terms)
        for index in range(cube_count)
    ]
    rows = []
    for indices in itertools.product(*(range(degree + 1) for degree in degrees)):
        row = {}
        for monomial, coefficient in terms:
            powers = monomial[1:1 + cube_count]
            if any(power > index for power, index in zip(powers, indices)):
                continue
            factor = sp.prod(
                sp.binomial(index, power) / sp.binomial(degree, power)
                for index, power, degree in zip(indices, powers, degrees)
            )
            key = (monomial[0], *monomial[1 + cube_count:])
            row[key] = row.get(key, 0) + coefficient * factor
        rows.append({key: sp.cancel(value) for key, value in row.items() if value})
    return degrees, rows


def shift_and_simplex_homogenize(rows, simplex_length: int):
    """Substitute e=13+t and homogenize over one simplex exactly."""
    homogeneous_rows = []
    minimum = None
    total_terms = 0
    for row in rows:
        shifted = {}
        for key, coefficient in row.items():
            e_power = key[0]
            for t_power in range(e_power + 1):
                new_key = (t_power, *key[1:])
                shifted[new_key] = shifted.get(new_key, 0) + (
                    coefficient * sp.binomial(e_power, t_power)
                    * 13 ** (e_power - t_power)
                )
        shifted = {
            key: sp.cancel(value) for key, value in shifted.items() if value
        }
        degree = max(sum(key[1:]) for key in shifted)
        homogeneous = {}
        for key, coefficient in shifted.items():
            missing = degree - sum(key[1:])
            for extra in weak_compositions(missing, simplex_length):
                new_key = (
                    key[0],
                    *(left + right for left, right in zip(key[1:], extra)),
                )
                homogeneous[new_key] = homogeneous.get(new_key, 0) + (
                    coefficient * multinomial(missing, extra)
                )
        homogeneous = {
            key: sp.cancel(value) for key, value in homogeneous.items() if value
        }
        assert all(value >= 0 for value in homogeneous.values())
        local = min(homogeneous.values())
        minimum = local if minimum is None else min(minimum, local)
        total_terms += len(homogeneous)
        homogeneous_rows.append(homogeneous)
    return homogeneous_rows, total_terms, minimum


def ratio_cone_certificate(a, hard_symbols, hard_lowers):
    e, m = hard_symbols
    u, w, alpha = sp.symbols("u w alpha", nonnegative=True)
    reports = {}
    for mode in ("high", "low"):
        m_box = u * (e - 2)
        rho1_fixed = 2 * e - 6 + 4 / e
        rho5 = (2 * e - 10) * w
        excess = rho1_fixed - rho5 - 4
        if mode == "high":
            z = sp.symbols("high_z0:4", nonnegative=True)
            rho4 = rho5 + 1 + excess * z[3]
            rho3 = rho4 + 1 + excess * z[2]
            rho2 = rho3 + 1 + excess * z[1]
            rho1 = rho2 + 1 + excess * z[0]
            cubes = (u, w)
            cone_description = "delta1,delta2,delta3,delta4>=1"
        else:
            z = sp.symbols("low_z0:3", nonnegative=True)
            rho4 = rho5 + 1 + excess * z[2]
            rho3 = rho4 + 1 + excess * z[1]
            rho2 = rho3 + 2 - alpha + excess * z[0]
            rho1 = rho2 + alpha
            cubes = (u, w, alpha)
            cone_description = (
                "delta1=alpha in [0,1], delta2>=2-alpha, delta3,delta4>=1"
            )
        assert sp.factor(
            rho1 - rho1_fixed - excess * (sum(z) - 1)
        ) == 0

        product = 1
        coefficient_substitutions = {}
        for rank, rho in zip(
            range(2, 7), (rho1, rho2, rho3, rho4, rho5)
        ):
            product *= rho
            coefficient_substitutions[a[rank]] = (
                e * product / (2 ** (rank - 1) * sp.factorial(rank))
            )
        assert sp.factor(
            coefficient_substitutions[a[2]].subs(
                z[-1], 1 - sum(z[:-1])
            )
            - choose(e - 1, 2)
        ) == 0

        mode_rows = []
        for row_index, lower in enumerate(hard_lowers):
            expression = lower.subs({m: m_box, **coefficient_substitutions})
            scaled = sp.cancel(480 * e**3 * expression)
            numerator, denominator = sp.fraction(scaled)
            assert denominator == 1
            polynomial = sp.Poly(numerator, e, *cubes, *z)
            cube_degrees, bernstein_rows = tensor_bernstein_sparse(
                polynomial, len(cubes)
            )
            homogeneous, total_terms, minimum = shift_and_simplex_homogenize(
                bernstein_rows, len(z)
            )
            expected = EXPECTED_RATIO_ROWS[mode][row_index]
            actual = (
                len(polynomial.terms()),
                cube_degrees,
                len(bernstein_rows),
                total_terms,
                minimum,
            )
            assert actual == expected, (mode, row_index, actual, expected)
            mode_rows.append({
                "newton_row": row_index,
                "scale": "480*e^3",
                "power_polynomial_terms": len(polynomial.terms()),
                "power_polynomial_hash": polynomial_hash(polynomial),
                "cube_variables": [str(variable) for variable in cubes],
                "cube_bernstein_degrees": cube_degrees,
                "cube_bernstein_rows": len(bernstein_rows),
                "simplex_variables": len(z),
                "nonzero_homogeneous_coefficients": total_terms,
                "minimum_homogeneous_coefficient": str(minimum),
                "ordered_homogeneous_coefficient_hash": coefficient_rows_hash(
                    homogeneous
                ),
            })
        reports[mode] = {
            "cone": cone_description,
            "rho_definition": "rho_j=2(j+1)a_(j+1)/a_j",
            "rho1_tree_identity": "rho1=2e-6+4/e",
            "rho5_extension_ceiling": (
                "rho5<=2(e-5), since 6a6<=a5(e-5) by counting extensions of independent 5-sets"
            ),
            "parameterization": (
                "m=u(e-2), rho5=(2e-10)w; excess=rho1-rho5-4 is distributed on the displayed simplex"
            ),
            "rows": mode_rows,
        }
    return reports


def main():
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name

    _t, a, g, twice, rows = symbolic_newton_rows()
    finite = finite_certificate(a, g, rows)
    easy = termwise_easy_rows_certificate(a, g, rows)
    hard_symbols, hard_lowers, hard_report = hard_row_lower_bounds(a, g, rows)
    ratio = ratio_cone_certificate(a, hard_symbols, hard_lowers)

    report = {
        "marker": MARKER,
        "theorem": (
            "Every active rooted pair P=T-u, H=T-N[u] with "
            "q=sum_{v in N(u)}deg_P(v)=1 has nonnegative unique Psi interval sum16."
        ),
        "q1_geometry": {
            "structure": (
                "P consists of t=s-1 isolated selected vertices and one tree X "
                "whose selected vertex is a leaf; H is X with that leaf deleted."
            ),
            "polynomials": "I(P)=(1+x)^t I(X), I(X)=I(H)+x I(H-w)",
        },
        "newton_expansion": {
            "identity": "2*sum16=sum_{j=0}^6 R_j*binom(t,j)",
            "twice_sum16_power_form": str(sp.factor(twice)),
            "R0_through_R6": [str(sp.factor(row)) for row in rows],
        },
        "finite_certificate": finite,
        "large_order_domain": "e=|H|>=13",
        "easy_R3_through_R6": easy,
        "hard_R0_through_R2_vertex_split": hard_report,
        "hard_R0_through_R2_ratio_certificates": ratio,
        "coverage": (
            "The finite branch proves every R_j for 1<=e<=12.  For e>=13, "
            "the elementary certificate proves R3,...,R6 and the pinned "
            "high/low ratio split proves R0,R1,R2.  Since binom(t,j)>=0 for "
            "every integer t>=0, the Newton identity proves sum16>=0."
        ),
        "pinned_dependencies": DEPENDENCIES,
        "scope": (
            "Exact q=1 active-root theorem for unique sum16.  No claim for "
            "q>=2, unique sums12/14/15 away from their separately proved faces, "
            "arbitrary common unmarked-component transport, all disconnected M5, "
            "M5+3C5, connected-nonadjacent M5, g1, N5, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(raw, encoding="utf-8", newline="\n")
    os.replace(temporary, OUTPUT)
    print(json.dumps({
        "marker": MARKER,
        "finite_marked_vertices": finite["marked_vertices"],
        "finite_newton_row_checks": finite["newton_row_checks"],
        "high_homogeneous_terms": [
            row["nonzero_homogeneous_coefficients"] for row in ratio["high"]["rows"]
        ],
        "low_homogeneous_terms": [
            row["nonzero_homogeneous_coefficients"] for row in ratio["low"]["rows"]
        ],
        "source_sha256": report["source_sha256"],
        "report_sha256": sha256(OUTPUT),
    }, indent=2), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
