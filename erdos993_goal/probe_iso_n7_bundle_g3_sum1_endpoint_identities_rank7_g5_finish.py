#!/usr/bin/env python3
"""Exact active/inactive endpoint identities for common0/sum1 rank-seven G3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_parent_modes_exact_rank7_g4_piecewise_20260831.json"
INPUT_SHA256 = "6977AF4DC4A353F5520BF6ED4450F0594DDDB7F8541128D28D52B8E77A4EB132"
OUTPUT = HERE / "iso_n7_bundle_g3_sum1_endpoint_identities_probe_rank7_g5_finish_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_SUM1_ENDPOINT_IDENTITIES_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA256
    report = json.loads(INPUT.read_text(encoding="utf-8"))
    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 9)
    }
    symbols["n"] = sp.Symbol("n", positive=True)
    m = sp.Symbol("m", positive=True)
    W = {0: sp.Integer(1), 1: m}
    W.update({rank: symbols[f"W{rank}"] for rank in range(2, 9)})
    R = {0: sp.Integer(0), 1: sp.Integer(1)}
    R.update({rank: sp.Symbol(f"R{rank}", nonnegative=True) for rank in range(2, 8)})
    substitutions = {symbols["n"]: m + 2}
    # The unique W-neighbour x is on the B-mark: A has the full row, while B
    # and Z lose precisely the independent sets containing x.
    substitutions.update({symbols[f"A{rank}"]: W[rank-1] for rank in range(2, 9)})
    substitutions.update({symbols[f"B{rank}"]: W[rank-1]-R[rank-1] for rank in range(2, 9)})
    substitutions.update({symbols[f"Z{rank}"]: W[rank-2]-R[rank-2] for rank in range(2, 9)})

    values = {}
    for mode in ("no_parent", "endpoint_u", "endpoint_v"):
        raw = sp.sympify(report["modes"][mode]["expression"], locals=symbols)
        exact = sp.expand(raw.subs(substitutions, simultaneous=True))
        base = sp.expand(exact.subs({R[rank]: 0 for rank in range(2, 8)}))
        coefficients = {
            rank: sp.factor(sp.diff(exact, R[rank])) for rank in range(2, 8)
        }
        assert sp.expand(exact-base-sum(coefficients[rank]*R[rank] for rank in range(2, 8))) == 0
        values[mode] = {
            "exact": str(exact),
            "R_zero_base": str(base),
            "R_coefficients": {str(rank): str(coefficients[rank]) for rank in range(2, 8)},
            "terms": len(sp.Poly(exact, *sorted(exact.free_symbols, key=str)).terms()),
        }

    expressions = {
        mode: sp.sympify(values[mode]["exact"], locals={**symbols, "m": m, **{f"R{k}": R[k] for k in R}})
        for mode in values
    }
    differences = {
        "endpoint_u_minus_no_parent": str(sp.factor(expressions["endpoint_u"]-expressions["no_parent"])),
        "endpoint_v_minus_no_parent": str(sp.factor(expressions["endpoint_v"]-expressions["no_parent"])),
        "endpoint_u_minus_endpoint_v": str(sp.factor(expressions["endpoint_u"]-expressions["endpoint_v"])),
    }
    out = {
        "marker": MARKER,
        "status": "exact diagnostic identities; no sign theorem asserted",
        "active_mark_convention": "B is the mark with unique W-neighbour x; A is inactive.",
        "modes": values,
        "differences": differences,
        "scope": "Endpoint common0/sum1 rank-seven G3 identities only.",
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(out, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "terms": {mode: row["terms"] for mode, row in values.items()},
        "differences": differences,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", out["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
