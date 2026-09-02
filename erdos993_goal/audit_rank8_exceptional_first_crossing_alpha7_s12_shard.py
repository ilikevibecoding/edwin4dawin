#!/usr/bin/env python3
"""Independent exponent/multiplicity audit of alpha7/source12 shard."""
from __future__ import annotations
import argparse,json,tempfile,threading,time
from pathlib import Path
from audit_rank8_exceptional_first_crossing_alpha4 import encode,multiply
from audit_rank8_exceptional_first_crossing_alpha7_s7_shard import digest,load_jets,prepare_database,q8
from probe_rank8_exceptional_first_crossing_alpha2_exact import LIMIT,private_bytes
ROOT=Path(__file__).resolve().parent;JETS=ROOT/"rank8_exceptional_tree_jets_exact_20260820.tsv";CLASSIFICATION=ROOT/"rank8_exceptional_tree_jets_exact_20260820.json";SOURCE=ROOT/"probe_rank8_exceptional_first_crossing_alpha7_s12_shard_exact.py";DEPENDENCY=ROOT/"audit_rank8_exceptional_first_crossing_alpha7_s11_shard.py";ABORT_LIMIT=448*1024**2
class ResourceGate(RuntimeError):pass
class SignObstruction(RuntimeError):
 def __init__(self,w):super().__init__("nonpositive audit Q8");self.witness=w
def paths(s,t):
 stem=f"rank8_exceptional_first_crossing_alpha7_s12_types{s}_{t}";return ROOT/f"{stem}_exact_20260820.json",ROOT/f"{stem}_keys_exact_20260820.sqlite3",ROOT/f"{stem}_audit_exact_20260820.json",ROOT/f"{stem}_audit_resource_checkpoint_20260820.json",ROOT/f"{stem}_audit_obstruction_20260820.json"
def raw_states(lower):
 identity=(1,)+(0,)*9;states=[[]for _ in range(13)];states[0].append(identity)
 for weight,component in lower:
  for alpha in range(weight,13):states[alpha].extend(multiply(x,component)for x in tuple(states[alpha-weight]))
 assert len(states[12])==90460 and len(states[5])==123;return states
def main()->int:
 p=argparse.ArgumentParser();p.add_argument("start",type=int);p.add_argument("stop",type=int);a=p.parse_args();start,stop=a.start,a.stop;rp,db,out,checkpoint,obstruction=paths(start,stop);started=time.perf_counter();peak=private_bytes();event=threading.Event()
 def sample():
  nonlocal peak
  while not event.wait(.01):peak=max(peak,private_bytes())
 def gate():
  nonlocal peak
  peak=max(peak,private_bytes())
  if peak>=ABORT_LIMIT:raise ResourceGate(f"448MiB audit gate:{peak}")
 sampler=threading.Thread(target=sample,daemon=True);sampler.start();dbhash=digest(db)
 try:
  report=json.loads(rp.read_text(encoding="utf-8"));assert report["status"]=="PASS_EXACT_RESOURCE_GATED_RANK8_ALPHA7_SOURCE12_SHARD"and report["hashes"][db.name]==dbhash;jets=load_jets();lower=tuple(x for x in jets if x[0]<7);terminals=tuple(poly for alpha,poly in jets if alpha==7);states=raw_states(lower);low=tuple(states[12]);bases=tuple(states[5])
  with tempfile.TemporaryDirectory(prefix="rank8_alpha7_s12_audit_")as temp:
   c=prepare_database(Path(temp)/"audit.sqlite3");raw=0;mn=mx=None;batch=[]
   def flush():
    if batch:c.executemany("INSERT INTO keys VALUES(?,?,?,?,?,1)ON CONFLICT(source_alpha,largest_type,source,product,q8)DO UPDATE SET multiplicity=multiplicity+1",batch);batch.clear();gate()
   def record(source,terminal,ti):
    nonlocal raw,mn,mx
    product=multiply(source,terminal);value=q8(product)
    if value<=0:raise SignObstruction({"classification":"zero_Q8"if value==0 else"negative_Q8","terminal_type_index":ti,"Q8":value,"source":list(source),"terminal":list(terminal),"product":list(product)})
    raw+=1;mn=value if mn is None else min(mn,value);mx=value if mx is None else max(mx,value);batch.append((12,ti,encode(source),encode(product),str(value)))
    if len(batch)==2500:flush()
   for ti in range(start,stop+1):
    L=ti-247;terminal=terminals[L-1]
    for source in low:record(source,terminal,ti)
    for component in terminals[:L]:
     for base in bases:record(multiply(base,component),terminal,ti)
    if ti%50==0 or ti==stop:flush();c.commit();gate();print(f"audit-component={ti}/{stop} raw={raw} private_MiB={peak/1024**2:.3f} elapsed={time.perf_counter()-started:.3f}s",flush=True)
   flush();c.commit();c.execute("INSERT OR IGNORE INTO products SELECT source_alpha,product FROM keys");c.commit();keys=c.execute("SELECT COUNT(*)FROM keys").fetchone()[0];products=c.execute("SELECT COUNT(*)FROM products").fetchone()[0];c.execute("ATTACH DATABASE ? AS recurrence",(str(db.resolve()),));cols="source_alpha,largest_type,source,product,q8";assert c.execute(f"SELECT {cols} FROM keys EXCEPT SELECT {cols} FROM recurrence.keys LIMIT 1").fetchone()is None and c.execute(f"SELECT {cols} FROM recurrence.keys EXCEPT SELECT {cols} FROM keys LIMIT 1").fetchone()is None and c.execute("SELECT source_alpha,product FROM products EXCEPT SELECT source_alpha,product FROM recurrence.products LIMIT 1").fetchone()is None and c.execute("SELECT source_alpha,product FROM recurrence.products EXCEPT SELECT source_alpha,product FROM products LIMIT 1").fetchone()is None;c.execute("DETACH DATABASE recurrence");c.close()
  row=report["aggregate"];assert digest(db)==dbhash and(raw,keys,products,mn,mx)==(row["independently_counted_raw_multisets"],row["canonical_check_keys"],row["distinct_crossing_jets"],row["minimum_Q8"],row["maximum_Q8"])and row["negative_Q8"]==row["zero_Q8"]==0;event.set();sampler.join(timeout=1);gate();elapsed=time.perf_counter()-started;payload={"schema":"rank8-exceptional-first-crossing-alpha7-s12-shard-audit-v1","status":"PASS_INDEPENDENT_BIDIRECTIONAL_RANK8_ALPHA7_SOURCE12_SHARD_AUDIT","method":"independent list DP c12=90460,c5=123, prefix convolution, both SQLite EXCEPT directions","shard":{"source_alpha":12,"terminal_alpha":7,"terminal_type_index_start":start,"terminal_type_index_stop":stop,"independently_enumerated_multisets":raw,"canonical_check_keys":keys,"distinct_crossing_jets":products,"raw_to_canonical_compression":raw-keys,"canonical_key_to_product_collisions":keys-products,"negative_Q8":0,"zero_Q8":0,"minimum_Q8":mn,"maximum_Q8":mx},"resources":{"workers":1,"abort_limit_private_bytes":ABORT_LIMIT,"hard_limit_private_bytes":LIMIT,"peak_private_bytes":peak,"peak_private_MiB":peak/1024**2,"elapsed_seconds":elapsed},"hashes":{rp.name:digest(rp),db.name:digest(db),SOURCE.name:digest(SOURCE),DEPENDENCY.name:digest(DEPENDENCY),JETS.name:digest(JETS),CLASSIFICATION.name:digest(CLASSIFICATION),Path(__file__).name:digest(Path(__file__))}};out.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");checkpoint.unlink(missing_ok=True);obstruction.unlink(missing_ok=True);print(payload["status"]);print(f"raw={raw} keys={keys} products={products} neg=0 zero=0 min_Q8={mn} max_Q8={mx}");print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}");print(f"audit_sha256={digest(out)}");return 0
 except ResourceGate as e:event.set();sampler.join(timeout=1);payload={"status":"ABORTED_CLEANLY_RANK8_ALPHA7_SOURCE12_SHARD_AUDIT_RESOURCE_GATE","reason":str(e),"peak_private_bytes":max(peak,private_bytes()),"scope_warning":"Resource checkpoint only.","hashes":{Path(__file__).name:digest(Path(__file__))}};checkpoint.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");print(payload["status"]);return 2
 except SignObstruction as e:payload={"status":"EXACT_NONPOSITIVE_Q8_OBSTRUCTION_RANK8_ALPHA7_SOURCE12_SHARD_AUDIT","witness":e.witness,"hashes":{Path(__file__).name:digest(Path(__file__))}};obstruction.write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");print(payload["status"]);return 3
 finally:event.set();sampler.join(timeout=1)
if __name__=="__main__":raise SystemExit(main())
