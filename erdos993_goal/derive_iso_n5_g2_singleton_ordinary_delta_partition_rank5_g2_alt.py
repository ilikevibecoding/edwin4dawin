#!/usr/bin/env python3
"""Exact root-deletion increment for singleton-ordinary rank-five g2.

Let G be a forest with distinct marks u,v and an ordinary vertex p.  Put
F=G-p and H=G-p-N_G(p).  For every one of the four marked deletion rows,

    C = D + x E,

where D is the row from F and E the corresponding row from H.  This source
reconstructs the exact identity

    g2(C,D) = g2(D,D) + Delta(D,E)

and expands Delta in mark-occupation coordinates for all four possibilities
for survival of u,v in H.  The finite atlas census is discovery evidence only;
no sign theorem for Delta is asserted here.
"""

from __future__ import annotations

import hashlib
import itertools
import json
from pathlib import Path

import networkx as nx
import sympy as sp

from derive_iso_n5_bundle_g2_compact_polar_split_rank5_g2_alt import raw_g2
from derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein import (
    four_rows,
    numeric_g1_g2,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n5_g2_singleton_ordinary_delta_partition_exact_rank5_g2_alt_20260830.json"
MARKER = "PASS_EXACT_ISO_N5_G2_SINGLETON_ORDINARY_DELTA_PARTITION_RANK5_G2_ALT"


def at(row, rank):
    return row[rank] if 0 <= rank < len(row) else sp.Integer(0)


def shift(row, amount=1):
    return tuple(at(row, rank - amount) for rank in range(len(row)))


def add(left, right):
    return tuple(sp.expand(x + y) for x, y in zip(left, right))


def scale(row, scalar):
    return tuple(sp.expand(scalar * x) for x in row)


def occupation_rows(a, b, c, k, epsilon):
    """Rows (E,U,V,W) from neither/v-only/u-only/both occupations."""
    return (
        tuple(sp.expand(
            at(a, rank) + at(b, rank - 1) + at(c, rank - 1)
            + epsilon * at(k, rank - 2)
        ) for rank in range(7)),
        tuple(sp.expand(at(a, rank) + at(b, rank - 1)) for rank in range(7)),
        tuple(sp.expand(at(a, rank) + at(c, rank - 1)) for rank in range(7)),
        tuple(a),
    )


def expression_record(expression):
    expression = sp.expand(expression)
    if expression == 0:
        return {
            "expanded_terms": 0,
            "negative_scalar_coefficients": 0,
            "factored_sha256": hashlib.sha256(b"0").hexdigest().upper(),
        }
    polynomial = sp.Poly(expression, *sorted(expression.free_symbols, key=str))
    return {
        "expanded_terms": len(polynomial.terms()),
        "negative_scalar_coefficients": sum(
            coefficient.is_negative is True for coefficient in polynomial.coeffs()
        ),
        "factored_sha256": hashlib.sha256(
            str(sp.factor(expression)).encode()
        ).hexdigest().upper(),
    }


def symbolic_certificate():
    drows = tuple(tuple(sp.symbols(f"d{name}0:7")) for name in "EUVW")
    erows = tuple(tuple(sp.symbols(f"e{name}0:7")) for name in "EUVW")
    crows = tuple(add(drow, shift(erow)) for drow, erow in zip(drows, erows))
    singleton = sp.expand(raw_g2(crows, drows))
    no_parent = sp.expand(raw_g2(drows, drows))
    delta = sp.expand(singleton - no_parent)

    t = sp.symbols("t")
    scaled_c = tuple(
        add(drow, scale(shift(erow), t)) for drow, erow in zip(drows, erows)
    )
    scaled_delta = sp.Poly(
        sp.expand(raw_g2(scaled_c, drows) - no_parent), t
    )
    assert scaled_delta.degree() == 2
    linear = sp.expand(scaled_delta.coeff_monomial(t))
    quadratic = sp.expand(scaled_delta.coeff_monomial(t**2))
    assert sp.expand(delta - linear - quadratic) == 0

    # Independent occupation parametrizations for F and H.  In H, a missing
    # mark simply suppresses the corresponding occupied category.
    da = tuple(sp.symbols("a0:7"))
    db = tuple(sp.symbols("b0:7"))
    dc = tuple(sp.symbols("c0:7"))
    dk = tuple(sp.symbols("k0:7"))
    ha = tuple(sp.symbols("A0:7"))
    hb = tuple(sp.symbols("B0:7"))
    hc = tuple(sp.symbols("C0:7"))
    hk = tuple(sp.symbols("K0:7"))
    epsilon = sp.symbols("epsilon")
    d_occupation = occupation_rows(da, db, dc, dk, epsilon)

    cases = {}
    for survive_u, survive_v in ((1, 1), (0, 1), (1, 0), (0, 0)):
        h_occupation = occupation_rows(
            ha,
            scale(hb, survive_v),
            scale(hc, survive_u),
            scale(hk, survive_u * survive_v),
            epsilon,
        )
        substitutions = {}
        for generic, actual in zip(drows + erows, d_occupation + h_occupation):
            substitutions.update(dict(zip(generic, actual)))
        reduced = sp.expand(delta.subs(substitutions))
        key = f"u{survive_u}_v{survive_v}"
        cases[key] = expression_record(reduced)
        cases[key]["symmetric_partner"] = (
            "self" if survive_u == survive_v
            else f"u{survive_v}_v{survive_u}"
        )

    # Literal exchange of the marked U,V rows leaves the increment invariant.
    exchange = {}
    for left, right in (("U", "V"),):
        for rank in range(7):
            exchange[sp.symbols(f"d{left}{rank}")] = sp.symbols(f"d{right}{rank}")
            exchange[sp.symbols(f"d{right}{rank}")] = sp.symbols(f"d{left}{rank}")
            exchange[sp.symbols(f"e{left}{rank}")] = sp.symbols(f"e{right}{rank}")
            exchange[sp.symbols(f"e{right}{rank}")] = sp.symbols(f"e{left}{rank}")
    assert sp.expand(delta.xreplace(exchange) - delta) == 0

    return {
        "identity": "g2(D+xE,D)=g2(D,D)+Delta(D,E)",
        "raw_singleton": expression_record(singleton),
        "no_parent_base": expression_record(no_parent),
        "delta": expression_record(delta),
        "delta_linear_in_E": expression_record(linear),
        "delta_quadratic_in_E": expression_record(quadratic),
        "delta_E_degree": 2,
        "mark_exchange_symmetric": True,
        "occupation_cases": cases,
    }


def finite_census():
    count = 0
    negative_delta = 0
    minimum = None
    minimum_record = None
    singleton_minimum = None
    for graph0 in nx.graph_atlas_g():
        if len(graph0) < 3 or not nx.is_forest(graph0):
            continue
        graph = nx.convert_node_labels_to_integers(graph0)
        graph6 = nx.to_graph6_bytes(graph, header=False).decode().strip()
        for u, v, parent in itertools.permutations(graph, 3):
            crows = four_rows(graph, u, v)
            deleted = graph.copy()
            deleted.remove_node(parent)
            drows = four_rows(deleted, u, v)
            singleton = numeric_g1_g2(crows, drows)[1]
            no_parent = numeric_g1_g2(drows, drows)[1]
            delta = singleton - no_parent
            count += 1
            negative_delta += int(delta < 0)
            record = {
                "order": len(graph),
                "graph6": graph6,
                "marks": [u, v],
                "parent": parent,
                "singleton_g2": singleton,
                "no_parent_g2_of_deleted_forest": no_parent,
                "delta": delta,
            }
            if minimum is None or delta < minimum:
                minimum, minimum_record = delta, record
            if singleton_minimum is None or singleton < singleton_minimum:
                singleton_minimum = singleton
    assert count == 10932
    assert negative_delta == 0
    assert minimum == 2
    return {
        "orders": [3, 7],
        "ordered_distinct_u_v_parent_cells": count,
        "negative_delta_cells": negative_delta,
        "minimum_delta": minimum_record,
        "minimum_singleton_g2": singleton_minimum,
        "role": "finite discovery evidence only; not promoted to an all-order sign theorem",
    }


def main():
    symbolic = symbolic_certificate()
    census = finite_census()
    dependencies = {
        name: hashlib.sha256((HERE / name).read_bytes()).hexdigest().upper()
        for name in (
            "derive_iso_n5_bundle_g2_compact_polar_split_rank5_g2_alt.py",
            "derive_iso_n5_bundle_g12_canonical_configuration_g1_bernstein.py",
        )
    }
    report = {
        "marker": MARKER,
        "symbolic_certificate": symbolic,
        "root_deletion_geometry": (
            "E is the four-row marked independence configuration of H=G-p-N_G(p); "
            "the vertices N_G(p) are pairwise in distinct components of F=G-p."
        ),
        "finite_census": census,
        "dependencies_sha256": dependencies,
        "status": {
            "exact_reduction": "proved",
            "delta_sign": "open all-order; finite evidence is not theorem credit",
            "singleton_ordinary_g2": "not asserted by this artifact",
        },
        "scope": (
            "Exact rank-five singleton-ordinary root-deletion reduction only. "
            "It does not prove Delta>=0, the singleton mode, all five g2 modes, "
            "all N5, or Erdos Problem 993."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "delta_terms": symbolic["delta"]["expanded_terms"],
        "occupation_cases": symbolic["occupation_cases"],
        "finite_cells": census["ordered_distinct_u_v_parent_cells"],
        "finite_minimum_delta": census["minimum_delta"]["delta"],
        "scope": report["scope"],
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
