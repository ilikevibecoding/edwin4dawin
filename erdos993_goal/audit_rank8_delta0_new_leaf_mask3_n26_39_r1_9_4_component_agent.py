#!/usr/bin/env python3
"""Independent literal replay of 72 low-r component boxes."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from fractions import Fraction
from pathlib import Path

from audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent import literal_base


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "rank8_delta0_new_leaf_mask3_n26_39_r1_9_4_component_independent_audit_agent_20260823.json"
EXPECTED = {
    "prove_rank8_delta0_new_leaf_mask3_n26_39_r1_9_4_component_agent.py":
        "FBD0FF4F73D6A595E4682D39B22E32C797723FBEBDDD69077ADA17D3963E1DB6",
    "rank8_delta0_new_leaf_mask3_n26_39_r1_9_4_component_exact_agent_20260823.json":
        "B8DC1531F41D0A3CD3BB9F1484B4521136F0ACA2F301D7CC8507FAC1BF69A2F5",
    "rank8_forest16_17_component_jet_bounds_independent_audit_agent_20260823.json":
        "41C457BEB4BF565F3FCCF46BF374168AD7EA5683B115C3A50347AA72E811F9E1",
    "rank8_forest18_19_component_jet_bounds_independent_audit_agent_20260823.json":
        "82283FD0808F138F0E8022C72367E546D50A961E7584510FB75377C709061BB1",
    "audit_rank8_delta0_new_leaf_mask3_quantitative_gap_tail_agent.py":
        "A907744740C12E53A07E9710B8E2BBC1DC44B255D4107B5DBEB639FB4F3998A3",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(n: int, k: int) -> int:
    return math.comb(n, k) if n >= k >= 0 else 0


def parse_fraction(value: str) -> Fraction:
    numerator, separator, denominator = value.partition("/")
    return Fraction(int(numerator), int(denominator) if separator else 1)


def gap(r: int, components: int, minima: list[int]) -> int:
    return sum(minima[j] * choose(r - min(j, components), 5 - j) for j in range(5))


def multiply(left, right):
    answer = [Fraction(0)] * (len(left) + len(right) - 1)
    for i, a in enumerate(left):
        for j, b in enumerate(right):
            answer[i + j] += a * b
    return answer


def power(constant: Fraction, slope: Fraction, exponent: int):
    answer = [Fraction(1)]
    for _ in range(exponent):
        answer = multiply(answer, [constant, slope])
    return answer


def controls(base_terms, N: int, r: int, components: int, minima: list[int], t1: Fraction):
    m = N - r
    x0 = Fraction(6, N - 5)
    x1 = Fraction(6 * N, N * N - 15 * N + 10)
    slope = x1 - x0
    cap = choose(N - 1, 6) + choose(r - 1, 5)
    y0 = x0 - Fraction(gap(r, components, minima), cap)
    assert y0 >= 0
    t0 = Fraction(6, m - 5)
    assert t0 <= t1
    xpowers = [power(x0, slope, exponent) for exponent in range(5)]
    ypowers = [power(y0, slope, exponent) for exponent in range(6)]
    tpowers = [power(t0, t1 - t0, exponent) for exponent in range(5)]
    polynomial = {}
    for (np, xp, yp, zp), coefficient in reversed(base_terms):
        assert np == 0
        xrow = multiply(xpowers[xp], ypowers[yp + zp])
        trow = tpowers[4 - zp]
        for ix, xv in enumerate(xrow):
            for it, tv in enumerate(trow):
                key = (ix, yp + zp, it)
                polynomial[key] = polynomial.get(key, Fraction(0)) + int(coefficient) * xv * tv
    polynomial = {key: value for key, value in polynomial.items() if value}
    degrees = tuple(max(index[axis] for index in polynomial) for axis in range(3))
    out = {}
    for target in itertools.product(*(range(degree + 1) for degree in degrees)):
        value = Fraction(0)
        for source, coefficient in polynomial.items():
            if all(a <= b for a, b in zip(source, target)):
                weight = Fraction(1)
                for a, b, degree in zip(source, target, degrees):
                    weight *= Fraction(choose(b, a), choose(degree, a))
                value += coefficient * weight
        out[target] = value
    return degrees, out


def sign(data):
    degrees, blocks = data
    negative = [list(index) for index, value in sorted(blocks.items()) if value < 0]
    return {"degrees": list(degrees), "blocks": len(blocks), "negative": len(negative), "zero": sum(value == 0 for value in blocks.values()), "positive": sum(value > 0 for value in blocks.values()), "negative_indices": negative, "minimum_literal_fraction": str(min(blocks.values()))}


def main() -> None:
    hashes = {name: sha256(HERE / name) for name in EXPECTED}
    assert hashes == EXPECTED, (hashes, EXPECTED)
    primary = json.loads((HERE / "rank8_delta0_new_leaf_mask3_n26_39_r1_9_4_component_exact_agent_20260823.json").read_text(encoding="utf-8"))
    catalogs = [
        json.loads((HERE / "rank8_forest16_17_component_jet_bounds_exact_agent_20260823.json").read_text(encoding="utf-8")),
        json.loads((HERE / "rank8_forest18_19_component_jet_bounds_exact_agent_20260823.json").read_text(encoding="utf-8")),
    ]
    component_rows = {(row["order"], row["components"]): row for catalog in catalogs for row in catalog["component_rows"]}
    base_terms = literal_base().terms()
    replay = []
    checks = 0
    minimum = None
    for row in reversed(primary["rows"]):
        subboxes = []
        for subbox in reversed(row["component_subboxes"]):
            item = component_rows[(row["m"], subbox["components"])]
            current = sign(controls(base_terms, row["N"], row["r"], subbox["components"], item["minimum_f0_to_f4"], parse_fraction(item["maximum_f5_over_f6"])))
            expected = subbox["bernstein"]
            for key in ("degrees", "blocks", "negative", "zero", "positive", "negative_indices"):
                assert current[key] == expected[key], (
                    row["N"], row["r"], row["m"], subbox["components"],
                    key, current[key], expected[key]
                )
            assert current["negative"] == 0
            value = Fraction(current["minimum_literal_fraction"])
            minimum = value if minimum is None else min(minimum, value)
            subboxes.append({"components": subbox["components"], **current})
            checks += 1
        subboxes.reverse()
        replay.append({"N": row["N"], "r": row["r"], "m": row["m"], "component_subboxes": subboxes})
    replay.reverse()
    assert checks == 72
    payload = {
        "schema": "rank8-delta0-new-leaf-mask3-n26-39-r1-9-4-component-independent-audit-v1",
        "status": "PASS_INDEPENDENT_LITERAL_MASK3_N26_39_R1_9_ALL_4_COMPONENT_CLOSURE",
        "hashes": hashes,
        "counts": {"cells": 4, "component_subboxes": 72, "open": 0},
        "minimum_literal_fraction": str(minimum),
        "rows": replay,
        "proof_boundary": primary["proof_boundary"],
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("CELLS 4 SUBBOXES 72 OPEN 0")
    print("SOURCE", sha256(Path(__file__)))
    print("REPORT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
