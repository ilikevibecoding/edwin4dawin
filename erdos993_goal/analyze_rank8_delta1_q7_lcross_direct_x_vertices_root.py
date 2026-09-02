#!/usr/bin/env python3
"""Exact value diagnostics for the two direct-x Delta1/Q7 vertices."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
SOURCE = HERE / "rank8_delta1_q7_lcross_source_sparse_root_20260826.json"
SOURCE_SHA256 = "A4E63AF3A071F222F5F1C581F7B52F3BD74623E74728A323C3FECFA4616F6D66"
OUTPUT = HERE / "rank8_delta1_q7_lcross_direct_x_vertices_exact_root_20260826.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def shifted_certificate(expression: sp.Expr, n: sp.Symbol):
    numerator, denominator = map(sp.factor, sp.fraction(sp.cancel(expression)))
    s = sp.symbols("s", nonnegative=True)
    for cutoff in range(28, 101):
        num = sp.Poly(sp.expand(numerator.subs(n, cutoff + s)), s, domain=sp.QQ)
        den = sp.Poly(sp.expand(denominator.subs(n, cutoff + s)), s, domain=sp.QQ)
        nc = [num.nth(power) for power in range(num.degree() + 1)]
        dc = [den.nth(power) for power in range(den.degree() + 1)]
        if (
            nc[0] > 0
            and dc[0] > 0
            and all(coefficient >= 0 for coefficient in nc)
            and all(coefficient >= 0 for coefficient in dc)
        ):
            return cutoff, numerator, denominator, min(nc), min(dc)
    return None, numerator, denominator, None, None


def main() -> None:
    assert sha256(SOURCE) == SOURCE_SHA256
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    terms = [
        (tuple(int(value) for value in monomial), sp.Rational(coefficient))
        for monomial, coefficient in source["numerator_terms"]
    ]
    n = sp.symbols("n", positive=True)
    t = 1 / n
    floor = (n - 19) / (n - 12)
    x_lower = sp.factor(t * (3 + 9 * t) * (sp.Rational(4, 3) + 2 * t / 3))
    x_upper = sp.factor(4 * (n - 2) / ((n - 5) * (n - 6)))
    vertices = {
        "lower_x_V1": (x_lower, 1),
        "sharp_upper_x_V0": (x_upper, 0),
    }
    rows = {}
    for label, (x_value, v_value) in vertices.items():
        active_terms = []
        for monomial, coefficient in terms:
            n_power, w_power, x_power, u_power, k_power, v_power, z_power = monomial
            assert w_power == 0
            if u_power > 0 or (v_value == 0 and v_power > 0):
                continue
            active_terms.append((monomial, coefficient))
        samples = []
        for order in range(28, 41):
            x_at_order = sp.factor(x_value.subs(n, order))
            floor_at_order = sp.Rational(order - 19, order - 12)
            exact = sp.factor(
                sum(
                    coefficient
                    * order**monomial[0]
                    * x_at_order**monomial[2]
                    * v_value**monomial[5]
                    * floor_at_order**monomial[6]
                    for monomial, coefficient in active_terms
                )
            )
            samples.append(
                {
                    "n": order,
                    "sign": -1 if exact < 0 else (1 if exact > 0 else 0),
                    "value": str(exact),
                }
            )
        print(
            "VERTEX_SAMPLES",
            label,
            [(row["n"], row["sign"]) for row in samples],
            flush=True,
        )
        cutoff = num_min = den_min = None
        rows[label] = {
            "samples_n28_to40": samples,
            "last_negative_n28_to40": max(
                (row["n"] for row in samples if row["sign"] < 0), default=None
            ),
            "shifted_power_tail_cutoff": cutoff,
            "numerator_degree": None,
            "denominator_degree": None,
            "tail_numerator_minimum_coefficient": None if num_min is None else str(num_min),
            "tail_denominator_minimum_coefficient": None if den_min is None else str(den_min),
            "source_terms_used": len(active_terms),
        }
    payload = {
        "schema": "rank8-delta1-q7-lcross-direct-x-vertices-exact-root-v1",
        "status": "PASS_EXACT_DIRECT_X_VERTEX_VALUE_DIAGNOSTICS",
        "vertices": rows,
        "scope_warning": "Vertex diagnostics only; not a tensor sign certificate.",
        "immutable_inputs": {SOURCE.name: SOURCE_SHA256},
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    for label, row in rows.items():
        print(label, "LAST_NEG", row["last_negative_n28_to40"], "TAIL", row["shifted_power_tail_cutoff"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
