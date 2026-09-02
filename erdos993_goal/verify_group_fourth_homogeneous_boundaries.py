#!/usr/bin/env python3
"""Cross-check the six symbolic s=3 boundary couplings against exact rows."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from analyze_group_fourth_homogeneous_jacobi import one_cell
from derive_group_fourth_homogeneous_boundaries import coupling_ratio


HERE = Path(__file__).resolve().parent
REPORT = HERE / "group_fourth_homogeneous_boundary_verification_20260804.json"


def main() -> None:
    records = []
    for offset in range(3):
        for parity in ("even", "odd"):
            symbolic = coupling_ratio(offset, parity)
            n_symbol = next(symbol for symbol in symbolic.free_symbols if symbol.name == "n")
            minimum = 4 if offset == 2 else 3
            for n_value in range(minimum, 8):
                p0 = 2 * n_value + (parity == "odd")
                d = p0 - 2 * offset + 3
                N = d + offset
                assert d - offset >= 5
                exact = sp.sympify(one_cell(N, d)["coupling_ratio"])
                predicted = sp.factor(symbolic.subs(n_symbol, n_value))
                assert sp.cancel(exact - predicted) == 0
                records.append(
                    {
                        "r": offset,
                        "parity": parity,
                        "n": n_value,
                        "N": N,
                        "d": d,
                        "ratio": str(exact),
                    }
                )
    report = {
        "status": "PASS_EXACT_SYMBOLIC_TO_ROW_CROSSCHECK",
        "layer_deficit": 3,
        "cell_count": len(records),
        "records": records,
    }
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"],
        "cell_count": len(records),
        "report": str(REPORT),
    }, indent=2))


if __name__ == "__main__":
    main()
