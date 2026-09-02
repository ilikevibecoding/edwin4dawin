#!/usr/bin/env python3
"""Pay ranks seven and six in exact rank-six g2 parent modes."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n6_bundle_g2_exact_parent_modes_probe_root_20260831.json"
OUTPUT = HERE / "iso_n6_bundle_g2_mode_elimination_probe_root_20260831.json"
MARKER = "PROBE_EXACT_ISO_N6_BUNDLE_G2_MODE_ELIMINATION_ROOT"


def main() -> None:
    source = json.loads(INPUT.read_text(encoding="utf-8"))
    assert source["marker"] == "PROBE_EXACT_ISO_N6_BUNDLE_G2_PARENT_MODES_ROOT"
    symbols = {"n": sp.Symbol("n", nonnegative=True)}
    for family in "WABZ":
        for rank in range(2, 8):
            symbols[f"{family}{rank}"] = sp.Symbol(f"{family}{rank}", nonnegative=True)
    n = symbols["n"]
    r = sp.Symbol("r", nonnegative=True)

    caps = (
        ("A7", (n - 7) * symbols["A6"] / 6),
        ("B7", (n - 7) * symbols["B6"] / 6),
        ("W7", (n - 8) * symbols["W6"] / 7),
        ("Z7", (n - 6) * symbols["Z6"] / 5),
        ("A6", (n - 6) * symbols["A5"] / 5),
        ("B6", (n - 6) * symbols["B5"] / 5),
        ("W6", (n - 7) * symbols["W5"] / 6),
        ("Z6", (n - 5) * symbols["Z5"] / 4),
    )

    modes = {}
    for mode in ("no_parent", "endpoint_u", "endpoint_v"):
        current = sp.expand(sp.sympify(source["modes"][mode]["expression"], locals=symbols))
        sequence = []
        for label, cap in caps:
            variable = symbols[label]
            coefficient = sp.factor(sp.diff(current, variable))
            shifted = sp.Poly(
                sp.expand((-coefficient).subs(n, r + 9)),
                *sorted((coefficient.free_symbols - {n}) | {r}, key=str),
            )
            assert all(value >= 0 for value in shifted.coeffs()), (mode, label, coefficient)
            sequence.append({
                "variable": label, "coefficient": str(coefficient), "cap": str(cap),
            })
            current = sp.expand(current.subs(variable, cap))
        derivatives = {
            label: str(sp.factor(sp.diff(current, symbols[label])))
            for label in ("A5", "B5", "W5", "Z5", "A4", "B4", "W4", "Z4")
        }
        after_rank6 = sp.factor(current)
        split_sequence = []
        for label in ("A5", "B5"):
            variable = symbols[label]
            coefficient = sp.factor(sp.diff(current, variable))
            positive = 8 * symbols["W3"]
            paid = sp.factor(positive - coefficient)
            shifted_paid = sp.Poly(
                sp.expand(paid.subs(n, r + 27)),
                *sorted((paid.free_symbols - {n}) | {r}, key=str),
            )
            assert all(value >= 0 for value in shifted_paid.coeffs())
            cap = (n - 5) * symbols[label[0] + "4"] / 4
            split_sequence.append({
                "variable": label, "coefficient": str(coefficient),
                "dropped_nonnegative_part": str(positive),
                "paid_multiplier": str(paid), "cap": str(cap),
            })
            current = sp.expand(current - coefficient * variable - paid * cap)

        coefficient_w5 = sp.factor(sp.diff(current, symbols["W5"]))
        shifted_w5 = sp.Poly(
            sp.expand((-coefficient_w5).subs(n, r + 27)),
            *sorted((coefficient_w5.free_symbols - {n}) | {r}, key=str),
        )
        assert all(value >= 0 for value in shifted_w5.coeffs())
        cap_w5 = (n - 6) * symbols["W4"] / 5
        split_sequence.append({
            "variable": "W5", "coefficient": str(coefficient_w5),
            "dropped_nonnegative_part": "0",
            "paid_multiplier": str(-coefficient_w5), "cap": str(cap_w5),
        })
        current = sp.expand(current.subs(symbols["W5"], cap_w5))

        coefficient_z5 = sp.factor(sp.diff(current, symbols["Z5"]))
        positive_z5 = 10 * symbols["W3"]
        paid_z5 = sp.factor(positive_z5 - coefficient_z5)
        shifted_z5 = sp.Poly(
            sp.expand(paid_z5.subs(n, r + 27)),
            *sorted((paid_z5.free_symbols - {n}) | {r}, key=str),
        )
        assert all(value >= 0 for value in shifted_z5.coeffs()), (mode, paid_z5)
        cap_z5 = (n - 4) * symbols["Z4"] / 3
        split_sequence.append({
            "variable": "Z5", "coefficient": str(coefficient_z5),
            "dropped_nonnegative_part": str(positive_z5),
            "paid_multiplier": str(paid_z5), "cap": str(cap_z5),
        })
        current = sp.expand(
            current - coefficient_z5 * symbols["Z5"] - paid_z5 * cap_z5
        )
        rank4_derivatives = {
            label: str(sp.factor(sp.diff(current, symbols[label])))
            for label in ("A4", "B4", "W4", "Z4")
        }
        modes[mode] = {
            "top_sequence": sequence,
            "after_rank6_expression": str(after_rank6),
            "next_derivatives": derivatives,
            "rank5_split_sequence_n_at_least_27": split_sequence,
            "rank4_residual_n_at_least_27": str(sp.factor(current)),
            "rank4_derivatives_n_at_least_27": rank4_derivatives,
        }

    report = {
        "marker": MARKER,
        "top_rank_threshold": 9,
        "rank5_split_threshold": 27,
        "modes": modes,
        "status": "exact diagnostic top-rank payments; no final sign theorem",
        "source_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest().upper(),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "next_derivatives": {key: row["next_derivatives"] for key, row in modes.items()},
    }, indent=2, sort_keys=True))
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
