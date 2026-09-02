#!/usr/bin/env python3
"""Independent literal replay of the complete mask-1 fixed-m tail."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

import sympy as sp
from flint import fmpz_mpoly_ctx

from audit_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent import literal_base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask1_m0_15_tail_independent_audit_agent_20260823.json"

EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask1_m0_15_tail_agent.py": "86EE6713FC6105280612E8252E91B31DCF1E92CD972BC0F1B5B046652EE14158",
    "rank8_delta0_new_leaf_mask1_m0_15_tail_exact_agent_20260823.json": "4856E32BE9CC08176F2FC354FA7586FCC5BAE663CC8D4304D1CA329D629E3D95",
    "audit_rank8_delta0_new_leaf_mask1_quantitative_gap_tail_agent.py": "9486A9D826F1F326E2DF9E0CA102DE8030CAEBA5C18027E50344052A27DB9E40",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def falling(value, length: int, ring):
    answer = ring.constant(1)
    for offset in range(length):
        answer *= value - offset
    return answer


def independent_gap720(roots, m: int, ring):
    answer = ring.constant(0)
    for j in range(5):
        paths = choose(m - j + 1, j)
        if paths:
            answer += (
                ring.constant(720 * paths // math.factorial(5 - j))
                * falling(roots - j, 5 - j, ring)
            )
    return answer


def independent_d6cap720(N, m: int, ring):
    return (
        falling(N, 6, ring)
        - ring.constant(30 * m) * falling(N - 2, 4, ring)
        + ring.constant(120 * choose(m, 2)) * falling(N - 3, 3, ring)
    )


def clear_box(base, m: int, f6_positive: bool):
    labels = ["N", "X", "V", "T"] if f6_positive else ["N", "X", "V"]
    ring = fmpz_mpoly_ctx.get(labels)
    variables = ring.gens()
    N, X, V = variables[:3]
    T = variables[3] if f6_positive else None
    roots = N - m
    selected = N * N - 15 * N + 10
    xden = (N - 5) * selected
    xnum = 6 * selected + 60 * (N - 1) * X
    d6cap = independent_d6cap720(N, m, ring)
    yden = xden * d6cap
    ynum = xnum * d6cap - independent_gap720(roots, m, ring) * xden
    if f6_positive:
        tden = ring.constant(m - 5)
        tnum = ring.constant(6) + (choose(m, 5) * (m - 5) - 6) * T
        znum = ynum * tden
        zden = yden * tnum
    answer = ring.constant(0)
    for (np, xp, yp, zp), coefficient in reversed(base.terms()):
        if not f6_positive and zp:
            continue
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (1 - xp)
        term *= (ynum * V) ** yp * yden ** (3 - yp)
        if f6_positive:
            term *= (znum * V) ** zp * zden ** (4 - zp)
        answer += term
    return answer


def power_blocks(cleared):
    ring = fmpz_mpoly_ctx.get(["N"])
    grouped = {}
    for monomial, coefficient in reversed(list(cleared.to_dict().items())):
        np, *box = monomial
        grouped.setdefault(tuple(box), {})[(np,)] = int(coefficient)
    return ring, {key: ring.from_dict(value) for key, value in grouped.items()}


def blossom(ring, power):
    axes = len(next(iter(power)))
    degrees = tuple(max(index[axis] for index in power) for axis in range(axes))
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


def main() -> None:
    actual = {name: sha256(HERE / name) for name in EXPECTED}
    assert actual == EXPECTED, (actual, EXPECTED)
    primary = json.loads(
        (HERE / "rank8_delta0_new_leaf_mask1_m0_15_tail_exact_agent_20260823.json").read_text(
            encoding="utf-8"
        )
    )
    assert primary["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK1_M0_15_COMPLETE"
    assert primary["open_cells"] == primary["missing_tails"] == []
    base = literal_base()
    total_branches = 0
    total_controls = 0
    minimum = None
    for row in primary["rows"]:
        m = row["m"]
        expected = {branch["branch"]: branch for branch in row["branches"]}
        for flag in [False] + ([True] if m >= 6 else []):
            label = "f6_positive" if flag else "f6_zero"
            cleared = clear_box(base, m, flag)
            ring, power = power_blocks(cleared)
            degrees, controls = blossom(ring, power)
            branch = expected[label]
            assert [int(value) for value in degrees] == branch["degrees"]
            assert len(controls) == branch["controls"]
            assert sparse_sha256(sorted(controls.items())) == branch["bernstein_sha256"]
            N = ring.gen(0)
            local = []
            for polynomial in controls.values():
                values = [
                    int(value)
                    for value in polynomial.compose(40 + N).to_dict().values()
                ]
                assert values and all(value >= 0 for value in values)
                local.extend(values)
            assert branch["tail_start"] == 40
            assert branch["finite_below_tail"] == branch["open_finite"] == []
            assert str(min(local)) == branch["tail_minimum_translated_coefficient"]
            minimum = min(local) if minimum is None else min(minimum, min(local))
            total_branches += 1
            total_controls += len(controls)

    M = sp.symbols("M", integer=True, nonnegative=True)
    for j in range(1, 5):
        assert sp.simplify(
            sp.binomial(M - j, j)
            + sp.binomial(M - j, j - 1)
            - sp.binomial(M - j + 1, j)
        ) == 0
    Nsym = sp.symbols("N", integer=True, positive=True)
    assert sp.simplify(
        sp.binomial(Nsym - 3, 3)
        - sp.binomial(Nsym - 4, 2)
        - sp.binomial(Nsym - 4, 3)
    ) == 0
    payload = {
        "schema": "rank8-delta0-new-leaf-mask1-m0-15-tail-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK1_M0_15_COMPLETE",
        "scope": primary["scope"],
        "hashes": actual,
        "literal_base_terms": len(base.terms()),
        "fixed_m_rows": len(primary["rows"]),
        "branches": total_branches,
        "bernstein_controls": total_controls,
        "minimum_translated_power_coefficient": str(minimum),
        "bonferroni_lemma": (
            "For an N-vertex forest with m edges, second-order Bonferroni "
            "gives d6<=C(N,6)-m C(N-2,4)+C(m,2) C(N-3,3)."
        ),
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("ROWS", len(primary["rows"]), "BRANCHES", total_branches)
    print("CONTROLS", total_controls)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
