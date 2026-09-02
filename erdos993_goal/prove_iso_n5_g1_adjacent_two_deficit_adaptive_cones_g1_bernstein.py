#!/usr/bin/env python3
"""Exact all-order cone theorem for adjacent g1 with two positive deficits.

The front-end reduction leaves two incident-edge vertices up to exchange
symmetry and two factorial-drop sectors.  This source independently rebuilds
and checks all four homogeneous simplex polynomials using the direct FLINT
completion implementation in the pinned audit module.

This proves the analytic n>=13 cone only.  Finite orders, the occupation
identity, and final adjacent-g1 assembly remain explicit dependencies.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from audit_iso_n5_g1_adjacent_adaptive_simplex_independent_g1_bernstein import (
    abstract,
    coefficient_digest,
    homogeneous_flint,
    map_branch,
)


HERE=Path(__file__).resolve().parent
OUTPUT=HERE/"iso_n5_g1_adjacent_two_deficit_adaptive_cones_exact_g1_bernstein_20260830.json"
MARKER="PASS_EXACT_ISO_N5_G1_ADJACENT_TWO_DEFICIT_ADAPTIVE_CONES_G1_BERNSTEIN"
EXPECTED={
    ("high","none"):{
        "homogeneous_coefficients":1011780,"minimum":"2/15",
        "coefficient_stream_sha256":"19ECCFC8265AA52DA4739DCAB8225611D5AFEC1DA844E22DD3B822BEE22875C9",
    },
    ("high","x"):{
        "homogeneous_coefficients":1011780,"minimum":"2/15",
        "coefficient_stream_sha256":"C5702C82CF0663CE5A320836D0D57BB2F5198A6B80E841CB7F181958B13B5E2A",
    },
    ("low","none"):{
        "homogeneous_coefficients":1218360,"minimum":"2/15",
        "coefficient_stream_sha256":"596EBFB8FE47B687E78A99E494B942F19594DFA08501629A44EE07B0BD17DA77",
    },
    ("low","x"):{
        "homogeneous_coefficients":1218360,"minimum":"2/15",
        "coefficient_stream_sha256":"A2D8F0721FE987A071B2D97BF539340F4F5E3F3BF91BBAEC852B4CDEAAFCC6FA",
    },
}
DEPENDENCIES={
    "audit_iso_n5_g1_adjacent_adaptive_simplex_independent_g1_bernstein.py":
        "2D0E78A6847363D849996EDB90D7F39E1B1217FB92699308CEDFB935980F519A",
    "derive_iso_n5_g1_adjacent_adaptive_endpoint_reduction_independent_g1_bernstein.py":
        "0E4726EC2CF58513AA43DD3FF53465BC3CFA804765E8CD32EB604FCA40A9EAF5",
    "derive_iso_n5_g1_adjacent_endpoint_symmetry_root.py":
        "FD414E7B6CD9B49AF5F1F03E5116109385AC1D830643BC5C2A328E0AF25381FA",
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    for name,expected in DEPENDENCIES.items():
        assert sha256(HERE/name)==expected,name
    branches={}
    for sector,endpoint in EXPECTED:
        context,mapped,ratio_count=map_branch(sector,abstract(endpoint))
        completed,degrees=homogeneous_flint(context,mapped,sector,ratio_count)
        stats=coefficient_digest(completed)
        assert stats["negative"]==stats["zero"]==0
        for key,value in EXPECTED[(sector,endpoint)].items():
            assert stats[key]==value,(sector,endpoint,key,stats[key],value)
        branches[f"{sector}_{endpoint}"]={**degrees,**stats}
        print(json.dumps({"branch":f"{sector}_{endpoint}",**degrees,**stats},sort_keys=True),flush=True)
    report={
        "marker":MARKER,
        "theorem":(
            "For n>=13, every high/low factorial-drop ratio state and every "
            "adjacent two-positive-deficit geometry state has nonnegative "
            "adaptive endpoint lower form at all three edge-budget vertices."
        ),
        "branches":branches,
        "endpoint_coverage":(
            "none and x are computed in each sector; y follows by exact p<->q symmetry"
        ),
        "certificate":(
            "direct exact homogeneous completion on the geometry simplex, ratio "
            "simplex, and low-sector interval; all nonzero monomial coefficients positive"
        ),
        "dependencies_sha256":DEPENDENCIES,
        "scope":(
            "Analytic n>=13 adjacent two-positive-deficit S=M5+3*C5 cone only. "
            "Finite orders, full adjacent g1 assembly, all N5, and Erdos Problem 993 "
            "remain separate."
        ),
        "source_sha256":sha256(Path(__file__)),
    }
    raw=json.dumps(report,indent=2,sort_keys=True)+"\n"
    OUTPUT.write_text(raw,encoding="utf-8")
    print(json.dumps({
        "marker":MARKER,"branches":list(branches),
        "all_nonzero_coefficients_strictly_positive":True,
        "scope":report["scope"],
    },indent=2,sort_keys=True))
    print("REPORT_SHA256",hashlib.sha256(raw.encode()).hexdigest().upper())
    print(MARKER)


if __name__=="__main__":
    main()
