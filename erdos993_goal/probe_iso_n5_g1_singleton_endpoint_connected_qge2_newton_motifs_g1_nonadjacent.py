#!/usr/bin/env python3
"""Inspect motif coefficients of the 45 exact extra-star Newton rows."""
from __future__ import annotations

import sympy as sp

from audit_iso_n4_bundle_g12_endpoint_parent_independent_g1_bernstein import choose, i2, i3, i4, i5
from probe_iso_n5_g1_singleton_endpoint_connected_qge2_newton_rows_g1_nonadjacent import collect_rows


def motif_rows(base):
    n, e, du, dv, adjacent = sp.symbols("n e du dv adjacent")
    common, re, ru, rv, q35, r4, xu, xv, wedges = sp.symbols(
        "common re ru rv q35 r4 xu xv wedges"
    )
    eu, ev = e - du, e - dv
    ew = e - du - dv + adjacent
    wu = wedges - choose(du, 2) - xu
    wv = wedges - choose(dv, 2) - xv
    ww = wedges - choose(du, 2) - choose(dv, 2) - xu - xv + adjacent * (du + dv - 2) + common
    U = (1, n, i2(n, e), i3(n, e, wedges), i4(n, e, wedges, re), i5(n, e, wedges, re, q35, r4))
    W = (1, n - 1, i2(n - 1, ev), i3(n - 1, ev, wv), i4(n - 1, ev, wv, rv), 0)
    QE = (1, n - 1, i2(n - 1, eu), i3(n - 1, eu, wu), i4(n - 1, eu, wu, ru), 0)
    QV = (1, n - 2, i2(n - 2, ew), i3(n - 2, ew, ww), 0, 0)
    substitution = {
        symbol: value
        for symbolic_row, value_row in zip(base, (U, W, QE, QV))
        for symbol, value in zip(symbolic_row[1:], value_row[1:])
    }
    symbols = (n, e, du, dv, adjacent, common, re, ru, rv, q35, r4, xu, xv, wedges)
    return symbols, substitution


def main():
    base, unique, total = collect_rows()
    symbols, substitution = motif_rows(base)
    n, e, du, dv, adjacent, common, re, ru, rv, q35, r4, xu, xv, wedges = symbols
    failures = []
    for index, (row, origin) in enumerate(unique.items()):
        exact = sp.expand(row.subs(substitution))
        highs = [sp.factor(sp.diff(exact, variable)) for variable in (re, ru, rv, q35, r4)]
        assert all(not coefficient.has(re, ru, rv, q35, r4) for coefficient in highs)
        assert sp.expand(exact - exact.subs({re: 0, ru: 0, rv: 0, q35: 0, r4: 0}) - sum(c * x for c, x in zip(highs, (re, ru, rv, q35, r4)))) == 0
        cre, cru, crv, cq, c4 = highs
        lam = sp.factor(cq / 5)
        A = sp.factor(cre - 2 * lam * (n - 4) + cru)
        deletion = sp.factor(-cru)
        r4left = sp.factor(c4 + cq + 3 * lam)
        kxu = sp.factor(sp.diff(exact, xu))
        kcommon = sp.factor(sp.diff(exact, common))
        ok_pattern = sp.expand(c4 + cq) == 0 and sp.expand(r4left - 3 * lam) == 0
        if not ok_pattern:
            failures.append(index)
        print(
            "ROW", index, origin,
            "cre", cre, "cru", cru, "crv", crv,
            "cq", cq, "c4", c4,
            "A", A, "del", deletion, "lam", lam,
            "kxu", kxu, "kcommon", kcommon,
            "pattern", ok_pattern,
            flush=True,
        )
    print("FAILURES", failures)


if __name__ == "__main__":
    main()
