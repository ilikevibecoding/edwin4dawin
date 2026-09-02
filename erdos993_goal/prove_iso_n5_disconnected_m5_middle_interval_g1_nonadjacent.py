#!/usr/bin/env python3
"""Exact partial Gate-3 theorem for the disconnected-mark M5 block.

For a rooted forest pair ``X=P+xH`` put

    Phi(X,P)=z X(w)P(z)+w X(z)P(w),
    Psi(X,P)=L(X,P)-zw Phi(X,P)/2.

The exact disconnected factorization is

    N=Phi_1 Psi_2+Phi_2 Psi_1.

Decomposing a centrally-unimodal fixed-total Phi slice into centered
intervals shows that the degree-(4,5) part of ``[z^4 w^5]N`` needs eleven
distinct left-centered interval sums of Psi (fourteen cells before merging
duplicates).  This replay proves all eleven at every order for an *active*
rooted tree pair: P=T-u, H=T-N[u], with no extra unmarked component absorbed
into the pair.  The first eight sums (Psi total degree at most four) hold for
the stronger componentwise-deletion geometry.  The three degree-five sums
use the actual independent root-neighbour deletion set and the pinned forest
factorial-ratio cone.  The same cone also closes one of the two degree-six
sums, so twelve of the sixteen distinct sums are proved here.

This is a genuine partial M5 theorem.  It closes the middle degree split
Phi_4 Psi_5 + Phi_5 Psi_4, not the remaining (1,8), (2,7), (3,6) splits,
not all disconnected M5, and not M5+3C5 or g1.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from probe_iso_leaf_cross_remainder_root import poly_forest


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_disconnected_m5_middle_interval_exact_g1_nonadjacent_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_DISCONNECTED_M5_MIDDLE_INTERVAL_G1_NONADJACENT"
DEPENDENCIES = {
    "RANK4_THREE_HALVES_FOREST_CERTIFICATE_2026-07-27.md":
        "38B1C6B41CBDB44D43569E2309BD7E606A59AF7B34322A0FF9083EC430C16FD1",
    "verify_rank4_three_halves_forest_certificate.py":
        "99059D9430D3A8D7AD0E6C5ED63CAE24F6AA99C1F23F204F3E974794A35F70AF",
    "RANK5_FOREST_THREE_HALVES_THEOREM_2026-07-27.md":
        "CA5323D8DF3110087228193C892F576F4814D4A813AE6FAB184887048377203D",
    "verify_rank5_three_halves_forest_certificate.py":
        "56B52DFE4FFA9BBE7273EF8EAA24AA737615338815DF0D41A5792C6728F17DBE",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def at(row, index: int):
    return row[index] if 0 <= index < len(row) else 0


def choose(value, rank: int):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def phi_coefficient(p, h, left: int, right: int):
    return (
        at(p, left - 1) * at(p, right)
        + at(p, left) * at(p, right - 1)
        + at(p, left - 1) * at(h, right - 1)
        + at(h, left - 1) * at(p, right - 1)
    )


def kernel_coefficient(row, left: int, right: int):
    return (
        at(row, left - 1) * at(row, right - 1)
        + sp.Rational(1, 2) * (
            (left + right) * at(row, left) * at(row, right)
            - (right + 1) * at(row, left - 1) * at(row, right + 1)
            - (left + 1) * at(row, left + 1) * at(row, right - 1)
        )
    )


def psi_coefficient(p, h, left: int, right: int):
    x = tuple(at(p, index) + at(h, index - 1) for index in range(10))
    c = tuple(at(x, index) + at(p, index - 1) for index in range(10))
    return sp.expand(
        kernel_coefficient(c, left, right)
        - kernel_coefficient(x, left, right)
        - kernel_coefficient(p, left - 1, right - 1)
        - sp.Rational(1, 2) * phi_coefficient(p, h, left - 1, right - 1)
    )


def interval_cells(p, h):
    cells = []
    for psi_degree in range(2, 9):
        phi_degree = 9 - psi_degree
        for layer in range(phi_degree // 2 + 1):
            lower = max(0, 4 - (phi_degree - layer))
            upper = min(psi_degree, 4 - layer)
            expression = sp.expand(sum(
                psi_coefficient(p, h, left, psi_degree - left)
                for left in range(lower, upper + 1)
            ))
            cells.append({
                "psi_degree": psi_degree,
                "phi_degree": phi_degree,
                "layer": layer,
                "interval": [lower, upper],
                "expression": expression,
            })
    return cells


def unique_expressions(cells):
    result = []
    for cell in cells:
        expression = cell["expression"]
        if expression not in result:
            result.append(expression)
    return result


def bernstein_coefficients(expression, variable):
    expression = sp.expand(expression)
    if expression == 0:
        return [sp.Integer(0)]
    polynomial = sp.Poly(expression, variable)
    degree = polynomial.degree()
    return [
        sp.cancel(sum(
            sp.binomial(index, exponent) / sp.binomial(degree, exponent)
            * polynomial.nth(exponent)
            for exponent in range(index + 1)
        ))
        for index in range(degree + 1)
    ]


def tensor_bernstein(expression, variables):
    rows = [expression]
    for variable in variables:
        rows = [
            coefficient
            for row in rows
            for coefficient in bernstein_coefficients(row, variable)
        ]
    return rows


def polynomial_hash(polynomial: sp.Poly) -> str:
    payload = "\n".join(
        f"{','.join(map(str, monomial))}:{coefficient}"
        for monomial, coefficient in polynomial.terms()
    ).encode()
    return hashlib.sha256(payload).hexdigest().upper()


def finite_active_root_certificate(expressions, proved_indices) -> dict:
    """All active rooted tree pairs with |P|<=12."""
    # Twice every interval expression has integral scalar coefficients.
    # Compile the eleven expressions once; repeated symbolic substitution at
    # every rooted tree would obscure the otherwise small finite replay.
    evaluators = sp.lambdify(
        (*P, *H),
        [sp.expand(2 * expressions[index]) for index in proved_indices],
        modules="math",
    )
    totals = {"unlabeled_trees": 0, "root_checks": 0, "interval_checks": 0}
    minima = [None] * len(proved_indices)
    rows = {}
    for n in range(13):
        tree_order = n + 1
        trees = roots = checks = 0
        local = [None] * len(proved_indices)
        candidates = (
            [nx.empty_graph(1)] if tree_order == 1
            else nx.nonisomorphic_trees(tree_order)
        )
        for tree0 in candidates:
            tree = nx.convert_node_labels_to_integers(tree0)
            trees += 1
            for root in tree:
                roots += 1
                base_graph = tree.copy()
                base_graph.remove_node(root)
                lower_graph = tree.copy()
                lower_graph.remove_nodes_from({root, *tree.neighbors(root)})
                p = tuple(poly_forest(base_graph))
                h = tuple(poly_forest(lower_graph))
                arguments = (
                    *(at(p, index) for index in range(8)),
                    *(at(h, index) for index in range(7)),
                )
                doubled = [int(value) for value in evaluators(*arguments)]
                values = [sp.Rational(value, 2) for value in doubled]
                assert all(value >= 0 for value in doubled), (n, root, doubled)
                checks += len(values)
                for index, value in enumerate(values):
                    local[index] = value if local[index] is None else min(local[index], value)
                    minima[index] = value if minima[index] is None else min(minima[index], value)
        totals["unlabeled_trees"] += trees
        totals["root_checks"] += roots
        totals["interval_checks"] += checks
        rows[str(n)] = {
            "base_order_n": n,
            "tree_order_n_plus_1": tree_order,
            "unlabeled_trees": trees,
            "vertex_root_checks": roots,
            "minimum_proved_interval_sums": local,
        }
    return {
        **totals,
        "base_orders": [0, 12],
        "proved_unique_expression_indices_one_based": [index + 1 for index in proved_indices],
        "global_minima_proved_sums": minima,
        "rows": rows,
        "role": "complete finite branch for the proved active-root scope",
    }


def low_degree_certificate(expressions) -> dict:
    """The first eight unique sums for arbitrary componentwise deletion."""
    n, m, t, r = sp.symbols("n m t r", nonnegative=True)
    substitutions = {P[0]: 1, H[0]: 1, P[1]: n, H[1]: m}
    exact = [sp.expand(expression.subs(substitutions)) for expression in expressions[:8]]
    lower = {P[index]: choose(n - index + 1, index) for index in range(2, 8)}
    lower.update({H[index]: sp.Integer(0) for index in range(2, 7)})
    upper = {P[index]: choose(n, index) for index in range(2, 8)}
    upper.update({H[index]: choose(m, index) for index in range(2, 7)})

    def termwise_bound(expression):
        polynomial = sp.Poly(expression, n, m, *P[2:], *H[2:])
        answer = 0
        for monomial, coefficient in polynomial.terms():
            term = coefficient
            for variable, exponent in zip(polynomial.gens, monomial):
                if variable in (n, m):
                    term *= variable**exponent
                else:
                    term *= (lower if coefficient > 0 else upper)[variable]**exponent
            answer += term
        return sp.factor(answer)

    bounds = [termwise_bound(expression) for expression in exact]
    expected = [
        0,
        sp.Rational(3, 2),
        1,
        (m + 3 * n + 2) / 2,
        (m + 3 * n + 1) / 2,
        2 * n + 1,
        (n**2 + n + 4) / 2,
        (m + 1) * (4 * n + 2 - m) / 2,
    ]
    assert all(sp.expand(left - right) == 0 for left, right in zip(bounds, expected))
    rows = []
    for bound in bounds:
        shifted = sp.expand(bound.subs({n: t + 13, m: r * (t + 13)}))
        bernstein = bernstein_coefficients(shifted, r)
        power_rows = [sp.Poly(value, t) for value in bernstein]
        coefficients = [value for row in power_rows for value in row.coeffs()]
        assert all(value >= 0 for value in coefficients)
        rows.append({
            "lower_bound": str(bound),
            "m_parameterization": "m=r*n, 0<=r<=1",
            "bernstein_rows": len(bernstein),
            "minimum_t_power_coefficient": str(min(coefficients)),
        })
    return {
        "unique_sums_closed": 8,
        "psi_total_degrees": [2, 4],
        "geometry": "H is any induced componentwise deletion of P; only 0<=m<=n is used",
        "coefficient_bounds": (
            "i_k(P)>=binom(n-k+1,k), i_k(P)<=binom(n,k), "
            "0<=i_k(H)<=binom(m,k)"
        ),
        "termwise_substitution": (
            "Every positive monomial uses nonnegative coefficient floors and "
            "every negative monomial uses coefficient ceilings."
        ),
        "rows": rows,
    }


def deletion_difference_bounds(expressions):
    """Exact active-root d1,d2 and rigorous two-sided d3 cone."""
    n, s, q, A, T = sp.symbols("n s q A T", nonnegative=True)
    d = sp.symbols("d0:7", nonnegative=True)
    p = P
    h_to_d = {H[0]: 1, H[1]: n - d[1]}
    h_to_d.update({H[index]: p[index] - d[index] for index in range(2, 6)})
    base = choose(s, 3) + choose(s, 2) * (n - s) - (s - 1) * q
    d2 = choose(s, 2) + s * (n - s) - q
    d3_exact = sp.expand(
        base + s * choose(n - 1, 2) - q * (n - 2)
        + A - s * (n - s) + T
    )
    d3_lower = sp.expand(
        base + s * choose(n - 1, 2) - q * (n - 2)
        - s * (n - s) + q
    )
    d3_upper = sp.expand(
        base + s * choose(n - 1, 2) - q * (n - 2)
        + choose(q, 2)
    )
    assert sp.expand(d3_exact - d3_lower - A - (T - q)) == 0
    # The upper bound follows termwise from i_2(P-N[v])<=C(n-1-deg(v),2)
    # and sum C(deg(v),2)<=C(sum deg(v),2)=C(q,2).

    exact = [
        sp.expand(expression.subs({P[0]: 1, H[0]: 1, P[1]: n}).subs(h_to_d))
        for expression in expressions
    ]
    degree_five_bounds = []
    for index in (8, 9, 10):
        expression = exact[index]
        bound = expression.subs({d[1]: s, d[2]: d2, d[4]: 0, d[5]: 0})
        d3_coefficient = sp.factor(expression.coeff(d[3]))
        if d3_coefficient < 0:
            bound = bound.subs(d[3], d3_upper)
        else:
            bound = bound.subs(d[3], d3_lower)
        degree_five_bounds.append(sp.expand(bound))
    assert sp.factor(exact[8].coeff(d[3])) == -sp.Rational(1, 2)
    assert sp.factor(exact[9].coeff(d[3])) == sp.Rational(3, 2)
    assert sp.factor(exact[10].coeff(d[3])) == 2
    sum13_bound = sp.expand(exact[12].subs({
        d[1]: s,
        d[2]: d2,
        d[3]: d3_lower,
        d[4]: 0,
        d[5]: 0,
    }))
    assert sp.factor(exact[12].coeff(d[3])) == n
    assert sp.factor(exact[12].coeff(d[4])) == sp.Rational(5, 2)
    return {
        "symbols": (n, s, q),
        "d2": d2,
        "d3_lower": d3_lower,
        "d3_upper": d3_upper,
        "degree_five_bounds": degree_five_bounds,
        "sum13_bound": sum13_bound,
        "report": {
            "active_geometry": (
                "P=T-u has n vertices and s=deg_T(u) components; "
                "S=N_T(u) is independent with one selected vertex per P-component; H=P-S"
            ),
            "edge_identity": "e(P)=n-s",
            "q_definition": "q=sum_{v in S} deg_P(v), hence 0<=q<=n-s",
            "d1": "p1-h1=s",
            "d2": str(d2),
            "d3_exact_auxiliary": str(d3_exact),
            "auxiliary_definitions": {
                "A": "sum_{v in S} binom(deg_P(v),2)",
                "T": "sum_{v in S} sum_{w in N_P(v)} deg_P(w)",
            },
            "auxiliary_bounds": [
                "0<=A<=binom(q,2)",
                "T>=q",
                "i2(P-N[v])<=binom(n-1-deg_P(v),2)",
            ],
            "d3_lower": str(d3_lower),
            "d3_upper": str(d3_upper),
        },
    }


def elementary_degree_five_certificate(data) -> dict:
    n, s, q = data["symbols"]
    bound9, bound10, _bound11 = data["degree_five_bounds"]
    t, r, v = sp.symbols("t r v", nonnegative=True)
    p2_exact = choose(n, 2) - (n - s)

    # Sum 9: positive p3 and negative p4.  At s=1 use the path floor.
    # At s>=2 the edge-union floor exceeds it by (n-2)(s-2).
    p3_path = choose(n - 2, 3)
    p3_union = choose(n, 3) - (n - s) * (n - 2)
    assert sp.factor(p3_union - p3_path) == (n - 2) * (s - 2)
    p4_ceiling = choose(n, 4)
    sum9_cases = []
    for name, substitutions, variables in (
        (
            "s=1",
            {s: 1, q: v * (n - 1), P[2]: p2_exact.subs(s, 1),
             P[3]: p3_path, P[4]: p4_ceiling},
            (v,),
        ),
        (
            "2<=s<=n",
            {s: 2 + r * (n - 2),
             q: v * (n - (2 + r * (n - 2))),
             P[2]: p2_exact.subs(s, 2 + r * (n - 2)),
             P[3]: p3_union.subs(s, 2 + r * (n - 2)),
             P[4]: p4_ceiling},
            (r, v),
        ),
    ):
        shifted = sp.expand(bound9.subs(substitutions).subs(n, t + 13))
        rows = tensor_bernstein(shifted, variables)
        power = [sp.Poly(row, t) for row in rows]
        coefficients = [coefficient for row in power for coefficient in row.coeffs()]
        assert all(coefficient > 0 for coefficient in coefficients)
        sum9_cases.append({
            "branch": name,
            "tensor_bernstein_rows": len(rows),
            "minimum_t_power_coefficient": str(min(coefficients)),
            "ordered_row_hashes": [polynomial_hash(row) for row in power],
        })

    # Sum 10: p3,p4 both have negative coefficients, so binomial ceilings suffice.
    s_parameter = 1 + r * (n - 1)
    shifted10 = sp.expand(bound10.subs({
        s: s_parameter,
        q: v * (n - s_parameter),
        P[2]: p2_exact.subs(s, s_parameter),
        P[3]: choose(n, 3),
        P[4]: choose(n, 4),
    }).subs(n, t + 13))
    rows10 = tensor_bernstein(shifted10, (r, v))
    power10 = [sp.Poly(row, t) for row in rows10]
    coefficients10 = [coefficient for row in power10 for coefficient in row.coeffs()]
    assert all(coefficient > 0 for coefficient in coefficients10)
    return {
        "sum9": {
            "coefficient_substitutions": (
                "p2=binom(n,2)-(n-s); p4<=binom(n,4); "
                "p3 uses the path floor at s=1 and the edge-union floor at s>=2"
            ),
            "branches": sum9_cases,
        },
        "sum10": {
            "coefficient_substitutions": (
                "p2=binom(n,2)-(n-s); p3<=binom(n,3); p4<=binom(n,4)"
            ),
            "parameterization": "s=1+r(n-1), q=v(n-s), 0<=r,v<=1",
            "tensor_bernstein_rows": len(rows10),
            "minimum_t_power_coefficient": str(min(coefficients10)),
            "ordered_row_hashes": [polynomial_hash(row) for row in power10],
        },
    }


def simplex_homogeneous_audit(expression, simplex_variables, t):
    polynomial = sp.Poly(sp.expand(expression.subs(N, t + 13)), t, *simplex_variables)
    degree = max(sum(monomial[1:]) for monomial, _ in polynomial.terms())
    simplex_sum = sum(simplex_variables)
    homogeneous = sum(
        coefficient * t**monomial[0]
        * sp.prod(variable**exponent for variable, exponent in zip(simplex_variables, monomial[1:]))
        * simplex_sum**(degree - sum(monomial[1:]))
        for monomial, coefficient in polynomial.terms()
    )
    result = sp.Poly(sp.expand(homogeneous), t, *simplex_variables)
    assert all(coefficient >= 0 for coefficient in result.coeffs())
    return {
        "simplex_homogeneous_degree": degree,
        "terms": len(result.terms()),
        "minimum_scalar_coefficient": str(min(result.coeffs())),
        "ordered_coefficient_hash": polynomial_hash(result),
    }


def ratio_degree_five_certificate(data) -> dict:
    """Exact high/low ratio-cone certificate for unique sum 11."""
    n, s, q = data["symbols"]
    bound11 = data["degree_five_bounds"][2]
    r, v, a, t = sp.symbols("r v a t", nonnegative=True)
    global N
    N = n
    reports = {}
    for mode in ("high", "low"):
        count = 5 if mode == "high" else 4
        y = sp.symbols(f"{mode}_y0:{count}", nonnegative=True)
        budget = 2 * n - 10 + 4 * r
        rho5 = budget * y[0]
        extra4 = budget * y[1]
        extra3 = budget * y[2]
        extra2 = budget * y[3]
        rho4 = rho5 + 1 + extra4
        rho3 = rho4 + 1 + extra3
        if mode == "high":
            extra1 = budget * y[4]
            rho2 = rho3 + 1 + extra2
            rho1 = rho2 + 1 + extra1
            cube_variables = (r, v)
            cone = "delta1=1+d1, delta2=1+d2, delta3=1+d3, delta4=1+d4"
        else:
            rho2 = rho3 + 2 - a + extra2
            rho1 = rho2 + a
            cube_variables = (r, v, a)
            cone = "0<=delta1=a<=1, delta2=2-a+d2, delta3=1+d3, delta4=1+d4"
        product = 1
        coefficient_substitutions = {}
        for rank, rho in zip(range(2, 7), (rho1, rho2, rho3, rho4, rho5)):
            product *= rho
            coefficient_substitutions[P[rank]] = (
                n * product / (2 ** (rank - 1) * sp.factorial(rank))
            )
        expression = sp.expand(bound11.subs({
            s: n * r,
            q: n * (1 - r) * v,
            **coefficient_substitutions,
        }))
        cube_rows = tensor_bernstein(expression, cube_variables)
        audits = [simplex_homogeneous_audit(row, y, t) for row in cube_rows]
        reports[mode] = {
            "cone": cone,
            "rho1_edge_identity_on_simplex": "rho1=2n-6+4r, because e(P)=n-s and s=nr",
            "simplex_budget": "2n-10+4r",
            "simplex_variables": len(y),
            "cube_variables": [str(variable) for variable in cube_variables],
            "cube_bernstein_rows": len(cube_rows),
            "homogeneous_terms": sum(row["terms"] for row in audits),
            "minimum_scalar_coefficient": str(min(
                sp.Rational(row["minimum_scalar_coefficient"]) for row in audits
            )),
            "row_audits": audits,
        }
    assert reports["high"]["homogeneous_terms"] == 1155
    assert reports["low"]["homogeneous_terms"] == 1260
    assert reports["high"]["minimum_scalar_coefficient"] == "1/12"
    assert reports["low"]["minimum_scalar_coefficient"] == "1/12"
    return reports


def ratio_degree_six_sum13_certificate(data) -> dict:
    """Exact high/low ratio-cone certificate for unique sum 13."""
    n, s, q = data["symbols"]
    bound13 = data["sum13_bound"]
    r, v, a, t = sp.symbols("r v a t", nonnegative=True)
    global N
    N = n
    reports = {}
    for mode in ("high", "low"):
        count = 5 if mode == "high" else 4
        y = sp.symbols(f"sum13_{mode}_y0:{count}", nonnegative=True)
        budget = 2 * n - 10 + 4 * r
        rho5 = budget * y[0]
        extra4 = budget * y[1]
        extra3 = budget * y[2]
        extra2 = budget * y[3]
        rho4 = rho5 + 1 + extra4
        rho3 = rho4 + 1 + extra3
        if mode == "high":
            extra1 = budget * y[4]
            rho2 = rho3 + 1 + extra2
            rho1 = rho2 + 1 + extra1
            cube_variables = (r, v)
        else:
            rho2 = rho3 + 2 - a + extra2
            rho1 = rho2 + a
            cube_variables = (r, v, a)
        product = 1
        coefficient_substitutions = {}
        for rank, rho in zip(range(2, 7), (rho1, rho2, rho3, rho4, rho5)):
            product *= rho
            coefficient_substitutions[P[rank]] = (
                n * product / (2 ** (rank - 1) * sp.factorial(rank))
            )
        expression = sp.expand(bound13.subs({
            s: n * r,
            q: n * (1 - r) * v,
            **coefficient_substitutions,
        }))
        cube_rows = tensor_bernstein(expression, cube_variables)
        audits = [simplex_homogeneous_audit(row, y, t) for row in cube_rows]
        reports[mode] = {
            "cube_variables": [str(variable) for variable in cube_variables],
            "cube_bernstein_rows": len(cube_rows),
            "homogeneous_terms": sum(row["terms"] for row in audits),
            "minimum_scalar_coefficient": str(min(
                sp.Rational(row["minimum_scalar_coefficient"]) for row in audits
            )),
            "row_audits": audits,
        }
    assert reports["high"]["homogeneous_terms"] == 3726
    assert reports["low"]["homogeneous_terms"] == 3690
    assert reports["high"]["minimum_scalar_coefficient"] == "1/48"
    assert reports["low"]["minimum_scalar_coefficient"] == "1/48"
    return reports


P = sp.symbols("p0:8", nonnegative=True)
H = sp.symbols("h0:7", nonnegative=True)
N = None


def main() -> None:
    for name, expected in DEPENDENCIES.items():
        assert sha256(HERE / name) == expected, name
    cells = interval_cells(P, H)
    expressions = unique_expressions(cells)
    assert len(cells) == 19
    assert len(expressions) == 16
    assert [cell["psi_degree"] for cell in cells].count(5) == 3
    assert all(expressions.index(cell["expression"]) < 11 for cell in cells if cell["psi_degree"] <= 5)

    proved_indices = (*range(11), 12)
    finite = finite_active_root_certificate(expressions, proved_indices)
    low = low_degree_certificate(expressions)
    deletion = deletion_difference_bounds(expressions)
    elementary = elementary_degree_five_certificate(deletion)
    ratio = ratio_degree_five_certificate(deletion)
    sum13_ratio = ratio_degree_six_sum13_certificate(deletion)

    mapping = []
    for cell in cells:
        mapping.append({
            "phi_degree": cell["phi_degree"],
            "psi_degree": cell["psi_degree"],
            "phi_centered_interval_layer": cell["layer"],
            "psi_interval": cell["interval"],
            "unique_expression_index_one_based": expressions.index(cell["expression"]) + 1,
            "proved_here": expressions.index(cell["expression"]) in proved_indices,
        })
    report = {
        "marker": MARKER,
        "theorem": (
            "For every active rooted tree pair X=P+xH with P=T-u and H=T-N[u], "
            "all eleven distinct left-centered Psi interval sums through Psi total "
            "degree five, and unique sum 13 at Psi degree six, are nonnegative. "
            "Consequently the unordered middle split Phi_4 Psi_5 + Phi_5 Psi_4 "
            "in [z^4w^5]N is nonnegative, with one additional degree-six cell closed."
        ),
        "exact_factorization_input": "N=Phi1*Psi2+Phi2*Psi1, Psi=L-(zw/2)Phi",
        "interval_reduction": {
            "total_cells": len(cells),
            "unique_expressions": len(expressions),
            "cells_through_psi_degree_five": sum(cell["psi_degree"] <= 5 for cell in cells),
            "unique_expressions_proved": 12,
            "mapping": mapping,
        },
        "finite_active_root_certificate": finite,
        "low_degree_all_componentwise_certificate": low,
        "active_root_deletion_difference_cone": deletion["report"],
        "degree_five_elementary_certificates": elementary,
        "degree_five_ratio_certificate": ratio,
        "degree_six_unique_sum13_ratio_certificate": sum13_ratio,
        "pinned_dependencies": DEPENDENCIES,
        "remaining_exact_obligation": (
            "Four unique Psi interval sums remain: unique sum 12 at total degree "
            "six, sums 14 and 15 at degree seven, and sum 16 at degree eight."
        ),
        "scope": (
            "Exact partial disconnected M5 theorem for active rooted pairs. It does "
            "not yet transport arbitrary unmarked common components, close the five "
            "high Psi sums, prove all disconnected M5, M5+3C5, connected-nonadjacent "
            "M5, g1, all N5, or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True, default=str) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "finite_root_checks": finite["root_checks"],
        "finite_interval_checks": finite["interval_checks"],
        "unique_expressions_proved": 12,
        "remaining_unique_expressions": 4,
        "high_simplex_terms": ratio["high"]["homogeneous_terms"],
        "low_simplex_terms": ratio["low"]["homogeneous_terms"],
        "sum13_high_simplex_terms": sum13_ratio["high"]["homogeneous_terms"],
        "sum13_low_simplex_terms": sum13_ratio["low"]["homogeneous_terms"],
    }, indent=2, sort_keys=True), flush=True)
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper(), flush=True)
    print(MARKER, flush=True)


if __name__ == "__main__":
    main()
