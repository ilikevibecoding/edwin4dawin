#!/usr/bin/env python3
"""Fail-closed exact Bernstein probe for the mask-3 middle tail."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx

import probe_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent as generic
from analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent import base_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_quantitative_gap_tail_probe_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def build_cleared_box():
    base = base_polynomial()
    ring = fmpz_mpoly_ctx.get(["N", "r", "X", "V", "T"])
    N, r, X, V, T = ring.gens()
    m = N - r
    selected = N**2 - 15 * N + 10
    xden = (N - 5) * selected
    xnum = 6 * selected + 60 * (N - 1) * X
    n6 = ring.constant(1)
    for offset in range(6):
        n6 *= N - offset
    gap120 = ring.constant(0)
    for j in range(5):
        term = ring.constant(math.comb(5, j))
        for offset in range(j):
            term *= m - j + 1 - offset
        for offset in range(5 - j):
            term *= r - j - offset
        gap120 += term
    yden = xden * n6
    ynum = xnum * n6 - 6 * gap120 * xden
    fselected = m**2 - 15 * m + 10
    tden = (m - 5) * fselected
    tnum = 6 * fselected + 60 * (m - 1) * T
    znum = ynum * tden
    zden = yden * tnum
    maxima = tuple(max(monomial[index] for monomial, _ in base.terms()) for index in range(1, 4))
    assert maxima == (4, 3, 4)
    cleared = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (4 - xp)
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        term *= (znum * V) ** zp * zden ** (4 - zp)
        cleared += term
    return cleared


def main() -> None:
    cleared = build_cleared_box()
    ring, power = generic.split_power(cleared)
    degrees, lcms, controls = generic.bernstein_blocks(ring, power)
    open_controls = []
    for index, polynomial in sorted(controls.items()):
        translated = generic.translated_row(polynomial, ring)
        if not (translated["large_a_pass"] and all(row["pass"] for row in translated["strips"])):
            open_controls.append({"index": list(index), "translated_cones": translated})
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-quantitative-gap-tail-probe-v1",
        "status": (
            "PASS_EXACT_BERNSTEIN_METHOD_MASK3_MIDDLE_TAIL"
            if not open_controls else "OPEN_EXACT_BERNSTEIN_METHOD_MASK3_MIDDLE_TAIL_NO_SIGN_CLAIM"
        ),
        "scope": "N>=40,r>=10,m=N-r>=16; mask3 Q7-upper c8/Q6-upper d7",
        "box": [
            "6/(N-5)<=x<=6N/(N^2-15N+10)",
            "0<=y<=x-G/binom(N,6)",
            "6/(m-5)<=f5/f6<=6m/(m^2-15m+10)",
            "z=y/(f5/f6)",
        ],
        "power_terms": len(cleared.to_dict()),
        "power_blocks": len(power),
        "box_degrees": [int(value) for value in degrees],
        "bernstein_lcms": lcms,
        "bernstein_controls": len(controls),
        "sparse_sha256": {
            "cleared_power_polynomial": generic.sparse_sha256([("cleared", cleared)]),
            "power_coefficient_blocks": generic.sparse_sha256(sorted(power.items())),
            "bernstein_coefficient_blocks": generic.sparse_sha256(sorted(controls.items())),
        },
        "open_controls": len(open_controls),
        "open_control_details": open_controls,
        "tail_partition": "r=10+a,m=16+b; a>=14 cone plus fixed a=0..13 strips",
        "source_sha256": {
            "analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent.py": sha256(
                HERE / "analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent.py"
            ),
            "probe_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent.py": sha256(
                HERE / "probe_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent.py"
            ),
        },
        "proof_boundary": (
            "Only PASS plus independent replay credits this tail. OPEN controls "
            "are method obstructions only. All other pieces, corner composition, "
            "other roots/ranks, Q8, and Problem 993 remain open."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("DEGREES", payload["box_degrees"])
    print("CONTROLS", len(controls), "OPEN", len(open_controls))
    if open_controls:
        print("OPEN_INDICES", [row["index"] for row in open_controls])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
