#!/usr/bin/env python3
"""Independent exact replay of one curvature outer-chunk manifest.

The producer is not imported.  This file separately reconstructs the allowed
base/linear/direction pieces, merges their coefficient streams without a global
row assembly, and exact-compares all three b0 chunks and the full ordered row
digest.
"""

from __future__ import annotations

import argparse
import ctypes
import gc
import hashlib
import json
import os
from pathlib import Path
from ctypes import wintypes

from flint import fmpz_mpoly_ctx

from probe_rank8_low_low_a23_mixed_cross_truncated_agent import (
    BASE_NAMES,
    GROUP_A,
    GROUP_B,
    SLACK_NAMES,
    Graded,
    convolution,
    factor_row,
)


HARD_PRIVATE_LIMIT = 3_000_000_000
LOW_LEVEL_SOURCE = "probe_rank8_low_low_a23_mixed_cross_truncated_agent.py"


class PMC(ctypes.Structure):
    _fields_ = [
        ("cb", wintypes.DWORD), ("PageFaultCount", wintypes.DWORD),
        ("PeakWorkingSetSize", ctypes.c_size_t), ("WorkingSetSize", ctypes.c_size_t),
        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t), ("QuotaPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t), ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
        ("PagefileUsage", ctypes.c_size_t), ("PeakPagefileUsage", ctypes.c_size_t),
        ("PrivateUsage", ctypes.c_size_t),
    ]


def memory_private():
    item = PMC()
    item.cb = ctypes.sizeof(item)
    current = ctypes.windll.kernel32.GetCurrentProcess
    current.restype = wintypes.HANDLE
    query = ctypes.windll.psapi.GetProcessMemoryInfo
    query.argtypes = (wintypes.HANDLE, ctypes.POINTER(PMC), wintypes.DWORD)
    query.restype = wintypes.BOOL
    if not query(current(), ctypes.byref(item), item.cb):
        raise OSError("GetProcessMemoryInfo failed")
    return int(item.PrivateUsage)


def guard(stage, peak):
    value = memory_private()
    peak[0] = max(peak[0], value)
    if value >= HARD_PRIVATE_LIMIT:
        raise MemoryError(f"memory guard at {stage}: {value}")


def product(left, right, degree, zero):
    result = zero
    for i in range(degree + 1):
        j = degree - i
        if i < len(left.c) and j < len(right.c) and left.c[i] and right.c[j]:
            result += left.c[i] * right.c[j]
    return result


def curvature(row, degree, zero, h):
    return product(row[8], row[8], degree, zero) - product(row[7], row[9], degree, zero) - h * product(row[7], row[8], degree, zero)


def cross(row0, row1, degree, zero, h):
    return (
        2 * product(row0[8], row1[8], degree, zero)
        - product(row0[7], row1[9], degree, zero)
        - product(row1[7], row0[9], degree, zero)
        - h * (product(row0[7], row1[8], degree, zero) + product(row1[7], row0[8], degree, zero))
    )


def construct(face, label, degree, peak):
    names = BASE_NAMES + SLACK_NAMES
    ctx = fmpz_mpoly_ctx.get(names, "degrevlex")
    raw = dict(zip(names, ctx.gens()))
    zero_raw = ctx.constant(0)
    Graded.max_degree = degree
    Graded.zero = zero_raw
    var = {name: (Graded.slack(raw[name]) if name in SLACK_NAMES else Graded.base(raw[name])) for name in names}
    zero = Graded.base(zero_raw)
    one = Graded.base(ctx.constant(1))
    h = var["h"]
    z, w = face
    a2, a3 = (1-z)*var["P"], z*var["P"]
    b2, b3 = (1-w)*var["Q"], w*var["Q"]
    lg = (2*h+var["a0"], h, h+a2, h+a3, h+var["a4"], h+var["a5"], h+var["a6"], h+var["a7"])
    rg = (2*h+var["b0"], h, h+b2, h+b3, h+var["b4"], h+var["b5"], h+var["b6"], h+var["b7"])
    _, left = factor_row(var["ta"], lg, one)
    ratios, right0 = factor_row(var["tb"], rg, one)
    tail = [zero, zero, zero] + left[3:]
    v0 = {rank: convolution(tail, right0, rank, zero) for rank in (7,8,9)}
    base = curvature(v0, degree, zero_raw, raw["h"])
    gc.collect()
    guard("audit curvature base", peak)
    if degree == 16:
        return names, ((4 if label == "curvature_middle_times_4" else 1, base),)
    right1 = [zero for _ in right0]
    right1[3] = h * right0[2]
    for rank in range(4,10):
        right1[rank] = right1[rank-1] * ratios[rank-1]
    v1 = {rank: convolution(tail, right1, rank, zero) for rank in (7,8,9)}
    linear = cross(v0, v1, degree, zero_raw, raw["h"])
    gc.collect()
    guard("audit curvature linear", peak)
    if label == "curvature_middle_times_4":
        return names, ((4,base),(2,linear))
    if degree == 15:
        return names, ((1,base),(1,linear))
    direction = curvature(v1, degree, zero_raw, raw["h"])
    gc.collect()
    guard("audit curvature direction", peak)
    return names, ((1,base),(1,linear),(1,direction))


def term_key(monomial):
    return (-sum(monomial), tuple(reversed(monomial)))


class Cursor:
    def __init__(self, polynomial, scale, a, b, degree):
        self.p, self.scale, self.a, self.b, self.degree = polynomial, scale, a, b, degree
        self.i = 0
        self.previous = None

    def advance(self):
        while self.i < len(self.p):
            i = self.i
            self.i += 1
            monomial = tuple(map(int, self.p.monomial(i)))
            key = term_key(monomial)
            if self.previous is not None:
                assert self.previous <= key
            self.previous = key
            if not (any(monomial[j] for j in self.a) and any(monomial[j] for j in self.b)):
                continue
            assert sum(monomial[len(BASE_NAMES):]) == self.degree
            return key, monomial, self.scale * int(self.p.coefficient(i))
        return None


def replay(names, pieces, degree, peak):
    index = {name: names.index(name) for name in names}
    a = tuple(index[name] for name in GROUP_A)
    b = tuple(index[name] for name in GROUP_B)
    b0 = index["b0"]
    cursors = [Cursor(poly, scale, a, b, degree) for scale,poly in pieces]
    live = [cursor.advance() for cursor in cursors]
    hashes = [hashlib.sha256() for _ in range(3)]
    whole = hashlib.sha256()
    stats = [{"outer_exponent":e,"mixed_support_terms":0,"negative_terms":0,"minimum":None,"first_negative":None} for e in range(3)]
    terms = negative = 0
    previous_outer = 0
    while any(item is not None for item in live):
        key = min(item[0] for item in live if item is not None)
        active = [i for i,item in enumerate(live) if item is not None and item[0] == key]
        monomial = live[active[0]][1]
        coefficient = 0
        for i in active:
            assert live[i][1] == monomial
            coefficient += live[i][2]
            live[i] = cursors[i].advance()
        if coefficient == 0:
            continue
        outer = monomial[b0]
        assert previous_outer <= outer <= 2
        previous_outer = outer
        encoded = ((",".join(map(str,monomial)))+":"+str(coefficient)+"\n").encode()
        hashes[outer].update(encoded)
        whole.update(encoded)
        stat = stats[outer]
        stat["mixed_support_terms"] += 1
        stat["minimum"] = coefficient if stat["minimum"] is None else min(stat["minimum"],coefficient)
        if coefficient < 0:
            negative += 1
            stat["negative_terms"] += 1
            if stat["first_negative"] is None:
                stat["first_negative"] = {"monomial":list(monomial),"coefficient":coefficient}
        terms += 1
        if terms % 100000 == 0:
            guard(f"audit curvature merge {terms}", peak)
    for e in range(3):
        stats[e]["ordered_coefficient_sha256"] = hashes[e].hexdigest().upper()
    return {"mixed_support_terms":terms,"negative_terms":negative,"ordered_coefficient_sha256":whole.hexdigest().upper(),"piece_lengths":[len(poly) for _,poly in pieces],"chunks":stats}


def file_hash(path):
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def atomic_write(path,payload):
    temporary = path.with_suffix(path.suffix+".tmp")
    temporary.write_text(json.dumps(payload,indent=2)+"\n",encoding="utf-8")
    os.replace(temporary,path)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--face",choices=("0,1","1,0"),required=True)
    parser.add_argument("--label",choices=("curvature_middle_times_4","curvature_far"),required=True)
    parser.add_argument("--degree",type=int,choices=range(2,17),required=True)
    parser.add_argument("--manifest",required=True)
    parser.add_argument("--expected-manifest-sha256",required=True)
    parser.add_argument("--output",required=True)
    args=parser.parse_args()
    face=tuple(map(int,args.face.split(",")))
    peak=[0]
    guard("curvature audit start",peak)
    names,pieces=construct(face,args.label,args.degree,peak)
    result=replay(names,pieces,args.degree,peak)
    manifest_path=Path(args.manifest).resolve()
    assert file_hash(manifest_path)==args.expected_manifest_sha256.upper()
    manifest=json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["face"]==list(face) and manifest["auxiliary"]==args.label
    assert manifest["total_ordinary_slack_degree"]==args.degree
    assert manifest["result"]["mixed_support_terms"]==result["mixed_support_terms"]
    assert manifest["result"]["negative_terms"]==result["negative_terms"]
    assert manifest["result"]["ordered_coefficient_sha256"]==result["ordered_coefficient_sha256"]
    assert manifest["result"]["piece_lengths"]==result["piece_lengths"]
    records=manifest["result"]["chunks"]
    assert [item["outer_exponent"] for item in records]==[0,1,2]
    audited=[]
    for record,actual in zip(records,result["chunks"]):
        path=Path(record["path"]).resolve()
        assert file_hash(path)==record["sha256"]
        payload=json.loads(path.read_text(encoding="utf-8"))
        for key in ("mixed_support_terms","negative_terms","minimum","first_negative","ordered_coefficient_sha256"):
            assert payload["chunk"][key]==actual[key]
        audited.append({"outer_exponent":actual["outer_exponent"],"path":str(path),"sha256":record["sha256"],"replay_exact_match":True})
    here=Path(__file__).resolve().parent
    report={
        "schema":"rank8-low-low-a23-mixed-cross-curvature-outer-independent-audit-agent-v1",
        "status":"PASS_INDEPENDENT_EXACT_CURVATURE_OUTER_CHUNK_AND_ORDERED_ROW_REPLAY",
        "face":list(face),"auxiliary":args.label,"total_ordinary_slack_degree":args.degree,
        "manifest":str(manifest_path),"manifest_sha256":args.expected_manifest_sha256.upper(),
        "replayed_mixed_support_terms":result["mixed_support_terms"],"replayed_negative_terms":result["negative_terms"],
        "replayed_ordered_coefficient_sha256":result["ordered_coefficient_sha256"],"piece_lengths":result["piece_lengths"],
        "chunk_audit":audited,"outer_support_bound":[0,2],"global_row_assembly":False,
        "hard_private_memory_limit_bytes":HARD_PRIVATE_LIMIT,"observed_peak_private_bytes_at_checkpoints":peak[0],
        "source_sha256":file_hash(Path(__file__)),"low_level_dependency_sha256":file_hash(here/LOW_LEVEL_SOURCE),
        "producer_source_sha256_from_manifest":manifest["source_sha256"],
    }
    output=Path(args.output).resolve()
    atomic_write(output,report)
    print("PASS",output,file_hash(output),flush=True)


if __name__=="__main__":
    main()
