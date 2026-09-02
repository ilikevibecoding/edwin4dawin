# Rank-eight alpha-six source-13 terminal-type-247 pilot

Date: 2026-08-20

Status: **exact independently audited PASS for one cell only.**

## Scoped statement

Let the terminal component be exceptional jet type 247, the final type in the
fixed sorted exceptional database.  This type has alpha six and jet

```text
(i0,...,i9) = (1,12,55,130,170,117,33,0,0,0).
```

For every exceptional source product of alpha 13 using component types at
most 247, adjoining one copy of terminal type 247 gives total alpha 19 and

```text
Q8 = 16*i8^2 - i7*i8 - 18*i7*i9 > 0.
```

This statement covers exactly

```text
source alpha                 13
terminal alpha                6
terminal type index         247
relative alpha-six type     175
crossing total               19
```

and no other cell.

## Exact recurrence result

The sorted-type closure through type 247 retained 243,051 distinct partial
states.  Its source-alpha-13 layer contained 130,341 canonical jets.

```text
canonical checks             130,341
distinct product jets        130,341
key-to-product collisions          0
negative Q8                        0
zero Q8                            0
minimum Q8           168,568,018,762
maximum Q8       282,462,928,635,888
```

## Independent no-gap audit

The audit independently enumerated every one of the 195,031 raw source-alpha-
13 component multisets using types at most 247, appended terminal type 247,
and reconstructed the exact canonical key.

```text
raw multisets                  195,031
canonical keys                 130,341
distinct products              130,341
multiset-to-key collisions      64,690
key-to-product collisions            0
negative Q8                          0
zero Q8                              0
```

The independent and recurrence key tables, and their product tables, matched
in both relational directions.  The recurrence database hash was unchanged
before and after the audit.

## Resources

```text
recurrence workers                         1
recurrence elapsed                         3.4311282000271603 seconds
recurrence peak private bytes             129,654,784
recurrence peak private MiB               123.6484375
recurrence maximum projected bytes        316,035,435
recurrence maximum projected MiB          301.39487743377686

audit workers                              1
audit elapsed                              15.38683809991926 seconds
audit peak private bytes                  69,763,072
audit peak private MiB                    66.53125

operating abort gate                     448 MiB
hard cap                                 512 MiB
```

No resource checkpoint or sign obstruction was produced.

## Exact hashes

```text
probe_rank8_exceptional_first_crossing_alpha6_s13_type247_exact.py
3FE33B1C881F44166B374020621CF03B980B71BFB3981081378F52793BB7D748

rank8_exceptional_first_crossing_alpha6_s13_type247_pilot_exact_20260820.json
FE07EFB377CA8C29916256C69312D1D2ECFE3E166532E9C472CD2CF180C3BB8F

rank8_exceptional_first_crossing_alpha6_s13_type247_pilot_keys_exact_20260820.sqlite3
977899C986821067940BE2CAD62E443E7293D12C4AD5D3B8D7A94B0307EFD045

audit_rank8_exceptional_first_crossing_alpha6_s13_type247.py
295A7FA41BC5D9C1F9F8A4D1AFD52E2685ACB38D4FE6973359D08C6034219325

rank8_exceptional_first_crossing_alpha6_s13_type247_pilot_audit_exact_20260820.json
7314319877C2E5C6C94F72F9B4F27237E25A71AD72ED8A94A06E226044AC0180
```

## Scope boundary

This is not a terminal-alpha-six theorem.  It does not certify terminal types
73 through 246 at source 13, any alpha-six terminal type at sources 8 through
12, or any terminal-alpha-seven-through-nine cell.  It does not prove a
full/full cone, connected `Q8`, full forest `Q8`, or PGC.  Alpha-six work is
stopped after this pilot.
