"""Exact transcription checks for POST_SELECTOR_FOREST_CHAIN_AUDIT_2026-08-10.md.

This is not a proof of the open group, affine, or forest implications.
"""

from __future__ import annotations

import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
REPORT = HERE / "post_selector_forest_chain_audit_exact_20260810.json"


def main() -> None:
    checks: dict[str, object] = {}

    # Upper window arithmetic: m=floor(s/2)+2 and the sharp cone gives
    # p-alpha=2s+5.
    slack_rows = []
    for s in range(401):
        m = s // 2 + 2
        available = 2 * s + 5
        required = 4 * m - 3
        slack = available - required
        expected = 0 if s % 2 == 0 else 2
        assert slack == expected
        slack_rows.append({"s": s, "m": m, "slack": slack})
    checks["upper_fixed_ceiling"] = {
        "cases": len(slack_rows),
        "even_slack": 0,
        "odd_slack": 2,
    }

    # Section 90 lower-layer coordinate identity.
    N, d, s, h = sp.symbols("N d s h")
    r = N - d
    k = s - r
    p_minus = N - k
    j = k + h
    lower_identity = sp.expand(j * (d + s - j) - (k * N + h * (p_minus - h)))
    assert lower_identity == 0
    checks["lower_shift_identity"] = str(lower_identity)

    # Stable homogeneous pieces do not imply stability of their sum.
    x, y, z = sp.symbols("x y z")
    P = 1 + x + y + 2 * x * y
    diagonal = sp.expand(P.subs({x: z, y: z}))
    upper_root = (-1 + sp.I) / 2
    assert sp.expand(diagonal.subs(z, upper_root)) == 0
    assert sp.im(upper_root) > 0
    assert sp.discriminant(diagonal, z) == -4
    checks["homogeneous_sum_counterexample"] = {
        "polynomial": str(P),
        "diagonal": str(diagonal),
        "discriminant": str(sp.discriminant(diagonal, z)),
        "upper_half_plane_root": str(upper_root),
    }

    # Prefix GSB cutoff exactly meets the known bipartite decreasing tail.
    cutoff_cases = []
    for alpha in range(1, 1001):
        tail = (2 * alpha - 1 + 2) // 3  # ceil((2 alpha-1)/3)
        prefix = (2 * alpha + 1) // 3
        assert tail == prefix
        cutoff_cases.append((alpha, tail))
    checks["tail_cutoff"] = {
        "cases": len(cutoff_cases),
        "identity": "ceil((2a-1)/3)=floor((2a+1)/3)",
    }

    payload = {
        "status": "PASS_EXACT_POST_SELECTOR_FOREST_CHAIN_TRANSCRIPTION_AUDIT",
        "scope": (
            "Finite/symbolic transcription checks only; the lower-layer, shared-homogenizer, "
            "affine-comparison, protected-induction, mixed-bridge, and PGC statements remain open."
        ),
        "checks": checks,
    }
    REPORT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(payload["status"])
    print(REPORT)


if __name__ == "__main__":
    main()
