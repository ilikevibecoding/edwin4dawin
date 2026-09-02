#!/usr/bin/env python3
"""Exact Bernstein discovery probe for pure no-parent/root-star g1."""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp

from derive_iso_n4_bundle_g1_deepest_configuration_agent import raw_g1
from derive_iso_n4_bundle_g12_endpoint_parent_agent import invariant_substitution
from probe_iso_n4_bundle_g1_endpoint_parent_bernstein_agent import tensor_bernstein


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n4_bundle_g1_no_parent_pure_bernstein_probe_agent_20260829.json"


def main() -> None:
    raw = raw_g1()
    rules = {
        sp.Symbol(f"d{name}{rank}"): sp.Symbol(f"c{name}{rank}")
        for name in "EUVW"
        for rank in range(6)
    }
    substitutions, motif_symbols = invariant_substitution()
    g1 = sp.factor(raw.subs(rules).subs(substitutions))
    motif = sp.expand(sum(sp.diff(g1, symbol) * symbol for symbol in motif_symbols))
    residual = sp.factor(g1 - motif)
    names = {str(symbol): symbol for symbol in residual.free_symbols}

    q = sp.symbols("q", nonnegative=True)
    a, b, c = sp.symbols("a b c", nonnegative=True)
    box = (a, b, c)
    rows = []
    for threshold in range(4, 13):
        total = sp.Integer(threshold - 2) + q
        x = total * a
        y = total * (1 - a) * b
        r = total * (1 - a) * (1 - b) * c
        branch_count = coefficient_count = bad = 0
        first_bad = None
        minimum_q0 = None
        profiles = set()
        for adjacent, zu, zv in itertools.product((0, 1), repeat=3):
            if adjacent and not (zu and zv):
                continue
            du, dv = zu + x, zv + y
            edges = 1 + x + y + r
            wedge_upper = (
                du * (du - 1) / 2
                + dv * (dv - 1) / 2
                + r * (r + 1) / 2
            )
            lower = sp.cancel(
                residual.subs(
                    {
                        names["n"]: total + 2,
                        names["edge_count"]: edges,
                        names["degree_u"]: du,
                        names["degree_v"]: dv,
                        names["adjacent"]: adjacent,
                        names["C_neighbor_excess_u"]: 0,
                        names["C_neighbor_excess_v"]: 0,
                        names["C_common_neighbor"]: 1,
                        names["C_wedges_E"]: wedge_upper,
                    }
                )
            )
            assert sp.denom(lower) == 1
            branch_count += 1
            for degrees, index, coefficient in tensor_bernstein(lower, box):
                coefficient_count += 1
                profiles.add(degrees)
                q_coefficients = sp.Poly(sp.expand(coefficient), q).all_coeffs()
                if not all(value >= 0 for value in q_coefficients):
                    bad += 1
                    if first_bad is None:
                        first_bad = {
                            "branch_adj_zu_zv": [adjacent, zu, zv],
                            "index": list(index),
                            "coefficient": str(coefficient),
                        }
                q0 = sp.factor(coefficient.subs(q, 0))
                minimum_q0 = q0 if minimum_q0 is None or q0 < minimum_q0 else minimum_q0
        row = {
            "threshold": threshold,
            "branches": branch_count,
            "coefficients": coefficient_count,
            "degree_profiles": [list(profile) for profile in sorted(profiles)],
            "bad": bad,
            "first_bad": first_bad,
            "minimum_q0": str(minimum_q0),
        }
        rows.append(row)
        print(json.dumps(row, sort_keys=True), flush=True)
        if bad == 0:
            break

    report = {
        "marker": "PROBE_EXACT_ISO_N4_BUNDLE_G1_NO_PARENT_PURE_BERNSTEIN_AGENT",
        "passing_threshold": next((row["threshold"] for row in rows if row["bad"] == 0), None),
        "rows": rows,
        "motif_part": str(sp.factor(motif)),
        "residual": str(residual),
        "scope": "Exact sufficient-cone discovery probe only; not a theorem.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
