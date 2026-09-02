# Rank-eight exceptional first-crossing low-memory progress

Date: 2026-08-23

Status: **exact count/shard design for all 2,159 formerly remaining cells;
independently audited exact sign certificates for 883 of those cells.  Exactly
1,276 source/type cells remain.  Forest `Q8`, rank-eight PGC, and Problem 993
remain open.**

## Exact reduction and resource design

The sealed exceptional catalogue has terminal bands

```text
alpha 8: types  948..1200, sources 6..13, 8*253 = 2,024 cells
alpha 9: types 1201..1215, sources 5..13, 9*15  =   135 cells
                                                        2,159 cells
```

After deleting the canonical terminal copy, a source has alpha at most 13.
It therefore contains at most one additional component from the terminal
alpha-eight or alpha-nine band.  If `L` is the inclusive terminal-type prefix
length and `c_s` is the raw multiset coefficient using strictly lower bands,
the exact fiber size is

```text
c_s + L*c_(s-a),
```

where `a` is the terminal alpha.  An independent grouped generating-function
audit rederived every `c_s`, every fiber, and every consecutive shard union.

```text
remaining source/type cells      2,159
raw multiset crossings     214,127,795
designed fresh shards              435
maximum indivisible fiber      528,435
gaps                               0
overlaps                           0
```

The conservative design projection has a maximum of `393.859337 MiB`, below
the `448 MiB` operating gate and `512 MiB` hard cap.  This is a resource
projection, not a measurement and not a sign theorem for unrun shards.

## Exact low-memory sign packages

### Terminal alpha eight, source alpha six

Every type `948..1200` was checked against every exceptional source multiset
of alpha six.  The producer used canonical set recurrence.  The independent
audit retained all raw multiplicities and compared both key and product tables
in both SQLite `EXCEPT` directions.

```text
source/type cells                     253
raw multisets                     109,043
canonical keys                    100,441
distinct product jets              94,797
negative Q8                             0
zero Q8                                 0
minimum Q8                    140,095,272
maximum Q8                242,749,893,369
producer peak private bytes     35,508,224
audit peak private bytes        57,962,496
```

Thus every exceptional-only threshold-14 first crossing with terminal alpha
eight and source alpha six has literal `Q8>0`.

### Terminal alpha eight, source alpha seven

The complete next source row uses the same set-recurrence/list-recurrence
split and both bidirectional SQLite comparisons.

```text
source/type cells                     253
raw multisets                     411,125
canonical keys                    373,175
distinct product jets             347,855
negative Q8                             0
zero Q8                                 0
minimum Q8                    565,245,293
maximum Q8              1,143,058,124,781
producer peak private bytes     36,659,200
audit peak private bytes       107,569,152
```

Thus every exceptional-only first crossing with terminal alpha eight and
source alpha seven has literal `Q8>0`.

### Terminal alpha eight, source alpha eight

The audited resource design splits this row into consecutive terminal-type
intervals `948..1096` and `1097..1200`.  Each producer used canonical set
recurrence; each independent audit retained raw multiplicity, inserted the
ordered alpha-eight terminal prefix explicitly, and compared keys and products
in both SQLite `EXCEPT` directions.  A hash-pinned union audit proves the two
intervals cover all 253 types with no gap or overlap.

```text
source/type cells                     253
raw multisets                     945,208
canonical keys                    767,096
per-shard distinct-product sum    736,441
negative Q8                             0
zero Q8                                 0
minimum Q8                  1,981,494,900
maximum Q8              4,630,294,536,137
maximum producer peak bytes      38,301,696
maximum audit peak bytes        124,551,168
```

The product count is a sum of separately deduplicated shard counts, not a
global union count.  Thus every exceptional-only first crossing with terminal
alpha eight and source alpha eight has literal `Q8>0`.

### Terminal alpha nine, source alpha five through eight

The same independent recurrence/audit split covers all 15 terminal types for
each source alpha five, six, seven, and eight.

```text
source/type cells                      60
raw multisets                      90,615
canonical keys                     77,205
distinct product jets              77,140
negative Q8                             0
zero Q8                                 0
minimum Q8                    656,025,470
maximum Q8              7,656,372,139,931
producer peak private bytes     35,463,168
audit peak private bytes        54,624,256
```

Thus every exceptional-only threshold-14 first crossing with terminal alpha
nine and source alpha five through eight has literal `Q8>0`.

### Terminal alpha nine, source alpha nine through ten

For sources large enough to contain one earlier alpha-nine component, the
canonical recurrence inserts each allowed terminal-prefix component exactly
once.  The independent audit instead retains every lower-band multiset and
explicitly inserts the possible alpha-nine source component, then compares
keys and products in both SQLite `EXCEPT` directions.

```text
source/type cells                      30
raw multisets                     508,185
canonical keys                    408,360
distinct product jets             407,542
negative Q8                             0
zero Q8                                 0
minimum Q8                 68,511,553,860
maximum Q8             84,854,079,772,027
producer peak private bytes     50,147,328
audit peak private bytes       138,809,344
```

Thus every exceptional-only first crossing with terminal alpha nine and
source alpha nine or ten has literal `Q8>0`.

### Terminal alpha nine, source alpha eleven

Two config-pinned shards cover all 15 terminal types.  Each passed the generic
canonical producer, independent raw-list audit, and bidirectional key/product
comparison; the hash-pinned union has no gap or overlap.

```text
source/type cells                      15
raw multisets                   1,000,620
canonical keys                    779,640
per-shard distinct-product sum    777,311
negative Q8                             0
zero Q8                                 0
minimum Q8                412,482,631,593
maximum Q8            246,326,899,667,883
maximum producer peak bytes      75,665,408
maximum audit peak bytes        167,776,256
```

### Terminal alpha nine, source alpha twelve

Eight consecutive resource-bounded shards cover the row and pass the same
independent audits and no-gap union.

```text
source/type cells                      15
raw multisets                   2,797,965
canonical keys                  2,106,291
per-shard distinct-product sum  2,104,233
negative Q8                             0
zero Q8                                 0
minimum Q8                930,094,171,074
maximum Q8            664,150,957,724,379
maximum producer peak bytes     135,675,904
maximum audit peak bytes        210,550,784
```

### Terminal alpha nine, source alpha thirteen, types 1201 through 1204

The first four of 15 single-type shards passed before a parent-requested
resource pause.  Their partial union is consecutive and independently audited;
it does not certify types `1205..1215`.

```text
source/type cells                       4
raw multisets                   2,111,790
canonical keys                  1,529,991
per-shard distinct-product sum  1,529,991
negative Q8                             0
zero Q8                                 0
minimum Q8              1,978,910,720,116
maximum Q8          1,663,278,526,162,558
maximum producer peak bytes     303,919,104
maximum audit peak bytes        434,606,080
```

## Exact remaining first-crossing inventory

```text
terminal alpha 8: sources 9..13, types  948..1200, 5*253 = 1,265 cells
terminal alpha 9: source 13, types 1205..1215                  11 cells
                                                               1,276 cells
```

The exact packages and shard unions close `883` of the formerly remaining
`2,159` cells.  Their combined raw count is `7,974,551`; their `6,075,310`
product jets are summed by
package, not globally deduplicated.

## Downstream forest-Q8 and PGC boundary

The fail-closed dependency refresh verifies the current exact boundary:

```text
rank-seven lower gaps / forest Q7       complete
rank-eight high/high full cone          complete
rank-eight low/high full cone           complete
rank-eight low/low full cone            pending exact a2/a3 bridge
fixed-exceptional/full preservation     complete for all 1,215 jets
connected Q8                             pending Delta0..3 remainder at n>=27
exceptional first crossing               1,276 cells remain
forest Q8                                incomplete
rank-eight PGC                           incomplete
Problem 993                              open
```

There is no separately identified unbounded PGC obligation after forest
`Q8`: the coupled all-forest boundary at `alpha(G)=13,14` is already proved,
and the all-forest `V8>=0` theorem is already proved for alpha at least 14.
Conditional on forest `Q8>=0` for alpha at least 14, the separated identity

```text
H8(P)-H7(B)=4*Q8(P)/p7 + 12*c7 + V8(B)/(2*b6)
```

closes `alpha(G)>=15`.  This conditional composition does not promote the
present partial first-crossing certificates to forest `Q8` or PGC.

## Principal SHA-256 seals

Design:

```text
design_rank8_exceptional_first_crossing_alpha8_alpha9_streaming_agent.py
4079E2BE179BD80123BF1E00BAACFC0B2CC8E91730E3AFA9D0AF3F7AC59485B0

rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_agent_20260823.json
E0BE16DFDC987E0886C79AF7AC844A1E854DE11C27B434629BF6A14C9DAF23AD

rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_independent_audit_agent_20260823.json
CF029B8CA26AC83FB86C8222F4852B30A8FC95596B181DE20AE411B0F8925168
```

Terminal alpha-eight/source-six package:

```text
probe_rank8_exceptional_first_crossing_alpha8_s6_complete_agent.py
398148B5CC01DB391476DD06EE727AE943E60A192A73EE89A1716DC525474828

rank8_exceptional_first_crossing_alpha8_s6_types948_1200_keys_exact_agent_20260823.sqlite3
2A948252AA6274CC7E346C69B5A3A9DA7E3682FEE0E7B324643D7DB1D8899720

rank8_exceptional_first_crossing_alpha8_s6_types948_1200_complete_exact_agent_20260823.json
41013BA2ABB4705127D21DA46ABD93ACD834F8286E072E85B6080739CBB9C5E2

rank8_exceptional_first_crossing_alpha8_s6_types948_1200_complete_independent_audit_agent_20260823.json
50E192228E6147C02755BF4FF4695ED7436379788A96C49D6BE71A2BBB08F083
```

Terminal alpha-nine/source-five-through-eight package:

```text
probe_rank8_exceptional_first_crossing_alpha9_s5_8_complete_agent.py
7A724918A8B7276B86BCB73372C2A64C3672CF1B434BB06488114A222E64AE2E

rank8_exceptional_first_crossing_alpha9_s5_8_types1201_1215_keys_exact_agent_20260823.sqlite3
E95349DA25F3EDCD865D69D0512BFF8A822479644E3204D55289D9765EA107CC

rank8_exceptional_first_crossing_alpha9_s5_8_types1201_1215_complete_exact_agent_20260823.json
D1C6DFCFC4F45F16C1FC948258976E9E812E591E637D3D8830557C6948F0A417

rank8_exceptional_first_crossing_alpha9_s5_8_types1201_1215_complete_independent_audit_agent_20260823.json
EDBA171FAD47437D79EE90ABAA1177F3E17212362498C47576F61B07F3F352EF
```

Terminal alpha-eight/source-seven package:

```text
probe_rank8_exceptional_first_crossing_alpha8_s7_complete_agent.py
564D2FCA73842C8DE9F154FB918A6A4D78D487D447114F66122BF1C8AC21641B

rank8_exceptional_first_crossing_alpha8_s7_types948_1200_keys_exact_agent_20260823.sqlite3
1C68EE11578B79082D311E0E9FAD4018E9462F0C5E3B4564A563471E52B06C24

rank8_exceptional_first_crossing_alpha8_s7_types948_1200_complete_exact_agent_20260823.json
6F801330F7C650A7221762F3EE4447CB1B4ED35BBE1906DC94638DF3E96EAD4F

rank8_exceptional_first_crossing_alpha8_s7_types948_1200_complete_independent_audit_agent_20260823.json
D55E9A6AA403060645F21875AF58B175841DA56C7E9B5A647581A54A82EDB2C8
```

Terminal alpha-nine/source-nine-through-ten package:

```text
probe_rank8_exceptional_first_crossing_alpha9_s9_10_complete_agent.py
9DDC9F8CAC9C42C604F01FA37BEC6C1052EDD536B211CC4AA326A6BA72868B3C

rank8_exceptional_first_crossing_alpha9_s9_10_types1201_1215_keys_exact_agent_20260823.sqlite3
F06ECE3A477CEF0C334EEED301E69E7CBB72F15CA8CD475072AD0CF781B474BB

rank8_exceptional_first_crossing_alpha9_s9_10_types1201_1215_complete_exact_agent_20260823.json
30A1E607AC0D3E0A28769F6BC876774BA394BCEE3B824C7EE4CF17DBEFF6F55D

rank8_exceptional_first_crossing_alpha9_s9_10_types1201_1215_complete_independent_audit_agent_20260823.json
73A373DFE25D937D508F289AA71FBC06255BB1D9221131B8CCB8A73A011AD825
```

Terminal alpha-eight/source-eight two-shard package:

```text
probe_rank8_exceptional_first_crossing_alpha8_s8_types948_1096_shard_agent.py
E5E71BF7DEC99ECF3BE54D09D80D5927991834AC3E1FC7E57E27736082509B89

rank8_exceptional_first_crossing_alpha8_s8_types948_1096_keys_exact_agent_20260823.sqlite3
7979A2EABE735ED0EEFC43A4A9A80A2E7A1FDFC5EF3C7AE8F58C0E3988194EDA

rank8_exceptional_first_crossing_alpha8_s8_types948_1096_shard_exact_agent_20260823.json
68DA4082B1A68A6D0C4C5A9BDB8C4A8CC8268750DADC888E8F84BB5C47381987

rank8_exceptional_first_crossing_alpha8_s8_types948_1096_shard_independent_audit_agent_20260823.json
A2CBB154DCD057EB1E4D06B35CA507A7A5E439383A0C23ECA2E3EF0DAA789834

probe_rank8_exceptional_first_crossing_alpha8_s8_types1097_1200_shard_agent.py
AE59C5B5C95A869334332FCE14ADF5E548B950D465D8F3C485F7EFF3B11D0EDF

rank8_exceptional_first_crossing_alpha8_s8_types1097_1200_keys_exact_agent_20260823.sqlite3
59ACC7609B8ECBF058DE40FDF30F0EB5298AB80701DA6E3D3D248EA60789DF31

rank8_exceptional_first_crossing_alpha8_s8_types1097_1200_shard_exact_agent_20260823.json
21861064C820AB77D39FBC7F3057CE8E28F9D627CD3D4C92B56BD06DE427CCD0

rank8_exceptional_first_crossing_alpha8_s8_types1097_1200_shard_independent_audit_agent_20260823.json
389DF38F3D0EF6D09AC7E437B51150E61C7CF0C23BA56A2055738A2894045BEB

audit_rank8_exceptional_first_crossing_alpha8_s8_complete_union_agent.py
7E2BE8038D98E39DDEB4E0D80D984D3057F01C73DC32E0FC9F683200EE0F60AA

rank8_exceptional_first_crossing_alpha8_s8_types948_1200_complete_union_audit_agent_20260823.json
56C6673F72E0F54296E030413235A766A8EAF466B3BA7BC5F4DB671F6F62E614
```

Generic config-pinned alpha-nine shard and union engines:

```text
probe_rank8_exceptional_first_crossing_streaming_shard_agent.py
061144A33892BF193E1F91D3B231DFEB6B94E52D0B3D224E44F314D95B37AE55

audit_rank8_exceptional_first_crossing_streaming_shard_agent.py
26E8CA678778323A64B313B608DF5899CA503D32C9FAA43130DCFD567BD86B4B

audit_rank8_exceptional_first_crossing_streaming_union_agent.py
6B54228E3FEFDF1407423476F31EBE0E87C12156BE0A21A98B868587400CE7F3

rank8_exceptional_first_crossing_alpha9_s11_types1201_1215_complete_union_audit_agent_20260823.json
B4DFFCEBFB4D2DD1719A50C9C3F96133418C5528D0ECAD6B45EC8E37D174A220

rank8_exceptional_first_crossing_alpha9_s12_types1201_1215_complete_union_audit_agent_20260823.json
F9A6D498F6A61605BE39D99FEAA4FF96F19CCA82EE174B57036A81CB3DCDF6B2

rank8_exceptional_first_crossing_alpha9_s13_types1201_1204_complete_union_audit_agent_20260823.json
73566B9ED832B3FBCA9EF295A5033284AEB7943B74AE468BCD453B1B449D7495

rank8_exceptional_first_crossing_alpha9_s13_types1201_1215_union_config_agent_20260823.json
487E4F9EE6B86D0937C948211DEC87692C8C32948493FEAFAB87237A0A280442
```

Final dependency refresh:

```text
audit_rank8_forest_pgc_dependency_refresh_after_alpha9_s13_types1201_1204_agent.py
8E489FE3DEEC0E1032A3E82589D6C218172E66C3CC4F2D3D313FBADCE48C541D

rank8_forest_pgc_dependency_refresh_after_alpha9_s13_types1201_1204_agent_20260823.json
64319B5116E52D885FE25AF1E661C6E7DE2D8E87744E7F6A9545AAC314A60662
```

The maximum observed private-byte peak is `434,606,080`; no nonpositive `Q8`
witness, resource checkpoint, or obstruction file was produced.  The remaining
source-thirteen shards are paused at the parent coordinator's request.
