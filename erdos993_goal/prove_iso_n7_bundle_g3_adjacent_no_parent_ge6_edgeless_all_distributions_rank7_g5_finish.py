#!/usr/bin/env python3
"""Universal edgeless >=6-attachment adjacent/no-parent G3 theorem."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
INPUT_SHA = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
OUTPUT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_ge6_edgeless_all_distributions_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_GE6_EDGELESS_ALL_DISTRIBUTIONS_RANK7_G5_FINISH"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


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
    edgeless = sp.factor(identity.subs({
        **{W[k]: choose_poly(m, k) for k in W},
        **{P[k]: choose_poly(m, k) - choose_poly(m - b, k) for k in P},
        **{Q[k]: choose_poly(m, k) - choose_poly(m - a, k) for k in Q},
    }, simultaneous=True))
    root_tail, unrelated_isolates, split = sp.symbols(
        "root_tail unrelated_isolates split", nonnegative=True
    )
    roots = root_tail + 6
    b_value = roots * split / 2
    a_value = roots - b_value
    specialized = sp.cancel(edgeless.subs({m: roots + unrelated_isolates, a: a_value, b: b_value}))
    numerator, denominator = map(sp.expand, sp.fraction(specialized))
    if denominator < 0:
        numerator, denominator = -numerator, -denominator
    assert not denominator.free_symbols and denominator > 0
    polynomial = sp.Poly(numerator, split, root_tail, unrelated_isolates)
    degree = polynomial.degree(split)
    power = [sp.Integer(0)] * (degree + 1)
    for powers, coefficient in polynomial.terms():
        split_power, root_power, isolate_power = powers
        power[split_power] += coefficient * root_tail**root_power * unrelated_isolates**isolate_power
    controls = []
    for index in range(degree + 1):
        control = sp.expand(sum(
            power[exponent] * sp.Rational(sp.binomial(index, exponent), sp.binomial(degree, exponent))
            for exponent in range(index + 1)
        ))
        controls.append(control)
    recovered = []
    for exponent in range(degree + 1):
        recovered.append(sp.expand(
            sp.binomial(degree, exponent) * sum(
                (-1)**(exponent - index) * sp.binomial(exponent, index) * controls[index]
                for index in range(exponent + 1)
            )
        ))
    assert all(sp.expand(left - right) == 0 for left, right in zip(recovered, power))
    negative_coefficients = []
    minimum = None
    stream = hashlib.sha256()
    scalar_count = 0
    for index, control in enumerate(controls):
        stream.update(f"{degree}|{index}|{sp.srepr(control)};".encode())
        for powers, coefficient in sp.Poly(control, root_tail, unrelated_isolates).terms():
            scalar_count += 1
            minimum = coefficient if minimum is None else min(minimum, coefficient)
            if coefficient < 0:
                negative_coefficients.append({
                    "control_index": index,
                    "powers": list(powers),
                    "coefficient": str(coefficient),
                })
    assert not negative_coefficients, negative_coefficients[:20]
    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": "For adjacent marks in no-parent mode, if W is edgeless and a+b>=6 attachment roots are distributed arbitrarily between the marks, rank-seven G3 is nonnegative for every number of unrelated isolates.",
        "edgeless_identity": str(edgeless),
        "parameterization": {
            "attachment_total": str(roots),
            "unrelated_isolates": str(unrelated_isolates),
            "a": str(a_value),
            "b": str(b_value),
            "symmetry_interval": "0<=split<=1, so a>=b; exchange of marks covers b>=a",
        },
        "certificate": {
            "positive_denominator": str(denominator),
            "split_degree": degree,
            "bernstein_controls": len(controls),
            "tail_scalar_coefficients": scalar_count,
            "minimum_tail_scalar_coefficient": str(minimum),
            "exact_power_inversion": True,
            "ordered_stream_sha256": stream.hexdigest().upper(),
        },
        "coverage_gap_within_edgeless_ge6_all_distributions": None,
        "remaining_ge6_scope": "Forests with at least one edge.",
        "input_sha256": INPUT_SHA,
        "scope": "Edgeless W only; all >=6 attachment-count distributions and all unrelated-isolate counts.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "split_degree": degree,
        "tail_scalar_coefficients": scalar_count,
        "minimum_tail_scalar_coefficient": str(minimum),
        "coverage_gap_within_stated_branch": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
