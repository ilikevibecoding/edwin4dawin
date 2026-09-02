#!/usr/bin/env python3
"""Exact fail-closed parent-mode reductions of literal rank-seven bundle G2."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g2_marked_partition_exact_rank7_g5_finish_20260831.json"
INPUT_SHA256 = "2BF3E8A4593CF7BC6517234B48BFA0D1862680E742087D5F9D01117626B3D285"
OUTPUT = HERE / "iso_n7_bundle_g2_parent_modes_exact_rank7_g5_finish_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N7_BUNDLE_G2_PARENT_MODES_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA256
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    assert source["marker"] == (
        "DERIVED_EXACT_ISO_N7_BUNDLE_G2_MARKED_PARTITION_RANK7_G5_FINISH"
    )
    symbols = {
        name: sp.Symbol(name, nonnegative=True)
        for name in source["summary"]["free_symbols"]
    }
    expression = sp.expand(sp.sympify(source["partitioned_expression"], locals=symbols))
    W = {k: symbols[f"W{k}"] for k in range(2, 9)}
    A = {k: symbols[f"A{k}"] for k in range(3, 9)}
    B = {k: symbols[f"B{k}"] for k in range(3, 9)}
    Z = {k: symbols[f"Z{k}"] for k in range(4, 9)}

    def substitutions(kind: str):
        if kind == "no_parent":
            e = lambda k: W[k] + A[k] + B[k] + Z[k]
            u = lambda k: W[k] + A[k]
            v = lambda k: W[k] + B[k]
        elif kind == "endpoint_u":
            e = lambda k: W[k] + A[k]
            u = lambda k: W[k] + A[k]
            v = lambda k: W[k]
        elif kind == "endpoint_v":
            e = lambda k: W[k] + B[k]
            u = lambda k: W[k]
            v = lambda k: W[k] + B[k]
        else:
            raise AssertionError(kind)
        return {
            symbols["dE5"]: e(5),
            symbols["dE6"]: e(6),
            symbols["dE7"]: e(7),
            symbols["dU4"]: u(4),
            symbols["dU5"]: u(5),
            symbols["dU6"]: u(6),
            symbols["dV4"]: v(4),
            symbols["dV5"]: v(5),
            symbols["dV6"]: v(6),
            symbols["dW3"]: W[3],
            symbols["dW4"]: W[4],
            symbols["dW5"]: W[5],
        }

    modes = {}
    for kind in ("no_parent", "endpoint_u", "endpoint_v"):
        value = sp.factor(expression.subs(substitutions(kind)))
        modes[kind] = {
            "expression": str(value),
            "terms": len(sp.Poly(value, *sorted(value.free_symbols, key=str)).terms()),
        }
    endpoint_u = sp.sympify(modes["endpoint_u"]["expression"], locals=symbols)
    endpoint_v = sp.sympify(modes["endpoint_v"]["expression"], locals=symbols)
    swap = {
        **{A[k]: B[k] for k in A},
        **{B[k]: A[k] for k in B},
    }
    assert sp.expand(endpoint_u.xreplace(swap) - endpoint_v) == 0

    P = {
        family: {
            k: sp.Symbol(f"P{family}{k}", nonnegative=True)
            for k in range(3, 8)
        }
        for family in "WABZ"
    }
    ordinary = {
        symbols["dE5"]: W[5] + A[5] + B[5] + Z[5] - sum(P[x][5] for x in "WABZ"),
        symbols["dE6"]: W[6] + A[6] + B[6] + Z[6] - sum(P[x][6] for x in "WABZ"),
        symbols["dE7"]: W[7] + A[7] + B[7] + Z[7] - sum(P[x][7] for x in "WABZ"),
        symbols["dU4"]: W[4] + A[4] - P["W"][4] - P["A"][4],
        symbols["dU5"]: W[5] + A[5] - P["W"][5] - P["A"][5],
        symbols["dU6"]: W[6] + A[6] - P["W"][6] - P["A"][6],
        symbols["dV4"]: W[4] + B[4] - P["W"][4] - P["B"][4],
        symbols["dV5"]: W[5] + B[5] - P["W"][5] - P["B"][5],
        symbols["dV6"]: W[6] + B[6] - P["W"][6] - P["B"][6],
        symbols["dW3"]: W[3] - P["W"][3],
        symbols["dW4"]: W[4] - P["W"][4],
        symbols["dW5"]: W[5] - P["W"][5],
    }
    ordinary_value = sp.factor(expression.subs(ordinary))
    pvars = tuple(sorted(
        (variable for variable in ordinary_value.free_symbols if str(variable).startswith("P")),
        key=str,
    ))
    assert all(sp.diff(ordinary_value, variable, 2) == 0 for variable in pvars)
    modes["ordinary_parent"] = {
        "expression": str(ordinary_value),
        "terms": len(sp.Poly(ordinary_value, *sorted(ordinary_value.free_symbols, key=str)).terms()),
        "P_coefficients": {
            str(variable): str(sp.factor(sp.diff(ordinary_value, variable)))
            for variable in pvars
        },
    }

    report = {
        "marker": MARKER,
        "rank": 7,
        "coefficient": "g2",
        "modes": modes,
        "endpoint_symmetry_checked": True,
        "ordinary_parent_semantics": (
            "PFk counts C-category F independent k-sets containing the ordinary "
            "deleted parent p; D_Fk=C_Fk-PFk exactly"
        ),
        "status": "exact parent-mode algebra; no sign theorem asserted",
        "scope": "Literal rank-seven G2 only.",
        "input_sha256": INPUT_SHA256,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "mode_terms": {key: value["terms"] for key, value in modes.items()},
        "ordinary_parent_coordinates": len(pvars),
        "endpoint_symmetry_checked": True,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
