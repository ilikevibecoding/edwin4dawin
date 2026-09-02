#!/usr/bin/env python3
"""Probe a containment-first elimination for universal rank-seven g4.

The script starts from the pinned exact marked partition.  It drops every
positive D-row contribution and pays each negative D-row contribution by the
corresponding induced-C row.  It then eliminates the four rank-eight C
categories by exact consecutive-set extension caps and records the resulting
rank-seven coefficients.  This is deliberately a probe, not a sign theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
SOURCE_DEP = HERE / "derive_iso_n7_bundle_g4_marked_partition_rank7_terminal.py"
REPORT_DEP = HERE / "iso_n7_bundle_g4_marked_partition_exact_rank7_terminal_20260831.json"
SOURCE_DEP_SHA = "94B926738917A0AACD00294EE4E391D0003E8DE742BD248120E75349B02038B4"
REPORT_DEP_SHA = "B8B0C129D2C6B1CD0D2E3D5899210FBCBAEB49AFE55E0DBF0BCDA86299449974"
OUTPUT = HERE / "iso_n7_bundle_g4_containment_elimination_probe_rank7_terminal_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G4_CONTAINMENT_ELIMINATION_RANK7_TERMINAL"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    assert sha256(SOURCE_DEP) == SOURCE_DEP_SHA
    assert sha256(REPORT_DEP) == REPORT_DEP_SHA
    upstream = json.loads(REPORT_DEP.read_text(encoding="utf-8"))
    assert upstream["marker"] == (
        "DERIVED_EXACT_ISO_N7_BUNDLE_G4_MARKED_PARTITION_RANK7_TERMINAL"
    )
    names = upstream["summary"]["free_symbols"]
    symbols = {name: sp.Symbol(name, integer=True, nonnegative=True) for name in names}
    expression = sp.expand(sp.sympify(upstream["partitioned_expression"], locals=symbols))
    n = symbols["n"]
    row = {
        family: {rank: symbols[f"{family}{rank}"] for rank in range(2, 9)}
        for family in "WABZ"
    }
    W, A, B, Z = (row[family] for family in "WABZ")
    d = {name: symbols[name] for name in upstream["summary"]["D_symbols"]}

    exact_d_coefficients = {
        name: sp.factor(sp.diff(expression, symbol)) for name, symbol in d.items()
    }
    assert all(
        sp.expand(
            exact_d_coefficients[name]
            - sp.sympify(upstream["D_coefficients"][name], locals=symbols)
        ) == 0
        for name in d
    )
    c_part = expression.subs({symbol: 0 for symbol in d.values()})

    # Negative pieces only, paid by D induced inside the appropriate C minor.
    d_lower_terms = {
        "dE5": -8 * W[2] * (W[5] + A[5] + B[5] + Z[5]),
        "dE7": -8 * (W[7] + A[7] + B[7] + Z[7]),
        "dU4": -(8 * B[3] + W[2] + 8 * W[3]) * (W[4] + A[4]),
        "dU6": (7 - 8 * n) * (W[6] + A[6]),
        "dV4": -(8 * A[3] + W[2] + 8 * W[3]) * (W[4] + B[4]),
        "dV6": (7 - 8 * n) * (W[6] + B[6]),
        "dW3": -(
            A[3] + B[3] + 2 * W[3]
            + 8 * (A[4] + B[4] + W[4] + Z[4])
        ) * W[3],
        "dW5": -2 * (
            4 * A[2] + 4 * B[2] + 4 * W[2] + 4 * Z[2] + n - 1
        ) * W[5],
    }
    positive_d_rows_dropped = ["dE6", "dU5", "dV5", "dW4"]
    d_lower = sp.expand(sum(d_lower_terms.values()))
    relaxed = sp.expand(c_part + d_lower)

    current = relaxed
    rank8_coefficients = {}
    caps8 = {
        A[8]: (n - 8) * A[7] / 7,
        B[8]: (n - 8) * B[7] / 7,
        W[8]: (n - 9) * W[7] / 8,
        Z[8]: (n - 7) * Z[7] / 6,
    }
    for variable, cap in caps8.items():
        coefficient = sp.factor(sp.diff(current, variable))
        rank8_coefficients[str(variable)] = str(coefficient)
        assert coefficient == -8
        current = sp.expand(current.subs(variable, cap))

    rank7_coefficients = {
        family: str(sp.factor(sp.diff(current, row[family][7])))
        for family in "WABZ"
    }
    caps7 = {
        A[7]: (n - 7) * A[6] / 6,
        B[7]: (n - 7) * B[6] / 6,
        W[7]: (n - 8) * W[6] / 7,
        Z[7]: (n - 6) * Z[6] / 5,
    }
    for variable, cap in caps7.items():
        coefficient = sp.factor(sp.diff(current, variable))
        assert sp.Poly(-coefficient, n).all_coeffs()[0] > 0
        assert coefficient.subs(n, 2) < 0
        current = sp.expand(current.subs(variable, cap))
    rank6_coefficients = {
        family: str(sp.factor(sp.diff(current, row[family][6])))
        for family in "WABZ"
    }
    caps6 = {
        A[6]: (n - 6) * A[5] / 5,
        B[6]: (n - 6) * B[5] / 5,
        W[6]: (n - 7) * W[5] / 6,
        Z[6]: (n - 5) * Z[5] / 4,
    }
    for variable, cap in caps6.items():
        coefficient = sp.factor(sp.diff(current, variable))
        # Every coefficient is negative on n>=2 and nonnegative row counts.
        assert coefficient.subs({n: 2, A[2]: 0, B[2]: 0, W[2]: 0, Z[2]: 0}) < 0
        assert all(
            sp.diff(coefficient, base) <= 0
            for base in (A[2], B[2], W[2], Z[2])
        )
        current = sp.expand(current.subs(variable, cap))
    rank5_coefficients = {
        family: str(sp.factor(sp.diff(current, row[family][5])))
        for family in "WABZ"
    }
    report = {
        "marker": MARKER,
        "rank": 7,
        "coefficient": "g4",
        "exact_D_coefficients": {key: str(value) for key, value in exact_d_coefficients.items()},
        "D_relaxation": {
            "negative_payments": {key: str(value) for key, value in d_lower_terms.items()},
            "positive_rows_dropped": positive_d_rows_dropped,
            "facts_needed": [
                "Every D minor is induced inside the corresponding C minor.",
                "n>=2 makes 7-8n negative.",
                "All marked partition counts are nonnegative.",
            ],
        },
        "rank8_elimination": {
            "coefficients": rank8_coefficients,
            "caps": {str(key): str(value) for key, value in caps8.items()},
        },
        "rank7_coefficients_after_elimination": rank7_coefficients,
        "rank7_elimination_caps": {str(key): str(value) for key, value in caps7.items()},
        "rank6_coefficients_after_elimination": rank6_coefficients,
        "rank6_elimination_caps": {str(key): str(value) for key, value in caps6.items()},
        "rank5_coefficients_after_elimination": rank5_coefficients,
        "residual_expression": str(sp.factor(current)),
        "status": "probe only; no universal sign asserted",
        "dependencies_sha256": {
            SOURCE_DEP.name: SOURCE_DEP_SHA,
            REPORT_DEP.name: REPORT_DEP_SHA,
        },
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "rank8_coefficients": rank8_coefficients,
        "rank7_coefficients": rank7_coefficients,
        "rank6_coefficients": rank6_coefficients,
        "rank5_coefficients": rank5_coefficients,
        "source_sha256": report["source_sha256"],
        "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
