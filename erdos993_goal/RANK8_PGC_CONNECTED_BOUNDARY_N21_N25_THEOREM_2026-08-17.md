# Exact connected rank-eight boundary through order 25

Date: 2026-08-17

Status: **exact exhaustive theorem for connected forests of orders 21--25
with `alpha(P)=13,14`; not by itself the all-forest boundary theorem or a
proof of Erdos Problem 993.**

For every WROM free tree `P` in the stated range and every support incident
with a pendant leaf, the verifier forms `B=P-{leaf,support}` and checks

```text
8*b6*Q8(P)+24*c7*p7*b6+V8(B)*p7 >= 0,
Q8(P)=16*p8^2-p7*p8-18*p7*p9,
V8(B)=10*b6*b7+136*b6*b8-98*b7^2,
c7=p8-b7-b8.
```

The exact coverage is

```text
166,533,122 free trees,
13,840,112 eligible alpha-13 trees,
39,798,607 eligible alpha-14 trees,
107,371,328 alpha-13 pendant-support states,
311,396,675 alpha-14 pendant-support states.
```

There are zero negative `Q8` states and zero negative coupled states.  There
are 482,909 states with `V8(B)<0`, including 100 with `alpha(P)=14` at order
25.  Every one is paid by the literal coupled numerator.  Thus this census
contains genuine obstructions to the weaker separated proof route.

The order-25 `alpha(P)=13` slice also has an independent maximum-matching
quotient cover: 1,301 quotient trees generate 23,726,807 covering trees.
It reproduces the WROM global coupled minimum, minimum negative `V8` value,
and both witnesses exactly.  Multiple quotient representations merely
repeat checks.

Files:

```text
verify_rank8_pgc_boundary_connected.rs
rank8_pgc_boundary_connected_n19_n24_exact_20260817.log
rank8_pgc_boundary_connected_n25_exact_20260817.log
verify_rank8_pgc_boundary_matching_quotient.rs
rank8_pgc_boundary_matching_quotient_n25_exact_20260817.log
assemble_rank8_pgc_boundary_connected_n21_n25.py
rank8_pgc_boundary_connected_n21_n25_exact_20260817.json
```

The broader componentwise matching-quotient verifier separately covers
disconnected forests and the remaining boundary orders; this connected
package must not be substituted for that no-gap all-forest matrix.
