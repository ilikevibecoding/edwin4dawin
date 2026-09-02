#!/usr/bin/env python3
"""Universal exactly-one-edge >=6-attachment adjacent/no-parent G3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
INPUT_SHA = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_one_edge_all_distributions_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_ONE_EDGE_ALL_DISTRIBUTIONS_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def matching_one_row(vertices, rank):
    """Independent rank-row of K2 plus vertices-2 isolated vertices."""
    return sp.expand(choose_poly(vertices - 2, rank) + 2 * choose_poly(vertices - 2, rank - 1))


def bernstein_tail_certificate(expression, split, tails):
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression)))
    if not denominator.free_symbols and denominator < 0:
        numerator, denominator = -numerator, -denominator
    assert not denominator.free_symbols and denominator > 0
    polynomial = sp.Poly(numerator, split, *tails)
    degree = polynomial.degree(split)
    power = [sp.Integer(0)] * (degree + 1)
    for powers, coefficient in polynomial.terms():
        split_power, *tail_powers = powers
        monomial = sp.Integer(coefficient)
        for variable, exponent in zip(tails, tail_powers):
            monomial *= variable**exponent
        power[split_power] += monomial
    controls = [sp.expand(sum(
        power[exponent] * sp.Rational(sp.binomial(index, exponent), sp.binomial(degree, exponent))
        for exponent in range(index + 1)
    )) for index in range(degree + 1)]
    recovered = [sp.expand(sp.binomial(degree, exponent) * sum(
        (-1)**(exponent - index) * sp.binomial(exponent, index) * controls[index]
        for index in range(exponent + 1)
    )) for exponent in range(degree + 1)]
    assert all(sp.expand(left - right) == 0 for left, right in zip(recovered, power))
    minimum = None
    scalar_count = 0
    negatives = []
    stream = hashlib.sha256()
    for index, control in enumerate(controls):
        stream.update(f"{degree}|{index}|{sp.srepr(control)};".encode())
        for powers, coefficient in sp.Poly(control, *tails).terms():
            scalar_count += 1
            minimum = coefficient if minimum is None else min(minimum, coefficient)
            if coefficient < 0:
                negatives.append({"control_index": index, "powers": list(powers), "coefficient": str(coefficient)})
    return {
        "positive_denominator": str(denominator),
        "split_degree": degree,
        "bernstein_controls": len(controls),
        "tail_scalar_coefficients": scalar_count,
        "minimum_tail_scalar_coefficient": str(minimum),
        "negative_tail_scalar_coefficients": len(negatives),
        "first_negative": negatives[:20],
        "exact_power_inversion": True,
        "ordered_stream_sha256": stream.hexdigest().upper(),
    }


def main() -> None:
    assert sha256(INPUT) == INPUT_SHA
    upstream = json.loads(INPUT.read_text(encoding="utf-8"))
    m, a, b = sp.symbols("m a b", nonnegative=True)
    W = {k: sp.Symbol(f"W{k}") for k in range(2, 9)}
    P = {k: sp.Symbol(f"P{k}") for k in range(2, 8)}
    Q = {k: sp.Symbol(f"Q{k}") for k in range(2, 8)}
    identity = sp.expand(sp.sympify(upstream["identity"], locals={
        "m": m, "a": a, "b": b,
        **{f"W{k}": W[k] for k in W},
        **{f"P{k}": P[k] for k in P},
        **{f"Q{k}": Q[k] for k in Q},
    }))
    root_tail, unrelated_isolates, split = sp.symbols("root_tail unrelated_isolates split", nonnegative=True)
    roots = root_tail + 6
    cases = {
        "edge_unrooted": {
            "m": roots + unrelated_isolates + 2,
            "b": roots * split / 2,
            "root_side": None,
            "split_domain": "0<=b<=r/2",
        },
        "edge_root_on_larger_side": {
            "m": roots + unrelated_isolates + 1,
            "b": roots * split / 2,
            "root_side": "X",
            "split_domain": "0<=b<=r/2, a=r-b",
        },
        "edge_root_on_smaller_side": {
            "m": roots + unrelated_isolates + 1,
            "b": 1 + (roots / 2 - 1) * split,
            "root_side": "Y",
            "split_domain": "1<=b<=r/2, a=r-b",
        },
    }
    certificates = {}
    exact_case_identities = {}
    for label, case in cases.items():
        m_value = case["m"]
        b_value = case["b"]
        a_value = roots - b_value
        w_rows = {k: matching_one_row(m, k) for k in W}
        if case["root_side"] == "Y":
            p_rows = {k: w_rows[k] - choose_poly(m - b, k) for k in P}
        else:
            p_rows = {k: w_rows[k] - matching_one_row(m - b, k) for k in P}
        if case["root_side"] == "X":
            q_rows = {k: w_rows[k] - choose_poly(m - a, k) for k in Q}
        else:
            q_rows = {k: w_rows[k] - matching_one_row(m - a, k) for k in Q}
        exact_case = sp.factor(identity.subs({
            **{W[k]: w_rows[k] for k in W},
            **{P[k]: p_rows[k] for k in P},
            **{Q[k]: q_rows[k] for k in Q},
        }, simultaneous=True))
        specialized = sp.cancel(exact_case.subs({m: m_value, a: a_value, b: b_value}))
        certificate = bernstein_tail_certificate(specialized, split, (root_tail, unrelated_isolates))
        assert certificate["negative_tail_scalar_coefficients"] == 0, (label, certificate["first_negative"])
        exact_case_identities[label] = str(exact_case)
        certificates[label] = {
            "parameterization": {"m": str(m_value), "a": str(a_value), "b": str(b_value)},
            "split_domain": case["split_domain"],
            **certificate,
        }
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode, if W has exactly one edge and a+b>=6 attachment roots lie in distinct components, rank-seven G3 is nonnegative for every attachment distribution and every number of unrelated isolates.",
        "exhaustive_edge_component_classifier": {
            "cases": list(cases),
            "proof": "The unique K2 component contains no attachment root or one root. After exchanging marks, a>=b; a rooted K2 therefore carries a root on the larger or the smaller side.",
        },
        "exact_case_identities": exact_case_identities,
        "certificates": certificates,
        "coverage_gap_within_one_edge_ge6_all_distributions": None,
        "remaining_ge6_scope": "Forests with at least two edges.",
        "input_sha256": INPUT_SHA,
        "scope": "Exactly one edge in W; all >=6 attachment distributions, root placements, and unrelated-isolate counts.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "cases": list(cases),
        "minimum_coefficients": {key: value["minimum_tail_scalar_coefficient"] for key, value in certificates.items()},
        "coverage_gap_within_stated_branch": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
