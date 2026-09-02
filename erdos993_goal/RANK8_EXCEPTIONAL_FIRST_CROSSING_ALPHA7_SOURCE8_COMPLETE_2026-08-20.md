# Rank-eight terminal-alpha-seven source-eight complete theorem

Date: 2026-08-20

Status: **exact four-shard no-gap PASS with four fresh independent
bidirectional audits.**

## Scoped theorem

For every terminal exceptional alpha-seven jet type with sorted index
`248 <= t <= 947`, and every exceptional source product of alpha eight using
component types at most `t`, adjoining terminal type `t` gives total alpha 15
and

```text
Q8 = 16*i8^2 - i7*i8 - 18*i7*i9 > 0.
```

This theorem covers exactly source alpha 8 in the terminal-alpha-seven band.

## Exact recurrence and no-gap coverage

The lower-type unbounded-knapsack coefficients are `c8=2209` and `c1=2`.
After deleting the canonical terminal copy, the source contains either no
alpha-seven component or one prefix alpha-seven component times an alpha-one
base.  For relative terminal index `L=1..700`, the exact raw count is

```text
2209 + 2*L.
```

The previously audited design gives exactly:

```text
terminal types   raw multisets   canonical keys   products
248..472              547,875          460,935     420,889
473..664              547,584          455,322     426,304
665..835              549,765          450,907     434,341
836..947              391,776          316,937     305,941

exact union           248..947
terminal types             700
gaps                          0
overlaps                      0
```

The producer used set-valued exact lower-product recurrence and prefix
convolution.  Every independent audit instead used a list-valued exponent DP
for all 2,209 lower alpha-eight multisets and both alpha-one bases, regenerated
the prefix convolution with multiplicities, and matched key and product tables
in both SQLite `EXCEPT` directions.

## Exact aggregate

```text
independently enumerated raw multisets      2,037,000
canonical check keys                       1,684,101
distinct shard-product counts sum          1,587,475
raw-to-canonical equivalence compression     352,899
key-to-product compression within shards      96,626
negative Q8                                        0
zero Q8                                            0
minimum Q8                                38,223,353
maximum Q8                         2,458,842,500,208
```

The product count is the sum over sealed shards, not cross-shard global
deduplication.  Compression counts are exact equivalence compression, not
omissions.

## Exact shard signs and resources

```text
types      minimum Q8     maximum Q8       producer sec/MiB    audit sec/MiB
248..472     38,223,353      533,132,492,160   5.616207 / 36.574   7.718090 / 117.078
473..664    806,050,488    1,056,079,697,280   6.154284 / 36.672   8.196482 /  95.887
665..835  1,991,924,286    2,030,534,083,296   6.482649 / 36.676   8.365955 / 119.551
836..947  4,769,174,736    2,458,842,500,208   4.487763 / 36.695   6.112386 /  95.277

workers per fresh process                         1
producer elapsed seconds sum              22.740904
audit elapsed seconds sum                 30.392914
maximum producer peak private MiB          36.695313
maximum audit peak private MiB             119.550781
operating abort gate                             448 MiB
hard cap                                         512 MiB
```

No resource checkpoint, nonpositive-sign obstruction, or database mismatch was
produced.

## Immutable hash seal

```text
probe_rank8_exceptional_first_crossing_alpha7_s8_shard_exact.py
E4B6A7F8C498CC07B5792F6408C66D62130FAAE19456BCC2DA1CEB1A93C9D576

audit_rank8_exceptional_first_crossing_alpha7_s8_shard.py
5687E00882BE3B898E49AE3C28C6910698332614E02295436C36C15ACAABD44F
```

Shard `248..472`:

```text
report    9B05BED2B3E8D48AD465E9342AE3F29017AB5B90D09315069F56F0E7A0D6EBE1
database  82110EE3798CD346DFD57E39A96FD7613B4F1734364C145A528309FE2CAB91F0
audit     628464FDA27CF70960F1810BD6C4BE2A177D02D7BF7DC38DCAC531036A6F1123
```

Shard `473..664`:

```text
report    7F11E20E75B7BDE3CB99D594A7669449DD0FE973A3AF1C6E1378EE0688B44F29
database  4117138C80F6F8EF9C76C33BD91AA139AC8FB667B7C2067B5E40A7B72876012A
audit     B1683DA1AD24BC53B8CBACDBE5F391A9C9070D2F66966010167C5836D3B3E4F5
```

Shard `665..835`:

```text
report    A7AAA71509B2B28E2AB5B93773D8A8627D920201A69E2B93197482A1CFD0592D
database  040917B133B3C121A2350A623014119390E88F8E6A0614BBD529A7DBC68E744D
audit     9078D937AC0F60FBB3E07E9ABDB29B8BB5CBB0CB4A29B6D1E00C20A85C8010AD
```

Shard `836..947`:

```text
report    19FEAF64D0C692A31FBBAAE856052C7F4C29BB65FB791CD7507D32672CCC77B7
database  F5171A91EBDF534B774CA58ECDE0B11758349170EBDD265FA20023A7FAB2FF97
audit     BB836BCF8136F104A2E9EF8671D40D1F6C6909FCC6A11A73DF1268062641FC70
```

Complete assembly:

```text
assemble_rank8_exceptional_first_crossing_alpha7_s8.py
A3026551EDD8FFA3A805B99A0AD11AC469073671E80F8433F34C76748212116B

rank8_exceptional_first_crossing_alpha7_s8_complete_exact_20260820.json
4E5617FEF56238ACCAF48732D1BCC4BD13E2F8B3CCA116AA220CA601C4469E65

audit_rank8_exceptional_first_crossing_alpha7_s8_assembly.py
55D94ECF998D26150D0A9ADDB1FC82AA794C685319A53E88FE08263B622ED425

rank8_exceptional_first_crossing_alpha7_s8_complete_audit_exact_20260820.json
4CC095606ACB3F127D9D121FA0B522EAA1F588F428AF01DECC044786CFB2B4BC
```

## Scope boundary

This closes only source alpha 8 of terminal alpha 7.  Source alpha 9 through 13
remain, as do terminal alpha 8 and 9.  It does not certify a full/full cone,
connected `Delta0..3`, connected `Q8`, full forest `Q8`, or PGC.  No source-9,
order-26, e2, or master work was launched or modified.
