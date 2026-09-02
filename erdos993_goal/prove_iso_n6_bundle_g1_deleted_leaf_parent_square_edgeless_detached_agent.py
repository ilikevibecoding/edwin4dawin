#!/usr/bin/env python3
"""Exact infinite special-family proof for the coupled parent payment.

Geometry: the distinguished ordinary leaf-parent edge is a detached K2.
After deleting it, H=K consists of two isolated marked vertices and n
unmarked isolated vertices.  The induced J=L retains any subset of the two
marks and t of the n unmarked vertices.  Thus 0 <= t <= n.  Both epsilon
payment forms are expanded exactly in the product binomial basis in t and
d=n-t.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g1_deleted_leaf_parent_square_edgeless_detached_exact_agent_20260831.json"
MARKER = "PASS_EXACT_ISO_N6_BUNDLE_G1_DELETED_LEAF_PARENT_SQUARE_EDGELESS_DETACHED_AGENT"


def at(row, index):
    return row[index] if 0 <= index < len(row) else sp.Integer(0)


def binomial_basis_coefficients(poly, first, second):
    degree = sp.Poly(poly, first, second).total_degree()
    answer = {}
    for a in range(degree + 1):
        for b in range(degree + 1 - a):
            value = sp.expand(sum(
                (-1) ** (a - i + b - j)
                * sp.binomial(a, i) * sp.binomial(b, j)
                * poly.subs({first: i, second: j})
                for i in range(a + 1) for j in range(b + 1)
            ))
            if value:
                answer[(a, b)] = sp.factor(value)
    return answer


def falling_basis(variable, degree):
    return sp.prod(variable - index for index in range(degree)) / sp.factorial(degree)


def isolate_power(row, power):
    return tuple(
        sum(sp.binomial(power, k) * at(row, i - k) for k in range(power + 1))
        for i in range(8)
    )


def main():
    expressions = build_expressions()
    p = sp.symbols("p0:8")
    q = sp.symbols("q0:8")
    n, t, d = sp.symbols("n t d", integer=True, nonnegative=True)

    # H has two additional isolated marked vertices; deleting either mark
    # leaves (1+x)P, and deleting both leaves P.
    hrows = (
        isolate_power(p, 2),
        isolate_power(p, 1),
        isolate_power(p, 1),
        p,
    )
    edgeless = {
        **{p[i]: sp.binomial(n, i) for i in range(8)},
        **{q[i]: sp.binomial(t, i) for i in range(8)},
    }
    payments = {
        "epsilon0": expressions["g2"] + expressions["F"],
        "epsilon1": expressions["g2"] + expressions["F"] + expressions["QHL"],
    }

    results = {}
    for retain_u in range(2):
        for retain_v in range(2):
            # E sees both retained marks, U deletes u, V deletes v, W deletes both.
            jrows = (
                isolate_power(q, retain_u + retain_v),
                isolate_power(q, retain_v),
                isolate_power(q, retain_u),
                q,
            )
            rules = {
                sp.Symbol(f"{prefix}{family}{rank}"): rowset[index][rank]
                for prefix, rowset in (("H", hrows), ("K", hrows), ("J", jrows), ("L", jrows))
                for index, family in enumerate("EUVW") for rank in range(8)
            }
            for epsilon_label, expression in payments.items():
                label = f"marks_{retain_u}{retain_v}_{epsilon_label}"
                polynomial_nt = sp.factor(sp.expand_func(sp.expand(expression.subs(rules)).subs(edgeless)))
                polynomial_td = sp.Poly(sp.expand(polynomial_nt.subs(n, t + d)), t, d).as_expr()
                coefficients = binomial_basis_coefficients(polynomial_td, t, d)
                reconstructed = sp.expand(sum(
                    value * falling_basis(t, a) * falling_basis(d, b)
                    for (a, b), value in coefficients.items()
                ))
                assert sp.expand(reconstructed - polynomial_td) == 0
                assert all(value > 0 for value in coefficients.values())
                results[label] = {
                    "retained_marks": [retain_u, retain_v],
                    "epsilon": int(epsilon_label[-1]),
                    "polynomial_n_t": str(polynomial_nt),
                    "nonzero_product_binomial_coefficients": {
                        f"t_choose_{a}__d_choose_{b}": str(value)
                        for (a, b), value in sorted(coefficients.items())
                    },
                    "coefficient_count": len(coefficients),
                    "minimum_coefficient": str(min(coefficients.values())),
                    "all_coefficients_strictly_positive": True,
                    "identity_reconstructed_exactly": True,
                }

    report = {
        "marker": MARKER,
        "theorem": (
            "For every n>=t>=0 in the displayed detached-K2, isolated-mark, edgeless-core geometry, "
            "every subset of the two marks retained in J, and epsilon=0 or 1, "
            "g2_6(H,J)+F(H,H)+epsilon*Q(H,J)>=0."
        ),
        "geometry": {
            "H_equals_K": "two isolated marked vertices plus n unmarked isolated vertices",
            "J_equals_L": "t retained unmarked isolated vertices and any subset of the two isolated marks",
            "parameters": "n=t+d with t,d nonnegative integers",
        },
        "proof": (
            "Each exact payment is represented in the product basis binom(t,a)binom(d,b); "
            "every nonzero coefficient is strictly positive."
        ),
        "payments": results,
        "dependency_sha256": {
            "coupled_reduction_report": "183EDA0B4E3030FC60C7960938ABD0B7341E7F10419A7D52220D4C41DD95C64B",
        },
        "scope_guard": (
            "This proves only the stated infinite edgeless detached-K2 family. It does not prove the "
            "master payment lemma for arbitrary genuine forest triples, the universal leaf lemma, rank-six G1, or Problem 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "theorem": report["theorem"],
        "coefficient_counts": {label: data["coefficient_count"] for label, data in results.items()},
        "minimum_coefficients": {label: data["minimum_coefficient"] for label, data in results.items()},
    }, indent=2))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
