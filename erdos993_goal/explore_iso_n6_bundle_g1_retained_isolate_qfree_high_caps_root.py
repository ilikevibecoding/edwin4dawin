#!/usr/bin/env python3
"""Explore sign-checked high-rank cap elimination for the q-free lower.

Every substitution is made only when the current derivative is manifestly
nonpositive in the nonnegative variables after writing n=8+s.  In that case
replacing a category by its standard consecutive independent-set upper cap is
a rigorous lower step.  The script is diagnostic unless the final polynomial
has only nonnegative coefficients.
"""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g1_retained_isolate_coarse_q_lower_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_qfree_high_caps_exact_root_20260901.json"
MARKER = "EXPLORED_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_QFREE_HIGH_CAPS_ROOT"
EXPECTED_INPUT_SHA256 = "239ED96A29102D24B205BAB4A7AD3180B60DEACF42C68C1059D061B0E0E784FE"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def coefficients(expression: sp.Expr):
    expression = sp.expand(expression)
    variables = tuple(sorted(expression.free_symbols, key=str))
    if not variables:
        return [] if expression == 0 else [expression]
    return sp.Poly(expression, *variables).coeffs()


def manifest_nonpositive(expression: sp.Expr) -> bool:
    return all(coefficient.is_nonpositive is True for coefficient in coefficients(expression))


def signed_parts(expression: sp.Expr) -> tuple[sp.Expr, sp.Expr]:
    expression = sp.expand(expression)
    variables = tuple(sorted(expression.free_symbols, key=str))
    positive = sp.Integer(0)
    negative = sp.Integer(0)
    if not variables:
        return (expression, negative) if expression.is_nonnegative is True else (positive, expression)
    for powers, coefficient in sp.Poly(expression, *variables).terms():
        term = sp.Integer(coefficient)
        for variable, power in zip(variables, powers):
            term *= variable**power
        if coefficient < 0:
            negative += term
        else:
            positive += term
    return sp.expand(positive), sp.expand(negative)


def summary(expression: sp.Expr) -> dict[str, object]:
    expression = sp.expand(expression)
    values = coefficients(expression)
    variables = tuple(sorted(expression.free_symbols, key=str))
    terms = 0 if expression == 0 else (len(sp.Poly(expression, *variables).terms()) if variables else 1)
    return {
        "terms": terms,
        "negative_scalar_coefficients": sum(value.is_negative is True for value in values),
        "positive_scalar_coefficients": sum(value.is_positive is True for value in values),
        "minimum_scalar_coefficient": str(min(values, default=0)),
        "polynomial_sha256": hashlib.sha256(sp.srepr(expression).encode()).hexdigest().upper(),
    }


def cap(variable: sp.Symbol, names: dict[str, sp.Symbol], n: sp.Expr) -> sp.Expr:
    name = str(variable)
    family = name[1]
    rank = int(name[2:])
    previous = names[f"C{family}{rank - 1}"]
    if family in "AB":
        return (n - rank) * previous / (rank - 1)
    if family == "W":
        return (n - rank - 1) * previous / rank
    if family == "Z":
        return (n - rank + 1) * previous / (rank - 2)
    raise RuntimeError(f"unknown family in {name}")


def intrinsic_cap(variable: sp.Symbol, names: dict[str, sp.Symbol], n: sp.Expr) -> sp.Expr:
    name = str(variable)
    family = name[1]
    rank = int(name[2:])
    previous = names[f"C{family}{rank - 1}"]
    if family in "AB":
        return (names[f"C{family}2"] - rank + 2) * previous / (rank - 1)
    if family == "W":
        return (n - rank - 1) * previous / rank
    if family == "Z":
        return (names["CZ3"] - rank + 3) * previous / (rank - 2)
    raise RuntimeError(f"unknown family in {name}")


def cross_cap(variable: sp.Symbol, names: dict[str, sp.Symbol], n: sp.Expr) -> sp.Expr:
    name = str(variable)
    family = name[1]
    rank = int(name[2:])
    if family in "AB":
        return names[f"CW{rank - 1}"]
    if family == "Z":
        return n - 2 if rank == 3 else names[f"CW{rank - 2}"]
    return cap(variable, names, n)


def falling_choose(top: sp.Expr, rank: int) -> sp.Expr:
    if rank == 0:
        return sp.Integer(1)
    return sp.prod(top - offset for offset in range(rank)) / math.factorial(rank)


def path_polynomial_lower(order: sp.Symbol, rank: int) -> sp.Expr:
    """Polynomial <= max(0, binom(order-rank+1,rank)) on integer order>=0."""
    raw = sp.expand(falling_choose(order - rank + 1, rank))
    exceptional_max = max(
        [sp.Integer(0)] + [sp.Integer(raw.subs(order, value)) for value in range(2 * rank - 1)]
    )
    return sp.expand(raw - exceptional_max)


def main() -> None:
    input_hash = sha256(INPUT)
    if input_hash != EXPECTED_INPUT_SHA256:
        raise RuntimeError(f"input hash mismatch: {input_hash}")
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    slack = sp.Symbol("s", integer=True, nonnegative=True)
    n_symbol = sp.Symbol("n")
    results = {}
    for label in ("adjacent_u0_v0", "nonadjacent_u0_v0"):
        original = sp.expand(sp.sympify(source["branches"][label]["lower_expression"]).subs(n_symbol, 8 + slack))
        expression = original
        names = {str(symbol): symbol for symbol in expression.free_symbols}
        for family in "ABWZ":
            for rank in range(2, 8):
                names.setdefault(
                    f"C{family}{rank}",
                    sp.Symbol(f"C{family}{rank}", nonnegative=True),
                )
        steps = []
        changed = True
        while changed:
            changed = False
            candidates = []
            for family in "ABWZ":
                for rank in range(7, 2 if family == "Z" else 1, -1):
                    name = f"C{family}{rank}"
                    if name not in names or names[name] not in expression.free_symbols:
                        continue
                    derivative = sp.expand(sp.diff(expression, names[name]))
                    if manifest_nonpositive(derivative):
                        candidates.append((rank, family, names[name], derivative))
            if candidates:
                # Highest rank first; W, A, B, Z tie order is deterministic.
                _, _, variable, derivative = max(candidates, key=lambda row: (row[0], -"WABZ".index(row[1])))
                upper = cap(variable, names, 8 + slack)
                before = summary(expression)
                expression = sp.expand(expression.subs(variable, upper))
                steps.append({
                    "variable": str(variable),
                    "upper_cap": str(sp.factor(upper)),
                    "derivative": str(sp.factor(derivative)),
                    "before": before,
                    "after": summary(expression),
                })
                changed = True
        partial = original
        partial_steps = []
        # Descending ranks prevent a cap from reintroducing an already treated
        # higher-rank category.  Quadratic coordinates are left untouched.
        for rank in range(7, 2, -1):
            for family in "WABZ":
                name = f"C{family}{rank}"
                variable = names.get(name)
                if variable is None or variable not in partial.free_symbols:
                    continue
                if sp.diff(partial, variable, 2) != 0:
                    continue
                derivative = sp.expand(sp.diff(partial, variable))
                positive, negative = signed_parts(derivative)
                if negative == 0:
                    continue
                upper = cap(variable, names, 8 + slack)
                base = sp.expand(partial.subs(variable, 0))
                before = summary(partial)
                partial = sp.expand(base + variable * positive + upper * negative)
                partial_steps.append({
                    "variable": name,
                    "upper_cap": str(sp.factor(upper)),
                    "negative_derivative_part": str(sp.factor(negative)),
                    "before": before,
                    "after": summary(partial),
                })
        # For nonadjacent distinct marks CZ2 is exactly the set {u,v}.
        cz2 = names.get("CZ2")
        if cz2 is not None and cz2 in partial.free_symbols:
            partial = sp.expand(partial.subs(cz2, 1))

        intrinsic = original
        intrinsic_steps = []
        for rank in range(7, 2, -1):
            for family in "WABZ":
                name = f"C{family}{rank}"
                variable = names.get(name)
                if variable is None or variable not in intrinsic.free_symbols:
                    continue
                if sp.diff(intrinsic, variable, 2) != 0:
                    continue
                derivative = sp.expand(sp.diff(intrinsic, variable))
                positive, negative = signed_parts(derivative)
                if negative == 0:
                    continue
                upper = intrinsic_cap(variable, names, 8 + slack)
                base = sp.expand(intrinsic.subs(variable, 0))
                before = summary(intrinsic)
                intrinsic = sp.expand(base + variable * positive + upper * negative)
                intrinsic_steps.append({
                    "variable": name,
                    "upper_cap": str(sp.factor(upper)),
                    "negative_derivative_part": str(sp.factor(negative)),
                    "before": before,
                    "after": summary(intrinsic),
                })

        path_reduced = intrinsic
        path_steps = []
        for rank in range(7, 2, -1):
            for family in "ABZ":
                name = f"C{family}{rank}"
                variable = names.get(name)
                if variable is None or variable not in path_reduced.free_symbols:
                    continue
                if sp.diff(path_reduced, variable, 2) != 0:
                    continue
                derivative = sp.expand(sp.diff(path_reduced, variable))
                if not all(
                    coefficient.is_nonnegative is True for coefficient in coefficients(derivative)
                ):
                    continue
                if family in "AB":
                    underlying_order = names[f"C{family}2"]
                    underlying_rank = rank - 1
                else:
                    underlying_order = names["CZ3"]
                    underlying_rank = rank - 2
                lower_value = path_polynomial_lower(underlying_order, underlying_rank)
                before = summary(path_reduced)
                path_reduced = sp.expand(path_reduced.subs(variable, lower_value))
                path_steps.append({
                    "variable": name,
                    "path_lower": str(sp.factor(lower_value)),
                    "derivative": str(sp.factor(derivative)),
                    "before": before,
                    "after": summary(path_reduced),
                })

        cross = original
        cross_steps = []
        for rank in range(7, 2, -1):
            for family in "WABZ":
                name = f"C{family}{rank}"
                variable = names.get(name)
                if variable is None or variable not in cross.free_symbols:
                    continue
                if sp.diff(cross, variable, 2) != 0:
                    continue
                derivative = sp.expand(sp.diff(cross, variable))
                positive, negative = signed_parts(derivative)
                if negative == 0:
                    continue
                upper = cross_cap(variable, names, 8 + slack)
                base = sp.expand(cross.subs(variable, 0))
                before = summary(cross)
                cross = sp.expand(base + variable * positive + upper * negative)
                cross_steps.append({
                    "variable": name,
                    "upper_cap": str(sp.factor(upper)),
                    "negative_derivative_part": str(sp.factor(negative)),
                    "before": before,
                    "after": summary(cross),
                })

        results[label] = {
            "steps": steps,
            "remaining_expression": str(expression),
            "remaining_summary": summary(expression),
            "coefficientwise_closed": all(
                value.is_nonnegative is True for value in coefficients(expression)
            ),
            "partial_steps": partial_steps,
            "partial_remaining_expression": str(partial),
            "partial_remaining_summary": summary(partial),
            "partial_coefficientwise_closed": all(
                value.is_nonnegative is True for value in coefficients(partial)
            ),
            "intrinsic_steps": intrinsic_steps,
            "intrinsic_remaining_expression": str(intrinsic),
            "intrinsic_remaining_summary": summary(intrinsic),
            "intrinsic_coefficientwise_closed": all(
                value.is_nonnegative is True for value in coefficients(intrinsic)
            ),
            "path_steps": path_steps,
            "path_remaining_expression": str(path_reduced),
            "path_remaining_summary": summary(path_reduced),
            "path_coefficientwise_closed": all(
                value.is_nonnegative is True for value in coefficients(path_reduced)
            ),
            "cross_steps": cross_steps,
            "cross_remaining_expression": str(cross),
            "cross_remaining_summary": summary(cross),
            "cross_coefficientwise_closed": all(
                value.is_nonnegative is True for value in coefficients(cross)
            ),
        }
    report = {
        "marker": MARKER,
        "domain": "n=8+s with s a nonnegative integer",
        "cap_rules": {
            "A/B": "C_r <= (n-r)/(r-1) C_(r-1)",
            "W": "C_r <= (n-r-1)/r C_(r-1)",
            "Z": "C_r <= (n-r+1)/(r-2) C_(r-1)",
        },
        "branches": results,
        "scope_guard": (
            "All listed substitutions are valid lower steps. A branch closes only if "
            "coefficientwise_closed is true."
        ),
        "input_sha256": input_hash,
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": MARKER,
        "branches": {
            label: {
                "steps": [step["variable"] for step in row["steps"]],
                "remaining_summary": row["remaining_summary"],
                "coefficientwise_closed": row["coefficientwise_closed"],
                "partial_steps": [step["variable"] for step in row["partial_steps"]],
                "partial_remaining_summary": row["partial_remaining_summary"],
                "partial_coefficientwise_closed": row["partial_coefficientwise_closed"],
                "intrinsic_steps": [step["variable"] for step in row["intrinsic_steps"]],
                "intrinsic_remaining_summary": row["intrinsic_remaining_summary"],
                "intrinsic_coefficientwise_closed": row["intrinsic_coefficientwise_closed"],
                "path_steps": [step["variable"] for step in row["path_steps"]],
                "path_remaining_summary": row["path_remaining_summary"],
                "path_coefficientwise_closed": row["path_coefficientwise_closed"],
                "cross_steps": [step["variable"] for step in row["cross_steps"]],
                "cross_remaining_summary": row["cross_remaining_summary"],
                "cross_coefficientwise_closed": row["cross_coefficientwise_closed"],
            }
            for label, row in results.items()
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
