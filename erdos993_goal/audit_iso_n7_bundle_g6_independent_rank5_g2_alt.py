#!/usr/bin/env python3
"""Hostile independent audit of the universal rank-seven bundle g6 theorem.

The raw coefficient is rebuilt from the thirteen defining Gamma nodes through
the separately frozen independent rank-seven reconstruction.  This script then
reconstructs the W/A/B/Z partition and the corrected n>=11 decomposition,
proves every structural slack, and independently repeats the complete n=2..10
unlabeled-forest/ordered-mark/parent census.  The finite replay is a join, not
an all-order proof; the cone supplies the universal large-order half.
"""

from __future__ import annotations

import hashlib
import json
from functools import lru_cache
from pathlib import Path

import networkx as nx
import sympy as sp

from audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt import (
    reconstruct_coefficients,
)


HERE = Path(__file__).resolve().parent
SOURCE = Path(__file__).resolve()
PRODUCER_SOURCE = HERE / "prove_iso_n7_bundle_g6_root.py"
PRODUCER_REPORT = HERE / "iso_n7_bundle_g6_exact_root_20260830.json"
FINITE_SOURCE = HERE / "census_iso_n7_bundle_g6_finite_n2_10_root.py"
FINITE_REPORT = HERE / "iso_n7_bundle_g6_finite_n2_10_exact_root_20260830.json"
RECON_SOURCE = HERE / "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py"
RECON_REPORT = HERE / "iso_n7_bundle_g7_g12_independent_audit_exact_rank5_g2_alt_20260830.json"
OUTPUT = HERE / "iso_n7_bundle_g6_independent_audit_exact_rank5_g2_alt_20260830.json"
MARKER = "PASS_INDEPENDENT_EXACT_ISO_N7_BUNDLE_G6_RANK5_G2_ALT"
EXPECTED = {
    "producer_source": "77CBADCE4460CBF00888E413485BF0CF48FAFA11F054A8434C6416AC6FAE6E70",
    "producer_report": "6AE52352491AE7CD135D0EA1C22CA54D28C99A04134A82B4C20121C69DA11744",
    "finite_source": "9D885EB9955EB9B67B0F4B5DBE1EFA5A8F515357C8EC66FE67233A90B5B37E6C",
    "finite_report": "EB6E8BA8CA9D92BFD1E05A321FC5ED231F2A89F1EDBED0FCD903947057E832F4",
    "reconstruction_source": "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37",
    "reconstruction_report": "DA5E14A0769A8D35FA33574E91E0CDD7066BABBB3D6E5B38E7E3A28F17DB1E2D",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def independent_forests(order):
    """Every unlabeled forest once, reconstructed from tree multisets."""
    component_types = []
    for size in range(1, order + 1):
        candidates = [nx.empty_graph(1)] if size == 1 else nx.nonisomorphic_trees(size)
        for graph in candidates:
            component_types.append((size, nx.convert_node_labels_to_integers(graph)))

    def extend(remaining, start, selected):
        if remaining == 0:
            yield nx.disjoint_union_all([component_types[index][1] for index in selected])
            return
        for index in range(start, len(component_types)):
            size = component_types[index][0]
            if size > remaining:
                break
            yield from extend(remaining - size, index, (*selected, index))

    yield from extend(order, 0, ())


def all_induced_rows(graph, maximum=8):
    """Independent deletion recurrence, selecting the highest remaining bit."""
    nodes = tuple(sorted(graph))
    assert nodes == tuple(range(len(nodes)))
    adjacency = tuple(
        sum(1 << neighbor for neighbor in graph.neighbors(vertex))
        for vertex in nodes
    )

    @lru_cache(maxsize=None)
    def polynomial(mask):
        if mask == 0:
            return (1,) + (0,) * maximum
        vertex = mask.bit_length() - 1
        without = mask & ~(1 << vertex)
        without_closed = without & ~adjacency[vertex]
        first = polynomial(without)
        second = polynomial(without_closed)
        return tuple(
            first[rank] + (second[rank - 1] if rank else 0)
            for rank in range(maximum + 1)
        )

    full = (1 << len(nodes)) - 1
    for mask in range(full + 1):
        polynomial(mask)
    return full, polynomial


def independent_finite_census(generic_g6):
    symbols = tuple(sorted(generic_g6.free_symbols, key=str))
    evaluate = sp.lambdify(symbols, generic_g6, modules="math")
    expected_counts = {2:2, 3:3, 4:6, 5:10, 6:20, 7:37, 8:76, 9:153, 10:329}
    total_forests = total_marked = total_cells = negatives = 0
    digest = hashlib.sha256()
    per_order = {}
    modes = {"no_parent":0, "endpoint_parent":0, "ordinary_parent":0}
    mode_minima = {key: None for key in modes}
    minimum = None
    minimum_witness = None

    for order in range(2, 11):
        local_forests = local_marked = local_cells = local_negative = 0
        for graph0 in independent_forests(order):
            graph = nx.convert_node_labels_to_integers(graph0, ordering="sorted")
            graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
            full, poly = all_induced_rows(graph)
            nodes = tuple(range(order))
            for u in nodes:
                for v in nodes:
                    if u == v:
                        continue
                    c_masks = (
                        full,
                        full & ~(1 << u),
                        full & ~(1 << v),
                        full & ~(1 << u) & ~(1 << v),
                    )
                    crows = tuple(poly(mask) for mask in c_masks)
                    local_marked += 1
                    for parent in (None, *nodes):
                        d_full = full if parent is None else full & ~(1 << parent)
                        d_masks = (
                            d_full,
                            d_full & ~(1 << u),
                            d_full & ~(1 << v),
                            d_full & ~(1 << u) & ~(1 << v),
                        )
                        drows = tuple(poly(mask) for mask in d_masks)
                        rows = {
                            **{name: row for name, row in zip("EUVW", crows)},
                            **{f"d{name}": row for name, row in zip("EUVW", drows)},
                        }
                        arguments = []
                        for symbol in symbols:
                            label = str(symbol)
                            prefix = label[0]
                            if prefix == "c":
                                arguments.append(rows[label[1]][int(label[2:])])
                            elif prefix == "d":
                                arguments.append(rows[label[:2]][int(label[2:])])
                            else:
                                raise AssertionError(label)
                        raw_value = evaluate(*arguments)
                        value = int(raw_value)
                        assert value == raw_value
                        mode = (
                            "no_parent" if parent is None else
                            "endpoint_parent" if parent in (u,v) else
                            "ordinary_parent"
                        )
                        modes[mode] += 1
                        mode_minima[mode] = (
                            value if mode_minima[mode] is None
                            else min(mode_minima[mode], value)
                        )
                        digest.update(f"{order}:{graph6}:{u}:{v}:{parent}:{value};".encode())
                        if minimum is None or value < minimum:
                            minimum = value
                            minimum_witness = {
                                "value": value, "order": order, "graph6": graph6,
                                "u": u, "v": v, "parent": parent, "mode": mode,
                            }
                        if value < 0:
                            negatives += 1
                            local_negative += 1
                        local_cells += 1
            local_forests += 1
        assert local_forests == expected_counts[order]
        per_order[str(order)] = {
            "unlabeled_forests": local_forests,
            "ordered_mark_pairs": local_marked,
            "parent_cells": local_cells,
            "negative_g6": local_negative,
        }
        total_forests += local_forests
        total_marked += local_marked
        total_cells += local_cells
        print("INDEPENDENT_FINITE_N7_G6", order, local_forests, local_cells, local_negative, flush=True)

    assert negatives == 0
    return {
        "orders": [2,10],
        "unlabeled_forests": total_forests,
        "ordered_mark_pairs": total_marked,
        "parent_cells": total_cells,
        "negative_g6": negatives,
        "minimum": minimum,
        "minimum_witness": minimum_witness,
        "mode_counts": modes,
        "mode_minima": mode_minima,
        "per_order": per_order,
        "ordered_stream_sha256": digest.hexdigest().upper(),
    }


def main():
    actual = {
        "producer_source": sha256(PRODUCER_SOURCE),
        "producer_report": sha256(PRODUCER_REPORT),
        "finite_source": sha256(FINITE_SOURCE),
        "finite_report": sha256(FINITE_REPORT),
        "reconstruction_source": sha256(RECON_SOURCE),
        "reconstruction_report": sha256(RECON_REPORT),
    }
    assert actual == EXPECTED
    producer = json.loads(PRODUCER_REPORT.read_text(encoding="utf-8"))
    finite_producer = json.loads(FINITE_REPORT.read_text(encoding="utf-8"))
    assert producer["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G6_ROOT"
    assert finite_producer["marker"] == "PASS_EXACT_ISO_N7_BUNDLE_G6_FINITE_N2_10_ROOT"

    coefficients = reconstruct_coefficients()
    generic_g6 = sp.factor(coefficients[6])
    n, q, eu, ev = sp.symbols("n q epsilon_u epsilon_v", nonnegative=True)
    structural = {}
    for name in "EUVW":
        structural[sp.Symbol(f"c{name}0")] = 1
        structural[sp.Symbol(f"d{name}0")] = 1
    structural.update({
        sp.Symbol("cE1"): n, sp.Symbol("cU1"): n-1,
        sp.Symbol("cV1"): n-1, sp.Symbol("cW1"): n-2,
        sp.Symbol("dE1"): q, sp.Symbol("dU1"): q-eu,
        sp.Symbol("dV1"): q-ev, sp.Symbol("dW1"): q-eu-ev,
    })
    raw = sp.factor(generic_g6.subs(structural))

    w2,w3,w4,w5,w6 = sp.symbols("W2 W3 W4 W5 W6", nonnegative=True)
    a2,a3,a4,a5,a6 = sp.symbols("A2 A3 A4 A5 A6", nonnegative=True)
    b2,b3,b4,b5,b6 = sp.symbols("B2 B3 B4 B5 B6", nonnegative=True)
    z2,z3,z4,z5,z6 = sp.symbols("Z2 Z3 Z4 Z5 Z6", nonnegative=True)
    de5,du4,du5,dv4,dv5,dw3,dw4,dw5 = sp.symbols(
        "DE5 DU4 DU5 DV4 DV5 DW3 DW4 DW5", nonnegative=True
    )
    partition = {}
    for rank, values in {
        2:(w2,a2,b2,z2), 3:(w3,a3,b3,z3), 4:(w4,a4,b4,z4),
        5:(w5,a5,b5,z5), 6:(w6,a6,b6,z6),
    }.items():
        w,a,b,z = values
        partition.update({
            sp.Symbol(f"cW{rank}"):w,
            sp.Symbol(f"cU{rank}"):w+a,
            sp.Symbol(f"cV{rank}"):w+b,
            sp.Symbol(f"cE{rank}"):w+a+b+z,
        })
    partition.update({
        sp.Symbol("dE5"):de5,
        sp.Symbol("dU4"):du4, sp.Symbol("dU5"):du5,
        sp.Symbol("dV4"):dv4, sp.Symbol("dV5"):dv5,
        sp.Symbol("dW3"):dw3, sp.Symbol("dW4"):dw4, sp.Symbol("dW5"):dw5,
    })
    partitioned = sp.factor(raw.subs(partition))

    order_w = n-2
    floor_w2 = (n-3)*(n-4)/2
    floor_w3 = (n-3)*(n-4)*(n-8)/6
    sx, sy = w2-floor_w2, w3-floor_w3
    s_w4, s_w5, s_w6 = (n-5)*w3-4*w4, (n-6)*w4-5*w5, (n-7)*w5-6*w6
    s_dw_in_w = w3-dw3
    s_a5,s_a6 = (n-5)*a4-4*a5, (n-6)*a5-5*a6
    s_b5,s_b6 = (n-5)*b4-4*b5, (n-6)*b5-5*b6
    s_z5,s_z6 = (n-4)*z4-3*z5, (n-5)*z5-4*z6
    choose = lambda order,rank: sp.prod(order-j for j in range(rank))/sp.factorial(rank)
    c3,c4,c5 = choose(n,3),choose(n,4),choose(n,5)
    s_de5,s_du4,s_dv4 = c5-de5,c4-du4,c4-dv4
    s_dw3,s_dw5 = c3-dw3,c5-dw5
    k_a4=(33*n**2-403*n+475)/5
    k_z4=(19*n**2-76*n+162)/3
    gradient_x=42*n**3-285*n**2+1141*n-622
    gradient_y=7*n**3-90*n**2+419*n-419
    k_w4=7*n**2+20*n+63
    original_lower=(51*n**5+1345*n**4-15500*n**3+68615*n**2-131431*n+123870)/30
    cone_lower=sp.expand(original_lower-8*floor_w2*floor_w3)
    cone_grad_x=sp.expand(gradient_x-8*floor_w3)
    cone_grad_y=sp.expand(gradient_y-8*floor_w2)
    q_a2=42*w4+8*dw3
    d_payment=sp.expand(
        8*(s_de5+s_dw5)+(8*n-7)*(s_du4+s_dv4)+(2*n-4)*s_dw3
        +14*(du5+dv5)+(14*n+4)*dw4
    )
    decomposition=sp.expand(
        cone_lower+260*a2*b2+105*(a2*b3+a3*b2)+2*(a2*b4+a4*b2)+40*a3*b3
        +(a2+b2)*(320*w2+18*w3+480*n-450)
        +(2*order_w-a2-b2)*q_a2+order_w*(21*s_w4+16*s_dw_in_w)
        +(a3+b3)*(220*w2+42*w3+320*n-435)+(a4+b4)*(42*sx+k_a4)
        +2*(36*n+59)*(s_a5+s_b5)/5+78*(s_a6+s_b6)/5
        +(11*n+44)*w3*(1-z2)+z2*(11*s_w4+8*s_dw_in_w)
        +z2*(35*w2+220*n-240)+z3*(105*w2+260*n-300)+2*w3*z3
        +z4*(40*sx+k_z4)+(32*n**2-33*n+193)*z4/3
        +(3*n+sp.Rational(40,3))*s_z5+11*s_z6
        +cone_grad_x*sx+cone_grad_y*sy+345*sx**2+244*sx*sy+42*sy**2
        +8*w2*s_dw_in_w+k_w4*s_w4+(28*n+38)*s_w5+20*s_w6+d_payment
    )
    residual=sp.factor(sp.expand(partitioned-decomposition))
    assert residual == 0
    report_locals={str(symbol):symbol for symbol in partitioned.free_symbols}
    assert sp.expand(
        decomposition-sp.sympify(
            producer["n_at_least_11"]["exact_nonnegative_decomposition"],
            locals=report_locals,
        )
    ) == 0

    r=sp.Symbol("r", integer=True, nonnegative=True)
    shifted={
        "lower":sp.expand((30*cone_lower).subs(n,r+11)),
        "gradient_x":sp.expand(cone_grad_x.subs(n,r+11)),
        "gradient_y":sp.expand(cone_grad_y.subs(n,r+11)),
        "5_k_a4":sp.expand((5*k_a4).subs(n,r+11)),
        "3_k_z4":sp.expand((3*k_z4).subs(n,r+11)),
        "extra_z4":sp.expand((32*n**2-33*n+193).subs(n,r+11)),
    }
    assert all(all(value>=0 for value in sp.Poly(poly,r).all_coeffs())
               for poly in shifted.values())

    finite = independent_finite_census(generic_g6)
    for key in (
        "orders","unlabeled_forests","ordered_mark_pairs","parent_cells",
        "negative_g6","minimum","minimum_witness","mode_counts","mode_minima",
        "per_order","ordered_stream_sha256",
    ):
        assert finite[key] == finite_producer[key], key
    assert finite["ordered_stream_sha256"] == producer["finite_join"]["stream_sha256"]

    structural_proofs={
        "W2_floor":(
            "W is a forest on m=n-2 vertices, so e(W)<=m-1 and "
            "W2=C(m,2)-e(W)>=(n-3)(n-4)/2."
        ),
        "W3_floor":(
            "In a forest, W3=C(m,3)-e(W)(m-2)+sum_v C(deg(v),2). Dropping "
            "the last nonnegative term and using e(W)<=m-1 gives "
            "W3>=(n-3)(n-4)(n-8)/6."
        ),
        "consecutive_counts":(
            "Double-count (independent (k+1)-set, contained k-set). For W use "
            "order n-2; after a fixed mark A and B live in induced graphs of "
            "order A2,B2<=n-2; after both marks Z lives in an induced graph of "
            "order at most n-2. This proves every displayed W/A/B/Z slack."
        ),
        "D_W_containment":(
            "D-W is induced on a vertex subset of W, so the identity injection "
            "sends each independent triple counted by DW3 to one counted by W3."
        ),
        "marked_caps":(
            "A2,B2<=n-2, hence 2(n-2)-A2-B2>=0; Z2 is the Boolean indicator "
            "that the two marks form an independent pair."
        ),
        "D_caps":(
            "Each D row is induced on at most n vertices; its independent k-sets "
            "inject into all k-subsets of an n-element set."
        ),
        "shifted_positivity":(
            "For r=n-11>=0, every coefficient of the shifted cone lower bound, "
            "both cone gradients, 5*kA4, 3*kZ4, and the extra Z4 multiplier is "
            "nonnegative; all remaining multipliers/counts are visibly nonnegative."
        ),
        "corrected_residual_payment":(
            "The formerly exposed residual is absorbed exactly by expanding "
            "-8*W2*DW3 about the W2/W3 floors: cone lower/gradients are reduced, "
            "252*sx*sy becomes 244*sx*sy, and the valid reserve "
            "8*W2*(W3-DW3) is added, together with 2*W3*Z3 and the positive "
            "extra Z4 multiplier. The final symbolic residual is zero."
        ),
    }
    report={
        "marker":MARKER,
        "theorem_audited":producer["theorem"],
        "independent_reconstruction":{
            "Gamma_nodes":13,
            "Newton_coefficient":"g6",
            "marked_partition_reconstructed":True,
            "corrected_decomposition_residual":str(residual),
            "shifted_positive_checks":{key:str(value) for key,value in shifted.items()},
        },
        "finite_n2_10_independent_replay":finite,
        "large_n_at_least_11":{
            "strict_lower_bound":str(sp.factor(cone_lower)),
            "all_order_structural_proofs":structural_proofs,
            "decomposition_identity":True,
        },
        "join_scope":{
            "finite":"every C-order 2..10, every unlabeled forest, ordered distinct mark pair, and canonical parent/no-parent choice",
            "large":"every forest-realizable marked bundle cell with C-order n>=11",
            "marks_force_minimum_order":2,
            "no_gap":True,
            "unresolved_orders":[],
        },
        "dependencies_sha256":EXPECTED,
        "scope_guard":(
            "Universal exact rank-seven bundle sign only for g6. The finite "
            "census is used only for orders 2..10 and is not promoted beyond "
            "that range. Coefficients g1..g5, the full bundle lemma, all-N7, "
            "and Erdos Problem 993 remain open."
        ),
        "source_sha256":sha256(SOURCE),
    }
    encoded=json.dumps(report,indent=2,sort_keys=True)+"\n"
    OUTPUT.write_text(encoded,encoding="utf-8",newline="\n")
    print(json.dumps({
        "marker":MARKER,
        "finite_parent_cells":finite["parent_cells"],
        "finite_minimum":finite["minimum"],
        "finite_stream_sha256":finite["ordered_stream_sha256"],
        "large_residual":str(residual),
        "source_sha256":report["source_sha256"],
        "report_sha256":hashlib.sha256(encoded.encode()).hexdigest().upper(),
    },indent=2,sort_keys=True))
    print(MARKER)


if __name__ == "__main__":
    main()
