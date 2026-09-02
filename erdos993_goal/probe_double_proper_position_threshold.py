#!/usr/bin/env python3
"""Probe the threshold under both proper-position relations of the real pair.

For the defect-three endpoint, h is in proper position with both g and g'.
After factoring the common double boundary root, h/g has a positive-residue
representation, so h is a positive weighted directional derivative of g in
its nonzero root factors.  This script samples that cone exactly, retains the
members that also interlace g', and tests the high-derivative target.
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

import sympy as sp


X, Y, q = sp.symbols("X Y q")
OUT = Path("double_proper_position_threshold_probe_20260802.json")
RNG = random.Random(993_20260802 + 2)


def root_intervals(poly: sp.Poly) -> list[tuple[sp.Rational, sp.Rational]]:
    raw = poly.intervals(eps=sp.Rational(1, 10**16))
    result = [(sp.Rational(ab[0]), sp.Rational(ab[1])) for ab, mult in raw for _ in range(mult)]
    assert len(result) == poly.degree()
    return result


def alternating_p_then_q(p: sp.Poly, qpoly: sp.Poly) -> bool:
    ps = root_intervals(p)
    qs = root_intervals(qpoly)
    if len(ps) != len(qs):
        return False
    return all(ps[i][1] < qs[i][0] for i in range(len(ps))) and all(
        qs[i][1] < ps[i + 1][0] for i in range(len(ps) - 1)
    )


def roots_for_g(N: int, variant: int) -> list[sp.Rational]:
    if variant == 0:
        return [sp.Rational(-i) for i in range(N - 2, 0, -1)]
    if variant == 1:
        return [sp.Rational(-(i*i)) for i in range(N - 2, 0, -1)]
    if variant == 2:
        return [sp.Rational(-(2**i)) for i in range(N - 3, -1, -1)]
    return sorted(sp.Rational(-(i*i + 2*i + (i % 3))) for i in range(1, N - 1))


def weights(k: int, sample: int, total: int) -> list[sp.Rational]:
    if sample == 0:
        raw = [sp.Rational(1)] * k
    elif sample == 1:
        raw = [sp.Rational(10**(i % 6)) for i in range(k)]
    elif sample == 2:
        raw = [sp.Rational(10**((k - 1 - i) % 6)) for i in range(k)]
    elif sample == 3:
        raw = [sp.Rational(1, 10**(i % 6)) for i in range(k)]
    else:
        raw = [sp.Rational(RNG.randint(1, 10**7), RNG.randint(1, 10**4)) for _ in range(k)]
    scale = sp.Rational(total, 1) / sum(raw)
    return [sp.cancel(scale * value) for value in raw]


def directional_h(g: sp.Expr, nonzero_roots: list[sp.Rational], ws: list[sp.Rational]) -> sp.Expr:
    a = sp.prod(X - root for root in nonzero_roots)
    return sp.expand(X**2 * sum(
        weight * sp.cancel(a / (X - root))
        for root, weight in zip(nonzero_roots, ws, strict=True)
    ))


def derivative_square(poly: sp.Expr, order: int) -> sp.Expr:
    return sp.expand(sum(
        sp.binomial(order, a) * sp.diff(poly, X, a)
        * sp.diff(poly.subs(X, Y), Y, order-a)
        for a in range(order+1)
    ))


def endpoint(g: sp.Expr, h: sp.Expr, d: int) -> sp.Expr:
    return sp.expand(derivative_square(g, d) - derivative_square(h, d-2))


def line_record(poly: sp.Expr) -> dict[str, object]:
    ax, ay = RNG.randint(-250, 150), RNG.randint(-250, 150)
    bx, by = RNG.randint(1, 55), RNG.randint(1, 55)
    raw = sp.Poly(sp.expand(poly.subs({X: ax+bx*q, Y: ay+by*q})), q)
    vals = [sp.Rational(raw.nth(i)) for i in range(raw.degree()+1)]
    den = sp.ilcm(*[v.q for v in vals])
    ints = [int(v*den) for v in vals]
    gcd = abs(math.gcd(*ints))
    coeffs = [v//gcd for v in ints]
    line = sp.Poly(sum(v*q**i for i,v in enumerate(coeffs)), q)
    real = int(line.count_roots(-sp.oo, sp.oo))
    return {
        "X": f"{ax}+{bx}q", "Y": f"{ay}+{by}q",
        "degree": line.degree(), "real_roots": real,
        "nonreal_roots": line.degree()-real,
        "primitive_integer_coefficients_ascending": coeffs,
    }


def main() -> None:
    cases = []
    rejected = 0
    lines = 0
    first_failure = None
    for N in range(4, 13):
        d0 = (N+3)//2
        for variant in range(4):
            nonzero = roots_for_g(N, variant)
            g = sp.expand(X**2 * sp.prod(X-r for r in nonzero))
            gp = sp.diff(g, X)
            p0 = sp.Poly(sp.cancel(gp/X), X)
            for sample in range(14):
                ws = weights(N-2, sample, N)
                h = directional_h(g, nonzero, ws)
                assert sp.Poly(h, X).LC() == sp.Poly(gp, X).LC()
                q0 = sp.Poly(sp.cancel(h/X), X)
                # h/g is automatically a same-sign partial-fraction sum.
                # Retain only h/g' in the correct proper-position cone.
                if not alternating_p_then_q(p0, q0):
                    rejected += 1
                    continue
                target = endpoint(g, h, d0)
                case = {
                    "N": N, "d0": d0, "g_variant": variant,
                    "g_nonzero_roots": [str(v) for v in nonzero],
                    "weight_sample": sample, "weights": [str(v) for v in ws],
                    "line_tests": 0, "failures": 0,
                }
                for _ in range(10):
                    record = line_record(target)
                    lines += 1
                    case["line_tests"] += 1
                    if record["nonreal_roots"]:
                        case["failures"] += 1
                        first_failure = {
                            "case": case, "line": record,
                            "g": str(g), "h": str(h),
                            "proper_position_certificates": [
                                "h/g=sum_i weight_i/(X-root_i), all weights positive",
                                "exact isolating intervals alternate for h/X and g'/X",
                            ],
                        }
                        break
                cases.append(case)
                print(
                    f"N={N} g={variant} weights={sample} d0={d0} "
                    f"fail={case['failures']}", flush=True
                )
                if first_failure:
                    break
            if first_failure:
                break
        if first_failure:
            break
    report = {
        "kind": "double_proper_position_threshold_probe",
        "date": "2026-08-02",
        "status": "COUNTEREXAMPLE" if first_failure else "NO_COUNTEREXAMPLE_IN_EXACT_PROBE",
        "hypotheses": (
            "g and h share a double largest root; leading(h)=leading(g'); "
            "h is in proper position with both g and g'."
        ),
        "accepted_cases": len(cases), "rejected_weight_samples": rejected,
        "exact_threshold_line_tests": lines, "cases": cases,
        "first_threshold_failure": first_failure,
    }
    OUT.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({
        "status": report["status"], "accepted_cases": len(cases),
        "rejected_weight_samples": rejected, "exact_threshold_line_tests": lines,
        "output": str(OUT.resolve()),
    }, indent=2))


if __name__ == "__main__":
    main()
