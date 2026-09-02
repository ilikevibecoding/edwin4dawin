#!/usr/bin/env python3
"""Exact all-order Delta2/Delta3 theorem for center-rooted quartic stars."""

from __future__ import annotations

import hashlib
import itertools
import json
import math
from pathlib import Path

import sympy as sp
from sympy.core.cache import clear_cache

import verify_rank8_delta01_e3_quartic_star_center_all_order_agent as base
from verify_rank8_q8_terminal_reduction import newton_coefficients, residual


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_delta23_e3_quartic_star_center_all_order_exact_root_20260823.json"
RANKS = (2, 3)
SOURCE_SYMBOLS = base.SOURCE_SYMBOLS
DELTA_TERMS = {
    rank: sp.Poly(sp.expand(newton_coefficients(residual())[rank]), *SOURCE_SYMBOLS).terms()
    for rank in RANKS
}
EXPECTED = {
    "verify_rank8_delta01_e3_quartic_star_center_all_order_agent.py": "F1281058A018ADDFE11F26700BEF14EC6C96A79E461BE19EBD86D2EB40AA1F11",
    "verify_rank8_q8_terminal_reduction.py": "389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7",
    "probe_rank8_delta01_e3_quartic_star_all_long_compressed_agent.py": "E99684BB7F42C00DC797A60B430BC1CBABFE8E9903F5C6A5F47E212D756464D9",
    "probe_rank8_delta2_e1_symbolic_cell.py": "C04F538FB8AFDDC75088FDB89FF610806955CA5ADC316D53C604F3E2703D74F1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def evaluate_cell(long_count: int, shorts: tuple[int, ...], shift: int) -> dict:
    raw, variables = base.build_raw(long_count, shorts, shift)
    values = {symbol: sp.Poly(value, *variables) for symbol, value in raw.items()}
    rows = {}
    for rank in RANKS:
        result = sp.Poly(0, *variables)
        for powers, coefficient in DELTA_TERMS[rank]:
            term = sp.Poly(coefficient, *variables)
            for symbol, power in zip(SOURCE_SYMBOLS, powers, strict=True):
                if power:
                    term *= values[symbol] ** power
            result += term
        coefficients = result.coeffs()
        negative = sum(bool(value < 0) for value in coefficients)
        zero = sum(bool(value == 0) for value in coefficients)
        constant = result.coeff_monomial((0,) * len(variables))
        assert negative == zero == 0 and min(coefficients) > 0 and constant > 0
        rows[str(rank)] = {
            "degrees": list(result.degree_list()),
            "terms": len(result.terms()),
            "negative_coefficients": negative,
            "zero_coefficients": zero,
            "minimum_coefficient": str(min(coefficients)),
            "constant_coefficient": str(constant),
        }
    return {
        "long_arms": long_count,
        "short_arms": list(shorts),
        "shift": shift,
        "variables": [str(variable) for variable in variables],
        "ranks": rows,
    }


def main() -> None:
    actual = {name: sha256(ROOT / name) for name in EXPECTED}
    assert actual == EXPECTED
    cells = []
    for long_count in range(4, 0, -1):
        short_count = 4 - long_count
        for shorts in itertools.combinations_with_replacement(range(1, 7), short_count):
            baseline_order = 1 + 7 * long_count + sum(shorts)
            needed = max(0, 27 - baseline_order)
            shift = math.ceil(needed / long_count)
            cell = evaluate_cell(long_count, shorts, shift)
            cell.update({
                "baseline_order_before_shift": baseline_order,
                "offset_total_needed": needed,
                "coverage": f"symmetry and pigeonhole shift one long arm by at least {shift}",
            })
            cells.append(cell)
            print("PASS", long_count, shorts, flush=True)
            clear_cache()
    assert len(cells) == 84
    totals = {
        str(rank): {
            "cells": len(cells),
            "coefficients": sum(cell["ranks"][str(rank)]["terms"] for cell in cells),
            "negative_coefficients": 0,
            "zero_coefficients": 0,
            "minimum_coefficient": str(min(
                sp.Rational(cell["ranks"][str(rank)]["minimum_coefficient"])
                for cell in cells
            )),
        }
        for rank in RANKS
    }
    payload = {
        "schema": "rank8-delta23-e3-quartic-star-center-all-order-exact-root-v1",
        "status": "PASS_EXACT_RANK8_DELTA23_E3_QUARTIC_STAR_CENTER_ALL_N27_PLUS",
        "theorem": "For every subdivision of the four-arm star with |A|>=27 rooted at its center, Delta2>0 and Delta3>0.",
        "no_gap_short_long_partition": {
            "long_arm_convention": "X+7 with X>=0",
            "short_arm_convention": "fixed length in 1..6",
            "four_long": 1,
            "three_long_one_short": 6,
            "two_long_two_short_unordered": 21,
            "one_long_three_short_unordered": 56,
            "zero_long": "impossible at n>=27",
            "total_cells": 84,
        },
        "rank_totals": totals,
        "cells": cells,
        "immutable_inputs": actual,
        "source_sha256": sha256(Path(__file__)),
        "scope_warning": "Center-root quartic-star Delta2/Delta3 only; arm roots, cubic e=3, other connected cases, forest Q8, PGC, and Problem 993 remain separate.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print("TOTALS", totals)
    print("SOURCE", payload["source_sha256"])
    print("OUTPUT", sha256(OUTPUT))


if __name__ == "__main__":
    main()
