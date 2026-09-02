# Exact certificate dependency assembly

Date: 2026-08-29

Status: **audited partial assembly; Erdős Problem #993 remains open.**

All five requested certificate programs replayed successfully.  A separate
fast exact evaluator audit also closed the previously missing finite
`N=13,...,30` parameter gate.  Consequently, the three disjoint ranges

```text
N=13,...,30,
N>=31 and S=2,3,4,
N>=31 and S>=5
```

assemble the supported **no-isolate disconnected-forest terminal
`m=1,j=3` row**.  This conclusion is deliberately no broader: it is not
`m=0`, not the complete terminal payment, not all-forest ISO, and not a
proof of unimodality or Erdős Problem #993.

## 1. Forest `m=1,j=3` dependency graph

The edge direction below is prerequisite to conclusion.

```text
y-slope + marked-wedge floor
    -> short-S certificate (S=2,3,4; N>=31)

y-slope + marked-wedge floor + positive artificial denominator
        + pair-exclusion y-cap + h4 path floor
        + root-group wedge correlation + frozen outer cones
    -> S>=5 tail certificate (N>=31)

pinned coupled/component/root-neighbor lower-bound formulas
    -> fast exact finite evaluator audit (N=13,...,30)

short-S + S>=5 tail + finite audit
    -> no-isolate disconnected-forest m=1,j=3, all supported orders
```

The two `N>=31` verifiers are fail-closed on their pinned dependency hashes,
dependency statuses, and exact coefficient streams.  Their replays produced:

| Sector | Status | Exact stream |
|---|---|---|
| `S=2,3,4` | `PASS_INDEPENDENT_EXACT_FOREST_M1_J3_SHORT_S_N31_PLUS` | 255 positive Bernstein coefficients; hash `4D19F2E3...F37F95EA` |
| `S>=5` | `PASS_INDEPENDENT_EXACT_FOREST_M1_J3_S5_N31_PLUS_TAIL` | 288,324 all-order and 36,828 finite-layer coefficients; hashes `6A9E716D...14C5226` and `3A1398DC...15528F` |

## 2. Finite `N=13,...,30` gate

The expected report from
`prove_terminal_q3_m1_forest_j3_exact_u1_finite_relaxation_root.py` was not
present, and no old process was running.  A fresh run of that original
term-by-term `Fraction` evaluator was started, but a completed `N=13`
calibration took about 86 seconds.  Scaling by its 1,879 cells to the full
873,942-cell range projected hours.

The replacement audit
`audit_terminal_q3_m1_forest_j3_exact_u1_finite_fast_agent.py` uses the same
pinned symbolic numerators but clears rational coefficient denominators once
and evaluates the affine-in-`y`, cubic-in-`W` polynomials by cached exact
Horner rows.  Its complete `N=13` ordered stream is exactly the original
evaluator's stream:

```text
23F4514516EAD2CC89DDFD85A889793354FEB6755946521D1EB9F438E084E694
```

After freezing the full result in the source, a clean fail-closed rerun gave:

```text
PASS_EXACT_FAST_EVALUATOR_FOREST_M1_J3_COMBINED_RELAXATION_N13_TO_30

structural cells                       16,371
supported integer W cells             873,942
endpoint or pairwise-crossing tests 1,787,452
positive tests                      1,787,452
zero tests                                    0
minimum positive            4513684396042944/23
minimum witness             13|1|7|4|31|1|16/207
ordered stream SHA-256      A7994DDB86F2534F9EF114679CD8BD4B0
                           CCCB5813FDFC084867D87326FEE8C6B
```

The frozen source hash is
`C8A3C487AC1355F64AA488C4A9AB4C15371B08D4E467B63C2BFF70EB404B53D6`;
the regenerated report hash is
`6CA1D9B1E063800B83258322F147D2E5A1E1475AACAC4369F120E2E13298C375`.
The embedded source hash equals the current file hash.

This is an independent evaluator audit, not an independent derivation of the
three lower bounds.  The original hours-long run was stopped after the frozen
audit passed; continuing it would add only a slower evaluator of the same
pinned formulas.

## 3. Separate `d=1` terminal-`m=0` branch

```text
canonical-H retained-Dprev reduction
        + one-centre-spider inductive q-gap mass floor
        + smaller-forest q_j<=q3 induction input
    -> stable-B canonical-J leaf recurrence
```

The replay passed

```text
PASS_EXACT_ALL_ORDER_D1_STABLE_B_J_RECURRENCE_LEAF_BASE_CONDITIONAL_INDUCTION.
```

Its exact theorem is only

```text
J_S(j)-J_(S-1)(j)-J_(S-2)(j-1) >= 0
```

on `A=0,Y=1,S=B+2>=14,j>=4`.  The seven unbounded symbolic cones contain
132 numerator and 51 denominator coefficient references, with positive
minimum coefficients.  The 7,169 literal cells through `S=120` are a guard,
not the basis of the unbounded proof.

Still open in this branch are the `A/Y` lifts, the `BK<0` `G` branch, the
nonstable `B<=Y+1` band, arbitrary root degree, and the all-`d=1` terminal
`m=0` assembly.

## 4. Four-minor / ISO branch

### Double broom

The BB/common-path sector replay passed

```text
PASS_EXACT_ALL_ORDER_ISO_DOUBLE_BROOM_BB_NEWTON_SECTOR.
```

The all-order proof is the closed root-monomial formula together with
`A>=0` and the exact central-binomial identity giving `D<=0`.  The script's
360 abstract cells, 620 literal monomial cells, and 468 path cells are finite
sanity replays of that analytic formula; they are not by themselves the
unbounded proof.  The `BX+BY`, `XY`, and `BZ` groups remain to be paid
jointly, so the connected double broom is not closed.

### Isolate hierarchy

The isolate script exactly derived

```text
C_r(+)-C_r-C_(r-1) = J_r,
M_r(+)-M_r-M_(r-1) = H_r,

(M_r+C_r)(+)-(M_r+C_r)-(M_(r-1)+C_(r-1))
  = 2[N_(r-2,r)+N_(r-1,r-1)+J_r].
```

No sign is proved.  The smallest explicit sign target exposed by this
hierarchy is

```text
J_r=R_(r-2,r-1)-R_(r-3,r) >= 0
```

at the supported ranks, followed by the coupled isolate gap `M_r+C_r>=0`.
Finite zero-negative probes are evidence only.  Also, this `J_r` is a
different object from the canonical terminal `J_S(j)` in Section 3; there
is no dependency edge between them.

## 5. Single remaining global dependency

The current proof skeleton has one theorem slot left: the **Four-Minor Leaf
Lemma** at every required rank.  It has three clauses:

```text
ordinary:  N_r(B)-N_r(B-z) >= N_(r-1)(B-{z,s}),
isolate:   N_r(B)-N_r(B-z) >= N_(r-1)(B-z),
collision: N_r(B) >= N_r(B-z) when the support is a mark.
```

Only after all three modes are proved can repeated leaf deletion establish
the all-forest four-minor inequality, then all-forest ISO, and finally combine
with the already proved weak-prefix ratio and decreasing tail to obtain
unimodality.  None of the certificates assembled here discharges that lemma.

## 6. Frozen artifacts

| Artifact | SHA-256 |
|---|---|
| short-S source | `D8886C0715445E46ACF8AA1183294E9984394DFBDA872F317F782FD9BF3D6E8C` |
| short-S report | `17710D95651A12836EFF44BEEAA6F8EE16EC66468D7F8F33B572CF79CD4961AA` |
| S>=5 source | `A27C3CEF834A6E6DD78430A47241F89F18BEB383E706E3F84DCA501D495F56EE` |
| S>=5 report | `4AB0FF2B94BFD50767F102E454E5BC603D38710EE709A7F9BB63506F397A9014` |
| stable-B source | `9976DC6C4D52BBAC32446A280C02C9C6F357594B6C4F8579879A6B5DF8DB8994` |
| stable-B report | `A85306E4CAD87C37CF0F78FA9C7EA82F40EC6A5FA2EBA4AA18E48146142AF20C` |
| BB source | `32A3A58CC2E7607A12C47D169072DF1054EE271BEFCD26A8A9EB4B026AA82BB5` |
| BB report | `EE3DE525C4924438F69BC9721B50FEF798C7927EB8C1C92424538206B21FF333` |
| isolate source | `D9285FDF86EB401584500530DDE422EAB05DC87763E7AB7C2F7BA243CE25303C` |
| isolate report | `81EC8452FC0D8F4EF27EE86EF01C2FECD54F729F2A2E31153101361086FE589A` |
| finite fast source | `C8A3C487AC1355F64AA488C4A9AB4C15371B08D4E467B63C2BFF70EB404B53D6` |
| finite fast report | `6CA1D9B1E063800B83258322F147D2E5A1E1475AACAC4369F120E2E13298C375` |
| machine dependency report | `8B781DF846C569BD99BFAE6348A12061782C332039F9DA755D23387207CED302` |

Machine-readable graph:
`exact_certificate_dependency_assembly_20260829.json`.
