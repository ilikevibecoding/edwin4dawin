#!/usr/bin/env python3
"""Exact ordinary-parent reduction to no-parent g5 for every n >= 11.

This sharpens the frozen n>=18 reduction.  Its only formerly negative
coefficient is the W-parent chain.  We retain the exact marked geometry,
pay the two downward shadows, and certify the remaining coefficient on all
five exhaustive marked-forest boxes using the exact induced-edge and forest
moment floors.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

import probe_iso_n7_bundle_g5_interval_edge_cone_rank7_g5_tail as cone
from prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein import (
    marked_geometry_branches,
)


HERE = Path(__file__).resolve().parent
INPUT = HERE / "iso_n7_bundle_g5_parent_modes_probe_rank7_g5_tail_20260831.json"
PARENT_SOURCE = HERE / "explore_iso_n7_bundle_g5_parent_modes_rank7_g5_tail.py"
OUTPUT = HERE / "iso_n7_bundle_g5_ordinary_reduction_n11_exact_rank7_g5_finish_20260831.json"
MARKER = "PASS_EXACT_ISO_N7_BUNDLE_G5_ORDINARY_REDUCTION_N11_RANK7_G5_FINISH"
THRESHOLD = 11
EXPECTED = {
    PARENT_SOURCE.name: "B5968431C7AC00E325D1372D4A23F19BFD98BB71491CD30ABF38204E126329E5",
    INPUT.name: "FF80D6A3F382E27E55316C6A31CE58D9D9E0DBC9027F38177F565ABA7D016309",
    "probe_iso_n7_bundle_g5_interval_edge_cone_rank7_g5_tail.py":
        "3C76D1074E0923E239ED7A7A7B922F6ADFE9469E6A56F73A68A366A8FAAD9DF4",
    "prove_iso_n6_bundle_g4_marked_edge_bernstein_g1_bernstein.py":
        "6B3106BCEE7F7ECA68C4C5B6861EF018E7E2023DFD8BA091CDAC1EA1FB0085A6",
    "prove_iso_n7_bundle_g4_sum0_piecewise_bernstein_rank7_g4_piecewise.py":
        "24E9538B8DA863D884BA2522E6D10316181F21206BE53A5C472D80C9DCE62FB5",
    "iso_n7_bundle_g4_sum0_piecewise_bernstein_exact_rank7_g4_piecewise_20260831.json":
        "E602040E714BF069F56DFB6C2BE94728595B087C530FF77371777662550E99C1",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def choose(h, k):
    if k == 0:
        return sp.Integer(1)
    return sp.prod(h - j for j in range(k)) / sp.factorial(k)


def main() -> None:
    for name, digest in EXPECTED.items():
        assert sha256(HERE / name) == digest, name
    parent_report = json.loads(INPUT.read_text(encoding="utf-8"))
    assert parent_report["marker"] == "PROBE_EXACT_ISO_N7_BUNDLE_G5_PARENT_MODES_RANK7_G5_TAIL"

    names = {"n"}
    names.update(f"{family}{rank}" for family in "WABZ" for rank in range(2, 8))
    names.update(
        f"P{family}{rank}"
        for family, ranks in {
            "A": (4, 5, 6), "B": (4, 5, 6),
            "W": (3, 4, 5, 6), "Z": (5, 6),
        }.items()
        for rank in ranks
    )
    s = {name: sp.Symbol(name, nonnegative=True) for name in sorted(names)}
    n = s["n"]
    ordinary = sp.expand(sp.sympify(
        parent_report["modes"]["ordinary_parent"]["expression"], locals=s
    ))
    no_parent = sp.expand(sp.sympify(
        parent_report["modes"]["no_parent"]["expression"], locals=s
    ))
    correction = sp.expand(ordinary - no_parent)

    A2, B2, W2, W3 = (s[name] for name in ("A2", "B2", "W2", "W3"))
    A3, B3, Z2, Z3 = (s[name] for name in ("A3", "B3", "Z2", "Z3"))
    PA4, PA5, PA6 = (s[name] for name in ("PA4", "PA5", "PA6"))
    PB4, PB5, PB6 = (s[name] for name in ("PB4", "PB5", "PB6"))
    PW3, PW4, PW5, PW6 = (s[name] for name in ("PW3", "PW4", "PW5", "PW6"))
    PZ5, PZ6 = (s[name] for name in ("PZ5", "PZ6"))

    shadow = {
        "sA5": (n - 5)*PA4 - 3*PA5,
        "sA6": (n - 6)*PA5 - 4*PA6,
        "sB5": (n - 5)*PB4 - 3*PB5,
        "sB6": (n - 6)*PB5 - 4*PB6,
        "sW4": (n - 5)*PW3 - 3*PW4,
        "sW5": (n - 6)*PW4 - 4*PW5,
        "sZ6": (n - 5)*PZ5 - 3*PZ6,
    }

    w2_floor = (n - 3)*(n - 4)/2
    k_ab = (9*n**2 - 77*n + 214)/6
    decomp_a = (
        k_ab*PA4 + (8*B2 + 8*(W2-w2_floor))*PA4
        + (15*n-10)*shadow["sA5"]/6 + sp.Rational(3, 2)*shadow["sA6"]
    )
    decomp_b = (
        k_ab*PB4 + (8*A2 + 8*(W2-w2_floor))*PB4
        + (15*n-10)*shadow["sB5"]/6 + sp.Rational(3, 2)*shadow["sB6"]
    )
    decomp_z = (10*n+22)*PZ5/3 + sp.Rational(14, 3)*shadow["sZ6"]

    c3 = A2 + B2 + 8*A3 + 8*B3 + 2*W2 + 8*W3 + 8*Z3 - 2*n
    c4 = 2*(W2 - 3*A2 - 3*B2 - 7*Z2 - n - 2)
    payment = (6*n-5)*(n-6)/2
    dcoef = sp.expand(c4-payment)
    kcoef = sp.expand(c3 + (n-5)*dcoef/3)
    decomp_w = (
        kcoef*PW3 + (-dcoef)*shadow["sW4"]/3
        + (6*n-5)*shadow["sW5"]/2 + 2*PW6
    )
    assert sp.expand(correction-(decomp_a+decomp_b+decomp_w+decomp_z)) == 0

    tail = sp.Symbol("t", nonnegative=True)
    easy_checks = {
        "six_k_ab": sp.expand((6*k_ab).subs(n, tail+THRESHOLD)),
        "15n_minus_10": sp.expand((15*n-10).subs(n, tail+THRESHOLD)),
        "6n_minus_5": sp.expand((6*n-5).subs(n, tail+THRESHOLD)),
        "10n_plus_22": sp.expand((10*n+22).subs(n, tail+THRESHOLD)),
    }
    assert all(
        all(coefficient >= 0 for coefficient in sp.Poly(value, tail).all_coeffs())
        for value in easy_checks.values()
    )

    a, b, c, d = sp.symbols("a b c d", nonnegative=True)
    nval = tail + THRESHOLD
    m = nval - 2
    raw_branches = marked_geometry_branches(m, a, b, c, d)
    assert [row[0] for row in raw_branches] == [
        "adjacent", "nonadjacent_common1", "nonadjacent_common0_sum0",
        "nonadjacent_common0_sum1", "nonadjacent_common0_sum_ge2",
    ]
    r = 1 + (m-1)*a
    exact_adjacent = (
        "adjacent", (a, b, c), r*b, r*(1-b)*c, m-r,
        sp.Integer(0), sp.Integer(0),
    )
    branches = [exact_adjacent, *raw_branches[1:]]
    branch_rows = []
    for label, variables0, x, y, e, z2, z3 in branches:
        aa2 = m-x
        bb2 = m-y
        aa3_floor = choose(aa2, 2)-e
        bb3_floor = choose(bb2, 2)-e
        omega_floor = 2*e**2/m-e
        ww2 = choose(m, 2)-e
        ww3_floor = choose(m, 3)-e*(m-2)+omega_floor
        replacements = {
            n:nval, A2:aa2, B2:bb2, A3:aa3_floor, B3:bb3_floor,
            W2:ww2, W3:ww3_floor, Z2:z2, Z3:z3,
        }
        lower_k = sp.cancel(kcoef.subs(replacements, simultaneous=True))
        lower_minus_d = sp.cancel((-dcoef).subs(replacements, simultaneous=True))
        used_k = tuple(v for v in variables0 if v in lower_k.free_symbols)
        used_d = tuple(v for v in variables0 if v in lower_minus_d.free_symbols)
        print("BRANCH_START", label, flush=True)
        k_summary = cone.bernstein_summary(lower_k, used_k, tail)
        d_summary = cone.bernstein_summary(lower_minus_d, used_d, tail)
        assert k_summary["negative_tail_scalar_coefficients"] == 0, label
        assert d_summary["negative_tail_scalar_coefficients"] == 0, label
        branch_rows.append({
            "geometry": label,
            "k_summary": k_summary,
            "minus_d_summary": d_summary,
        })

    # The omitted exact rows enter kcoef only through nonnegative slacks.
    AA3, BB3, OMEGA = sp.symbols("AA3 BB3 OMEGA", nonnegative=True)
    symbolic_ww3 = choose(m, 3)-sp.Symbol("ee")*(m-2)+OMEGA
    delta_template = 8*(AA3-sp.Symbol("AA3floor")) + 8*(BB3-sp.Symbol("BB3floor")) + 8*(OMEGA-sp.Symbol("OMEGAfloor"))

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "threshold": THRESHOLD,
        "theorem": (
            "For every forest C of order n>=11, every ordered pair of distinct "
            "marks, and every ordinary parent p, rank-seven bundle g5(C,C-p;u,v) "
            "is at least g5(C,C;u,v)."
        ),
        "exact_correction_identity_verified": True,
        "branch_rows": branch_rows,
        "easy_shifted_checks": {name:str(value) for name,value in easy_checks.items()},
        "W_chain": {
            "c3": str(c3), "c4": str(c4), "D": str(dcoef), "K": str(kcoef),
            "decomposition": str(sp.factor(decomp_w)),
            "K_floor_slack_template": str(delta_template),
        },
        "floor_justification": (
            "A3>=C(A2,2)-e and B3>=C(B2,2)-e because their category graphs "
            "are induced subgraphs of the m-vertex forest W.  The frozen forest "
            "moment lemma gives Omega>=2e^2/m-e, and "
            "W3=C(m,3)-e(m-2)+Omega."
        ),
        "geometry_justification": (
            "The five marked boxes are exhaustive.  The adjacent box is exactly "
            "reparameterized by r=m-e>=1 and x+y<=r; the sum1 orientation is "
            "valid by A/B symmetry."
        ),
        "shadow_slacks": {name:str(value) for name,value in shadow.items()},
        "dependencies_sha256": EXPECTED,
        "scope": (
            "Exact ordinary-parent-to-no-parent reduction for g5 and n>=11; "
            "it does not itself prove the no-parent coefficient nonnegative."
        ),
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True) + "\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    digest = hashlib.sha256(encoded.encode()).hexdigest().upper()
    print(json.dumps({
        "marker": MARKER,
        "branch_negative_counts": {
            row["geometry"]: {
                "K": row["k_summary"]["negative_tail_scalar_coefficients"],
                "minus_D": row["minus_d_summary"]["negative_tail_scalar_coefficients"],
            } for row in branch_rows
        },
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", digest)
    print(MARKER)


if __name__ == "__main__":
    main()
