#!/usr/bin/env python3
"""Independent literal replay of the mask-1 low-r tail."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from flint import fmpz_mpoly_ctx

from audit_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent import (
    independent_blossom,
    independently_clear,
    literal_base,
    sparse_sha256,
    split_power,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask1_r1_9_tail_independent_audit_agent_20260823.json"

EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask1_r1_9_tail_agent.py": "6914E9A0C22A09DE8F09268610A77C70C10F9762BCFC2D20761D2A600D015ED3",
    "rank8_delta0_new_leaf_mask1_r1_9_tail_exact_agent_20260823.json": "7B71337C4B2B036692097276AD905743271FBBBFE696795961B5083B7CD4DDFF",
    "audit_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent.py": "9486A9D826F1F326E2DF9E0CA102DE8030CAEBA5C18027E50344052A27DB9E40",
    "rank8_delta0_new_leaf_mask1_quantitative_gap_tail_independent_audit_agent_20260823.json": "C95CC2A571DD8156F9415D3EB37D057C05C6270C9DA3FB30C52687AE2FBF907D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independent_zero_gap(base):
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
    for (np, xp, yp, zp), coefficient in base.terms():
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (1 - xp)
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    return answer


def check_fixed_r(bernstein, r_values):
    ring = next(iter(bernstein.values())).context()
    _, B = ring.gens()
    checks = 0
    minimum = None
    for r_value in r_values:
        for polynomial in bernstein.values():
            translated = polynomial.compose(40 + B, ring.constant(r_value))
            values = [int(value) for value in translated.to_dict().values()]
            assert values and all(value >= 0 for value in values)
            minimum = min(values) if minimum is None else min(minimum, min(values))
            checks += 1
    return checks, minimum


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask1_r1_9_tail_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    assert primary["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK1_N40_R1_9_TAIL"
    base = literal_base()
    zero = independent_zero_gap(base)
    zero_ring, zero_power = split_power(zero)
    zero_degrees, zero_bernstein = independent_blossom(zero_ring, zero_power)
    quantitative, _ = independently_clear(base)
    quant_ring, quant_power = split_power(quantitative)
    quant_degrees, quant_bernstein = independent_blossom(quant_ring, quant_power)
    assert zero_degrees == quant_degrees == (5, 5, 4)
    assert len(zero_bernstein) == len(quant_bernstein) == 180
    fingerprints = {
        "zero_gap_bernstein": sparse_sha256(sorted(zero_bernstein.items())),
        "quantitative_gap_bernstein": sparse_sha256(sorted(quant_bernstein.items())),
    }
    assert fingerprints == primary["sparse_sha256"]
    checks0, minimum0 = check_fixed_r(zero_bernstein, range(1, 5))
    checks1, minimum1 = check_fixed_r(quant_bernstein, range(5, 10))
    assert checks0 + checks1 == 9 * 180
    payload = {
        "schema": "rank8-delta0-new-leaf-mask1-r1-9-tail-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK1_N40_R1_9_TAIL",
        "scope": primary["scope"],
        "hashes": actual,
        "literal_base_terms": len(base.terms()),
        "box_degrees": [5, 5, 4],
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
