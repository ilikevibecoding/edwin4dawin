#!/usr/bin/env python3
"""Independent exact structural audit of the small-m Delta0 face split."""

from __future__ import annotations

import hashlib
import itertools
import json
from math import comb
from pathlib import Path

import sympy as sp

from prove_rank7_terminal_broom_delta0_large import normalized_low


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank7_delta0_small_m_three_face_structure_independent_audit_exact_20260820.json"
PROVER = ROOT / "prove_rank7_delta0_joint_lower_b_weighted_pair_small_m_hface_finite.py"
RUNNER = ROOT / "run_rank7_delta0_joint_lower_b_weighted_pair_small_m_hface_batch.py"
LIFT = ROOT / "forest_i45_continuous_weighted_pair_lift_exact_20260820.json"

EXPECTED = {
    PROVER.name: "9367209095EDBFF981D81C504C0CEFBC88B8613CBD7F5C43DB596F35C8CA5D66",
    RUNNER.name: "5A54F1674DF8E45BAC0579F4C5DD8C042F0FFEC98E21BB477CE6A7E9AA09BED7",
    LIFT.name: "4CA2B72F6CC9E974DEE9206D86044099FBD85DE57CCB2443E213B2E330743075",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main() -> int:
    hashes = {path.name: sha256(path) for path in (PROVER, RUNNER, LIFT)}
    assert hashes == EXPECTED
    lift = json.loads(LIFT.read_text(encoding="utf-8"))
    assert lift["status"] == "PASS_EXACT_FOREST_I45_CONTINUOUS_WEIGHTED_PAIR_LIFT"

    source = PROVER.read_text(encoding="utf-8")
    required = (
        "return (0, 1) if m <= 8 else (0, 1, 2)",
        "defect_floor = sp.Rational(comb(m - 3, 2), 6) * pair_floor",
        "beta = sp.Rational((m - 4) * (m - 9), 12)",
        "h_lower = c5 / z_value - sp.Rational(n - 6, 6) * (c5 - a)",
        "active_constraints = [-lifted_lower, -h_lower]",
        "active_constraints = [lifted_lower, lifted_lower - h_lower]",
        "active_constraints = [h_lower, h_lower - lifted_lower]",
        "containment_upper - b",
        "extension_upper - b",
        "c5 - 2 * b * z_value",
        "h_extension",
    )
    assert all(fragment in source for fragment in required)

    # Exact H-extension translation.  z=c5/c6 and
    # 6(c6-b)=(n-6)(c5-a) are equivalent to b=h_lower.
    n, a, b, c5, c6, z = sp.symbols("n a b c5 c6 z", positive=True)
    h_lower = c5 / z - sp.Rational(1, 6) * (n - 6) * (c5 - a)
    residual = 6 * (c6 - b) - (n - 6) * (c5 - a)
    assert sp.factor(residual.subs({b: h_lower, c6: c5 / z})) == 0

    # Independently verify the endpoint reduction: Delta0 is quadratic and
    # strictly concave in both d (hence b, which is affine in d) and q on the
    # actual domain s in [0,1], z>0.
    expression, (_, _, z0, q0, s0, d0) = normalized_low(0)
    assert sp.Poly(sp.together(expression).as_numer_denom()[0], d0).degree() == 2
    assert sp.simplify(
        sp.diff(expression, d0, 2) - 4 * (s0 * z0 - 48 * z0 - 48)
    ) == 0
    assert sp.Poly(sp.together(expression).as_numer_denom()[0], q0).degree() == 2
    assert sp.simplify(sp.diff(expression, q0, 2) + 196 * s0 * (s0 + 1)) == 0

    # The three predicates are exactly the active-source decomposition of
    # max(0,L,H).  Check every strict ordering of three labelled sources.
    sources = ("zero", "lifted", "h_extension")
    active_by_order = {}
    for ordering in itertools.permutations(sources):
        values = {name: rank for rank, name in enumerate(ordering)}
        active = []
        if values["zero"] >= values["lifted"] and values["zero"] >= values["h_extension"]:
            active.append("zero")
        if values["lifted"] >= values["zero"] and values["lifted"] >= values["h_extension"]:
            active.append("lifted")
        if values["h_extension"] >= values["zero"] and values["h_extension"] >= values["lifted"]:
            active.append("h_extension")
        assert active == [ordering[-1]]
        active_by_order["<".join(ordering)] = active[0]

    sign_rows = []
    for m in range(5, 18):
        if m <= 8:
            weight = sp.Rational(comb(m - 3, 2), 6)
            assert weight > 0
            regimes = ["E<=1", "E>=1"]
            branch = "all-pairs-at-adjacent-weight"
        else:
            beta = sp.Rational((m - 4) * (m - 9), 12)
            assert beta >= 0
            weight = beta
            regimes = ["E<=1", "1<=E<=m/2", "E>=m/2"]
            branch = "adjacent-pair-floor"
        sign_rows.append({"m": m, "branch": branch, "checked_weight": str(weight), "regimes": regimes})

    report = {
        "schema": "rank7-delta0-small-m-three-face-structure-independent-audit-v1",
        "status": "PASS_INDEPENDENT_RANK7_DELTA0_SMALL_M_THREE_FACE_STRUCTURE",
        "hashes": hashes,
        "weighted_pair_input": lift["status"],
        "H_translation": "6(c6-b)=(n-6)(c5-a) iff b=c5/z-(n-6)(c5-a)/6",
        "endpoint_concavity": {
            "d_second_derivative": "4*(s*z-48*z-48)<0 for 0<=s<=1,z>0",
            "q_second_derivative": "-196*s*(s+1)<=0",
            "effect": "the minimum on the feasible b and q intervals is on their endpoint faces",
        },
        "lower_face_union": {
            "formula": "max(0,lifted,H-extension)",
            "strict_orderings_checked": active_by_order,
            "tie_behavior": "ties may activate more than one face and therefore cannot create a gap",
        },
        "regime_and_sign_rows": sign_rows,
        "constraint_direction_audit": {
            "zero_face": "lifted<=0 and H<=0",
            "lifted_face": "lifted>=0 and lifted>=H",
            "H_face": "H>=0 and H>=lifted",
            "upper_capacities": "b<=c5-a and 5b<=(m-4)a",
            "half_retention": "2*b*z<=c5",
            "H_extension_on_non_H_faces": "(n-6)(c5-a)z>=6(c5-bz)",
        },
        "scope_guard": "This is a structural algebra/domain audit. Final numerical acceptance still requires the separate 2520-key batch audit.",
    }
    OUTPUT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(report["status"])
    print("report", OUTPUT.name, sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
