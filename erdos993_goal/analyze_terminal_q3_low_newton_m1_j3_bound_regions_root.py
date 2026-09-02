#!/usr/bin/env python3
"""Count active proof-bound faces for the tree j=3,m=1 reduction."""

from __future__ import annotations

from collections import Counter

import numpy as np

import scan_terminal_q3_low_newton_m1_root_partition_fast_agent as base


def main() -> None:
    yfaces = Counter()
    tfaces = Counter()
    ufaces = Counter()
    joint = Counter()
    cells = 0
    for N in range(15, 61):
        for d in range(1, N + 1):
            S = N - d
            rbase = [0] if S == 0 else range(1, S + 1)
            for rv in rbase:
                lo = int(base.c2(d - 1))
                hi = int(lo + base.c2(rv) + base.c2(S - rv))
                for b2 in range(lo, hi + 1):
                    R = float(rv)
                    B2 = float(b2)
                    W = N - 1 + B2
                    a = base.c2(N) - S
                    P = W - base.c2(d) - R
                    z2 = S * (N - 2) - 2 * P
                    h2 = base.c2(S) - (S - R)
                    b = base.c3(N) - S * (N - 2) + P
                    ycandidates = {
                        "one": 1.0,
                        "component": S / d,
                        "reserve": (8 * h2 + 2 * a - z2) / (6 * a),
                        "hbin": base.c3(S) / b if b else 0.0,
                    }
                    yname = min(ycandidates, key=ycandidates.get)
                    ycap = max(0.0, ycandidates[yname])

                    b3max = base.c3(d - 1) + base.c3(R) + base.c3(S - R)
                    L = B2 - base.c2(d - 1)
                    tcandidates = {
                        "zagreb": (N - 3) * B2 / 3,
                        "adjacency": b3max + (d - 1) * R
                            + max(R, S - R) * (S - R) - (N - 2),
                        "low_surplus": base.c3(d - 1) + (d - 2) * (R - 1)
                            + 3 * L + 4 * (S - 2) * L / 3,
                    }
                    tname = min(tcandidates, key=tcandidates.get)

                    f4floor = (
                        base.c3(N) * (N - 3) / 4
                        - S * base.c2(N - 2) + P * (N - 4)
                        + base.c2(S) - base.c3(S)
                    )
                    for ylabel, y in (("y0", 0.0), ("ycap", ycap)):
                        ucandidates = {
                            "coupled": (N - 3 + 2 * y) / 4 + 3 * y / (N - 3),
                            "component": (d + 1) / 4 + y + 3 * y / (N - 3),
                            "rank4": f4floor / b + 1 + y + h2 / b,
                        }
                        uname = max(ucandidates, key=ucandidates.get)
                        ufaces[(ylabel, uname)] += 1
                    yfaces[yname] += 1
                    tfaces[tname] += 1
                    joint[(yname, tname)] += 1
                    cells += 1
    print("cells", cells)
    print("yfaces", yfaces)
    print("tfaces", tfaces)
    print("ufaces", ufaces)
    print("joint", joint)


if __name__ == "__main__":
    main()
