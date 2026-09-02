#!/usr/bin/env python3
"""Dense-isolate probe for rank-seven G1, sum-zero endpoint-parent modes.

Write W=H plus r isolated vertices, where H is arbitrary on h vertices and
h<=|W|/10.  The relaxation uses only 0<=i_k(H)<=h^k/k!, independently for
k=2,...,8.  This is a diagnostic probe; it does not assert a theorem.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json"
INPUT_SHA256 = "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490"
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_dense_isolates_endpoint_probe_rank7_g4_piecewise_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_DENSE_ISOLATES_ENDPOINT_RANK7_G4_PIECEWISE"
THRESHOLD_M = 9
CORE_FRACTION = sp.Rational(1, 10)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(h, k):
    if k < 0:
        return sp.Integer(0)
    if k == 0:
        return sp.Integer(1)
    return sp.prod(h-j for j in range(k))/sp.factorial(k)


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA256
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 9)
    }
    W = {k: symbols[f"W{k}"] for k in range(2, 9)}
    shifts = {symbols[f"A{k}"]: W[k-1] for k in range(4, 9)}
    shifts.update({symbols[f"B{k}"]: W[k-1] for k in range(4, 9)})
    shifts.update({symbols[f"Z{k}"]: W[k-2] for k in range(5, 9)})
    reduced = {}
    for mode in ("endpoint_u", "endpoint_v"):
        expression = sp.expand(sp.sympify(
            source["modes"][mode]["expression"], locals=symbols
        ))
        reduced[mode] = sp.factor(expression.subs(shifts, simultaneous=True))
    assert sp.expand(reduced["endpoint_u"]-reduced["endpoint_v"]) == 0

    m, tail, core_parameter = sp.symbols(
        "m tail core_parameter", nonnegative=True
    )
    level_parameter = {
        k: sp.Symbol(f"level{k}_parameter", nonnegative=True)
        for k in range(2, 9)
    }
    h = CORE_FRACTION*m*core_parameter
    isolates = m-h
    core_rows = {
        0: sp.Integer(1), 1: h,
        **{
            k: h**k*level_parameter[k]/sp.factorial(k)
            for k in range(2, 9)
        },
    }
    rows = {
        k: sp.expand(sum(
            choose(isolates, k-j)*core_rows[j] for j in range(k+1)
        ))
        for k in range(3, 9)
    }
    value = sp.factor(reduced["endpoint_u"].subs(
        {W[k]: rows[k] for k in range(3, 9)}
    ))
    shifted = sp.cancel(value.subs(m, tail+THRESHOLD_M))
    variables = (core_parameter, *(level_parameter[k] for k in range(2, 9)))
    print("CERT_START", variables, flush=True)
    summary = fast_summary(shifted, variables, tail)
    report = {
        "marker": MARKER,
        "geometry": "nonadjacent_common0_sum0",
        "modes": ["endpoint_u", "endpoint_v"],
        "endpoint_symmetry_checked": True,
        "threshold_n": THRESHOLD_M+2,
        "core_fraction": str(CORE_FRACTION),
        "decomposition": "W=H plus m-h isolates",
        "universal_core_box": "0<=i_k(H)<=h^k/k! independently for k=2,...,8",
        "summary": summary,
        "negative_tail_scalar_coefficients": summary[
            "negative_tail_scalar_coefficients"
        ],
        "status": "diagnostic exact relaxation; no theorem asserted",
        "scope": (
            "Rank-seven G1, common0/sum0, endpoint-parent modes, n>=11, "
            "with at least 90 percent of W vertices isolated."
        ),
        "input_sha256": INPUT_SHA256,
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
