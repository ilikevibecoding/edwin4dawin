#!/usr/bin/env python3
"""Universal connected-subcubic common0/sum0 no-parent rank-seven G1.

Orders through 23 are covered by a center-canonical exact census of every
unlabelled connected subcubic tree.  From order 24 onward, exact degree-core
and signed-support inequalities reduce G1 to two three-variable polynomials;
tensor Bernstein certificates prove both nonnegative on their full boxes.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from functools import lru_cache
from pathlib import Path

import networkx as nx
import sympy as sp

from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    certify_bernstein,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_subcubic_no_parent_universal_exact_"
    "rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_SUBCUBIC_NO_PARENT_"
    "UNIVERSAL_RANK7_G4_PIECEWISE"
)
TAIL_START = 24
FINITE_END = TAIL_START - 1
MAXIMUM_CENTER_PIECE = 18
FILES = {
    "parent_source": "derive_iso_n7_bundle_g1_parent_modes_rank7_g4_piecewise.py",
    "parent_report": "iso_n7_bundle_g1_parent_modes_exact_rank7_g4_piecewise_20260831.json",
    "support_source": "prove_iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_rank7_g4_piecewise.py",
    "support_report": "iso_n7_bundle_g1_sum0_signed_cluster_support_lemma_exact_rank7_g4_piecewise_20260831.json",
    "direction_source": "prove_iso_n7_bundle_g1_sum0_support_direction_monotonicity_rank7_g4_piecewise.py",
    "direction_report": "iso_n7_bundle_g1_sum0_support_direction_monotonicity_exact_rank7_g4_piecewise_20260831.json",
    "bernstein_source": "prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein.py",
}
EXPECTED = {
    "parent_source": "3C4F8170E28763B85028C5B812B2305CCBC3DD3777258199D9A9AA51CE96AE8D",
    "parent_report": "1662D04DD24AF51A71BD2BFA0ECEE7DE852A3CDD03D3B54A5C638AAA35CC4490",
    "support_source": "184CE9F5D92F49DED58C3EE477BEA916FC7C624F9E84A234AECD318CCAECF846",
    "support_report": "180026E94A87369CA46D3F58F0ACB18EB35ED550792BB0F04BE5167B06D9ED3B",
    "direction_source": "095BC0C3FF23ECBEA7AFF32AADE3347C1D2BA926156C431DECBD36B7DDE9B6DA",
    "direction_report": "AAD841A64F5F0FFB999AB5B26E299F77F2D03B29C5DC52CA3E51C255E30EA08E",
    "bernstein_source": "6B3106BCEE7F7ECA68C4C5B6861EF018E7E2023DFD8BA091CDAC1EA1FB0085A6",
}
EXPECTED_FINITE = {
    2: (1, 0),
    3: (1, 0),
    4: (2, 0),
    5: (2, 8),
    6: (4, 128),
    7: (6, 1120),
    8: (11, 7600),
    9: (18, 39549),
    10: (37, 168928),
    11: (66, 616637),
    12: (135, 1979720),
    13: (265, 5711889),
    14: (552, 15058496),
    15: (1132, 36754872),
    16: (2410, 83939656),
    17: (5098, 180917503),
    18: (11020, 370633536),
    19: (23846, 726000241),
    20: (52233, 1366551344),
    21: (114796, 2482291703),
    22: (254371, 4367072544),
    23: (565734, 7451078578),
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(value, rank):
    if rank < 0:
        return sp.Integer(0)
    if rank == 0:
        return sp.Integer(1)
    return sp.prod(value-offset for offset in range(rank))/sp.factorial(rank)


def independence_at_minus_one(graph: nx.Graph) -> int:
    vertices = list(graph)
    total = 0
    for mask in range(1 << len(vertices)):
        chosen = [
            vertices[index] for index in range(len(vertices)) if mask >> index & 1
        ]
        if all(
            not graph.has_edge(left, right)
            for left, right in itertools.combinations(chosen, 2)
        ):
            total += -1 if len(chosen) % 2 else 1
    return total


def mobius(graph: nx.Graph) -> int:
    return (-1)**graph.number_of_nodes()*independence_at_minus_one(graph)


def component_catalog(maximum: int):
    catalog = []
    for order in range(2, maximum+1):
        for tree in nx.nonisomorphic_trees(order):
            catalog.append((order, tree.copy()))
    return catalog


def forests_without_isolates(order: int):
    catalog = component_catalog(order)

    def extend(remaining: int, first: int, chosen: tuple[int, ...]):
        if remaining == 0:
            yield nx.disjoint_union_all([catalog[index][1] for index in chosen])
            return
        for index in range(first, len(catalog)):
            component_order = catalog[index][0]
            if component_order <= remaining:
                yield from extend(remaining-component_order, index, chosen+(index,))

    yield from extend(order, 0, ())


def classify_subcubic_supports():
    """Exact finite audit behind E6 <= 3(-E5)."""
    records = {}
    stream = hashlib.sha256()
    for order in (5, 6):
        rows = []
        for graph in forests_without_isolates(order):
            degrees = tuple(sorted(dict(graph.degree()).values(), reverse=True))
            if degrees[0] > 3:
                continue
            value = mobius(graph)
            is_star = nx.is_tree(graph) and degrees == (order-1,)+(1,)*(order-1)
            if value == 0 or is_star:
                continue
            negative_deletions = 0
            for vertex in graph:
                deleted = graph.copy()
                deleted.remove_node(vertex)
                negative_deletions += mobius(deleted) < 0
            record = (
                tuple(sorted(
                    (len(component) for component in nx.connected_components(graph)),
                    reverse=True,
                )),
                degrees,
                value,
                negative_deletions,
            )
            rows.append(record)
        rows.sort()
        records[order] = rows
        stream.update((repr((order, rows))+"\n").encode())
    expected_five = [
        ((3, 2), (2, 1, 1, 1, 1), -1, 0),
        ((5,), (2, 2, 2, 1, 1), -1, 0),
    ]
    expected_six = [
        ((2, 2, 2), (1, 1, 1, 1, 1, 1), -1, 0),
        ((3, 3), (2, 2, 1, 1, 1, 1), 1, 4),
        ((4, 2), (3, 1, 1, 1, 1, 1), 1, 3),
        ((6,), (2, 2, 2, 2, 1, 1), 1, 4),
        ((6,), (3, 2, 2, 1, 1, 1), 1, 3),
    ]
    assert records[5] == expected_five
    assert records[6] == expected_six
    assert min(row[3] for row in records[6] if row[2] > 0) == 3
    return {
        "order_five_nonstar_nonzero_types": len(records[5]),
        "order_six_nonstar_nonzero_types": len(records[6]),
        "minimum_negative_five_deletions_per_positive_six_support": 3,
        "maximum_boundary_edges_of_negative_five_support": 9,
        "conclusion": "E6<=E6_positive<=3*(-E5)",
        "ordered_stream_sha256": stream.hexdigest().upper(),
    }


def planted_types(maximum: int):
    """All planted subcubic rooted trees: each root has at most two children."""
    rows: list[list[tuple]] = [[] for _ in range(maximum+1)]
    rows[1] = [()]
    for order in range(2, maximum+1):
        current = [(child,) for child in rows[order-1]]
        for left_order in range(1, (order-1)//2+1):
            right_order = order-1-left_order
            if left_order < right_order:
                current.extend(
                    (left, right)
                    for left in rows[left_order]
                    for right in rows[right_order]
                )
            else:
                current.extend(itertools.combinations_with_replacement(
                    rows[left_order], 2
                ))
        current.sort()
        assert len(current) == len(set(current))
        rows[order] = current
    return rows


@lru_cache(maxsize=None)
def rooted_height(tree: tuple) -> int:
    return 1+max((rooted_height(child) for child in tree), default=0)


def polynomial_add(left: tuple[int, ...], right: tuple[int, ...]):
    return tuple(
        (left[index] if index < len(left) else 0)
        +(right[index] if index < len(right) else 0)
        for index in range(max(len(left), len(right)))
    )


def polynomial_multiply(left: tuple[int, ...], right: tuple[int, ...]):
    result = [0]*(len(left)+len(right)-1)
    for left_index, left_value in enumerate(left):
        for right_index, right_value in enumerate(right):
            result[left_index+right_index] += left_value*right_value
    return tuple(result)


@lru_cache(maxsize=None)
def rooted_states(tree: tuple):
    excluded = (1,)
    included = (0, 1)
    for child in tree:
        child_excluded, child_included = rooted_states(child)
        excluded = polynomial_multiply(
            excluded, polynomial_add(child_excluded, child_included)
        )
        included = polynomial_multiply(included, child_excluded)
    return excluded, included


def group_choices(rows, sizes):
    if max(sizes) >= len(rows):
        return
    groups = []
    for size, values in itertools.groupby(sizes):
        multiplicity = len(list(values))
        groups.append(itertools.combinations_with_replacement(
            rows[size], multiplicity
        ))
    for choices in itertools.product(*groups):
        yield tuple(sorted(itertools.chain.from_iterable(choices)))


def centered_trees(rows, order: int):
    # A unique vertex center is characterized by equality of the two largest
    # incident branch heights.
    for first in range(1, (order-1)//2+1):
        second = order-1-first
        if first <= second:
            for branches in group_choices(rows, (first, second)):
                if rooted_height(branches[0]) == rooted_height(branches[1]):
                    yield ("vertex", branches)
    for first in range(1, order-2):
        for second in range(first, order-1):
            third = order-1-first-second
            if third < second:
                continue
            for branches in group_choices(rows, (first, second, third)):
                heights = sorted(rooted_height(branch) for branch in branches)
                if heights[-1] == heights[-2]:
                    yield ("vertex", branches)
    # The two rooted halves at a central edge have equal height.
    for first in range(1, order//2+1):
        second = order-first
        if first <= second:
            for halves in group_choices(rows, (first, second)):
                if rooted_height(halves[0]) == rooted_height(halves[1]):
                    yield ("edge", halves)


def independence_polynomial(kind: str, pieces: tuple):
    if kind == "vertex":
        excluded, included = rooted_states(pieces)
        return polynomial_add(excluded, included)
    (left_excluded, left_included), (right_excluded, right_included) = (
        rooted_states(piece) for piece in pieces
    )
    return polynomial_add(
        polynomial_multiply(left_excluded, right_excluded),
        polynomial_add(
            polynomial_multiply(left_included, right_excluded),
            polynomial_multiply(left_excluded, right_included),
        ),
    )


def g1_from_independence_polynomial(polynomial: tuple[int, ...]) -> int:
    values = list(polynomial)+[0]*9
    w3, w4, w5, w6, w7, w8 = values[3:9]
    return (
        8*w3*w3+24*w3*w4-64*w3*w5-106*w3*w6-51*w3*w7
        -8*w3*w8+80*w4*w4+90*w4*w5-12*w4*w6-10*w4*w7
        +39*w5*w5+10*w5*w6
    )


def finite_census():
    # A binary planted tree of height h has at most 2^h-1 vertices.  Thus a
    # center piece of order >=19 has height >=5.  Its equal-height companion
    # forces total order >=24 for an edge center and >=25 for a vertex center,
    # so pieces through 18 are complete for total order through 23.
    assert 2**4-1 < MAXIMUM_CENTER_PIECE+1
    pieces = planted_types(MAXIMUM_CENTER_PIECE)
    rows = []
    stream = hashlib.sha256()
    for order in range(2, FINITE_END+1):
        count = 0
        minimum = None
        negative = 0
        for kind, center_pieces in centered_trees(pieces, order):
            polynomial = independence_polynomial(kind, center_pieces)
            value = g1_from_independence_polynomial(polynomial)
            record = (kind, center_pieces, polynomial, value)
            stream.update((repr(record)+"\n").encode())
            count += 1
            negative += value < 0
            minimum = value if minimum is None else min(minimum, value)
        assert (count, minimum) == EXPECTED_FINITE[order]
        assert negative == 0
        rows.append({
            "unmarked_order": order,
            "canonical_unlabelled_trees": count,
            "minimum_G1": minimum,
            "negative": negative,
        })
    independent_counts = {
        order: sum(
            max(dict(tree.degree()).values()) <= 3
            for tree in nx.nonisomorphic_trees(order)
        )
        for order in range(2, 17)
    }
    assert all(
        independent_counts[order] == EXPECTED_FINITE[order][0]
        for order in independent_counts
    )
    return {
        "method": "unique tree-center decomposition into canonical planted binary pieces",
        "unmarked_orders": [2, FINITE_END],
        "rows": rows,
        "total_canonical_unlabelled_trees": sum(row["canonical_unlabelled_trees"] for row in rows),
        "negative": 0,
        "independent_networkx_count_crosscheck_orders": [2, 16],
        "ordered_stream_sha256": stream.hexdigest().upper(),
    }


def main() -> None:
    for key, digest in EXPECTED.items():
        assert sha256(HERE/FILES[key]) == digest, key
    parent = json.loads((HERE/FILES["parent_report"]).read_text(encoding="utf-8"))
    support = json.loads((HERE/FILES["support_report"]).read_text(encoding="utf-8"))
    direction = json.loads((HERE/FILES["direction_report"]).read_text(encoding="utf-8"))
    assert parent["marker"] == "DERIVED_EXACT_ISO_N7_BUNDLE_G1_PARENT_MODES_RANK7_G4_PIECEWISE"
    assert support["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_SIGNED_CLUSTER_SUPPORT_LEMMA_RANK7_G4_PIECEWISE"
    assert direction["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_SUPPORT_DIRECTION_MONOTONICITY_RANK7_G4_PIECEWISE"

    support_incidence = classify_subcubic_supports()
    census = finite_census()

    m, tail = sp.symbols("m tail", nonnegative=True)
    x, y, z = sp.symbols("x y z", nonnegative=True)
    symbols = {
        f"{family}{rank}": sp.Symbol(f"{family}{rank}", nonnegative=True)
        for family in "WABZ" for rank in range(2, 9)
    }
    literal = sp.expand(sp.sympify(
        parent["modes"]["no_parent"]["expression"], locals=symbols
    ))
    shifts = {
        symbols[f"A{rank}"]: symbols[f"W{rank-1}"] for rank in range(4, 9)
    }
    shifts.update({
        symbols[f"B{rank}"]: symbols[f"W{rank-1}"] for rank in range(4, 9)
    })
    shifts.update({
        symbols[f"Z{rank}"]: symbols[f"W{rank-2}"] for rank in range(5, 9)
    })
    reduced = sp.expand(literal.subs(shifts, simultaneous=True))
    w = {rank: symbols[f"W{rank}"] for rank in range(3, 9)}
    expected_reduced = sp.expand(
        8*w[3]**2+24*w[3]*w[4]-64*w[3]*w[5]-106*w[3]*w[6]
        -51*w[3]*w[7]-8*w[3]*w[8]+80*w[4]**2+90*w[4]*w[5]
        -12*w[4]*w[6]-10*w[4]*w[7]+39*w[5]**2+10*w[5]*w[6]
    )
    assert sp.expand(reduced-expected_reduced) == 0

    direction_vectors = {
        v: {rank: choose(m-v, rank-v) for rank in range(3, 9)}
        for v in range(6, 9)
    }
    derivatives = {
        v: sp.factor(sum(
            sp.diff(reduced, w[rank])*direction_vectors[v][rank]
            for rank in range(3, 9)
        ))
        for v in range(6, 9)
    }
    direction_locals = {"m": m, **{str(value): value for value in w.values()}}
    assert all(
        sp.expand(derivatives[v]-sp.sympify(
            direction["directions"][str(v)], locals=direction_locals
        )) == 0
        for v in range(6, 9)
    )
    assert all(
        sp.expand(sum(
            sp.diff(derivatives[v], w[rank])*direction_vectors[u][rank]
            for rank in range(3, 9)
        )) == 0
        for v in range(6, 9) for u in range(6, 9)
    )

    branches = {
        "low_3b_le_m_minus_1": (
            (m-1)*x/3,
            lambda cubic: m+cubic-5,
            # e33<=b is the gapless cap, including the exceptional b=0
            # path endpoint.  The sharper e33<=b-1 is valid only for b>0.
            lambda cubic: m+3*cubic-3,
        ),
        "high_3b_ge_m_minus_1": (
            (m-1)/3+(m-4)*x/6,
            lambda cubic: 4*cubic-4,
            lambda cubic: 2*m-8,
        ),
    }
    certificates = {}
    domain_certificates = {}
    relaxed_expressions = {}
    for label, (cubic, p4_floor, p4_ceiling) in branches.items():
        omega = m+cubic-2
        p4_minimum = p4_floor(cubic)
        p4_maximum = p4_ceiling(cubic)
        p4 = p4_minimum+(p4_maximum-p4_minimum)*y
        j4 = choose(m-1, 2)-omega-p4
        # If S is an induced P3 and r_S is its number of external neighbors,
        # e(W-N[S]) >= m-3r_S-3.  Summing r_S gives 3b+2P4 exactly.
        e5_floor = omega*(m-3)-9*cubic-6*p4
        e5_ceiling = j4*(m-4)
        e5_magnitude = e5_floor+(e5_ceiling-e5_floor)*z
        d = {
            0: sp.Integer(1),
            1: sp.Integer(0),
            2: 1-m,
            3: omega,
            4: j4-cubic,
            5: -e5_magnitude,
            6: 3*e5_magnitude,
            # Positive E7 supports are P3+2K2, P5+K2, or the connected
            # one-cubic seven-tree.  The three displayed terms bound them.
            7: (
                omega*choose(m-3, 2)
                -(m-6)*(3*cubic+2*p4)
                +2*p4*(m-5)+80*cubic
            ),
            # Positive subcubic E8 supports are 4K2, two disjoint claws, or
            # the connected two-cubic eight-tree (center distance 1,2,3).
            8: (
                choose(m-1, 4)-omega*choose(m-3, 2)/6
                +choose(cubic, 2)+40*cubic+8*omega+p4
            ),
        }
        relaxed_rows = {
            rank: sp.expand(sum(
                d[v]*choose(m-v, rank-v) for v in range(rank+1)
            ))
            for rank in range(3, 9)
        }
        relaxed = sp.expand(reduced.subs({
            w[rank]: relaxed_rows[rank] for rank in range(3, 9)
        }, simultaneous=True))
        relaxed_expressions[label] = str(relaxed)
        certificate = certify_bernstein(
            sp.expand(relaxed.subs(m, tail+TAIL_START)), (x, y, z), tail=tail
        )
        assert certificate["degree_profile"] == [3, 2, 2]
        assert certificate["bernstein_coefficients"] == 36
        assert certificate["tail_power_coefficients"] == 396
        assert certificate["minimum_at_tail_zero"] == "10110178837/27"
        assert certificate["minimum_tail_power_coefficient"] == "143/100800"
        assert certificate["exact_power_inversion"] is True
        certificates[label] = certificate
        domain_certificates[label] = {
            "P4_interval_width": certify_bernstein(
                sp.expand((p4_maximum-p4_minimum).subs(m, tail+TAIL_START)),
                (x,), tail=tail,
            ),
            "J4": certify_bernstein(
                sp.expand(j4.subs(m, tail+TAIL_START)), (x, y), tail=tail
            ),
            "E5_interval_width": certify_bernstein(
                sp.expand((e5_ceiling-e5_floor).subs(m, tail+TAIL_START)),
                (x, y), tail=tail,
            ),
        }

    assert certificates["low_3b_le_m_minus_1"]["ordered_stream_sha256"] == (
        "6820C397112101DE8D86E139EFAA722C432EC6CEF8456C0CBC2A7BFD937DB901"
    )
    assert certificates["high_3b_ge_m_minus_1"]["ordered_stream_sha256"] == (
        "218DC4AC6EBAC74A8988457B9AA0C6971B3AC28FD28F7F8BC7316E3734B20537"
    )

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "Let W be any connected tree of maximum degree at most three. "
            "If C is obtained by adjoining two isolated marked vertices and "
            "no parent is deleted, then the exact rank-seven common0/sum0 "
            "bundle coefficient G1 is nonnegative for every order of W."
        ),
        "geometry": "nonadjacent_common0_sum0",
        "mode": "no_parent",
        "family": "all connected trees of maximum degree at most three",
        "small_orders": {
            "unmarked_orders_0_1": "direct G1=0",
            "exact_center_census": census,
        },
        "analytic_tail_start_unmarked_order": TAIL_START,
        "literal_reduced_expression": str(reduced),
        "degree_core_parameterization": {
            "degree_counts": "n1=b+2, n2=m-2b-2, n3=b",
            "Omega": "m+b-2",
            "P4_identity": "P4=(b+n2-1)+r+e33",
            "P4_lower": "m+b-5+max(0,3b-m+1)",
            "P4_upper_low_branch": "m+3b-3 (gapless at b=0 path endpoint)",
            "P4_upper_high_branch": "2m-8",
            "branches": {
                "low": "b=(m-1)x/3",
                "high": "b=(m-1)/3+(m-4)x/6",
            },
        },
        "signed_support_bounds": {
            "minus_E5_lower": "Omega*(m-3)-9b-6P4",
            "minus_E5_upper": "J4*(m-4)",
            "E5_E6_incidence": support_incidence,
            "D7_upper": "Omega*C(m-3,2)-(m-6)(3b+2P4)+2P4(m-5)+80b",
            "D8_upper": "C(m-1,4)-Omega*C(m-3,2)/6+C(b,2)+40b+8Omega+P4",
        },
        "monotone_support_replacement": {
            "directions": [6, 7, 8],
            "derivatives_nonpositive": "imported frozen exact theorem",
            "all_cross_second_derivatives_zero": True,
            "consequence": "each displayed relaxed polynomial is a lower bound for actual G1",
        },
        "domain_certificates": domain_certificates,
        "tail_certificates": certificates,
        "relaxed_expressions": relaxed_expressions,
        "coverage_gap_within_stated_connected_subcubic_no_parent_scope": None,
        "scope": (
            "Rank-seven G1 only, common0/sum0, no-parent, connected "
            "subcubic W. Disconnected forests, maximum degree at least four, "
            "endpoint parents, ordinary parents, and other marked geometries "
            "are outside this theorem."
        ),
        "dependencies_sha256": EXPECTED,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "finite_canonical_trees": census["total_canonical_unlabelled_trees"],
        "finite_negative": census["negative"],
        "analytic_tail_start_unmarked_order": TAIL_START,
        "tail_minimum_at_start": certificates[
            "low_3b_le_m_minus_1"
        ]["minimum_at_tail_zero"],
        "coverage_gap_within_stated_connected_subcubic_no_parent_scope": None,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
