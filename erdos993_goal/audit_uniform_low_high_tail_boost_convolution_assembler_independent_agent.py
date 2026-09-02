#!/usr/bin/env python3
"""Independent fail-closed audit of the tail-boost theorem assembly.

The assembler and all dependency producers/auditors are read only as frozen
artifacts.  None is imported or executed.  The integration logic and direct
binomial-convolution checks are reconstructed here independently.
"""

from __future__ import annotations

from fractions import Fraction
import hashlib
from math import comb, factorial
import json
import os
from pathlib import Path

import sympy as sp


HERE = Path(__file__).resolve().parent
ASSEMBLER = HERE / "assemble_uniform_low_high_tail_boost_convolution_root_20260828.py"
ASSEMBLER_REPORT = HERE / "uniform_low_high_tail_boost_convolution_assembler_root_20260828.json"
THEOREM_NOTE = HERE / "UNIFORM_LOW_HIGH_TAIL_BOOST_CONVOLUTION_THEOREM_2026-08-28.md"
OUTPUT = HERE / "uniform_low_high_tail_boost_convolution_assembler_independent_audit_20260828.json"

EXPECTED_ASSEMBLER_SHA256 = "089B4908C20E562EC4D75BB208C0D975297BE2BE654F5D1BFDC56AC026D01370"
EXPECTED_ASSEMBLER_REPORT_SHA256 = "BCFCFF07F62D0E8CB967C76276246DDCB7C6DF6D8128749EB2C26CAA44944E53"
EXPECTED_NOTE_SHA256 = "2A88990943F3376524D7B40552E56AEB3C1E6B5B88D92526A70FC3E3C6B64D4C"
EXPECTED_ASSEMBLER_STATUS = "PASS_HASH_PINNED_EXACT_ALL_RANK_TAIL_BOOST_CONVOLUTION_THEOREM"

EXPECTED_DEPENDENCIES = {
    "high_high_producer": {
        "path": "prove_uniform_high_high_mlr_convolution_root.py",
        "sha256": "818B2EFA16AEC2FA12A398697D3C1CC59E6EE057E73063238E1C62259E4867EB",
    },
    "high_high_report": {
        "path": "uniform_high_high_mlr_convolution_exact_root_20260827.json",
        "sha256": "2B8AA7A6BDA968889C6700207C74FC9F41448C7FCEB389425C4B9938405315EA",
        "status": "PASS_EXACT_ANALYTIC_ALL_RANK_HIGH_HIGH_CONVOLUTION_MARGIN",
    },
    "high_high_auditor": {
        "path": "audit_uniform_high_high_mlr_convolution_independent_root.py",
        "sha256": "153740ABFE8FA3FE9632F2BE5100A724EC73D561CB192E90CD378A426BCF46B3",
    },
    "high_high_audit": {
        "path": "uniform_high_high_mlr_convolution_independent_audit_root_20260827.json",
        "sha256": "42318EA4CB73DC4E60B6FA6837D9259DDEACFD5E230E0DC21601504C565BA509",
        "status": "PASS_INDEPENDENT_EXACT_ANALYTIC_ALL_RANK_HIGH_HIGH_CONVOLUTION_MARGIN_AUDIT",
    },
    "pairwise_producer": {
        "path": "prove_uniform_low_high_tail_pairwise_reduction_root.py",
        "sha256": "113C5BF29AC3299D6235D37E85E3356687FB62604F1B4D6DAE440DF072612BEF",
    },
    "pairwise_report": {
        "path": "uniform_low_high_tail_pairwise_reduction_exact_root_20260827.json",
        "sha256": "FD3408D7FB011604F87C67EA03B082B86FFD955AA778887B673E0A863303977B",
        "status": "PASS_EXACT_ANALYTIC_ALL_RANK_Q2_AND_SINGLE_NEGATIVE_PAIR_REDUCTION",
    },
    "pairwise_note": {
        "path": "UNIFORM_LOW_HIGH_TAIL_PAIRWISE_REDUCTION_2026-08-27.md",
        "sha256": "104AF8F106ADF3765D050E4637E6EA1548A3DEB992CC093ADCAA5BE35F458EF1",
    },
    "pairwise_auditor": {
        "path": "audit_uniform_low_high_tail_pairwise_reduction_independent_root.py",
        "sha256": "61D2D86132AD33FBCEE450430359F52B996A47591EC67F55E03D0C8E0D8FFD17",
    },
    "pairwise_audit": {
        "path": "uniform_low_high_tail_pairwise_reduction_independent_audit_root_20260827.json",
        "sha256": "0C58E55E8CBB350E436BC253E8C26FDF8C68FF7353C57A69878ACD32F25CE65E",
        "status": "PASS_INDEPENDENT_EXACT_ANALYTIC_ALL_RANK_Q2_AND_SINGLE_NEGATIVE_PAIR_REDUCTION_AUDIT",
    },
    "payment_producer": {
        "path": "prove_uniform_low_high_matched_local_pair_payment_root.py",
        "sha256": "811166967CB5479619F766B638FEA94077E0A2A4E75211AFCF8E8CABE77FB07B",
    },
    "payment_report": {
        "path": "uniform_low_high_matched_local_pair_payment_exact_root_20260828.json",
        "sha256": "20278F5C3881A8066ECFAC21A87C3DAE9FBD662986EE074241F8EDE249DC3077",
        "status": "PASS_EXACT_ANALYTIC_ALL_RANK_MATCHED_LOCAL_PAIR_PAYMENT",
    },
    "payment_note": {
        "path": "UNIFORM_LOW_HIGH_MATCHED_LOCAL_PAIR_PAYMENT_2026-08-28.md",
        "sha256": "645FEF475ED1F067C64A9C8BC9BD97E1379017B32D92D51216794A3222270356",
    },
    "payment_auditor": {
        "path": "audit_uniform_low_high_matched_local_pair_payment_independent_agent.py",
        "sha256": "C674306224042E4FCEE496FC11D7BE58D3658DC50C4243A73391E0FDD8C4E8D5",
    },
    "payment_audit": {
        "path": "uniform_low_high_matched_local_pair_payment_independent_audit_20260828.json",
        "sha256": "93C8C614796B4D3B96810CC23E7412783390658B1CC90B3A7AC7DE89C1293E42",
        "status": "PASS_INDEPENDENT_EXACT_ALL_RANK_MATCHED_LOCAL_PAIR_PAYMENT_AUDIT",
    },
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


def audit_dependency_routes(assembler_report: dict) -> dict:
    report_dependencies = assembler_report["dependencies"]
    assert report_dependencies == EXPECTED_DEPENDENCIES
    assert len(report_dependencies) == 14

    replayed = {}
    loaded_json = {}
    for name, expected in EXPECTED_DEPENDENCIES.items():
        path = HERE / expected["path"]
        actual_hash = sha256(path)
        assert actual_hash == expected["sha256"]
        record = {
            "path": expected["path"],
            "sha256": actual_hash,
            "hash_match": True,
        }
        if path.suffix.lower() == ".json":
            document = json.loads(path.read_text(encoding="utf-8"))
            loaded_json[name] = document
            assert document["status"] == expected["status"]
            record["status"] = document["status"]
            record["status_match"] = True
        replayed[name] = record

    high_report = loaded_json["high_high_report"]
    high_audit = loaded_json["high_high_audit"]
    pair_report = loaded_json["pairwise_report"]
    pair_audit = loaded_json["pairwise_audit"]
    payment_report = loaded_json["payment_report"]
    payment_audit = loaded_json["payment_audit"]

    assert high_report["source_sha256"] == EXPECTED_DEPENDENCIES[
        "high_high_producer"
    ]["sha256"]
    assert high_audit["source_sha256"] == EXPECTED_DEPENDENCIES[
        "high_high_auditor"
    ]["sha256"]
    assert high_audit["theorem_sha256"] == EXPECTED_DEPENDENCIES[
        "high_high_report"
    ]["sha256"]
    assert high_audit["producer_source"]["sha256"] == EXPECTED_DEPENDENCIES[
        "high_high_producer"
    ]["sha256"]
    assert high_audit["producer_source"]["imported"] is False

    assert pair_report["source_sha256"] == EXPECTED_DEPENDENCIES[
        "pairwise_producer"
    ]["sha256"]
    assert pair_audit["source_sha256"] == EXPECTED_DEPENDENCIES[
        "pairwise_auditor"
    ]["sha256"]
    assert pair_audit["producer_imported"] is False
    immutable_pair = pair_audit["immutable_inputs"]
    for dependency_name in ("pairwise_producer", "pairwise_report", "pairwise_note"):
        expected = EXPECTED_DEPENDENCIES[dependency_name]
        assert immutable_pair[expected["path"]] == expected["sha256"]

    assert payment_report["source_sha256"] == EXPECTED_DEPENDENCIES[
        "payment_producer"
    ]["sha256"]
    assert payment_audit["audit_source_sha256"] == EXPECTED_DEPENDENCIES[
        "payment_auditor"
    ]["sha256"]
    assert payment_audit["producer_source_not_imported_or_executed"] is True
    assert payment_audit["frozen_inputs"] == {
        "producer": EXPECTED_DEPENDENCIES["payment_producer"]["sha256"],
        "producer_report": EXPECTED_DEPENDENCIES["payment_report"]["sha256"],
        "theorem_note": EXPECTED_DEPENDENCIES["payment_note"]["sha256"],
    }

    # Fail closed on the exact logical claims being assembled.
    assert high_report["theorem"]["conclusion"] == (
        "c_k^2-c_(k-1)c_(k+1)-h*c_(k-1)c_k>=0"
    )
    pair_theorem = pair_report["theorem"]
    assert "tail-boost quadratic coefficient q2 is nonnegative" in pair_theorem
    assert "A2*M(1)+h*M'(1)" in pair_theorem
    assert "-h*A2*p1*p2*K_q(1,2)" in pair_theorem
    payment_theorem = payment_report["theorem"]
    assert "pay h*A2*p1*p2*K_q(1,2)" in payment_theorem
    assert "unique adverse pair" in payment_theorem
    assert "four selected pair terms pay the unique negative left pair" in payment_audit[
        "conclusion"
    ]

    return {
        "dependency_count": len(replayed),
        "status_bearing_dependency_count": sum(
            "status" in item for item in replayed.values()
        ),
        "dependencies": replayed,
        "transitive_source_and_audit_routes_match": True,
        "scope_chain": {
            "base_margin": "high/high theorem supplies M(1)>=0",
            "quadratic_coefficient": "pairwise theorem supplies [lambda^2]M>=0",
            "strong_auxiliary": (
                "pairwise reduction leaves exactly one adverse term and the "
                "matched local-pair theorem pays it, so A2*M(1)+h*M'(1)>=0"
            ),
        },
    }


def independent_convex_quadratic_audit() -> dict:
    m0, m1, q2, scale, capacity, theta = sp.symbols(
        "m0 m1 q2 scale capacity theta"
    )
    time = theta * scale / capacity
    strong = capacity * m0 + scale * m1
    quadratic = m0 + m1 * time + q2 * time**2
    convex_form = (
        (1 - theta) * m0
        + theta * strong / capacity
        + q2 * (theta * scale / capacity) ** 2
    )
    assert sp.factor(quadratic - convex_form) == 0

    # A separate exact grid checks the abstract lemma, including m1<0.
    cases = 0
    for capacity_value in (1, 2, 5, 17):
        for scale_value in (0, 1, 3, 11):
            for m0_value in (0, 1, 7, 31):
                for q2_value in (0, 1, 5, 19):
                    for m1_value in range(-31, 32):
                        if (
                            capacity_value * m0_value
                            + scale_value * m1_value
                            < 0
                        ):
                            continue
                        for theta_value in (
                            Fraction(0),
                            Fraction(1, 7),
                            Fraction(1, 3),
                            Fraction(1, 2),
                            Fraction(2, 3),
                            Fraction(6, 7),
                            Fraction(1),
                        ):
                            if scale_value == 0:
                                time_value = Fraction(0)
                            else:
                                time_value = (
                                    theta_value
                                    * scale_value
                                    / capacity_value
                                )
                            value = (
                                Fraction(m0_value)
                                + m1_value * time_value
                                + q2_value * time_value**2
                            )
                            assert value >= 0
                            cases += 1

    return {
        "identity": (
            "For h>0 and theta=C*t/h in [0,1], "
            "m0+m1*t+q2*t^2=(1-theta)*m0+theta*(C*m0+h*m1)/C"
            "+q2*(theta*h/C)^2. For h=0 the interval is t=0."
        ),
        "continuum_sign_argument": (
            "m0, q2, C*m0+h*m1, 1-theta, and theta are nonnegative; C>0"
        ),
        "symbolic_identity_exact": True,
        "independent_abstract_rational_cases": cases,
        "abstract_failures": 0,
    }


def ratios_from_gaps(gaps, terminal) -> list[Fraction]:
    ratios = [Fraction(0)] * (len(gaps) + 1)
    ratios[-1] = Fraction(terminal)
    for index in range(len(gaps) - 1, -1, -1):
        ratios[index] = ratios[index + 1] + Fraction(gaps[index])
    return ratios


def ordinary_row(ratios) -> list[Fraction]:
    row = [Fraction(1)]
    for ratio in ratios:
        row.append(row[-1] * ratio)
    return row


def convolution_split(left, right, degree: int) -> tuple[Fraction, Fraction]:
    fixed = Fraction(0)
    tail = Fraction(0)
    for index in range(degree + 1):
        term = Fraction(comb(degree, index)) * left[index] * right[degree - index]
        if index >= 3:
            tail += term
        else:
            fixed += term
    return fixed, tail


def direct_row_quantities(rank, h, left_ratios, right_ratios) -> dict:
    left = ordinary_row(left_ratios)
    right = ordinary_row(right_ratios)
    split = {
        degree: convolution_split(left, right, degree)
        for degree in (rank - 1, rank, rank + 1)
    }

    # Independently verify the ordinary/binomial versus factorial convolution.
    for degree in (rank - 1, rank, rank + 1):
        ordinary_at_one = sum(split[degree])
        factorial_sum = sum(
            left[index]
            / factorial(index)
            * right[degree - index]
            / factorial(degree - index)
            for index in range(degree + 1)
        )
        assert ordinary_at_one == factorial(degree) * factorial_sum

    def value(degree: int, lam: Fraction) -> Fraction:
        fixed, tail = split[degree]
        return fixed + lam * tail

    minus = value(rank - 1, Fraction(1))
    center = value(rank, Fraction(1))
    plus = value(rank + 1, Fraction(1))
    tail_minus = split[rank - 1][1]
    tail_center = split[rank][1]
    tail_plus = split[rank + 1][1]

    m0 = center**2 - minus * plus - h * minus * center
    m1 = (
        2 * center * tail_center
        - tail_minus * plus
        - minus * tail_plus
        - h * (tail_minus * center + minus * tail_center)
    )
    q2 = (
        tail_center**2
        - tail_minus * tail_plus
        - h * tail_minus * tail_center
    )
    capacity = left_ratios[2]
    strong = capacity * m0 + h * m1
    return {
        "split": split,
        "m0": m0,
        "m1": m1,
        "q2": q2,
        "capacity": capacity,
        "strong": strong,
        "value": value,
    }


def independent_binomial_replay() -> dict:
    ranks = (8, 9, 10, 12, 16, 20)
    scales = (Fraction(0), Fraction(1, 2), Fraction(1), Fraction(2), Fraction(4))
    interval_fractions = (
        Fraction(0),
        Fraction(1, 7),
        Fraction(1, 3),
        Fraction(1, 2),
        Fraction(2, 3),
        Fraction(6, 7),
        Fraction(1),
    )
    row_cases = 0
    lambda_points = 0
    minimum = None

    for rank in ranks:
        for h in scales:
            left_base = [2 * h] + [h] * (rank - 1)
            right_base = [2 * h] + [h] * (rank - 1)
            slack_unit = h if h > 0 else Fraction(1)
            left_patterns = (
                ("tight", {}, Fraction(1)),
                ("first", {0: 3}, Fraction(1)),
                ("index2", {2: 5}, Fraction(1)),
                ("last", {rank - 1: 17}, Fraction(1)),
                ("cross", {0: 31, rank - 2: 19}, Fraction(3)),
            )
            right_patterns = (
                ("tight", {}, Fraction(1)),
                ("central", {rank - 3: 31}, Fraction(1)),
                ("upstream", {rank - 4: 17}, Fraction(1)),
                ("downstream", {rank - 2: 29}, Fraction(1)),
                ("last", {rank - 1: 101}, Fraction(1)),
                (
                    "multi",
                    {
                        0: 11,
                        rank - 4: 7,
                        rank - 3: 100,
                        rank - 2: 13,
                        rank - 1: 101,
                    },
                    Fraction(5),
                ),
            )

            for left_name, left_modifications, left_terminal in left_patterns:
                left_gaps = left_base.copy()
                for index, multiplier in left_modifications.items():
                    left_gaps[index] += multiplier * slack_unit
                left_ratios = ratios_from_gaps(left_gaps, left_terminal)
                assert left_ratios[0] - left_ratios[1] >= 2 * h
                assert left_ratios[1] - left_ratios[2] == h
                assert all(
                    left_ratios[index] - left_ratios[index + 1] >= h
                    for index in range(2, rank)
                )

                for right_name, right_modifications, right_terminal in right_patterns:
                    right_gaps = right_base.copy()
                    for index, multiplier in right_modifications.items():
                        right_gaps[index] += multiplier * slack_unit
                    right_ratios = ratios_from_gaps(right_gaps, right_terminal)
                    assert right_ratios[0] - right_ratios[1] >= 2 * h
                    assert all(
                        right_ratios[index] - right_ratios[index + 1] >= h
                        for index in range(1, rank)
                    )

                    quantities = direct_row_quantities(
                        rank, h, left_ratios, right_ratios
                    )
                    assert quantities["m0"] >= 0
                    assert quantities["q2"] >= 0
                    assert quantities["strong"] >= 0
                    row_cases += 1

                    for interval_fraction in interval_fractions:
                        if h == 0:
                            time = Fraction(0)
                        else:
                            time = (
                                interval_fraction
                                * h
                                / quantities["capacity"]
                            )
                        lam = 1 + time
                        minus = quantities["value"](rank - 1, lam)
                        center = quantities["value"](rank, lam)
                        plus = quantities["value"](rank + 1, lam)
                        direct_margin = (
                            center**2 - minus * plus - h * minus * center
                        )
                        quadratic_margin = (
                            quantities["m0"]
                            + quantities["m1"] * time
                            + quantities["q2"] * time**2
                        )
                        assert direct_margin == quadratic_margin
                        assert direct_margin >= 0
                        lambda_points += 1
                        if minimum is None or direct_margin < minimum["margin"]:
                            minimum = {
                                "margin": direct_margin,
                                "rank": rank,
                                "h": h,
                                "left_pattern": left_name,
                                "right_pattern": right_name,
                                "interval_fraction": interval_fraction,
                                "lambda": lam,
                            }

    assert row_cases == 900
    assert lambda_points == 6300
    return {
        "row_cases": row_cases,
        "lambda_points": lambda_points,
        "failures": 0,
        "rank_set": list(ranks),
        "h_set": [str(item) for item in scales],
        "interval_fraction_set": [str(item) for item in interval_fractions],
        "families": (
            "tight, endpoint-slack, index2, tail, central, neighboring, "
            "cross, and multi-extreme positive ratio rows"
        ),
        "ordinary_binomial_to_factorial_scaling_checked": True,
        "quadratic_reconstruction_checked_at_every_point": True,
        "minimum_margin": str(minimum["margin"]),
        "minimum_case": {
            "rank": minimum["rank"],
            "h": str(minimum["h"]),
            "left_pattern": minimum["left_pattern"],
            "right_pattern": minimum["right_pattern"],
            "interval_fraction": str(minimum["interval_fraction"]),
            "lambda": str(minimum["lambda"]),
        },
    }


def main() -> int:
    frozen_inputs = {
        "assembler": sha256(ASSEMBLER),
        "assembler_report": sha256(ASSEMBLER_REPORT),
        "theorem_note": sha256(THEOREM_NOTE),
    }
    assert frozen_inputs == {
        "assembler": EXPECTED_ASSEMBLER_SHA256,
        "assembler_report": EXPECTED_ASSEMBLER_REPORT_SHA256,
        "theorem_note": EXPECTED_NOTE_SHA256,
    }

    assembler_report = json.loads(ASSEMBLER_REPORT.read_text(encoding="utf-8"))
    assert assembler_report["status"] == EXPECTED_ASSEMBLER_STATUS
    assert assembler_report["source_sha256"] == EXPECTED_ASSEMBLER_SHA256
    theorem_note = THEOREM_NOTE.read_text(encoding="utf-8")
    assert EXPECTED_ASSEMBLER_SHA256 in theorem_note
    assert EXPECTED_ASSEMBLER_REPORT_SHA256 in theorem_note
    assert EXPECTED_ASSEMBLER_STATUS in theorem_note

    dependency_audit = audit_dependency_routes(assembler_report)
    quadratic_audit = independent_convex_quadratic_audit()
    binomial_replay = independent_binomial_replay()
    payload = {
        "schema": "uniform-low-high-tail-boost-convolution-assembler-independent-audit-v1",
        "status": "PASS_INDEPENDENT_HASH_PINNED_EXACT_ALL_RANK_TAIL_BOOST_CONVOLUTION_ASSEMBLY_AUDIT",
        "date": "2026-08-28",
        "frozen_inputs": frozen_inputs,
        "assembler_not_imported_or_executed": True,
        "dependency_producers_and_auditors_not_imported_or_executed": True,
        "dependency_audit": dependency_audit,
        "convex_quadratic_audit": quadratic_audit,
        "independent_binomial_convolution_replay": binomial_replay,
        "conclusion": (
            "The 14 frozen dependency routes and six statuses align exactly. "
            "They supply M(1)>=0, [lambda^2]M>=0, and "
            "A2*M(1)+h*M'(1)>=0. The independently reconstructed convex "
            "quadratic identity therefore proves M(lambda)>=0 throughout "
            "1<=lambda<=1+h/A2 for every k>=8 under the stated hypotheses."
        ),
        "scope_warning": (
            "This certifies only the integrated one-coordinate tail-boost "
            "convolution theorem. It does not certify the remaining low/low "
            "cone, forest assembly, or Erdos Problem 993."
        ),
        "audit_source": Path(__file__).name,
        "audit_source_sha256": sha256(Path(__file__)),
    }
    report_hash = atomic_json(OUTPUT, payload)
    print(payload["status"])
    print(OUTPUT.name)
    print(report_hash)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
