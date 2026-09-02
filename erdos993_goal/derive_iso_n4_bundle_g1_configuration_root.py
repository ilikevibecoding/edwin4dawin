#!/usr/bin/env python3
"""Reduce the first N4 bundle coefficient g1 to forest configurations.

The fixed-rank expression needs independent-set counts through size five.
This script substitutes exact edge-configuration inclusion-exclusion formulas
for forests.  It is an algebraic reduction until a complete sign argument is
added.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from derive_iso_n4_bundle_lower_incidence_root import coefficient_rows
from derive_iso_n4_bundle_g2_configuration_root import c2, c3, c4, i2, i3, i4


def c5(n: sp.Expr) -> sp.Expr:
    return sp.expand(n * (n - 1) * (n - 2) * (n - 3) * (n - 4) / 120)


def i5(
    n: sp.Expr,
    e: sp.Expr,
    wedges: sp.Expr,
    connected3: sp.Expr,
    stars3: sp.Expr,
    connected4: sp.Expr,
) -> sp.Expr:
    """Exact independent five-set count in a forest."""
    mixed3 = wedges * (e - 2) - 2 * connected3 - stars3
    return sp.expand(
        c5(n)
        - e * c3(n - 2)
        + wedges * c2(n - 3)
        + (c2(e) - wedges) * (n - 4)
        - connected3 * (n - 4)
        - mixed3
        + connected4
    )


def main() -> None:
    g1 = coefficient_rows()[1]
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
    ce_h, ce_w = sp.symbols(
        "C_stars3_E C_connected4_E", nonnegative=True
    )
    de, dud, dvd = sp.symbols(
        "D_edges D_degree_u D_degree_v", integer=True, nonnegative=True
    )
    de_s, du_s, dv_s = sp.symbols(
        "D_wedges_E D_wedges_U D_wedges_V", nonnegative=True
    )
    de_r = sp.symbols("D_connected3_E", nonnegative=True)

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
        sp.symbols("cE5"): i5(n, ce, ce_s, ce_r, ce_h, ce_w),
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
        sp.symbols("dE4"): i4(q, de, de_s, de_r),
    }
    reduced = sp.factor(g1.subs(substitution))
    for boolean in (eu, ev, adjacent):
        reduced = sp.rem(
            sp.Poly(reduced, boolean), sp.Poly(boolean**2 - boolean, boolean)
        ).as_expr()
    reduced = sp.factor(reduced)

    configurations = (
        ce_s, cu_s, cv_s, cw_s, ce_r, cu_r, cv_r, ce_h, ce_w,
        de_s, du_s, dv_s, de_r, de, dud, dvd,
    )
    derivatives = {
        str(symbol): str(sp.factor(sp.diff(reduced, symbol)))
        for symbol in configurations
    }

    # Exact marked-deletion wedge substitutions, followed by the canonical
    # deepest ordinary specialization |S|=1 and both marks surviving.
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
    local = sp.expand(reduced.subs(exact_local))
    for boolean in (eu, ev, adjacent):
        local = sp.rem(
            sp.Poly(local, boolean), sp.Poly(boolean**2 - boolean, boolean)
        ).as_expr()
    local = sp.factor(local)
    deepest = sp.factor(local.subs({deleted: 1, eu: 1, ev: 1}))

    report = {
        "marker": "DERIVED_EXACT_ISO_N4_BUNDLE_G1_CONFIGURATION_FORM",
        "configuration_derivatives": derivatives,
        "generic_form": str(reduced),
        "local_deletion_form": str(local),
        "deepest_singleton_ordinary_form": str(deepest),
        "i5_formula": (
            "C(n,5)-e*C(n-2,3)+S*C(n-3,2)+(C(e,2)-S)(n-4)-"
            "R(n-4)-[S(e-2)-2R-H]+W"
        ),
        "scope": "Exact configuration reduction only; no sign theorem is asserted.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    Path("iso_n4_bundle_g1_configuration_root_20260829.json").write_text(
        raw, encoding="utf-8"
    )
    print(json.dumps({key: value for key, value in report.items() if not key.endswith("form")}, indent=2, sort_keys=True))
    print("DEEPEST_FORM", deepest)
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(report["marker"])


if __name__ == "__main__":
    main()
