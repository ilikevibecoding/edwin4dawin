#!/usr/bin/env python3
"""Independent literal replay of the complete mask-3 fixed-m tail."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from flint import fmpz_mpoly_ctx

from audit_rank8_delta0_new_leaf_mask2_m0_15_tail_agent import (
    blossom, choose, d6cap720, gap720, power_blocks, sparse_sha256,
)
from audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent import literal_base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_m0_15_tail_independent_audit_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_m0_15_tail_agent.py": "7CD1C84B014DA93ED2719C9F33666DCAAC714D44AA4D469AEDC4CC31CE608DD1",
    "rank8_delta0_new_leaf_mask3_m0_15_tail_exact_agent_20260823.json": "93CD5015D81BD1403820FF21FC39CBC209568D26FD62D872B3C376E364C60C73",
    "audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent.py": "A907744740C12E53A07E9710B8E2BBC1DC44B255D4107B5DBEB639FB4F3998A3",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def clear_box(base, m: int, positive: bool):
    ring = fmpz_mpoly_ctx.get(["N", "X", "V", "T"] if positive else ["N", "X", "V"])
    variables = ring.gens()
    N, X, V = variables[:3]
    T = variables[3] if positive else None
    roots = N - m
    selected = N * N - 15 * N + 10
    xden, xnum = (N - 5) * selected, 6 * selected + 60 * (N - 1) * X
    cap = d6cap720(N, m, ring)
    yden, ynum = xden * cap, xnum * cap - gap720(roots, m, ring) * xden
    if positive:
        tden = ring.constant(m - 5)
        tnum = ring.constant(6) + (choose(m, 5) * (m - 5) - 6) * T
        znum, zden = ynum * tden, yden * tnum
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in reversed(base.terms()):
        if not positive and zp:
            continue
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (4 - xp)
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        if positive:
            term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    return answer


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads((HERE / "rank8_delta0_new_leaf_mask3_m0_15_tail_exact_agent_20260823.json").read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK3_M0_15_COMPLETE"
    assert primary["open_cells"] == primary["missing_tails"] == []
    base = literal_base()
    branches, total_controls, minimum = 0, 0, None
    for row in primary["rows"]:
        expected = {item["branch"]: item for item in row["branches"]}
        for positive in [False] + ([True] if row["m"] >= 6 else []):
            label = "f6_positive" if positive else "f6_zero"
            ring, power = power_blocks(clear_box(base, row["m"], positive))
            degrees, controls = blossom(ring, power)
            branch = expected[label]
            assert [int(value) for value in degrees] == branch["degrees"]
            assert len(controls) == branch["controls"]
            assert sparse_sha256(sorted(controls.items())) == branch["bernstein_sha256"]
            N = ring.gen(0)
            values = []
            for polynomial in controls.values():
                coefficients = [int(value) for value in polynomial.compose(40 + N).to_dict().values()]
                assert coefficients and all(value >= 0 for value in coefficients)
                values.extend(coefficients)
            assert branch["tail_start"] == 40 and branch["finite_below_tail"] == branch["open_finite"] == []
            assert str(min(values)) == branch["tail_minimum_translated_coefficient"]
            minimum = min(values) if minimum is None else min(minimum, min(values))
            branches += 1
            total_controls += len(controls)
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-m0-15-tail-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK3_M0_15_COMPLETE",
        "scope": primary["scope"], "hashes": actual, "literal_base_terms": len(base.terms()),
        "fixed_m_rows": len(primary["rows"]), "branches": branches, "bernstein_controls": total_controls,
        "minimum_translated_power_coefficient": str(minimum), "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("ROWS", len(primary["rows"]), "BRANCHES", branches, "CONTROLS", total_controls)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
