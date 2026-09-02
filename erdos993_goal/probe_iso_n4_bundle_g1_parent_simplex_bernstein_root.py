#!/usr/bin/env python3
"""Exact Bernstein probe for the degree-excess floor of the g1 residual.

For a nonempty forest put E=e-1.  If z_u,z_v,z_p record whether the three
marked vertices have positive degree, write

    d_u=z_u+x, d_v=z_v+y, d_p=z_p+z,
    E=x+y+z+r,
    n-2=x+y+z+r+h.

The convex degree-excess bound is

    S <= C(d_u,2)+C(d_v,2)+C(d_p,2)+C(r+1,2).

After the other monotone replacements, this script maps the five-part
simplex to a four-dimensional unit box by stick breaking and checks exact
tensor Bernstein coefficients.  It is a discovery probe until every branch
passes and an independent audit is supplied.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
DEPENDENCY = HERE / "iso_n4_bundle_g1_parent_residual_root_20260829.json"
OUTPUT = HERE / "iso_n4_bundle_g1_parent_simplex_bernstein_probe_root_20260829.json"


def tensor_bernstein(poly: sp.Expr, variables: tuple[sp.Symbol, ...]):
    expanded = sp.Poly(sp.expand(poly), *variables)
    degrees = tuple(expanded.degree(variable) for variable in variables)
    power = dict(expanded.terms())
    for index in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = 0
        for monomial, coefficient in power.items():
            if all(j <= k for j, k in zip(monomial, index)):
                multiplier = 1
                for j, k, degree in zip(monomial, index, degrees):
                    multiplier *= sp.binomial(k, j) / sp.binomial(degree, j)
                value += coefficient * multiplier
        yield index, sp.factor(value)


def nonnegative_power_polynomial(value: sp.Expr, variable: sp.Symbol) -> bool:
    polynomial = sp.Poly(sp.expand(value), variable)
    return all(coefficient >= 0 for coefficient in polynomial.all_coeffs())


def main() -> None:
    dependency = json.loads(DEPENDENCY.read_text(encoding="utf-8"))
    assert dependency["marker"] == "DERIVED_EXACT_ISO_N4_BUNDLE_G1_PARENT_ROOTED_RESIDUAL"
    expression = sp.sympify(dependency["rooted_residual"])
    names = {str(symbol): symbol for symbol in expression.free_symbols}
    n, e = names["n"], names["edge_count"]
    du, dv, dp = names["degree_u"], names["degree_v"], names["degree_p"]
    adjacent = names["adjacent"]
    apu, apv = names["adjacent_pu"], names["adjacent_pv"]
    wedges = names["C_wedges_E"]

    q = sp.symbols("q", nonnegative=True)
    box = sp.symbols("a b c d", nonnegative=True)
    a, b, c, d = box

    rows = []
    # Numerical reconnaissance locates the first plausible cutoff at 12.
    # Start there; higher values are fallbacks if the exact tensor basis is
    # still too coarse.
    for minimum_n in (12, 13, 14, 16, 20):
        T = sp.Integer(minimum_n - 2) + q
        x = T * a
        y = T * (1 - a) * b
        z = T * (1 - a) * (1 - b) * c
        r = T * (1 - a) * (1 - b) * (1 - c) * d
        # h is the final unused stick and is automatically nonnegative.
        branch_count = 0
        coefficient_count = 0
        bad_count = 0
        first_bad = None
        for auv, au, av in itertools.product((0, 1), repeat=3):
            if auv + au + av == 3:
                continue
            for zu, zv, zp in itertools.product((0, 1), repeat=3):
                if auv and not (zu and zv):
                    continue
                if au and not (zu and zp):
                    continue
                if av and not (zv and zp):
                    continue
                d_u, d_v, d_p = zu + x, zv + y, zp + z
                edge_count = 1 + x + y + z + r
                wedge_upper = (
                    d_u * (d_u - 1) / 2
                    + d_v * (d_v - 1) / 2
                    + d_p * (d_p - 1) / 2
                    + r * (r + 1) / 2
                )
                lower = expression.subs(
                    {
                        names["C_neighbor_excess_u"]: 0,
                        names["C_neighbor_excess_v"]: 0,
                        names["neighbor_excess_p"]: 0,
                        names["C_common_neighbor"]: 1,
                        names["common_neighbor_pu"]: 1,
                        names["common_neighbor_pv"]: 1,
                        wedges: wedge_upper,
                        n: T + 2,
                        e: edge_count,
                        du: d_u,
                        dv: d_v,
                        dp: d_p,
                        adjacent: auv,
                        apu: au,
                        apv: av,
                    }
                )
                lower = sp.cancel(lower)
                assert sp.denom(lower) == 1
                branch_count += 1
                if branch_count % 8 == 0:
                    print(
                        f"n>={minimum_n} branch {branch_count}",
                        flush=True,
                    )
                for index, coefficient in tensor_bernstein(lower, box):
                    coefficient_count += 1
                    if not nonnegative_power_polynomial(coefficient, q):
                        bad_count += 1
                        if first_bad is None:
                            first_bad = {
                                "adjacent_uv_pu_pv": [auv, au, av],
                                "positive_degree_u_v_p": [zu, zv, zp],
                                "bernstein_index": list(index),
                                "coefficient": str(coefficient),
                                "value_at_q0": str(sp.factor(coefficient.subs(q, 0))),
                            }
        row = {
            "minimum_n": minimum_n,
            "branches": branch_count,
            "bernstein_coefficients": coefficient_count,
            "non_power_nonnegative_coefficients": bad_count,
            "first_bad": first_bad,
        }
        rows.append(row)
        print(json.dumps(row, sort_keys=True), flush=True)
        if bad_count == 0:
            break

    report = {
        "marker": "PROBE_EXACT_ISO_N4_BUNDLE_G1_PARENT_SIMPLEX_BERNSTEIN",
        "rows": rows,
        "passing_threshold": next(
            (row["minimum_n"] for row in rows if row["non_power_nonnegative_coefficients"] == 0),
            None,
        ),
        "scope": (
            "Exact Bernstein probe of a sufficient relaxed lower bound. A pass "
            "would still require the monotonicity and degree-excess lemmas to be "
            "assembled and independently audited."
        ),
        "dependency_sha256": hashlib.sha256(DEPENDENCY.read_bytes()).hexdigest().upper(),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8")
    print(json.dumps(report, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
