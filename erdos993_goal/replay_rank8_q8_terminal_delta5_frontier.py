#!/usr/bin/env python3
"""Replay the exact Delta5 two-sided-capacity frontier and finite theorem."""

from __future__ import annotations
import hashlib,json,subprocess,sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent
MANIFEST=ROOT/"rank8_q8_terminal_delta5_frontier_manifest_20260817.json"
OUTPUT=ROOT/"rank8_q8_terminal_delta5_frontier_replay_20260817.json"

def sha256(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def run(script,marker):
    result=subprocess.run([sys.executable,"-u",str(ROOT/script)],cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,check=False)
    if result.returncode or marker not in result.stdout:raise RuntimeError(result.stdout)
    return result.stdout

def main():
    manifest=json.loads(MANIFEST.read_text(encoding="utf-8"));assert manifest["schema"]=="rank8-q8-terminal-delta5-frontier-v1";assert manifest["status"]=="PARTIAL_EXACT_FRONTIER"
    capacity=manifest["capacity_reduction"];assert sha256(ROOT/capacity["file"])==capacity["sha256"];run(capacity["file"],"PASS_EXACT_RANK8_TERMINAL_DELTA5_CAPACITY_REDUCTION_WITH_LIVE_S_D5");assert sha256(ROOT/capacity["report"])==capacity["report_sha256"]
    two=manifest["two_sided_capacity"];assert sha256(ROOT/two["file"])==two["sha256"];run(two["file"],"PASS_EXACT_RANK8_TERMINAL_DELTA5_TWO_SIDED_CAPACITY_POLYGON");assert sha256(ROOT/two["report"])==two["report_sha256"]
    finite=manifest["finite_certificate"];assert sha256(ROOT/finite["source"])==finite["source_sha256"];assert sha256(ROOT/finite["replay"])==finite["replay_sha256"];run(finite["replay"],"PASS_EXACT_RANK8_TERMINAL_DELTA5_ALL_ROOTED_CORES_N1_THROUGH_N20");assert sha256(ROOT/finite["report"])==finite["report_sha256"]
    report=json.loads((ROOT/finite["report"]).read_text(encoding="utf-8"));assert report["totals"]=={"free_trees":1346024,"rooted_cores":26056124,"active_rooted_cores":26053352};assert all(row["Delta5_minimum"]>=0 for row in report["rows"])
    for row in manifest["successful_relaxed_branches"]:
        path=ROOT/row["report"];assert sha256(path)==row["sha256"];payload=json.loads(path.read_text(encoding="utf-8"));assert payload["status"]=="PASS";assert payload["initial_minimum"]=="0"
    for row in manifest["relaxed_cone_no_go_reports"]:
        path=ROOT/row["report"];assert sha256(path)==row["sha256"];payload=json.loads(path.read_text(encoding="utf-8"));assert payload["status"]=="UNRESOLVED_NO_SPLIT";assert payload["initial_minimum"].startswith("-")
    artifacts=["RANK8_Q8_TERMINAL_DELTA5_TWO_SIDED_CAPACITY_FRONTIER_2026-08-17.md","replay_rank8_q8_terminal_delta5_frontier.py",MANIFEST.name,capacity["file"],capacity["report"],two["file"],two["report"],finite["source"],finite["replay"],finite["report"]]+[row["report"] for row in manifest["successful_relaxed_branches"]+manifest["relaxed_cone_no_go_reports"]]
    payload={"schema":"rank8-q8-terminal-delta5-frontier-replay-v1","status":"PASS","proved_finite_range":"1<=n<=20","open_range":"n>=21","rooted_tree_counterexample":None,"remaining_analytic_constraint":manifest["remaining_analytic_constraint"],"artifacts_sha256":{name:sha256(ROOT/name) for name in artifacts}}
    OUTPUT.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");print("RANK8_Q8_TERMINAL_DELTA5_FRONTIER_REPLAY_PASS");print(OUTPUT.name,sha256(OUTPUT))

if __name__=="__main__":main()
