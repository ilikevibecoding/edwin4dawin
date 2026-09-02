#!/usr/bin/env python3
"""Exact diagnostic containment/elimination map for rank-six bundle g2.

This is deliberately non-promotional.  It reconstructs g2, applies only
rowwise-valid induced-D payments, and records the coefficients encountered
when the highest marked-partition ranks are paid by consecutive-set caps.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n6_bundle_g2_containment_elimination_probe_root_20260831.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_CONTAINMENT_ELIMINATION_ROOT"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    generic = reconstruct()
    n, q, eu, ev = sp.symbols("n q epsilon_u epsilon_v")
    structural = {}
    for family in "EUVW":
        structural[sp.Symbol(f"c{family}0")] = 1
        structural[sp.Symbol(f"d{family}0")] = 1
    structural.update({
        sp.Symbol("cE1"): n, sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1, sp.Symbol("cW1"): n - 2,
        sp.Symbol("dE1"): q, sp.Symbol("dU1"): q - eu,
        sp.Symbol("dV1"): q - ev, sp.Symbol("dW1"): q - eu - ev,
    })
    raw = sp.expand(generic.subs(structural))
    rows = {
        family: {
            rank: sp.Symbol(f"{family}{rank}", nonnegative=True)
            for rank in range(2, 8)
        }
        for family in "WABZ"
    }
    rules = {}
    for rank in range(2, 8):
        w, a, b, z = (rows[family][rank] for family in "WABZ")
        rules.update({
            sp.Symbol(f"cW{rank}"): w,
            sp.Symbol(f"cU{rank}"): w + a,
            sp.Symbol(f"cV{rank}"): w + b,
            sp.Symbol(f"cE{rank}"): w + a + b + z,
        })
    expression = sp.expand(raw.subs(rules))
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    S = lambda label: names[label]
    dlabels = (
        "dE4", "dE5", "dE6", "dU3", "dU4", "dU5",
        "dV3", "dV4", "dV5", "dW2", "dW3", "dW4",
    )
    dvars = tuple(S(label) for label in dlabels)
    cpart = sp.expand(expression.subs({symbol: 0 for symbol in dvars}))

    # Keep every positive D monomial at zero and pay every negative monomial
    # by the matching C-row cap.  This remains valid even when a full D
    # derivative has mixed sign.
    d_lower = sp.expand(
        -7 * S("W3") * (S("W4") + S("A4") + S("B4") + S("Z4"))
        -7 * (n - 2) * (S("W6") + S("A6") + S("B6") + S("Z6"))
        -(7 * S("B4") + S("W3") + 7 * S("W4")) * (S("W3") + S("A3"))
        -(7 * S("A4") + S("W3") + 7 * S("W4")) * (S("W3") + S("B3"))
        -(7 * S("B2") + 7 * S("W2") + n - 2) * (S("W5") + S("A5"))
        -(7 * S("A2") + 7 * S("W2") + n - 2) * (S("W5") + S("B5"))
        -(S("A4") + 7 * S("A5") + S("B4") + 7 * S("B5")
          +2 * S("W4") + 7 * S("W5") + 7 * S("Z5")) * S("W2")
        -(S("A2") + 7 * S("A3") + S("B2") + 7 * S("B3")
          +2 * S("W2") + 7 * S("W3") + 7 * S("Z3")) * S("W4")
    )
    current = sp.expand(cpart + d_lower)

    steps = (
        ("A7", (n - 7) * S("A6") / 6),
        ("B7", (n - 7) * S("B6") / 6),
        ("W7", (n - 8) * S("W6") / 7),
        ("Z7", (n - 6) * S("Z6") / 5),
        ("A6", (n - 6) * S("A5") / 5),
        ("B6", (n - 6) * S("B5") / 5),
        ("W6", (n - 7) * S("W5") / 6),
        ("Z6", (n - 5) * S("Z5") / 4),
    )
    sequence = []
    for label, cap in steps:
        variable = S(label)
        coefficient = sp.factor(sp.diff(current, variable))
        assert variable not in coefficient.free_symbols
        sequence.append({
            "variable": label,
            "coefficient_before_cap": str(coefficient),
            "cap": str(cap),
        })
        current = sp.expand(current.subs(variable, cap))

    # The A5/B5/Z5 multipliers have a positive W3 part.  Retain that part at
    # zero and pay only the coefficientwise-nonnegative negative part by the
    # consecutive-set cap.  Orders below eight belong to the exact atlas side.
    r = sp.Symbol("r", nonnegative=True)
    split_sequence = []
    for label, cap, positive_part in (
        ("A5", (n - 5) * S("A4") / 4, 8 * S("W3")),
        ("B5", (n - 5) * S("B4") / 4, 8 * S("W3")),
    ):
        variable = S(label)
        coefficient = sp.factor(sp.diff(current, variable))
        negative_multiplier = sp.factor(positive_part - coefficient)
        shifted = sp.Poly(
            sp.expand(negative_multiplier.subs(n, r + 8)),
            *sorted((negative_multiplier.free_symbols - {n}) | {r}, key=str),
        )
        assert all(value >= 0 for value in shifted.coeffs())
        split_sequence.append({
            "variable": label,
            "coefficient": str(coefficient),
            "dropped_nonnegative_part": str(positive_part),
            "paid_multiplier": str(negative_multiplier),
            "cap": str(cap),
        })
        current = sp.expand(current - coefficient * variable - negative_multiplier * cap)

    coefficient_w5 = sp.factor(sp.diff(current, S("W5")))
    shifted_w5 = sp.Poly(
        sp.expand((-coefficient_w5).subs(n, r + 8)),
        *sorted((coefficient_w5.free_symbols - {n}) | {r}, key=str),
    )
    assert all(value >= 0 for value in shifted_w5.coeffs())
    cap_w5 = (n - 6) * S("W4") / 5
    split_sequence.append({
        "variable": "W5", "coefficient": str(coefficient_w5),
        "dropped_nonnegative_part": "0",
        "paid_multiplier": str(-coefficient_w5), "cap": str(cap_w5),
    })
    current = sp.expand(current.subs(S("W5"), cap_w5))

    coefficient_z5 = sp.factor(sp.diff(current, S("Z5")))
    positive_z5 = 10 * S("W3")
    negative_z5 = sp.factor(positive_z5 - coefficient_z5)
    shifted_z5 = sp.Poly(
        sp.expand(negative_z5.subs(n, r + 8)),
        *sorted((negative_z5.free_symbols - {n}) | {r}, key=str),
    )
    assert all(value >= 0 for value in shifted_z5.coeffs())
    cap_z5 = (n - 4) * S("Z4") / 3
    split_sequence.append({
        "variable": "Z5", "coefficient": str(coefficient_z5),
        "dropped_nonnegative_part": str(positive_z5),
        "paid_multiplier": str(negative_z5), "cap": str(cap_z5),
    })
    current = sp.expand(
        current - coefficient_z5 * S("Z5") - negative_z5 * cap_z5
    )

    remaining = tuple(sorted(current.free_symbols, key=str))
    polynomial = sp.Poly(current, *remaining)
    negative = sum(
        coefficient.is_negative is True for coefficient in polynomial.coeffs()
    )
    report = {
        "marker": MARKER,
        "rank": 6,
        "coefficient": "g2",
        "D_payment": str(d_lower),
        "elimination_sequence": sequence,
        "split_elimination_n_at_least_8": split_sequence,
        "residual": str(sp.factor(current)),
        "residual_summary": {
            "monomials": len(polynomial.terms()),
            "negative_scalar_coefficients": negative,
            "minimum_scalar_coefficient": str(min(polynomial.coeffs())),
            "free_symbols": [str(symbol) for symbol in remaining],
        },
        "status": "diagnostic exact lower bound; no sign theorem asserted",
        "scope": (
            "The D payment and cap substitutions are universal where their "
            "recorded multipliers are nonpositive; this probe records those "
            "multipliers explicitly and asserts no final sign."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "sequence": sequence,
        "residual_summary": report["residual_summary"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
