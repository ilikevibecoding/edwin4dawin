#!/usr/bin/env python3
"""All-order weighted-core cells for the near-star q4<=q3 region.

Let x_v=d(v)-1, N=sum x_v=n-2, m=max x_v, and L=N-m.  For fixed L,
the positive excess weights away from a chosen maximum form a partition of
L.  The nonleaf core is a finite weighted tree.  This script enumerates all
such weighted cores for L through a requested cutoff and proves their q4/q3
margin as a polynomial in N by exact shifted-coefficient certificates.
"""

from __future__ import annotations

import argparse
import hashlib
import itertools
import json
import math
from pathlib import Path

import networkx as nx
import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "q4_q3_dominant_core_cells_exact_root_20260828.json"
N = sp.symbols("N", integer=True, nonnegative=True)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose_poly(value: sp.Expr | int, rank: int) -> sp.Expr:
    return sp.prod(value - j for j in range(rank)) / sp.factorial(rank)


def integer_partitions(total: int, maximum: int | None = None):
    if total == 0:
        yield ()
        return
    if maximum is None or maximum > total:
        maximum = total
    for first in range(maximum, 0, -1):
        for rest in integer_partitions(total - first, first):
            yield (first,) + rest


def q4_q3_margin(core: nx.Graph, weights: tuple[sp.Expr | int, ...]) -> sp.Expr:
    order = N + 2
    b2 = sum(choose_poly(value, 2) for value in weights)
    b3 = sum(choose_poly(value, 3) for value in weights)
    b4 = sum(choose_poly(value, 4) for value in weights)
    edge_product = sum(weights[u] * weights[v] for u, v in core.edges())
    x_surplus = edge_product - (N - 1)
    t_shape = sum(
        choose_poly(weights[u], 2) * weights[v]
        + weights[u] * choose_poly(weights[v], 2)
        for u, v in core.edges()
    )
    p5_shape = sum(
        weights[u] * weights[v]
        for center in core
        for u, v in itertools.combinations(core[center], 2)
    )
    connected_five = b4 + b3 + t_shape + p5_shape
    omega = connected_five - (order - 4)

    i3 = choose_poly(order - 2, 3) + b2
    i4 = choose_poly(order - 3, 4) + (order - 5) * b2 - b3 - x_surplus
    s3 = (
        3 * choose_poly(order - 3, 3)
        + (-2 * order + 11) * b2
        + 3 * b3
        + 3 * x_surplus
    )
    s4 = (
        -24 * omega
        + 18 * x_surplus * order
        - 108 * x_surplus
        + 18 * b3 * order
        - 126 * b3
        - 6 * b2 * order**2
        + 90 * b2 * order
        - 300 * b2
        + order**4
        - 22 * order**3
        + 179 * order**2
        - 638 * order
        + 840
    ) / 6
    margin = sp.cancel(4 * i4 * s3 - 3 * i3 * s4)
    assert sp.denom(margin) == 1
    return sp.Poly(sp.expand(margin), N).as_expr()


def certify_polynomial(
    polynomial: sp.Expr, minimum_n: int, search_extra: int
) -> dict[str, object]:
    poly = sp.Poly(polynomial, N)
    integer_values = []
    for shift in range(minimum_n, minimum_n + search_extra + 1):
        shifted = sp.Poly(sp.expand(poly.as_expr().subs(N, N + shift)), N)
        coefficients = [int(value) for value in reversed(shifted.all_coeffs())]
        # reversed(all_coeffs) lists coefficients in increasing power order.
        if all(value >= 0 for value in coefficients):
            for value_n in range(minimum_n, shift):
                value = int(poly.eval(value_n))
                assert value >= 0
                integer_values.append([value_n, value])
            return {
                "minimum_N": minimum_n,
                "coefficient_shift_N": shift,
                "shifted_coefficients_increasing_power": coefficients,
                "finite_prefix_values": integer_values,
                "degree": poly.degree(),
            }
    raise AssertionError(
        f"no nonnegative shifted-power certificate by N={minimum_n+search_extra}: "
        f"{sp.factor(poly.as_expr())}"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-complement-mass", type=int, default=8)
    parser.add_argument("--shift-search-extra", type=int, default=80)
    args = parser.parse_args()
    assert 1 <= args.max_complement_mass <= 12

    totals = {
        "complement_masses": args.max_complement_mass,
        "partitions": 0,
        "underlying_core_trees": 0,
        "weighted_label_cells": 0,
        "admissible_cells": 0,
        "inadmissible_cells": 0,
        "certified_cells": 0,
        "negative_finite_prefix_values": 0,
    }
    per_l = []
    maximum_shift = None
    smallest_value = None
    stream = hashlib.sha256()

    for complement_mass in range(1, args.max_complement_mass + 1):
        local = {
            "L": complement_mass,
            "partitions": 0,
            "underlying_core_trees": 0,
            "weighted_label_cells": 0,
            "admissible_cells": 0,
            "certified_cells": 0,
            "maximum_coefficient_shift_N": 0,
        }
        for partition in integer_partitions(complement_mass):
            totals["partitions"] += 1
            local["partitions"] += 1
            core_order = len(partition) + 1
            for core_index, core in enumerate(nx.nonisomorphic_trees(core_order)):
                totals["underlying_core_trees"] += 1
                local["underlying_core_trees"] += 1
                graph6 = nx.to_graph6_bytes(core, header=False).decode().strip()
                for dominant in core:
                    other_vertices = tuple(v for v in core if v != dominant)
                    for assignment in sorted(set(itertools.permutations(partition))):
                        totals["weighted_label_cells"] += 1
                        local["weighted_label_cells"] += 1
                        fixed = dict(zip(other_vertices, assignment, strict=True))
                        if any(core.degree(v) > fixed[v] + 1 for v in other_vertices):
                            totals["inadmissible_cells"] += 1
                            continue

                        minimum_n = max(
                            4,
                            complement_mass + max(partition),
                            complement_mass + core.degree(dominant) - 1,
                        )
                        weights: list[sp.Expr | int] = [0] * core_order
                        weights[dominant] = N - complement_mass
                        for vertex, value in fixed.items():
                            weights[vertex] = value
                        polynomial = q4_q3_margin(core, tuple(weights))
                        certificate = certify_polynomial(
                            polynomial, minimum_n, args.shift_search_extra
                        )
                        totals["admissible_cells"] += 1
                        totals["certified_cells"] += 1
                        local["admissible_cells"] += 1
                        local["certified_cells"] += 1
                        shift = int(certificate["coefficient_shift_N"])
                        local["maximum_coefficient_shift_N"] = max(
                            local["maximum_coefficient_shift_N"], shift
                        )
                        witness = {
                            "L": complement_mass,
                            "partition": list(partition),
                            "core_graph6": graph6,
                            "core_index": core_index,
                            "dominant_vertex": dominant,
                            "assignment": list(assignment),
                            "minimum_N": minimum_n,
                            "coefficient_shift_N": shift,
                            "factorization": str(sp.factor(polynomial)),
                        }
                        if maximum_shift is None or shift > maximum_shift[0]:
                            maximum_shift = (shift, witness)

                        candidates = [minimum_n, shift]
                        candidates.extend(
                            value[0] for value in certificate["finite_prefix_values"]
                        )
                        for value_n in sorted(set(candidates)):
                            value = int(sp.Poly(polynomial, N).eval(value_n))
                            assert value >= 0
                            if smallest_value is None or value < smallest_value[0]:
                                smallest_value = (value, value_n, witness)

                        coefficient_text = ",".join(
                            map(str, certificate["shifted_coefficients_increasing_power"])
                        )
                        stream.update(
                            (
                                f"{complement_mass}|{partition}|{graph6}|{dominant}|"
                                f"{assignment}|{minimum_n}|{shift}|{coefficient_text}\n"
                            ).encode("ascii")
                        )
        per_l.append(local)

    assert totals["admissible_cells"] == totals["certified_cells"]
    report = {
        "status": "PASS_EXACT_ALL_ORDER_Q4_AT_MOST_Q3_DOMINANT_CORE_CELLS",
        "theorem": {
            "scope": (
                "every finite tree with N=n-2, m=max_v(d(v)-1), and "
                f"1<=N-m<={args.max_complement_mass}"
            ),
            "statement": "4*i4(T)*s3(T)-3*i3(T)*s4(T)>=0, hence q4<=q3",
            "coverage": (
                "the positive excess weights off a maximum vertex partition L=N-m; "
                "all admissible weighted nonleaf cores are enumerated"
            ),
            "all_order_reason": (
                "each fixed weighted core has one unbounded dominant weight N-L; "
                "its exact margin is certified by a nonnegative shifted-power "
                "polynomial plus a finite exact prefix"
            ),
        },
        "parameters": {
            "max_complement_mass": args.max_complement_mass,
            "shift_search_extra": args.shift_search_extra,
        },
        "totals": totals,
        "per_complement_mass": per_l,
        "maximum_shift": maximum_shift,
        "smallest_checked_boundary_value": smallest_value,
        "ordered_certificate_stream_sha256": stream.hexdigest().upper(),
        "scope_warning": (
            "This proves q4<=q3 only in the stated dominant-vertex region, "
            "not for every tree, not the later-rank envelope, and not Erdos #993."
        ),
        "source": Path(__file__).name,
        "source_sha256": sha256(Path(__file__)),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(json.dumps(totals, indent=2))
    print(f"maximum_shift={maximum_shift[0]}")
    print(f"ordered_certificate_stream_sha256={stream.hexdigest().upper()}")
    print(f"report={OUTPUT}")


if __name__ == "__main__":
    main()
