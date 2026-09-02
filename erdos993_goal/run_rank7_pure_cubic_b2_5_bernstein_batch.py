#!/usr/bin/env python3
"""Batch exact pure-cubic B2=5 Bernstein cells; stop at first unresolved."""
from __future__ import annotations
import argparse,json,time
from math import comb
from pathlib import Path
from prove_rank7_pure_cubic_b2_5_joint_bernstein import cell,certify,balanced_values,constraint_tensors

def main():
    ap=argparse.ArgumentParser();ap.add_argument("--n-first",type=int,required=True);ap.add_argument("--n-last",type=int,required=True)
    ap.add_argument("--rank-first",type=int,default=0);ap.add_argument("--rank-last",type=int,default=6)
    ap.add_argument("--k-first",type=int,default=-7);ap.add_argument("--k-last",type=int,default=4)
    ap.add_argument("--depth",type=int,default=48);ap.add_argument("--output",required=True);a=ap.parse_args()
    started=time.time();summary={"status":"RUNNING","parameters":vars(a),"profiles":0,"branches":0,"nodes":0,"fail":None}
    for n in range(a.n_first,a.n_last+1):
      for k in range(a.k_first,a.k_last+1):
       p=max(k,0);q=max(-k,0)
       for r in (1,2,3):
        m=n-r-1
        for t in range(0,2*r+1):
         xs=balanced_values(t,r)
         if comb(r-1,2)+sum(comb(x,2) for x in xs)>5:continue
         edge_e=m-t
         if not 0<=edge_e<=m-1:continue
         # Active-branch constraints are rank-independent.  Tensorize each
         # once and reuse it for all requested Newton ranks.
         _,_,nl,nu=cell(n,p,q,r,0,"lower",0,edge_e)
         cached_constraints={}
         for side,count in (("lower",nl),("upper",nu)):
          for index in range(count):
           _,cons,_,_=cell(n,p,q,r,0,side,index,edge_e)
           cached_constraints[(side,index)]=constraint_tensors(cons)
         for rank in range(a.rank_first,a.rank_last+1):
          summary["profiles"]+=1
          for side,count in (("lower",nl),("upper",nu)):
           for index in range(count):
            obj,cons,_,_=cell(n,p,q,r,rank,side,index,edge_e)
            result=certify(obj,cons,a.depth,cached_constraints[(side,index)]);summary["branches"]+=1;summary["nodes"]+=result["nodes"]
            if result["status"]!="PASS":
             summary["status"]="UNRESOLVED";summary["fail"]={"n":n,"k":k,"p":p,"q":q,"r":r,"t":t,"e":edge_e,"rank":rank,"side":side,"index":index,"result":result}
             summary["elapsed_seconds"]=time.time()-started;Path(a.output).write_text(json.dumps(summary,indent=2)+"\n");print(json.dumps(summary,indent=2));return 1
          print("PASS_PROFILE",n,k,r,t,rank,"branches",nl+nu,flush=True)
    summary["status"]="PASS_EXACT";summary["elapsed_seconds"]=time.time()-started
    Path(a.output).write_text(json.dumps(summary,indent=2)+"\n");print(json.dumps(summary,indent=2));return 0
if __name__=="__main__":raise SystemExit(main())
