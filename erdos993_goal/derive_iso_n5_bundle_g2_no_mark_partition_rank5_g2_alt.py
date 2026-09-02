#!/usr/bin/env python3
"""Exact mark-occupation partition of no-parent rank-five bundle g2.

This is a reduction, not a sign theorem.  It is intended to expose which
single-row and bilinear forest blocks can use the proved H(F)>=0 reserve.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n5_bundle_g2_compact_polar_split_rank5_g2_alt import raw_g2


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_bundle_g2_no_mark_partition_exact_rank5_g2_alt_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_BUNDLE_G2_NO_MARK_PARTITION_RANK5_G2_ALT"


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def h_value(row):
    def at(rank):
        return row[rank] if 0 <= rank < len(row) else sp.Integer(0)
    return sp.expand(
        2 * at(1) * at(4) - 5 * at(1) * at(5) - 6 * at(1) * at(6)
        + 6 * at(2) * at(3) - 8 * at(2) * at(5) + 5 * at(3) ** 2
        + 6 * at(3) * at(4)
    )


def expression_record(expression):
    symbols = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(sp.expand(expression), *symbols)
    return {
        "terms": len(polynomial.terms()),
        "factored": str(sp.factor(expression)),
        "factored_sha256": hashlib.sha256(str(sp.factor(expression)).encode()).hexdigest().upper(),
    }


def main():
    crows = tuple(tuple(sp.symbols(f"c{name}0:7")) for name in "EUVW")
    g2 = sp.expand(raw_g2(crows, crows))

    # Partition independent sets by membership in the two nonadjacent marks.
    # W=A, U=A+xB, V=A+xC, E=A+xB+xC+epsilon*x^2D.
    a = sp.symbols("a0:7")
    b = sp.symbols("b0:6")
    c = sp.symbols("p0:6")
    d = sp.symbols("d0:5")
    epsilon = sp.symbols("epsilon", nonnegative=True)
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
    partitioned = sp.expand(g2.subs(rules))

    zero_b = {value: 0 for value in b}
    zero_c = {value: 0 for value in c}
    zero_d = {value: 0 for value in d}
    block_a = sp.expand(partitioned.subs(zero_b | zero_c | zero_d))
    block_ab = sp.expand(partitioned.subs(zero_c | zero_d) - block_a)
    block_ac = sp.expand(partitioned.subs(zero_b | zero_d) - block_a)
    block_bc = sp.expand(partitioned.subs(zero_d) - block_a - block_ab - block_ac)
    block_ad = sp.expand((partitioned - partitioned.subs({epsilon: 0})) / epsilon)
    assert sp.expand(partitioned - block_a - block_ab - block_ac - block_bc - epsilon * block_ad) == 0
    assert sp.expand(block_ac - block_ab.xreplace(dict(zip(b, c)))) == 0
    assert sp.expand(block_ad - block_bc.xreplace({**dict(zip(b, a)), **dict(zip(c, d))})) == 0

    h = h_value(a)
    print("A_BLOCK", sp.factor(block_a))
    print("H", sp.factor(h))
    print("A_MINUS_H", sp.factor(block_a - h))
    print("AB", sp.factor(block_ab))
    print("BC", sp.factor(block_bc))

    report = {
        "marker": MARKER,
        "identity": "g2(no_parent)=A2(A)+L2(A,B)+L2(A,C)+K2(B,C)+epsilon*K2(A,D)",
        "rows": "W=A, U=A+xB, V=A+xC, E=A+xB+xC+epsilon*x^2D",
        "blocks": {
            "A2": expression_record(block_a),
            "L2": expression_record(block_ab),
            "K2": expression_record(block_bc),
        },
        "H_comparison": expression_record(sp.expand(block_a - h)),
        "exact_reconstruction": True,
        "sign_status": "No sign is asserted for A2, L2, or K2.",
        "scope": "Exact no-parent rank-five g2 reduction only; not a universal g2 proof.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
