#!/usr/bin/env python3
"""Exact fixed-complement-order Bernstein partition for mask 1, m<=15."""

from __future__ import annotations

import gc
import hashlib
import itertools
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx

from analyze_rank8_delta0_new_leaf_mask1_selected_boundary_agent import (
    base_polynomial,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask1_m0_15_tail_exact_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def safe_comb(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def gap720(r, m: int, ring):
    total = ring.constant(0)
    for j in range(5):
        paths = safe_comb(m - j + 1, j)
        if not paths:
            continue
        term = ring.constant(720 * paths // math.factorial(5 - j))
        for offset in range(5 - j):
            term *= r - j - offset
        total += term
    return total


def d6_upper720(N, m: int, ring):
    n6 = ring.constant(1)
    n2_4 = ring.constant(1)
    n3_3 = ring.constant(1)
    for offset in range(6):
        n6 *= N - offset
    for offset in range(2, 6):
        n2_4 *= N - offset
    for offset in range(3, 6):
        n3_3 *= N - offset
    return n6 - 30 * m * n2_4 + 120 * safe_comb(m, 2) * n3_3


def build_box(base, m_value: int, positive_f6: bool):
    names = ["N", "X", "V", "T"] if positive_f6 else ["N", "X", "V"]
    ring = fmpz_mpoly_ctx.get(names)
    generators = ring.gens()
    N, X, V = generators[:3]
    T = generators[3] if positive_f6 else None
    r = N - m_value
    selected = N**2 - 15 * N + 10
    xden = (N - 5) * selected
    xnum = 6 * selected + 60 * (N - 1) * X
    d6cap = d6_upper720(N, m_value, ring)
    yden = xden * d6cap
    ynum = xnum * d6cap - gap720(r, m_value, ring) * xden
    if positive_f6:
        tden = ring.constant(m_value - 5)
        tnum = ring.constant(6) + (
            safe_comb(m_value, 5) * (m_value - 5) - 6
        ) * T
        znum = ynum * tden
        zden = yden * tnum
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        if not positive_f6 and zp:
            continue
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (1 - xp)
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        if positive_f6:
            term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    return answer


def split_power(cleared):
    ring = fmpz_mpoly_ctx.get(["N"])
    grouped = {}
    for monomial, coefficient in cleared.to_dict().items():
        np, *box = monomial
        grouped.setdefault(tuple(box), {})[(np,)] = int(coefficient)
    return ring, {key: ring.from_dict(value) for key, value in grouped.items()}


def bernstein(ring, power):
    axes = len(next(iter(power)))
    degrees = tuple(max(index[axis] for index in power) for axis in range(axes))
    lcms = []
    for degree in degrees:
        lcms.append(
            math.lcm(*(math.comb(degree, exponent) for exponent in range(degree + 1)))
        )
    answer = {}
    for target in itertools.product(*(range(degree + 1) for degree in degrees)):
        total = ring.constant(0)
        for source, coefficient in power.items():
            if any(a > b for a, b in zip(source, target)):
                continue
            weight = math.prod(
                math.comb(b, a) * lcm // math.comb(degree, a)
                for a, b, degree, lcm in zip(source, target, degrees, lcms)
            )
            total += coefficient * weight
        answer[target] = total
    return degrees, answer


def sparse_sha256(polynomials) -> str:
    digest = hashlib.sha256()
    for label, polynomial in polynomials:
        digest.update(str(label).encode())
        digest.update(b"\0")
        for monomial, coefficient in sorted(polynomial.to_dict().items()):
            digest.update(",".join(str(int(value)) for value in monomial).encode())
            digest.update(b":")
            digest.update(str(int(coefficient)).encode())
            digest.update(b";")
        digest.update(b"\n")
    return digest.hexdigest().upper()


def branch(base, m: int, positive_f6: bool):
    cleared = build_box(base, m, positive_f6)
    ring, power = split_power(cleared)
    degrees, controls = bernstein(ring, power)
    N = ring.gen(0)
    tail_start = None
    tail_minimum = None
    for candidate in range(40, 161):
        rows = []
        for polynomial in controls.values():
            values = [
                int(value)
                for value in polynomial.compose(candidate + N).to_dict().values()
            ]
            rows.append(values)
        if all(values and all(value >= 0 for value in values) for values in rows):
            tail_start = candidate
            tail_minimum = min(min(values) for values in rows)
            break
    finite = []
    if tail_start is not None:
        for n_value in range(40, tail_start):
            negative = [
                list(index)
                for index, polynomial in sorted(controls.items())
                if int(polynomial(n_value)) < 0
            ]
            finite.append(
                {
                    "N": n_value,
                    "status": "SEALED" if not negative else "OPEN_BERNSTEIN_METHOD",
                    "negative_indices": negative,
                }
            )
    return {
        "branch": "f6_positive" if positive_f6 else "f6_zero",
        "degrees": [int(value) for value in degrees],
        "controls": len(controls),
        "tail_start": tail_start,
        "tail_minimum_translated_coefficient": (
            str(tail_minimum) if tail_minimum is not None else None
        ),
        "finite_below_tail": finite,
        "open_finite": [row["N"] for row in finite if row["status"] != "SEALED"],
        "bernstein_sha256": sparse_sha256(sorted(controls.items())),
    }


def main() -> None:
    base = base_polynomial()
    rows = []
    for m in range(16):
        branches = [branch(base, m, False)]
        if m >= 6:
            branches.append(branch(base, m, True))
        rows.append({"m": m, "branches": branches})
        gc.collect()
    open_cells = [
        {"m": row["m"], "branch": branch_row["branch"], "N": n}
        for row in rows
        for branch_row in row["branches"]
        for n in branch_row["open_finite"]
    ]
    missing_tails = [
        {"m": row["m"], "branch": branch_row["branch"]}
        for row in rows
        for branch_row in row["branches"]
        if branch_row["tail_start"] is None
    ]
    complete = not open_cells and not missing_tails
    payload = {
        "schema": "rank8-delta0-new-leaf-mask1-m0-15-tail-v1",
        "status": (
            "PASS_EXACT_DELTA0_NEW_LEAF_MASK1_M0_15_COMPLETE"
            if complete
            else "PASS_EXACT_PARTIAL_MASK1_M0_15_WITH_OPEN_NO_FULL_CREDIT"
        ),
        "scope": "N>=40,0<=m<=15,r=N-m; mask1 selected-lower d7/Q7-upper c8",
        "inputs": [
            "d5-f5>=G",
            "d6<=C(N,6)-m C(N-2,4)+C(m,2) C(N-3,3)",
            "f6=0 branch sets z=0",
            "f6>0 branch uses 6/(m-5)<=f5/f6<=C(m,5)",
        ],
        "rows": rows,
        "open_cells": open_cells,
        "missing_tails": missing_tails,
        "source_sha256": {
            "analyze_rank8_delta0_new_leaf_mask1_selected_boundary_agent.py": sha256(
                HERE / "analyze_rank8_delta0_new_leaf_mask1_selected_boundary_agent.py"
            )
        },
        "proof_boundary": (
            "Only explicit SEALED finite rows and translated tails receive "
            "producer credit; a complete claim requires no listed open/missing "
            "cell and an independent literal audit. Finite N=26..39, masks2/3, "
            "other roots/ranks, arbitrary-leaf induction, and Problem 993 remain open."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("OPEN", len(open_cells), "MISSING_TAILS", len(missing_tails))
    if open_cells:
        print("OPEN_CELLS", open_cells)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
