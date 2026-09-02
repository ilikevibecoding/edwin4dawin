#!/usr/bin/env python3
"""Independent exact replay of the retained-isolate q-free reduction."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n6_bundle_g6_g2_transfer_audit import isolate_multiply
from derive_iso_n6_bundle_g1_ordinary_leaf_increment_identity_g1_nonadjacent import substitute
from explore_iso_n6_bundle_g2_marked_cone_g1_bernstein import reconstruct
from explore_iso_n6_bundle_g3_marked_partition_g1_nonadjacent import partition_substitution


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g1_retained_isolate_coarse_q_lower_exact_root_20260901.json"
OUTPUT = HERE / "iso_n6_bundle_g1_retained_isolate_qfree_reduction_independent_audit_root_20260901.json"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_QFREE_REDUCTION_ROOT"
EXPECTED_INPUT_SHA256 = "239ED96A29102D24B205BAB4A7AD3180B60DEACF42C68C1059D061B0E0E784FE"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def negative_part(expression: sp.Expr) -> sp.Expr:
    expression = sp.expand(expression)
    variables = tuple(sorted(expression.free_symbols, key=str))
    answer = sp.Integer(0)
    for powers, coefficient in sp.Poly(expression, *variables).terms():
        if coefficient < 0:
            term = sp.Integer(coefficient)
            for variable, power in zip(variables, powers):
                term *= variable**power
            answer += term
    return sp.expand(answer)


def coefficientwise_nonnegative(expression: sp.Expr) -> bool:
    expression = sp.expand(expression)
    variables = tuple(sorted(expression.free_symbols, key=str))
    return all(coefficient >= 0 for coefficient in sp.Poly(expression, *variables).coeffs())


def main() -> None:
    input_hash = sha256(INPUT)
    if input_hash != EXPECTED_INPUT_SHA256:
        raise RuntimeError(f"input hash mismatch: {input_hash}")
    expected = json.loads(INPUT.read_text(encoding="utf-8"))

    g1 = reconstruct(1)
    crows = tuple(tuple(sp.symbols(f"c{family}0:8")) for family in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{family}0:8")) for family in "EUVW")
    full_increment = sp.expand(
        substitute(g1, isolate_multiply(crows, 1), isolate_multiply(drows, 1))
        - substitute(g1, crows, drows)
    )

    n, q, eu, ev = sp.symbols("n q epsilon_u epsilon_v", integer=True, nonnegative=True)
    structural = {
        sp.Symbol(f"{prefix}{family}0"): 1
        for prefix in ("c", "d") for family in "EUVW"
    }
    structural.update({
        sp.Symbol("cE1"): n,
        sp.Symbol("cU1"): n - 1,
        sp.Symbol("cV1"): n - 1,
        sp.Symbol("cW1"): n - 2,
        sp.Symbol("dE1"): q,
        sp.Symbol("dU1"): q - eu,
        sp.Symbol("dV1"): q - ev,
        sp.Symbol("dW1"): q - eu - ev,
    })
    cpart, _ = partition_substitution("C", "c", 7)
    dpart, _ = partition_substitution("D", "d", 7)
    expression = sp.expand(full_increment.subs(structural).subs(cpart).subs(dpart))
    dvariables = tuple(sorted(
        (symbol for symbol in expression.free_symbols if str(symbol).startswith("D")),
        key=str,
    ))
    d_linear = all(
        sp.diff(expression, left, right) == 0
        for left in dvariables for right in dvariables
    )
    if not d_linear:
        raise RuntimeError("full increment is not affine in D")

    names = {str(symbol): symbol for symbol in expression.free_symbols}
    coarse = sp.expand(expression.subs({symbol: 0 for symbol in dvariables}))
    for dvariable in dvariables:
        derivative = sp.expand(sp.diff(expression, dvariable))
        coarse += negative_part(derivative) * names["C" + str(dvariable)[1:]]
    coarse = sp.expand(coarse)

    replays = {}
    lowers = {}
    for geometry in ("adjacent", "nonadjacent"):
        for uvalue in (0, 1):
            for vvalue in (0, 1):
                label = f"{geometry}_u{uvalue}_v{vvalue}"
                rules = {eu: uvalue, ev: vvalue}
                if geometry == "adjacent":
                    rules.update({
                        symbol: 0 for symbol in coarse.free_symbols
                        if str(symbol).startswith("CZ")
                    })
                branch = sp.expand(coarse.subs(rules))
                slope = sp.expand(sp.diff(branch, q))
                if sp.diff(slope, q) != 0:
                    raise RuntimeError(f"nonaffine q dependence in {label}")
                e = uvalue + vvalue
                lower = sp.expand(branch.subs(q, e) + (n - e) * negative_part(slope))
                recorded = sp.expand(sp.sympify(expected["branches"][label]["lower_expression"]))
                # JSON round-tripping drops SymPy assumptions, so symbols with
                # the same printed name are not object-equal.  Align the
                # recorded expression by name before the exact comparison.
                lower_names = {str(symbol): symbol for symbol in lower.free_symbols}
                replacements = {}
                for symbol in recorded.free_symbols:
                    if str(symbol) not in lower_names:
                        raise RuntimeError(
                            f"unexpected recorded symbol {symbol} in {label}"
                        )
                    replacements[symbol] = lower_names[str(symbol)]
                recorded = sp.expand(recorded.xreplace(replacements))
                replay = sp.expand(lower - recorded) == 0
                replays[label] = replay
                lowers[label] = lower

    domination = {}
    for geometry in ("adjacent", "nonadjacent"):
        base = lowers[f"{geometry}_u0_v0"]
        for uvalue, vvalue in ((0, 1), (1, 0), (1, 1)):
            label = f"{geometry}_u{uvalue}_v{vvalue}"
            difference = sp.expand(lowers[label] - base)
            domination[label] = coefficientwise_nonnegative(difference)

    passed = d_linear and all(replays.values()) and all(domination.values())
    marker = MARKER if passed else "FAIL_INDEPENDENT_EXACT_ISO_N6_BUNDLE_G1_RETAINED_ISOLATE_QFREE_REDUCTION_ROOT"
    report = {
        "marker": marker,
        "exact_D_linearity": d_linear,
        "qfree_expression_replays": replays,
        "retained_mark_branch_domination": domination,
        "worst_branches": ["adjacent_u0_v0", "nonadjacent_u0_v0"],
        "proof_rules": [
            "For 0<=D_i<=C_i and affine D dependence, D_i*L_i(C)>=C_i*min_coeff_part(L_i,0).",
            "For q=e+t, 0<=t<=n-e, an affine q slope P_++P_- gives L(C,q)>=L(C,e)+(n-e)P_-.",
            "Every retained-mark branch differs from its zero-retention branch coefficientwise nonnegatively.",
        ],
        "scope_guard": (
            "This independently verifies the sufficient reduction to two q-free targets. "
            "It does not prove either target nonnegative."
        ),
        "input_sha256": input_hash,
        "source_sha256": sha256(Path(__file__)),
    }
    payload = (json.dumps(report, indent=2, sort_keys=True) + "\n").encode()
    OUTPUT.write_bytes(payload)
    print(json.dumps({
        "marker": marker,
        "exact_D_linearity": d_linear,
        "qfree_replays": all(replays.values()),
        "branch_domination": all(domination.values()),
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(payload).hexdigest().upper())
    print(marker)


if __name__ == "__main__":
    main()
