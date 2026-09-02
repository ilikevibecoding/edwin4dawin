#!/usr/bin/env python3
"""Exact endpoint-parent reduction to no-parent for rank-seven bundle g5."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g5_parent_modes_probe_rank7_g5_tail_20260831.json"
PARENT_SOURCE = HERE / "explore_iso_n7_bundle_g5_parent_modes_rank7_g5_tail.py"
OUTPUT = HERE / "iso_n7_bundle_g5_endpoint_reduction_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G5_ENDPOINT_REDUCTION_RANK7_G5_FINISH"
EXPECTED = {
    PARENT_SOURCE.name: "B5968431C7AC00E325D1372D4A23F19BFD98BB71491CD30ABF38204E126329E5",
    INPUT.name: "FF80D6A3F382E27E55316C6A31CE58D9D9E0DBC9027F38177F565ABA7D016309",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> None:
    for name, digest in EXPECTED.items():
        assert sha256(HERE / name) == digest
    report = json.loads(INPUT.read_text(encoding="utf-8"))
    names = {"n"}
    names.update(f"{family}{rank}" for family in "WABZ" for rank in range(2, 8))
    s = {name: sp.Symbol(name, nonnegative=True) for name in sorted(names)}
    n = s["n"]
    values = {
        mode: sp.expand(sp.sympify(report["modes"][mode]["expression"], locals=s))
        for mode in ("no_parent", "endpoint_u", "endpoint_v")
    }
    w2_floor = (n - 3) * (n - 4) / 2
    k_endpoint = (11 * n**2 - 86 * n + 200) / 5

    decompositions = {}
    for mode, family, other2 in (
        ("endpoint_u", "B", s["A2"]),
        ("endpoint_v", "A", s["B2"]),
    ):
        f4, f5, f6 = (s[f"{family}{rank}"] for rank in (4, 5, 6))
        z5, z6 = s["Z5"], s["Z6"]
        shadow5 = (n - 5) * f4 - 4 * f5
        shadow6 = (n - 6) * f5 - 5 * f6
        shadow_z6 = (n - 5) * z5 - 4 * z6
        family_part = (
            k_endpoint * f4
            + (8 * other2 + 8 * (s["W2"] - w2_floor)) * f4
            + (9 * n - 4) * shadow5 / 5
            + sp.Rational(6, 5) * shadow6
        )
        z_part = (9 * n + 3) * z5 / 2 + sp.Rational(7, 2) * shadow_z6
        correction = sp.expand(values[mode] - values["no_parent"])
        decomposition = sp.expand(family_part + z_part)
        assert sp.expand(correction - decomposition) == 0
        decompositions[mode] = {
            "difference": str(sp.factor(correction)),
            "family_decomposition": str(sp.factor(family_part)),
            "Z_decomposition": str(sp.factor(z_part)),
            "shadow_slacks": {
                f"s{family}5": str(shadow5),
                f"s{family}6": str(shadow6),
                "sZ6": str(shadow_z6),
            },
        }

    tail = sp.Symbol("t", nonnegative=True)
    checks = {
        "five_k_endpoint_shift8": sp.expand((5 * k_endpoint).subs(n, tail + 8)),
        "9n_minus4_shift8": sp.expand((9 * n - 4).subs(n, tail + 8)),
        "9n_plus3_shift8": sp.expand((9 * n + 3).subs(n, tail + 8)),
    }
    assert all(
        all(coefficient >= 0 for coefficient in sp.Poly(value, tail).all_coeffs())
        for value in checks.values()
    )
    out = {
        "marker": MARKER,
        "theorem": (
            "For every forest C of order n>=8 and each endpoint parent u or v, "
            "the exact rank-seven bundle g5 in the endpoint-deletion mode is "
            "at least its no-parent D=C value."
        ),
        "threshold": 8,
        "exact_identities_verified": True,
        "decompositions": decompositions,
        "shadow_justification": (
            "After removing a fixed included mark, the F-family is a level of "
            "a downward-closed complex on at most n-2 other vertices. "
            "Double-counting deletion/extension pairs gives "
            "4F5<=(n-5)F4 and 5F6<=(n-6)F5.  For Z, two marks "
            "are fixed, giving 4Z6<=(n-5)Z5."
        ),
        "forest_floor": (
            "W is a forest on n-2 vertices, so W2>=C(n-2,2)-(n-3)="
            "(n-3)(n-4)/2."
        ),
        "shifted_coefficient_checks": {name: str(value) for name, value in checks.items()},
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Exact endpoint-to-no-parent reduction for g5 only.  It does not "
            "itself prove the no-parent coefficient nonnegative."
        ),
        "status": MARKER,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(out, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "threshold": 8,
        "exact_identities_verified": True,
        "shifted_coefficient_checks": out["shifted_coefficient_checks"],
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", out["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
