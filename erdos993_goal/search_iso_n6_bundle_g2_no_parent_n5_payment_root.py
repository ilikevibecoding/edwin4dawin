#!/usr/bin/env python3
"""Search an exact all-N5 payment decomposition for rank-six g2 no-parent mode."""

from __future__ import annotations

import hashlib
import json
from fractions import Fraction
from pathlib import Path

import numpy as np
import sympy as sp
from scipy.optimize import linprog

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import partition_substitution, structural_substitution
from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import isolate_multiply, nested


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_no_parent_n5_payment_search_root_20260831.json"
MARKER = "SEARCH_EXACT_ISO_N6_BUNDLE_G2_NO_PARENT_N5_PAYMENT_ROOT"


def coefficient_map(value, generators):
    return dict(sp.Poly(sp.expand(value), *generators).terms())


def main():
    structural, _ = structural_substitution()
    cp, _ = partition_substitution("C", "c", 7)
    dp, _ = partition_substitution("D", "d", 6)
    g2 = sp.expand(reconstruct().subs(structural).subs(cp).subs(dp))
    names = {str(x): x for x in g2.free_symbols}
    dvars = tuple(sorted((x for x in g2.free_symbols if str(x).startswith("D")), key=str))
    no_parent = sp.expand(g2.subs({x: names["C" + str(x)[1:]] for x in dvars}))

    crows = tuple(tuple(sp.symbols(f"c{name}0:8")) for name in "EUVW")
    payments = []
    for isolates in range(0, 16):
        value = sp.expand(nested(isolate_multiply(crows, isolates), 5).subs(structural).subs(cp))
        payments.append(value)

    tail = sp.Symbol("t", integer=True, nonnegative=True)
    no_parent = sp.expand(no_parent.subs(names["n"], tail + 8))
    payments = [sp.expand(value.subs(names["n"], tail + 8)) for value in payments]
    generators = tuple(sorted(no_parent.free_symbols | set().union(*(x.free_symbols for x in payments)), key=str))
    target = coefficient_map(no_parent, generators)
    columns = [coefficient_map(value, generators) for value in payments]
    monomials = sorted(set(target).union(*(column for column in columns)))

    # residual=target-sum_j weight_j*payment_j >=0 coefficientwise.
    matrix = np.array([[float(column.get(monomial, 0)) for column in columns] for monomial in monomials])
    bound = np.array([float(target.get(monomial, 0)) for monomial in monomials])
    result = linprog(
        c=np.ones(len(payments)) * 1e-6,
        A_ub=matrix,
        b_ub=bound,
        bounds=[(0, None)] * len(payments),
        method="highs",
    )
    rational = None
    residual_summary = None
    if result.success:
        candidate = [Fraction(float(x)).limit_denominator(1000000) for x in result.x]
        residual = sp.expand(no_parent - sum(sp.Rational(x.numerator, x.denominator) * value for x, value in zip(candidate, payments)))
        polynomial = sp.Poly(residual, *generators)
        coefficients = tuple(polynomial.coeffs())
        rational = [str(x) for x in candidate]
        residual_summary = {
            "terms": len(coefficients),
            "negative": sum(x < 0 for x in coefficients),
            "minimum": str(min(coefficients)),
            "residual_sha256": hashlib.sha256(str(polynomial.as_expr()).encode()).hexdigest().upper(),
        }
    report = {
        "marker": MARKER, "candidate_payments": [f"N5(C union {j}K1)" for j in range(len(payments))],
        "linprog_success": bool(result.success), "linprog_status": result.message,
        "rational_weights": rational, "exact_residual": residual_summary,
        "status": "diagnostic decomposition search; theorem only if exact residual has zero negatives",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
