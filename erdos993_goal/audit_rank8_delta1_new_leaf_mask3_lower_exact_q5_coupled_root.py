#!/usr/bin/env python3
"""Import-independent replay of one low-order Q5-coupled certificate."""

from __future__ import annotations

import argparse
import gc
import hashlib
import json
import math
import os
from pathlib import Path

import sympy as sp

import audit_rank8_delta1_new_leaf_mask3_orders54_179_F_split_root as independent


HERE = Path(__file__).resolve().parent
PRODUCER = (
    HERE / "certify_rank8_delta1_new_leaf_mask3_lower_exact_q5_coupled_root.py"
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def positive_denominator_record(
    denominator: sp.Expr,
    variables: tuple[sp.Symbol, ...],
) -> None:
    """Prove the cleared denominator is positive on the unit cube."""
    polynomial = sp.Poly(sp.expand(denominator), *variables, domain=sp.QQ)
    coefficients = polynomial.coeffs()
    assert coefficients and all(value >= 0 for value in coefficients)
    assert polynomial.eval(dict.fromkeys(variables, 0)) > 0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--primary", required=True)
    parser.add_argument("--expected-primary-sha256", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    primary_path = Path(args.primary).resolve()
    output = Path(args.output).resolve()
    primary_sha256 = sha256(primary_path)
    assert primary_sha256 == args.expected_primary_sha256.upper()
    primary = json.loads(primary_path.read_text(encoding="utf-8"))
    assert primary["schema"] == (
        "rank8-delta1-new-leaf-mask3-lower-exact-q5-coupled-root-v1"
    )
    n_value, f_value = int(primary["D_order"]), int(primary["F_order"])
    assert primary["status"] == (
        f"PASS_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n_value}_"
        f"F_ORDER_{f_value}_Q5_COUPLED"
    )
    assert primary["source_sha256"] == sha256(PRODUCER)

    gate = independent.transcript.delta1_new_leaf_gate()
    endpoint, endpoint_denominator = independent.transcript.endpoint_numerator(
        gate, 3
    )
    raw = independent.canonical_record(endpoint)
    assert raw["sha256"] == (
        "5298C43C68E11DEA0072E4BF78AFB212FB32ACEC84C6FC25C492EEC4C050404E"
    )
    assert str(endpoint_denominator) == "2744*d5**4*(d6 + f5)"

    n, m = sp.Integer(n_value), sp.Integer(f_value)
    mu4 = sp.cancel((n - 7) * (n - 8) / (n - 3))
    mu4_integer = int(sp.floor(mu4))
    mu4_fraction = sp.cancel(mu4 - mu4_integer)
    phi4 = sp.cancel(
        (1 - mu4_fraction) * sp.binomial(mu4_integer - 1, 2)
        + mu4_fraction * sp.binomial(mu4_integer, 2)
    )
    mu5 = sp.cancel(2 * phi4 / mu4)
    x_lower, x_upper = sp.cancel(6 / (n - 5)), sp.cancel(6 / mu5)
    y_lower, y_upper = sp.cancel(5 / (n - 4)), sp.cancel(5 / mu4)
    cap_cross_x = sp.cancel(12 * y_upper / (10 - y_upper))
    assert primary["q5_cap_cross_x"] == str(cap_cross_x)

    mu4_f = sp.cancel((m - 7) * (m - 8) / (m - 3))
    assert mu4_f > 0
    rank4_ratio = sp.cancel(5 / mu4_f)
    floors = {
        rank: math.comb(n_value, rank)
        - f_value * math.comb(n_value - 2, rank - 2)
        for rank in (4, 5, 6)
    }
    assert all(value > 0 for value in floors.values())
    a4 = sp.Rational(math.comb(f_value, 4), floors[4])
    a5 = sp.Rational(math.comb(f_value, 5), floors[5])
    a6 = sp.Rational(math.comb(f_value, 6), floors[6])

    # Slab counts are a freely chosen finite partition rather than a theorem
    # input.  Recover the counts from the row labels, then reconstruct and
    # compare every endpoint below instead of trusting the stored intervals.
    piece_modes: dict[int, str] = {}
    for reference in primary["rows"]:
        piece_index = int(reference["x_piece"])
        mode = str(reference["q5_cap_mode"])
        assert piece_modes.setdefault(piece_index, mode) == mode
    assert sorted(piece_modes) == list(range(len(piece_modes)))
    below_count = sum(mode == "coupled_q5" for mode in piece_modes.values())
    above_count = sum(mode == "ordinary_upper" for mode in piece_modes.values())
    assert below_count >= 1 and above_count >= 1

    pieces: list[tuple[str, sp.Expr, sp.Expr]] = []
    if x_lower < cap_cross_x:
        upper = min(x_upper, cap_cross_x)
        for index in range(below_count):
            pieces.append(
                (
                    "coupled_q5",
                    x_lower
                    + (upper - x_lower) * sp.Rational(index, below_count),
                    x_lower
                    + (upper - x_lower) * sp.Rational(index + 1, below_count),
                )
            )
    if cap_cross_x < x_upper:
        lower = max(x_lower, cap_cross_x)
        for index in range(above_count):
            pieces.append(
                (
                    "ordinary_upper",
                    lower
                    + (x_upper - lower) * sp.Rational(index, above_count),
                    lower
                    + (x_upper - lower) * sp.Rational(index + 1, above_count),
                )
            )
    assert pieces

    X, Y, S, V4, V6 = sp.symbols("X Y S V4 V6", nonnegative=True)
    variables = (X, Y, S, V4, V6)
    references = primary["rows"]
    row_index = 0
    totals = {
        key: 0
        for key in ("regions", "coefficients", "negative", "zero", "positive")
    }
    digest = hashlib.sha256()

    for x_index, (cap_mode, x0, x1) in enumerate(pieces):
        x = x0 + (x1 - x0) * X
        q5_cap = sp.cancel(10 * x / (x + 12))
        y_top = q5_cap if cap_mode == "coupled_q5" else y_upper
        y = sp.cancel(y_lower + (y_top - y_lower) * Y)
        y_piece_max = (
            sp.cancel(10 * x1 / (x1 + 12))
            if cap_mode == "coupled_q5"
            else y_upper
        )
        ratio_absolute_low = sp.cancel(a4 * y_lower / rank4_ratio)
        ratio_absolute_high = sp.cancel(a4 * y_piece_max / rank4_ratio)
        u6_break = sp.cancel(a6 / (sp.cancel((m - 5) * x1 / 6)))
        breaks = {sp.Integer(0), a5}
        for value in (ratio_absolute_low, ratio_absolute_high, u6_break):
            if 0 < value < a5:
                breaks.add(value)
        u_breaks = tuple(sorted(breaks))

        for u_index, (lo, hi) in enumerate(zip(u_breaks, u_breaks[1:])):
            reference = references[row_index]
            row_index += 1
            u5 = lo + (hi - lo) * S
            midpoint = (lo + hi) / 2
            y_midpoint = (y_lower + y_piece_max) / 2
            f4_mode = (
                "ratio"
                if rank4_ratio * midpoint <= a4 * y_midpoint
                else "absolute"
            )
            f4_value = (
                rank4_ratio * x * u5 * V4
                if f4_mode == "ratio"
                else a4 * x * y * V4
            )
            f6_mode = "shadow" if hi <= u6_break else "absolute"
            f6_value = (
                sp.cancel((m - 5) / 6) * x * u5 * V6
                if f6_mode == "shadow"
                else a6 * V6
            )

            rational_expression = sp.cancel(
                endpoint.subs(
                    {
                        independent.transcript.d[6]: 1,
                        independent.transcript.d[5]: x,
                        independent.transcript.d[4]: x * y,
                        independent.transcript.f[6]: f6_value,
                        independent.transcript.f[5]: x * u5,
                        independent.transcript.f[4]: f4_value,
                    },
                    simultaneous=True,
                )
            )
            numerator, denominator = sp.fraction(rational_expression)
            positive_denominator_record(denominator, variables)
            polynomial = sp.Poly(
                sp.expand(numerator), *variables, domain=sp.QQ
            )
            result = independent.bernstein_record(polynomial)
            result = {"power_terms": len(polynomial.terms()), **result}

            assert reference["x_piece"] == x_index
            assert reference["x_interval"] == [str(x0), str(x1)]
            assert reference["q5_cap_mode"] == cap_mode
            assert reference["u5_interval"] == [str(lo), str(hi)]
            assert reference["f4_mode"] == f4_mode
            assert reference["f6_mode"] == f6_mode
            assert reference["cleared_positive_denominator"] == str(denominator)
            for key, value in result.items():
                assert reference[key] == value, (x_index, u_index, key)
            assert result["negative"] == 0
            assert result["negative_vertices"] == 0

            totals["regions"] += 1
            for key in ("coefficients", "negative", "zero", "positive"):
                totals[key] += int(result[key])
            digest.update(
                (
                    f"{x_index}:{u_index}:{cap_mode}:{f4_mode}:{f6_mode}:"
                    f"{result['ordered_sha256']}\n"
                ).encode()
            )
            print(
                "AUDIT_PASS", n_value, f_value, x_index, u_index,
                cap_mode, f4_mode, f6_mode, flush=True,
            )
            del rational_expression, numerator, denominator, polynomial
            sp.core.cache.clear_cache()
            gc.collect()

    assert row_index == len(references)
    assert primary["aggregate"] == {
        "regions": totals["regions"],
        "coefficients": totals["coefficients"],
        "negative": totals["negative"],
        "zero": totals["zero"],
        "positive": totals["positive"],
    }
    payload = {
        "schema": (
            "rank8-delta1-new-leaf-mask3-lower-exact-q5-coupled-"
            "independent-audit-v1"
        ),
        "status": (
            f"PASS_INDEPENDENT_EXACT_DELTA1_NEW_LEAF_MASK3_D_ORDER_{n_value}_"
            f"F_ORDER_{f_value}_Q5_COUPLED_AUDIT"
        ),
        "D_order": n_value,
        "F_order": f_value,
        "independence": (
            "Imports neither the producer nor any probe. Reconstructs the "
            "canonical endpoint and independently recomputes every exact "
            "rational Bernstein coefficient and positive denominator."
        ),
        "raw_endpoint_numerator": raw,
        "aggregate": {
            **totals,
            "ordered_region_digest_sha256": digest.hexdigest().upper(),
        },
        "primary": {"path": str(primary_path), "sha256": primary_sha256},
        "producer_source_sha256": sha256(PRODUCER),
        "source_sha256": sha256(Path(__file__)),
    }
    temporary = output.with_suffix(output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, output)
    print(payload["status"], flush=True)
    print(
        "REGIONS", totals["regions"],
        "COEFFICIENTS", totals["coefficients"], flush=True,
    )
    print("SOURCE", payload["source_sha256"], flush=True)
    print("REPORT", sha256(output), flush=True)


if __name__ == "__main__":
    main()
