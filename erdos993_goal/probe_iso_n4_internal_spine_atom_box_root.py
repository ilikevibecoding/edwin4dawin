#!/usr/bin/env python3
"""Try a universal membership-atom box proof for stable spine length.

After fixing the rank-one membership atoms for distinct v,p, bound every
higher atom count only by the number of available subsets.  Positive terms
are discarded and negative terms are charged at their product box maxima.
If the resulting polynomial is nonnegative, this is a rigorous (though
coarse) proof of that path-length coefficient.  Ambiguous coefficient signs
are reported fail-closed.
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
OUTPUT = HERE / "iso_n4_internal_spine_atom_box_probe_root_20260829.json"


def choose(variable: sp.Expr, k: int) -> sp.Expr:
    if k < 0:
        return sp.Integer(0)
    return sp.expand(sp.prod(variable - j for j in range(k)) / factorial(k))


def nonnegative_power_coefficients(poly: sp.Expr, variable: sp.Symbol) -> bool:
    return all(value >= 0 for value in sp.Poly(sp.expand(poly), variable).all_coeffs())


def max_atom(symbol: sp.Symbol, m: sp.Symbol) -> sp.Expr:
    match = re.fullmatch(r"([wabc])(\d+)", str(symbol))
    if match is None:
        raise ValueError(symbol)
    kind, rank_text = match.groups()
    rank = int(rank_text)
    required = {"w": 0, "a": 1, "b": 1, "c": 2}[kind]
    return choose(m, rank - required)


def analyze(expression: sp.Expr, m: sp.Symbol) -> dict[str, object]:
    fixed = {
        sp.symbols("a1"): 1,
        sp.symbols("b1"): 1,
        sp.symbols("c1"): 0,
        sp.symbols("w1"): m,
    }
    reduced = sp.expand(expression.subs(fixed))
    atoms = tuple(
        sorted(
            (symbol for symbol in reduced.free_symbols if symbol != m),
            key=str,
        )
    )
    polynomial = sp.Poly(reduced, *atoms) if atoms else None
    lower = sp.Integer(0)
    positive_terms = 0
    negative_terms = 0
    ambiguous = []
    term_records = []
    terms = polynomial.terms() if polynomial is not None else [((), reduced)]
    for powers, coefficient in terms:
        coefficient = sp.factor(coefficient)
        positive = nonnegative_power_coefficients(coefficient, m)
        negative = nonnegative_power_coefficients(-coefficient, m)
        if positive:
            # Atom monomials are nonnegative, so discard this term.
            positive_terms += 1
            direction = "discarded_nonnegative"
        elif negative:
            cap = sp.Integer(1)
            for symbol, power in zip(atoms, powers):
                cap *= max_atom(symbol, m) ** power
            lower += coefficient * cap
            negative_terms += 1
            direction = "charged_at_box_cap"
        else:
            ambiguous.append({"powers": list(powers), "coefficient": str(coefficient)})
            direction = "ambiguous"
        term_records.append({"powers": list(powers), "coefficient": str(coefficient), "direction": direction})
    lower = sp.factor(lower)
    lower_nonnegative = not ambiguous and nonnegative_power_coefficients(lower, m)
    return {
        "atom_variables": list(map(str, atoms)),
        "positive_terms_discarded": positive_terms,
        "negative_terms_charged": negative_terms,
        "ambiguous_terms": ambiguous,
        "coarse_lower": str(lower),
        "coarse_lower_power_coefficients_nonnegative": lower_nonnegative,
        "term_records": term_records,
    }


def main():
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == "PROBE_EXACT_ISO_N4_INTERNAL_SPINE_MEMBERSHIP_ATOMS_ROOT"
    m = sp.symbols("m", integer=True, nonnegative=True)
    results = {}
    for name, entries in dependency["coefficients"].items():
        results[name] = []
        for entry in entries:
            analysis = analyze(sp.sympify(entry["factor"]), m)
            results[name].append({"path_binomial_index": entry["path_binomial_index"], **analysis})

    proved = all(
        entry["coarse_lower_power_coefficients_nonnegative"]
        for entries in results.values()
        for entry in entries
    )
    report = {
        "marker": (
            "PASS_EXACT_ISO_N4_INTERNAL_SPINE_STABLE_PATH_DISTINCT_PARENT_ATOM_BOX_ROOT"
            if proved
            else "PROBE_EXACT_ISO_N4_INTERNAL_SPINE_ATOM_BOX_ROOT"
        ),
        "domain": "distinct v,p; m=|V(F)|-2>=0; stable path ell>=11",
        "atom_caps": "w_k<=C(m,k), a_k,b_k<=C(m,k-1), c_k<=C(m,k-2)",
        "coefficients": results,
        "proved_all_stable_path_coefficients": proved,
        "dependency_sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
        "scope_guard": "Only the distinct-parent stable-path branch; short paths and p=v are separate.",
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps({
        "marker": report["marker"],
        "proved": proved,
        "summaries": {
            name: [
                {
                    "j": entry["path_binomial_index"],
                    "ambiguous": len(entry["ambiguous_terms"]),
                    "lower_nonnegative": entry["coarse_lower_power_coefficients_nonnegative"],
                    "lower": entry["coarse_lower"],
                }
                for entry in entries
            ]
            for name, entries in results.items()
        },
        "report_sha256": hashlib.sha256(raw.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(report["marker"])


if __name__ == "__main__":
    main()
