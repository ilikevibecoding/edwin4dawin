#!/usr/bin/env python3
"""Hash-pinned assembly of the all-rank tail-boost convolution theorem."""

from __future__ import annotations

from fractions import Fraction
import hashlib
import json
import os
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "uniform_low_high_tail_boost_convolution_assembler_root_20260828.json"

DEPENDENCIES = {
    "high_high_producer": (
        "prove_uniform_high_high_mlr_convolution_root.py",
        "818B2EFA16AEC2FA12A398697D3C1CC59E6EE057E73063238E1C62259E4867EB",
        None,
    ),
    "high_high_report": (
        "uniform_high_high_mlr_convolution_exact_root_20260827.json",
        "2B8AA7A6BDA968889C6700207C74FC9F41448C7FCEB389425C4B9938405315EA",
        "PASS_EXACT_ANALYTIC_ALL_RANK_HIGH_HIGH_CONVOLUTION_MARGIN",
    ),
    "high_high_auditor": (
        "audit_uniform_high_high_mlr_convolution_independent_root.py",
        "153740ABFE8FA3FE9632F2BE5100A724EC73D561CB192E90CD378A426BCF46B3",
        None,
    ),
    "high_high_audit": (
        "uniform_high_high_mlr_convolution_independent_audit_root_20260827.json",
        "42318EA4CB73DC4E60B6FA6837D9259DDEACFD5E230E0DC21601504C565BA509",
        "PASS_INDEPENDENT_EXACT_ANALYTIC_ALL_RANK_HIGH_HIGH_CONVOLUTION_MARGIN_AUDIT",
    ),
    "pairwise_producer": (
        "prove_uniform_low_high_tail_pairwise_reduction_root.py",
        "113C5BF29AC3299D6235D37E85E3356687FB62604F1B4D6DAE440DF072612BEF",
        None,
    ),
    "pairwise_report": (
        "uniform_low_high_tail_pairwise_reduction_exact_root_20260827.json",
        "FD3408D7FB011604F87C67EA03B082B86FFD955AA778887B673E0A863303977B",
        "PASS_EXACT_ANALYTIC_ALL_RANK_Q2_AND_SINGLE_NEGATIVE_PAIR_REDUCTION",
    ),
    "pairwise_note": (
        "UNIFORM_LOW_HIGH_TAIL_PAIRWISE_REDUCTION_2026-08-27.md",
        "104AF8F106ADF3765D050E4637E6EA1548A3DEB992CC093ADCAA5BE35F458EF1",
        None,
    ),
    "pairwise_auditor": (
        "audit_uniform_low_high_tail_pairwise_reduction_independent_root.py",
        "61D2D86132AD33FBCEE450430359F52B996A47591EC67F55E03D0C8E0D8FFD17",
        None,
    ),
    "pairwise_audit": (
        "uniform_low_high_tail_pairwise_reduction_independent_audit_root_20260827.json",
        "0C58E55E8CBB350E436BC253E8C26FDF8C68FF7353C57A69878ACD32F25CE65E",
        "PASS_INDEPENDENT_EXACT_ANALYTIC_ALL_RANK_Q2_AND_SINGLE_NEGATIVE_PAIR_REDUCTION_AUDIT",
    ),
    "payment_producer": (
        "prove_uniform_low_high_matched_local_pair_payment_root.py",
        "811166967CB5479619F766B638FEA94077E0A2A4E75211AFCF8E8CABE77FB07B",
        None,
    ),
    "payment_report": (
        "uniform_low_high_matched_local_pair_payment_exact_root_20260828.json",
        "20278F5C3881A8066ECFAC21A87C3DAE9FBD662986EE074241F8EDE249DC3077",
        "PASS_EXACT_ANALYTIC_ALL_RANK_MATCHED_LOCAL_PAIR_PAYMENT",
    ),
    "payment_note": (
        "UNIFORM_LOW_HIGH_MATCHED_LOCAL_PAIR_PAYMENT_2026-08-28.md",
        "645FEF475ED1F067C64A9C8BC9BD97E1379017B32D92D51216794A3222270356",
        None,
    ),
    "payment_auditor": (
        "audit_uniform_low_high_matched_local_pair_payment_independent_agent.py",
        "C674306224042E4FCEE496FC11D7BE58D3658DC50C4243A73391E0FDD8C4E8D5",
        None,
    ),
    "payment_audit": (
        "uniform_low_high_matched_local_pair_payment_independent_audit_20260828.json",
        "93C8C614796B4D3B96810CC23E7412783390658B1CC90B3A7AC7DE89C1293E42",
        "PASS_INDEPENDENT_EXACT_ALL_RANK_MATCHED_LOCAL_PAIR_PAYMENT_AUDIT",
    ),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def atomic_json(path: Path, payload: dict) -> str:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    os.replace(temporary, path)
    return sha256(path)


def audit_dependencies() -> dict:
    audited = {}
    for label, (name, expected_hash, expected_status) in DEPENDENCIES.items():
        path = HERE / name
        actual_hash = sha256(path)
        assert actual_hash == expected_hash, (label, actual_hash, expected_hash)
        row = {"path": name, "sha256": actual_hash}
        if expected_status is not None:
            data = json.loads(path.read_text(encoding="utf-8"))
            assert data["status"] == expected_status
            row["status"] = expected_status
        audited[label] = row

    assert json.loads(
        (HERE / DEPENDENCIES["pairwise_report"][0]).read_text(encoding="utf-8")
    )["source_sha256"] == DEPENDENCIES["pairwise_producer"][1]
    assert json.loads(
        (HERE / DEPENDENCIES["payment_report"][0]).read_text(encoding="utf-8")
    )["source_sha256"] == DEPENDENCIES["payment_producer"][1]
    assert json.loads(
        (HERE / DEPENDENCIES["high_high_report"][0]).read_text(encoding="utf-8")
    )["source_sha256"] == DEPENDENCIES["high_high_producer"][1]
    return audited


def convex_quadratic_replay() -> dict:
    cases = 0
    minimum = None
    for capacity in range(1, 25):
        for h in range(1, 9):
            for base in range(0, 17):
                lower_slope = Fraction(-capacity * base, h)
                for slope_offset in range(0, 13):
                    slope = lower_slope + slope_offset
                    for quadratic in range(0, 9):
                        for numerator in range(0, h + 1):
                            t = Fraction(numerator, capacity)
                            value = base + slope * t + quadratic * t * t
                            assert value >= 0
                            cases += 1
                            if minimum is None or value < minimum:
                                minimum = value
    return {
        "cases": cases,
        "failures": 0,
        "minimum_value": str(minimum),
        "lemma": (
            "If m0>=0, q2>=0, C*m0+h*m1>=0, and 0<=t<=h/C, "
            "then m0+m1*t+q2*t^2>=0."
        ),
        "proof_split": {
            "m1_nonnegative": "every summand is nonnegative",
            "m1_negative": (
                "m0+m1*t >= m0+m1*h/C = (C*m0+h*m1)/C >=0"
            ),
        },
    }


def main() -> int:
    dependencies = audit_dependencies()
    quadratic = convex_quadratic_replay()
    payload = {
        "schema": "uniform-low-high-tail-boost-convolution-assembler-root-v1",
        "status": "PASS_HASH_PINNED_EXACT_ALL_RANK_TAIL_BOOST_CONVOLUTION_THEOREM",
        "date": "2026-08-28",
        "theorem": (
            "For every k>=8 under the forest-high gap hypotheses with "
            "A1-A2=h, let a_i(lambda)=a_i for i<=2 and lambda*a_i for "
            "i>=3. Then the normalized margin M(lambda) is nonnegative for "
            "1<=lambda<=1+h/A2. Its quadratic coefficient and the strong "
            "auxiliary A2*M(1)+h*M'(1) are nonnegative."
        ),
        "assembly_logic": {
            "base_margin": (
                "The independently audited high/high MLR theorem gives M(1)>=0."
            ),
            "quadratic": (
                "The independently audited pairwise theorem gives [lambda^2]M>=0."
            ),
            "strong_auxiliary": (
                "The pairwise theorem leaves one adverse pair; the independently "
                "audited matched-local payment pays it, so A2*M(1)+h*M'(1)>=0."
            ),
            "interval": (
                "Apply the exact convex-quadratic lemma with t=lambda-1, "
                "C=A2, m0=M(1), and m1=M'(1)."
            ),
        },
        "convex_quadratic_lemma": quadratic,
        "dependencies": dependencies,
        "scope_warning": (
            "This closes the stated one-coordinate tail-boost cone. It does not "
            "by itself prove the full low/low convolution cone, forest assembly, "
            "or Erdos Problem 993."
        ),
        "source_sha256": sha256(Path(__file__).resolve()),
    }
    report_hash = atomic_json(OUTPUT, payload)
    print(payload["status"])
    print("SOURCE", payload["source_sha256"])
    print("REPORT", report_hash)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
