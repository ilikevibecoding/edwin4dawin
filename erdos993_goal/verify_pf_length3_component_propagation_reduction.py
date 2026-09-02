"""Exact boundary algebra for propagating the PF length-three orientation.

For fixed reserve and fixed positive-root parameters, the sign-relevant
collision set is an open subset of the one-dimensional z interval.  This
verifier checks the algebra at every possible endpoint and records the
topological reduction: once the repeated-factor boundary is oriented, the
proved adjacent-cubic and outer theorems propagate that orientation through
every distinct-factor component.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "pf_length3_component_propagation_reduction_exact_20260807.json"


def load(name):
    return json.loads((HERE / name).read_text(encoding="utf-8"))


def main():
    h0, h1, h2, h3 = sp.symbols("h0 h1 h2 h3")
    g0, g1, g2, g3 = sp.symbols("g0 g1 g2 g3")
    c, d = sp.symbols("c d", positive=True)
    minor_d0 = h1**2 - h0 * h2
    minor_d2 = h2**2 - h1 * h3
    minor_e = h0 * h3 - h1 * h2
    d0, d2, e = sp.symbols("D0 D2 E")
    k = sp.expand(4 * d0 * d2 - e**2)
    a = sp.expand(d2 * g0 + e * g1 + d0 * g2)
    b = sp.expand(d2 * g1 + e * g2 + d0 * g3)

    # The Hankel-minor weights annihilate both value rows identically.
    assert sp.expand(minor_d2 * h0 + minor_e * h1 + minor_d0 * h2) == 0
    assert sp.expand(minor_d2 * h1 + minor_e * h2 + minor_d0 * h3) == 0

    # In the distinct-positive-factor interior, the weights are a positive
    # scalar multiple of (cd,c+d,1).
    weight_substitution = {d2: d0 * c * d, e: d0 * (c + d)}
    assert sp.expand(
        a.xreplace(weight_substitution)
        - d0 * (c * d * g0 + (c + d) * g1 + g2)
    ) == 0
    assert sp.expand(
        b.xreplace(weight_substitution)
        - d0 * (c * d * g1 + (c + d) * g2 + g3)
    ) == 0

    # K=0 with positive D0,D2,E is exactly the repeated factor c=d.
    repeated = {e: 2 * c * d0, d2: c**2 * d0}
    assert sp.expand(k.xreplace(repeated)) == 0
    assert sp.expand(a.xreplace(repeated) - d0 * (c**2 * g0 + 2 * c * g1 + g2)) == 0
    assert sp.expand(b.xreplace(repeated) - d0 * (c**2 * g1 + 2 * c * g2 + g3)) == 0

    # D0=0 and D2=0 are the two shifted length-two PF boundaries.
    assert sp.expand(a.subs(d0, 0) - (d2 * g0 + e * g1)) == 0
    assert sp.expand(b.subs(d0, 0) - (d2 * g1 + e * g2)) == 0
    assert sp.expand(a.subs(d2, 0) - (e * g1 + d0 * g2)) == 0
    assert sp.expand(b.subs(d2, 0) - (e * g2 + d0 * g3)) == 0
    assert sp.expand(k.subs(d0, 0) + e**2) == 0
    assert sp.expand(k.subs(d2, 0) + e**2) == 0

    adjacent = load("adjacent_cubic_collision_topology_theorem_20260806.json")
    outer = load("pf_length3_outer_all_branch_consequence_exact_20260807.json")
    endpoint = load("pf_length3_inner_jensen_turan_reduction_exact_20260807.json")
    atlas = load("pf_length3_repeated_two_pivot_atlas_exact_20260807.json")
    assert adjacent["status"] == "ALL_ORDER_ADJACENT_CUBIC_COMPATIBILITY_AND_QUARTIC_WINDOW_PROVED"
    assert outer["status"] == "PASS_EXACT_PF_LENGTH3_OUTER_ALL_BRANCH_CONSEQUENCE"
    assert endpoint["status"] == "PASS_EXACT_PF_LENGTH3_INNER_JENSEN_TURAN_REDUCTION"
    assert atlas["status"] == "PASS_EXACT_PF_LENGTH3_REPEATED_TWO_PIVOT_ATLAS"

    payload = ";".join(map(str, (d0, d2, e, k, a, b)))
    report = {
        "status": "PASS_EXACT_PF_LENGTH3_COMPONENT_PROPAGATION_REDUCTION",
        "identity_sha256": hashlib.sha256(payload.encode("utf-8")).hexdigest(),
        "dependencies": {
            "adjacent_boundary": adjacent["status"],
            "outer_boundary": outer["status"],
            "z_zero_endpoint": endpoint["status"],
            "two_pivot_atlas": atlas["status"],
        },
        "component_argument": [
            "Fix integer reserve r and fixed u,v.  The set I={0<z<r+5: D0,D2,E>0 and K<0} is open, hence a disjoint union of intervals.",
            "At every point of I, E^2-4D0D2>0 gives two distinct positive roots c,d and the null weights equal D0*(c*d,c+d,1).",
            "The all-order quartic window theorem makes both collision rows strictly real-rooted in the interior, so their derivative product A*B is continuous and nonzero on each component; its sign is constant.",
            "The z=0 asymptotics have K>0, so no component begins there.  Any finite component endpoint has K=0, D0=0, or D2=0 (E=0 forces one of the latter when K<=0).",
            "K=0 is the repeated-factor boundary.  D0=0 and D2=0 are shifted length-two PF collisions covered by the adjacent-cubic theorem.  An endpoint at z=r+5 is covered by the outer theorem.",
            "Therefore strict positive orientation on every repeated-factor boundary propagates to A*B>0 on all of I.  Boundary u,v values follow by continuity from the interior."
        ],
        "conditional_consequence": (
            "Once the remaining compact repeated-factor quartic certificate "
            "is complete for both parities, no additional multidimensional "
            "face theorem is needed: the full PF length-three orientation "
            "follows component by component along z."
        ),
        "remaining_obligation": (
            "Complete the exact two-pivot positive-root orientation cover "
            "for the last compact repeated-factor box in both parities."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print(OUTPUT)


if __name__ == "__main__":
    main()
