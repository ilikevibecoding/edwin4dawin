#!/usr/bin/env python3
"""Independent literal replay of the mask-3 middle-tail Bernstein seal."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp
from flint import fmpz_mpoly_ctx

from audit_rank8_delta0_new_leaf_mask2_quantitative_gap_tail_agent import (
    blossom,
    sparse_sha256,
    split_power,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_quantitative_gap_tail_independent_audit_agent_20260823.json"

EXPECTED = {
    "analyze_rank8_delta0_new_leaf_mask3_selected_boundary_agent.py": "817AD03F7B5DB8DDC1FF6D829F785A9255B89C8C36A0FB96A718549321FEDD8A",
    "rank8_delta0_new_leaf_mask3_selected_boundary_agent_20260823.json": "C955863A48FDB178D769762EE9AF8C01D7CB51087D6A0F5B0836E4BD1BFEDFC5",
    "probe_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent.py": "D2E1A1D6420B276B7AB2FA79E92EB1061FA7FB5DACE69855F850DC22BDCE4544",
    "rank8_delta0_new_leaf_mask3_quantitative_gap_tail_probe_agent_20260823.json": "20C6C73F47A4B2CACCBFF69125BC54F21C415AA7BB2E977314052DABD02599BF",
    "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py": "CC1F0204C2CBE3B202E35CEB60EBD6FA847CBEF1BE74DD255023198AB3707BAA",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def q8(a7, a8, a9):
    return 16 * a8**2 - a7 * a8 - 18 * a7 * a9


def literal_base():
    N, x, y, z = sp.symbols("N x y z")
    d7 = (12 - x) / (14 * x)
    c6 = 1 + y
    c7 = d7 + z
    c8 = c7 * (14 * c7 - c6) / (16 * c6)
    a6, a7, a8 = c6 + x, c7 + 1, c8 + d7
    p7, p8 = a7 + a6 + c6, a8 + a7 + c7
    residual = (
        8 * a7 * c6 * q8(p7, p8, a8)
        - 8 * c6 * p7 * (16 * a8**2 - a7 * a8)
        - 9 * a7 * p7 * (14 * c7**2 - c6 * c7)
    )
    numerator, denominator = sp.fraction(sp.cancel(residual))
    assert sp.factor(denominator) == 2744 * x**3 * (y + 1)
    result = sp.Poly(numerator, N, x, y, z, domain=sp.ZZ)
    assert len(result.terms()) == 48
    assert tuple(result.degree(v) for v in (N, x, y, z)) == (0, 4, 3, 4)
    return result


def independently_clear(base):
    ring = fmpz_mpoly_ctx.get(["N", "r", "X", "V", "T"])
    N, r, X, V, T = ring.gens()
    m = N - r
    selected = N * N - 15 * N + 10
    xden = (N - 5) * selected
    xnum = 6 * selected + 60 * (N - 1) * X
    n6 = ring.constant(1)
    for value in (N, N - 1, N - 2, N - 3, N - 4, N - 5):
        n6 *= value
    gap120 = ring.constant(0)
    for j in range(5):
        left = ring.constant(1)
        right = ring.constant(1)
        for offset in range(j):
            left *= m - j + 1 - offset
        for offset in range(5 - j):
            right *= r - j - offset
        gap120 += math.comb(5, j) * left * right
    yden = xden * n6
    ynum = xnum * n6 - 6 * gap120 * xden
    fselected = m * m - 15 * m + 10
    tden = (m - 5) * fselected
    tnum = 6 * fselected + 60 * (m - 1) * T
    znum = ynum * tden
    zden = yden * tnum
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in reversed(base.terms()):
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (4 - xp)
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    return answer, gap120


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads((HERE / "rank8_delta0_new_leaf_mask3_quantitative_gap_tail_probe_agent_20260823.json").read_text(encoding="utf-8"))
    structural = json.loads((HERE / "rank8_delta0_new_leaf_mask3_selected_boundary_agent_20260823.json").read_text(encoding="utf-8"))
    assert primary["status"] == "PASS_EXACT_BERNSTEIN_METHOD_MASK3_MIDDLE_TAIL"
    base = literal_base()
    serial = json.dumps([[list(m), str(c)] for m, c in base.terms()], separators=(",", ":")).encode()
    assert hashlib.sha256(serial).hexdigest().upper() == structural["numerator"]["canonical_sha256"]
    cleared, gap120 = independently_clear(base)
    ring, power = split_power(cleared)
    degrees, controls = blossom(ring, power)
    assert degrees == (8, 5, 4) and len(controls) == 270
    fingerprints = {
        "cleared_power_polynomial": sparse_sha256([("cleared", cleared)]),
        "power_coefficient_blocks": sparse_sha256(sorted(power.items())),
        "bernstein_coefficient_blocks": sparse_sha256(sorted(controls.items())),
    }
    assert fingerprints == primary["sparse_sha256"]
    A, B = ring.gens()
    cones = 0
    minimum = None
    for polynomial in controls.values():
        translated_rows = [polynomial.compose(40 + A + B, 24 + A)] + [polynomial.compose(40 + B, ring.constant(10 + a)) for a in range(14)]
        for translated in translated_rows:
            values = [int(value) for value in translated.to_dict().values()]
            assert values and all(value >= 0 for value in values)
            minimum = min(values) if minimum is None else min(minimum, min(values))
            cones += 1
    assert cones == 270 * 15
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-quantitative-gap-tail-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK3_N40_R10_M16_TAIL",
        "scope": primary["scope"],
        "hashes": actual,
        "literal_base_terms": len(base.terms()),
        "box_degrees": [int(value) for value in degrees],
        "bernstein_controls": len(controls),
        "translated_cones_checked": cones,
        "minimum_translated_power_coefficient": str(minimum),
        "sparse_sha256": fingerprints,
        "120G_polynomial": str(gap120),
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CONTROLS", len(controls), "CONES", cones)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
