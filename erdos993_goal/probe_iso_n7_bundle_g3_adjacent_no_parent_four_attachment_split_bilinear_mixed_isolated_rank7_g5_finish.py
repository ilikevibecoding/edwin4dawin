#!/usr/bin/env python3
"""Shared bilinear-shadow probes for mixed-isolated four-attachment splits."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
REPORT = HERE / "iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_isolated_patterns_exact_rank7_g5_finish_20260831.json"
REPORT_SHA = "51FFA1836D05390B7A2065D1D1EADE5E23DF97800461E084080B0135FB865318"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FOUR_ATTACHMENT_SPLIT_BILINEAR_MIXED_ISOLATED_RANK7_G5_FINISH"
CONFIG = {
    "31_p0_q1": {"branch": "split_mark_3plus1", "pattern": "p0_q1", "R_roots": 1, "U_roots": 2, "threshold_h": 8, "isolated_roots": 1},
    "31_p0_q2": {"branch": "split_mark_3plus1", "pattern": "p0_q2", "R_roots": 1, "U_roots": 1, "threshold_h": 7, "isolated_roots": 2},
    "22_p0_q1": {"branch": "split_mark_2plus2", "pattern": "p0_q1", "R_roots": 2, "U_roots": 1, "threshold_h": 8, "isolated_roots": 1},
    "22_p1_q1": {"branch": "split_mark_2plus2", "pattern": "p1_q1", "R_roots": 1, "U_roots": 1, "threshold_h": 7, "isolated_roots": 2},
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rank2_cap(h, roots):
    return sp.expand(roots*h-sp.binomial(roots+1, 2)-roots)


def build_value(config_key: str, chart: str):
    assert sha256(REPORT) == REPORT_SHA
    config = CONFIG[config_key]
    branch = json.loads(REPORT.read_text(encoding="utf-8"))[config["branch"]][config["pattern"]]
    h = sp.Symbol("h", positive=True)
    A = {0: sp.Integer(1), 1: h, **{k: sp.Symbol(f"A{k}", nonnegative=True) for k in range(2, 9)}}
    R = {k: sp.Symbol(f"R{k}", nonnegative=True) for k in range(2, 8)}
    U = {k: sp.Symbol(f"U{k}", nonnegative=True) for k in range(2, 8)}
    exact = sp.expand(sp.sympify(branch["identity_in_H_rows"], locals={
        "h": h,
        **{f"A{k}": A[k] for k in range(2, 9)},
        **{f"R{k}": R[k] for k in R},
        **{f"U{k}": U[k] for k in U},
    }))
    zero = {**{R[k]: 0 for k in R}, **{U[k]: 0 for k in U}}
    base = sp.expand(exact.subs(zero))
    rd = {k: sp.factor(sp.diff(exact, R[k]).subs({U[j]: 0 for j in U})) for k in R}
    ud = {k: sp.factor(sp.diff(exact, U[k]).subs({R[j]: 0 for j in R})) for k in U}
    bilinear = {(i, j): sp.factor(sp.diff(exact, R[i], U[j])) for i in R for j in U if sp.diff(exact, R[i], U[j]) != 0}
    reconstructed = base+sum(rd[k]*R[k]+ud[k]*U[k] for k in R)+sum(value*R[i]*U[j] for (i, j), value in bilinear.items())
    assert sp.expand(exact-reconstructed) == 0

    R2cap = rank2_cap(h, config["R_roots"])
    U2cap = rank2_cap(h, config["U_roots"])
    effective_rd = dict(rd)
    effective_ud = dict(ud)
    negative_absorption = {}
    for (i, j), coefficient in bilinear.items():
        if coefficient >= 0:
            continue
        assert coefficient == -10
        if i == 2:
            effective_ud[j] = sp.expand(effective_ud[j]-10*R2cap)
            negative_absorption[f"R{i}_U{j}"] = f"absorbed into U{j} using R2<={R2cap}"
        elif j == 2:
            effective_rd[i] = sp.expand(effective_rd[i]-10*U2cap)
            negative_absorption[f"R{i}_U{j}"] = f"absorbed into R{i} using U2<={U2cap}"
        else:
            raise AssertionError((i, j, coefficient))

    d4_variables = (h, *(A[k] for k in range(2, 9)))
    shadow_rd = dict(effective_rd)
    shadow_ud = dict(effective_ud)
    rank4_lowers = {}
    for label, coefficients in (("R", shadow_rd), ("U", shadow_ud)):
        lower4 = sp.Integer(0)
        for powers, scalar in sp.Poly(coefficients[4], *d4_variables).terms():
            if scalar < 0:
                monomial = scalar
                for variable, power in zip(d4_variables, powers):
                    monomial *= variable**power
                lower4 += monomial
        lower4 = sp.expand(lower4)
        assert all(value >= 0 for value in sp.Poly(sp.expand(coefficients[4]-lower4), *d4_variables).coeffs())
        assert all(value <= 0 for value in sp.Poly(lower4, *d4_variables).coeffs())
        coefficients[4] = lower4
        rank4_lowers[label] = lower4

    br = sp.factor(shadow_rd[3]+shadow_rd[4]*(h-4)/3)
    cr = sp.factor(effective_rd[2]+br*(h-3)/2)
    bu = sp.factor(shadow_ud[3]+shadow_ud[4]*(h-4)/3)
    cu = sp.factor(effective_ud[2]+bu*(h-3)/2)
    # All remaining bilinear terms are nonnegative and may be dropped.
    lower = sp.expand(base+R2cap*cr+U2cap*cu)

    ep, op, tp = sp.symbols("edge_parameter omega_parameter tau_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(5, 9)}
    total_roots = config["R_roots"]+config["U_roots"]
    edge = h/2+(h/2-total_roots)*ep
    omega_low, omega_high = 2*edge-h, edge**2/2
    boundary = sp.cancel((22*edge**2-11*edge*h-12*edge+6*h)/(8*edge))
    omega = sp.cancel(omega_low+op*(boundary-omega_low)) if chart == "low_excess" else sp.cancel(boundary+op*(omega_high-boundary))
    excess = omega-2*edge+h
    tau_upper = 2*edge-h+sp.Rational(11, 6)*edge*excess if chart == "low_excess" else omega*edge/2
    tau = sp.cancel(tp*tau_upper)
    bad4 = edge*choose_poly(h-2, 2)-omega*(h-4)-edge*(edge-1)/2+tau
    rows = {2: choose_poly(h, 2)-edge, 3: choose_poly(h, 3)-edge*(h-2)+omega, 4: choose_poly(h, 4)-bad4}
    for rank in range(5, 9):
        previous = rank-1
        low = ((h-previous)*rows[previous]-2*edge*choose_poly(h-2, previous-1))/rank
        high = (h-previous-1)*rows[previous]/rank
        rows[rank] = sp.expand(low+extensions[rank]*(high-low))
    substitutions = {A[k]: rows[k] for k in range(2, 9)}
    sign_substitutions = {A[k]: rows[k] for k in range(2, 7)}
    return {
        "h": h,
        "variables": (ep, op, tp, *(extensions[k] for k in range(5, 9))),
        "value": sp.cancel(lower.subs(substitutions)),
        "cr_value": sp.cancel(cr.subs(sign_substitutions)),
        "cu_value": sp.cancel(cu.subs(sign_substitutions)),
        "exact": exact,
        "base": base,
        "rd": rd,
        "ud": ud,
        "effective_rd": effective_rd,
        "effective_ud": effective_ud,
        "shadow_rd": shadow_rd,
        "shadow_ud": shadow_ud,
        "rank4_negative_monomial_lowers": rank4_lowers,
        "bilinear": bilinear,
        "negative_absorption": negative_absorption,
        "br": br,
        "cr": cr,
        "bu": bu,
        "cu": cu,
        "lower": lower,
        "R2cap": R2cap,
        "U2cap": U2cap,
    }


def summarize(expression, variables, h, threshold):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(h, tail+threshold))))
    if sp.LC(sp.Poly(denominator, tail, variables[0])) < 0:
        numerator, denominator = -numerator, -denominator
    assert all(value > 0 for value in sp.Poly(denominator, tail, variables[0]).coeffs())
    return fast_summary(numerator, variables, tail), str(sp.factor(denominator))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", choices=tuple(CONFIG), required=True)
    parser.add_argument("--chart", choices=("low_excess", "high_excess"), required=True)
    args = parser.parse_args()
    config = CONFIG[args.config]
    values = build_value(args.config, args.chart)
    threshold = config["threshold_h"]
    summary, denominator = summarize(values["value"], values["variables"], values["h"], threshold)
    cr_summary, cr_denominator = summarize(-values["cr_value"], values["variables"][:5], values["h"], threshold)
    cu_summary, cu_denominator = summarize(-values["cu_value"], values["variables"][:5], values["h"], threshold)
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_four_attachment_split_bilinear_{args.config}_{args.chart}_h{threshold}_probe_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "config": args.config,
        "pattern": config["pattern"],
        "chart": args.chart,
        "threshold_h": threshold,
        "threshold_n": threshold+config["isolated_roots"]+2,
        "surviving_roots": {"R": config["R_roots"], "U": config["U_roots"]},
        "bilinear_coefficients": {f"R{i}_U{j}": str(value) for (i, j), value in values["bilinear"].items()},
        "negative_absorption": values["negative_absorption"],
        "nested_shadows": {"rank4_negative_monomial_lowers": {key: str(value) for key, value in values["rank4_negative_monomial_lowers"].items()}, "br": str(values["br"]), "cr": str(values["cr"]), "bu": str(values["bu"]), "cu": str(values["cu"]), "R2cap": str(values["R2cap"]), "U2cap": str(values["U2cap"]), "safe_lower": str(values["lower"])},
        "summary": summary,
        "positive_denominator": denominator,
        "negative_cR_summary": cr_summary,
        "positive_cR_denominator": cr_denominator,
        "negative_cU_summary": cu_summary,
        "positive_cU_denominator": cu_denominator,
        "scope": "Bilinear mixed-isolated split exactly-four adjacent no-parent attachment pattern with isolate-free H.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True)+"\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "config": args.config,
        "chart": args.chart,
        "main_negatives": summary["negative_tail_scalar_coefficients"],
        "minus_cR": cr_summary["negative_tail_scalar_coefficients"],
        "minus_cU": cu_summary["negative_tail_scalar_coefficients"],
        "minimum": summary["minimum_tail_scalar_coefficient"],
        "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
