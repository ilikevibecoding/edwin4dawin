#!/usr/bin/env python3
"""Fail-closed all-order assembly of the connected high-degree G1 profile cone.

This file assembles only the abstract nine-control degree-profile relaxation.
It deliberately does not assert that the support upper bounds used to define
that relaxation hold for every connected tree.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / (
    "iso_n7_bundle_g1_sum0_connected_high_degree_profiles_universal_"
    "exact_rank7_g4_piecewise_20260831.json"
)
MARKER = (
    "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_PROFILES_"
    "UNIVERSAL_RANK7_G4_PIECEWISE"
)

DEPENDENCIES = {
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_growth_tied_mass_bernstein_rank7_g4_piecewise.py":
        "E97B5E0433822745F8FAF9346C29FA98A59054FACD84EA61093C92464F95978F",
    "iso_n7_bundle_g1_sum0_connected_high_degree_growth_tied_mass_bernstein_exact_rank7_g4_piecewise_20260831.json":
        "0CCDC6319AEE893BF306EE5C6E88CF8C01856F22916EED0181C54A78C4170940",
    "prove_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_n41_rank7_g4_piecewise.py":
        "2A3398AB92A05398C8F8155E229D8F5B217A87C243683B1B13631F58EC1EDB7C",
    "iso_n7_bundle_g1_sum0_connected_high_degree_profiles_n41_exact_rank7_g4_piecewise_20260831.json":
        "66EAF91A4DA4BD88C6F2B4473E132D8234782263CCB8B12D651A6F43188634CC",
    "prove_iso_n7_bundle_g1_sum0_unique_degree4_profiles_rank7_g4_piecewise.py":
        "F58577973F5031D3767090EE21AE81DC7409D73DE570FC0BFFE9524414EA0311",
    "iso_n7_bundle_g1_sum0_unique_degree4_profiles_exact_rank7_g4_piecewise_20260831.json":
        "36ACA06A0141513505C2A68598957B9A4EFD72D271B8E3BA052F530B23E0F82C",
    "prove_iso_n7_bundle_g1_connected_j4_e5_coupling_rank7_g4_piecewise.py":
        "E70E9EA2333E98C89DCFE7C660B08FFBE008D4467DE0F6B1A75FC26073FEB284",
    "iso_n7_bundle_g1_connected_j4_e5_coupling_exact_rank7_g4_piecewise_20260831.json":
        "FE4AECAFC00B35F142C0F0B4BAD32D71D069FD19FBB3A2B8696E519BCBC7C256",
}

REPORT_MARKERS = {
    "iso_n7_bundle_g1_sum0_connected_high_degree_growth_tied_mass_bernstein_exact_rank7_g4_piecewise_20260831.json":
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_GROWTH_TIED_MASS_BERNSTEIN_RANK7_G4_PIECEWISE",
    "iso_n7_bundle_g1_sum0_connected_high_degree_profiles_n41_exact_rank7_g4_piecewise_20260831.json":
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_CONNECTED_HIGH_DEGREE_PROFILES_N41_RANK7_G4_PIECEWISE",
    "iso_n7_bundle_g1_sum0_unique_degree4_profiles_exact_rank7_g4_piecewise_20260831.json":
        "PASS_EXACT_ISO_N7_BUNDLE_G1_SUM0_UNIQUE_DEGREE4_PROFILES_RANK7_G4_PIECEWISE",
    "iso_n7_bundle_g1_connected_j4_e5_coupling_exact_rank7_g4_piecewise_20260831.json":
        "PASS_EXACT_ISO_N7_BUNDLE_G1_CONNECTED_J4_E5_COUPLING_RANK7_G4_PIECEWISE",
}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def partitions(total: int, ceiling: int | None = None):
    """Yield every positive integer partition in nonincreasing order."""
    if total == 0:
        yield ()
        return
    if ceiling is None or ceiling > total:
        ceiling = total
    for first in range(ceiling, 0, -1):
        for tail in partitions(total-first, first):
            yield (first,)+tail


def admissible(parts: tuple[int, ...]) -> bool:
    return bool(parts) and parts[0] >= 3 and sum(x >= 2 for x in parts) >= 3


def classify_predecessor(order: int, parts: tuple[int, ...]):
    """Return the exact induction branch and verify every growth hypothesis."""
    assert order >= 42
    assert sum(parts) == order-2
    assert tuple(sorted(parts, reverse=True)) == parts
    assert admissible(parts)

    maximum = parts[0]
    multiplicity = parts.count(maximum)

    # A unique maximum increment 3 is exactly the separately certified family
    # (3,2^b,1^c), b>=2.  Decrementing it would leave the high-degree cone.
    if maximum == 3 and multiplicity == 1:
        number_of_twos = parts.count(2)
        assert number_of_twos >= 2
        assert all(x in (1, 2) for x in parts[1:])
        assert order == 5+2*number_of_twos+parts.count(1)
        return "unique_degree4_exception", None, None

    reduced = list(parts)
    reduced[0] -= 1
    predecessor = tuple(sorted((x for x in reduced if x), reverse=True))
    old_order = order-1
    selected_old_degree = maximum

    # Since two other branching parts contribute at least 2+2, maximum is at
    # most order-6.  This is precisely d<=old_order-5 in the growth theorem.
    assert maximum+4 <= sum(parts)
    assert 3 <= selected_old_degree <= old_order-5

    # Ties are allowed: after the decrement every old excess is <=maximum=d.
    assert max(predecessor) <= selected_old_degree
    assert sum(predecessor) == old_order-2
    assert admissible(predecessor)
    return "tied_growth", predecessor, selected_old_degree


def main() -> None:
    for name, digest in DEPENDENCIES.items():
        assert sha256(HERE/name) == digest, name
    for name, marker in REPORT_MARKERS.items():
        report = json.loads((HERE/name).read_text(encoding="utf-8"))
        assert report["status"] == "proved exact", name
        assert report["marker"] == marker, name
        assert report.get("source_sha256") == DEPENDENCIES[
            name.replace("iso_n7_bundle_g1_sum0_connected_high_degree_growth_tied_mass_bernstein_exact_rank7_g4_piecewise_20260831.json", "prove_iso_n7_bundle_g1_sum0_connected_high_degree_growth_tied_mass_bernstein_rank7_g4_piecewise.py")
                .replace("iso_n7_bundle_g1_sum0_connected_high_degree_profiles_n41_exact_rank7_g4_piecewise_20260831.json", "prove_iso_n7_bundle_g1_sum0_connected_high_degree_profiles_n41_rank7_g4_piecewise.py")
                .replace("iso_n7_bundle_g1_sum0_unique_degree4_profiles_exact_rank7_g4_piecewise_20260831.json", "prove_iso_n7_bundle_g1_sum0_unique_degree4_profiles_rank7_g4_piecewise.py")
                .replace("iso_n7_bundle_g1_connected_j4_e5_coupling_exact_rank7_g4_piecewise_20260831.json", "prove_iso_n7_bundle_g1_connected_j4_e5_coupling_rank7_g4_piecewise.py")
        ], name

    # A bounded independent implementation audit exercises the all-order case
    # splitter on every admissible partition at the first nine induction orders.
    stream = hashlib.sha256()
    branch_counts = {"tied_growth": 0, "unique_degree4_exception": 0}
    profiles = 0
    for order in range(42, 51):
        for parts in partitions(order-2):
            if not admissible(parts):
                continue
            branch, predecessor, selected_degree = classify_predecessor(order, parts)
            stream.update(
                f"{order}|{parts}|{branch}|{predecessor}|{selected_degree}\n".encode("ascii")
            )
            branch_counts[branch] += 1
            profiles += 1
    assert profiles == 735693
    assert branch_counts == {
        "tied_growth": 735520,
        "unique_degree4_exception": 173,
    }
    assert stream.hexdigest().upper() == (
        "A302E5ED5443605E1D753F230D009AC78547B3AEF388EEBA77BAFADF035E8A74"
    )

    report = {
        "marker": MARKER,
        "status": "proved exact",
        "theorem": (
            "For every order n>=41 and every integer degree-excess profile "
            "partitioning n-2 with maximum increment at least three and at "
            "least three increments at least two, all nine controls of the "
            "pinned connected-tree G1 degree-profile relaxation are "
            "nonnegative."
        ),
        "induction": {
            "base": (
                "n=41 is the pinned exhaustive 30,787-profile certificate."
            ),
            "ordinary_or_tied_maximum": (
                "For n>=42, decrement a maximum increment x. If x>=4, or "
                "if x=3 has multiplicity at least two, the predecessor stays "
                "admissible. The selected old degree is d=x; two other "
                "branching increments give x<=n-6=(n-1)-5, and every old "
                "degree excess is <=x=d. Thus the pinned tied-growth theorem "
                "makes every control nondecreasing."
            ),
            "only_exception": (
                "If x=3 is unique, the profile is exactly "
                "(3,2^b,1^c), b>=2. The pinned unique-degree-4 theorem "
                "proves every such profile directly for n>=42."
            ),
            "coverage_gap": None,
        },
        "independent_case_split_audit": {
            "orders": [42, 50],
            "profiles": profiles,
            "branch_counts": branch_counts,
            "ordered_stream_sha256": stream.hexdigest().upper(),
            "exceptions_outside_the_two_proved_branches": 0,
        },
        "coverage_gap_within_degree_profile_relaxation": None,
        "scope": (
            "Exact universal degree-profile relaxation only, for connected "
            "high-degree profiles with at least three branching vertices. "
            "This does NOT promote actual connected-tree G1: the E6/E7/E8 "
            "support-cap validity and the finite actual-topology seam remain "
            "separate obligations. It does not cover disconnected forests, "
            "other marked geometries, or parent modes."
        ),
        "dependencies_sha256": DEPENDENCIES,
        "source_sha256": sha256(Path(__file__)),
    }
    encoded = json.dumps(report, indent=2, sort_keys=True)+"\n"
    OUTPUT.write_text(encoded, encoding="utf-8", newline="\n")
    print(json.dumps({
        "marker": MARKER,
        "profiles_in_case_split_audit": profiles,
        "branch_counts": branch_counts,
        "ordered_stream_sha256": stream.hexdigest().upper(),
        "coverage_gap_within_degree_profile_relaxation": None,
        "actual_connected_tree_g1_promoted": False,
    }, indent=2, sort_keys=True))
    print("SOURCE_SHA256", report["source_sha256"])
    print("REPORT_SHA256", hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
