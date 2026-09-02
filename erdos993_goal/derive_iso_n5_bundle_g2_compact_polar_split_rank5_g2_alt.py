#!/usr/bin/env python3
"""Exact compact polar/reserve split of the rank-five bundle coefficient g2.

For a support cell write H=C+xD and h_M=(1+x)^M-1.  The all-at-once
common-factor identity splits the bundle payment into a polarization of H
with h_M C, a P_M-weighted nested kernel of C, and a J_M-weighted
derivative-free curvature of C.  This source independently reconstructs the
second Newton coefficient and proves the corresponding three-piece identity.

The identity is a reduction only.  The polar term can be negative, and this
file does not assert the coupled inequality needed to prove g2>=0.
"""

from __future__ import annotations

import hashlib
import json
from math import comb, factorial
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_bundle_g2_compact_polar_split_exact_rank5_g2_alt_20260829.json"
MARKER = "PASS_EXACT_ISO_N5_BUNDLE_G2_COMPACT_POLAR_SPLIT_RANK5_G2_ALT"


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def nested(rows, rank):
    e, u, v, w = rows
    r = rank
    return sp.expand(
        2 * r * at(e, r) * at(w, r - 2)
        - (r + 1) * at(e, r + 1) * at(w, r - 3)
        + at(e, r - 1) * (2 * at(w, r - 3) - (r + 1) * at(w, r - 1))
        + at(u, r) * (-(r + 1) * at(v, r - 2) - at(w, r - 3))
        + at(u, r - 1) * (2 * r * at(v, r - 1) + 2 * at(w, r - 2))
        + at(u, r - 2) * (-(r + 1) * at(v, r) + 2 * at(v, r - 2) - at(w, r - 1))
        - at(v, r) * at(w, r - 3)
        + 2 * at(v, r - 1) * at(w, r - 2)
        - at(v, r - 2) * at(w, r - 1)
    )


def kernel2(row, a, b):
    return sp.expand(
        2 * at(row, a - 1) * at(row, b - 1)
        + (a + b) * at(row, a) * at(row, b)
        - (b + 1) * at(row, a - 1) * at(row, b + 1)
        - (a + 1) * at(row, a + 1) * at(row, b - 1)
    )


def add_rows(left, right):
    return tuple(tuple(sp.expand(a + b) for a, b in zip(x, y)) for x, y in zip(left, right))


def shift_row(row, amount):
    return tuple(at(row, rank - amount) for rank in range(len(row)))


def shift_rows(rows, amount):
    return tuple(shift_row(row, amount) for row in rows)


def leaf2(a, c, i, j):
    shifted = (sp.Integer(0), *c[:-1])
    return sp.expand(
        kernel2(tuple(x + y for x, y in zip(a, shifted)), i, j)
        - kernel2(a, i, j)
        - kernel2(c, i - 1, j - 1)
    )


def nested2(rows, a, b):
    e, u, v, w = rows
    shifted_u = (sp.Integer(0), *u[:-1])
    return sp.expand(
        leaf2(tuple(x + y for x, y in zip(e, shifted_u)), tuple(x + y for x, y in zip(v, (sp.Integer(0), *w[:-1]))), a, b)
        - leaf2(e, v, a, b)
        - leaf2(u, w, a - 1, b - 1)
    )


def binomial_polynomial(value, rank):
    if rank < 0:
        return sp.Integer(0)
    return sp.expand(sp.prod(value - offset for offset in range(rank)) / sp.Integer(factorial(rank)))


def add_isolates(rows, amount, maximum):
    return tuple(
        tuple(
            sp.expand(sum(binomial_polynomial(amount, j) * at(row, rank - j) for j in range(rank + 1)))
            for rank in range(maximum + 1)
        )
        for row in rows
    )


def add_xd(crows, drows):
    return tuple(
        tuple(sp.expand(at(crow, rank) + at(drow, rank - 1)) for rank in range(len(crow)))
        for crow, drow in zip(crows, drows)
    )


def raw_g2(crows, drows):
    base = add_xd(crows, drows)
    gamma = []
    for amount in range(3):
        total = add_xd(add_isolates(crows, amount, 6), drows)
        lower = sum(nested(add_isolates(crows, t, 5), 4) for t in range(amount))
        gamma.append(sp.expand(nested(total, 5) - nested(base, 5) - lower))
    assert gamma[0] == 0
    return sp.expand(gamma[2] - 2 * gamma[1])


def p_coefficient(number, i, j):
    if i == 0 or j == 0:
        return 0
    return comb(number, i) * comb(number, j) - sum(
        comb(t, i - 1) * comb(t, j - 1) for t in range(number)
    )


def j_coefficient(number, i, j):
    subtracted = (
        sum(t * comb(t - 1, i - 1) * comb(t - 1, j - 1) for t in range(1, number))
        if i >= 1 and j >= 1 else 0
    )
    return number * (
        comb(number - 1, i) * comb(number - 1, j)
        + comb(number - 1, i + j + 1)
    ) - subtracted


def defect_r(rows, a, b):
    e, u, v, w = rows
    return sp.expand(
        at(w, a - 2) * at(e, b)
        + at(e, a) * at(w, b - 2)
        + at(v, a - 1) * at(u, b - 1)
        + at(u, a - 1) * at(v, b - 1)
    )


def weighted_r(rows, kernel, a, b):
    return sp.expand(sum(value * defect_r(rows, a - i, b - j) for (i, j), value in kernel.items()))


def expression_record(expression):
    variables = tuple(sorted(expression.free_symbols, key=str))
    polynomial = sp.Poly(sp.expand(expression), *variables)
    return {
        "expanded_term_count": len(polynomial.terms()),
        "negative_scalar_coefficient_count": sum(c.is_negative is True for c in polynomial.coeffs()),
        "factored_expression_sha256": hashlib.sha256(str(sp.factor(expression)).encode()).hexdigest().upper(),
    }


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest().upper()


def main():
    crows = tuple(tuple(sp.symbols(f"c{name}0:7")) for name in "EUVW")
    drows = tuple(tuple(sp.symbols(f"d{name}0:7")) for name in "EUVW")
    g2 = raw_g2(crows, drows)
    assert len(sp.Poly(g2, *sorted(g2.free_symbols, key=str)).terms()) == 70

    hrows = add_xd(crows, drows)
    x2c = shift_rows(crows, 2)
    polar = sp.expand(nested(add_rows(hrows, x2c), 5) - nested(hrows, 5) - nested(x2c, 5))

    p_kernel = {
        (i, j): p_coefficient(2, i, j) - 2 * p_coefficient(1, i, j)
        for i in range(3) for j in range(3)
    }
    p_kernel = {key: value for key, value in p_kernel.items() if value}
    assert p_kernel == {(1, 1): 2, (1, 2): 1, (2, 1): 1}
    pn = sp.expand(nested2(crows, 4, 4) + nested2(crows, 4, 3))

    j_kernel = {
        (i, j): j_coefficient(2, i, j) - 2 * j_coefficient(1, i, j)
        for i in range(3) for j in range(3)
    }
    j_kernel = {key: value for key, value in j_kernel.items() if value}
    assert j_kernel == {(0, 0): 2, (0, 1): 2, (1, 0): 2, (1, 1): 1}
    curvature = sp.expand(weighted_r(crows, j_kernel, 4, 4) - weighted_r(crows, j_kernel, 3, 5))

    assert sp.expand(g2 - polar - pn - curvature) == 0
    assert sp.expand(nested2(crows, 4, 4) - 2 * nested(crows, 4)) == 0

    report = {
        "marker": MARKER,
        "identity": "g2=Polar_N(C+xD,x^2C)+P2*N(C)+J2*R_curvature(C)",
        "raw_g2": expression_record(g2),
        "pieces": {
            "polar": {
                **expression_record(polar),
                "definition": "N5(H+x^2C)-N5(H)-N5(x^2C), H=C+xD",
                "sign_status": "can be negative; no separate sign asserted",
            },
            "P_times_N": {
                **expression_record(pn),
                "kernel": "2*z*w+z^2*w+z*w^2",
                "diagonal_form": "nested2(C,4,4)+nested2(C,4,3)=2*N4(C)+nested2(C,4,3)",
                "sign_status": "not asserted by this artifact",
            },
            "J_times_R_curvature": {
                **expression_record(curvature),
                "kernel": "2+2*z+2*w+z*w",
                "diagonal_form": "[z^4w^4]J2R(C)-[z^3w^5]J2R(C)",
                "sign_status": "not asserted by this artifact",
            },
        },
        "kernel_replay": {
            "P2_nonzero_coefficients": {f"{i},{j}": value for (i, j), value in p_kernel.items()},
            "J2_nonzero_coefficients": {f"{i},{j}": value for (i, j), value in j_kernel.items()},
        },
        "proof_status": (
            "Exact symbolic reduction. The remaining theorem is the coupled polar-debt inequality "
            "polar+P_times_N+curvature>=0 on every forest-realizable support cell."
        ),
        "scope": (
            "Rank-five whole-bundle coefficient g2 for arbitrary support cells. This is not a sign "
            "proof, not an all-N5 theorem, and not a solution of Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "marker": MARKER,
        "raw_terms": report["raw_g2"]["expanded_term_count"],
        "piece_terms": {name: row["expanded_term_count"] for name, row in report["pieces"].items()},
        "report_sha256": hashlib.sha256(encoded.encode()).hexdigest().upper(),
    }, indent=2, sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
