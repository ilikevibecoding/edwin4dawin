#!/usr/bin/env python3
"""Bounded exact Bernstein probe for the mask-1 middle tail.

The output is deliberately fail-closed: it records which Bernstein controls
are certified by the same translated positive-coefficient cones used for
mask 0.  A mixed control is only a failure of this sufficient method.
"""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

from flint import fmpz_mpoly_ctx

from analyze_rank8_delta0_new_leaf_mask1_selected_boundary_agent import (
    base_polynomial,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask1_quantitative_gap_tail_probe_agent_20260823.json"


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


def build_cleared_box():
    base = base_polynomial()
    ring = fmpz_mpoly_ctx.get(["N", "r", "X", "V", "T"])
    N, r, X, V, T = ring.gens()
    m = N - r
    dden = N**2 - 15 * N + 10
    xden = (N - 5) * dden
    xnum = 6 * dden + 60 * (N - 1) * X
    n6 = ring.constant(1)
    for offset in range(6):
        n6 *= N - offset
    h120 = ring.constant(0)
    for j in range(5):
        term = ring.constant(math.comb(5, j))
        for offset in range(j):
            term *= m - j + 1 - offset
        for offset in range(5 - j):
            term *= r - j - offset
        h120 += term
    yden = xden * n6
    ynum = xnum * n6 - 6 * h120 * xden
    fden = m**2 - 15 * m + 10
    tden = (m - 5) * fden
    tnum = 6 * fden + 60 * (m - 1) * T
    znum = ynum * tden
    zden = yden * tnum

    maxima = tuple(
        max(monomial[index] for monomial, _ in base.terms())
        for index in range(1, 4)
    )
    assert maxima == (1, 3, 4)
    cleared = ring.constant(0)
    for (np, xp, yp, zp), coefficient in base.terms():
        term = ring.constant(int(coefficient)) * N**np
        term *= xnum**xp * xden ** (maxima[0] - xp)
        term *= (ynum * V) ** yp * yden ** (maxima[1] - yp)
        term *= (znum * V) ** zp * zden ** (maxima[2] - zp)
        cleared += term
    return cleared


def split_power(cleared):
    ring = fmpz_mpoly_ctx.get(["N", "r"])
    grouped = {}
    for monomial, coefficient in cleared.to_dict().items():
        np, rp, *box = monomial
        grouped.setdefault(tuple(box), {})[(np, rp)] = int(coefficient)
    return ring, {key: ring.from_dict(value) for key, value in grouped.items()}


def bernstein_blocks(ring, power):
    axes = len(next(iter(power)))
    degrees = tuple(max(index[axis] for index in power) for axis in range(axes))
    lcms = []
    for degree in degrees:
        value = 1
        for exponent in range(degree + 1):
            value = math.lcm(value, math.comb(degree, exponent))
        lcms.append(value)
    answer = {}
    for target in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = ring.constant(0)
        for source, coefficient in power.items():
            if any(a > b for a, b in zip(source, target)):
                continue
            weight = 1
            for a, b, degree, lcm in zip(source, target, degrees, lcms):
                weight *= math.comb(b, a) * (lcm // math.comb(degree, a))
            value += coefficient * weight
        answer[target] = value
    return degrees, lcms, answer


def translated_row(polynomial, ring):
    A, B = ring.gens()
    large = polynomial.compose(40 + A + B, 24 + A)
    large_values = [int(value) for value in large.to_dict().values()]
    strips = []
    for a0 in range(14):
        translated = polynomial.compose(40 + B, ring.constant(10 + a0))
        values = [int(value) for value in translated.to_dict().values()]
        strips.append(
            {
                "a": a0,
                "pass": bool(values) and all(value >= 0 for value in values),
                "minimum": str(min(values)) if values else "0",
                "terms": len(values),
            }
        )
    return {
        "large_a_pass": bool(large_values)
        and all(value >= 0 for value in large_values),
        "large_a_minimum": str(min(large_values)) if large_values else "0",
        "large_a_terms": len(large_values),
        "strips": strips,
    }


def main() -> None:
    cleared = build_cleared_box()
    ring, power = split_power(cleared)
    degrees, lcms, bernstein = bernstein_blocks(ring, power)
    controls = []
    for index, polynomial in sorted(bernstein.items()):
        row = translated_row(polynomial, ring)
        passed = row["large_a_pass"] and all(item["pass"] for item in row["strips"])
        if not passed:
            controls.append({"index": list(index), "translated_cones": row})
    payload = {
        "schema": "rank8-delta0-new-leaf-mask1-quantitative-gap-tail-probe-v1",
        "status": (
            "PASS_EXACT_BERNSTEIN_METHOD_MASK1_MIDDLE_TAIL"
            if not controls
            else "OPEN_EXACT_BERNSTEIN_METHOD_MASK1_MIDDLE_TAIL_NO_SIGN_CLAIM"
        ),
        "scope": "N>=40,r>=10,m=N-r>=16; mask1 selected-lower d7/Q7-upper c8",
        "box": [
            "6/(N-5)<=x<=6N/(N^2-15N+10)",
            "0<=y<=x-G/binom(N,6)",
            "6/(m-5)<=f5/f6<=6m/(m^2-15m+10)",
            "z=y/(f5/f6)",
        ],
        "power_terms": len(cleared.to_dict()),
        "power_blocks": len(power),
        "box_degrees": [int(value) for value in degrees],
        "bernstein_lcms": lcms,
        "bernstein_controls": len(bernstein),
        "sparse_sha256": {
            "cleared_power_polynomial": sparse_sha256([("cleared", cleared)]),
            "power_coefficient_blocks": sparse_sha256(sorted(power.items())),
            "bernstein_coefficient_blocks": sparse_sha256(sorted(bernstein.items())),
        },
        "open_controls": len(controls),
        "open_control_details": controls,
        "tail_partition": (
            "r=10+a,m=16+b; a>=14 uses a=14+A,b=B; a=0..13 uses "
            "N=40+B at fixed r=10+a"
        ),
        "source_sha256": {
            "analyze_rank8_delta0_new_leaf_mask1_selected_boundary_agent.py": sha256(
                HERE / "analyze_rank8_delta0_new_leaf_mask1_selected_boundary_agent.py"
            )
        },
        "proof_boundary": (
            "A PASS certifies only this sufficient Bernstein box and still "
            "requires independent replay before theorem credit. An OPEN row is "
            "not a counterexample. Finite N, r<=9, m<=15, masks2/3, other "
            "roots/ranks, arbitrary-leaf induction, and Problem 993 remain open."
        ),
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("DEGREES", payload["box_degrees"])
    print("CONTROLS", payload["bernstein_controls"], "OPEN", payload["open_controls"])
    if controls:
        print("OPEN_INDICES", [row["index"] for row in controls])
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
