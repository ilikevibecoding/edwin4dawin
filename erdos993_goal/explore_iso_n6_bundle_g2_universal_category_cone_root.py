#!/usr/bin/env python3
"""Universal categorywise containment cone probe for rank-six bundle g2.

Both C and its induced marked minor D are split into the four exact marked-set
categories W/A/B/Z.  Every D category injects into its matching C category.
For n>=8, mixed coefficient signs are separated exactly after shifting
t=n-8; positive pieces are dropped and negative pieces take the matching
containment or extension cap.  This is a diagnostic lower bound only.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import (
    partition_substitution,
    structural_substitution,
)
from explore_iso_n6_bundle_g3_universal_cone_g1_nonadjacent import (
    inspect_bernstein,
    substitute_geometry_with_wedge_floor,
)
from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    marked_geometry_branches,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_universal_category_cone_probe_root_20260831.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_UNIVERSAL_CATEGORY_CONE_ROOT"
THRESHOLD = 8


def split_shifted(expression: sp.Expr, n: sp.Symbol, tail: sp.Symbol):
    shifted = sp.expand(expression.subs(n, tail + THRESHOLD))
    variables = tuple(sorted(shifted.free_symbols, key=str))
    if not variables:
        if shifted >= 0:
            return sp.expand(expression), sp.Integer(0)
        return sp.Integer(0), sp.expand(-expression)
    polynomial = sp.Poly(shifted, *variables)
    positive = sp.Integer(0)
    negative = sp.Integer(0)
    for powers, coefficient in polynomial.terms():
        monomial = sp.prod(
            variable**power for variable, power in zip(variables, powers)
        )
        if coefficient >= 0:
            positive += coefficient * monomial
        else:
            negative += -coefficient * monomial
    positive_original = sp.expand(positive.subs(tail, n - THRESHOLD))
    negative_original = sp.expand(negative.subs(tail, n - THRESHOLD))
    assert sp.expand(expression - positive_original + negative_original) == 0
    return positive_original, negative_original


def summary(expression: sp.Expr) -> dict[str, object]:
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(sp.expand(expression), *variables)
    return {
        "monomials": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(
            coefficient.is_negative is True for coefficient in polynomial.coeffs()
        ),
        "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
        "free_symbols": list(map(str, variables)),
    }


def bernstein_probe(expression: sp.Expr, variables, tail: sp.Symbol | None = None):
    degrees, values = inspect_bernstein(expression, variables)
    negative = 0
    scalar = 0
    first = []
    for index in sorted(values):
        value = values[index]
        if tail is None:
            scalar += 1
            bad = value.is_nonnegative is not True
            if bad:
                negative += 1
        else:
            coefficients = sp.Poly(sp.expand(value), tail).all_coeffs()
            scalar += len(coefficients)
            local = [coefficient for coefficient in coefficients if coefficient < 0]
            negative += len(local)
            bad = bool(local)
        if bad and len(first) < 8:
            first.append({"index": list(index), "value": str(value)})
    return {
        "degree_profile": list(degrees),
        "bernstein_controls": len(values),
        "scalar_coefficients": scalar,
        "negative_scalar_coefficients": negative,
        "first_negative": first,
    }


def main() -> None:
    generic = reconstruct()
    structural, _ = structural_substitution()
    cpartition, _ = partition_substitution("C", "c", 7)
    dpartition, _ = partition_substitution("D", "d", 6)
    partitioned = sp.expand(
        generic.subs(structural).subs(cpartition).subs(dpartition)
    )
    names = {str(symbol): symbol for symbol in partitioned.free_symbols}
    get = names.__getitem__
    n = get("n")
    tail = sp.Symbol("t", integer=True, nonnegative=True)

    dvars = tuple(sorted(
        (symbol for symbol in partitioned.free_symbols if str(symbol).startswith("D")),
        key=str,
    ))
    base = sp.expand(partitioned.subs({symbol: 0 for symbol in dvars}))
    current = base
    drows = []
    for variable in dvars:
        coefficient = sp.factor(sp.diff(partitioned, variable))
        assert sp.Poly(partitioned, variable).degree() <= 1
        positive, negative = split_shifted(coefficient, n, tail)
        matching = get("C" + str(variable)[1:])
        current = sp.expand(current - negative * matching)
        drows.append({
            "variable": str(variable),
            "coefficient": str(coefficient),
            "dropped_positive": str(sp.factor(positive)),
            "paid_negative": str(sp.factor(negative)),
            "matching_cap": str(matching),
        })

    caps = {
        "CA7": (n - 7) * get("CA6") / 6,
        "CB7": (n - 7) * get("CB6") / 6,
        "CW7": (n - 8) * get("CW6") / 7,
        "CZ7": (n - 6) * get("CZ6") / 5,
        "CA6": (n - 6) * get("CA5") / 5,
        "CB6": (n - 6) * get("CB5") / 5,
        "CW6": (n - 7) * get("CW5") / 6,
        "CZ6": (n - 5) * get("CZ5") / 4,
        "CA5": (n - 5) * get("CA4") / 4,
        "CB5": (n - 5) * get("CB4") / 4,
        "CW5": (n - 6) * get("CW4") / 5,
        "CZ5": (n - 4) * get("CZ4") / 3,
        "CA4": (n - 4) * get("CA3") / 3,
        "CB4": (n - 4) * get("CB3") / 3,
        "CW4": (n - 5) * get("CW3") / 4,
        "CZ4": (n - 3) * get("CZ3") / 2,
    }
    caprows = []
    for label, cap in caps.items():
        variable = get(label)
        polynomial = sp.Poly(current, variable)
        payments = []
        replacement = polynomial.coeff_monomial(1)
        for power in range(1, polynomial.degree() + 1):
            coefficient = sp.factor(polynomial.coeff_monomial(variable**power))
            positive, negative = split_shifted(coefficient, n, tail)
            replacement -= negative * cap**power
            payments.append({
                "power": power,
                "coefficient": str(coefficient),
                "dropped_positive": str(sp.factor(positive)),
                "paid_negative": str(sp.factor(negative)),
            })
        current = sp.expand(replacement)
        assert variable not in current.free_symbols
        caprows.append({
            "variable": label,
            "cap": str(sp.factor(cap)),
            "payments": payments,
        })

    interval_rows = []
    for label in ("CA3", "CB3"):
        variable = get(label)
        h = get("CA2" if label == "CA3" else "CB2")
        lower = h * (h - 3) / 2
        upper = h * (h - 1) / 2
        polynomial = sp.Poly(current, variable)
        replacement = polynomial.coeff_monomial(1)
        payments = []
        for power in range(1, polynomial.degree() + 1):
            coefficient = sp.factor(polynomial.coeff_monomial(variable**power))
            positive, negative = split_shifted(coefficient, n, tail)
            positive_floor = positive * lower if power == 1 else 0
            replacement += positive_floor - negative * upper**power
            payments.append({
                "power": power,
                "coefficient": str(coefficient),
                "positive_floor": str(sp.factor(positive_floor)),
                "negative_cap": str(sp.factor(negative * upper**power)),
            })
        current = sp.expand(replacement)
        assert variable not in current.free_symbols
        interval_rows.append({
            "variable": label,
            "lower": str(sp.factor(lower)),
            "upper": str(sp.factor(upper)),
            "payments": payments,
        })

    geometry_names = {
        get(f"C{family}{rank}"): sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in (2, 3)
        if f"C{family}{rank}" in names
    }
    geometry_residual = sp.expand(current.subs(geometry_names))
    a, b, c, d = sp.symbols("a b c d", nonnegative=True)
    fixed_rows = []
    for order in range(8, 31):
        for branch in marked_geometry_branches(sp.Integer(order - 2), a, b, c, d):
            label, variables, value = substitute_geometry_with_wedge_floor(
                geometry_residual, n, sp.Integer(order), branch
            )
            row = bernstein_probe(value, variables)
            row.update({"order": order, "geometry": label})
            fixed_rows.append(row)
    tail_rows = {}
    for threshold in (31, 58, 100):
        high_tail = sp.Symbol(f"t{threshold}", integer=True, nonnegative=True)
        branch_rows = []
        for branch in marked_geometry_branches(
            high_tail + threshold - 2, a, b, c, d
        ):
            label, variables, value = substitute_geometry_with_wedge_floor(
                geometry_residual, n, high_tail + threshold, branch
            )
            row = bernstein_probe(value, variables, high_tail)
            row["geometry"] = label
            branch_rows.append(row)
        tail_rows[str(threshold)] = branch_rows

    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g2",
        "threshold": THRESHOLD,
        "partitioned_summary": summary(partitioned),
        "D_category_payment": drows,
        "high_rank_category_payments": caprows,
        "rank3_forest_intervals": interval_rows,
        "residual": str(sp.factor(current)),
        "residual_summary": summary(current),
        "geometry_residual": str(sp.factor(geometry_residual)),
        "geometry_probe": {
            "fixed_orders_8_through_30": fixed_rows,
            "tail_thresholds": tail_rows,
            "fixed_negative_scalar_coefficients": sum(
                row["negative_scalar_coefficients"] for row in fixed_rows
            ),
            "tail_negative_scalar_coefficients": {
                threshold: sum(
                    row["negative_scalar_coefficients"] for row in rows
                )
                for threshold, rows in tail_rows.items()
            },
        },
        "facts": [
            "Each D marked category injects into the matching C category.",
            "Every mixed coefficient is split exactly in the nonnegative variables after t=n-8.",
            "Positive pieces multiply nonnegative counts and may be dropped.",
            "Negative pieces use only the displayed exact containment or extension cap.",
        ],
        "status": "diagnostic exact lower cone for n>=8; no sign theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "partitioned_summary": report["partitioned_summary"],
        "D_categories": len(drows),
        "high_rank_payments": len(caprows),
        "residual_summary": report["residual_summary"],
        "geometry_fixed_negatives": report["geometry_probe"]["fixed_negative_scalar_coefficients"],
        "geometry_tail_negatives": report["geometry_probe"]["tail_negative_scalar_coefficients"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
