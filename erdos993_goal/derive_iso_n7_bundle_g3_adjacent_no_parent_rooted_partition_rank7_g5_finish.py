#!/usr/bin/env python3
"""Exact rooted-component partition for adjacent no-parent rank-seven G3."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_parent_modes_exact_rank7_g4_piecewise_20260831.json"
INPUT_SHA256 = "6977AF4DC4A353F5520BF6ED4450F0594DDDB7F8541128D28D52B8E77A4EB132"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_rooted_partition_exact_rank7_g5_finish_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_ROOTED_PARTITION_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA256
    report = json.loads(INPUT.read_text(encoding="utf-8"))
    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 9)
    }
    n = sp.Symbol("n", positive=True)
    symbols["n"] = n
    raw = sp.expand(sp.sympify(report["modes"]["no_parent"]["expression"], locals=symbols))
    m = sp.Symbol("m", nonnegative=True, integer=True)
    W = {0: sp.Integer(1), 1: m}
    W.update({rank: symbols[f"W{rank}"] for rank in range(2, 9)})
    S = {rank: sp.Symbol(f"S{rank}", nonnegative=True) for rank in range(1, 8)}
    T = {rank: sp.Symbol(f"T{rank}", nonnegative=True) for rank in range(1, 8)}
    substitutions = {n: m+2}
    substitutions.update({symbols[f"A{k}"]: S[k-1] for k in range(2, 9)})
    substitutions.update({symbols[f"B{k}"]: T[k-1] for k in range(2, 9)})
    substitutions.update({symbols[f"Z{k}"]: 0 for k in range(2, 9)})
    exact = sp.expand(raw.subs(substitutions, simultaneous=True))
    variables = tuple(sorted(exact.free_symbols, key=str))
    terms = sp.Poly(exact, *variables).terms()
    svars = tuple(S.values())
    tvars = tuple(T.values())
    mixed_second = {
        f"S{i}_T{j}": str(sp.factor(sp.diff(exact, S[i], T[j])))
        for i in S for j in T if sp.diff(exact, S[i], T[j]) != 0
    }
    pure_second = {
        str(variable): str(sp.factor(sp.diff(exact, variable, 2)))
        for variable in (*svars, *tvars) if sp.diff(exact, variable, 2) != 0
    }
    output = {
        "marker": MARKER,
        "status": "exact algebra and structural classifier; no sign theorem asserted",
        "theorem_input_identity": str(exact),
        "row_semantics": {
            "Wj": "independent j-sets of W=C-{u,v}",
            "Sj": "independent j-sets of W-Y, where Y=N_W(v)",
            "Tj": "independent j-sets of W-X, where X=N_W(u)",
            "marked_rows": "A_k=S_(k-1), B_k=T_(k-1), Z_k=0",
        },
        "forest_compatibility_classifier": {
            "conditions": [
                "W is a forest",
                "X and Y are disjoint",
                "every connected component of W contains at most one vertex of X union Y",
            ],
            "necessity": "Two selected vertices in one W-component have a W-path and a second path through u, the edge uv, and/or v, creating a cycle; X intersect Y creates the triangle uvx.",
            "sufficiency": "Adding uv and one mark-edge into each selected W-component joins forest components along a tree and creates no cycle.",
            "exhaustive": True,
        },
        "summary": {
            "terms": len(terms),
            "negative_scalar_coefficients": sum(1 for _powers, value in terms if value < 0),
            "mixed_S_T_second_derivatives": len(mixed_second),
            "pure_S_or_T_second_derivatives": len(pure_second),
        },
        "mixed_second_derivatives": mixed_second,
        "pure_second_derivatives": pure_second,
        "scope": "No-parent adjacent rank-seven G3 only.",
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    raw_output = json.dumps(output, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw_output, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, **output["summary"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", output["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw_output.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
