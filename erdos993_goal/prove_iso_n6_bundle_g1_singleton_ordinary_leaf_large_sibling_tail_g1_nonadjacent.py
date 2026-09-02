#!/usr/bin/env python3
"""All-order large-sibling tail for the singleton-ordinary G1 leaf delta.

With H=(1+x)^t R and K=R-q, expand the complete canonical leaf increment
in binom(t,j), j=0..7.  Exact termwise forest envelopes for all eight
coefficients combine to a nonnegative polynomial after

    n = 84+h,  t = 11n/10+s,  h,s >= 0,

and checks the finitely many smaller core orders by the same universal forest
envelopes at t=ceil(11n/10)+s.  Thus the complete increment is nonnegative
for every possible core order whenever 10t>=11n, in both p=q and p!=q cases.
The complementary region remains open.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent import (
    build_expressions,
    symbolic_rows,
)
from derive_iso_n4_bundle_polynomial_root import binomial_basis, isolate_multiply
from prove_iso_n6_bundle_g1_singleton_ordinary_leaf_sibling_isolate_top4_g1_nonadjacent import (
    choose,
    expression_summary,
    replace_rows,
    row_order,
    shifted_power_nonnegative,
    structural,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_large_sibling_tail_exact_"
    "g1_nonadjacent_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_LARGE_"
    "SIBLING_TAIL_G1_NONADJACENT"
)
PINNED = {
    "top4_source": (
        "prove_iso_n6_bundle_g1_singleton_ordinary_leaf_sibling_isolate_top4_g1_nonadjacent.py",
        "70DBDEB0505D2E443AF28039254DD4304ED89DEEFB723401682EA44F8A9DABC8",
    ),
    "top4_report": (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_sibling_isolate_top4_exact_g1_nonadjacent_20260831.json",
        "4AD8CAF68D9DBC2ED07DD47DD1EC86F1A447A3970F1C6BD426F6A4A95530AA14",
    ),
    "leaf_expression_source": (
        "census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent.py",
        "2474323FFAB6D3FBFAC99926E298C698F4C93398D5E0FC7467F18E97F8363126",
    ),
    "binomial_algebra_source": (
        "derive_iso_n4_bundle_polynomial_root.py",
        "F312FB481C76129380823CFC5E1FA6BB2B7D794846136A14477FCC9245D8870E",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coefficient_envelope(expression, n, minimum):
    """Termwise lower envelope, without requiring each coefficient positive."""
    row_variables = tuple(sorted(
        (symbol for symbol in expression.free_symbols if symbol != n), key=str
    ))
    if not row_variables:
        return expression, {
            "positive_coefficient_monomials": 1,
            "negative_coefficient_monomials": 0,
            "positive_product_monomials": 0,
        }
    polynomial = sp.Poly(expression, *row_variables)
    pieces = []
    positive = negative = positive_products = 0
    for exponents, coefficient in polynomial.terms():
        if shifted_power_nonnegative(coefficient, n, minimum):
            direction = 1
            positive += 1
        elif shifted_power_nonnegative(-coefficient, n, minimum):
            direction = -1
            negative += 1
        else:
            raise AssertionError(f"coefficient sign not certified: {coefficient}")
        row_degree = sum(exponents)
        if direction > 0 and row_degree > 1:
            positive_products += 1
        term = coefficient
        for variable, exponent in zip(row_variables, exponents):
            if not exponent:
                continue
            order, rank = row_order(variable, n)
            upper = choose(order, rank)
            lower = sp.expand(
                upper - (order - 1) * choose(order - 2, rank - 2)
            )
            if direction > 0 and row_degree > 1:
                assert shifted_power_nonnegative(lower, n, minimum), (
                    variable, lower
                )
            term *= (lower if direction > 0 else upper) ** exponent
        pieces.append(term)
    return sp.factor(sp.expand(sum(pieces))), {
        "positive_coefficient_monomials": positive,
        "negative_coefficient_monomials": negative,
        "positive_product_monomials": positive_products,
    }


def fixed_order_coefficient_envelope(expression, n, order_value):
    """Numeric-order version, using max(0, union lower) for products."""
    value = sp.expand(expression.subs(n, order_value))
    row_variables = tuple(sorted(value.free_symbols, key=str))
    if not row_variables:
        return value
    polynomial = sp.Poly(value, *row_variables)
    pieces = []
    for exponents, coefficient in polynomial.terms():
        assert coefficient != 0
        direction = 1 if coefficient > 0 else -1
        row_degree = sum(exponents)
        term = coefficient
        for variable, exponent in zip(row_variables, exponents):
            if not exponent:
                continue
            symbolic_order, rank = row_order(variable, n)
            actual_order = int(symbolic_order.subs(n, order_value))
            assert actual_order >= 0 and rank >= 0
            upper = sp.binomial(actual_order, rank)
            lower = (
                upper
                - max(actual_order - 1, 0)
                * sp.binomial(max(actual_order - 2, 0), rank - 2)
            )
            if direction > 0 and row_degree > 1:
                lower = max(sp.Integer(0), lower)
            term *= (lower if direction > 0 else upper) ** exponent
        pieces.append(term)
    return sp.expand(sum(pieces))


def main():
    for _label, (name, expected) in PINNED.items():
        assert sha256(HERE / name) == expected

    t = sp.Symbol("t", integer=True, nonnegative=True)
    n = sp.Symbol("n", integer=True, positive=True)
    h, s = sp.symbols("h s", integer=True, nonnegative=True)
    components = build_expressions()
    complete = sp.expand(
        components["g2"] + components["F"] + components["QHL"]
        + components["QHJ"] + components["QKJ"] + components["T"]
    )
    rrows, srows, xrows, yrows = (
        symbolic_rows(prefix) for prefix in ("R", "S", "X", "Y")
    )
    collision = replace_rows(
        complete,
        H=isolate_multiply(rrows, t, 7),
        K=srows,
        J=isolate_multiply(srows, t, 7),
        L=srows,
    )
    collision = sp.expand(
        collision.subs(structural(rrows, n) | structural(srows, n - 1))
    )
    distinct = replace_rows(
        complete,
        H=isolate_multiply(rrows, t, 7),
        K=srows,
        J=isolate_multiply(xrows, t, 7),
        L=yrows,
    )
    distinct = sp.expand(distinct.subs(
        structural(rrows, n) | structural(srows, n - 1)
        | structural(xrows, n - 1) | structural(yrows, n - 2)
    ))
    coefficient_blocks = {
        "collision": binomial_basis(collision, t),
        "distinct": binomial_basis(distinct, t),
    }
    assert all(len(values) == 8 for values in coefficient_blocks.values())

    expected_envelopes = {
        "collision": (
            -(223*n**7 - 1960*n**6 - 4313*n**5 + 91730*n**4 - 268838*n**3
              - 108670*n**2 + 1467588*n - 1605600) / 360,
            -(161*n**6 - 1649*n**5 + 4240*n**4 + 8915*n**3 - 59841*n**2
              + 97194*n - 52500) / 60,
            -(25*n**5 - 140*n**4 - 367*n**3 + 2444*n**2 - 1938*n - 2406) / 6,
            -(57*n**4 - 1130*n**3 + 2031*n**2 + 584*n - 5544) / 6,
            (314*n**3 + 1287*n**2 + 3493*n - 240) / 6,
            (467*n**2 + 2173*n + 1444) / 2,
            7*(93*n + 203),
            sp.Integer(714),
        ),
        "distinct": (
            -(223*n**7 - 1960*n**6 - 4229*n**5 + 78560*n**4 - 101978*n**3
              - 905320*n**2 + 3120624*n - 2857680) / 360,
            -(161*n**6 - 1519*n**5 + 4165*n**4 - 5335*n**3 + 37884*n**2
              - 145156*n + 153960) / 60,
            -(25*n**5 - n**4 - 1762*n**3 + 7672*n**2 - 11310*n + 5304) / 6,
            -(57*n**4 - 923*n**3 + 1140*n**2 + 140*n - 2448) / 6,
            (314*n**3 + 1041*n**2 + 4543*n - 696) / 6,
            (467*n**2 + 2163*n + 1498) / 2,
            7*(93*n + 203),
            sp.Integer(714),
        ),
    }
    records = {}
    low_order_records = {}
    for mode, coefficients in coefficient_blocks.items():
        envelopes = []
        audits = []
        for index, coefficient in enumerate(coefficients):
            envelope, audit = coefficient_envelope(coefficient, n, 84)
            assert sp.expand(envelope - expected_envelopes[mode][index]) == 0
            envelopes.append(envelope)
            audits.append(audit)
        total_lower = sp.expand(sum(
            choose(t, index) * envelope
            for index, envelope in enumerate(envelopes)
        ))
        shifted = sp.Poly(sp.expand(total_lower.subs({
            n: 84 + h,
            t: sp.Rational(11, 10) * (84 + h) + s,
        })), h, s)
        shifted_coefficients = shifted.coeffs()
        assert len(shifted_coefficients) == 36
        assert all(value >= 0 for value in shifted_coefficients)
        assert min(shifted_coefficients) == sp.Rational(8692163, 1800000000)
        records[mode] = {
            "coefficient_envelopes": [str(sp.factor(value)) for value in envelopes],
            "termwise_audits": audits,
            "complete_lower_sha256": hashlib.sha256(
                sp.srepr(total_lower).encode()
            ).hexdigest().upper(),
            "shifted_tail_terms": len(shifted_coefficients),
            "shifted_tail_minimum_scalar_coefficient": "8692163/1800000000",
            "shifted_tail_polynomial_sha256": hashlib.sha256(
                sp.srepr(shifted.as_expr()).encode()
            ).hexdigest().upper(),
            "all_shifted_tail_scalar_coefficients_nonnegative": True,
        }
        first_order = 3 if mode == "collision" else 4
        stream = hashlib.sha256()
        rows = []
        for order_value in range(first_order, 84):
            fixed_envelopes = [
                fixed_order_coefficient_envelope(value, n, order_value)
                for value in coefficients
            ]
            fixed_total = sp.expand(sum(
                choose(t, index) * envelope
                for index, envelope in enumerate(fixed_envelopes)
            ))
            threshold = (11 * order_value + 9) // 10
            fixed_shifted = sp.Poly(
                sp.expand(fixed_total.subs(t, threshold + s)), s
            )
            fixed_coefficients = fixed_shifted.all_coeffs()
            assert all(value >= 0 for value in fixed_coefficients)
            row = {
                "core_order": order_value,
                "integer_threshold": threshold,
                "shifted_terms": len(fixed_coefficients),
                "minimum_scalar_coefficient": str(min(fixed_coefficients)),
                "shifted_polynomial_sha256": hashlib.sha256(
                    sp.srepr(fixed_shifted.as_expr()).encode()
                ).hexdigest().upper(),
            }
            rows.append(row)
            stream.update(json.dumps(
                row, separators=(",", ":"), sort_keys=True
            ).encode())
        low_order_records[mode] = {
            "orders": [first_order, 83],
            "order_count": len(rows),
            "threshold": "t>=ceil(11n/10)",
            "all_shifted_power_coefficients_nonnegative": True,
            "ordered_row_sha256": stream.hexdigest().upper(),
            "minimum_scalar_coefficient": str(min(
                sp.Rational(row["minimum_scalar_coefficient"]) for row in rows
            )),
            "rows": rows,
        }

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "canonical_mode": "singleton_ordinary ordinary-leaf reduction",
        "region": "every possible core order, with sibling-isolate count 10t>=11n",
        "cases": ["p=q", "p!=q"],
        "binomial_degree_in_t": 7,
        "forest_envelope": (
            "C(m,r)-(m-1)C(m-2,r-2)<=i_r(F)<=C(m,r), termwise, "
            "with every coefficient sign certified after n=84+h"
        ),
        "tail_substitution": (
            "n=84+h, t=11n/10+s, h a nonnegative integer and s a nonnegative real; "
            "actual t is an integer"
        ),
        "certificates": records,
        "low_order_certificates": low_order_records,
        "checks": {
            "both_cases_have_degree_7": True,
            "all_sixteen_coefficient_envelopes_exact": True,
            "all_positive_product_lower_factors_nonnegative": True,
            "both_shifted_tail_polynomials_have_36_nonnegative_terms": True,
            "both_shifted_tail_minima_equal_8692163_over_1800000000": True,
            "all_low_core_orders_checked_by_universal_envelopes": True,
            "all_low_order_shifted_power_coefficients_nonnegative": True,
        },
        "theorem": (
            "The complete retained-parent/retained-leaf rank-six g1 increment is "
            "nonnegative in both singleton-parent collision cases for every "
            "possible core order whenever 10t>=11n."
        ),
        "remaining_obligation": (
            "Configurations with 10t<11n, plus the other canonical g1 modes."
        ),
        "scope_guard": (
            "This does not close the full leaf increment, singleton-ordinary g1, "
            "all-five-mode rank-six g1, N6, or Problem 993."
        ),
        "pinned_dependencies": {
            label: {"file": name, "sha256": expected}
            for label, (name, expected) in PINNED.items()
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "region": report["region"],
        "certificates": report["certificates"],
        "checks": report["checks"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
