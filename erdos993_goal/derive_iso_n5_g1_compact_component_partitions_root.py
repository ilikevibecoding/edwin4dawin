#!/usr/bin/env python3
"""Partition M5, C5, N4, and M5+3C5 by marked-set membership.

For W=A, U=A+xB, V=A+xC, E=A+xB+xC+epsilon*x^2D, each quadratic compact
component splits into H(A)+L(A,B)+L(A,C)+K(B,C)+epsilon*K(A,D).  This exact
artifact records the four separate splits and checks their reconstruction.
No sign is inferred.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n5_bundle_g1_no_mark_root_compact_root_20260829.json"
OUTPUT = HERE / "iso_n5_g1_compact_component_partitions_root_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N5_G1_COMPACT_COMPONENT_PARTITIONS_ROOT"


def split(expression: sp.Expr) -> dict:
    a = sp.symbols("a0:7")
    b = sp.symbols("b0:6")
    c = sp.symbols("p0:6")
    d = sp.symbols("d0:5")
    epsilon = sp.Symbol("epsilon")
    rules = {}
    for index in range(7):
        av = a[index]
        bv = b[index - 1] if 1 <= index <= 6 else 0
        cv = c[index - 1] if 1 <= index <= 6 else 0
        dv = epsilon * d[index - 2] if 2 <= index <= 6 else 0
        rules[sp.Symbol(f"cW{index}")] = av
        rules[sp.Symbol(f"cU{index}")] = av + bv
        rules[sp.Symbol(f"cV{index}")] = av + cv
        rules[sp.Symbol(f"cE{index}")] = av + bv + cv + dv
    value = sp.expand(expression.subs(rules))
    zero_b, zero_c, zero_d = ({x: 0 for x in row} for row in (b, c, d))
    h = sp.expand(value.subs(zero_b | zero_c | zero_d))
    lab = sp.expand(value.subs(zero_c | zero_d) - h)
    lac = sp.expand(value.subs(zero_b | zero_d) - h)
    kbc = sp.expand(value.subs(zero_d) - h - lab - lac)
    kad = sp.expand((value - value.subs({epsilon: 0})) / epsilon)
    assert sp.expand(value - h - lab - lac - kbc - epsilon * kad) == 0
    assert sp.expand(lac - lab.xreplace(dict(zip(b, c)))) == 0
    return {
        "H": str(sp.factor(h)),
        "L": str(sp.factor(lab)),
        "K_BC": str(sp.factor(kbc)),
        "K_AD": str(sp.factor(kad)),
        "term_counts": {
            "H": len(sp.Add.make_args(h)), "L": len(sp.Add.make_args(lab)),
            "K_BC": len(sp.Add.make_args(kbc)), "K_AD": len(sp.Add.make_args(kad)),
        },
    }


def main() -> None:
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    assert source["marker"] == "PASS_EXACT_ISO_N5_BUNDLE_G1_NO_MARK_ROOT_COMPACT_IDENTITY_ROOT"
    partitions = {
        name: split(sp.sympify(source["raw_forms"][name]))
        for name in ("M5", "C5", "N4", "M5_plus_3C5")
    }
    report = {
        "marker": MARKER,
        "rows": "W=A,U=A+xB,V=A+xC,E=A+xB+xC+epsilon*x^2D",
        "partitions": partitions,
        "input_sha256": hashlib.sha256(INPUT.read_bytes()).hexdigest().upper(),
        "scope": "Exact algebraic partitions only; no component sign is asserted.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
