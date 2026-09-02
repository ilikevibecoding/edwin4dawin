#!/usr/bin/env python3
"""Try a rigorous interval certificate for the stable p=v spine branch.

Let R=I(F-v), with N vertices, and Q=I(F-N[v]), with q<=N vertices.
Use exact subset upper bounds R_k<=C(N,k), Q_k<=C(q,k), together with the
forest pair lower bound R_2>=C(N-1,2).  Coefficient signs and final lower
bounds on N>=M, 0<=q<=N are certified by a Bernstein basis in y=q/N and
ordinary nonnegative powers after N=M+t.
"""

from __future__ import annotations

import hashlib
import json
import re
from math import factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n4_internal_spine_parent_equals_mark_probe_root_20260829.json"
OUTPUT = HERE / "iso_n4_internal_spine_parent_equals_mark_interval_probe_root_20260829.json"


def choose(variable: sp.Expr, k: int) -> sp.Expr:
    if k < 0:
        return sp.Integer(0)
    return sp.expand(sp.prod(variable - j for j in range(k)) / factorial(k))


def bernstein_y_nonnegative(expression: sp.Expr, N: sp.Symbol, q: sp.Symbol, threshold: int) -> bool:
    t, y = sp.symbols("t y", nonnegative=True)
    shifted = sp.expand(expression.subs({N: threshold + t, q: (threshold + t) * y}))
    polynomial = sp.Poly(shifted, y)
    degree = polynomial.degree()
    power = [polynomial.nth(j) for j in range(degree + 1)]
    for k in range(degree + 1):
        coefficient = sp.expand(
            sum(power[j] * sp.binomial(k, j) / sp.binomial(degree, j) for j in range(k + 1))
        )
        if any(value < 0 for value in sp.Poly(coefficient, t).all_coeffs()):
            return False
    return True


def high_bound(symbol: sp.Symbol, N: sp.Symbol, q: sp.Symbol, threshold: int):
    match = re.fullmatch(r"([RQ])(\d+)", str(symbol))
    if match is None:
        raise ValueError(symbol)
    kind, rank_text = match.groups()
    rank = int(rank_text)
    upper = choose(N if kind == "R" else q, rank)
    lower = sp.Integer(0)
    if kind == "R" and rank == 2 and threshold >= 2:
        lower = choose(N - 1, 2)
    return lower, upper


def lower_on_tail(expression: sp.Expr, N: sp.Symbol, q: sp.Symbol, threshold: int):
    reduced = sp.expand(expression.subs({sp.symbols("R1"): N, sp.symbols("Q1"): q}))
    high = tuple(sorted((s for s in reduced.free_symbols if s not in (N, q)), key=str))
    terms = sp.Poly(reduced, *high).terms() if high else [((), reduced)]
    lower = sp.Integer(0)
    ambiguous = []
    for powers, coefficient in terms:
        coefficient = sp.factor(coefficient)
        positive = bernstein_y_nonnegative(coefficient, N, q, threshold)
        negative = bernstein_y_nonnegative(-coefficient, N, q, threshold)
        low_product = sp.Integer(1)
        high_product = sp.Integer(1)
        for symbol, power in zip(high, powers):
            lo, hi = high_bound(symbol, N, q, threshold)
            low_product *= lo**power
            high_product *= hi**power
        if positive:
            lower += coefficient * low_product
        elif negative:
            lower += coefficient * high_product
        else:
            ambiguous.append({"powers": list(powers), "coefficient": str(coefficient)})
    lower = sp.factor(lower)
    ok = not ambiguous and bernstein_y_nonnegative(lower, N, q, threshold)
    return lower, ambiguous, ok


def numeric_interval_lower(expression: sp.Expr, N_value: int, q_value: int):
    substituted = sp.expand(expression.subs({sp.symbols("R1"): N_value, sp.symbols("Q1"): q_value}))
    high = tuple(sorted(substituted.free_symbols, key=str))
    terms = sp.Poly(substituted, *high).terms() if high else [((), substituted)]
    lower = sp.Integer(0)
    for powers, coefficient in terms:
        assert coefficient.is_number
        product = sp.Integer(1)
        for symbol, power in zip(high, powers):
            lo, hi = high_bound(symbol, sp.Integer(N_value), sp.Integer(q_value), max(N_value, 2))
            product *= (lo if coefficient >= 0 else hi) ** power
        lower += coefficient * product
    return sp.factor(lower)


def main():
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == "PROBE_EXACT_ISO_N4_INTERNAL_SPINE_PARENT_EQUALS_MARK_ROOT"
    N, q = sp.symbols("N q", integer=True, nonnegative=True)
    expressions = {
        name: [(entry["j"], sp.sympify(entry["factor"])) for entry in entries]
        for name, entries in dependency["coefficients"].items()
    }
    success_threshold = None
    success_details = None
    for threshold in range(2, 81):
        details = {}
        passed = True
        for name, entries in expressions.items():
            details[name] = []
            for index, expression in entries:
                lower, ambiguous, ok = lower_on_tail(expression, N, q, threshold)
                details[name].append({"j": index, "lower": str(lower), "ambiguous": ambiguous, "ok": ok})
                passed &= ok
        if passed:
            success_threshold = threshold
            success_details = details
            break

    finite = []
    finite_pass = success_threshold is not None
    if success_threshold is not None:
        for N_value in range(success_threshold):
            for q_value in range(N_value + 1):
                for name, entries in expressions.items():
                    for index, expression in entries:
                        lower = numeric_interval_lower(expression, N_value, q_value)
                        ok = lower >= 0
                        finite_pass &= ok
                        if not ok:
                            finite.append({"N": N_value, "q": q_value, "name": name, "j": index, "lower": str(lower)})

    proved = success_threshold is not None and finite_pass
    report = {
        "marker": (
            "PASS_EXACT_ISO_N4_INTERNAL_SPINE_PARENT_EQUALS_MARK_STABLE_INTERVAL_ROOT"
            if proved else "PROBE_EXACT_ISO_N4_INTERNAL_SPINE_PARENT_EQUALS_MARK_INTERVAL_ROOT"
        ),
        "tail_threshold_N": success_threshold,
        "tail_details": success_details,
        "finite_interval_failures": finite,
        "proved_stable_ell_ge_6_all_N_q": proved,
        "bounds": "Rk<=C(N,k), Qk<=C(q,k), R2>=C(N-1,2), 0<=q<=N",
        "dependency_sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "scope_guard": "Stable ell>=6 and p=v only; short ell=1..5 are separate.",
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "threshold": success_threshold,
        "finite_failures": len(finite),
        "proved": proved,
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
