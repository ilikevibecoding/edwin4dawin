#!/usr/bin/env python3
"""Exact fixed-degree Bernstein partition for the mask-3 low-r tail."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from flint import fmpz_mpoly_ctx

import probe_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent as generic
import probe_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent as middle
from analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent import base_polynomial


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_r1_9_tail_exact_agent_20260823.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def zero_gap_box():
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
    yden, ynum = xden * n6, xnum * n6
    fselected = m**2 - 15 * m + 10
    tden = (m - 5) * fselected
    tnum = 6 * fselected + 60 * (m - 1) * T
    znum, zden = ynum * tden, yden * tnum
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (4 - xp)
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    return answer


def rows_for(controls, r_values, route):
    ring = next(iter(controls.values())).context()
    _, B = ring.gens()
    rows = []
    for r_value in r_values:
        open_indices, minimum, terms = [], None, 0
        for index, polynomial in sorted(controls.items()):
            values = [int(value) for value in polynomial.compose(40 + B, ring.constant(r_value)).to_dict().values()]
            terms += len(values)
            if values:
                minimum = min(values) if minimum is None else min(minimum, min(values))
            if not values or any(value < 0 for value in values):
                open_indices.append(list(index))
        rows.append({"r": r_value, "route": route, "status": "SEALED" if not open_indices else "OPEN_BERNSTEIN_METHOD", "controls": len(controls), "translated_terms": terms, "minimum_translated_power_coefficient": str(minimum), "open_indices": open_indices})
    return rows


def main() -> None:
    zero = zero_gap_box()
    zr, zp = generic.split_power(zero)
    zd, _, zc = generic.bernstein_blocks(zr, zp)
    quantitative = middle.build_cleared_box()
    qr, qp = generic.split_power(quantitative)
    qd, _, qc = generic.bernstein_blocks(qr, qp)
    assert zd == qd == (8, 5, 4) and len(zc) == len(qc) == 270
    rows = rows_for(zc, range(1, 5), "zero_gap") + rows_for(qc, range(5, 10), "distinguished_root_gap")
    open_rows = [row for row in rows if row["status"] != "SEALED"]
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-r1-9-tail-v1",
        "status": "PASS_EXACT_DELTA0_NEW_LEAF_MASK3_N40_R1_9_TAIL" if not open_rows else "OPEN_EXACT_BERNSTEIN_METHOD_MASK3_N40_R1_9_TAIL_NO_SIGN_CLAIM",
        "scope": "N>=40,1<=r<=9,m=N-r; mask3 Q7-upper c8/Q6-upper d7",
        "box_degrees": [8, 5, 4],
        "rows": rows,
        "open_rows": open_rows,
        "sparse_sha256": {"zero_gap_bernstein": generic.sparse_sha256(sorted(zc.items())), "quantitative_gap_bernstein": generic.sparse_sha256(sorted(qc.items()))},
        "source_sha256": {
            "analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent.py": sha256(HERE / "analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent.py"),
            "probe_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent.py": sha256(HERE / "probe_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent.py"),
        },
        "proof_boundary": "Only SEALED rows plus independent replay receive credit; other pieces and global theorem remain open.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("ROWS", len(rows), "OPEN", len(open_rows))
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
