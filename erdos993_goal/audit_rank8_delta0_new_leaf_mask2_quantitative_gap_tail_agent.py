#!/usr/bin/env python3
"""Independent literal replay of the mask-2 middle-tail Bernstein seal."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

import sympy as sp
from flint import fmpz_mpoly_ctx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask2_quantitative_gap_tail_independent_audit_agent_20260823.json"

EXPECTED = {
    "analyze_rank8_delta0_new_leaf_mask2_selected_boundary_agent.py": "0BE8B2DA0E2604FE2997D4544CE1F98BCC972BBAAD6D87BEDAA46524A5FC0272",
    "rank8_delta0_new_leaf_mask2_selected_boundary_agent_20260823.json": "E32A7E2BE4B7D73A0823DA5D0583B385FA14F0D8F0BCAD38E8B774A92C329DB7",
    "probe_rank8_delta0_new_leaf_mask2_quantitative_gap_tail_agent.py": "45C845D8CBAED860A85B8077FF14B48A8D785F97ABE69CB319E1881FCECF1FC8",
    "rank8_delta0_new_leaf_mask2_quantitative_gap_tail_probe_agent_20260823.json": "BDE68AD666B6294BD266145D52D8F0433C2DF0385BCE6E76B911E9C1A912957A",
    "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py": "CC1F0204C2CBE3B202E35CEB60EBD6FA847CBEF1BE74DD255023198AB3707BAA",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def sparse_sha256(polynomials) -> str:
    digest = hashlib.sha256()
    for label, polynomial in polynomials:
        digest.update(str(label).encode())
        digest.update(b"\0")
        for monomial, coefficient in sorted(polynomial.to_dict().items()):
            digest.update(",".join(str(int(value)) for value in monomial).encode())
            digest.update(b":")
            digest.update(str(int(coefficient)).encode())
            digest.update(b";")
        digest.update(b"\n")
    return digest.hexdigest().upper()


def q8(a7, a8, a9):
    return 16 * a8**2 - a7 * a8 - 18 * a7 * a9


def literal_base() -> sp.Poly:
    N, x, y, z = sp.symbols("N x y z")
    d7 = (12 - x) / (14 * x)
    c6 = 1 + y
    c7 = d7 + z
    c8 = (N**2 - 19 * N - 6) * c7 / (8 * (N + 1))
    a6 = c6 + x
    a7 = c7 + 1
    a8 = c8 + d7
    p7 = a7 + a6 + c6
    p8 = a8 + a7 + c7
    residual = (
        8 * a7 * c6 * q8(p7, p8, a8)
        - 8 * c6 * p7 * (16 * a8**2 - a7 * a8)
        - 9 * a7 * p7 * (14 * c7**2 - c6 * c7)
    )
    numerator, denominator = sp.fraction(sp.cancel(residual))
    assert sp.factor(denominator) == 2744 * x**4 * (N + 1) ** 2
    result = sp.Poly(numerator, N, x, y, z, domain=sp.ZZ)
    assert len(result.terms()) == 170
    assert tuple(result.degree(v) for v in (N, x, y, z)) == (4, 5, 2, 4)
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
        term *= xnum**xp * xden ** (5 - xp)
        term *= (ynum * V) ** yp * yden ** (2 - yp)
        term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    return answer, gap120


def split_power(cleared):
    ring = fmpz_mpoly_ctx.get(["N", "r"])
    grouped = {}
    for monomial, coefficient in reversed(list(cleared.to_dict().items())):
        np, rp, px, pv, pt = monomial
        grouped.setdefault((px, pv, pt), {})[(np, rp)] = int(coefficient)
    return ring, {key: ring.from_dict(value) for key, value in grouped.items()}


def blossom(ring, power):
    degrees = tuple(max(index[axis] for index in power) for axis in range(3))
    scales = [
        math.lcm(*(math.comb(degree, exponent) for exponent in range(degree + 1)))
        for degree in degrees
    ]
    answer = {}
    for target in itertools.product(*(range(degree + 1) for degree in degrees)):
        total = ring.constant(0)
        for source, polynomial in reversed(list(power.items())):
            if all(a <= b for a, b in zip(source, target)):
                total += polynomial * math.prod(
                    math.comb(b, a) * scale // math.comb(degree, a)
                    for a, b, degree, scale in zip(source, target, degrees, scales)
                )
        answer[target] = total
    return degrees, answer


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask2_quantitative_gap_tail_probe_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    structural = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask2_selected_boundary_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    assert primary["status"] == "PASS_EXACT_BERNSTEIN_METHOD_MASK2_MIDDLE_TAIL"
    base = literal_base()
    serial = json.dumps(
        [[list(monomial), str(coefficient)] for monomial, coefficient in base.terms()],
        separators=(",", ":"),
    ).encode()
    assert hashlib.sha256(serial).hexdigest().upper() == structural["numerator"]["canonical_sha256"]
    cleared, gap120 = independently_clear(base)
    ring, power = split_power(cleared)
    degrees, controls = blossom(ring, power)
    assert degrees == (8, 4, 4) and len(controls) == 225
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
        for translated in [polynomial.compose(40 + A + B, 24 + A)] + [
            polynomial.compose(40 + B, ring.constant(10 + a0)) for a0 in range(14)
        ]:
            values = [int(value) for value in translated.to_dict().values()]
            assert values and all(value >= 0 for value in values)
            minimum = min(values) if minimum is None else min(minimum, min(values))
            cones += 1
    assert cones == 225 * 15
    payload = {
        "schema": "rank8-delta0-new-leaf-mask2-quantitative-gap-tail-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK2_N40_R10_M16_TAIL",
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
