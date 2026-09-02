#!/usr/bin/env python3
"""Explore a path-to-edgeless coefficient box for the q-free tail.

This first diagnostic handles the main subcone A2,B2>=7.  The cross-containment
lower is monotone in the remaining A/B high rows, so they are replaced by the
universal path minima.  The W rows are independently placed between path and
edgeless bounds.  A negative point would obstruct this relaxation only.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path
import random

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g1_retained_isolate_qfree_high_caps_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_tail_box_probe_root_20260901.json"
MARKER = "EXPLORED_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_TAIL_BOX_ROOT"
EXPECTED_INPUT_SHA256 = "56A0FF0618A94D14AC40C93C585598DEF9441D9F7908E8300C3E35FB58AA4A22"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(top: sp.Expr, rank: int) -> sp.Expr:
    return sp.prod(top - offset for offset in range(rank)) / math.factorial(rank)


def build(label: str) -> sp.Expr:
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    expression = sp.sympify(source["branches"][label]["cross_remaining_expression"])
    a, b = sp.symbols("a b", nonnegative=True)
    p, x2, x3, x4 = sp.symbols("p x2 x3 x4", nonnegative=True)
    A, B = sp.Symbol("CA2"), sp.Symbol("CB2")
    Aval, Bval = 7 + a, 7 + b
    rules = {A: Aval, B: Bval}
    for family, order in (("A", Aval), ("B", Bval)):
        for rank in range(3, 6):
            rules[sp.Symbol(f"C{family}{rank}")] = choose(order - (rank - 1) + 1, rank - 1)
    for rank in range(3, 6):
        rules[sp.Symbol(f"CZ{rank}")] = 0
    expression = sp.expand(expression.subs(rules))

    # Adjacent: A2+B2 >= s+6. Nonadjacent: A2+B2 >= s+5.
    span = (8 if label.startswith("adjacent") else 9) + a + b
    svalue = p * span
    m = svalue + 6
    w_rules = {}
    for rank, coordinate in ((2, x2), (3, x3), (4, x4)):
        lower = choose(m - rank + 1, rank)
        upper = choose(m, rank)
        w_rules[sp.Symbol(f"CW{rank}")] = lower + coordinate * (upper - lower)
    return sp.factor(sp.expand(expression.subs(sp.Symbol("s"), svalue).subs(w_rules)))


def main() -> None:
    input_hash = sha256(INPUT)
    if input_hash != EXPECTED_INPUT_SHA256:
        raise RuntimeError(f"input hash mismatch: {input_hash}")
    rng = random.Random(993_641_905)
    trials = 200_000
    branches = {}
    for label in ("adjacent_u0_v0", "nonadjacent_u0_v0"):
        expression = build(label)
        variables = tuple(sorted(expression.free_symbols, key=str))
        evaluate = sp.lambdify(variables, expression, "math")
        minimum = None
        negative = 0
        for _ in range(trials):
            values = {
                "a": rng.randrange(0, 80),
                "b": rng.randrange(0, 80),
                "p": rng.random(),
                "x2": rng.random(),
                "x3": rng.random(),
                "x4": rng.random(),
            }
            value = float(evaluate(*(values[str(variable)] for variable in variables)))
            negative += value < -1e-7
            record = (value, values)
            minimum = record if minimum is None or value < minimum[0] else minimum
        polynomial = sp.Poly(sp.expand(expression), *variables)
        branches[label] = {
            "trials": trials,
            "negative": negative,
            "minimum": minimum,
            "terms": len(polynomial.terms()),
            "negative_scalar_coefficients": sum(
                coefficient.is_negative is True for coefficient in polynomial.coeffs()
            ),
            "expression": str(expression),
            "expression_sha256": hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper(),
        }
    report = {
        "marker": MARKER,
        "subcone": "A2=7+a, B2=7+b; a,b>=0",
        "normalization": (
            "s=p*(A2+B2-6) adjacent or p*(A2+B2-5) nonadjacent; "
            "W_k=path_k+x_k*(edgeless_k-path_k), p,x_k in [0,1]."
        ),
        "branches": branches,
        "scope_guard": (
            "Finite random continuous-box sampling is diagnostic only. Negative points "
            "obstruct the relaxation, not genuine forests or the retained-isolate target."
        ),
        "input_sha256": input_hash,
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "branches": {
            label: {key: row[key] for key in ("negative", "minimum", "terms", "negative_scalar_coefficients")}
            for label, row in branches.items()
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
