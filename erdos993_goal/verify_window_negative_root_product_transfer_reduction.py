#!/usr/bin/env python3
"""Exact reduction of the remaining two-outlier coupling inequality.

Let H have positive roots and put

    J = u (x+B+1) H(x) + (4-u) x H(x-1),
    T = v (x+B)   J(x) + (4-v) x J(x-1).

The first interlacing step gives J one negative root q and r positive roots
eta_i.  If alpha_i are the r positive roots of T whose product is largest,
Vieta gives the exact residual-product formula

    D = v B (-q)/4 * prod(eta_i)/prod(alpha_i).

Consequently D <= B(B+1)/16 is equivalent to the normalized transfer bound

    prod(alpha_i)/prod(eta_i) >= 4 v (-q)/(B+1).

Eliminating the intermediate roots once more by using J(0) gives the simpler
equivalent target

    prod(alpha_i) >= u v prod(xi_i),

where xi_i are the positive roots of H.  This final formulation is the one
most directly adapted to the normalized-Pochhammer structure of H.

There is also an elementary all-order bracket

    -u(B+1)/4 < q < 0.

Indeed H(x-1)/H(x)>1 for x<0.  At x0=-u(B+1)/4 the
identity u(B+1+x0)+(4-u)x0=0 shows J(x0)/H(x0)<0, whereas
J(0)/H(0)=u(B+1)>0.

The identities and the q bracket are proofs.  The algebraic root-isolation
audit is evidence for, not a proof of, the remaining transfer inequality.
"""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "window_negative_root_product_transfer_reduction_exact_20260809.json"
X = sp.symbols("x")
Z = sp.symbols("z")


def falling(k: int) -> sp.Expr:
    return sp.prod((X - j for j in range(k)), start=sp.Integer(1))


def elementary(values: list[sp.Rational]) -> list[sp.Rational]:
    result = [sp.Integer(1)] + [sp.Integer(0)] * len(values)
    for value in values:
        for j in range(len(values), 0, -1):
            result[j] += value * result[j - 1]
    return result


def shift(poly: sp.Poly, amount: int) -> sp.Poly:
    return sp.Poly(sp.expand(poly.as_expr().subs(X, X + amount)), X)


def normalized_pochhammer_source(poly: sp.Poly, parameter: int) -> sp.Poly:
    """Map sum A_j (x)_j to sum A_j (parameter)_j z^j."""
    current = poly
    coefficients: list[sp.Expr] = []
    for j in range(poly.degree() + 1):
        coefficients.append(sp.cancel(current.eval(0) / sp.factorial(j)))
        current = sp.Poly(
            sp.expand(current.as_expr().subs(X, X + 1) - current.as_expr()), X
        )
    return sp.Poly(
        sp.expand(
            sum(coefficients[j] * sp.rf(parameter, j) * Z**j for j in range(len(coefficients)))
        ),
        Z,
    )


def symbolic_normalized_pochhammer_identity(maximum_degree: int = 6) -> dict[str, object]:
    B, u, v = sp.symbols("B u v")
    checked = []
    for degree in range(maximum_degree + 1):
        q = sp.symbols(f"q0:{degree + 1}")
        source = sum(q[j] * Z**j for j in range(degree + 1))
        H = sp.Poly(
            sp.expand(
                sum(q[j] / sp.rf(B + 2, j) * falling(j) for j in range(degree + 1))
            ),
            X,
        )
        J, T = two_steps(H, B, u, v)
        transformed = normalized_pochhammer_source(T, B)
        target = sp.Poly(
            sp.expand(B * (B + 1) * (4 * Z + u) * (4 * Z + v) * source), Z
        )
        assert transformed.degree() == target.degree()
        assert all(
            sp.cancel(left - right) == 0
            for left, right in zip(transformed.all_coeffs(), target.all_coeffs())
        )
        checked.append(degree)
    return {"generic_source_degrees": checked, "maximum_degree": maximum_degree}


def structured_h(B: int, negative_parameters: list[sp.Rational]) -> sp.Poly:
    r = len(negative_parameters)
    e = elementary([-c for c in negative_parameters])
    value = sum(
        e[r - j] * 4**j / sp.rf(B + 2, j) * falling(j)
        for j in range(r + 1)
    )
    return sp.Poly(sp.expand(value), X)


def two_steps(
    H: sp.Poly, B: int, u: sp.Rational, v: sp.Rational
) -> tuple[sp.Poly, sp.Poly]:
    J = sp.Poly(
        sp.expand(
            u * (X + B + 1) * H.as_expr()
            + (4 - u) * X * shift(H, -1).as_expr()
        ),
        X,
    )
    T = sp.Poly(
        sp.expand(
            v * (X + B) * J.as_expr()
            + (4 - v) * X * shift(J, -1).as_expr()
        ),
        X,
    )
    return J, T


def rational_interval(interval: tuple[sp.Expr, sp.Expr]) -> tuple[sp.Rational, sp.Rational]:
    left, right = interval
    return sp.Rational(left), sp.Rational(right)


def real_intervals(poly: sp.Poly, digits: int = 26) -> list[tuple[sp.Rational, sp.Rational]]:
    raw = poly.intervals(eps=sp.Rational(1, 10**digits))
    result: list[tuple[sp.Rational, sp.Rational]] = []
    for interval, multiplicity in raw:
        assert multiplicity == 1
        result.append(rational_interval(interval))
    return result


def positive(interval: tuple[sp.Rational, sp.Rational]) -> bool:
    return interval[0] > 0


def negative(interval: tuple[sp.Rational, sp.Rational]) -> bool:
    return interval[1] < 0


def lower_product(intervals: list[tuple[sp.Rational, sp.Rational]]) -> sp.Rational:
    return sp.prod((left for left, _ in intervals), start=sp.Integer(1))


def upper_product(intervals: list[tuple[sp.Rational, sp.Rational]]) -> sp.Rational:
    return sp.prod((right for _, right in intervals), start=sp.Integer(1))


def audit_case(
    B: int,
    u: sp.Rational,
    v: sp.Rational,
    negative_parameters: list[sp.Rational],
) -> dict[str, object]:
    r = len(negative_parameters)
    assert B >= 3 * r + 4
    assert 0 < u <= 1 and 0 < v <= 1
    assert all(c > 0 for c in negative_parameters)

    H = structured_h(B, negative_parameters)
    J, T = two_steps(H, B, u, v)
    source = sp.Poly(
        sp.expand(sp.prod((4 * Z - c for c in negative_parameters), start=sp.Integer(1))),
        Z,
    )
    assert normalized_pochhammer_source(H, B + 2) == source
    assert normalized_pochhammer_source(T, B) == sp.Poly(
        sp.expand(B * (B + 1) * (4 * Z + u) * (4 * Z + v) * source.as_expr()),
        Z,
    )
    h_intervals = real_intervals(H)
    j_intervals = real_intervals(J)
    t_intervals = real_intervals(T)

    assert len(h_intervals) == r and all(map(positive, h_intervals))
    q_intervals = [interval for interval in j_intervals if negative(interval)]
    eta_intervals = [interval for interval in j_intervals if positive(interval)]
    alpha_intervals = [interval for interval in t_intervals if positive(interval)]
    assert len(q_intervals) == 1
    assert len(eta_intervals) == r
    assert len(alpha_intervals) >= r
    alpha_intervals = alpha_intervals[-r:]

    q_left, q_right = q_intervals[0]
    q_floor = -u * (B + 1) / 4
    assert q_left > q_floor and q_right < 0

    # A one-sided rational enclosure proves the normalized transfer bound.
    alpha_over_eta_lower = sp.cancel(
        lower_product(alpha_intervals) / upper_product(eta_intervals)
    )
    transfer_upper = sp.cancel(4 * v * (-q_left) / (B + 1))
    assert alpha_over_eta_lower > transfer_upper

    # The same target after eliminating q and eta by J(0).  The stronger
    # rootwise comparison is audited here but is not claimed as proved.
    alpha_over_xi_lower = sp.cancel(
        lower_product(alpha_intervals) / upper_product(h_intervals)
    )
    assert alpha_over_xi_lower > u * v
    rootwise_margins = [
        alpha_intervals[index][0] - u * v * h_intervals[index][1]
        for index in range(r)
    ]
    assert all(margin > 0 for margin in rootwise_margins)

    # Coefficient identities behind the Vieta reduction.
    assert sp.cancel(J.LC() / H.LC()) == 4
    assert sp.cancel(T.LC() / J.LC()) == 4
    assert sp.cancel(T.eval(0) / J.eval(0)) == v * B
    assert sp.cancel(J.eval(0) / H.eval(0)) == u * (B + 1)

    margin = sp.cancel(alpha_over_eta_lower - transfer_upper)
    return {
        "r": r,
        "B": B,
        "u": str(u),
        "v": str(v),
        "negative_parameters": list(map(str, negative_parameters)),
        "q_interval": [str(q_left), str(q_right)],
        "q_floor": str(q_floor),
        "positive_roots_J": len(eta_intervals),
        "positive_roots_T": len([i for i in t_intervals if positive(i)]),
        "transfer_margin_lower_bound": str(margin),
        "direct_product_margin_lower_bound": str(alpha_over_xi_lower - u * v),
        "minimum_rootwise_margin_lower_bound": str(min(rootwise_margins)),
    }


def deterministic_cases() -> list[tuple[int, sp.Rational, sp.Rational, list[sp.Rational]]]:
    pool = [
        sp.Rational(1, 50),
        sp.Rational(1, 7),
        sp.Rational(1, 2),
        sp.Integer(2),
        sp.Integer(5),
        sp.Integer(17),
    ]
    uv = [
        (sp.Rational(1, 20), sp.Rational(1, 5)),
        (sp.Rational(1, 4), sp.Rational(2, 3)),
        (sp.Rational(1, 2), sp.Rational(1, 2)),
        (sp.Rational(3, 4), sp.Rational(1, 3)),
        (sp.Integer(1), sp.Rational(4, 5)),
        (sp.Integer(1), sp.Integer(1)),
    ]
    result = []
    for r in range(1, 8):
        for case_index, (u, v) in enumerate(uv):
            B = 3 * r + 4 + (0, 1, 5)[case_index % 3]
            values = [pool[(2 * j + case_index + r) % len(pool)] for j in range(r)]
            result.append((B, u, v, values))
    return result


def stronger_v_only_counterexample() -> dict[str, object]:
    B = 10
    u = sp.Rational(1, 20)
    v = sp.Rational(1, 5)
    H = structured_h(B, [sp.Rational(1, 50), sp.Integer(5)])
    J, T = two_steps(H, B, u, v)
    eta = [i for i in real_intervals(J) if positive(i)]
    alpha = [i for i in real_intervals(T) if positive(i)][-2:]
    ratio_upper = sp.cancel(upper_product(alpha) / lower_product(eta))
    assert ratio_upper < v
    return {
        "B": B,
        "u": str(u),
        "v": str(v),
        "negative_parameters": ["1/50", "5"],
        "certified_product_ratio_upper_bound": str(ratio_upper),
        "failed_stronger_bound": "prod(alpha)/prod(eta) >= v",
    }


def arbitrary_mesh_counterexample() -> dict[str, object]:
    """Certify that positive roots and mesh one alone do not suffice."""
    B = 10
    u = sp.Rational(1, 100)
    v = sp.Rational(1, 2)
    H = sp.Poly((X - 1) * (X - 2), X)
    _, T = two_steps(H, B, u, v)
    alpha = [interval for interval in real_intervals(T) if positive(interval)]
    assert len(alpha) == 2
    ratio_upper = sp.cancel(upper_product(alpha) / 2)
    assert ratio_upper < u * v
    return {
        "H": "(x-1)(x-2)",
        "mesh": 1,
        "B": B,
        "u": str(u),
        "v": str(v),
        "certified_product_ratio_upper_bound": str(ratio_upper),
        "failed_bound": "prod(alpha_i)/prod(xi_i) >= u v",
        "conclusion": "the F_(B+2) normalized-Pochhammer structure is essential",
    }


def main() -> None:
    symbolic_identity = symbolic_normalized_pochhammer_identity()
    records = [audit_case(*case) for case in deterministic_cases()]
    counterexample = stronger_v_only_counterexample()
    mesh_counterexample = arbitrary_mesh_counterexample()
    payload = {
        "kind": "window_negative_root_product_transfer_reduction_exact",
        "status": "PASS_EXACT_REDUCTION_AND_ALGEBRAIC_TRANSFER_AUDIT",
        "proved": [
            "L_(B+2)(H)=prod_i(4z-c_i) and L_B(T)=B(B+1)(4z+u)(4z+v)prod_i(4z-c_i)",
            "the first-step negative root satisfies -u(B+1)/4 < q < 0",
            "D = v B (-q)/4 * prod(eta_i)/prod(alpha_i)",
            "D <= B(B+1)/16 iff prod(alpha_i)/prod(eta_i) >= 4v(-q)/(B+1)",
            "the same target is equivalent to prod(alpha_i) >= u v prod(xi_i)",
        ],
        "symbolic_normalized_pochhammer_identity": symbolic_identity,
        "remaining_lemma": (
            "prove prod(alpha_i) >= u v prod(xi_i) for every structured "
            "H=F_(B+2) in the admissible reserve B>=3r+4"
        ),
        "finite_exact_audit": {
            "case_count": len(records),
            "maximum_negative_parameter_count": max(record["r"] for record in records),
            "records": records,
        },
        "counterexample_to_stronger_v_only_bound": counterexample,
        "counterexample_to_arbitrary_mesh_generalization": mesh_counterexample,
    }
    encoded = json.dumps(payload, indent=2) + "\n"
    REPORT.write_text(encoded, encoding="utf-8")
    digest = hashlib.sha256(encoded.encode("utf-8")).hexdigest()
    print(json.dumps({"status": payload["status"], "sha256": digest}, indent=2))
    print(REPORT)


if __name__ == "__main__":
    main()
