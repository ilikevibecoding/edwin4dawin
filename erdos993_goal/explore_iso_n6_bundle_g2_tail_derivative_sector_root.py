#!/usr/bin/env python3
"""Tail derivative-sector probe for the universal rank-six g2 box minimum.

The exact D-category derivatives empirically stabilize to one sign sector.
This probe uses that sector without yet asserting its all-order validity, then
pays only C ranks seven through five by exact extension caps.  Its purpose is
to test whether preserving whole derivative signs repairs the overly coarse
monomialwise D payment.  No theorem is asserted.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g2_universal_category_cone_root import (
    bernstein_probe,
    split_shifted,
    summary,
)
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import (
    partition_substitution,
    structural_substitution,
)
from explore_iso_n6_bundle_g3_universal_cone_g1_nonadjacent import (
    substitute_geometry_with_wedge_floor,
)
from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    marked_geometry_branches,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_tail_derivative_sector_probe_root_20260831.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_TAIL_DERIVATIVE_SECTOR_ROOT"


def main() -> None:
    structural, _ = structural_substitution()
    cpartition, _ = partition_substitution("C", "c", 7)
    dpartition, _ = partition_substitution("D", "d", 6)
    expression = sp.expand(
        reconstruct().subs(structural).subs(cpartition).subs(dpartition)
    )
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    get = names.__getitem__
    n = get("n")
    tail = sp.Symbol("t", integer=True, nonnegative=True)
    dvars = tuple(sorted(
        (symbol for symbol in expression.free_symbols if str(symbol).startswith("D")),
        key=str,
    ))
    derivatives = {
        str(symbol): sp.factor(sp.diff(expression, symbol)) for symbol in dvars
    }
    negative_sector = {
        "DA3", "DA6", "DB3", "DB6", "DW2", "DW3", "DW5", "DW6",
        "DZ4", "DZ6",
    }
    positive_sector = set(derivatives) - negative_sector
    assert positive_sector == {"DA4", "DA5", "DB4", "DB5", "DW4", "DZ5"}

    current = sp.expand(expression.subs({symbol: 0 for symbol in dvars}))
    for label in sorted(negative_sector):
        current += derivatives[label] * get("C" + label[1:])
    current = sp.expand(current)

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
    }
    rows = []
    for label, cap in caps.items():
        variable = get(label)
        polynomial = sp.Poly(current, variable)
        replacement = polynomial.coeff_monomial(1)
        payments = []
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
        rows.append({"variable": label, "cap": str(sp.factor(cap)), "payments": payments})

    rank4_derivatives = {
        label: str(sp.factor(sp.diff(current, get(label))))
        for label in ("CA4", "CB4", "CW4", "CZ4")
    }
    rank4_caps = {
        "CA4": (n - 4) * get("CA3") / 3,
        "CB4": (n - 4) * get("CB3") / 3,
        "CW4": (n - 5) * get("CW3") / 4,
        "CZ4": (n - 3) * get("CZ3") / 2,
    }
    tail_current = current
    rank4_tail_rows = []
    for label, cap in rank4_caps.items():
        derivative = sp.factor(sp.diff(tail_current, get(label)))
        rank4_tail_rows.append({
            "variable": label,
            "derivative_assumed_nonpositive": str(derivative),
            "cap": str(sp.factor(cap)),
        })
        tail_current = sp.expand(tail_current.subs(get(label), cap))
    low_derivatives = {
        label: str(sp.factor(sp.diff(tail_current, get(label))))
        for label in ("CA3", "CB3", "CW3", "CZ3")
    }
    rank3_tail_rows = []
    for label in ("CA3", "CB3"):
        h = get("CA2" if label == "CA3" else "CB2")
        cap = h * (h - 1) / 2
        derivative = sp.factor(sp.diff(tail_current, get(label)))
        rank3_tail_rows.append({
            "variable": label,
            "derivative_assumed_nonpositive": str(derivative),
            "cap": str(sp.factor(cap)),
        })
        tail_current = sp.expand(tail_current.subs(get(label), cap))

    geometry_names = {
        get("CA2"): sp.Symbol("A2", nonnegative=True),
        get("CB2"): sp.Symbol("B2", nonnegative=True),
        get("CW2"): sp.Symbol("W2", nonnegative=True),
        get("CW3"): sp.Symbol("W3", nonnegative=True),
        get("CZ3"): sp.Symbol("Z3", nonnegative=True),
    }
    geometry_residual = sp.expand(tail_current.subs(geometry_names))
    a, b, c, d = sp.symbols("a b c d", nonnegative=True)
    tail_cones = {}
    for threshold in (38, 58, 100):
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
        tail_cones[str(threshold)] = branch_rows
    report = {
        "marker": MARKER,
        "coefficient": "rank-six bundle g2",
        "assumed_tail_sector": {
            "negative": sorted(negative_sector),
            "nonnegative": sorted(positive_sector),
            "derivatives": {key: str(value) for key, value in derivatives.items()},
            "proof_status": "open; this probe does not assert the sector",
        },
        "high_rank_payments": rows,
        "residual": str(sp.factor(current)),
        "residual_summary": summary(current),
        "rank4_derivatives": rank4_derivatives,
        "tail_rank4_assumed_nonpositive": {
            "proof_status": "open; direct cap substitutions are diagnostic",
            "sequence": rank4_tail_rows,
            "residual": str(sp.factor(tail_current)),
            "residual_summary": summary(tail_current),
            "low_derivatives": low_derivatives,
            "rank3_sequence": rank3_tail_rows,
            "geometry_residual": str(sp.factor(geometry_residual)),
            "geometry_residual_summary": summary(geometry_residual),
            "tail_cones": tail_cones,
            "tail_negative_scalar_coefficients": {
                threshold: sum(
                    row["negative_scalar_coefficients"] for row in rows
                )
                for threshold, rows in tail_cones.items()
            },
        },
        "status": "diagnostic sector lower; no sign theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "negative_sector": sorted(negative_sector),
        "positive_sector": sorted(positive_sector),
        "residual_summary": report["residual_summary"],
        "rank4_derivatives": rank4_derivatives,
        "after_rank4_summary": report["tail_rank4_assumed_nonpositive"]["residual_summary"],
        "low_derivatives": low_derivatives,
        "geometry_summary": report["tail_rank4_assumed_nonpositive"]["geometry_residual_summary"],
        "tail_negatives": report["tail_rank4_assumed_nonpositive"]["tail_negative_scalar_coefficients"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
