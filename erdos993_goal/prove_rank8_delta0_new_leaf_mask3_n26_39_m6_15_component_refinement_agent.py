#!/usr/bin/env python3
"""Component refinement of open finite mask-3 small-m branches for m>=6."""

from __future__ import annotations

import hashlib
import json
import math
from fractions import Fraction
from pathlib import Path

from flint import fmpz_mpoly_ctx

import prove_rank8_delta0_new_leaf_mask1_n26_39_m0_15_agent as generic
from analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent import base_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_m6_15_component_refinement_exact_agent_20260823.json"
CATALOG = HERE / "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_n26_39_m0_15_agent.py": "111DFEEC2DCEC290A2AD876170AE083835D88E2B1E2834EC1F80DBE18467C475",
    "rank8_delta0_new_leaf_mask3_n26_39_m0_15_exact_agent_20260823.json": "1F771FEB9338055E961045A8C557C184E92FBED45BBA02C5A6CFDC5377CC212D",
    "rank8_forest6_15_component_jet_bounds_exact_agent_20260823.json": "5416988DAB946AF2A9F0A24B41096AC4D0B6D8D508780D3098AA673E7BAF61A1",
    "rank8_forest6_15_component_jet_bounds_independent_audit_agent_20260823.json": "0F3967E97751D44F42E854FA71D4F29B4F8E7BFDADDC95EE44D6B28E3472683E",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def common_xy(N: int, r: int, components: int, minima: list[int], ring):
    X, V = ring.gens()[:2]
    selected = N * N - 15 * N + 10
    xden = (N - 5) * selected
    xnum = 6 * selected + 60 * (N - 1) * X
    cap = generic.choose(N - 1, 6) + generic.choose(r - 1, 5)
    gap = generic.gap(r, minima, components)
    yden = xden * cap
    ynum = xnum * cap - gap * xden
    return V, xnum, xden, ynum, yden, gap, cap


def clear_zero(base, N: int, r: int, components: int, minima: list[int]):
    ring = fmpz_mpoly_ctx.get(["X", "V"])
    V, xnum, xden, ynum, yden, gap, cap = common_xy(N, r, components, minima, ring)
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        if zp:
            continue
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (4 - xp)
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        answer += term
    return answer, {"gap": gap, "d6_upper": cap}


def clear_positive(base, N: int, r: int, components: int, minima: list[int], t1: Fraction):
    m = N - r
    ring = fmpz_mpoly_ctx.get(["X", "V", "T"])
    _, V, T = ring.gens()
    _, xnum, xden, ynum, yden, gap, cap = common_xy(N, r, components, minima, ring)
    t0 = Fraction(6, m - 5)
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
    return answer, {"gap": gap, "d6_upper": cap, "t_lower": str(t0), "t_upper": str(t1)}


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    prior = json.loads((HERE / "rank8_delta0_new_leaf_mask3_n26_39_m0_15_exact_agent_20260823.json").read_text(encoding="utf-8"))
    targets = [(row[0], row[1], row[2]) for row in prior["open_subboxes"] if row[1] >= 6]
    assert len(targets) == len(set(targets))
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    component_rows = {(row["order"], row["components"]): row for row in catalog["component_rows"]}
    base = base_polynomial()
    rows = []
    residual = []
    subboxes = 0
    for N, m, branch in targets:
        r = N - m
        current = []
        for components in range(1, m + 1):
            item = component_rows[(m, components)][branch]
            if not item["jet_count"]:
                continue
            if branch == "f6_zero":
                cleared, metadata = clear_zero(base, N, r, components, item["minimum_f0_to_f4"])
            else:
                cleared, metadata = clear_positive(base, N, r, components, item["minimum_f0_to_f4"], generic.fraction(item["maximum_f5_over_f6"]))
            sign = generic.sign(cleared)
            current.append({"components": components, "status": "SEALED" if sign["negative"] == 0 else "OPEN_COMPONENT_BERNSTEIN_METHOD", "metadata": metadata, "bernstein": sign})
            if sign["negative"]:
                residual.append((N, m, branch, components, sign["negative_indices"]))
            subboxes += 1
        assert current
        rows.append({"N": N, "m": m, "r": r, "branch": branch, "status": "SEALED" if all(row["status"] == "SEALED" for row in current) else "OPEN_COMPONENT_BERNSTEIN_METHOD", "component_subboxes": current})
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-39-m6-15-component-refinement-v1",
        "status": "PASS_EXACT_MASK3_N26_39_M6_15_ALL_OPEN_BRANCHES_COMPONENT_CLOSURE" if not residual else "PASS_EXACT_PARTIAL_MASK3_M6_15_COMPONENT_REFINEMENT_WITH_OPEN",
        "scope": "Exactly the coarse-open finite small-m branches with 6<=m<=15.",
        "rows": rows,
        "residual_subboxes": residual,
        "counts": {"logical_branches": len(rows), "component_subboxes": subboxes, "open_component_subboxes": len(residual)},
        "hashes": hashes,
        "proof_boundary": "Only zero-negative component subboxes plus independent replay receive credit; m<=5 and the complete 224-cell assembler are separate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("BRANCHES", len(rows), "SUBBOXES", subboxes, "OPEN", len(residual))
    if residual:
        print("RESIDUAL", residual)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
