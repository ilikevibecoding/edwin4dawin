#!/usr/bin/env python3
"""Exact fixed-m Bernstein partition for mask 0 and 0<=m<=15.

For this small-complement tail, a two-term Bonferroni bound on ``d6``
supplies the finite reserve missed by the crude ``d6<=C(N,6)`` bound.
"""

from __future__ import annotations

import gc
import hashlib
import itertools
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx

from analyze_rank8_delta0_new_leaf_joint_selected_boundary_bounded_agent import (
    base_polynomial,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask0_m0_15_tail_exact_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def safe_comb(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def gap_numerator_720(r, m: int, ring):
    # 720*G, where G=sum path_j(m)*C(r-j,5-j).
    total = ring.constant(0)
    for j in range(5):
        path_count = safe_comb(m - j + 1, j)
        if not path_count:
            continue
        term = ring.constant(720 * path_count // math.factorial(5 - j))
        for offset in range(5 - j):
            term *= r - j - offset
        total += term
    return total


def d6_bonferroni_numerator_720(N, m: int, ring):
    """Return 720 times the two-term Bonferroni upper bound on d6.

    The forest D has N vertices and exactly m edges.  A six-set containing a
    fixed edge has C(N-2,4) extensions.  For a pair of distinct edges, the
    common extensions are at most C(N-3,3), since their union has at least
    three vertices.  Thus

      d6 <= C(N,6)-m*C(N-2,4)+C(m,2)*C(N-3,3).
    """
    falling_n6 = ring.constant(1)
    for offset in range(6):
        falling_n6 *= N - offset
    falling_n2_4 = ring.constant(1)
    for offset in range(2, 6):
        falling_n2_4 *= N - offset
    falling_n3_3 = ring.constant(1)
    for offset in range(3, 6):
        falling_n3_3 *= N - offset
    return (
        falling_n6
        - ring.constant(30 * m) * falling_n2_4
        + ring.constant(120 * safe_comb(m, 2)) * falling_n3_3
    )


def build_fixed_m_box(base, m_value: int, positive_f6: bool):
    names = ["N", "X", "V", "T"] if positive_f6 else ["N", "X", "V"]
    ring = fmpz_mpoly_ctx.get(names)
    generators = ring.gens()
    N, X, V = generators[:3]
    T = generators[3] if positive_f6 else None
    r = N - m_value
    dden = N**2 - 15 * N + 10
    xden = (N - 5) * dden
    xnum = 6 * dden + 60 * (N - 1) * X
    d6_upper_720 = d6_bonferroni_numerator_720(N, m_value, ring)
    yden = xden * d6_upper_720
    ynum = (
        xnum * d6_upper_720
        - gap_numerator_720(r, m_value, ring) * xden
    )

    if positive_f6:
        assert m_value >= 6
        tden = ring.constant(m_value - 5)
        tnum = ring.constant(6) + (
            safe_comb(m_value, 5) * (m_value - 5) - 6
        ) * T
        znum = ynum * tden
        zden = yden * tnum

    result = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        if not positive_f6 and zp:
            continue
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (1 - xp)
        term *= (ynum * V) ** yp * yden ** (2 - yp)
        if positive_f6:
            term *= (znum * V) ** zp * zden ** (4 - zp)
        result += term
    return result


def split_box_power(cleared):
    ring_n = fmpz_mpoly_ctx.get(["N"])
    grouped = {}
    for monomial, coefficient in cleared.to_dict().items():
        n_power, *box_power = monomial
        grouped.setdefault(tuple(box_power), {})[(n_power,)] = int(coefficient)
    return ring_n, {key: ring_n.from_dict(value) for key, value in grouped.items()}


def bernstein_blocks(ring, power):
    axes = len(next(iter(power)))
    degrees = tuple(max(index[axis] for index in power) for axis in range(axes))
    lcms = []
    for degree in degrees:
        value = 1
        for exponent in range(degree + 1):
            value = math.lcm(value, math.comb(degree, exponent))
        lcms.append(value)
    out = {}
    for target in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = ring.constant(0)
        for source, coefficient in power.items():
            if any(a > b for a, b in zip(source, target)):
                continue
            weight = 1
            for a, b, degree, lcm in zip(source, target, degrees, lcms):
                weight *= math.comb(b, a) * (lcm // math.comb(degree, a))
            value += coefficient * weight
        out[target] = value
    return degrees, out


def shifted_coefficients_nonnegative(polynomial, start: int):
    ring = polynomial.context()
    N = ring.gen(0)
    translated = polynomial.compose(start + N)
    values = [int(value) for value in translated.to_dict().values()]
    return bool(values) and all(value >= 0 for value in values), min(values), len(values)


def analyze_branch(base, m: int, positive_f6: bool):
    cleared = build_fixed_m_box(base, m, positive_f6)
    ring, power = split_box_power(cleared)
    degrees, bernstein = bernstein_blocks(ring, power)
    tail_start = None
    tail_minimum = None
    tail_terms = 0
    for candidate in range(40, 121):
        results = [shifted_coefficients_nonnegative(poly, candidate) for poly in bernstein.values()]
        if all(result[0] for result in results):
            tail_start = candidate
            tail_minimum = min(result[1] for result in results)
            tail_terms = sum(result[2] for result in results)
            break
    assert tail_start is not None
    finite = []
    for N in range(40, tail_start):
        values = [(index, int(poly(N))) for index, poly in sorted(bernstein.items())]
        negative = [list(index) for index, value in values if value < 0]
        finite.append(
            {
                "N": N,
                "status": "SEALED" if not negative else "OPEN_BERNSTEIN_NEGATIVE",
                "negative_indices": negative,
                "minimum": str(min(value for _, value in values)),
            }
        )
    return {
        "branch": "f6_positive" if positive_f6 else "f6_zero",
        "degrees": [int(value) for value in degrees],
        "bernstein_coefficients": len(bernstein),
        "tail_start": tail_start,
        "tail_minimum_translated_coefficient": str(tail_minimum),
        "tail_translated_terms": tail_terms,
        "finite_below_tail": finite,
        "open_finite": [row["N"] for row in finite if row["status"] != "SEALED"],
    }


def main() -> None:
    base = base_polynomial()
    rows = []
    for m in range(16):
        branches = [analyze_branch(base, m, False)]
        if m >= 6:
            branches.append(analyze_branch(base, m, True))
        rows.append({"m": m, "branches": branches})
        gc.collect()
    open_cells = [
        {"m": row["m"], "branch": branch["branch"], "N": N}
        for row in rows
        for branch in row["branches"]
        for N in branch["open_finite"]
    ]
    payload = {
        "schema": "rank8-delta0-new-leaf-mask0-m0-15-tail-v2",
        "status": (
            "PASS_EXACT_DELTA0_NEW_LEAF_MASK0_M0_15_COMPLETE"
            if not open_cells
            else "PASS_EXACT_PARTIAL_DELTA0_NEW_LEAF_MASK0_M0_15_TAILS_WITH_FINITE_OPEN"
        ),
        "scope": "N>=40, m=|F| in 0..15, r=N-m, selected-lower c8/d7 mask0",
        "finite_order_inputs": [
            "d5-f5>=G with exact fixed-m path lower counts",
            "d6<=C(N,6)-m*C(N-2,4)+C(m,2)*C(N-3,3) by two-term Bonferroni",
            "if f6=0, set z=0",
            "if f6>0, 6/(m-5)<=f5/f6<=binom(m,5)",
        ],
        "rows": rows,
        "open_cells": open_cells,
        "source_sha256": {
            "analyze_rank8_delta0_new_leaf_joint_selected_boundary_bounded_agent.py": sha256(
                HERE / "analyze_rank8_delta0_new_leaf_joint_selected_boundary_bounded_agent.py"
            )
        },
        "proof_boundary": (
            "Only tails and finite rows marked SEALED receive credit.  Any listed "
            "finite open rows, the 19 diagonal cells, masks1..3, q=v, Delta1..3, "
            "connected Q8, and Problem 993 remain open."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("OPEN", len(open_cells), open_cells)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
