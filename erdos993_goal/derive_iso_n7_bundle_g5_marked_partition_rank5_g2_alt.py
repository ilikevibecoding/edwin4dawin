#!/usr/bin/env python3
"""Independent exact W/A/B/Z reconstruction of rank-seven bundle g5."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import sympy as sp

from audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt import (
    reconstruct_coefficients,
)


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "iso_n7_bundle_g5_marked_partition_exact_rank5_g2_alt_20260830.json"
MARKER = "DERIVED_EXACT_ISO_N7_BUNDLE_G5_MARKED_PARTITION_RANK5_G2_ALT"
RECON_SOURCE = HERE / "audit_iso_n7_bundle_g7_g12_independent_rank5_g2_alt.py"
RECON_SOURCE_SHA = "E80E7C08A74E87F5B202A57BF4DE8E1960760A5443068CC8C07BC3C35A421E37"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def main():
    assert sha256(RECON_SOURCE) == RECON_SOURCE_SHA
    g5_generic = reconstruct_coefficients()[5]
    n, q, eu, ev = sp.symbols("n q epsilon_u epsilon_v", nonnegative=True)
    structural = {}
    for name in "EUVW":
        structural[sp.Symbol(f"c{name}0")] = 1
        structural[sp.Symbol(f"d{name}0")] = 1
    structural.update({
        sp.Symbol("cE1"):n, sp.Symbol("cU1"):n-1,
        sp.Symbol("cV1"):n-1, sp.Symbol("cW1"):n-2,
        sp.Symbol("dE1"):q, sp.Symbol("dU1"):q-eu,
        sp.Symbol("dV1"):q-ev, sp.Symbol("dW1"):q-eu-ev,
    })
    raw = sp.factor(g5_generic.subs(structural))

    rows = {
        name: {rank: sp.Symbol(f"{name}{rank}", nonnegative=True)
               for rank in range(2,8)}
        for name in "WABZ"
    }
    partition = {}
    for rank in range(2,8):
        w,a,b,z = (rows[name][rank] for name in "WABZ")
        partition.update({
            sp.Symbol(f"cW{rank}"):w,
            sp.Symbol(f"cU{rank}"):w+a,
            sp.Symbol(f"cV{rank}"):w+b,
            sp.Symbol(f"cE{rank}"):w+a+b+z,
        })
    dnames = ("dE5","dE6","dU4","dU5","dU6","dV4","dV5","dV6","dW3","dW4","dW5")
    dvars = {name:sp.Symbol(name.upper(), nonnegative=True) for name in dnames}
    partition.update({sp.Symbol(name):value for name,value in dvars.items()})
    partitioned = sp.factor(raw.subs(partition))
    variables = tuple(sorted(partitioned.free_symbols,key=str))
    polynomial = sp.Poly(partitioned,*variables)
    terms = polynomial.terms()
    negative = [(powers,value) for powers,value in terms if value<0]
    stream = "".join(f"{powers}:{value};" for powers,value in terms)
    report = {
        "marker":MARKER,
        "rank":7,
        "coefficient":"g5",
        "raw_structural_expression":str(raw),
        "partitioned_expression":str(partitioned),
        "marked_partition":{
            "Wk":"independent k-sets containing neither mark",
            "Ak":"independent k-sets containing v but not u",
            "Bk":"independent k-sets containing u but not v",
            "Zk":"independent k-sets containing both marks",
            "identity":"cWk=Wk,cUk=Wk+Ak,cVk=Wk+Bk,cEk=Wk+Ak+Bk+Zk",
        },
        "summary":{
            "monomials":len(terms),
            "negative_scalar_coefficients":len(negative),
            "minimum_scalar_coefficient":str(min(polynomial.coeffs())),
            "ordered_term_stream_sha256":hashlib.sha256(stream.encode()).hexdigest().upper(),
            "free_symbols":[str(value) for value in variables],
        },
        "negative_terms":[
            {"powers":list(powers),"coefficient":str(value)}
            for powers,value in negative
        ],
        "status":"exact marked-partition reduction; no sign theorem asserted",
        "scope":"Universal rank-seven bundle g5 algebra only.",
        "dependencies_sha256":{RECON_SOURCE.name:RECON_SOURCE_SHA},
        "source_sha256":sha256(Path(__file__)),
    }
    encoded=json.dumps(report,indent=2,sort_keys=True)+"\n"
    OUTPUT.write_text(encoded,encoding="utf-8",newline="\n")
    print(json.dumps({"marker":MARKER,**report["summary"]},indent=2,sort_keys=True))
    print("SOURCE_SHA256",report["source_sha256"])
    print("REPORT_SHA256",hashlib.sha256(encoded.encode()).hexdigest().upper())
    print(MARKER)


if __name__ == "__main__":
    main()
