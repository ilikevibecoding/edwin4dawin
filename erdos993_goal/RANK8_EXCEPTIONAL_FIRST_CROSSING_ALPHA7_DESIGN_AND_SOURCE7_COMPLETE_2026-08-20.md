# Rank-eight terminal-alpha-seven design and source-seven theorem

Date: 2026-08-20

Status: **exact no-gap resource design PASS for terminal types 248 through 947
and sources 7 through 13; independent design audit PASS; exact source-alpha-7
sign theorem PASS in two fresh shards with independent bidirectional audits.**

## Exact finite reduction and design

There are exactly 700 terminal-alpha-seven exceptional jet types, at sorted
indices `248..947`.  The lower component counts at alpha one through six are

```text
2, 2, 5, 15, 48, 175.
```

An independent type-by-type unbounded-knapsack calculation gives lower raw
multiset coefficients through alpha 13

```text
c0..c13 = 1, 2, 5, 13, 39, 123, 431,
           925, 2209, 5437, 14047, 36079, 90460, 195031.
```

For source alpha `s` in `7..13` and relative terminal type `L` in `1..700`,
deleting the canonical terminal copy leaves either no alpha-seven source
component or one of the first `L` alpha-seven types.  Hence the exact raw fiber
count is

```text
c_s + L*c_(s-7).
```

The design audit rederived the type counts from the TSV, rebuilt the
coefficients with an independent prefix DP, checked every fiber, and
reconstructed every consecutive shard union.

```text
source  raw crossings  shards  maximum one-type fiber
   7          892,850       2              1,625
   8        2,037,000       4              3,609
   9        5,032,650      10              8,937
  10       13,022,450      25             23,147
  11       34,823,950      67             63,379
  12       93,500,050     194            176,560
  13      242,267,550     607            496,731

total     391,576,500     909
gaps                               0
overlaps                           0
```

The first attempted 400,000-row type-block enclosure was rejected exactly:
source 13 at terminal type 947 is a single indivisible 496,731-row fiber.  This
is preserved as an enclosure failure, not a sign or forest obstruction.  The
accepted 550,000-row target has maximum shard size 549,963 and a conservative
doubled-dynamic-memory projection of 283.659 MiB, including an additional
lower-state allowance.  Every projected shard is below the 448 MiB operating
gate and 512 MiB hard cap.

## Scoped source-seven theorem

For every terminal exceptional alpha-seven jet type with index `248..947`, and
every exceptional source product of alpha seven using types at most the
terminal type, adjoining the terminal gives total alpha 14 and

```text
Q8 = 16*i8^2 - i7*i8 - 18*i7*i9 > 0.
```

Exact no-gap shards:

```text
pilot       types 248..720   raw 549,626
remainder   types 721..947   raw 343,224
exact union       248..947
gaps                     0
overlaps                 0
```

The producer used set-valued exact polynomial recurrence for the 247 lower
types and the allowed alpha-seven prefix.  Each independent audit instead used
a list-valued exponent/multiplicity DP, regenerated all raw source multisets,
and matched the producer key and product tables in both SQLite `EXCEPT`
directions.

## Exact source-seven result

```text
independently enumerated raw multisets      892,850
canonical check keys                       787,850
distinct shard-product counts sum          713,853
raw-to-canonical equivalence compression   105,000
key-to-product compression within shards    73,997
negative Q8                                      0
zero Q8                                          0
minimum Q8                                9,630,126
maximum Q8                          573,590,474,474
```

Product counts are a sum over the two sealed shards, not cross-shard global
deduplication.  Both compression counts are exact equivalence compression, not
omissions.

## Measured resources

```text
workers per process                              1
fresh producer processes                         2
fresh independent audit processes                2
producer elapsed seconds sum              26.935692
audit elapsed seconds sum                 14.962958
maximum producer peak private MiB          35.179688
maximum audit peak private MiB             93.046875
operating abort gate                             448 MiB
hard cap                                         512 MiB
```

No resource checkpoint or nonpositive-sign obstruction was produced.

## Immutable hash seal

Design package:

```text
design_rank8_exceptional_first_crossing_alpha7_streaming.py
007E84C46F72599B1A156B8210C4A16AADE720E0A20D3086FD9DAAA4C446D7CB

rank8_exceptional_first_crossing_alpha7_streaming_design_exact_20260820.json
CA16EB78BA65408898E59B26A79BE344BD7F9D7065C3B9C8F88E2496BC888D6D

audit_rank8_exceptional_first_crossing_alpha7_streaming_design.py
BA300AB0734FA787BF7C9E12D8CD9F097E41F42F68074910B12BB6882A44BC3F

rank8_exceptional_first_crossing_alpha7_streaming_design_audit_exact_20260820.json
8EE329584C104E03AF5B47BBCDA33D80EC40C05708AF09C9AA0FEC7FFAE9690E
```

Producer and shard-auditor sources:

```text
probe_rank8_exceptional_first_crossing_alpha7_s7_shard_exact.py
2F67E2C203FB7F92167484BC55ABA864936DE5D121E7EE36F435CCF53FAA616B

audit_rank8_exceptional_first_crossing_alpha7_s7_shard.py
A0E5E5D4BAE60C92D9824B3B88FB1FC189E9DF8B9EDDE7A44523B7DF70F495D4
```

Pilot `248..720`:

```text
report    0A8A82FCFFB64EA465910BBD25A7D3480481ED82CE0809BD9AC9967F1582DDA3
database  79A0DEDE8BAC8BFFA29F09D6625E3E4D5972186E47B525250DDEC4D3C77137AD
audit     EA958D44169F3A539FEE3999EC47239007D0F3870A9116532538DC9035237763
```

Remainder `721..947`:

```text
report    9F5DD2155C3C0FAFD2263B27EA0C5EDA586C141E93059C1DA86BF20FE52477FD
database  D12652A6B7C4053878A7C36A98ED936190D52807CE5D7B77AD8E375DB766EA80
audit     3AD52A245065BB71D24B60708E673DEE92460FEBD71C05E0572D664AD1A3A6BC
```

Source-seven complete assembly:

```text
assemble_rank8_exceptional_first_crossing_alpha7_s7.py
7CBAC4F954B03004E40C5FCAD76CFB327E8F391879CD778289083B8F3C76A37C

rank8_exceptional_first_crossing_alpha7_s7_complete_exact_20260820.json
F52C5D43EC8AFF07F673DFAC5B5EF07BD2ABA912BBDA0091FE7CA12FFDB27BB1

audit_rank8_exceptional_first_crossing_alpha7_s7_assembly.py
3ACC4728B30A375B13DFBA5B79CBFEDEB1109E239FA09BB0A51581883130D265

rank8_exceptional_first_crossing_alpha7_s7_complete_audit_exact_20260820.json
0F5E1C486DC05979019C0E3822EE1EC567DE21238AC9CB5B75B186EA18CF45F6
```

## Scope boundary

This closes only source alpha 7 of terminal alpha 7.  Sources alpha 8 through
13 remain, as do terminal alpha 8 and 9.  It does not certify a full/full cone,
connected `Delta0..3`, connected `Q8`, full forest `Q8`, or PGC.  No source-8,
order-26, e2, or master work was launched or modified.
