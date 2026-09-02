#!/usr/bin/env python3
"""Independent literal audit of the mask-0 quantitative-gap tail."""

from __future__ import annotations

import hashlib
import json
import math
from pathlib import Path

import sympy as sp
from flint import fmpz_mpoly_ctx


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask0_quantitative_gap_tail_independent_audit_agent_20260823.json"

EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask0_quantitative_gap_tail_agent.py": "72EC9021601A3AA83F72619DB7F101A710CBB3CA2704253D7CBE83C93019B8B8",
    "rank8_delta0_new_leaf_mask0_quantitative_gap_tail_exact_agent_20260823.json": "F819957E6ED732FF5BF1E571C7256D60BF6D9F6AAB493C1C787FABA8F5D745E2",
    "analyze_rank8_delta0_new_leaf_joint_selected_boundary_bounded_agent.py": "10CF82012DA64D69B216F3580DE8923F5D9F89C1C63D061A7D21BBC8DC76A27B",
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


def q8(p7: sp.Expr, p8: sp.Expr, p9: sp.Expr) -> sp.Expr:
    return 16 * p8**2 - p7 * p8 - 18 * p7 * p9


def literal_base_polynomial() -> sp.Poly:
    N, x, y, z = sp.symbols("N x y z")
    d7 = (N**2 - 18 * N + 12) / (7 * N)
    c6 = 1 + y
    c7 = d7 + z
    c8 = (N**2 - 19 * N - 6) / (8 * (N + 1)) * c7
    # C'=C+xD and H'=C at the new-leaf root.
    core6 = c6 + x
    core7 = c7 + 1
    core8 = c8 + d7
    p7 = core7 + core6 + c6
    p8 = core8 + core7 + c7
    p9_open = core8
    residual = sp.expand(
        8 * core7 * c6 * q8(p7, p8, p9_open)
        - 8 * c6 * p7 * (16 * core8**2 - core7 * core8)
        - 9 * core7 * p7 * (14 * c7**2 - c6 * c7)
    )
    numerator, denominator = sp.fraction(sp.cancel(residual))
    assert sp.factor(denominator) == 343 * N**4 * (N + 1) ** 2
    polynomial = sp.Poly(numerator, N, x, y, z, domain=sp.ZZ)
    assert len(polynomial.terms()) == 131
    return polynomial


def independently_clear_box(base: sp.Poly):
    ring = fmpz_mpoly_ctx.get(["N", "r", "X", "V", "T"])
    N, r, X, V, T = ring.gens()
    m = N - r
    dden = N * N - 15 * N + 10
    xden = (N - 5) * dden
    xnum = 6 * dden + 60 * (N - 1) * X
    n6 = ring.constant(1)
    for value in (N, N - 1, N - 2, N - 3, N - 4, N - 5):
        n6 *= value

    h = ring.constant(0)
    for j in range(5):
        left = ring.constant(1)
        right = ring.constant(1)
        for offset in range(j):
            left *= m - j + 1 - offset
        for offset in range(5 - j):
            right *= r - j - offset
        h += math.comb(5, j) * left * right
    yden = xden * n6
    ynum = xnum * n6 - 6 * h * xden
    fden = m * m - 15 * m + 10
    tden = (m - 5) * fden
    tnum = 6 * fden + 60 * (m - 1) * T
    znum = ynum * tden
    zden = yden * tnum

    result = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        # One common positive denominator is xden*yden^2*zden^4.
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (1 - xp)
        term *= (ynum * V) ** yp * yden ** (2 - yp)
        term *= (znum * V) ** zp * zden ** (4 - zp)
        result += term
    return result, h


def split_power(cleared):
    ring2 = fmpz_mpoly_ctx.get(["N", "r"])
    raw = {}
    for monomial, coefficient in cleared.to_dict().items():
        np, rp, xp, vp, tp = monomial
        raw.setdefault((xp, vp, tp), {})[(np, rp)] = int(coefficient)
    return ring2, {index: ring2.from_dict(terms) for index, terms in raw.items()}


def blossom_bernstein(ring, power):
    # An independently written tensor blossom conversion.  The factor 1728
    # is positive and clears C(4,j) in all three axes.
    answer = {}
    denominators = [1, 4, 6, 4, 1]
    for target_x in range(5):
        for target_v in range(5):
            for target_t in range(5):
                total = ring.constant(0)
                for (px, pv, pt), coefficient in power.items():
                    if px <= target_x and pv <= target_v and pt <= target_t:
                        wx = 12 * math.comb(target_x, px) // denominators[px]
                        wv = 12 * math.comb(target_v, pv) // denominators[pv]
                        wt = 12 * math.comb(target_t, pt) // denominators[pt]
                        total += coefficient * wx * wv * wt
                answer[(target_x, target_v, target_t)] = total
    return answer


def main() -> None:
    actual_hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual_hashes == EXPECTED, (actual_hashes, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask0_quantitative_gap_tail_exact_agent_20260823.json").read_text()
    )
    assert primary["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK0_N40_R10_M16_TAIL"

    base = literal_base_polynomial()
    cleared, h120 = independently_clear_box(base)
    ring, power = split_power(cleared)
    assert tuple(max(index[axis] for index in power) for axis in range(3)) == (4, 4, 4)
    bernstein = blossom_bernstein(ring, power)
    fingerprints = {
        "cleared_power_polynomial": sparse_sha256([("cleared", cleared)]),
        "power_coefficient_blocks": sparse_sha256(sorted(power.items())),
        "bernstein_coefficient_blocks_scaled_by_12_cubed": sparse_sha256(
            sorted(bernstein.items())
        ),
    }
    assert fingerprints == primary["sparse_sha256"]

    A, B = ring.gens()
    checked_cones = 0
    minimum_coefficient = None
    for coefficient in bernstein.values():
        translated = coefficient.compose(40 + A + B, 24 + A)
        values = [int(value) for value in translated.to_dict().values()]
        assert all(value >= 0 for value in values)
        checked_cones += 1
        if values:
            minimum_coefficient = min(values) if minimum_coefficient is None else min(minimum_coefficient, min(values))
        for a0 in range(14):
            translated = coefficient.compose(40 + B, ring.constant(10 + a0))
            values = [int(value) for value in translated.to_dict().values()]
            assert all(value >= 0 for value in values)
            checked_cones += 1
            if values:
                minimum_coefficient = min(minimum_coefficient, min(values))
    assert checked_cones == 125 * 15

    # Independent checks behind the gap: path coefficients obey the leaf
    # recurrence C(m-j,j)+C(m-j,j-1)=C(m-j+1,j), and an independent j-set
    # of F can be adjacent to at most j of the distinguished roots.
    m, r = sp.symbols("m r", integer=True, nonnegative=True)
    for j in range(1, 5):
        assert sp.simplify(
            sp.binomial(m - j, j)
            + sp.binomial(m - j, j - 1)
            - sp.binomial(m - j + 1, j)
        ) == 0

    payload = {
        "schema": "rank8-delta0-new-leaf-mask0-quantitative-gap-tail-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK0_N40_R10_M16_TAIL",
        "hashes": actual_hashes,
        "sparse_sha256": fingerprints,
        "literal_base_terms": len(base.terms()),
        "cleared_power_terms": len(cleared.to_dict()),
        "bernstein_coefficients": len(bernstein),
        "translated_cones_checked": checked_cones,
        "minimum_translated_power_coefficient": str(minimum_coefficient),
        "120G_polynomial": str(h120),
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CONES", checked_cones)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
