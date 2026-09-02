#!/usr/bin/env python3
"""Search-only exact scalar cone for the d=1, j=4 sector.

Uses only the original linear-forest token caps, the retained-Dprev H bound,
and the exact rank-three ceiling for K.  A zero-negative scan is not an
all-order proof; this file is a precursor to a symbolic cone certificate.
"""

from __future__ import annotations

import argparse
from fractions import Fraction
from math import comb

from scan_terminal_q3_low_newton_m0_balanced_all_row_sector_exact_adversary import (
    exact_coefficients,
)
from prove_d1_spider_inductive_lowblock_qgap_mass_floor_adversary import (
    linear_q2,
    linear_q3,
)


def C(n: int, k: int) -> int:
    return comb(n, k) if 0 <= k <= n else 0


def kmin4(T: int, Y: int) -> int:
    if T >= 2 * Y:
        path_vertices = T - 2 * Y + 2
        return sum(
            C(Y - 1, selected) * 2**selected
            * C(path_vertices + 1 - (4 - selected), 4 - selected)
            for selected in range(5)
        )
    short_edges = T - Y
    isolates = 2 * Y - T
    return sum(
        C(short_edges, selected) * 2**selected
        * C(isolates, 4 - selected)
        for selected in range(5)
    )


def cell(S: int, R: int, Y: int) -> tuple[Fraction, dict[str, object]]:
    rank = 4
    T = S - R
    N = S + 1
    B2 = C(R, 2)
    tau = C(R, 3) + (R - 1) * (Y - 1)
    data = exact_coefficients(N, rank, 1, R, T, Y, B2, B2, tau)
    a, P, A0, R0 = (data[name] for name in ("a", "p0", "A0", "R0"))
    c0_numerator = A0 + a * R0
    assert c0_numerator % P == 0
    c0 = c0_numerator // P

    # Use the smaller-forest low-block caps directly.  These remain somewhat
    # weaker than the producer's min(empty-component, low-block) caps, but are
    # sharp in the many-arm tail where the original token cap fails.
    qH = linear_q3(S, R, Y, int(T > Y))
    kmax3 = (
        C(T, 3) - (T - Y) * (T - 2) + (T - Y - 1)
        if T > Y
        else C(Y, 3)
    )
    assert kmax3 >= 0
    if kmax3:
        qK = linear_q2(T, Y, min(Y, T - Y))
        uI = (3 * qK + R) / 4
    else:
        qK = Fraction(0)
        uI = Fraction(0)

    lead = Fraction(5 * A0)
    BH = (
        10 * A0
        + 5 * P * (c0 + R0)
        - 6 * P * (P + a)
        - 12 * P * (P + a) * qH
    )
    BK = (
        5 * A0
        + 5 * P * (c0 + R0)
        - 3 * P * (P + a)
        - 12 * P * (P + a) * uI
    )

    p3, p4, p5 = C(S - 2, 3), C(S - 3, 4), C(S - 4, 5)
    d3 = R * S - 3 * R - S - Y + 4
    d4 = Fraction(
        R * R
        + R * S * S
        - 9 * R * S
        + 17 * R
        - S * S
        - 2 * S * Y
        + 11 * S
        + 10 * Y
        - 28,
        2,
    )
    assert d3 >= 0 and d4 >= 0
    sigma = Fraction(C(S - 6, 3), C(S - 5, 2))
    Hlower = lead * (p3 + p5) + BH * p4 + lead * d3 + (BH + lead * sigma) * d4
    h_graft_common = BH + lead * (S - 8)
    minimum_k4 = kmin4(T, Y)
    lower = Hlower + lead * minimum_k4 + min(Fraction(0), BK) * kmax3
    return lower, {
        "Hlower": Hlower,
        "H_graft_common": h_graft_common,
        "BK": BK,
        "Kmax3": kmax3,
        "Kmin4": minimum_k4,
        "qH": qH,
        "qK": qK,
        "uI": uI,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--s-max", type=int, default=500)
    args = parser.parse_args()
    checks = negatives = 0
    minimum = None
    first_negative = []
    for S in range(14, args.s_max + 1):
        for R in range(1, S):
            T = S - R
            for Y in range(1, min(R, T) + 1):
                lower, details = cell(S, R, Y)
                record = (lower, S, R, T, Y, details)
                minimum = record if minimum is None else min(minimum, record)
                if lower < 0:
                    negatives += 1
                    if len(first_negative) < 20:
                        first_negative.append(record)
                checks += 1
    print("SEARCH_ONLY")
    print("box", {"S": [14, args.s_max], "j": 4})
    print("checks", checks, "negative", negatives)
    print("minimum", minimum)
    print("first_negative", first_negative)


if __name__ == "__main__":
    main()
