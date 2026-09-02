#!/usr/bin/env python3
"""Memory-lean independent audit of the all-rank right gap-1 theorem.

The coefficient rows are reconstructed by exact slack-array convolution.
Unlike the earlier replay, every projective chart substitution is expanded
directly on sparse monomial dictionaries.  This avoids SymPy's very large
temporary expression trees while preserving the exact Bernstein arrays and
their ordered hashes.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import pickle
from pathlib import Path

import sympy as sp

import audit_uniform_low_high_right_gap1_slack_independent_root as audit
import audit_uniform_low_high_right_gap1_slack_independent_convolution_root as convolution


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_right_gap1_slack_independent_sparse_audit_root_20260827.json"
HELPER_SHA256 = "616E75B679C63AE959B88EEE19CAB734BBA1CACDCAE763BC043EF19D17A19852"
CONVOLUTION_SHA256 = "1C983D9E15003394CC898939F84F93FFB2E5D36847425E11A6C41AF9E3C0D154"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def add_term(mapping, monomial, value):
    if not value:
        return
    updated = mapping.get(monomial, sp.S.Zero) + value
    if updated:
        mapping[monomial] = updated
    elif monomial in mapping:
        del mapping[monomial]


def poly_from_mapping(mapping, generators):
    cleaned = {monomial: coefficient for monomial, coefficient in mapping.items()
               if coefficient}
    return sp.Poly.from_dict(cleaned, generators)


def compactify_sparse(polynomial, u, x, U, X):
    """Apply u=U/(1-U), x=X/(1-X) by direct binomial expansion."""
    du, dx, _ = map(int, polynomial.degree_list())
    result = {}
    for (eu, ex, er), coefficient in polynomial.terms():
        for iu in range(du - eu + 1):
            cu = (-1) ** iu * math.comb(du - eu, iu)
            for ix in range(dx - ex + 1):
                cx = (-1) ** ix * math.comb(dx - ex, ix)
                add_term(result, (eu + iu, ex + ix, er), coefficient * cu * cx)
    return poly_from_mapping(result, (U, X, polynomial.gens[2]))


def chart_r_at_most_a_sparse(polynomial, A, Q, X):
    """Apply U=1-A, r=A*Q to P(U,X,r)."""
    result = {}
    for (eU, eX, er), coefficient in polynomial.terms():
        for index in range(eU + 1):
            add_term(
                result,
                (index + er, er, eX),
                coefficient * (-1) ** index * math.comb(eU, index),
            )
    return poly_from_mapping(result, (A, Q, X))


def chart_a_at_most_r_sparse(polynomial, R, Q, X):
    """Apply U=1-R*Q, r=R to P(U,X,r)."""
    result = {}
    for (eU, eX, er), coefficient in polynomial.terms():
        for index in range(eU + 1):
            add_term(
                result,
                (index + er, index, eX),
                coefficient * (-1) ** index * math.comb(eU, index),
            )
    return poly_from_mapping(result, (R, Q, X))


def chart_q_at_most_one_minus_r_sparse(polynomial, B, T, X):
    """Apply R=1-B, Q=B*T to P(R,Q,X)."""
    result = {}
    for (eR, eQ, eX), coefficient in polynomial.terms():
        for index in range(eR + 1):
            add_term(
                result,
                (index + eQ, eQ, eX),
                coefficient * (-1) ** index * math.comb(eR, index),
            )
    return poly_from_mapping(result, (B, T, X))


def chart_one_minus_r_at_most_q_sparse(polynomial, S, T, X):
    """Apply R=1-S*T, Q=S to P(R,Q,X)."""
    result = {}
    for (eR, eQ, eX), coefficient in polynomial.terms():
        for index in range(eR + 1):
            add_term(
                result,
                (index + eQ, index, eX),
                coefficient * (-1) ** index * math.comb(eR, index),
            )
    return poly_from_mapping(result, (S, T, X))


def remove_axis_factor_sparse(polynomial):
    power = min(monomial[0] for monomial, _ in polynomial.terms())
    mapping = {
        (monomial[0] - power, *monomial[1:]): coefficient
        for monomial, coefficient in polynomial.terms()
    }
    return int(power), poly_from_mapping(mapping, polynomial.gens)


def self_test_sparse_transforms(u, x, r, U, X, A, Q, R, B, S, T):
    """Compare every sparse substitution with the literal symbolic formula."""
    base = sp.Poly(
        3 * u**3 * x**2 * r**2 - 5 * u * x**4 * r + 7 * u**2
        + 11 * x * r**3 + 13,
        u, x, r,
    )
    compact_sparse = compactify_sparse(base, u, x, U, X)
    compact_literal = audit.compactify_direct(base, u, x, U, X)
    assert compact_sparse == compact_literal

    literal_r_le_a = sp.Poly(
        sp.expand(compact_literal.as_expr().subs({U: 1 - A, r: A * Q})),
        A, Q, X,
    )
    assert chart_r_at_most_a_sparse(compact_sparse, A, Q, X) == literal_r_le_a
    literal_a_le_r = sp.Poly(
        sp.expand(compact_literal.as_expr().subs({U: 1 - R * Q, r: R})),
        R, Q, X,
    )
    sparse_a_le_r = chart_a_at_most_r_sparse(compact_sparse, R, Q, X)
    assert sparse_a_le_r == literal_a_le_r
    literal_q_le_b = sp.Poly(
        sp.expand(literal_a_le_r.as_expr().subs({R: 1 - B, Q: B * T})),
        B, T, X,
    )
    assert chart_q_at_most_one_minus_r_sparse(sparse_a_le_r, B, T, X) == literal_q_le_b
    literal_b_le_q = sp.Poly(
        sp.expand(literal_a_le_r.as_expr().subs({R: 1 - S * T, Q: S})),
        S, T, X,
    )
    assert chart_one_minus_r_at_most_q_sparse(sparse_a_le_r, S, T, X) == literal_b_le_q


def main() -> int:
    assert sha256(HERE / "audit_uniform_low_high_right_gap1_slack_independent_root.py") == HELPER_SHA256
    assert sha256(HERE / "audit_uniform_low_high_right_gap1_slack_independent_convolution_root.py") == CONVOLUTION_SHA256
    pinned_hashes = {}
    for name, expected in audit.PINNED.items():
        actual = sha256(HERE / name)
        assert actual == expected, (name, actual)
        pinned_hashes[name] = actual
    producer = json.loads((HERE / "uniform_low_high_right_gap1_slack_exact_root_20260827.json").read_text(encoding="utf-8"))
    probe = json.loads((HERE / "uniform_low_high_right_gap1_slack_symbolic_fast_probe_root_20260827.json").read_text(encoding="utf-8"))
    left_report = json.loads((HERE / "uniform_low_high_right_gap1_left_payments_exact_root_20260827.json").read_text(encoding="utf-8"))
    right_report = json.loads((HERE / "uniform_low_high_right_gap1_right_payments_exact_root_20260827.json").read_text(encoding="utf-8"))
    zero = json.loads((HERE / "uniform_low_high_zero_slack_two_parameter_strong_boundary_independent_audit_root_20260826.json").read_text(encoding="utf-8"))
    assert producer["status"] == "PASS_EXACT_ALL_RANK_RIGHT_GAP1_SLACK_STRONG_BOUNDARY"
    assert probe["status"] == "PASS_EXACT_RIGHT_GAP1_SLACK_MEMORY_LEAN_COEFFICIENT_PROBE"
    assert left_report["status"] == "PASS_EXACT_ALL_RANK_RIGHT_GAP1_LEFT_PRODUCT_PAYMENTS"
    assert right_report["status"] == "PASS_EXACT_ALL_RANK_RIGHT_GAP1_RIGHT_PRODUCT_PAYMENTS"
    assert zero["status"] == "PASS_INDEPENDENT_EXACT_ALL_RANK_TWO_PARAMETER_ZERO_SLACK_STRONG_BOUNDARY_AUDIT"

    k, x, y, s = sp.symbols("k x y s", real=True)
    u, z, r = sp.symbols("u z r", nonnegative=True)
    U, X, A, Q, R, B, S, T = sp.symbols(
        "U X A Q R B S T", nonnegative=True
    )
    self_test_sparse_transforms(u, x, r, U, X, A, Q, R, B, S, T)
    print("PASS sparse substitution self-test", flush=True)
    N, M = k + x, k + y
    rows = convolution.build_rows_by_convolution(k, x, y, s)
    cache_hashes = {}
    for label, (name, expected) in audit.CACHES.items():
        path = HERE / name
        assert sha256(path) == expected
        cache_hashes[name] = expected
        with path.open("rb") as stream:
            cached = pickle.load(stream)
        assert set(cached) == set(audit.PRODUCTS)
        for product in audit.PRODUCTS:
            assert sp.cancel(rows[label][product] - cached[product]) == 0, (label, product)
        assert rows[label][("T", "T")] == 0
    print("PASS sparse independent quartic reconstruction", flush=True)

    left_certificates = {}
    for label in ("s1", "s2", "s3", "s4"):
        alpha = rows[label][("T", "L")]
        epsilon = rows[label][("L", "L")]
        total = sp.cancel(alpha + epsilon)
        summary = {
            "alpha_plus_epsilon": audit.rational_positive_summary(
                total.subs(k, u + 8), (u, x, y)
            )
        }
        if label == "s1":
            summary["alpha"] = audit.rational_positive_summary(
                alpha.subs(k, u + 8), (u, x, y)
            )
            summary["payment_identity"] = (
                "alpha*U+epsilon=(alpha+epsilon)+alpha*(U-1)>0"
            )
        else:
            summary["epsilon"] = audit.rational_positive_summary(
                epsilon.subs(k, u + 8), (u, x, y)
            )
            reserve = sp.cancel((x + M + 2) * total - epsilon * (k - 1) * M)
            summary["union_bound_reserve"] = audit.rational_positive_summary(
                reserve.subs(k, u + 8), (u, x, y)
            )
            summary["payment_identity"] = (
                "alpha*U+epsilon=U*((alpha+epsilon)-epsilon*(1-1/U))>0"
            )
        assert summary == left_report["coefficient_certificates"][label]
        left_certificates[label] = summary
        print("PASS sparse independent left payment", label, flush=True)

    def right_pieces(label):
        return (
            rows[label][("T", "R")],
            -rows[label][("L", "R")],
            -rows[label][("R", "R")],
        )

    beta4, _, delta4 = right_pieces("s4")
    scales = {
        "s1": 4 * M,
        "s2": 2 * (3 * M**2 - 1),
        "s3": 4 * M,
        "s4": sp.S.One,
    }
    for label, scale in scales.items():
        beta, _, delta = right_pieces(label)
        assert sp.cancel(beta - scale * beta4) == 0
        assert sp.cancel(delta - scale * delta4) == 0
    denominator = (y + 2) * (y + 3)
    beta_prefactor = N * (N - 1) * (N + 1) * (M + 1) ** 2 / (2 * denominator)
    difference_prefactor = N**2 * (N + 1) * (M + 1) ** 2 / (2 * denominator)
    universal = {}
    for name, kernel, leading in (
        ("beta", sp.cancel(beta4 / beta_prefactor), 2 * N),
        ("beta_minus_delta", sp.cancel((beta4 - delta4) / difference_prefactor), 2 * (N - 2)),
    ):
        polynomial = sp.Poly(kernel, y)
        aa, bb, cc = polynomial.all_coeffs()
        assert polynomial.degree() == 2 and sp.expand(aa - leading) == 0
        universal[name] = audit.sparse_positive_summary(
            sp.factor(4 * aa * cc - bb**2).subs(k, u + 8), (u, x)
        )
        assert universal[name] == right_report["universal_beta_and_delta"]["negative_discriminant_certificates"][name]
    delta_kernel = sp.cancel(
        delta4 * denominator / (N * (N + 1) * (M + 1) ** 3)
    )
    delta_summary = audit.sparse_positive_summary(
        sp.fraction(delta_kernel)[0].subs(k, u + 8), (u, x, y)
    )
    assert delta_summary == right_report["universal_beta_and_delta"]["delta_positive"]
    print("PASS sparse independent universal right signs", flush=True)

    right_certificates = {}
    for label in ("s1", "s2", "s3", "s4"):
        beta, gamma, delta = right_pieces(label)
        high = sp.cancel(beta * (1 + (k - 1) * M / N) - gamma - delta)
        high_numerator, high_denominator = sp.fraction(high)
        high_summary = audit.sparse_positive_summary(
            high_numerator.subs({k: u + 8, x: y + z}), (u, y, z)
        )
        expected_high = right_report["coefficient_certificates"][label]["x_at_least_y"]
        assert str(sp.factor(high_denominator)) == expected_high["positive_denominator"]
        assert high_summary == expected_high["sparse_certificate"]

        lower = 1 + (k - 1) * r + (k - 1) * (k - 2) * r**2 / 2
        common_power = 1 if label == "s1" else 2
        common = N * (N + 1) * (M + 1) ** common_power / (
            2 * (x + 2) * (y + 2) * (y + 3)
        )
        if label in ("s1", "s3"):
            common *= M
        reduced = sp.cancel((beta * lower - delta - gamma * r**7) / common)
        substituted = sp.cancel(reduced.subs(y, N / r - k))
        low_numerator, low_denominator = sp.fraction(substituted)
        base = sp.Poly(sp.expand(low_numerator.subs(k, u + 8)), u, x, r)
        compact = compactify_sparse(base, u, x, U, X)

        factor_a, chart_r_le_a = remove_axis_factor_sparse(
            chart_r_at_most_a_sparse(compact, A, Q, X)
        )
        factor_r, chart_a_le_r = remove_axis_factor_sparse(
            chart_a_at_most_r_sparse(compact, R, Q, X)
        )
        factor_b, chart_q_le_b = remove_axis_factor_sparse(
            chart_q_at_most_one_minus_r_sparse(chart_a_le_r, B, T, X)
        )
        factor_s, chart_b_le_q = remove_axis_factor_sparse(
            chart_one_minus_r_at_most_q_sparse(chart_a_le_r, S, T, X)
        )
        low_summary = {
            "ratio_lower_degree": 2,
            "W_upper_bound": "((x+k)/(y+k))^7",
            "positive_denominator": str(sp.factor(low_denominator)),
            "projective_degrees": list(map(int, compact.degree_list())),
            "r_at_most_a_chart": {
                "removed_a_power": factor_a,
                **audit.chart_summary(chart_r_le_a),
            },
            "a_at_most_r_chart": {
                "removed_r_power": factor_r,
                "q_at_most_one_minus_r_chart": {
                    "removed_one_minus_r_power": factor_b,
                    **audit.chart_summary(chart_q_le_b),
                },
                "one_minus_r_at_most_q_chart": {
                    "removed_q_power": factor_s,
                    **audit.chart_summary(chart_b_le_q),
                },
            },
        }
        expected_low = right_report["coefficient_certificates"][label]["y_at_least_x"]
        assert low_summary == expected_low
        right_certificates[label] = {
            "x_at_least_y": {
                "positive_denominator": str(sp.factor(high_denominator)),
                "sparse_certificate": high_summary,
            },
            "y_at_least_x": low_summary,
        }
        print("PASS sparse independent right payment", label, flush=True)

    direct_checks = []
    for rank, x_value, y_value in (
        (8, 0, 0), (8, 19, 4), (9, 1, 37), (11, 23, 2),
        (14, 0, 61), (18, 41, 9), (24, 5, 33), (31, 17, 0),
    ):
        samples = [audit.direct_strong(rank, x_value, y_value, slack)
                   for slack in range(5)]
        polynomial = sp.Poly(
            sp.interpolate([(index, value) for index, value in enumerate(samples)], s), s
        )
        coefficients = [polynomial.coeff_monomial(s**degree) for degree in range(5)]
        assert all(value > 0 for value in coefficients)
        products = {
            "T": math.prod(x_value + y_value + rank + j for j in range(2, rank + 1)),
            "L": math.prod(x_value + j for j in range(2, rank + 1)),
            "R": math.prod(y_value + j for j in range(2, rank + 1)),
        }
        D_value = (rank + y_value) ** 2 - 1
        substitutions = {k: rank, x: x_value, y: y_value}
        for degree in range(1, 5):
            reconstructed = sum(
                expression.subs(substitutions) * products[first] * products[second]
                for (first, second), expression in rows[f"s{degree}"].items()
            )
            scale = (rank + x_value) ** 2 * (rank + y_value) ** 2
            scale *= D_value if degree == 1 else D_value**2
            assert sp.cancel(reconstructed - coefficients[degree] * scale) == 0
        assert audit.direct_strong(rank, x_value, y_value, 7) == polynomial.eval(7)
        direct_checks.append({
            "rank": rank,
            "x": x_value,
            "y": y_value,
            "quartic_power_coefficients": [str(value) for value in coefficients],
        })
    print("PASS sparse independent direct evaluations", len(direct_checks), flush=True)

    payload = {
        "schema": "uniform-low-high-right-gap1-slack-independent-sparse-audit-root-v1",
        "status": "PASS_INDEPENDENT_EXACT_ALL_RANK_RIGHT_GAP1_SLACK_SPARSE_AUDIT",
        "theorem": producer["theorem"],
        "independent_reconstruction": {
            "method": (
                "exact convolution of degree-two slack arrays plus direct sparse "
                "monomial substitutions for all projective charts"
            ),
            "cache_comparisons": 24,
            "constant_term": "pinned independent two-parameter zero-slack audit",
        },
        "independent_left_certificates": left_certificates,
        "independent_right_certificates": right_certificates,
        "independent_direct_checks": direct_checks,
        "pinned_sha256": pinned_hashes,
        "cache_sha256": cache_hashes,
        "helper_source_sha256": HELPER_SHA256,
        "convolution_source_sha256": CONVOLUTION_SHA256,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": (
            "This independently closes only the second ordinary right-row gap "
            "coordinate on the translated low/high boundary; it is not a proof "
            "of the full Erdos problem."
        ),
    }
    temporary = OUTPUT.with_suffix(OUTPUT.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, OUTPUT)
    print(payload["status"], flush=True)
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(OUTPUT), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
