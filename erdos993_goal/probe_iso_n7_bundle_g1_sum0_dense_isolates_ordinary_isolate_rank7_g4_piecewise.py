#!/usr/bin/env python3
"""Dense-isolate probe for rank-seven G1 with an isolated ordinary parent.

The marked vertices are isolated.  Write W=H+rK1 with |H|<=|W|/10 and
choose the deleted ordinary parent p from the r isolated vertices.  Only the
universal independent core-count box is used.  No theorem is asserted here.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt import reconstruct_coefficients
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary
from prove_iso_n7_bundle_g1_sum0_dense_isolates_rank7_g4_piecewise import choose
from prove_iso_n7_bundle_g1_sum0_dense_isolates_endpoint_rank7_g4_piecewise import (
    rows_with_two_marks,
    substitute_rows,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_dense_isolates_ordinary_isolate_probe_rank7_g4_piecewise_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_ISOLATES_ORDINARY_ISOLATE_RANK7_G4_PIECEWISE"
THRESHOLD_M = 9
CORE_FRACTION = sp.Rational(1, 10)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def convolve(core, isolates, maximum=8):
    return {
        k: sp.expand(sum(choose(isolates, k-j)*core[j] for j in range(k+1)))
        for k in range(maximum+1)
    }


def main() -> None:
    coefficients = reconstruct_coefficients()
    assert len(coefficients) == 13 and coefficients[0] == 0
    generic = coefficients[1]
    m, tail, core_parameter = sp.symbols("m tail core_parameter", nonnegative=True)
    level_parameter = {
        k: sp.Symbol(f"level{k}_parameter", nonnegative=True)
        for k in range(2, 9)
    }
    h = CORE_FRACTION*m*core_parameter
    isolates = m-h
    core = {
        0: sp.Integer(1), 1: h,
        **{
            k: h**k*level_parameter[k]/sp.factorial(k)
            for k in range(2, 9)
        },
    }
    W = convolve(core, isolates)
    W_deleted = convolve(core, isolates-1)
    value = substitute_rows(
        generic, rows_with_two_marks(W), rows_with_two_marks(W_deleted)
    )
    shifted = sp.expand(value.subs(m, tail+THRESHOLD_M))
    variables = (core_parameter, *(level_parameter[k] for k in range(2, 9)))
    print("CERT_START", variables, flush=True)
    summary = fast_summary(shifted, variables, tail)
    report = {
        "marker": MARKER,
        "geometry": "nonadjacent_common0_sum0",
        "mode": "ordinary_parent_is_isolate",
        "threshold_n": THRESHOLD_M+2,
        "core_fraction": str(CORE_FRACTION),
        "decomposition": "W=H+rK1 and p is one of the r isolates",
        "universal_core_box": "0<=i_k(H)<=h^k/k! independently for k=2,...,8",
        "summary": summary,
        "negative_tail_scalar_coefficients": summary[
            "negative_tail_scalar_coefficients"
        ],
        "status": "diagnostic exact relaxation; no theorem asserted",
        "scope": (
            "Rank-seven G1, common0/sum0, isolated ordinary parent, n>=11, "
            "with at least 90 percent of W vertices isolated."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "degree_profile": summary["degree_profile"],
        "negative_tail_scalar_coefficients": summary[
            "negative_tail_scalar_coefficients"
        ],
        "minimum_tail_scalar_coefficient": summary[
            "minimum_tail_scalar_coefficient"
        ],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
