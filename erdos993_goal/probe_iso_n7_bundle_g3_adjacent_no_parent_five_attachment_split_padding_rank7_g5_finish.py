#!/usr/bin/env python3
"""Generic unrelated-isolate padding probes for split five attachments."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
IDENTITY_REPORT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_general_attachment_losses_exact_rank7_g5_finish_20260831.json"
IDENTITY_SHA = "CB3E129A9F2E6EBF6F5AF6D70B917147121041505A312628A39BB4960C79F699"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SPLIT_PADDING_RANK7_G5_FINISH"
DISTRIBUTIONS = {"41": (4, 1), "32": (3, 2)}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def padding_coefficients(distribution: str):
    assert sha256(IDENTITY_REPORT) == IDENTITY_SHA
    a_value, b_value = DISTRIBUTIONS[distribution]
    upstream = json.loads(IDENTITY_REPORT.read_text(encoding="utf-8"))
    m, a, b = sp.symbols("m a b")
    W = {0: sp.Integer(1), 1: m, **{k: sp.Symbol(f"W{k}") for k in range(2, 9)}}
    P = {0: sp.Integer(0), 1: b, **{k: sp.Symbol(f"P{k}", nonnegative=True) for k in range(2, 8)}}
    Q = {0: sp.Integer(0), 1: a, **{k: sp.Symbol(f"Q{k}", nonnegative=True) for k in range(2, 8)}}
    exact = sp.expand(sp.sympify(upstream["identity"], locals={
        "m": m,
        "a": a,
        "b": b,
        **{f"W{k}": W[k] for k in range(2, 9)},
        **{f"P{k}": P[k] for k in range(2, 8)},
        **{f"Q{k}": Q[k] for k in range(2, 8)},
    }).subs({a: a_value, b: b_value}))
    h, isolates = sp.symbols("h isolates", nonnegative=True, integer=True)
    I = {0: sp.Integer(1), 1: h, **{k: sp.Symbol(f"I{k}", nonnegative=True) for k in range(2, 9)}}
    R = {0: sp.Integer(0), 1: sp.Integer(b_value), **{k: sp.Symbol(f"R{k}", nonnegative=True) for k in range(2, 8)}}
    S = {0: sp.Integer(0), 1: sp.Integer(a_value), **{k: sp.Symbol(f"S{k}", nonnegative=True) for k in range(2, 8)}}
    padded_w = {
        k: sp.expand(sum(choose_poly(isolates, k-j) * I[j] for j in range(k+1)))
        for k in range(2, 9)
    }
    padded_p = {
        k: sp.expand(sum(choose_poly(isolates, k-j) * R[j] for j in range(k+1)))
        for k in range(2, 8)
    }
    padded_q = {
        k: sp.expand(sum(choose_poly(isolates, k-j) * S[j] for j in range(k+1)))
        for k in range(2, 8)
    }
    padded = sp.expand(exact.subs({
        m: h + isolates,
        **{W[k]: padded_w[k] for k in range(2, 9)},
        **{P[k]: padded_p[k] for k in range(2, 8)},
        **{Q[k]: padded_q[k] for k in range(2, 8)},
    }, simultaneous=True))
    coefficients = {
        index: sp.expand(sum(
            (-1)**(index-j) * sp.binomial(index, j) * padded.subs(isolates, j)
            for j in range(index+1)
        ))
        for index in range(9)
    }
    assert sp.expand(padded - sum(coefficients[index] * choose_poly(isolates, index) for index in range(9))) == 0
    return h, I, R, S, coefficients


def root_cap(h, roots: int, rank: int):
    return sp.expand(choose_poly(h, rank) - choose_poly(h-roots, rank))


def monomial_safe_lower(h, I, R, S, coefficient, a_value: int, b_value: int):
    root_variables = tuple(R[k] for k in range(2, 8)) + tuple(S[k] for k in range(2, 8))
    base_variables = (h, *(I[k] for k in range(2, 9)))
    variables = base_variables + root_variables
    lower = sp.Integer(0)
    audit = {"dropped_nonnegative_rooted_monomials": 0, "paid_negative_rooted_monomials": 0, "root_caps": {}}
    for powers, scalar in sp.Poly(coefficient, *variables).terms():
        assert scalar.q == 1
        base_powers = powers[:len(base_variables)]
        root_powers = powers[len(base_variables):]
        assert all(power in (0, 1) for power in root_powers)
        base_monomial = sp.Integer(scalar)
        for variable, power in zip(base_variables, base_powers):
            base_monomial *= variable**power
        if not any(root_powers):
            root_monomial = sp.Integer(1)
            for variable, power in zip(root_variables, root_powers):
                root_monomial *= variable**power
            lower += base_monomial * root_monomial
            continue
        if scalar > 0:
            audit["dropped_nonnegative_rooted_monomials"] += 1
            continue
        assert scalar < 0
        paid = base_monomial
        for variable, power in zip(root_variables, root_powers):
            if not power:
                continue
            label = str(variable)
            rank = int(label[1:])
            roots = b_value if label.startswith("R") else a_value
            cap = root_cap(h, roots, rank)
            paid *= cap
            audit["root_caps"][label] = {
                "cap": str(cap),
                "proof": f"{label}<=C(h,{rank})-C(h-{roots},{rank}), since its {roots} attachment roots are mutually nonadjacent.",
            }
        lower += paid
        audit["paid_negative_rooted_monomials"] += 1
    return sp.expand(lower), audit


def extension_value(distribution: str, index: int):
    a_value, b_value = DISTRIBUTIONS[distribution]
    h, I, R, S, coefficients = padding_coefficients(distribution)
    lower, audit = monomial_safe_lower(h, I, R, S, coefficients[index], a_value, b_value)
    edge_parameter, omega_parameter = sp.symbols("edge_parameter omega_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(4, 9)}
    edge = (h-5) * edge_parameter
    omega_low, omega_high = 2*edge**2/h-edge, edge**2/2
    omega = sp.cancel(omega_low + omega_parameter * (omega_high-omega_low))
    rows = {
        2: choose_poly(h, 2)-edge,
        3: choose_poly(h, 3)-edge*(h-2)+omega,
    }
    for rank in range(4, 9):
        previous = rank-1
        low = ((h-previous)*rows[previous]-2*edge*choose_poly(h-2, previous-1))/rank
        high = (h-previous)*rows[previous]/rank
        rows[rank] = sp.expand(low+extensions[rank]*(high-low))
    value = sp.cancel(lower.subs({I[k]: rows[k] for k in range(2, 9)}))
    return h, (edge_parameter, omega_parameter, *(extensions[k] for k in range(4, 9))), value, coefficients[index], lower, audit


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--distribution", choices=tuple(DISTRIBUTIONS), required=True)
    parser.add_argument("--index", type=int, choices=range(1, 9), required=True)
    parser.add_argument("--threshold-h", type=int, default=5)
    args = parser.parse_args()
    h, variables, value, exact, lower, audit = extension_value(args.distribution, args.index)
    tail = sp.Symbol("tail", nonnegative=True)
    summary = fast_summary(sp.cancel(value.subs(h, tail+args.threshold_h)), variables, tail)
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_padding_{args.distribution}_H{args.index}_h{args.threshold_h}_probe_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER,
        "status": "exact diagnostic lower; no theorem asserted",
        "distribution": args.distribution,
        "side_sizes": {"X": DISTRIBUTIONS[args.distribution][0], "Y": DISTRIBUTIONS[args.distribution][1]},
        "newton_index": args.index,
        "threshold_h": args.threshold_h,
        "exact_newton_coefficient": str(exact),
        "safe_lower": str(lower),
        "root_cap_audit": audit,
        "forest_edge_ceiling": "e<=h-5 because the five attachment roots lie in distinct components",
        "summary": summary,
        "scope": "Unrelated-isolate padding Newton coefficient for one split exactly-five attachment distribution; base H0 positivity is separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "distribution": args.distribution,
        "newton_index": args.index,
        "negative_tail_scalar_coefficients": summary["negative_tail_scalar_coefficients"],
        "minimum_tail_scalar_coefficient": summary["minimum_tail_scalar_coefficient"],
        "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
