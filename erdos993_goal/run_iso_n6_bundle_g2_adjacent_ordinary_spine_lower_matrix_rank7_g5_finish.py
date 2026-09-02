#!/usr/bin/env python3
"""Run the exact large/small marked-spine Bernstein shard matrix."""

from __future__ import annotations
import argparse,concurrent.futures,json,subprocess,sys,time
from pathlib import Path
import hashlib

HERE=Path(__file__).resolve().parent
LARGE=HERE/"probe_iso_n6_bundle_g2_adjacent_ordinary_marked_spine_subset_lower_flint_rank7_g5_finish.py"
SMALL=HERE/"probe_iso_n6_bundle_g2_adjacent_ordinary_marked_spine_subset_lower_small_order_flint_rank7_g5_finish.py"
LM="PROBE_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_SUBSET_LOWER_FLINT_RANK7_G5_FINISH"
SM="PROBE_EXACT_ISO_N6_BUNDLE_G2_ADJACENT_ORDINARY_MARKED_SPINE_SUBSET_LOWER_SMALL_ORDER_FLINT_RANK7_G5_FINISH"
REDUCTION_SHA256="D7B0817B10EECB89D5D5E7E676F0178A4976B647E9A2B6A3B179CD4EC36E8CDB"
FORCE=False


def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest().upper()


def output_path(kind,key):
    if kind=="large":
        orientation,chart,b,c=key;return HERE/f"iso_n6_bundle_g2_adjacent_ordinary_spine_lower_{orientation}_{chart}_B{b}_C{c}_beta0_70_flint_rank7_g5_finish_20260831.json"
    side,k,b,c=key;return HERE/f"iso_n6_bundle_g2_adjacent_ordinary_spine_lower_small_{side}{k}_B{b}_C{c}_beta0_70_flint_rank7_g5_finish_20260831.json"


def valid(kind,key):
    path=output_path(kind,key)
    if not path.is_file():return False
    try:r=json.loads(path.read_text(encoding="utf-8"))
    except Exception:return False
    marker=LM if kind=="large" else SM
    producer=LARGE if kind=="large" else SMALL
    return r.get("marker")==marker and r.get("source_sha256")==sha(producer) and r.get("reduction_report_sha256")==REDUCTION_SHA256 and r.get("processed_betas")==70 and r.get("negative_betas")==0 and all(x.get("negative")==0 for x in r.get("records",[]))


def run(job):
    kind,key=job
    if not FORCE and valid(kind,key):return kind,key,"SKIP",0.0
    if kind=="large":
        o,ch,b,c=key;cmd=[sys.executable,str(LARGE),"--orientation",o,"--order-chart",ch,"--b-mask",str(b),"--c-mask",str(c)]
    else:
        s,k,b,c=key;cmd=[sys.executable,str(SMALL),"--small-side",s,"--small-order",str(k),"--b-mask",str(b),"--c-mask",str(c)]
    start=time.time();p=subprocess.run(cmd,cwd=HERE,text=True,capture_output=True,timeout=900)
    if p.returncode or not valid(kind,key):raise RuntimeError((job,p.returncode,p.stdout[-1000:],p.stderr[-2000:]))
    return kind,key,"PASS",time.time()-start


def main():
    global FORCE
    ap=argparse.ArgumentParser();ap.add_argument("kind",choices=("large","small"));ap.add_argument("--workers",type=int,default=2);ap.add_argument("--force",action="store_true");args=ap.parse_args();FORCE=args.force
    if args.kind=="large":jobs=[("large",(o,ch,b,c)) for o in ("B_le_C","B_ge_C") for ch in ("low","high") for b in (0,1) for c in (0,1)]
    else:jobs=[("small",(s,k,b,c)) for s in ("B","C") for k in range(7) for b in (0,1) for c in (0,1)]
    failures=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        future={pool.submit(run,j):j for j in jobs}
        for index,f in enumerate(concurrent.futures.as_completed(future),1):
            try:result=f.result();print(f"{index}/{len(jobs)} {result}",flush=True)
            except Exception as exc:failures.append((future[f],repr(exc)));print(f"FAIL {future[f]} {exc}",flush=True)
    if failures:raise SystemExit(json.dumps(failures,indent=2))
    print(f"PASS_MATRIX {args.kind} {len(jobs)}",flush=True)


if __name__=="__main__":main()
