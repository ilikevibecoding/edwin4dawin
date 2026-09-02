#!/usr/bin/env python3
"""Independent literal replay of the mask-1 middle-tail Bernstein seal."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

import sympy as sp
from flint import fmpz_mpoly_ctx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask1_quantitative_gap_tail_independent_audit_agent_20260823.json"

EXPECTED = {
    "analyze_rank8_delta0_new_leaf_mask1_selected_boundary_agent.py": "64B9399A1C9C6A9DA3AE569AC57080E8D3A8FEFCA0B474AA490370E2D569DE52",
    "rank8_delta0_new_leaf_mask1_selected_boundary_agent_20260823.json": "4851A6D37B2C68FD8FEECFDA2F94247C3B02CBF21EDEB035ED413FE427299DBF",
    "probe_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent.py": "E940D77A3E2CDD947BFDC381C5655ABE09DC882ABF6B308E09BE44F92FED61D0",
    "rank8_delta0_new_leaf_mask1_quantitative_gap_tail_probe_agent_20260823.json": "BFA9D916DD89EEFA85F99B6778A5D72D886CA2671AD19AAE7F97591BD7ADE05A",
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
    d7 = (N**2 - 18 * N + 12) / (7 * N)
    c6 = 1 + y
    c7 = d7 + z
    c8 = c7 * (14 * c7 - c6) / (16 * c6)
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
    assert sp.factor(denominator) == 686 * N**4 * (y + 1)
    polynomial = sp.Poly(numerator, N, x, y, z, domain=sp.ZZ)
    assert len(polynomial.terms()) == 107
    assert tuple(polynomial.degree(v) for v in (N, x, y, z)) == (8, 1, 3, 4)
    return polynomial


def independently_clear(base):
    ring = fmpz_mpoly_ctx.get(["N", "r", "X", "V", "T"])
    N, r, X, V, T = ring.gens()
    m = N - r
    selected_denom = N * N - 15 * N + 10
    xden = (N - 5) * selected_denom
    xnum = 6 * selected_denom + 60 * (N - 1) * X
    falling = ring.constant(1)
    for value in (N, N - 1, N - 2, N - 3, N - 4, N - 5):
        falling *= value
    gap120 = ring.constant(0)
    for j in range(5):
        left = ring.constant(1)
        right = ring.constant(1)
        for offset in range(j):
            left *= m - j + 1 - offset
        for offset in range(5 - j):
            right *= r - j - offset
        gap120 += math.comb(5, j) * left * right
    yden = xden * falling
    ynum = xnum * falling - 6 * gap120 * xden
    selected_f_denom = m * m - 15 * m + 10
    tden = (m - 5) * selected_f_denom
    tnum = 6 * selected_f_denom + 60 * (m - 1) * T
    znum = ynum * tden
    zden = yden * tnum
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (1 - xp)
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    return answer, gap120


def split_power(cleared):
    ring = fmpz_mpoly_ctx.get(["N", "r"])
    grouped = {}
    for monomial, coefficient in cleared.to_dict().items():
        np, rp, px, pv, pt = monomial
        grouped.setdefault((px, pv, pt), {})[(np, rp)] = int(coefficient)
    return ring, {key: ring.from_dict(value) for key, value in grouped.items()}


def independent_blossom(ring, power):
    degrees = tuple(max(index[axis] for index in power) for axis in range(3))
    denominators = [
        [math.comb(degree, exponent) for exponent in range(degree + 1)]
        for degree in degrees
    ]
    lcms = [math.lcm(*row) for row in denominators]
    answer = {}
    for target in itertools.product(*(range(degree + 1) for degree in degrees)):
        total = ring.constant(0)
        for source, coefficient in power.items():
            if all(source[axis] <= target[axis] for axis in range(3)):
                weight = math.prod(
                    math.comb(target[axis], source[axis])
                    * lcms[axis]
                    // denominators[axis][source[axis]]
                    for axis in range(3)
                )
                total += coefficient * weight
        answer[target] = total
    return degrees, answer


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask1_quantitative_gap_tail_probe_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    structural = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask1_selected_boundary_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    assert primary["status"] == "PASS_EXACT_BERNSTEIN_METHOD_MASK1_MIDDLE_TAIL"
    base = literal_base()
    serial = json.dumps(
        [[list(monomial), str(coefficient)] for monomial, coefficient in base.terms()],
        separators=(",", ":"),
    ).encode()
    assert hashlib.sha256(serial).hexdigest().upper() == structural["numerator"][
        "canonical_sha256"
    ]
    cleared, gap120 = independently_clear(base)
    ring, power = split_power(cleared)
    degrees, bernstein = independent_blossom(ring, power)
    assert degrees == (5, 5, 4)
    assert len(bernstein) == 180
    fingerprints = {
        "cleared_power_polynomial": sparse_sha256([("cleared", cleared)]),
        "power_coefficient_blocks": sparse_sha256(sorted(power.items())),
        "bernstein_coefficient_blocks": sparse_sha256(sorted(bernstein.items())),
    }
    assert fingerprints == primary["sparse_sha256"]

    A, B = ring.gens()
    cones = 0
    minimum = None
    for polynomial in bernstein.values():
        translated = polynomial.compose(40 + A + B, 24 + A)
        values = [int(value) for value in translated.to_dict().values()]
        assert values and all(value >= 0 for value in values)
        minimum = min(values) if minimum is None else min(minimum, min(values))
        cones += 1
        for a0 in range(14):
            translated = polynomial.compose(40 + B, ring.constant(10 + a0))
            values = [int(value) for value in translated.to_dict().values()]
            assert values and all(value >= 0 for value in values)
            minimum = min(minimum, min(values))
            cones += 1
    assert cones == 180 * 15

    # Check the exact combinatorial identity behind each path coefficient in G.
    m = sp.symbols("m", integer=True, nonnegative=True)
    for j in range(1, 5):
        assert sp.simplify(
            sp.binomial(m - j, j)
            + sp.binomial(m - j, j - 1)
            - sp.binomial(m - j + 1, j)
        ) == 0

    payload = {
        "schema": "rank8-delta0-new-leaf-mask1-quantitative-gap-tail-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK1_N40_R10_M16_TAIL",
        "scope": primary["scope"],
        "hashes": actual,
        "literal_base_terms": len(base.terms()),
        "box_degrees": [int(value) for value in degrees],
        "bernstein_controls": len(bernstein),
        "translated_cones_checked": cones,
        "minimum_translated_power_coefficient": str(minimum),
        "sparse_sha256": fingerprints,
        "120G_polynomial": str(gap120),
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CONTROLS", len(bernstein), "CONES", cones)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
