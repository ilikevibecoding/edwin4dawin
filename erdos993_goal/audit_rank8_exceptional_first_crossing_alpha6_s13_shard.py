#!/usr/bin/env python3
"""Independent audit for one remaining source-alpha13 alpha6 shard."""
from __future__ import annotations
import argparse,csv,hashlib,json,sqlite3,tempfile,threading,time
from pathlib import Path
from audit_rank8_exceptional_first_crossing_alpha4 import encode,multiply
from probe_rank8_exceptional_first_crossing_alpha2_exact import LIMIT,private_bytes
ROOT=Path(__file__).resolve().parent;JETS=ROOT/"rank8_exceptional_tree_jets_exact_20260820.tsv";CLASSIFICATION=ROOT/"rank8_exceptional_tree_jets_exact_20260820.json";SOURCE=ROOT/"probe_rank8_exceptional_first_crossing_alpha6_s13_shard_exact.py";ALGEBRA_DEPENDENCY=ROOT/"audit_rank8_exceptional_first_crossing_alpha4.py";MEMORY_DEPENDENCY=ROOT/"probe_rank8_exceptional_first_crossing_alpha2_exact.py";RETAINED_RANK=9;ABORT_LIMIT=448*1024**2
SHARDS={
"types73_83":{"start":73,"stop":83,"raw":738188},"types84_93":{"start":84,"stop":93,"raw":733905},"types94_102":{"start":94,"stop":102,"raw":713382},"types103_110":{"start":103,"stop":110,"raw":677388},"types111_118":{"start":111,"stop":118,"raw":719180},"types119_125":{"start":119,"stop":125,"raw":664370},"types126_132":{"start":126,"stop":132,"raw":697837},"types133_139":{"start":133,"stop":139,"raw":731990},
"types140_145":{"start":140,"stop":145,"raw":655123},"types146_151":{"start":146,"stop":151,"raw":681151},"types152_157":{"start":152,"stop":157,"raw":707611},"types158_163":{"start":158,"stop":163,"raw":734503},"types164_168":{"start":164,"stop":168,"raw":632940},"types169_173":{"start":169,"stop":173,"raw":652165},"types174_178":{"start":174,"stop":178,"raw":671640},"types179_183":{"start":179,"stop":183,"raw":691365},
"types184_188":{"start":184,"stop":188,"raw":711340},"types189_193":{"start":189,"stop":193,"raw":731565},"types194_197":{"start":194,"stop":197,"raw":599982},"types198_201":{"start":198,"stop":201,"raw":613214},"types202_205":{"start":202,"stop":205,"raw":626574},"types206_209":{"start":206,"stop":209,"raw":640062},"types210_213":{"start":210,"stop":213,"raw":653678},"types214_217":{"start":214,"stop":217,"raw":667422},
"types218_221":{"start":218,"stop":221,"raw":681294},"types222_225":{"start":222,"stop":225,"raw":695294},"types226_229":{"start":226,"stop":229,"raw":709422},"types230_233":{"start":230,"stop":233,"raw":723678},"types234_237":{"start":234,"stop":237,"raw":738062},"types238_240":{"start":238,"stop":240,"raw":563063},"types241_243":{"start":241,"stop":243,"raw":571280},"types244_246":{"start":244,"stop":246,"raw":579551}}
class ResourceGate(RuntimeError):pass
class SignObstruction(RuntimeError):
 def __init__(self,witness):super().__init__("nonpositive independent Q8");self.witness=witness
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest().upper()
def q8(p):return 16*p[8]*p[8]-p[7]*p[8]-18*p[7]*p[9]
def paths(label):
 stem=f"rank8_exceptional_first_crossing_alpha6_s13_{label}";return {kind:ROOT/f"{stem}_{suffix}" for kind,suffix in {"report":"exact_20260820.json","database":"keys_exact_20260820.sqlite3","output":"audit_exact_20260820.json","checkpoint":"audit_resource_checkpoint_20260820.json","obstruction":"audit_obstruction_20260820.json"}.items()}
def load_jets():
 rows=[]
 with JETS.open(newline="",encoding="utf-8") as handle:
  for row in csv.DictReader(handle,delimiter="\t"):rows.append((int(row["alpha"]),tuple(int(row[f"i{r}"]) for r in range(10))))
 assert len(rows)==1215 and rows==sorted(rows);selected=tuple(row for row in rows if row[0]<=6);assert len(selected)==247 and tuple(a for a,_ in selected)==((1,)*2+(2,)*2+(3,)*5+(4,)*15+(5,)*48+(6,)*175);return selected
def enumerate_lower(lower,target):
 identity=(1,)+(0,)*RETAINED_RANK;powers=[]
 for weight,polynomial in lower:
  row=[identity]
  for _ in range(target//weight):row.append(multiply(row[-1],polynomial))
  powers.append(tuple(row))
 results=[]
 def visit(index,remaining,source):
  if index==len(lower):
   if remaining==0:results.append(source)
   return
  weight=lower[index][0]
  for exponent in range(remaining//weight+1):visit(index+1,remaining-exponent*weight,source if exponent==0 else multiply(source,powers[index][exponent]))
 visit(0,target,identity);return tuple(results)
def prepare_database(path):
 c=sqlite3.connect(path);c.execute("PRAGMA journal_mode=DELETE");c.execute("PRAGMA synchronous=NORMAL");c.execute("PRAGMA temp_store=FILE");c.execute("PRAGMA cache_size=-16384");c.execute("CREATE TABLE keys (source_alpha INTEGER NOT NULL, largest_type INTEGER NOT NULL, source TEXT NOT NULL, product TEXT NOT NULL, q8 TEXT NOT NULL, multiplicity INTEGER NOT NULL, PRIMARY KEY(source_alpha,largest_type,source,product,q8)) WITHOUT ROWID");c.execute("CREATE TABLE products (source_alpha INTEGER NOT NULL, product TEXT NOT NULL, PRIMARY KEY(source_alpha,product)) WITHOUT ROWID");return c
def enumerate_shard(connection,jets,config,check_memory):
 lower=tuple(row for row in jets if row[0]<6);alpha6=tuple(p for a,p in jets if a==6);assert len(lower)==72 and len(alpha6)==175;lower1,lower7,lower13=enumerate_lower(lower,1),enumerate_lower(lower,7),enumerate_lower(lower,13);assert len(lower1)==2 and len(lower7)==575 and len(lower13)==63606
 raw=0;minimum=maximum=None;per_type=[];batch=[];started=time.perf_counter()
 def flush():
  if not batch:return
  connection.executemany("INSERT INTO keys VALUES (?,?,?,?,?,1) ON CONFLICT(source_alpha,largest_type,source,product,q8) DO UPDATE SET multiplicity=multiplicity+1",batch);batch.clear();check_memory()
 def record(source,terminal,type_index):
  nonlocal raw,minimum,maximum
  product=multiply(source,terminal);value=q8(product)
  if value<=0:raise SignObstruction({"source_alpha":13,"terminal_alpha":6,"total_alpha":19,"terminal_type_index":type_index,"source_i0_through_i9":list(source),"terminal_i0_through_i9":list(terminal),"product_i0_through_i9":list(product),"Q8":value})
  raw+=1;minimum=value if minimum is None else min(minimum,value);maximum=value if maximum is None else max(maximum,value);batch.append((13,type_index,encode(source),encode(product),str(value)))
  if len(batch)==2500:flush()
 for type_index in range(config["start"],config["stop"]+1):
  relative=type_index-72;terminal=alpha6[relative-1];before=raw
  for source in lower13:record(source,terminal,type_index)
  for source_component in alpha6[:relative]:
   for base in lower7:record(multiply(base,source_component),terminal,type_index)
  for right in range(relative):
   for left in range(right+1):
    pair=multiply(alpha6[left],alpha6[right])
    for base in lower1:record(multiply(base,pair),terminal,type_index)
  type_raw=raw-before;assert type_raw==63606+575*relative+relative*(relative+1);per_type.append({"terminal_type_index":type_index,"terminal_relative_alpha6_type":relative,"independently_enumerated_multisets":type_raw})
  if type_index%10==0 or type_index==config["stop"]:flush();connection.commit();print(f"audit-component={type_index}/{config['stop']} raw={raw} elapsed={time.perf_counter()-started:.3f}s",flush=True)
 flush();assert raw==config["raw"] and minimum is not None and minimum>0;connection.execute("INSERT OR IGNORE INTO products SELECT source_alpha,product FROM keys");connection.commit();canonical=connection.execute("SELECT COUNT(*) FROM keys").fetchone()[0];products=connection.execute("SELECT COUNT(*) FROM products").fetchone()[0]
 return {"source_alpha":13,"terminal_alpha":6,"total_alpha":19,"terminal_type_index_start":config["start"],"terminal_type_index_stop":config["stop"],"terminal_type_count":len(per_type),"independently_enumerated_multisets":raw,"canonical_check_keys":canonical,"distinct_crossing_jets":products,"multiset_to_canonical_key_collisions":raw-canonical,"canonical_key_to_product_collisions":canonical-products,"maximum_multisets_per_canonical_key":connection.execute("SELECT MAX(multiplicity) FROM keys").fetchone()[0],"maximum_canonical_keys_per_product":connection.execute("SELECT MAX(c) FROM (SELECT COUNT(*) c FROM keys GROUP BY product)").fetchone()[0],"maximum_multisets_per_product":connection.execute("SELECT MAX(c) FROM (SELECT SUM(multiplicity) c FROM keys GROUP BY product)").fetchone()[0],"negative_Q8":0,"zero_Q8":0,"minimum_Q8":minimum,"maximum_Q8":maximum,"lower_raw_multiset_counts":{"1":len(lower1),"7":len(lower7),"13":len(lower13)},"per_terminal_type":per_type,"elapsed_seconds":time.perf_counter()-started}
def assert_equality(connection,database):
 connection.execute("ATTACH DATABASE ? AS recurrence",(str(database.resolve()),));columns="source_alpha,largest_type,source,product,q8";assert connection.execute(f"SELECT {columns} FROM keys EXCEPT SELECT {columns} FROM recurrence.keys LIMIT 1").fetchone() is None;assert connection.execute(f"SELECT {columns} FROM recurrence.keys EXCEPT SELECT {columns} FROM keys LIMIT 1").fetchone() is None;assert connection.execute("SELECT source_alpha,product FROM products EXCEPT SELECT source_alpha,product FROM recurrence.products LIMIT 1").fetchone() is None;assert connection.execute("SELECT source_alpha,product FROM recurrence.products EXCEPT SELECT source_alpha,product FROM products LIMIT 1").fetchone() is None;connection.execute("DETACH DATABASE recurrence")
def main():
 parser=argparse.ArgumentParser();parser.add_argument("shard",choices=tuple(SHARDS));args=parser.parse_args();label=args.shard;config=SHARDS[label];artifacts=paths(label);started=time.perf_counter();peak=private_bytes();stop_sampling=threading.Event()
 def sample():
  nonlocal peak
  while not stop_sampling.wait(0.01):peak=max(peak,private_bytes())
 def check_memory():
  nonlocal peak
  peak=max(peak,private_bytes())
  if peak>=ABORT_LIMIT:raise ResourceGate(f"audit reached 448 MiB gate: {peak}")
 sampler=threading.Thread(target=sample,daemon=True);sampler.start();recurrence_hash=digest(artifacts["database"])
 try:
  report=json.loads(artifacts["report"].read_text(encoding="utf-8"));assert report["status"]==f"PASS_EXACT_RESOURCE_GATED_RANK8_ALPHA6_S13_{label.upper()}";assert report["scope"]["certified_shard"]=={"source":13,"terminal":6,"total":19,"terminal_type_index_start":config["start"],"terminal_type_index_stop":config["stop"]};assert report["resources"]["peak_private_bytes"]<ABORT_LIMIT and report["hashes"][artifacts["database"].name]==recurrence_hash;jets=load_jets()
  with tempfile.TemporaryDirectory(prefix=f"rank8_alpha6_s13_{label}_audit_") as temporary:
   connection=prepare_database(Path(temporary)/"independent.sqlite3")
   try:shard=enumerate_shard(connection,jets,config,check_memory);assert_equality(connection,artifacts["database"])
   finally:connection.close()
  assert digest(artifacts["database"])==recurrence_hash;reported=report["aggregate"];assert shard["canonical_check_keys"]==reported["ordered_covering_checks"] and shard["distinct_crossing_jets"]==reported["distinct_crossing_jets"] and shard["canonical_key_to_product_collisions"]==reported["canonical_key_to_product_collisions"];assert shard["negative_Q8"]==reported["negative_Q8"]==0 and shard["zero_Q8"]==reported["zero_Q8"]==0;assert shard["minimum_Q8"]==reported["minimum_Q8"] and shard["maximum_Q8"]==reported["maximum_Q8"] and shard["independently_enumerated_multisets"]==report["raw_multiset_crossing_count_design"]==config["raw"]
  stop_sampling.set();sampler.join(timeout=1);check_memory();elapsed=time.perf_counter()-started;payload={"schema":f"rank8-exceptional-first-crossing-alpha6-s13-{label}-audit-v1","status":f"PASS_INDEPENDENT_BIDIRECTIONAL_RANK8_ALPHA6_S13_{label.upper()}_AUDIT","method":"independent lower-type exponent multisets weights1,7,13 plus zero, one, or two allowed alpha6 source components; bidirectional exact key/product equality","shard":shard,"resources":{"workers":1,"abort_limit_private_bytes":ABORT_LIMIT,"hard_limit_private_bytes":LIMIT,"peak_private_bytes":peak,"peak_private_MiB":peak/1024**2,"elapsed_seconds":elapsed},"scope_warning":"Exactly one remaining source-alpha13 shard; sealed type247 pilot excluded.","hashes":{artifacts["report"].name:digest(artifacts["report"]),artifacts["database"].name:digest(artifacts["database"]),SOURCE.name:digest(SOURCE),ALGEBRA_DEPENDENCY.name:digest(ALGEBRA_DEPENDENCY),MEMORY_DEPENDENCY.name:digest(MEMORY_DEPENDENCY),JETS.name:digest(JETS),CLASSIFICATION.name:digest(CLASSIFICATION),Path(__file__).name:digest(Path(__file__))}}
  artifacts["output"].write_text(json.dumps(payload,indent=2,sort_keys=True)+"\n",encoding="utf-8");
  if artifacts["checkpoint"].exists():artifacts["checkpoint"].unlink()
  if artifacts["obstruction"].exists():artifacts["obstruction"].unlink()
  print(payload["status"]);print(f"raw={shard['independently_enumerated_multisets']} keys={shard['canonical_check_keys']} products={shard['distinct_crossing_jets']} multiset_key_collisions={shard['multiset_to_canonical_key_collisions']} key_product_collisions={shard['canonical_key_to_product_collisions']} negative=0 zero=0");print(f"elapsed_seconds={elapsed:.6f} peak_private_bytes={peak}");print(f"audit_sha256={digest(artifacts['output'])}");return 0
 except ResourceGate as error:
  stop_sampling.set();sampler.join(timeout=1);checkpoint={"status":f"ABORTED_CLEANLY_RANK8_ALPHA6_S13_{label.upper()}_AUDIT_RESOURCE_GATE","reason":str(error),"peak_private_bytes":max(peak,private_bytes()),"scope_warning":"Resource checkpoint, not sign obstruction.","hashes":{Path(__file__).name:digest(Path(__file__))}};artifacts["checkpoint"].write_text(json.dumps(checkpoint,indent=2,sort_keys=True)+"\n",encoding="utf-8");print(checkpoint["status"]);print(f"checkpoint_sha256={digest(artifacts['checkpoint'])}");return 2
 except SignObstruction as error:
  obstruction={"status":f"EXACT_NONPOSITIVE_Q8_OBSTRUCTION_RANK8_ALPHA6_S13_{label.upper()}_AUDIT","witness":error.witness,"scope_warning":"Exact audit obstruction in this source-alpha13 shard.","hashes":{Path(__file__).name:digest(Path(__file__))}};artifacts["obstruction"].write_text(json.dumps(obstruction,indent=2,sort_keys=True)+"\n",encoding="utf-8");print(obstruction["status"]);print(f"obstruction_sha256={digest(artifacts['obstruction'])}");return 3
 finally:stop_sampling.set();sampler.join(timeout=1)
if __name__=="__main__":raise SystemExit(main())
