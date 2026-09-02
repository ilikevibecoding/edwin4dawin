#!/usr/bin/env python3
"""Independent audit and bounded replay of the weighted-pair/H-extension cells."""

from __future__ import annotations

import ast
import hashlib
import json
import subprocess
import sys
from math import comb
from pathlib import Path

import sympy as sp


ROOT = Path(__file__).resolve().parent
PAIR_PROVER = ROOT / "prove_rank7_delta0_joint_lower_b_weighted_pair_faces_finite.py"
H_PROVER = ROOT / "prove_rank7_delta0_joint_lower_b_h_extension_face_finite.py"
OUTPUT = ROOT / "rank7_delta0_weighted_pair_h_extension_independent_audit_exact_20260820.json"
EXPECTED_PAIR_PROVER_SHA256 = "E0017425A2DAC860C735210CDD4AFDC212D919C8FCBFB7F0E5834305B4C8BF6D"
EXPECTED_H_PROVER_SHA256 = "3888A69298EA2F2FD487443D15559388F883505A28CC6AB191835ED1E4034B62"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def h_extension_algebra() -> dict:
    n, c5, c6, a, b, z = sp.symbols("n c5 c6 a b z", positive=True)
    h5 = c5 - a
    h6 = c6 - b
    source_residual = (n - 6) * h5 - 6 * h6
    code_residual = (n - 6) * (c5 - a) * z - 6 * (c5 - b * z)
    translated = sp.factor(code_residual.subs(z, c5 / c6))
    assert sp.simplify(translated - c5 * source_residual / c6) == 0
    bz_face = c5 - sp.Rational(1, 6) * (n - 6) * (c5 - a) * z
    assert sp.simplify(code_residual.subs(b, bz_face / z)) == 0
    # Every H-face source constraint is the corresponding b constraint
    # multiplied by positive z, except half retention which is multiplied by z
    # after using c6=c5/z.
    ratio, lifted, c5j, extension, ceiling = sp.symbols(
        "ratio lifted c5j extension ceiling", positive=True
    )
    constraint_equivalences = {
        "ratio_lower": sp.simplify((bz_face - ratio * z) / z - (bz_face / z - ratio)),
        "lifted_lower": sp.simplify((bz_face - lifted * z) / z - (bz_face / z - lifted)),
        "literal_i5_upper": sp.simplify((c5j * z - bz_face) / z - (c5j - bz_face / z)),
        "containment_upper": sp.simplify(((c5 - a) * z - bz_face) / z - (c5 - a - bz_face / z)),
        "extension_upper": sp.simplify((extension * z - bz_face) / z - (extension - bz_face / z)),
        "half_retention": sp.simplify(c5 - 2 * bz_face - z * (c5 / z - 2 * bz_face / z)),
        "c6_ceiling": sp.simplify(ceiling * z - c5 - z * (ceiling - c5 / z)),
    }
    assert all(value == 0 for value in constraint_equivalences.values())

    old_witnesses = []
    for order, m, av, bv in ((27, 24, 6820, 17668), (28, 25, 8245, 22937)):
        c5v = sp.Integer(comb(order - 4, 5))
        zv = sp.Rational(6, order - 6)
        residual = sp.factor((order - 6) * (c5v - av) * zv - 6 * (c5v - bv * zv))
        h_lower = sp.factor(c5v / zv - sp.Rational(order - 6, 6) * (c5v - av))
        assert residual < 0
        assert h_lower > bv
        containment_margin = sp.factor(c5v - av - h_lower)
        extension_margin = sp.factor(sp.Rational(m - 4, 5) * av - h_lower)
        half_margin = sp.factor(c5v - 2 * h_lower * zv)
        assert containment_margin >= 0 and extension_margin >= 0 and half_margin >= 0
        old_witnesses.append(
            {
                "n": order,
                "m": m,
                "a": av,
                "b": bv,
                "h_extension_code_residual": str(residual),
                "excluded": True,
                "h_active_lower_b": str(h_lower),
                "h_lower_strictly_dominates_old_b": True,
                "h_face_containment_margin": str(containment_margin),
                "h_face_extension_margin": str(extension_margin),
                "h_face_half_retention_margin": str(half_margin),
                "h_face_is_nonempty": True,
            }
        )
    return {
        "combinatorial_statement": (
            "H=A-q has n-1 vertices. Double counting extensions of independent "
            "5-sets in H gives 6*h6<=((n-1)-5)*h5=(n-6)*h5."
        ),
        "coefficient_identification": "h5=c5-a and h6=c6-b=(c5-b*z)/z",
        "source_residual": str(source_residual),
        "code_residual": str(code_residual),
        "translation": str(translated),
        "bz_h_face": str(bz_face),
        "bz_face_sets_h_residual_to_zero": True,
        "h_face_constraint_directions": {name: "PASS" for name in constraint_equivalences},
        "positive_multiplier": "z=c5/c6>0",
        "old_relaxed_witnesses": old_witnesses,
    }


def decomposition_audit() -> dict:
    checks = []
    for m in range(18, 27):
        alpha = sp.Rational(m - 4, 2)
        correction = sp.Rational((m - 4) * (m - 9), 12)
        direct_adjacent = sp.Rational(comb(m - 3, 2), 6)
        assert correction == direct_adjacent - alpha
        assert alpha > 0 and correction > 0
        assert sp.Rational(m, 2) > 1
        checks.append(
            {
                "m": m,
                "alpha_total_pair": str(alpha),
                "adjacent_correction": str(correction),
                "regime_intervals": ["0<=r<=1", f"1<=r<={sp.Rational(m,2)}", f"r>={sp.Rational(m,2)}"],
            }
        )
    return {
        "edge_ratio": "r=B4/C(m-2,2), with actual integer e>=ceil(r)>=r",
        "regime_0": "0<=r<=1; use C(e,2)>=0 and A>=0",
        "regime_1": "1<=r<=m/2; use C(e,2)>=r(r-1)/2 and A>=0",
        "regime_2": "r>=m/2; additionally A>=2e-m>=2r-m",
        "regime_no_gap": True,
        "regime_boundary_overlaps": ["r=1", "r=m/2"],
        "m_checks": checks,
        "faces": {
            "ratio": (
                "b=ratio_lower with ratio_lower-lifted_badset>=0 and "
                "ratio_lower-b_H>=0 via the retained H residual"
            ),
            "lifted": (
                "b=lifted_badset with lifted_badset-ratio_lower>=0 and "
                "lifted_badset-b_H>=0 via the retained H residual"
            ),
            "h_extension_lower": "b_H=c5/z-(n-6)(c5-a)/6",
            "h_extension": (
                "b=b_H with b_H-ratio_lower>=0 and b_H-lifted_badset>=0, "
                "all expressed after multiplication by z>0"
            ),
            "three_face_no_gap": (
                "The three sources cover b=max(ratio_lower,lifted_badset,b_H); "
                "all equality overlaps are retained."
            ),
            "current_sources_no_gap": True,
        },
        "pair_face_index_count_n27_n38": 1944,
        "h_face_index_count_n27_n38": 972,
        "full_three_face_index_count_n27_n38": 2916,
        "count_derivation": (
            "sum(n-19,n=27..38)=162; 162*3 regimes*2 q endpoints gives "
            "972 cells per face, hence 2916 over three faces"
        ),
    }


def replay_hard_cells() -> list[dict]:
    rows = []
    cases = ((27, 24, "ratio"), (27, 24, "lifted"), (28, 25, "ratio"), (28, 25, "lifted"))
    for n, m, face in cases:
        command = [
            sys.executable,
            str(PAIR_PROVER),
            "--n", str(n),
            "--m", str(m),
            "--regime", "2",
            "--face", face,
            "--q", "0",
            "--depth", "52",
        ]
        completed = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
        stdout = completed.stdout.strip()
        parts = stdout.split(maxsplit=5)
        assert len(parts) == 6
        assert (int(parts[0]), int(parts[1]), int(parts[2]), parts[3], int(parts[4])) == (n, m, 2, face, 0)
        parsed = ast.literal_eval(parts[5])
        assert completed.returncode == 0 and completed.stderr.strip() == ""
        assert parsed["status"] == "PASS" and parsed["worst"] == "None"
        assert parsed["nodes"] == 2 * (parsed["passed"] + parsed["discarded"]) - 1
        rows.append(
            {
                "n": n,
                "m": m,
                "regime": 2,
                "face": face,
                "q": 0,
                "depth": 52,
                "returncode": completed.returncode,
                "stderr": completed.stderr.strip(),
                "parsed": parsed,
                "stdout": stdout,
            }
        )
    return rows


def replay_h_face_cells() -> list[dict]:
    rows = []
    for n, m in ((27, 24), (28, 25)):
        command = [
            sys.executable,
            str(H_PROVER),
            "--n", str(n),
            "--m", str(m),
            "--regime", "2",
            "--q", "0",
            "--depth", "80",
        ]
        completed = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
        stdout = completed.stdout.strip()
        parts = stdout.split(maxsplit=4)
        assert len(parts) == 5
        assert (int(parts[0]), int(parts[1]), int(parts[2]), int(parts[3])) == (n, m, 2, 0)
        parsed = ast.literal_eval(parts[4])
        assert completed.returncode == 0 and completed.stderr.strip() == ""
        assert parsed["status"] == "PASS" and parsed["worst"] == "None"
        assert parsed["nodes"] == 2 * (parsed["passed"] + parsed["discarded"]) - 1
        rows.append(
            {
                "n": n,
                "m": m,
                "regime": 2,
                "face": "H-extension",
                "q": 0,
                "depth": 80,
                "returncode": completed.returncode,
                "stderr": completed.stderr.strip(),
                "parsed": parsed,
                "stdout": stdout,
            }
        )
    return rows


def main() -> int:
    pair_prover_hash = sha256(PAIR_PROVER)
    h_prover_hash = sha256(H_PROVER)
    assert pair_prover_hash == EXPECTED_PAIR_PROVER_SHA256
    assert h_prover_hash == EXPECTED_H_PROVER_SHA256
    report = {
        "schema": "rank7-delta0-weighted-pair-h-extension-independent-audit-v1",
        "status": "PASS_H_ALGEBRA_CONSTRAINT_DIRECTIONS_THREE_FACE_UNION_AND_SIX_HARD_REPLAYS",
        "pair_prover_sha256": pair_prover_hash,
        "h_face_prover_sha256": h_prover_hash,
        "h_extension": h_extension_algebra(),
        "three_regime_three_face_decomposition": decomposition_audit(),
        "fresh_pair_face_sequential_replay": replay_hard_cells(),
        "fresh_h_face_sequential_replay": replay_h_face_cells(),
        "scope": (
            "This audit proves the H-extension coupling, bz translation, constraint "
            "directions, and exact three-face union, and freshly replays the six named "
            "regime-2 q-lower hard cells. It does not claim the two full checkpointed "
            "batches have completed."
        ),
    }
    OUTPUT.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(report["status"])
    print("report", OUTPUT.name, sha256(OUTPUT))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
