#!/usr/bin/env python3
"""Exact bounded fixed-exceptional/full rank-eight cone certificates."""

from __future__ import annotations

import argparse
import csv
import ctypes
import hashlib
import json
import math
from pathlib import Path
import threading
import time

from flint import fmpz_mpoly_ctx

from verify_rank4_three_halves_forest_certificate import polynomial_statistics


ROOT = Path(__file__).resolve().parent
JETS = ROOT / "rank8_exceptional_tree_jets_exact_20260820.tsv"
CLASSIFICATION = ROOT / "rank8_exceptional_tree_jets_exact_20260820.json"
GIB = 1024**3


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def ratios_to_coefficients(ratios, one):
    out = [one]
    for ratio in ratios:
        out.append(out[-1]*ratio)
    return out


def high_factor(h, terminal, slacks, one):
    gaps = (2*h+slacks[0],)+tuple(h+value for value in slacks[1:])
    ratios = [None]*9
    ratios[8] = terminal
    for index in range(7,-1,-1):
        ratios[index] = ratios[index+1]+gaps[index]
    return ratios_to_coefficients(ratios,one)


def low_factor(h, r, terminal, slacks, one):
    d0,d2,d3,d4,d5,d6,d7 = slacks
    gaps = (
        2*h+d0, r, 2*h-r+d2, h+d3, h+d4, h+d5, h+d6, h+d7,
    )
    ratios = [None]*9
    ratios[8] = terminal
    for index in range(7,-1,-1):
        ratios[index] = ratios[index+1]+gaps[index]
    return ratios_to_coefficients(ratios,one)


def convolution(left,right,zero):
    return [
        sum((math.comb(rank,index)*left[index]*right[rank-index]
             for index in range(rank+1)),zero)
        for rank in range(10)
    ]


def margin(coefficients,h):
    return coefficients[8]**2-coefficients[7]*coefficients[9]-h*coefficients[7]*coefficients[8]


def load_jets():
    classification=json.loads(CLASSIFICATION.read_text(encoding="utf-8"))
    assert classification["status"] == "PASS_EXACT_RANK8_EXCEPTIONAL_CONNECTED_TREE_JET_CLASSIFICATION"
    assert classification["hashes"][JETS.name] == digest(JETS)
    rows=[]
    with JETS.open(newline="",encoding="utf-8") as handle:
        for row in csv.DictReader(handle,delimiter="\t"):
            alpha=int(row["alpha"])
            polynomial=tuple(int(row[f"i{rank}"]) for rank in range(10))
            value=int(row["q8"])
            assert value == 16*polynomial[8]**2-polynomial[7]*polynomial[8]-18*polynomial[7]*polynomial[9]
            assert alpha<=7 or value<0
            rows.append((alpha,polynomial,value))
    assert len(rows)==len(set(rows))==classification["distinct_exceptional_jets"]
    return rows


def context(mode):
    if mode=="high":
        ctx=fmpz_mpoly_ctx.get(("h","t",*(f"d{i}" for i in range(8))),"degrevlex")
        h,t,*slacks=ctx.gens()
        factor=high_factor(h,t,slacks,ctx.constant(1))
    else:
        ctx=fmpz_mpoly_ctx.get(("a","b","t","d0",*(f"d{i}" for i in range(2,8))),"degrevlex")
        a,b,t,*slacks=ctx.gens()
        h=a+b
        factor=low_factor(h,a,t,slacks,ctx.constant(1))
    return ctx,h,factor


def scaled_fixed(polynomial,h):
    return [2**rank*math.factorial(rank)*coefficient*h**rank
            for rank,coefficient in enumerate(polynomial)]


class PROCESS_MEMORY_COUNTERS_EX(ctypes.Structure):
    _fields_=[
        ("cb",ctypes.c_ulong),("PageFaultCount",ctypes.c_ulong),
        ("PeakWorkingSetSize",ctypes.c_size_t),("WorkingSetSize",ctypes.c_size_t),
        ("QuotaPeakPagedPoolUsage",ctypes.c_size_t),("QuotaPagedPoolUsage",ctypes.c_size_t),
        ("QuotaPeakNonPagedPoolUsage",ctypes.c_size_t),("QuotaNonPagedPoolUsage",ctypes.c_size_t),
        ("PagefileUsage",ctypes.c_size_t),("PeakPagefileUsage",ctypes.c_size_t),
        ("PrivateUsage",ctypes.c_size_t),
    ]


def private_bytes():
    counters=PROCESS_MEMORY_COUNTERS_EX(); counters.cb=ctypes.sizeof(counters)
    kernel32=ctypes.WinDLL("kernel32",use_last_error=True)
    psapi=ctypes.WinDLL("psapi",use_last_error=True)
    kernel32.GetCurrentProcess.restype=ctypes.c_void_p
    psapi.GetProcessMemoryInfo.argtypes=(ctypes.c_void_p,ctypes.POINTER(PROCESS_MEMORY_COUNTERS_EX),ctypes.c_ulong)
    psapi.GetProcessMemoryInfo.restype=ctypes.c_int
    ok=psapi.GetProcessMemoryInfo(kernel32.GetCurrentProcess(),ctypes.byref(counters),counters.cb)
    if not ok: raise ctypes.WinError()
    return int(counters.PrivateUsage)


def run(mode,start,stop):
    jets=load_jets()
    if stop is None: stop=len(jets)
    assert 1<=start<=stop<=len(jets)
    peak=private_bytes(); event=threading.Event(); started=time.time()
    def sample():
        nonlocal peak
        while not event.wait(0.05): peak=max(peak,private_bytes())
    sampler=threading.Thread(target=sample,daemon=True); sampler.start()
    try:
        ctx,h,full=context(mode); zero=ctx.constant(0)
        total_terms=negative=0; minimum=maximum=None; rows=[]
        for index in range(start-1,stop):
            alpha,polynomial,value=jets[index]
            product=convolution(scaled_fixed(polynomial,h),full,zero)
            result=margin(product,h)
            stats=polynomial_statistics(result)
            total_terms+=stats["terms"]; negative+=stats["negative"]
            minimum=stats["minimum"] if minimum is None else min(minimum,stats["minimum"])
            maximum=stats["maximum"] if maximum is None else max(maximum,stats["maximum"])
            rows.append({"index":index+1,"alpha":alpha,"fixed_Q8":value,**stats})
            print(f"fixed-{mode} {index+1}/{len(jets)} terms={stats['terms']} negative={stats['negative']} private_GiB={private_bytes()/GIB:.3f}",flush=True)
            # A failure here is an enlarged-cone obstruction, not a forest counterexample.
            assert stats["negative"]==0
            assert peak<GIB
        payload={
            "status":f"PASS_EXACT_MEMORY_BOUNDED_RANK8_EXCEPTIONAL_FIXED_{mode.upper()}_RANGE",
            "mode":mode,"range_start":start,"range_stop":stop,
            "exceptional_jet_total":len(jets),"cases":len(rows),
            "statistics":{"terms":total_terms,"negative":negative,"minimum":minimum,"maximum":maximum},
            "peak_private_bytes":peak,"peak_private_GiB":peak/GIB,
            "elapsed_seconds":time.time()-started,"rows":rows,
            "scope_warning":"This range certificate is not the complete fixed/full obligation unless it covers all exceptional jets and both modes.",
            "hashes":{JETS.name:digest(JETS),CLASSIFICATION.name:digest(CLASSIFICATION),Path(__file__).name:digest(Path(__file__))},
        }
        output=ROOT/f"rank8_exceptional_fixed_{mode}_exact_20260820_range_{start}_{stop}.json"
        output.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8")
        print(payload["status"]); print("REPORT",output.name,digest(output))
        return payload
    finally:
        event.set(); sampler.join(timeout=1)


def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--mode",choices=("high","low"),required=True)
    parser.add_argument("--start",type=int,default=1); parser.add_argument("--stop",type=int)
    args=parser.parse_args(); run(args.mode,args.start,args.stop)


if __name__=="__main__": main()
