#!/usr/bin/env python3
"""Independent literal replay of the mask-3 low-r tail."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from flint import fmpz_mpoly_ctx

from audit_rank8_delta0_new_leaf_mask2_quantitative_gap_tail_agent import blossom, sparse_sha256, split_power
from audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent import independently_clear, literal_base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_r1_9_tail_independent_audit_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_r1_9_tail_agent.py": "59FEA0C649A8793F476E100D72C807901EB03AA829652DAA610E7D1220ABADA5",
    "rank8_delta0_new_leaf_mask3_r1_9_tail_exact_agent_20260823.json": "436C02848EB9824B8FC392CFFE96246EF182F750EADB3E0631822C4F994360A5",
    "audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent.py": "A907744740C12E53A07E9710B8E2BBC1DC44B255D4107B5DBEB639FB4F3998A3",
    "rank8_delta0_new_leaf_mask3_quantitative_gap_tail_independent_audit_agent_20260823.json": "C9354A2F3A9F70E6C72642C17DBF2D9002BC438E05773456B15DCF371430D26B",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def zero_gap(base):
    ring = fmpz_mpoly_ctx.get(["N", "r", "X", "V", "T"])
    N, r, X, V, T = ring.gens()
    m = N - r
    selected = N * N - 15 * N + 10
    xden, xnum = (N - 5) * selected, 6 * selected + 60 * (N - 1) * X
    n6 = ring.constant(1)
    for value in (N, N - 1, N - 2, N - 3, N - 4, N - 5):
        n6 *= value
    yden, ynum = xden * n6, xnum * n6
    fselected = m * m - 15 * m + 10
    tden, tnum = (m - 5) * fselected, 6 * fselected + 60 * (m - 1) * T
    znum, zden = ynum * tden, yden * tnum
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in reversed(base.terms()):
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (4 - xp)
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    return answer


def check(controls, r_values):
    ring = next(iter(controls.values())).context()
    _, B = ring.gens()
    count, minimum = 0, None
    for r_value in r_values:
        for polynomial in controls.values():
            values = [int(value) for value in polynomial.compose(40 + B, ring.constant(r_value)).to_dict().values()]
            assert values and all(value >= 0 for value in values)
            minimum = min(values) if minimum is None else min(minimum, min(values))
            count += 1
    return count, minimum


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads((HERE / "rank8_delta0_new_leaf_mask3_r1_9_tail_exact_agent_20260823.json").read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK3_N40_R1_9_TAIL"
    base = literal_base()
    zring, zpower = split_power(zero_gap(base))
    zd, zcontrols = blossom(zring, zpower)
    quantitative, _ = independently_clear(base)
    qring, qpower = split_power(quantitative)
    qd, qcontrols = blossom(qring, qpower)
    assert zd == qd == (8, 5, 4) and len(zcontrols) == len(qcontrols) == 270
    fingerprints = {"zero_gap_bernstein": sparse_sha256(sorted(zcontrols.items())), "quantitative_gap_bernstein": sparse_sha256(sorted(qcontrols.items()))}
    assert fingerprints == primary["sparse_sha256"]
    c0, m0 = check(zcontrols, range(1, 5))
    c1, m1 = check(qcontrols, range(5, 10))
    assert c0 + c1 == 9 * 270
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-r1-9-tail-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK3_N40_R1_9_TAIL",
        "scope": primary["scope"], "hashes": actual, "literal_base_terms": len(base.terms()),
        "box_degrees": [8, 5, 4], "fixed_r_bernstein_checks": c0 + c1,
        "minimum_translated_power_coefficient": str(min(m0, m1)), "sparse_sha256": fingerprints,
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CHECKS", c0 + c1)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
