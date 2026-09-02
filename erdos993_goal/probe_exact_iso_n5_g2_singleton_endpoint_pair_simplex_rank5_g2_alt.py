#!/usr/bin/env python3
"""Exact two-mark simplex probe for singleton-endpoint rank-five g2.

The pair-motif lower cone is jointly concave in the whole-row wedge count and
the two marked neighbor-excess counts.  This probe evaluates every vertex of
their universal forest box and maps the remaining order/edge/degree region to
one homogeneous simplex.  Passing is a sufficient exact certificate for the
selected order base, but this exploratory source itself makes no theorem
claim.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
import hashlib
import itertools
import json
import math
from pathlib import Path

import sympy as sp

from derive_iso_n5_g2_singleton_endpoint_pair_motif_cone_rank5_g2_alt import (
    derive_pair_cone,
)


HERE = Path(__file__).resolve().parent
MARKER = "PROBE_EXACT_ISO_N5_G2_SINGLETON_ENDPOINT_PAIR_SIMPLEX_RANK5_G2_ALT"


def choose(value, rank):
    return sp.prod(value - offset for offset in range(rank)) / sp.factorial(rank)


def compositions(total: int, parts: int):
    if parts == 1:
        yield (total,)
        return
    for first in range(total + 1):
        for rest in compositions(total - first, parts - 1):
            yield (first, *rest)


def multinomial(exponents):
    out = math.factorial(sum(exponents))
    for exponent in exponents:
        out //= math.factorial(exponent)
    return out


def homogeneous_coefficients(polynomial: sp.Poly, elevation: int = 0):
    terms = polynomial.terms()
    degree = max(sum(monomial[1:]) for monomial, _ in terms) + elevation
    coefficients = defaultdict(lambda: sp.Rational(0))
    for monomial, coefficient in terms:
        npower = monomial[0]
        geometry = monomial[1:]
        missing = degree - sum(geometry)
        for added in compositions(missing, len(geometry) + 1):
            factor = multinomial(added)
            key = (
                npower,
                *(geometry[index] + added[index] for index in range(len(geometry))),
                added[-1],
            )
            coefficients[key] += coefficient * factor
    return {key: value for key, value in coefficients.items() if value}, degree


def branches():
    rows = []
    for zu, zv in itertools.product((0, 1), repeat=2):
        geometries = [(0, 0)]
        if zu and zv:
            geometries += [(1, 0), (0, 1)]
        for adjacent, common in geometries:
            endpoint_u = ("Z",) if not zu else ("L", "U")
            endpoint_v = ("Z",) if not zv else ("L", "U")
            for eu, ev, wedge in itertools.product(
                endpoint_u, endpoint_v, ("L", "U")
            ):
                rows.append((zu, zv, adjacent, common, eu, ev, wedge))
    assert len(rows) == 34 and len(set(rows)) == 34
    return tuple(rows)


def mapped_polynomial(branch, order_base: int, q3_scale):
    zu, zv, adjacent, common, endpoint_u, endpoint_v, wedge_endpoint = branch
    cone, names = derive_pair_cone(
        q3_scale=q3_scale,
        q3_w_scale=sp.Rational(3, 4),
        positive_uv=zu * zv,
    )
    n = names["n"]
    e = names["edge_count"]
    du = names["degree_u"]
    dv = names["degree_v"]
    wedges = names["C_wedges_E"]
    xu = names["C_neighbor_excess_u"]
    xv = names["C_neighbor_excess_v"]

    N, X, Y, R = sp.symbols("N X Y R", nonnegative=True)
    nn = N + order_base
    incident_base = zu + zv - adjacent
    total = nn - 1 - incident_base
    x = zu * total * X
    y = zv * total * Y
    remainder = total * R
    degree_u = zu + x
    degree_v = zv + y
    edge_count = incident_base + x + y + remainder

    lower_u = adjacent * (degree_v - 1) + common
    lower_v = adjacent * (degree_u - 1) + common
    upper_u = edge_count - degree_u
    upper_v = edge_count - degree_v
    endpoint_value_u = {
        "Z": sp.Integer(0), "L": lower_u, "U": upper_u,
    }[endpoint_u]
    endpoint_value_v = {
        "Z": sp.Integer(0), "L": lower_v, "U": upper_v,
    }[endpoint_v]
    wedge_lower = choose(degree_u, 2) + choose(degree_v, 2) + common
    # In a forest with e edges and c nontrivial components,
    # sum_(d>0)(d-1)=e-c.  After the selected excesses x,y are removed,
    # convexity concentrates the remaining excess at one unmarked vertex.
    # Here c>=1 whenever a selected mark has positive degree.  When both
    # selected marks are isolated, using remainder instead of remainder-1
    # safely includes the edgeless face without a case split.
    unmarked_excess_cap = remainder + max(0, incident_base - 1)
    wedge_upper = (
        choose(degree_u, 2) + choose(degree_v, 2)
        + unmarked_excess_cap * (unmarked_excess_cap + 1) / 2
    )
    wedge_value = {"L": wedge_lower, "U": wedge_upper}[wedge_endpoint]
    substitution = {
        n: nn,
        e: edge_count,
        du: degree_u,
        dv: degree_v,
        names["adjacent"]: adjacent,
        names["C_common_neighbor"]: common,
        wedges: wedge_value,
        xu: endpoint_value_u,
        xv: endpoint_value_v,
    }
    return sp.Poly(sp.expand(cone.subs(substitution)), N, X, Y, R)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--order-base", type=int, default=14)
    parser.add_argument("--max-elevation", type=int, default=4)
    parser.add_argument("--q3-scale", choices=("3/4", "1", "auto"), default="auto")
    args = parser.parse_args()
    if args.order_base < 2 or args.max_elevation < 0:
        raise ValueError("invalid order base/elevation")

    records = []
    digest = hashlib.sha256()
    for index, branch in enumerate(branches()):
        scale_options = {
            "3/4": (sp.Rational(3, 4),),
            "1": (sp.Integer(1),),
            "auto": (sp.Rational(3, 4), sp.Integer(1)),
        }[args.q3_scale]
        attempts = []
        passed = False
        for scale in scale_options:
            polynomial = mapped_polynomial(branch, args.order_base, scale)
            for elevation in range(args.max_elevation + 1):
                coefficients, degree = homogeneous_coefficients(polynomial, elevation)
                negative = sum(1 for value in coefficients.values() if value < 0)
                row = {
                    "q3_scale": str(scale),
                    "elevation": elevation,
                    "simplex_degree": degree,
                    "mapped_terms": len(polynomial.terms()),
                    "coefficients": len(coefficients),
                    "negative": negative,
                    "minimum": str(min(coefficients.values())),
                }
                attempts.append(row)
                if not negative:
                    passed = True
                    break
            if passed:
                break
        record = {
            "index": index,
            "branch": "/".join(map(str, branch)),
            "passed": passed,
            "attempts": attempts,
        }
        records.append(record)
        digest.update(json.dumps(record, sort_keys=True, separators=(",", ":")).encode())
        print(json.dumps({
            "progress": f"{index + 1}/{len(branches())}",
            "branch": record["branch"],
            "passed": passed,
            "last": attempts[-1],
        }, sort_keys=True), flush=True)

    report = {
        "marker": MARKER,
        "order_base": args.order_base,
        "branches": len(records),
        "passing": sum(row["passed"] for row in records),
        "failing": sum(not row["passed"] for row in records),
        "records_sha256": digest.hexdigest().upper(),
        "records": records,
        "scope": "Exact sufficient relaxation probe only; no theorem claim.",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    output = HERE / (
        "iso_n5_g2_singleton_endpoint_pair_simplex_probe_"
        f"n{args.order_base}_rank5_g2_alt_20260830.json"
    )
    raw = json.dumps(report, indent=2, sort_keys=True) + "\n"
    output.write_text(raw, encoding="utf-8", newline="\n")
    print(json.dumps({key: report[key] for key in (
        "marker", "order_base", "branches", "passing", "failing", "records_sha256"
    )}, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
