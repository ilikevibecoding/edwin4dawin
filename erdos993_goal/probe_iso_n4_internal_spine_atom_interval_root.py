#!/usr/bin/env python3
"""Search for a coarse stable-path proof using forest atom intervals.

For the distinct parent-side vertices v,p, fix the exact rank-one atoms and
use subset-count upper bounds for all higher atoms.  The neither-mark rank-2
atom w2 is the number of independent pairs of an m-vertex forest, hence
w2>=C(m,2)-(m-1)=C(m-1,2).  Termwise interval evaluation retains that lower
bound in positive w2 powers and charges negative terms at subset caps.
"""

from __future__ import annotations

import hashlib
import json
import re
from math import factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n4_internal_spine_membership_atoms_probe_root_20260829.json"
OUTPUT = HERE / "iso_n4_internal_spine_atom_interval_probe_root_20260829.json"


def choose(variable: sp.Expr, k: int) -> sp.Expr:
    if k < 0:
        return sp.Integer(0)
    return sp.expand(sp.prod(variable - j for j in range(k)) / factorial(k))


def shifted_nonnegative(poly: sp.Expr, m: sp.Symbol, threshold: int) -> bool:
    t = sp.symbols("t", nonnegative=True)
    values = sp.Poly(sp.expand(poly.subs(m, t + threshold)), t).all_coeffs()
    return all(value >= 0 for value in values)


def atom_bounds(symbol: sp.Symbol, m: sp.Symbol, threshold: int):
    match = re.fullmatch(r"([wabc])(\d+)", str(symbol))
    if match is None:
        raise ValueError(symbol)
    kind, rank_text = match.groups()
    rank = int(rank_text)
    required = {"w": 0, "a": 1, "b": 1, "c": 2}[kind]
    upper = choose(m, rank - required)
    lower = sp.Integer(0)
    if kind == "w" and rank == 2 and threshold >= 2:
        lower = choose(m - 1, 2)
    return lower, upper


def interval_lower(expression: sp.Expr, m: sp.Symbol, threshold: int):
    fixed = {
        sp.symbols("a1"): 1,
        sp.symbols("b1"): 1,
        sp.symbols("c1"): 0,
        sp.symbols("w1"): m,
    }
    reduced = sp.expand(expression.subs(fixed))
    atoms = tuple(sorted((s for s in reduced.free_symbols if s != m), key=str))
    terms = sp.Poly(reduced, *atoms).terms() if atoms else [((), reduced)]
    lower = sp.Integer(0)
    ambiguous = []
    for powers, coefficient in terms:
        coefficient = sp.factor(coefficient)
        is_positive = shifted_nonnegative(coefficient, m, threshold)
        is_negative = shifted_nonnegative(-coefficient, m, threshold)
        low_product = sp.Integer(1)
        high_product = sp.Integer(1)
        for symbol, power in zip(atoms, powers):
            lo, hi = atom_bounds(symbol, m, threshold)
            low_product *= lo**power
            high_product *= hi**power
        if is_positive:
            lower += coefficient * low_product
        elif is_negative:
            lower += coefficient * high_product
        else:
            ambiguous.append({"powers": list(powers), "coefficient": str(coefficient)})
    lower = sp.factor(lower)
    return lower, ambiguous, not ambiguous and shifted_nonnegative(lower, m, threshold)


def main():
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == "PROBE_EXACT_ISO_N4_INTERNAL_SPINE_MEMBERSHIP_ATOMS_ROOT"
    m = sp.symbols("m", integer=True, nonnegative=True)
    expressions = {
        name: [(entry["path_binomial_index"], sp.sympify(entry["factor"])) for entry in entries]
        for name, entries in dependency["coefficients"].items()
    }
    trials = []
    success_threshold = None
    success_details = None
    for threshold in range(2, 61):
        details = {}
        passed = True
        for name, entries in expressions.items():
            details[name] = []
            for index, expression in entries:
                lower, ambiguous, ok = interval_lower(expression, m, threshold)
                details[name].append({
                    "j": index,
                    "lower": str(lower),
                    "ambiguous": ambiguous,
                    "nonnegative_after_shift": ok,
                })
                passed &= ok
        trials.append({"threshold": threshold, "passed": passed})
        if passed:
            success_threshold = threshold
            success_details = details
            break

    report = {
        "marker": (
            "PASS_EXACT_ISO_N4_INTERNAL_SPINE_STABLE_ATOM_INTERVAL_ROOT"
            if success_threshold is not None
            else "PROBE_EXACT_ISO_N4_INTERNAL_SPINE_ATOM_INTERVAL_ROOT"
        ),
        "success_threshold_m": success_threshold,
        "success_details": success_details,
        "trials": trials,
        "bounds": "atom subset caps; w2>=C(m-1,2) for the m-vertex induced forest",
        "dependency_sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "scope_guard": "Only the ell>=6 distinct-parent branch and only if a success threshold is present.",
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "success_threshold_m": success_threshold,
        "trials": trials,
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
