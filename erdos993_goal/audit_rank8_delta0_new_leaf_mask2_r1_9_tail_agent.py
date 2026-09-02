#!/usr/bin/env python3
"""Independent literal replay of the mask-2 low-r tail."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from flint import fmpz_mpoly_ctx

from audit_rank8_delta0_new_leaf_mask2_quantitative_gap_tail_agent import (
    blossom,
    independently_clear,
    literal_base,
    sparse_sha256,
    split_power,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask2_r1_9_tail_independent_audit_agent_20260823.json"

EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask2_r1_9_tail_agent.py": "255BE721792311DEB3F5534FD850CF82C7E5CBAAC2BA8829197AD077F847998D",
    "rank8_delta0_new_leaf_mask2_r1_9_tail_exact_agent_20260823.json": "D7E291E033190D5B597B49631DBD6F9D7946BC968C4CE9A8B4307CAA93D81FB5",
    "audit_rank8_delta0_new_leaf_mask2_quantitative_gap_tail_agent.py": "2ABD786B10A01DABCDA464F033924055D7D4AB893ADB2517421EC20F15F91CFA",
    "rank8_delta0_new_leaf_mask2_quantitative_gap_tail_independent_audit_agent_20260823.json": "5562AA56E4720D7E38B060C5172997514E416655CE1F10B28AC2AF7F3572D1A3",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def zero_gap(base):
    ring = fmpz_mpoly_ctx.get(["N", "r", "X", "V", "T"])
    N, r, X, V, T = ring.gens()
    m = N - r
    selected = N * N - 15 * N + 10
    xden = (N - 5) * selected
    xnum = 6 * selected + 60 * (N - 1) * X
    n6 = ring.constant(1)
    for value in (N, N - 1, N - 2, N - 3, N - 4, N - 5):
        n6 *= value
    yden = xden * n6
    ynum = xnum * n6
    fselected = m * m - 15 * m + 10
    tden = (m - 5) * fselected
    tnum = 6 * fselected + 60 * (m - 1) * T
    znum = ynum * tden
    zden = yden * tnum
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in reversed(base.terms()):
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (5 - xp)
        term *= (ynum * V) ** yp * yden ** (2 - yp)
        term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    return answer


def check_fixed(controls, r_values):
    ring = next(iter(controls.values())).context()
    _, B = ring.gens()
    checks = 0
    minimum = None
    for r_value in r_values:
        for polynomial in controls.values():
            values = [
                int(value)
                for value in polynomial.compose(40 + B, ring.constant(r_value)).to_dict().values()
            ]
            assert values and all(value >= 0 for value in values)
            minimum = min(values) if minimum is None else min(minimum, min(values))
            checks += 1
    return checks, minimum


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask2_r1_9_tail_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    assert primary["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK2_N40_R1_9_TAIL"
    base = literal_base()
    zero = zero_gap(base)
    zero_ring, zero_power = split_power(zero)
    zero_degrees, zero_controls = blossom(zero_ring, zero_power)
    quantitative, _ = independently_clear(base)
    quant_ring, quant_power = split_power(quantitative)
    quant_degrees, quant_controls = blossom(quant_ring, quant_power)
    assert zero_degrees == quant_degrees == (8, 4, 4)
    assert len(zero_controls) == len(quant_controls) == 225
    fingerprints = {
        "zero_gap_bernstein": sparse_sha256(sorted(zero_controls.items())),
        "quantitative_gap_bernstein": sparse_sha256(sorted(quant_controls.items())),
    }
    assert fingerprints == primary["sparse_sha256"]
    checks0, minimum0 = check_fixed(zero_controls, range(1, 5))
    checks1, minimum1 = check_fixed(quant_controls, range(5, 10))
    assert checks0 + checks1 == 9 * 225
    payload = {
        "schema": "rank8-delta0-new-leaf-mask2-r1-9-tail-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK2_N40_R1_9_TAIL",
        "scope": primary["scope"],
        "hashes": actual,
        "literal_base_terms": len(base.terms()),
        "box_degrees": [8, 4, 4],
        "fixed_r_bernstein_checks": checks0 + checks1,
        "minimum_translated_power_coefficient": str(min(minimum0, minimum1)),
        "sparse_sha256": fingerprints,
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CHECKS", checks0 + checks1)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
