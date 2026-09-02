"""Exact direct-FLINT audit of the endpoint tridiagonal certificate for s>=16.

This is a finite, fixed-layer audit.  It deliberately makes no all-order
inference.  The path rows and gamma transforms are constructed directly in
``QQ[t,c,q,u]`` so that SymPy expansion is not the bottleneck.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import time
from math import comb, factorial
from pathlib import Path

from flint import fmpq, fmpq_mpoly_ctx


HERE = Path(__file__).resolve().parent
REPORT = HERE / "endpoint_rays_forest_s16plus_tridiagonal_sonc_exact_20260813.json"
CTX4 = fmpq_mpoly_ctx.get(("t", "c", "q", "u"), "lex")
CTX2 = fmpq_mpoly_ctx.get(("q", "u"), "lex")
t, c, q, u = CTX4.gens()
ONE2 = CTX2.constant(1)


def path_coefficient(ambient_constant: int, index: int):
    """Return binomial(2*(ambient_constant+q)-index-1,index)."""
    answer = CTX4.constant(fmpq(1, factorial(index)))
    for offset in range(index):
        answer *= 2 * q + 2 * ambient_constant - index - 1 - offset
    return answer


def gamma(row):
    degree = len(row) - 1
    residual = list(row)
    answer = []
    for h in range(degree // 2 + 1):
        value = residual[h]
        answer.append(value)
        for j in range(degree - 2 * h + 1):
            residual[h + j] -= value * comb(degree - 2 * h, j)
    assert all(value == 0 for value in residual)
    return answer


def mixed(left, right, s: int):
    raw = [left[i] * right[s - i] for i in range(s + 1)]
    return gamma([(raw[i] + raw[s - i]) / 2 for i in range(s + 1)])


def endpoint_fg(s: int):
    ambient = 2 * s + 5
    path = [path_coefficient(ambient, i) for i in range(s + 1)]
    child = [path_coefficient(ambient - 1, i) for i in range(s + 1)]
    grandchild = [path_coefficient(ambient - 2, i) for i in range(s + 1)]
    vertical = [path[i] - child[i] for i in range(s + 1)]
    lower_vertical = [child[i] - grandchild[i] for i in range(s + 1)]

    def combine(first, second):
        return sum(
            (first[i] + u * second[i]) * t**i
            for i in range(len(first))
        )

    F = combine(mixed(child, vertical, s),
                mixed(grandchild, lower_vertical, s))
    G = combine(mixed(vertical, vertical, s),
                mixed(lower_vertical, lower_vertical, s))
    return F + c * G


def block(data, c_exponent: int):
    return CTX2.from_dict({
        (monomial[2], monomial[3]): coefficient
        for monomial, coefficient in data.items()
        if monomial[1] == c_exponent
    })


def negative_part(poly):
    return CTX2.from_dict({
        monomial: -coefficient
        for monomial, coefficient in poly.to_dict().items()
        if coefficient < 0
    })


def digest(poly) -> str:
    payload = "\n".join(
        f"{monomial}:{coefficient}"
        for monomial, coefficient in sorted(poly.to_dict().items(), reverse=True)
    )
    return hashlib.sha256(payload.encode("ascii")).hexdigest().upper()


def sign_record(poly):
    data = poly.to_dict()
    bad = sorted((monomial, coefficient)
                 for monomial, coefficient in data.items()
                 if coefficient <= 0)
    record = {
        "terms": len(data),
        "positive_terms": sum(coefficient > 0 for coefficient in data.values()),
        "nonpositive_terms": len(bad),
        "coefficient_sha256": digest(poly),
    }
    if bad:
        monomial, coefficient = bad[0]
        record["first_nonpositive_monomial_q_u"] = list(monomial)
        record["first_nonpositive_coefficient"] = str(coefficient)
    return record


def audit_layer(s: int, snapshot_path: Path | None = None):
    started = time.time()
    pencil = endpoint_fg(s)
    ray_seconds = time.time() - started
    print(f"s={s}: direct rays in {ray_seconds:.3f}s; discriminant starting", flush=True)
    discriminant = pencil.discriminant("t")
    discriminant_seconds = time.time() - started - ray_seconds
    data = discriminant.to_dict()
    negative = [(monomial, coefficient)
                for monomial, coefficient in data.items() if coefficient < 0]
    negative_exponents = sorted({int(monomial[1]) for monomial, _ in negative})

    structure_ok = bool(negative_exponents)
    if structure_ok:
        structure_ok &= all(exponent % 2 == 1 for exponent in negative_exponents)
        structure_ok &= negative_exponents == list(range(
            negative_exponents[0], negative_exponents[-1] + 1, 2
        ))
        structure_ok &= all(
            coefficient > 0 or int(monomial[1]) in negative_exponents
            for monomial, coefficient in data.items()
        )

    diagonal_records = []
    off_diagonal_records = []
    continuant_records = []
    even_exponents = []
    if structure_ok:
        even_exponents = list(range(
            negative_exponents[0] - 1, negative_exponents[-1] + 2, 2
        ))
        diagonals = [block(data, exponent) for exponent in even_exponents]
        off_diagonals = [negative_part(block(data, exponent))
                         for exponent in negative_exponents]
        diagonal_records = [sign_record(poly) for poly in diagonals]
        off_diagonal_records = [sign_record(poly) for poly in off_diagonals]

        continuants = [diagonals[0]]
        for index in range(1, len(diagonals)):
            two_back = continuants[index - 2] if index >= 2 else ONE2
            continuants.append(
                diagonals[index] * continuants[index - 1]
                - off_diagonals[index - 1] ** 2 * two_back / 4
            )
        continuant_records = [sign_record(poly) for poly in continuants]

    passed = (
        structure_ok
        and all(record["nonpositive_terms"] == 0 for record in diagonal_records)
        and all(record["nonpositive_terms"] == 0 for record in continuant_records)
    )
    print(
        f"s={s}: terms={len(data)}, negative={len(negative)}, "
        f"odd blocks={negative_exponents}, continuant bad counts="
        f"{[record['nonpositive_terms'] for record in continuant_records]}, "
        f"status={'PASS' if passed else 'FAIL'}",
        flush=True,
    )
    result = {
        "s": s,
        "substitution": f"N={2 * s + 5}+q",
        "core_degree": int(pencil.degrees()[0]),
        "discriminant_terms": len(data),
        "negative_terms": len(negative),
        "negative_odd_c_blocks": negative_exponents,
        "negative_terms_by_c_block": {
            str(exponent): sum(
                coefficient < 0 and int(monomial[1]) == exponent
                for monomial, coefficient in data.items()
            )
            for exponent in negative_exponents
        },
        "sign_pattern_structure_ok": structure_ok,
        "gram_even_c_blocks": even_exponents,
        "gram_diagonal_blocks": diagonal_records,
        "gram_off_diagonal_blocks": off_diagonal_records,
        "leading_continuants": continuant_records,
        "tridiagonal_certificate_pass": passed,
        "timing_seconds": {
            "direct_ray_construction": ray_seconds,
            "discriminant": discriminant_seconds,
            "total": time.time() - started,
        },
    }
    if snapshot_path is not None:
        snapshot = {
            "result": result,
            "discriminant": {
                "terms": len(discriminant),
                "coefficient_sha256": digest(discriminant),
                "coefficients": [
                    [[int(exponent) for exponent in monomial], str(coefficient)]
                    for monomial, coefficient in sorted(
                        discriminant.to_dict().items(), reverse=True
                    )
                ],
            },
        }
        snapshot_path.write_text(json.dumps(snapshot) + "\n", encoding="utf-8")
    return result


def write_report(layers):
    failures = [layer for layer in layers
                if not layer["tridiagonal_certificate_pass"]]
    payload = {
        "status": "FAIL_FIRST_EXACT_COUNTEREXAMPLE" if failures
                  else "PASS_EXACT_FINITE_AUDIT",
        "parameter_domain": "q,c,u>=0",
        "layers": layers,
        "first_failure": failures[0]["s"] if failures else None,
        "scope": (
            "Exact fixed-layer coefficient audit of the same full-even-block "
            "tridiagonal construction used through s=15. A PASS is finite "
            "evidence only, not an all-order theorem."
        ),
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=16)
    parser.add_argument("--stop", type=int, default=16)
    parser.add_argument("--snapshot", type=Path)
    arguments = parser.parse_args()
    assert 16 <= arguments.start <= arguments.stop

    layers = []
    for s in range(arguments.start, arguments.stop + 1):
        layers.append(audit_layer(s, arguments.snapshot))
        payload = write_report(layers)
        if not layers[-1]["tridiagonal_certificate_pass"]:
            break
    print(json.dumps(payload, indent=2), flush=True)
    print(REPORT, flush=True)


if __name__ == "__main__":
    main()
