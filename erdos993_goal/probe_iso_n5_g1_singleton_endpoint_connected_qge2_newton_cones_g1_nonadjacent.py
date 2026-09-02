#!/usr/bin/env python3
"""All-order cone probe for the 45 exact extra-star Newton rows."""
from __future__ import annotations

import hashlib
import json
import os

import sympy as sp

from audit_iso_n4_bundle_g12_endpoint_parent_independent_g1_bernstein import choose
from probe_iso_n5_g1_singleton_endpoint_connected_qge2_newton_motifs_g1_nonadjacent import motif_rows
from probe_iso_n5_g1_singleton_endpoint_connected_qge2_newton_rows_g1_nonadjacent import collect_rows
from prove_iso_n5_disconnected_m5_sum16_q1_active_root_g1_nonadjacent import (
    coefficient_rows_hash,
    polynomial_hash,
    tensor_bernstein_sparse,
)


def lower_rows(base, unique):
    symbols, substitution = motif_rows(base)
    n, e, du, dv, adjacent, common, re, ru, rv, q35, r4, xu, xv, wedges = symbols
    ev = e - dv
    wv = wedges - choose(dv, 2) - xv
    star3 = 2 * wedges * (wedges - e + 1) / (3 * (e - 1))
    star3_v = 2 * wv * (wv - ev + 1) / (3 * (ev - 1))
    degree_floor = 2 * wedges / (e - 1)
    r4_floor = degree_floor**3 * (degree_floor - 3) / 108
    records = []
    for index, (row, origin) in enumerate(unique.items()):
        exact = sp.expand(row.subs(substitution))
        cre, cru, crv, cq, c4 = [sp.factor(sp.diff(exact, z)) for z in (re, ru, rv, q35, r4)]
        assert sp.expand(c4 + cq) == 0
        lam = sp.factor(cq / 5)
        A = sp.factor(cre - 2 * lam * (n - 4) + cru)
        deletion = sp.factor(-cru)
        nonhigh = exact.subs({re: 0, ru: 0, rv: 0, q35: 0, r4: 0})
        kxu, kcommon = sp.factor(sp.diff(nonhigh, xu)), sp.factor(sp.diff(nonhigh, common))
        if index in (1, 2, 7):
            expected = {1: (3, n), 2: (1, 1), 7: (0, 1)}[index]
            assert sp.expand(kxu - expected[0]) == 0 and sp.expand(kcommon - expected[1]) == 0
            nonhigh = nonhigh.subs({xu: 0, common: 0})
        elif index == 6:
            assert sp.expand(kxu - (2 - n)) == 0 and kcommon == n
            nonhigh = nonhigh.subs({xu: e - du, common: 0})
        elif index in (11, 21):
            assert kxu == -1 and kcommon == 1
            nonhigh = nonhigh.subs({xu: e - du, common: 0})
        elif index == 0:
            # Already frozen in the q=1 theorem; retain only as a dependency.
            records.append({"index": index, "origin": origin, "status": "PINNED_Q1"})
            continue
        else:
            assert kxu == 0 and kcommon == 0
        main = sp.together(
            nonhigh + A * star3 + deletion * choose(du, 3)
            + crv * star3_v + 3 * lam * r4_floor
        )
        ev1 = sp.together(
            nonhigh + A * star3 + deletion * choose(du, 3)
            + 3 * lam * r4_floor
        )
        records.append({
            "index": index, "origin": origin, "exact": exact,
            "main": main, "ev1": ev1,
            "high": {"A": A, "deletion": deletion, "rv": crv, "lambda": lam},
        })
    return symbols, records


def certificate(name, expression, variables, cube_count):
    numerator, denominator = sp.fraction(sp.together(expression))
    # SymPy may choose the negative of the natural denominator after
    # cancellation.  Every analytic denominator here is a product of
    # e-1>0 and ev-1>0; orient it by its lower cube/t value.
    origin = denominator.subs({variable: 0 for variable in variables})
    assert origin != 0
    if origin < 0:
        numerator, denominator = -numerator, -denominator
    polynomial = sp.Poly(numerator, *variables)
    degrees, rows = tensor_bernstein_sparse(polynomial, cube_count)
    values = [sp.cancel(value) for row in rows for value in row.values()]
    negative = [(i, key, value) for i, row in enumerate(rows) for key, value in row.items() if value < 0]
    record = {
        "name": name,
        "denominator": str(sp.factor(denominator)),
        "power_terms": len(polynomial.terms()),
        "power_hash": polynomial_hash(polynomial),
        "cube_degrees": degrees,
        "rows": len(rows),
        "coefficients": len(values),
        "negative": len(negative),
        "minimum": str(min(values)),
        "coefficient_hash": coefficient_rows_hash(rows),
    }
    print("CONE", json.dumps(record, sort_keys=True), flush=True)
    if negative:
        raise AssertionError((name, negative[:3]))
    return record


def ev0_expression(base, row):
    n, e = sp.symbols("n e", nonnegative=True)
    isolates = n - e - 1
    A = tuple(choose(n - 1, rank) + (choose(isolates, rank - 1) if rank else 0) for rank in range(6))
    C = tuple(choose(n - 2, rank) + (choose(isolates, rank - 1) if rank else 0) for rank in range(6))
    B = tuple(choose(n - 1, rank) for rank in range(6))
    D = tuple(choose(n - 2, rank) for rank in range(6))
    substitution = {
        symbol: value
        for symbolic, actual in zip(base, (A, B, C, D))
        for symbol, value in zip(symbolic[1:], actual[1:])
    }
    return n, e, sp.factor(row.subs(substitution))


def main():
    base, unique, total = collect_rows()
    symbols, lowers = lower_rows(base, unique)
    n, e, du, dv, adjacent, common, re, ru, rv, q35, r4, xu, xv, wedges = symbols
    t, E, Y, X, V, Z = sp.symbols("t E Y X V Z", nonnegative=True)
    nn = 13 + t
    ev = 2 + (nn - 4) * E
    y = (nn - 2 - ev) * Y
    x = ev * X
    ee, duu, dvv = 1 + ev + y, 1 + x, 1 + y
    xvv = ev * V
    ww = choose(dvv, 2) + xvv + choose(ev, 2) * Z
    row_start = int(os.environ.get("ROW_START", "0"))
    row_limit = int(os.environ.get("ROW_LIMIT", "45"))
    all_records = []
    for item in lowers[row_start:row_limit]:
        index = item["index"]
        if item.get("status") == "PINNED_Q1":
            all_records.append(item)
            continue
        for av in (0, 1):
            # If r,v are nonadjacent, the neighbour of v on their path has
            # another incident path edge, hence xv>=1.  If they are adjacent,
            # only the general bound 0<=xv<=ev is available.
            branch_xv = (1 + (ev - 1) * V) if av == 0 else xvv
            expression = item["main"].subs({
                n: nn, e: ee, du: duu, dv: dvv, adjacent: av,
                xv: branch_xv,
                wedges: choose(dvv, 2) + branch_xv + choose(ev, 2) * Z,
            })
            all_records.append(certificate(
                f"row_{index}_ev_ge_2_adj_{av}", expression,
                (t, E, Y, X, V, Z), 5,
            ))

        # ev=1: exactly (adjacency,du-1)=(0,0),(1,0),(1,1).
        y1 = (nn - 3) * Y
        e1, dv1 = 2 + y1, 1 + y1
        for av, xx in ((0, 0), (1, 0), (1, 1)):
            branch_xv = 1 if (av == 0 or xx == 1) else V
            expression = item["ev1"].subs({
                n: nn, e: e1, du: 1 + xx, dv: dv1, adjacent: av,
                xv: branch_xv, wedges: choose(dv1, 2) + branch_xv,
            })
            all_records.append(certificate(
                f"row_{index}_ev_1_adj_{av}_x_{xx}", expression,
                (t, Y, V), 2,
            ))

        original_row = list(unique)[index]
        n0, e0, expression0 = ev0_expression(base, original_row)
        ee0 = 1 + (nn - 2) * E
        all_records.append(certificate(
            f"row_{index}_ev_0", expression0.subs({n0: nn, e0: ee0}),
            (t, E), 1,
        ))
    print("DONE", len(all_records), hashlib.sha256(
        "\n".join(json.dumps(record, sort_keys=True, default=str) for record in all_records).encode()
    ).hexdigest().upper())


if __name__ == "__main__":
    main()
