#!/usr/bin/env python3
"""All-order proof of the top four sibling-isolate leaf coefficients.

For a deepest ordinary support choose one leaf and let ``t`` be the number of
its sibling leaves.  After deleting the support, those siblings are isolated:

    H=(1+x)^t R,  K=R-q.

For the canonical singleton-ordinary target ``D=C-p`` there are two cases:
``p=q`` and ``p!=q``.  This producer reconstructs the complete retained-
parent/retained-leaf rank-six G1 increment, expands it in ``binom(t,j)``, and
proves the coefficients j=4,5,6,7 nonnegative in both cases.

Only the universal forest bounds

    C(m,r)-(m-1)C(m-2,r-2) <= i_r(F) <= C(m,r)

are used.  The lower bound is the edge union bound and ``|E(F)|<=m-1``.
Coefficients j=0,1,2,3 remain open.
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


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n6_bundle_g1_singleton_ordinary_leaf_sibling_isolate_top4_exact_"
    "g1_nonadjacent_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N6_BUNDLE_G1_SINGLETON_ORDINARY_LEAF_SIBLING_"
    "ISOLATE_TOP4_G1_NONADJACENT"
)
PINNED = {
    "leaf_expression_source": (
        "census_iso_n6_bundle_g1_ordinary_leaf_recursive_g2_residual_small_g1_nonadjacent.py",
        "2474323FFAB6D3FBFAC99926E298C698F4C93398D5E0FC7467F18E97F8363126",
    ),
    "binomial_algebra_source": (
        "derive_iso_n4_bundle_polynomial_root.py",
        "F312FB481C76129380823CFC5E1FA6BB2B7D794846136A14477FCC9245D8870E",
    ),
    "canonical_occupation_source": (
        "derive_iso_n6_bundle_g1_singleton_ordinary_leaf_complete_occupation_g1_nonadjacent.py",
        "9D02C3AD011A6A175AC632E6786598691C9D2AAF52456CC2C2832476A1D54954",
    ),
    "canonical_occupation_report": (
        "iso_n6_bundle_g1_singleton_ordinary_leaf_complete_occupation_exact_g1_nonadjacent_20260831.json",
        "2AC2037F0D5F2F33B306ED325B7573C7F2D3CEBA062CC0335A5FE06187262C4A",
    ),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def replace_rows(expression, **blocks):
    rules = {}
    for prefix, actual in blocks.items():
        generic = symbolic_rows(prefix)
        for generic_row, actual_row in zip(generic, actual):
            rules.update(dict(zip(generic_row, actual_row)))
    return sp.expand(expression.subs(rules))


def structural(rows, order):
    e, u, v, w = rows
    return {
        e[0]: 1,
        u[0]: 1,
        v[0]: 1,
        w[0]: 1,
        e[1]: order,
        u[1]: order - 1,
        v[1]: order - 1,
        w[1]: order - 2,
    }


def choose(value, rank):
    if rank < 0:
        return sp.Integer(0)
    return sp.expand(
        sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)
    )


def row_order(symbol, n):
    name = str(symbol)
    base = {"R": n, "S": n - 1, "X": n - 1, "Y": n - 2}[name[0]]
    removed = {"E": 0, "U": 1, "V": 1, "W": 2}[name[1]]
    return base - removed, int(name[2:])


def shifted_power_nonnegative(value, n, minimum):
    h = sp.Symbol("h", integer=True, nonnegative=True)
    polynomial = sp.Poly(sp.expand(value.subs(n, minimum + h)), h)
    return all(coefficient >= 0 for coefficient in polynomial.all_coeffs())


def termwise_forest_envelope(expression, n, minimum):
    row_variables = tuple(sorted(
        (symbol for symbol in expression.free_symbols if symbol != n), key=str
    ))
    if not row_variables:
        assert shifted_power_nonnegative(expression, n, minimum)
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
        term = coefficient
        row_degree = sum(exponents)
        if direction > 0 and row_degree > 1:
            positive_products += 1
        for variable, exponent in zip(row_variables, exponents):
            if not exponent:
                continue
            order, rank = row_order(variable, n)
            upper = choose(order, rank)
            lower = sp.expand(
                upper - (order - 1) * choose(order - 2, rank - 2)
            )
            if direction > 0 and row_degree > 1:
                # Product replacement needs nonnegative lower factors.
                assert shifted_power_nonnegative(lower, n, minimum), (
                    variable, lower, minimum
                )
            term *= (lower if direction > 0 else upper) ** exponent
        pieces.append(term)
    envelope = sp.factor(sp.expand(sum(pieces)))
    assert shifted_power_nonnegative(envelope, n, minimum)
    return envelope, {
        "positive_coefficient_monomials": positive,
        "negative_coefficient_monomials": negative,
        "positive_product_monomials": positive_products,
    }


def expression_summary(value):
    variables = tuple(sorted(value.free_symbols, key=str))
    polynomial = sp.Poly(value, *variables) if variables else None
    return {
        "terms": len(polynomial.terms()) if polynomial is not None else int(value != 0),
        "variables": len(variables),
        "negative_scalar_coefficients": (
            sum(1 for coefficient in polynomial.coeffs() if coefficient < 0)
            if polynomial is not None else (1 if value < 0 else 0)
        ),
        "polynomial_sha256": hashlib.sha256(
            sp.srepr(value).encode()
        ).hexdigest().upper(),
    }


def main():
    for _label, (name, expected) in PINNED.items():
        assert sha256(HERE / name) == expected

    t = sp.Symbol("t", integer=True, nonnegative=True)
    n = sp.Symbol("n", integer=True, positive=True)
    components = build_expressions()
    complete = sp.expand(
        components["g2"] + components["F"] + components["QHL"]
        + components["QHJ"] + components["QKJ"] + components["T"]
    )
    rrows, srows, xrows, yrows = (
        symbolic_rows(prefix) for prefix in ("R", "S", "X", "Y")
    )

    # p=q: J=(1+x)^t S and L=S.
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
    collision_coefficients = binomial_basis(collision, t)

    # p!=q: J=(1+x)^t(R-p), K=R-q, L=R-{p,q}.
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
    distinct_coefficients = binomial_basis(distinct, t)
    assert len(collision_coefficients) == len(distinct_coefficients) == 8

    expected_hashes = {
        "collision": {
            4: "BBA503D0C15DC44984B3EC3DBF97FE512B69530071F94928A8FD466B86A5FE60",
            5: "82F1D2B74D29DE9BF5CE4EE8F4093F3BC57CB15274482EB2F914DB3608FE54B9",
            6: "E13CF1FBA00DD0BAA723904C97D856D3CC7D70DE75E322983FA3962247AC6E2F",
            7: "5DE879A686B308626BB1F8745EF4EC99697D0D87254C3971D38AF23D68A4813D",
        },
        "distinct": {
            4: "7138921A82D2021EB14DA17C4309063FC3D41529F609C08E39F853086C5455E0",
            5: "82AB20022B602125581FAE67BDDEAFF3EC2A52328D3FAAE33092F56951D8DBD2",
            6: "E13CF1FBA00DD0BAA723904C97D856D3CC7D70DE75E322983FA3962247AC6E2F",
            7: "5DE879A686B308626BB1F8745EF4EC99697D0D87254C3971D38AF23D68A4813D",
        },
    }
    expected_envelopes = {
        "collision": {
            4: (314 * n**3 + 1287 * n**2 + 3493 * n - 240) / 6,
            5: (467 * n**2 + 2173 * n + 1444) / 2,
            6: 7 * (93 * n + 203),
            7: sp.Integer(714),
        },
        "distinct": {
            4: (314 * n**3 + 1041 * n**2 + 4543 * n - 696) / 6,
            5: (467 * n**2 + 2163 * n + 1498) / 2,
            6: 7 * (93 * n + 203),
            7: sp.Integer(714),
        },
    }
    records = {}
    for mode, coefficients, minimum in (
        ("collision", collision_coefficients, 3),
        ("distinct", distinct_coefficients, 4),
    ):
        records[mode] = {}
        for index in range(4, 8):
            value = coefficients[index]
            assert expression_summary(value)["polynomial_sha256"] == expected_hashes[mode][index]
            envelope, audit = termwise_forest_envelope(value, n, minimum)
            assert sp.expand(envelope - expected_envelopes[mode][index]) == 0
            records[mode][str(index)] = {
                "coefficient_summary": expression_summary(value),
                "termwise_audit": audit,
                "lower_envelope": str(sp.factor(envelope)),
                "minimum_core_order": minimum,
                "shifted_power_coefficients_nonnegative": True,
            }

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g1",
        "canonical_mode": "singleton_ordinary ordinary-leaf reduction",
        "sibling_isolate_parameter": (
            "H=(1+x)^t R, K=R-q; t is the number of sibling leaves remaining "
            "after choosing one deepest-support leaf"
        ),
        "two_parent_cases": {
            "collision": "p=q, so J=(1+x)^t(R-p), L=R-p",
            "distinct": "p!=q, so J=(1+x)^t(R-p), K=R-q, L=R-{p,q}",
        },
        "binomial_degree_in_t": 7,
        "closed_binomial_coefficients": [4, 5, 6, 7],
        "open_binomial_coefficients": [0, 1, 2, 3],
        "forest_bounds": {
            "upper": "i_r(F)<=C(m,r)",
            "lower": "i_r(F)>=C(m,r)-(m-1)C(m-2,r-2)",
            "justification": (
                "edge union bound for nonindependent r-sets and |E(F)|<=m-1"
            ),
        },
        "certificates": records,
        "checks": {
            "both_binomial_degrees_equal_7": True,
            "all_eight_top4_expression_hashes_match": True,
            "all_coefficient_signs_shifted_power_certified": True,
            "all_termwise_forest_envelopes_exact": True,
            "all_eight_lower_envelopes_shifted_power_nonnegative": True,
        },
        "theorem": (
            "For every canonical nonadjacent singleton-ordinary deepest-support "
            "leaf configuration, in both p=q and p!=q cases, the binomial "
            "coefficients [binom(t,j)] of its complete rank-six g1 leaf increment "
            "are nonnegative for j=4,5,6,7."
        ),
        "remaining_obligation": (
            "The same complete increment coefficients j=0,1,2,3; no sign of their "
            "sum is asserted here."
        ),
        "scope_guard": (
            "This does not close the complete leaf increment, singleton-ordinary "
            "g1, all-five-mode rank-six g1, N6, or Problem 993."
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
        "closed": report["closed_binomial_coefficients"],
        "open": report["open_binomial_coefficients"],
        "certificates": report["certificates"],
        "checks": report["checks"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
