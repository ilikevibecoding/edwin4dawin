#!/usr/bin/env python3
"""Derive the corrected singleton-endpoint rank-five g1 residual.

For the canonical endpoint mode p=u, put

    U=I(G-u), W=I(G-u-v),
    QE=I(G-N[u]), QV=I(G-N[u]-v).

Then C=(U+xQE,U,W+xQV,W) and D=(U,U,W,W).  This replay substitutes those
rows directly into the raw 54-term g1 and proves the exact 11-term deletion
correction.  It also proves the useful collapse

    N4(C)+Corr_ep = N4(D)+Delta,

where Delta is the sum of two three-term second-difference blocks.  This is
algebra only; no sign of Delta, the residual, or g1 is asserted.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    nested,
    raw_coefficients,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g1_singleton_endpoint_corrected_residual_exact_g1_nonadjacent_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G1_SINGLETON_ENDPOINT_CORRECTED_RESIDUAL_G1_NONADJACENT"


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else 0


def shift(row):
    return tuple(at(row, rank - 1) for rank in range(len(row)))


def add(left, right):
    return tuple(sp.expand(a + b) for a, b in zip(left, right))


def correction(U, W, QE, QV):
    return sp.expand(
        -2 * U[2] * QV[1]
        + 6 * U[2] * QV[3]
        - 10 * U[3] * QV[2]
        + 6 * U[4] * QV[1]
        - 2 * W[1] * QE[2]
        + 6 * W[1] * QE[4]
        + W[1] * QV[3]
        - 10 * W[2] * QE[3]
        - 2 * W[2] * QV[2]
        + 6 * W[3] * QE[2]
        + W[3] * QV[1]
    )


def block(A, B):
    return sp.expand(A[2] * B[3] - 2 * A[3] * B[2] + A[4] * B[1])


def row_rules(symbol_rows, value_rows):
    return {
        symbol: value
        for symbols, values in zip(symbol_rows, value_rows)
        for symbol, value in zip(symbols, values)
    }


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    U = (sp.Integer(1), *sp.symbols("U1:7"))
    W = (sp.Integer(1), *sp.symbols("W1:7"))
    QE = (sp.Integer(1), *sp.symbols("QE1:7"))
    QV = (sp.Integer(1), *sp.symbols("QV1:7"))
    C = (add(U, shift(QE)), U, add(W, shift(QV)), W)
    D = (U, U, W, W)

    crows, drows, raw_g1, _raw_g2 = raw_coefficients()
    endpoint = sp.expand(raw_g1.subs(row_rules(crows, C) | row_rules(drows, D)))
    no_mark = sp.expand(raw_g1.subs(row_rules(crows, C) | row_rules(drows, C)))
    raw_correction = sp.expand(endpoint - no_mark)
    expected_correction = correction(U, W, QE, QV)
    assert sp.expand(raw_correction - expected_correction) == 0
    assert len(sp.Add.make_args(expected_correction)) == 11

    n4_c = sp.expand(nested(C, 4))
    n4_d = sp.expand(nested(D, 4))
    delta = sp.expand(block(QE, W) + block(U, QV))
    residual = sp.expand(n4_c + expected_correction)
    assert sp.expand(residual - n4_d - delta) == 0

    # A concrete regression guard distinguishes the corrected 11-term form
    # from the previously circulated incomplete eight-term specialization.
    witness = {
        **{U[i]: value for i, value in enumerate((1, 5, 6, 1, 0, 0, 0))},
        **{W[i]: value for i, value in enumerate((1, 4, 3, 0, 0, 0, 0))},
        **{QE[i]: value for i, value in enumerate((1, 5, 6, 1, 0, 0, 0))},
        **{QV[i]: value for i, value in enumerate((1, 4, 3, 0, 0, 0, 0))},
    }
    assert int(raw_correction.subs(witness)) == -174
    incomplete_eight = sp.expand(expected_correction - (
        W[1] * QV[3] - 2 * W[2] * QV[2] + W[3] * QV[1]
    ))
    assert int(incomplete_eight.subs(witness)) == -156

    s_block = sp.expand(no_mark - 2 * n4_c)
    assert sp.expand(endpoint - (s_block + n4_c + n4_d + delta)) == 0

    report = {
        "marker": MARKER,
        "rows": {
            "C": "(U+xQE,U,W+xQV,W)",
            "D": "(U,U,W,W)",
            "definitions": "U=I(G-u), W=I(G-u-v), QE=I(G-N[u]), QV=I(G-N[u]-v)",
        },
        "correction_identity": "g1(C,D)=g1(C,C)+Corr_ep",
        "corrected_corr_ep": str(sp.factor(expected_correction)),
        "correction_terms": 11,
        "residual_identity": "N4(C)+Corr_ep=N4(D)+Delta",
        "delta": str(sp.factor(delta)),
        "block_interpretation": "B(A,B)=a2*b3-2*a3*b2+a4*b1=[z4w3](z-w)^2 A(z)B(w)",
        "endpoint_compact_identity": "g1_endpoint=S(C)+N4(C)+N4(D)+Delta",
        "regression_guard": {
            "graph6": "EIGG",
            "marks": [0, 3],
            "corrected_raw_correction": -174,
            "incomplete_eight_term_value": -156,
        },
        "all_symbolic_residuals_zero": True,
        "scope": "Exact singleton-endpoint algebra only; no sign theorem is asserted.",
        "dependencies": {
            "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py": sha256(
                HERE / "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py"
            ),
        },
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
