#!/usr/bin/env python3
"""Verify the path moment decomposition into raw count atoms."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp

from derive_bare_path_terminal_phase_gap import path_row


def main() -> None:
    n, k = sp.symbols("n k", integer=True, nonnegative=True)
    gap = n - 2 * k + 1
    count_atom = sp.binomial(n - k + 1, k)
    mass_atom = (gap - 1) * sp.binomial(n - k, k)
    square_atom = (
        mass_atom
        + (gap - 1)
        * (gap - 2)
        * sp.binomial(n - k - 1, k)
    )
    component_atom = (k + 1) * sp.binomial(
        n - k - 1, k
    )
    proposed = (
        count_atom,
        mass_atom,
        square_atom,
        component_atom,
    )
    original = path_row(n, k)
    differences = [
        sp.factor(
            sp.combsimp(
                sp.expand_func(left - right)
            )
        )
        for left, right in zip(
            original, proposed, strict=True
        )
    ]
    assert all(value == 0 for value in differences)
    report = {
        "status": "PASS_PATH_MOMENT_COUNT_ATOM_DECOMPOSITION",
        "gap": "g=n-2k+1",
        "count": "binom(n-k+1,k)",
        "mass": "(g-1)binom(n-k,k)",
        "square": (
            "(g-1)binom(n-k,k)"
            "+(g-1)(g-2)binom(n-k-1,k)"
        ),
        "components": "(k+1)binom(n-k-1,k)",
        "symbolic_differences": [
            str(value) for value in differences
        ],
        "proof_use": (
            "Every path residual moment is a polynomial layer "
            "weight times a raw atom binom(u+A,C-u), enabling the "
            "common bivariate coefficient-extraction transform."
        ),
    }
    Path(
        "path_moment_count_atom_decomposition_20260730.json"
    ).write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
