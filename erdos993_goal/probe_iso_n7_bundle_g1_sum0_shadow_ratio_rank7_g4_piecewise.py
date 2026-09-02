#!/usr/bin/env python3
"""Exact shadow-ratio probe for rank-seven G1, sum-zero no-parent geometry.

Here both marks are isolated from W and from one another, hence A_k=B_k=
W_{k-1} and Z_k=W_{k-2}.  Consecutive independent-set levels are coupled by
(k+1)W_{k+1}<=(m-k)W_k.  This source checks the resulting exact unit-box
polynomial; it remains a probe until an independent fail-closed replay.
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
OUTPUT = HERE / "iso_n7_bundle_g1_sum0_shadow_ratio_probe_rank7_g4_piecewise_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G1_SUM0_SHADOW_RATIO_RANK7_G4_PIECEWISE"
THRESHOLD_M = 9


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA256
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    names = {
        name: sp.Symbol(name, nonnegative=True)
        for name in source["summary"]["free_symbols"]
    } if "summary" in source else {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 9)
    }
    # The parent-mode report does not repeat the marked summary, so complete
    # the local symbol table explicitly and parse the pinned expression.
    names.update({
        f"{family}{rank}": sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 9)
    })
    expression = sp.expand(sp.sympify(
        source["modes"]["no_parent"]["expression"], locals=names
    ))
    exact_shifts = {
        names[f"A{k}"]: names[f"W{k-1}"] for k in range(4, 9)
    }
    exact_shifts.update({
        names[f"B{k}"]: names[f"W{k-1}"] for k in range(4, 9)
    })
    exact_shifts.update({
        names[f"Z{k}"]: names[f"W{k-2}"] for k in range(5, 9)
    })
    reduced = sp.expand(expression.subs(exact_shifts, simultaneous=True))
    W = {k: names[f"W{k}"] for k in range(3, 9)}
    assert reduced.free_symbols <= set(W.values())

    m, tail = sp.symbols("m tail", nonnegative=True)
    ratios = {k: sp.Symbol(f"r{k}", nonnegative=True) for k in range(3, 8)}
    chain = {W[3]: sp.Symbol("w3", nonnegative=True)}
    current = chain[W[3]]
    for k in range(3, 8):
        current = sp.cancel(current*(m-k)*ratios[k]/(k+1))
        chain[W[k+1]] = current
    factored = sp.factor(reduced.subs(chain, simultaneous=True))
    w3 = chain[W[3]]
    quotient = sp.cancel(factored/w3**2)
    assert sp.expand(factored-w3**2*quotient) == 0
    shifted = sp.cancel(quotient.subs(m, tail+THRESHOLD_M))
    variables = tuple(ratios[k] for k in range(3, 8))
    summary = fast_summary(shifted, variables, tail)

    report = {
        "marker": MARKER,
        "geometry": "nonadjacent_common0_sum0",
        "mode": "no_parent",
        "threshold_n": THRESHOLD_M+2,
        "exact_reduced_expression": str(sp.factor(reduced)),
        "ratio_substitution": {
            f"W{k+1}": str(chain[W[k+1]]) for k in range(3, 8)
        },
        "normalized_expression": str(sp.factor(quotient)),
        "summary": summary,
        "shadow_fact": (
            "For every downward-closed independent-set complex on m vertices, "
            "(k+1)W_(k+1)<=(m-k)W_k; each ratio r_k lies in [0,1]."
        ),
        "zero_case": (
            "If W3=0, downward closure forces W4=...=W8=0 and G1=0."
        ),
        "status": "diagnostic exact unit-box probe; no theorem asserted",
        "scope": "Rank-seven G1, no-parent, common0/sum0, n>=11 only.",
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "degree_profile": summary["degree_profile"],
        "negative_tail_scalar_coefficients": summary["negative_tail_scalar_coefficients"],
        "minimum_tail_scalar_coefficient": summary["minimum_tail_scalar_coefficient"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
