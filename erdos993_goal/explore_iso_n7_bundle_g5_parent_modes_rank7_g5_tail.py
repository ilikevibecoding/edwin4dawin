#!/usr/bin/env python3
"""Exact parent-mode reductions for the open rank-seven bundle g5.

This is an algebraic exploration only.  It substitutes the literal marked
partition identities for no parent, an endpoint parent, and an ordinary
parent.  In the ordinary mode, P-family variables count the C-category sets
that contain the deleted parent.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g5_marked_partition_exact_rank5_g2_alt_20260830.json"
OUTPUT = HERE / "iso_n7_bundle_g5_parent_modes_probe_rank7_g5_tail_20260831.json"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G5_PARENT_MODES_RANK7_G5_TAIL"


def main() -> None:
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    symbols = {
        name: sp.Symbol(name, nonnegative=True)
        for name in source["summary"]["free_symbols"]
    }
    expression = sp.expand(sp.sympify(source["partitioned_expression"], locals=symbols))

    W = {k: symbols[f"W{k}"] for k in range(2, 8)}
    A = {k: symbols[f"A{k}"] for k in range(2, 8)}
    B = {k: symbols[f"B{k}"] for k in range(2, 8)}
    Z = {k: symbols[f"Z{k}"] for k in range(2, 8)}

    def substitutions(kind: str):
        if kind == "no_parent":
            e = lambda k: W[k] + A[k] + B[k] + Z[k]
            u = lambda k: W[k] + A[k]
            v = lambda k: W[k] + B[k]
            w = lambda k: W[k]
        elif kind == "endpoint_u":
            e = lambda k: W[k] + A[k]
            u = lambda k: W[k] + A[k]
            v = lambda k: W[k]
            w = lambda k: W[k]
        elif kind == "endpoint_v":
            e = lambda k: W[k] + B[k]
            u = lambda k: W[k]
            v = lambda k: W[k] + B[k]
            w = lambda k: W[k]
        else:
            raise AssertionError(kind)
        return {
            symbols["DE5"]: e(5), symbols["DE6"]: e(6),
            symbols["DU4"]: u(4), symbols["DU5"]: u(5), symbols["DU6"]: u(6),
            symbols["DV4"]: v(4), symbols["DV5"]: v(5), symbols["DV6"]: v(6),
            symbols["DW3"]: w(3), symbols["DW4"]: w(4), symbols["DW5"]: w(5),
        }

    modes = {}
    for kind in ("no_parent", "endpoint_u", "endpoint_v"):
        value = sp.factor(expression.subs(substitutions(kind)))
        modes[kind] = {
            "expression": str(value),
            "terms": len(sp.Poly(value, *sorted(value.free_symbols, key=str)).terms()),
        }

    # Ordinary parent p: P-family variables are the C-category independent
    # sets containing p.  Deleting p removes exactly these sets.
    P = {
        family: {
            k: sp.Symbol(f"P{family}{k}", nonnegative=True)
            for k in range(2, 7)
        }
        for family in "WABZ"
    }
    ordinary = {
        symbols["DE5"]: W[5] + A[5] + B[5] + Z[5] - sum(P[x][5] for x in "WABZ"),
        symbols["DE6"]: W[6] + A[6] + B[6] + Z[6] - sum(P[x][6] for x in "WABZ"),
        symbols["DU4"]: W[4] + A[4] - P["W"][4] - P["A"][4],
        symbols["DU5"]: W[5] + A[5] - P["W"][5] - P["A"][5],
        symbols["DU6"]: W[6] + A[6] - P["W"][6] - P["A"][6],
        symbols["DV4"]: W[4] + B[4] - P["W"][4] - P["B"][4],
        symbols["DV5"]: W[5] + B[5] - P["W"][5] - P["B"][5],
        symbols["DV6"]: W[6] + B[6] - P["W"][6] - P["B"][6],
        symbols["DW3"]: W[3] - P["W"][3],
        symbols["DW4"]: W[4] - P["W"][4],
        symbols["DW5"]: W[5] - P["W"][5],
    }
    ordinary_value = sp.factor(expression.subs(ordinary))
    pvars = tuple(sorted((x for x in ordinary_value.free_symbols if str(x).startswith("P")), key=str))
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
        "modes": modes,
        "ordinary_parent_semantics": (
            "PFk is the number of C-category F independent k-sets containing "
            "the ordinary deleted parent p; D_Fk=C_Fk-PFk exactly."
        ),
        "status": "exact algebraic probe; no sign theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "mode_terms": {key: row["terms"] for key, row in modes.items()},
        "ordinary_P_coefficients": modes["ordinary_parent"]["P_coefficients"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
