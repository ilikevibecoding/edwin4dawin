#!/usr/bin/env python3
"""Exact refined boxes for the 13 coarse-open finite mask-3 middle cells."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

from flint import fmpz_mpoly_ctx

from analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent import base_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_13_middle_residual_exact_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_n26_39_middle_agent.py": "91F3D2FBD65BE77119A9513A2A3BE8D95F1277683FD49F60BCE7E27E7FB70F5B",
    "rank8_delta0_new_leaf_mask3_n26_39_middle_exact_agent_20260823.json": "2919A6986E0AF16466EEF5CE89783D6676B27B0316066C821BFFE944647F9DC9",
    "rank8_forest16_f5_f6_ratio_exact_agent_20260823.json": "91E071946534CA6AF36ED4F121639F895F2A9E3F3D405E048EB64858D692D196",
    "rank8_forest16_f5_f6_ratio_independent_audit_agent_20260823.json": "5BA9C59574724EDE6DE9954DF675BD8F4EB23404A6E3CA884B14F457260884FA",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def gap(N: int, r: int) -> int:
    m = N - r
    return sum(choose(m - j + 1, j) * choose(r - j, 5 - j) for j in range(5))


def clear_cell(base, N: int, r: int, sharpen16: bool):
    m = N - r
    ring = fmpz_mpoly_ctx.get(["X", "V", "T"])
    X, V, T = ring.gens()
    selected = N * N - 15 * N + 10
    xden, xnum = (N - 5) * selected, 6 * selected + 60 * (N - 1) * X
    cap = choose(N - 1, 6) + choose(r - 1, 5)
    yden, ynum = xden * cap, xnum * cap - gap(N, r) * xden
    t0 = Fraction(6, m - 5)
    selected_t1 = Fraction(6 * m, m * m - 15 * m + 10)
    t1 = min(selected_t1, Fraction(12, 7)) if sharpen16 else selected_t1
    assert t0 <= t1
    tden = math.lcm(t0.denominator, t1.denominator)
    lo = t0.numerator * (tden // t0.denominator)
    hi = t1.numerator * (tden // t1.denominator)
    tnum = lo + (hi - lo) * T
    znum, zden = ynum * tden, yden * tnum
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (4 - xp)
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    return answer, {"gap": gap(N, r), "d6_edge_concentration_upper": cap, "t_lower": str(t0), "t_upper": str(t1), "forest16_ratio_used": sharpen16}


def sign(cleared):
    power = cleared.to_dict()
    degrees = tuple(max(index[axis] for index in power) for axis in range(3))
    scales = [math.lcm(*(math.comb(degree, e) for e in range(degree + 1))) for degree in degrees]
    blocks = {}
    for target in itertools.product(*(range(degree + 1) for degree in degrees)):
        total = 0
        for source, coefficient in power.items():
            if all(a <= b for a, b in zip(source, target)):
                total += int(coefficient) * math.prod(math.comb(b, a) * scale // math.comb(degree, a) for a, b, degree, scale in zip(source, target, degrees, scales))
        blocks[target] = total
    negative = [list(index) for index, value in sorted(blocks.items()) if value < 0]
    return {"degrees": [int(value) for value in degrees], "blocks": len(blocks), "negative": len(negative), "zero": sum(value == 0 for value in blocks.values()), "positive": sum(value > 0 for value in blocks.values()), "minimum": str(min(blocks.values())), "negative_indices": negative}


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    registry = json.loads((HERE / "rank8_delta0_new_leaf_mask3_n26_39_middle_exact_agent_20260823.json").read_text(encoding="utf-8"))
    cells = [(row["N"], row["r"], row["m"]) for row in registry["open_cells"]]
    assert len(cells) == 13
    base = base_polynomial()
    rows = []
    for N, r, m in cells:
        baseline = sign(clear_cell(base, N, r, False)[0])
        cleared, metadata = clear_cell(base, N, r, m == 16)
        final = sign(cleared)
        rows.append({"N": N, "r": r, "m": m, "status": "SEALED" if final["negative"] == 0 else "OPEN_REFINED_BERNSTEIN_METHOD", "route": "EDGE_CONCENTRATION_PLUS_FOREST16_RATIO" if m == 16 and baseline["negative"] else "EDGE_CONCENTRATION_D6_ONLY", "baseline": baseline, "final": final, "metadata": metadata})
    open_cells = [(row["N"], row["r"], row["m"]) for row in rows if row["status"] != "SEALED"]
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-13-middle-residual-v1",
        "status": "PASS_EXACT_DELTA0_NEW_LEAF_MASK3_ALL_13_MIDDLE_RESIDUAL" if not open_cells else "PASS_EXACT_PARTIAL_MASK3_13_MIDDLE_RESIDUAL_WITH_OPEN",
        "scope": "The 13 coarse-open finite middle cells for mask3.",
        "rows": rows, "open_cells": [list(cell) for cell in open_cells],
        "counts": {"total": len(rows), "sealed": len(rows)-len(open_cells), "open": len(open_cells)},
        "hashes": hashes,
        "proof_boundary": "Only final zero-negative rows plus independent replay receive credit; this is not yet a complete mask3 theorem.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TOTAL", len(rows), "SEALED", len(rows)-len(open_cells), "OPEN", len(open_cells))
    if open_cells:
        print("OPEN_CELLS", open_cells)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
