#!/usr/bin/env python3
"""Exact occupation form for adjacent ordinary-parent marked-spine G2.

Let pu and uv be forest edges, with marks u,v and ordinary deleted parent p.
Put A=G-{u,v}, B=G-N[v], C=G-N[u], Q=G-N[p], X=Q-v and
Y=Q-N[v].  Then the independent sets lost on deleting p satisfy
PW_r=I_(r-1)(X), PA_r=I_(r-2)(Y), PB_r=0.  This artifact substitutes those
identities into the literal parent-loss normal form.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
LOSS = HERE / "iso_n6_bundle_g2_adjacent_ordinary_parent_loss_exact_rank7_g5_finish_20260831.json"
LOSS_SHA256 = "DCEDB94D866F61E6E0CEC1F36346D65388642F1CA9FA7B0E700C5C05D0D654DA"
NO_PARENT = HERE / "iso_n6_bundle_g2_no_parent_occupation_exact_root_20260831.json"
NO_PARENT_SHA256 = "106BD6048269E1CFE1F51A0DA162312786E28EB8E8707BF57CBBE8E7BA9D0F83"
OUTPUT = HERE / "iso_n6_bundle_g2_adjacent_ordinary_marked_spine_occupation_exact_rank7_g5_finish_20260831.json"
MARKER = "DERIVED_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_OCCUPATION_RANK7_G5_FINISH"


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def summary(value):
    poly = sp.Poly(value, *sorted(value.free_symbols, key=str))
    return {
        "terms": len(poly.terms()),
        "negative_scalar_coefficients": sum(1 for c in poly.coeffs() if c < 0),
        "minimum_scalar_coefficient": str(min(poly.coeffs())),
        "sha256": hashlib.sha256(str(value).encode()).hexdigest().upper(),
    }


def main():
    assert sha256(LOSS) == LOSS_SHA256
    assert sha256(NO_PARENT) == NO_PARENT_SHA256
    loss = json.loads(LOSS.read_text(encoding="utf-8"))
    base = json.loads(NO_PARENT.read_text(encoding="utf-8"))
    a = sp.symbols("a0:8", integer=True, nonnegative=True)
    b = sp.symbols("b0:7", integer=True, nonnegative=True)
    c = sp.symbols("c0:7", integer=True, nonnegative=True)
    x = sp.symbols("x0:6", integer=True, nonnegative=True)
    y = sp.symbols("y0:5", integer=True, nonnegative=True)
    pnames = {label: sp.Symbol(label, nonnegative=True) for label in loss["active_parent_loss_variables"]}
    local = {str(z): z for z in (*a, *b, *c, *x, *y, *pnames.values())}
    no_parent = sp.expand(sum(
        sp.sympify(base["pieces"][label], locals=local)
        for label in ("A2", "L2_AB", "L2_AC", "K2_BC")
    ))
    correction = sp.sympify(loss["correction"], locals=local)
    spine = {}
    for rank in range(2, 7):
        spine[pnames[f"PW{rank}"]] = x[rank-1]
    for rank in range(3, 7):
        spine[pnames[f"PA{rank}"]] = y[rank-2]
    for rank in range(3, 7):
        spine[pnames[f"PB{rank}"]] = 0
    target = sp.expand(no_parent + correction.subs(spine))
    loss_spine = sp.expand(target-no_parent)
    active_xy = tuple(z for z in (*x, *y) if z in target.free_symbols)
    assert sp.Poly(target, *active_xy).total_degree() == 1
    derivatives = {str(z): str(sp.factor(sp.diff(target, z))) for z in active_xy}
    report = {
        "marker": MARKER,
        "scope": "forest spine pu-uv; marks u,v; deleted ordinary p",
        "induced_rows": {
            "A": "G-{u,v}", "B": "G-N[v]", "C": "G-N[u]",
            "Q": "G-N[p]", "X": "Q-v", "Y": "Q-N[v]",
        },
        "exact_parent_loss_substitution": {
            "PW_r": "x_(r-1), 2<=r<=6",
            "PA_r": "y_(r-2), 3<=r<=6",
            "PB_r": "0, 3<=r<=6",
        },
        "row_relations": "Y is an induced subforest of X; |Y|<=|X|<=|A|-1",
        "target": str(sp.factor(target)),
        "parent_correction": str(sp.factor(loss_spine)),
        "active_XY": [str(z) for z in active_xy],
        "XY_derivatives": derivatives,
        "summaries": {
            "no_parent": summary(no_parent),
            "parent_correction": summary(loss_spine),
            "ordinary_total": summary(target),
        },
        "inputs": {
            "loss": {"file": LOSS.name, "sha256": LOSS_SHA256},
            "no_parent": {"file": NO_PARENT.name, "sha256": NO_PARENT_SHA256},
        },
        "status": "exact marked-spine occupation identity; no sign theorem asserted",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({"marker": MARKER, "active_XY": report["active_XY"], "derivatives": derivatives, "summaries": report["summaries"]}, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
