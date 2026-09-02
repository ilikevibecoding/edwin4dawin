#!/usr/bin/env python3
"""Independent literal audit of the mask-0 r=1..9 tail."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from flint import fmpz_mpoly_ctx

import audit_rank8_delta0_new_leaf_mask0_quantitative_gap_tail_agent as literal


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask0_r1_9_tail_independent_audit_agent_20260823.json"

EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask0_r1_9_tail_agent.py": "12AE3CDC463B771A0DAE7CC444D641070DE49C78DF52D96132205160063ACA89",
    "rank8_delta0_new_leaf_mask0_r1_9_tail_exact_agent_20260823.json": "4254DFCEDAD08878FBC2EF95142A7BB5C5DD5F92D0D3FCCEA6DAC8ED5AD57812",
    "audit_rank8_delta0_new_leaf_mask0_quantitative_gap_tail_agent.py": "2669A0750A7E03CDBB9199257B5243EA21158550CF716C6C0AA1E4911005CD8D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def zero_gap_cleared(base):
    ring = fmpz_mpoly_ctx.get(["N", "r", "X", "V", "T"])
    N, r, X, V, T = ring.gens()
    m = N - r
    a = N**2 - 15 * N + 10
    xden = (N - 5) * a
    xnum = 6 * a + 60 * (N - 1) * X
    n6 = ring.constant(1)
    for offset in range(6):
        n6 *= N - offset
    yden = xden * n6
    ynum = xnum * n6
    b = m**2 - 15 * m + 10
    tden = (m - 5) * b
    tnum = 6 * b + 60 * (m - 1) * T
    znum = ynum * tden
    zden = yden * tnum
    result = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        result += (
            ring.constant(int(coefficient))
            * N**np
            * xnum**xp
            * xden ** (1 - xp)
            * (ynum * V) ** yp
            * yden ** (2 - yp)
            * (znum * V) ** zp
            * zden ** (4 - zp)
        )
    return result


def check_fixed_r(bernstein, values):
    ring = next(iter(bernstein.values())).context()
    _, B = ring.gens()
    rows = []
    for r in reversed(list(values)):
        minima = []
        term_count = 0
        for index, coefficient in sorted(bernstein.items(), reverse=True):
            translated = coefficient.compose(40 + B, ring.constant(r))
            coefficients = [int(value) for value in translated.to_dict().values()]
            assert coefficients and all(value >= 0 for value in coefficients), (r, index)
            minima.append(min(coefficients))
            term_count += len(coefficients)
        rows.append(
            {
                "r": r,
                "m_lower_bound": 40 - r,
                "bernstein_coefficients": 125,
                "translated_terms": term_count,
                "minimum_translated_power_coefficient": str(min(minima)),
                "status": "PASS",
            }
        )
    return sorted(rows, key=lambda row: row["r"])


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask0_r1_9_tail_exact_agent_20260823.json").read_text()
    )
    base = literal.literal_base_polynomial()
    zero = zero_gap_cleared(base)
    zero_ring, zero_power = literal.split_power(zero)
    zero_bernstein = literal.blossom_bernstein(zero_ring, zero_power)
    quantitative_cleared, _ = literal.independently_clear_box(base)
    quant_ring, quant_power = literal.split_power(quantitative_cleared)
    quant_bernstein = literal.blossom_bernstein(quant_ring, quant_power)
    fingerprints = {
        "zero_gap_bernstein": literal.sparse_sha256(sorted(zero_bernstein.items())),
        "quantitative_gap_bernstein": literal.sparse_sha256(sorted(quant_bernstein.items())),
    }
    assert fingerprints == primary["sparse_sha256"]
    rows = check_fixed_r(zero_bernstein, range(1, 5))
    rows += check_fixed_r(quant_bernstein, range(5, 10))
    rows.sort(key=lambda row: row["r"])
    assert rows == primary["rows"]

    payload = {
        "schema": "rank8-delta0-new-leaf-mask0-r1-9-tail-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK0_N40_R1_9_TAIL",
        "hashes": hashes,
        "sparse_sha256": fingerprints,
        "r_values": 9,
        "bernstein_checks": 1125,
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("R_VALUES 9 BERNSTEIN_CHECKS 1125")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
