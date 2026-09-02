#!/usr/bin/env python3
"""Replay and package exact WROM terminal-broom scans on a declared band."""
from __future__ import annotations
import argparse,ast,hashlib,json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parent
EXE=ROOT/"verify_rank7_terminal_broom_finite_n19_n22.exe"
SRC=ROOT/"verify_rank7_terminal_broom_finite_n19_n22.rs"
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest().upper()
def main():
    ap=argparse.ArgumentParser();ap.add_argument("--first",type=int,default=19);ap.add_argument("--last",type=int,default=20);a=ap.parse_args()
    run=subprocess.run([str(EXE),str(a.first),str(a.last)],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,check=False)
    marker=f"PASS_EXACT_RANK7_TERMINAL_BROOM_ALL_ROOTED_CORES_N{a.first}_THROUGH_N{a.last}"
    if run.returncode or marker not in run.stdout:raise RuntimeError(run.stdout)
    rows=[]
    pattern=re.compile(r"core_n=(\d+) trees=(\d+) roots=(\d+) minima=(\[.*\]) negative=\[\]")
    for line in run.stdout.splitlines():
        m=pattern.fullmatch(line)
        if m:
            minima=ast.literal_eval(m.group(4));assert len(minima)==14 and min(minima)>=0
            rows.append({"order":int(m.group(1)),"free_trees":int(m.group(2)),"rooted_cores":int(m.group(3)),"newton_minima":minima})
    assert [r["order"] for r in rows]==list(range(a.first,a.last+1))
    out=ROOT/f"rank7_terminal_broom_finite_n{a.first}_n{a.last}_exact_20260816.json"
    payload={"schema":"rank7-terminal-broom-finite-midband-v1","status":marker,"scope":f"every root of every free tree, orders {a.first} through {a.last}","conclusion":"all fourteen Newton coefficients are nonnegative, hence R_t>=0 for every integer t>=1","rows":rows,"artifacts_sha256":{SRC.name:sha(SRC),EXE.name:sha(EXE)}}
    out.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(marker);print(out.name,sha(out))
if __name__=="__main__":main()
