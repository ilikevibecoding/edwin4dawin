#!/usr/bin/env python3
"""Exact shared cones for the 20 split, isolated-root, five-attachment patterns.

This file deliberately proves only isolate-free-H lower bounds.  Unrelated
isolate padding is a separate obligation.  Linear, bilinear, and all-isolated
patterns use one fail-closed constructor so several classifier cells can be
certified without duplicating the underlying algebra.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import sympy as sp

from probe_iso_n7_bundle_g3_sum0_dense_extension_threshold_rank7_g5_finish import choose_poly
from probe_iso_n7_bundle_g5_threshold11_fast_rank7_g5_tail import fast_summary


HERE = Path(__file__).resolve().parent
CLASSIFIER = HERE / "iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_isolated_patterns_exact_rank7_g5_finish_20260831.json"
CLASSIFIER_SHA = "237A3CBFAAB75947BB3DBABCA4B53C896552C76AB8B9BD991A7B92D99CAAFD27"
MARKER = "PROBE_EXACT_ISO_N7_BUNDLE_G3_ADJACENT_NO_PARENT_FIVE_ATTACHMENT_SPLIT_MIXED_ISOLATED_RANK7_G5_FINISH"


def make_config() -> dict[str, dict]:
    result = {}
    for distribution, (x_count, y_count) in {"41": (4, 1), "32": (3, 2)}.items():
        label = distribution[0] + "+" + distribution[1]
        for isolated_x in range(x_count + 1):
            for isolated_y in range(y_count + 1):
                if isolated_x == isolated_y == 0:
                    continue
                remaining_x = x_count - isolated_x
                remaining_y = y_count - isolated_y
                surviving = remaining_x + remaining_y
                kind = "base" if surviving == 0 else ("bilinear" if remaining_x and remaining_y else "linear")
                key = f"{distribution}_ix{isolated_x}_iy{isolated_y}"
                result[key] = {
                    "distribution": label,
                    "pattern": f"ix{isolated_x}_iy{isolated_y}",
                    "isolated_X": isolated_x,
                    "isolated_Y": isolated_y,
                    "isolated_total": isolated_x + isolated_y,
                    "U_roots": remaining_y,
                    "V_roots": remaining_x,
                    "surviving_roots": surviving,
                    "kind": kind,
                    "threshold_h": 5 + surviving,
                }
    assert len(result) == 20
    return result


CONFIG = make_config()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def rank2_cap(h, roots: int):
    # Roots lie in distinct nontrivial components, hence are mutually
    # nonadjacent and each has a distinct forbidden neighbour/component.
    return sp.expand(roots * h - sp.binomial(roots + 1, 2) - roots)


def negative_monomial_lower(expression, variables):
    lower = sp.Integer(0)
    for powers, scalar in sp.Poly(expression, *variables).terms():
        if scalar < 0:
            monomial = scalar
            for variable, power in zip(variables, powers):
                monomial *= variable**power
            lower += monomial
    lower = sp.expand(lower)
    assert all(value >= 0 for value in sp.Poly(sp.expand(expression - lower), *variables).coeffs())
    assert all(value <= 0 for value in sp.Poly(lower, *variables).coeffs())
    return lower


def parse_exact(config_key: str):
    assert sha256(CLASSIFIER) == CLASSIFIER_SHA
    config = CONFIG[config_key]
    branch = json.loads(CLASSIFIER.read_text(encoding="utf-8"))["patterns"][config["distribution"]][config["pattern"]]
    assert branch["isolated_X_roots"] == config["isolated_X"]
    assert branch["isolated_Y_roots"] == config["isolated_Y"]
    assert branch["remaining_nonisolated_X_roots"] == config["V_roots"]
    assert branch["remaining_nonisolated_Y_roots"] == config["U_roots"]
    h = sp.Symbol("h", positive=True)
    A = {0: sp.Integer(1), 1: h, **{k: sp.Symbol(f"A{k}", nonnegative=True) for k in range(2, 9)}}
    U = {k: sp.Symbol(f"U{k}", nonnegative=True) for k in range(2, 8)}
    V = {k: sp.Symbol(f"V{k}", nonnegative=True) for k in range(2, 8)}
    exact = sp.expand(sp.sympify(branch["identity_in_H_rows"], locals={
        "h": h,
        **{f"A{k}": A[k] for k in range(2, 9)},
        **{f"U{k}": U[k] for k in range(2, 8)},
        **{f"V{k}": V[k] for k in range(2, 8)},
    }))
    if config["U_roots"] == 0:
        assert not any(U[k] in exact.free_symbols for k in U)
    if config["V_roots"] == 0:
        assert not any(V[k] in exact.free_symbols for k in V)
    return h, A, U, V, exact


def safe_lower(config_key: str):
    config = CONFIG[config_key]
    h, A, U, V, exact = parse_exact(config_key)
    avariables = (h, *(A[k] for k in range(2, 9)))
    zero = {**{U[k]: 0 for k in U}, **{V[k]: 0 for k in V}}
    base = sp.expand(exact.subs(zero))
    result = {
        "h": h,
        "A": A,
        "U": U,
        "V": V,
        "exact": exact,
        "base": base,
        "kind": config["kind"],
        "sign_values": {},
        "sign_algebra": {},
        "negative_absorption": {},
    }

    if config["kind"] == "base":
        assert sp.expand(exact - base) == 0
        result["lower"] = base
        return result

    if config["kind"] == "linear":
        family, roots = (U, config["U_roots"]) if config["U_roots"] else (V, config["V_roots"])
        other = V if family is U else U
        assert not any(other[k] in exact.free_symbols for k in other)
        coefficients = {k: sp.factor(sp.diff(exact, family[k])) for k in family}
        assert sp.expand(exact - base - sum(coefficients[k] * family[k] for k in family)) == 0
        effective = dict(coefficients)
        effective[4] = negative_monomial_lower(coefficients[4], avariables)
        nested_b = sp.factor(effective[3] + effective[4] * (h - 4) / 3)
        nested_c = sp.factor(effective[2] + nested_b * (h - 3) / 2)
        cap = rank2_cap(h, roots)
        lower = sp.expand(base + cap * nested_c)
        result.update({
            "family": "U" if family is U else "V",
            "coefficients": coefficients,
            "effective_coefficients": effective,
            "rank4_negative_monomial_lower": effective[4],
            "nested_b": nested_b,
            "nested_c": nested_c,
            "rank2_caps": {result.get("family", "U" if family is U else "V"): cap},
            "lower": lower,
            "sign_values": {"minus_b": -nested_b, "minus_c": -nested_c},
            "sign_algebra": {"b": nested_b, "c": nested_c},
        })
        return result

    assert config["kind"] == "bilinear"
    du = {k: sp.factor(sp.diff(exact, U[k]).subs({V[j]: 0 for j in V})) for k in U}
    dv = {k: sp.factor(sp.diff(exact, V[k]).subs({U[j]: 0 for j in U})) for k in V}
    bilinear = {(i, j): sp.factor(sp.diff(exact, U[i], V[j])) for i in U for j in V if sp.diff(exact, U[i], V[j]) != 0}
    reconstructed = base + sum(du[k] * U[k] for k in U) + sum(dv[k] * V[k] for k in V)
    reconstructed += sum(value * U[i] * V[j] for (i, j), value in bilinear.items())
    assert sp.expand(exact - reconstructed) == 0
    Ucap, Vcap = rank2_cap(h, config["U_roots"]), rank2_cap(h, config["V_roots"])
    effective_u, effective_v = dict(du), dict(dv)
    absorption = {}
    for (i, j), coefficient in bilinear.items():
        if coefficient >= 0:
            continue
        assert coefficient.is_number and coefficient < 0
        if i == 2:
            effective_v[j] = sp.expand(effective_v[j] + coefficient * Ucap)
            absorption[f"U{i}_V{j}"] = f"absorbed into V{j} using U2<={Ucap}"
        elif j == 2:
            effective_u[i] = sp.expand(effective_u[i] + coefficient * Vcap)
            absorption[f"U{i}_V{j}"] = f"absorbed into U{i} using V2<={Vcap}"
        else:
            raise AssertionError((config_key, i, j, coefficient))
    assert all(value >= 0 or i == 2 or j == 2 for (i, j), value in bilinear.items())

    effective_u[4] = negative_monomial_lower(effective_u[4], avariables)
    effective_v[4] = negative_monomial_lower(effective_v[4], avariables)
    bu = sp.factor(effective_u[3] + effective_u[4] * (h - 4) / 3)
    cu = sp.factor(effective_u[2] + bu * (h - 3) / 2)
    bv = sp.factor(effective_v[3] + effective_v[4] * (h - 4) / 3)
    cv = sp.factor(effective_v[2] + bv * (h - 3) / 2)
    lower = sp.expand(base + Ucap * cu + Vcap * cv)
    result.update({
        "du": du,
        "dv": dv,
        "effective_du": effective_u,
        "effective_dv": effective_v,
        "bilinear": bilinear,
        "negative_absorption": absorption,
        "rank4_negative_monomial_lowers": {"U": effective_u[4], "V": effective_v[4]},
        "nested_bu": bu,
        "nested_cu": cu,
        "nested_bv": bv,
        "nested_cv": cv,
        "rank2_caps": {"U": Ucap, "V": Vcap},
        "lower": lower,
        "sign_values": {"minus_bU": -bu, "minus_cU": -cu, "minus_bV": -bv, "minus_cV": -cv},
        "sign_algebra": {"bU": bu, "cU": cu, "bV": bv, "cV": cv},
    })
    return result


def build_value(config_key: str, chart: str):
    config = CONFIG[config_key]
    values = safe_lower(config_key)
    h, A = values["h"], values["A"]
    ep, op, tp = sp.symbols("edge_parameter omega_parameter tau_parameter", nonnegative=True)
    extensions = {k: sp.Symbol(f"extension{k}_parameter", nonnegative=True) for k in range(5, 9)}
    roots = config["surviving_roots"]
    edge_ceiling = h - roots if roots else h - 1
    edge = sp.expand(h / 2 + (edge_ceiling - h / 2) * ep)
    omega_low, omega_high = 2 * edge - h, edge**2 / 2
    boundary = sp.cancel((22 * edge**2 - 11 * edge * h - 12 * edge + 6 * h) / (8 * edge))
    omega = sp.cancel(omega_low + op * (boundary - omega_low)) if chart == "low_excess" else sp.cancel(boundary + op * (omega_high - boundary))
    excess = omega - 2 * edge + h
    tau_upper = 2 * edge - h + sp.Rational(11, 6) * edge * excess if chart == "low_excess" else omega * edge / 2
    tau = sp.cancel(tp * tau_upper)
    bad4 = edge * choose_poly(h - 2, 2) - omega * (h - 4) - edge * (edge - 1) / 2 + tau
    rows = {
        2: choose_poly(h, 2) - edge,
        3: choose_poly(h, 3) - edge * (h - 2) + omega,
        4: choose_poly(h, 4) - bad4,
    }
    for rank in range(5, 9):
        previous = rank - 1
        low = ((h - previous) * rows[previous] - 2 * edge * choose_poly(h - 2, previous - 1)) / rank
        high = (h - previous - 1) * rows[previous] / rank
        rows[rank] = sp.expand(low + extensions[rank] * (high - low))
    substitutions = {A[k]: rows[k] for k in range(2, 9)}
    sign_substitutions = {A[k]: rows[k] for k in range(2, 7)}
    variables = (ep, op, tp, *(extensions[k] for k in range(5, 9)))
    values.update({
        "variables": variables,
        "value": sp.cancel(values["lower"].subs(substitutions)),
        "sign_value_cone": {label: sp.cancel(expression.subs(sign_substitutions)) for label, expression in values["sign_values"].items()},
        "rows": rows,
        "edge": edge,
        "omega": omega,
        "tau": tau,
        "edge_ceiling": edge_ceiling,
    })
    return values


def summarize(expression, variables, h, threshold):
    tail = sp.Symbol("tail", nonnegative=True)
    numerator, denominator = map(sp.expand, sp.fraction(sp.cancel(expression.subs(h, tail + threshold))))
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
    sign_summaries, sign_denominators = {}, {}
    for label, expression in values["sign_value_cone"].items():
        sign_summaries[label], sign_denominators[label] = summarize(expression, values["variables"][:5], values["h"], threshold)
    output = HERE / f"iso_n7_bundle_g3_adjacent_no_parent_five_attachment_split_mixed_{args.config}_{args.chart}_h{threshold}_probe_rank7_g5_finish_20260831.json"
    report = {
        "marker": MARKER,
        "status": "exact diagnostic relaxation; no theorem asserted",
        "config": args.config,
        "configuration": config,
        "chart": args.chart,
        "threshold_h": threshold,
        "threshold_n": threshold + config["isolated_total"] + 2,
        "kind": values["kind"],
        "exact_identity": str(values["exact"]),
        "root_zero_base": str(values["base"]),
        "safe_lower": str(values["lower"]),
        "rank2_caps": {key: str(value) for key, value in values.get("rank2_caps", {}).items()},
        "negative_absorption": values["negative_absorption"],
        "sign_algebra": {key: str(value) for key, value in values["sign_algebra"].items()},
        "summary": summary,
        "positive_denominator": denominator,
        "sign_summaries": sign_summaries,
        "positive_sign_denominators": sign_denominators,
        "forest_domain": {
            "isolate_free_edge_floor": "e>=h/2",
            "edge_ceiling": str(values["edge_ceiling"]),
            "surviving_roots_in_distinct_nontrivial_components": config["surviving_roots"],
        },
        "classifier_sha256": CLASSIFIER_SHA,
        "scope": "One split exactly-five adjacent no-parent G3 isolated-attachment-root pattern with isolate-free H; unrelated isolate padding is separate.",
        "source_sha256": sha256(Path(__file__)),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "config": args.config,
        "kind": values["kind"],
        "chart": args.chart,
        "main_negatives": summary["negative_tail_scalar_coefficients"],
        "sign_negatives": {label: item["negative_tail_scalar_coefficients"] for label, item in sign_summaries.items()},
        "minimum": summary["minimum_tail_scalar_coefficient"],
        "first_negative": summary["first_negative"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
