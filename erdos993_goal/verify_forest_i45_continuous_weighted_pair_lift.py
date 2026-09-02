#!/usr/bin/env python3
"""Exact continuous weighted-edge-pair lift for forest i4/i5 coefficients.

The local five-vertex inequality weights disjoint edge pairs by 1/2 and
adjacent edge pairs by 1/6.  Summing it and relaxing the global edge count by

    E=(C(m,4)-i4)/C(m-2,2)

gives a continuous piecewise lower bound for i5.  The implementation handles
E<1 and the sign change of the adjacent-pair coefficient at m=9 explicitly.
"""

from __future__ import annotations

from collections import Counter
from fractions import Fraction
import hashlib
import json
from itertools import combinations
from math import comb
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "forest_i45_continuous_weighted_pair_lift_exact_20260820.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def fraction_text(value: Fraction) -> str:
    return f"{value.numerator}/{value.denominator}"


def ceil_fraction(value: Fraction) -> int:
    return -((-value.numerator) // value.denominator)


def is_forest(order: int, edges: tuple[tuple[int, int], ...]) -> bool:
    parent = list(range(order))

    def find(vertex: int) -> int:
        while parent[vertex] != vertex:
            parent[vertex] = parent[parent[vertex]]
            vertex = parent[vertex]
        return vertex

    for left, right in edges:
        left_root, right_root = find(left), find(right)
        if left_root == right_root:
            return False
        parent[left_root] = right_root
    return True


def local_weighted_pair_audit() -> dict:
    possible = tuple(combinations(range(5), 2))
    forests = 0
    equality_types: Counter[tuple[int, tuple[int, ...]]] = Counter()
    minimum_margin_by_edges: dict[int, Fraction] = {}
    for mask in range(1 << len(possible)):
        edges = tuple(
            possible[index]
            for index in range(len(possible))
            if mask & (1 << index)
        )
        if not is_forest(5, edges):
            continue
        forests += 1
        degrees = [0] * 5
        for left, right in edges:
            degrees[left] += 1
            degrees[right] += 1
        edge_count = len(edges)
        adjacent_pairs = sum(comb(value, 2) for value in degrees)
        disjoint_pairs = comb(edge_count, 2) - adjacent_pairs

        bad_four_subsets = 0
        for omitted in range(5):
            remaining = set(range(5)) - {omitted}
            if any(left in remaining and right in remaining for left, right in edges):
                bad_four_subsets += 1
        delta = 0 if edge_count == 0 else bad_four_subsets - 3
        weighted_pairs = Fraction(disjoint_pairs, 2) + Fraction(adjacent_pairs, 6)
        margin = Fraction(delta) - weighted_pairs
        assert margin >= 0, (edges, delta, disjoint_pairs, adjacent_pairs)
        current = minimum_margin_by_edges.get(edge_count)
        minimum_margin_by_edges[edge_count] = (
            margin if current is None else min(current, margin)
        )
        if margin == 0:
            equality_types[(edge_count, tuple(sorted(degrees, reverse=True)))] += 1
    assert forests == 291
    return {
        "labelled_five_vertex_forests": forests,
        "inequality": (
            "delta(S)>=disjoint_edge_pairs(S)/2+adjacent_edge_pairs(S)/6"
        ),
        "minimum_margin_by_edge_count": {
            str(edges): fraction_text(value)
            for edges, value in sorted(minimum_margin_by_edges.items())
        },
        "labelled_equality_types": [
            {
                "edges": edges,
                "degree_sequence": list(degrees),
                "labelled_count": count,
            }
            for (edges, degrees), count in sorted(equality_types.items())
        ],
    }


def choose2_continuous_lower(E: Fraction) -> Fraction:
    """Nonnegative continuous lower bound for C(e,2), e integer and e>=E."""
    if E <= 1:
        return Fraction(0)
    return E * (E - 1) / 2


def continuous_D_lower(m: int, E: Fraction) -> Fraction:
    """Strongest sign-safe continuous branch from the weighted-pair audit."""
    assert m >= 5 and E >= 0
    pair_floor = choose2_continuous_lower(E)
    adjacent_floor = max(Fraction(0), 2 * E - m)
    disjoint_weight = Fraction(m - 4, 2)
    adjacent_weight = Fraction(comb(m - 3, 2), 6)
    difference = adjacent_weight - disjoint_weight
    if difference >= 0:  # exactly m>=9
        return disjoint_weight * pair_floor + difference * adjacent_floor
    # For 5<=m<=8 a lower bound on adjacent pairs has the wrong sign.
    # Use A<=C(e,2), i.e. give every pair the smaller adjacent-pair weight.
    return adjacent_weight * pair_floor


def discrete_D_lower(m: int, bad4: int) -> Fraction:
    """Ceiling-strengthened companion using the exact integer edge floor."""
    denominator = comb(m - 2, 2)
    edge_floor = (bad4 + denominator - 1) // denominator
    pair_floor = comb(edge_floor, 2)
    adjacent_floor = max(0, 2 * edge_floor - m)
    disjoint_weight = Fraction(m - 4, 2)
    adjacent_weight = Fraction(comb(m - 3, 2), 6)
    difference = adjacent_weight - disjoint_weight
    if difference >= 0:
        return disjoint_weight * pair_floor + difference * adjacent_floor
    return adjacent_weight * pair_floor


def coefficient_row(m: int, a: int) -> dict:
    bad4 = comb(m, 4) - a
    E = Fraction(bad4, comb(m - 2, 2))
    generic = Fraction(comb(m, 5)) - Fraction((m - 4) * bad4, 3)
    continuous_D = continuous_D_lower(m, E)
    discrete_D = discrete_D_lower(m, bad4)
    continuous_b = generic + continuous_D / 3
    discrete_b = generic + discrete_D / 3
    return {
        "m": m,
        "i4": a,
        "bad_four_sets": bad4,
        "E": fraction_text(E),
        "generic_badset_lower": fraction_text(generic),
        "continuous_D_lower": fraction_text(continuous_D),
        "continuous_i5_lower": fraction_text(continuous_b),
        "continuous_integer_i5_lower": ceil_fraction(continuous_b),
        "discrete_D_lower": fraction_text(discrete_D),
        "discrete_integer_i5_lower": ceil_fraction(discrete_b),
    }


def main() -> int:
    audit = local_weighted_pair_audit()

    # Exact sign/switch audit.  The difference between adjacent- and
    # disjoint-pair weights is (m-4)(m-9)/12.
    sign_rows = []
    for m in range(5, 31):
        difference = Fraction(comb(m - 3, 2), 6) - Fraction(m - 4, 2)
        expected = Fraction((m - 4) * (m - 9), 12)
        assert difference == expected
        assert (difference >= 0) == (m >= 9)
        sign_rows.append({
            "m": m,
            "adjacent_minus_disjoint_weight": fraction_text(difference),
            "branch": "use_adjacent_floor" if m >= 9 else "use_all_pairs_at_adjacent_weight",
        })

    # E<1 audit: the proposed raw quadratic is negative, but an actual
    # integer e is either zero (E=0) or at least one (E>0).  Hence zero is a
    # stronger valid continuous lower bound on C(e,2).
    for numerator in range(0, 101):
        E = Fraction(numerator, 100)
        assert choose2_continuous_lower(E) == 0
        if 0 < E < 1:
            assert E * (E - 1) / 2 < 0

    # Monotonicity audit on exact rational grids across both switches.
    for m in range(5, 41):
        maximum_E = Fraction(comb(m, 4), comb(m - 2, 2))
        final_step = ceil_fraction(20 * maximum_E)
        values = [
            continuous_D_lower(m, Fraction(step, 20))
            for step in range(0, final_step + 1)
        ]
        assert all(left <= right for left, right in zip(values, values[1:]))

    # Record the m=25 range relevant to the order-27 lower-b faces, including
    # rows beyond the old c5=C(23,5) containment endpoint.
    n27_rows = [coefficient_row(25, a) for a in range(8610, 8855)]
    assert all(
        row["continuous_integer_i5_lower"] <= row["discrete_integer_i5_lower"]
        for row in n27_rows
    )

    report = {
        "status": "PASS_EXACT_FOREST_I45_CONTINUOUS_WEIGHTED_PAIR_LIFT",
        "local_theorem": (
            "For every induced five-vertex forest S, delta(S)=t(S)-3 is at "
            "least one half its disjoint edge-pair count plus one sixth its "
            "adjacent edge-pair count."
        ),
        "global_theorem_m_at_least_9": (
            "For every m>=9 and m-vertex forest J, put B4=C(m,4)-i4(J), "
            "E=B4/C(m-2,2), g(E)=0 for E<=1 and E(E-1)/2 for E>=1, "
            "A=max(0,2E-m), alpha=(m-4)/2, beta=(m-4)(m-9)/12. Then "
            "D=(m-4)B4-3B5>=alpha*g(E)+beta*A, and i5(J)>=C(m,5)-"
            "(m-4)B4/3+[alpha*g(E)+beta*A]/3."
        ),
        "global_theorem_m_5_through_8": (
            "For 5<=m<=8 the beta coefficient is negative, so the safe "
            "piece uses A<=C(e,2): D>=C(m-3,2)*g(E)/6, followed by the same "
            "conversion from D to i5."
        ),
        "continuous_piecewise_m_at_least_9": [
            {"E_interval": "0<=E<=1", "D_lower": "0"},
            {
                "E_interval": "1<=E<=m/2",
                "D_lower": "(m-4)*E*(E-1)/4",
            },
            {
                "E_interval": "E>=m/2",
                "D_lower": (
                    "(m-4)*E*(E-1)/4+(m-4)*(m-9)*(2E-m)/12"
                ),
            },
        ],
        "exact_integer_companion": (
            "Replace E by e0=ceil(B4/C(m-2,2)) in C(e0,2) and "
            "max(0,2e0-m), use the same sign branch, and take the ceiling of "
            "the resulting rational i5 lower bound."
        ),
        "local_five_vertex_audit": audit,
        "coefficient_sign_audit_m5_through_m30": sign_rows,
        "order27_m25_rows_a8610_through_a8854": n27_rows,
        "scope_warning": (
            "The formula is a coefficient inequality for forests, not a full "
            "Delta0 theorem. For E<1 the raw quadratic E(E-1)/2 remains a "
            "valid but negative relaxation; the packaged bound replaces it "
            "by the stronger value zero."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("LOCAL_WEIGHTED_PAIR_AUDIT labelled_forests=291")
    print("SIGN_SWITCH m=9; E_SWITCHES 1 and m/2")
    print(f"n27_rows={len(n27_rows)}")
    print(f"wrote {OUTPUT.name}; sha256={sha256(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
