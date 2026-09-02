# Rank-eight Delta3: complete rooted degree-surplus-two layer

Date: 2026-08-23

Status: **PASS, independently audited, in the stated all-order scope.**

## Theorem

Let `(A,q)` be any rooted tree of degree surplus

```text
e(A) = sum_v binom(deg_A(v)-1,2) = 2
```

and order `n>=23`.  Then `A` is a double claw and

```text
Delta^3 R_1(A,q) > 0.
```

The root may be either branch vertex, any pendant-arm vertex (including a
leaf), or any internal central-bridge vertex.  All positive arm and bridge
lengths are allowed.

## Finite base through order 30

The exact all-root order-23 double-claw census is the base.  The exact length
extension package checks every one-edge increase of all five suppressed
edges, every old root, and the new inserted root from source orders 23 through
29.  This proves orders 23 through 30 by finite induction.  Both packages have
independent literal audits.

## No-gap partition from order 31

Every ordinary arm is classified as `1,...,6` or `7+A`; a direct central
bridge as `1,...,7` or `8+G`; and a root split segment as `0,...,6` or `7+N`.
The independent root-orbit enumeration gives:

| root type | all-short quotient keys | all-short keys with n>=31 | mixed rays | all-long cells |
|---|---:|---:|---:|---:|
| branch | 3,087 | 4 | 3,184 | 1 |
| pendant | 43,218 | 1,829 | 57,133 | 1 |
| bridge internal | 10,878 | 579 | 14,321 | 1 |
| **total from n>=31** |  | **2,412** | **74,638** | **3** |

The all-short cells are literal finite checks.  The three all-long cells are
the previously sealed symmetry-adapted branch, pendant, and bridge-interior
cells.

For a fixed mixed key, the graded path-transfer identity moves every long
offset to one distinguished path, so the residual depends only on their total
offset `S`.  The exact Delta3 source weight is at most 26; hence 27 values
determine

```text
P(S) = sum_(k=0)^26 d_k binom(S,k).
```

For all 74,638 rays, `d0>0` and `d1,...,d26>=0`.  The primary scans evaluate
2,015,226 exact values.  Independent raw-orientation/root-coordinate
enumerations rebuild all 2,015,226 values, reproduce every coefficient-stream
hash, and check one unseen value `S=27` on each ray (74,638 unseen checks).

## Immutable package

```text
Mixed reduction source
  certify_rank8_delta3_e2_mixed_newton_reduction_root.py
  B5D45A09AC56706AB5A0C74459BDDC9C4B5C9019F76F44A728997A0CDF733B83
Mixed reduction report
  rank8_delta3_e2_mixed_newton_reduction_exact_root_20260823.json
  8A4ACC45A27DF1394440EE7326F5404B444444F523A5FCE68712B7D112D1F7F1

All-short primary / independent audit reports
  1E666AD8D5225078FDACBFE7A625D1BCBF60B259B8E39D5CFB62E3738ADF8482
  0EECD877F1F219331B5B87A65AB7A53A682AB8ED55CBDC316528E5D9D27652C6

Branch mixed primary / independent audit reports
  385DC3711FDF369C45C91AF19866C351C26A52352A551C3AF7D16C89EEF3E518
  20CEC54CDC68EC8F69B535FE85E80E0F131C9274635132334F2EEE62953ABA99

Pendant mixed primary / independent audit reports
  AD7F2A669C7E6A4BAC2937D3C4E6A2B8BA52B8872D0C65B0C86899EC81B09D72
  7444E815A29B3C14DD394249667D825D72CF79AF3808FCB275A5AD318C129013

Bridge-internal mixed primary / independent audit reports
  17F42A1949352FBD9A0C2E48529F02730ABE772335E2235412D44D935A99291F
  4B81BF17FED0B65A511BC3EECF568D8B6EAFB2D5F10D48014924EEF7A3736287

Complete assembler source / report
  assemble_rank8_delta3_e2_complete_root.py
  0E09A1883336447A0260CBB1056441434C451158DDFE90ABD6A763F6C21D1B17
  rank8_delta3_e2_complete_exact_root_20260823.json
  E6E07392465F452E453915485EC9E62021F5497B7B8246C9EBCEC0D4124020C4

Independent complete audit source / report
  audit_rank8_delta3_e2_complete_root.py
  90D6B56686F6338C6AEC8CBB177D7D9F7557FEB36BCBFD9DE8D5F4318627512C
  rank8_delta3_e2_complete_independent_audit_root_20260823.json
  25BF34B6DD0B1D8CAA626EC70EF2C6DE9BFA736CBC6EF8F76BAA8A64351BE54C
```

## Scope guard

This closes the complete connected `e=2`, `Delta3` layer.  The independently
running `Delta2` assembly, `e>=4` connected cores, forest lift, low-low gluing,
rank-eight PGC, and Erdos Problem 993 remain separate obligations.
