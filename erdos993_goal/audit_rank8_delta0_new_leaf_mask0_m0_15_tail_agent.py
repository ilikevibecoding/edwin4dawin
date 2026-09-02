#!/usr/bin/env python3
"""Independent literal replay of the complete mask-0 fixed-m tail."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

import sympy as sp
from flint import fmpz_mpoly_ctx


HERE = Path(__file__).resolve().parent
OUTPUT = (
    HERE
    / "rank8_delta0_new_leaf_mask0_m0_15_tail_independent_audit_agent_20260823.json"
)

EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask0_m0_15_tail_agent.py":
        "9ED7D1BEE73B16DC4A2217183CC2D653496282398CF920671D663A924F6AB8F7",
    "rank8_delta0_new_leaf_mask0_m0_15_tail_exact_agent_20260823.json":
        "8C4393794E496FF8C592D7E1E2E5ACA580D3B047CE54C35F968039FA71107D8A",
    "analyze_rank8_delta0_new_leaf_joint_selected_boundary_bounded_agent.py":
        "10CF82012DA64D69B216F3580DE8923F5D9F89C1C63D061A7D21BBC8DC76A27B",
    "analyze_rank8_delta03_arbitrary_leaf_extension_symbolic_agent.py":
        "CC1F0204C2CBE3B202E35CEB60EBD6FA847CBEF1BE74DD255023198AB3707BAA",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def literal_base_polynomial() -> sp.Poly:
    """Rebuild the new-leaf residual directly, without the producer."""
    N, x, y, z = sp.symbols("N x y z")
    d7 = (N**2 - 18 * N + 12) / (7 * N)
    c6 = 1 + y
    c7 = d7 + z
    c8 = (N**2 - 19 * N - 6) / (8 * (N + 1)) * c7

    def q8(p7: sp.Expr, p8: sp.Expr, p9: sp.Expr) -> sp.Expr:
        return 16 * p8**2 - p7 * p8 - 18 * p7 * p9

    core6 = c6 + x
    core7 = c7 + 1
    core8 = c8 + d7
    p7 = core7 + core6 + c6
    p8 = core8 + core7 + c7
    residual = sp.expand(
        8 * core7 * c6 * q8(p7, p8, core8)
        - 8 * c6 * p7 * (16 * core8**2 - core7 * core8)
        - 9 * core7 * p7 * (14 * c7**2 - c6 * c7)
    )
    numerator, denominator = sp.fraction(sp.cancel(residual))
    assert sp.factor(denominator) == 343 * N**4 * (N + 1) ** 2
    result = sp.Poly(numerator, N, x, y, z, domain=sp.ZZ)
    assert len(result.terms()) == 131
    return result


def falling(value, length: int, ring):
    result = ring.constant(1)
    for offset in range(length):
        result *= value - offset
    return result


def gap_720(root_count, complement_order: int, ring):
    result = ring.constant(0)
    for j in range(5):
        path_j = choose(complement_order - j + 1, j)
        if path_j:
            result += (
                ring.constant(720 * path_j // math.factorial(5 - j))
                * falling(root_count - j, 5 - j, ring)
            )
    return result


def bonferroni_d6_upper_720(N, edge_count: int, ring):
    return (
        falling(N, 6, ring)
        - ring.constant(30 * edge_count) * falling(N - 2, 4, ring)
        + ring.constant(120 * choose(edge_count, 2)) * falling(N - 3, 3, ring)
    )


def clear_fixed_m_box(base: sp.Poly, m: int, f6_positive: bool):
    labels = ["N", "X", "V", "T"] if f6_positive else ["N", "X", "V"]
    ring = fmpz_mpoly_ctx.get(labels)
    variables = ring.gens()
    N, X, V = variables[:3]
    T = variables[3] if f6_positive else None
    roots = N - m

    q6_denominator = N * N - 15 * N + 10
    x_denominator = (N - 5) * q6_denominator
    x_numerator = 6 * q6_denominator + 60 * (N - 1) * X
    d6_upper = bonferroni_d6_upper_720(N, m, ring)
    y_denominator = x_denominator * d6_upper
    y_numerator = x_numerator * d6_upper - gap_720(roots, m, ring) * x_denominator

    if f6_positive:
        t_denominator = ring.constant(m - 5)
        t_numerator = ring.constant(6) + (
            choose(m, 5) * (m - 5) - 6
        ) * T
        z_numerator = y_numerator * t_denominator
        z_denominator = y_denominator * t_numerator

    answer = ring.constant(0)
    # Reverse traversal is deliberate: this replay does not share the
    # producer's term-order loop.
    for (np, xp, yp, zp), coefficient in reversed(base.terms()):
        if not f6_positive and zp:
            continue
        term = ring.constant(int(coefficient)) * N**np
        term *= x_numerator**xp * x_denominator ** (1 - xp)
        term *= (y_numerator * V) ** yp * y_denominator ** (2 - yp)
        if f6_positive:
            term *= (z_numerator * V) ** zp * z_denominator ** (4 - zp)
        answer += term
    return answer


def coefficient_polynomials(cleared):
    ring_n = fmpz_mpoly_ctx.get(["N"])
    grouped = {}
    for monomial, coefficient in reversed(list(cleared.to_dict().items())):
        n_power, *box_power = monomial
        grouped.setdefault(tuple(box_power), {})[(n_power,)] = int(coefficient)
    return ring_n, {
        key: ring_n.from_dict(terms) for key, terms in grouped.items()
    }


def blossom_blocks(ring, power):
    axis_count = len(next(iter(power)))
    degrees = tuple(
        max(index[axis] for index in power) for axis in range(axis_count)
    )
    scales = []
    for degree in degrees:
        scale = 1
        for exponent in range(degree + 1):
            scale = math.lcm(scale, math.comb(degree, exponent))
        scales.append(scale)

    blocks = {}
    ranges = [range(degree + 1) for degree in degrees]
    for target in itertools.product(*ranges):
        total = ring.constant(0)
        for source, polynomial in reversed(list(power.items())):
            if all(a <= b for a, b in zip(source, target)):
                weight = 1
                for a, b, degree, scale in zip(
                    source, target, degrees, scales
                ):
                    weight *= (
                        math.comb(b, a) * scale // math.comb(degree, a)
                    )
                total += polynomial * weight
        blocks[target] = total
    return degrees, blocks


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    primary = json.loads(
        (
            HERE
            / "rank8_delta0_new_leaf_mask0_m0_15_tail_exact_agent_20260823.json"
        ).read_text(encoding="utf-8")
    )
    assert primary["status"] == "PASS_EXACT_DELTA0_NEW_LEAF_MASK0_M0_15_COMPLETE"
    assert primary["open_cells"] == []

    base = literal_base_polynomial()
    independently_replayed = []
    total_blocks = 0
    total_translated_terms = 0
    minimum_translated_coefficient = None
    for primary_row in primary["rows"]:
        m = primary_row["m"]
        expected_branches = {branch["branch"]: branch for branch in primary_row["branches"]}
        branch_flags = [False] + ([True] if m >= 6 else [])
        audit_branches = []
        for f6_positive in branch_flags:
            label = "f6_positive" if f6_positive else "f6_zero"
            cleared = clear_fixed_m_box(base, m, f6_positive)
            ring, power = coefficient_polynomials(cleared)
            degrees, bernstein = blossom_blocks(ring, power)
            N = ring.gen(0)
            minima = []
            translated_terms = 0
            for polynomial in bernstein.values():
                translated = polynomial.compose(N + 40)
                coefficients = [int(value) for value in translated.to_dict().values()]
                assert coefficients and all(value >= 0 for value in coefficients)
                minima.append(min(coefficients))
                translated_terms += len(coefficients)
            row = {
                "branch": label,
                "degrees": list(degrees),
                "bernstein_coefficients": len(bernstein),
                "tail_start": 40,
                "tail_minimum_translated_coefficient": str(min(minima)),
                "tail_translated_terms": translated_terms,
                "finite_below_tail": [],
                "open_finite": [],
            }
            assert row == expected_branches[label], (m, label, row, expected_branches[label])
            audit_branches.append(row)
            total_blocks += len(bernstein)
            total_translated_terms += translated_terms
            local_minimum = min(minima)
            minimum_translated_coefficient = (
                local_minimum
                if minimum_translated_coefficient is None
                else min(minimum_translated_coefficient, local_minimum)
            )
        independently_replayed.append({"m": m, "branches": audit_branches})
    assert independently_replayed == primary["rows"]

    # Literal checks of the two combinatorial ingredients.
    M = sp.symbols("M", integer=True, nonnegative=True)
    for j in range(1, 5):
        assert sp.simplify(
            sp.binomial(M - j, j)
            + sp.binomial(M - j, j - 1)
            - sp.binomial(M - j + 1, j)
        ) == 0
    # An adjacent edge pair has C(N-3,3) common six-set extensions;
    # a disjoint pair has C(N-4,2), and their difference is C(N-4,3).
    Nsym = sp.symbols("N", integer=True, positive=True)
    assert sp.simplify(
        sp.binomial(Nsym - 3, 3)
        - sp.binomial(Nsym - 4, 2)
        - sp.binomial(Nsym - 4, 3)
    ) == 0

    payload = {
        "schema": "rank8-delta0-new-leaf-mask0-m0-15-tail-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_DELTA0_NEW_LEAF_MASK0_M0_15_COMPLETE",
        "hashes": hashes,
        "literal_base_terms": len(base.terms()),
        "fixed_m_rows": len(independently_replayed),
        "branches": sum(len(row["branches"]) for row in independently_replayed),
        "bernstein_blocks": total_blocks,
        "translated_power_terms": total_translated_terms,
        "minimum_translated_power_coefficient": str(minimum_translated_coefficient),
        "bonferroni_lemma": (
            "For N-vertex D with m edges, d6<=C(N,6)-m*C(N-2,4)+"
            "C(m,2)*C(N-3,3): apply second-order Bonferroni to the edge-"
            "containment events, then bound every pair intersection by the "
            "adjacent-pair value C(N-3,3)."
        ),
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("ROWS", payload["fixed_m_rows"], "BRANCHES", payload["branches"])
    print("BLOCKS", total_blocks, "MIN", minimum_translated_coefficient)
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
