#!/usr/bin/env python3
"""Exact transfer diagnostics from the solved bottom kernel to the group endpoint.

This is a reconnaissance certificate, not an all-order proof of the group
endpoint.  It certifies the all-order algebraic identity reducing the group
target to one contiguous difference of bottom targets, then records the
finite sign-regular Schur-tail pattern suggested by that identity.
"""

from __future__ import annotations

import json
from collections import Counter
from itertools import combinations
from pathlib import Path

import sympy as sp

from probe_group_as_bottom_difference import bottom, x, y
from probe_group_catalan_square_core import matrix, schur_tail
from verify_umbral_hypergeometric_finite_free_structure import X, hypergeometric_form


OUT = Path("group_bottom_transfer_20260803.json")
t = sp.symbols("t")


def group_direct(N: int, d: int):
    g = hypergeometric_form(N, 1)
    h = hypergeometric_form(N - 1, 1)
    j = hypergeometric_form(N - 2, 1)

    def dsum(poly, order):
        return sp.expand(
            sum(
                sp.binomial(order, k) * sp.diff(poly, x, k, y, order - k)
                for k in range(order + 1)
            )
        )

    gg = g.subs(X, x) * g.subs(X, y)
    hh = h.subs(X, x) * h.subs(X, y)
    jj = j.subs(X, x) * j.subs(X, y)
    return sp.expand(dsum(gg, d) - 2 * dsum(hh, d - 2) + dsum(jj, d - 4))


def sign(value):
    return "+" if value > 0 else "-" if value < 0 else "0"


def expected_signature(order: int):
    return "+" if order <= 2 or order % 2 == 0 else "-"


def main():
    derivative_checks = []
    for N in range(2, 31):
        lhs = sp.diff(hypergeometric_form(N, 3), X)
        rhs = hypergeometric_form(N - 1, 1)
        assert sp.expand(lhs - rhs) == 0
        derivative_checks.append(N)

    transfer_checks = []
    for m in range(1, 7):
        N, d = 3 * m + 4, 2 * m + 5
        lifted = sp.diff(sp.expand(bottom(N + 1, d) - bottom(N, d - 2)), x, y)
        direct = group_direct(N, d)
        assert sp.expand(lifted - direct) == 0
        transfer_checks.append(m)

    schur_records = []
    for m in range(1, 8):
        d, ambient = 2 * m + 5, 3 * m + 5
        tail = schur_tail(matrix(d, power=2, limit=ambient), d)[:, ::-1]
        counts = {}
        for order in range(1, m + 1):
            local = Counter()
            for rr in combinations(range(m), order):
                for cc in combinations(range(m), order):
                    local[sign(tail.extract(rr, cc).det())] += 1
            expected = "-" if m == 1 and order == 1 else expected_signature(order)
            assert set(local) == {expected}, (m, order, local)
            counts[str(order)] = {key: int(value) for key, value in local.items()}
        schur_records.append({"m": m, "minor_sign_counts": counts})

    sturm_records = []
    for m in range(1, 6):
        N, d = 3 * m + 4, 2 * m + 5
        pre = sp.expand(bottom(N + 1, d) - bottom(N, d - 2))
        post = sp.diff(pre, x, y)
        local = {"m": m}
        for label, polynomial in (("pre", pre), ("post", post)):
            line = sp.Poly(polynomial.subs({x: 1 + 2 * t, y: 2 + 3 * t}), t)
            real = line.count_roots(-sp.oo, sp.oo)
            assert real == line.degree(), (m, label, line.degree(), real)
            local[label] = {"degree": int(line.degree()), "real_roots": int(real)}
        sturm_records.append(local)

    report = {
        "status": "PASS_GROUP_TO_BOTTOM_TRANSFER_IDENTITY_AND_FINITE_SSR_AUDIT",
        "derivative_identity": "D g_(N,3)=g_(N-1,1)",
        "derivative_checks": len(derivative_checks),
        "group_identity": (
            "G_(N,d)=D_X D_Y (F_(N+1,d)-F_(N,d-2)), where F is the "
            "solved defect-three bottom kernel"
        ),
        "transfer_checks": len(transfer_checks),
        "schur_tail_signature": {
            "m_1_exception": "the sole entry is negative",
            "order_1": "+",
            "order_2": "+",
            "order_k_ge_3": "(-1)^k",
        },
        "schur_records": schur_records,
        "sturm_records": sturm_records,
        "warning": (
            "The transfer identity is all-order.  The sign-regular Schur-tail "
            "and Sturm results are finite evidence for the remaining contiguous-"
            "difference theorem, not its proof."
        ),
    }
    OUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
