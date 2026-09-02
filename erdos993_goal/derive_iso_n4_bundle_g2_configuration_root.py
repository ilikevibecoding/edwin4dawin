#!/usr/bin/env python3
"""Reduce bundle coefficient g2 to exact forest configuration counts.

This script substitutes the inclusion-exclusion formulas for independent
sets of sizes two, three, and four in each induced forest.  It is a route
diagnostic until a complete sign argument is supplied.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n4_bundle_lower_incidence_root import coefficient_rows


def c2(n: sp.Expr) -> sp.Expr:
    return sp.expand(n * (n - 1) / 2)


def c3(n: sp.Expr) -> sp.Expr:
    return sp.expand(n * (n - 1) * (n - 2) / 6)


def c4(n: sp.Expr) -> sp.Expr:
    return sp.expand(n * (n - 1) * (n - 2) * (n - 3) / 24)


def i2(n: sp.Expr, e: sp.Expr) -> sp.Expr:
    return sp.expand(c2(n) - e)


def i3(n: sp.Expr, e: sp.Expr, wedges: sp.Expr) -> sp.Expr:
    return sp.expand(c3(n) - e * (n - 2) + wedges)


def i4(n: sp.Expr, e: sp.Expr, wedges: sp.Expr, connected3: sp.Expr) -> sp.Expr:
    return sp.expand(
        c4(n)
        - e * c2(n - 2)
        + wedges * (n - 4)
        + c2(e)
        - connected3
    )


def main() -> None:
    g2 = coefficient_rows()[2]
    n, q, e, du, dv, adjacent = sp.symbols(
        "n q edge_count degree_u degree_v adjacent", integer=True, nonnegative=True
    )
    eu, ev = sp.symbols("epsilon_u epsilon_v", integer=True, nonnegative=True)
    ce_s, cu_s, cv_s, cw_s = sp.symbols(
        "C_wedges_E C_wedges_U C_wedges_V C_wedges_W", nonnegative=True
    )
    ce_r, cu_r, cv_r = sp.symbols(
        "C_connected3_E C_connected3_U C_connected3_V", nonnegative=True
    )
    de, dud, dvd = sp.symbols(
        "D_edges D_degree_u D_degree_v", integer=True, nonnegative=True
    )
    de_s, du_s, dv_s = sp.symbols(
        "D_wedges_E D_wedges_U D_wedges_V", nonnegative=True
    )

    ce = e
    cue = e - du
    cve = e - dv
    cwe = e - du - dv + adjacent
    due = de - eu * dud
    dve = de - ev * dvd

    substitution = {
        **{sp.symbols(f"c{name}0"): 1 for name in "EUVW"},
        **{sp.symbols(f"d{name}0"): 1 for name in "EUVW"},
        sp.symbols("cE1"): n,
        sp.symbols("cU1"): n - 1,
        sp.symbols("cV1"): n - 1,
        sp.symbols("cW1"): n - 2,
        sp.symbols("dE1"): q,
        sp.symbols("dU1"): q - eu,
        sp.symbols("dV1"): q - ev,
        sp.symbols("dW1"): q - eu - ev,
        sp.symbols("cE2"): i2(n, ce),
        sp.symbols("cU2"): i2(n - 1, cue),
        sp.symbols("cV2"): i2(n - 1, cve),
        sp.symbols("cW2"): i2(n - 2, cwe),
        sp.symbols("cE3"): i3(n, ce, ce_s),
        sp.symbols("cU3"): i3(n - 1, cue, cu_s),
        sp.symbols("cV3"): i3(n - 1, cve, cv_s),
        sp.symbols("cW3"): i3(n - 2, cwe, cw_s),
        sp.symbols("cE4"): i4(n, ce, ce_s, ce_r),
        sp.symbols("cU4"): i4(n - 1, cue, cu_s, cu_r),
        sp.symbols("cV4"): i4(n - 1, cve, cv_s, cv_r),
        sp.symbols("dE2"): i2(q, de),
        sp.symbols("dU2"): i2(q - eu, due),
        sp.symbols("dV2"): i2(q - ev, dve),
        sp.symbols("dW2"): i2(
            q - eu - ev,
            de - eu * dud - ev * dvd + eu * ev * adjacent,
        ),
        sp.symbols("dE3"): i3(q, de, de_s),
        sp.symbols("dU3"): i3(q - eu, due, du_s),
        sp.symbols("dV3"): i3(q - ev, dve, dv_s),
    }
    reduced = sp.factor(g2.subs(substitution))
    for boolean in (eu, ev, adjacent):
        reduced = sp.rem(
            sp.Poly(reduced, boolean), sp.Poly(boolean**2 - boolean, boolean)
        ).as_expr()
    reduced = sp.factor(reduced)
    poly = sp.Poly(reduced, *sorted(reduced.free_symbols, key=str))

    # Record the affine coefficient of every non-order configuration count.
    configuration_symbols = (
        ce_s, cu_s, cv_s, cw_s, ce_r, cu_r, cv_r,
        de_s, du_s, dv_s, de, dud, dvd,
    )
    derivatives = {
        str(symbol): str(sp.factor(sp.diff(reduced, symbol)))
        for symbol in configuration_symbols
    }
    assert all(sp.diff(reduced, symbol, 2) == 0 for symbol in configuration_symbols)

    c_neighbor_u, c_neighbor_v, common = sp.symbols(
        "C_neighbor_excess_u C_neighbor_excess_v C_common_neighbor",
        integer=True,
        nonnegative=True,
    )
    d_neighbor_u, d_neighbor_v = sp.symbols(
        "D_neighbor_excess_u D_neighbor_excess_v",
        integer=True,
        nonnegative=True,
    )
    deleted = sp.symbols("deleted_count", integer=True, nonnegative=True)
    exact_local = {
        cu_s: ce_s - c2(du) - c_neighbor_u,
        cv_s: ce_s - c2(dv) - c_neighbor_v,
        cw_s: (
            ce_s
            - c2(du)
            - c2(dv)
            - c_neighbor_u
            - c_neighbor_v
            + adjacent * (du + dv - 2)
            + common
        ),
        du_s: de_s - eu * (c2(dud) + d_neighbor_u),
        dv_s: de_s - ev * (c2(dvd) + d_neighbor_v),
        q: n - deleted,
    }
    local_reduced = sp.expand(reduced.subs(exact_local))
    for boolean in (eu, ev, adjacent):
        local_reduced = sp.rem(
            sp.Poly(local_reduced, boolean),
            sp.Poly(boolean**2 - boolean, boolean),
        ).as_expr()
    local_reduced = sp.factor(local_reduced)
    local_poly = sp.Poly(
        local_reduced, *sorted(local_reduced.free_symbols, key=str)
    )
    deepest_ordinary = sp.factor(
        local_reduced.subs({deleted: 1, eu: 1, ev: 1})
    )

    report = {
        "marker": "DERIVED_EXACT_ISO_N4_BUNDLE_G2_CONFIGURATION_FORM",
        "g2_configuration_form": str(reduced),
        "monomials": len(poly.terms()),
        "negative_scalar_coefficients": sum(
            1 for _, coefficient in poly.terms() if coefficient < 0
        ),
        "configuration_derivatives": derivatives,
        "local_deletion_reduction": {
            "form": str(local_reduced),
            "monomials": len(local_poly.terms()),
            "negative_scalar_coefficients": sum(
                1 for _, coefficient in local_poly.terms() if coefficient < 0
            ),
            "exact_substitutions": {
                "C_wedges_U": "C_wedges_E-C(degree_u,2)-C_neighbor_excess_u",
                "C_wedges_V": "C_wedges_E-C(degree_v,2)-C_neighbor_excess_v",
                "C_wedges_W": (
                    "C_wedges_E-C(degree_u,2)-C(degree_v,2)-"
                    "C_neighbor_excess_u-C_neighbor_excess_v+"
                    "adjacent*(degree_u+degree_v-2)+C_common_neighbor"
                ),
                "D_wedges_U": (
                    "D_wedges_E-epsilon_u*(C(D_degree_u,2)+D_neighbor_excess_u)"
                ),
                "D_wedges_V": (
                    "D_wedges_E-epsilon_v*(C(D_degree_v,2)+D_neighbor_excess_v)"
                ),
                "q": "n-deleted_count",
            },
        },
        "deepest_singleton_ordinary": {
            "assumptions": "deleted_count=1 and both marks survive",
            "form": str(deepest_ordinary),
        },
        "formulas": {
            "i2": "C(n,2)-e",
            "i3": "C(n,3)-e(n-2)+S",
            "i4": "C(n,4)-e*C(n-2,2)+S(n-4)+C(e,2)-R",
        },
        "scope": "Exact configuration reduction only; no sign theorem is asserted.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    Path("iso_n4_bundle_g2_configuration_root_20260829.json").write_text(
        raw, encoding="utf-8"
    )
    print(raw, end="")
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
