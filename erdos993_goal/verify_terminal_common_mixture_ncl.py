#!/usr/bin/env python3
"""Verify the common terminal-mixture coordinates for live NCL."""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


OUTPUT = Path("terminal_common_mixture_ncl_certificate_20260729.json")


def main() -> None:
    r = sp.symbols("r", positive=True, integer=True)
    k = r + 1
    bm, b, bp, bpp = sp.symbols(
        "bm b bp bpp", positive=True
    )
    cm, c, cp = sp.symbols("cm c cp", nonnegative=True)
    delta = sp.symbols("delta", nonnegative=True)

    a = b + cm
    ap = bp + c
    app = bpp + cp

    u = r * b / bm
    pi = cm / bm
    z = r * c / bm
    w2 = r * k * bp / bm
    w3 = r * k * (k + 1) * bpp / bm
    z2 = r * k * cp / bm
    d = u + r * pi
    n = w2 + k * z
    q = w3 + (k + 1) * z2

    identities = {
        "D": sp.factor(d - r * a / bm) == 0,
        "N": sp.factor(n - r * k * ap / bm) == 0,
        "Q": sp.factor(q - r * k * (k + 1) * app / bm)
        == 0,
    }

    v = k * ap / a
    s = b / a
    theta = bm / (a + bm)
    zeta = v - k * u / r
    qf = 1 + u - k * bp / b
    qt = 1 + v - (k + 1) * app / ap
    rt = k - v + v * qt
    rf = r - u + u * qf

    identities |= {
        "v": sp.factor(v - n / d) == 0,
        "s": sp.factor(s - u / d) == 0,
        "theta": sp.factor(theta - r / (d + r)) == 0,
        "zeta": sp.factor(zeta - (n / d - k * u / r))
        == 0,
        "R_T": sp.factor(rt - (k + n**2 / d**2 - q / d))
        == 0,
        "R_F": sp.factor(rf - (r + u**2 - w2)) == 0,
    }

    ncl = (
        v * (2 * k * qt - r * qf)
        + k * s * (r + 2) * qf
        - 2 * k * (s * delta + theta * zeta**2)
    )
    coupling = (r * n - k * u * (r + 2)) / d
    common_reserve_form = (
        2 * k * (k + n**2 / d**2 - q / d)
        - coupling * (r + u**2 - w2) / u
        + k
        * (r + 2)
        * (u - r)
        * (1 / r + 1 / d)
        + (n / d - k * u / r)
        * (r + 2 + r**2 / u)
        - 2
        * k
        * (
            u * delta / d
            + r
            * (n / d - k * u / r) ** 2
            / (d + r)
        )
    )
    identities["common_NCL_reserve_form"] = (
        sp.factor(ncl - common_reserve_form) == 0
    )

    if not all(identities.values()):
        raise AssertionError(identities)

    report = {
        "status": "PASS_SYMBOLIC",
        "identities": identities,
        "common_masses": {
            "D": "u+r*pi = r*a/b_minus",
            "N": "W2+(r+1)Z = r(r+1)a_plus/b_minus",
            "Q": (
                "W3+(r+2)Z2 = "
                "r(r+1)(r+2)a_plus_plus/b_minus"
            ),
        },
        "terminal_parameters": {
            "v": "N/D",
            "s": "u/D",
            "theta": "r/(D+r)",
            "zeta": "N/D-(r+1)u/r",
            "R_T": "(r+1)+N^2/D^2-Q/D",
            "R_F": "r+u^2-W2",
        },
        "moment_interpretation": {
            "u": "E[e_F]",
            "pi": "E[X]",
            "Z": "E[X(e_F-L)]",
            "W2": "E[ordered independent 2-extensions in F]",
            "W3": "E[ordered independent 3-extensions in F]",
            "Z2": (
                "E[X times ordered independent 2-extensions "
                "after deleting the terminal neighbor set]"
            ),
        },
    }
    OUTPUT.write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
