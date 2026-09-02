# Rank-seven integration and dependency audit

Date: 2026-08-16

Status: **exact bounded audit with declared remaining gaps; not an
unconditional rank-seven `Q_7` or PGC theorem.**

## 1. Outcome

All three rank-seven convolution cones are now exact theorems.  The master
note correctly records the complete low/high and low/low artifact names and
hashes.  It does not, however, explicitly record the high/high verifier and
report, and Section 109.31 mistakenly cites Section 109.15 as if it were the
high/high theorem.  Section 109.15 is the finite terminal-broom base.

The shortest remaining implication to unconditional rank-seven `Q_7` is also
slightly longer than “rooted `C_7` residual plus `Delta^3,Delta^4`.”  Those
two closures would finish the large-order tail, but the existing theorem
artifacts still leave the terminal-broom residual for rooted core orders
19 through 38.  A direct finite `R_t` lemma on that band is the weakest
additional sufficient bridge.

The initial audit did not edit the master and did not run a symbolic
expansion or tree census.  Its two integration findings were then corrected
in the master: Section 109.16 now records the explicit high/high verifier,
report, and hashes, and Section 109.31 now points to the high/high certificate
rather than Section 109.15.  The replay verifies the corrected state.

## 2. Three convolution cones

| cone | exact result | size / certificate | verifier and report SHA-256 |
|---|---|---|---|
| high/high | `PASS_EXACT_FULL_RANK7_HIGH_HIGH_CONVOLUTION_CONE` | 108,603,332 coefficients; no negatives; minimum 1 | `verify_rank7_high_high_convolution.py`: `23F7C454224CF640DEB291BBA15993801A6BFB49F99A580836A681F55A28FD06`; `rank7_high_high_convolution_exact_20260813.json`: `4560A9F5D0B0646EEA1BA078D2895131A7E6368861219F3EEC8D5272767C86B8` |
| low/high | `PASS_EXACT_MEMORY_BOUNDED_RANK7_LOW_HIGH_FULL_CONVOLUTION_CONE` | 113,543,730 coefficients; 774 raw face negatives paid by 316 exact AM-GM blocks; exhaustive 3,060-slice merge | sliced verifier: `9AFEF18A131C6E19BE29398566931D320D89E2E4207637C4C42F5D04777CAD3F`; merged report: `8E7363ACA615C60065B3E1C2F1A6DEC38110CF9D58CA59CB5BB7553D89DF970D` |
| low/low | `PASS_EXACT_MEMORY_BOUNDED_RANK7_LOW_LOW_FULL_CONVOLUTION_CONE` | 118,516,125 coefficients; 790 raw face negatives paid by 230 old plus 196 new exact blocks; exhaustive 3,060-slice merge | sliced verifier: `17D6B13EAD97F8EAAD1A339172D45DDC4D78491BA3DE1162D889E14135500026`; merged report: `8A396F7872ABCA4A556BC0231355CB648C5D2D75DC38F5DAEAEB11FE9491EB2A` |

The low/high theorem note and merger hashes are respectively
`CD39B88EA13AE3D0503DEDBCAE3356BB48A42C4DE99B635602ABE4863B6E193E`
and
`200B5EEADF11AF971D55C930C3E174BD345D5C4728C3BE36DDB2F12B2DABB525`.
The low/low theorem, face verifier/report, and merger hashes are respectively
`8C65FA877AE60AE0A71ADA86ECB51865BCB82457821ABB4D5598C3ECBF8C7E5E`,
`C57340F040E0079C7601D001D56568B66B9043B1C1ABBF77B9086FD3AEB6B7B8`,
`CA4D962B6FBD31E0CEF3D1D5E0D27547F1C81C34CC3798D2C76826EFABC6F594`,
and
`DB429C13AD9E75FC8D7221795699CAB229D84C10B34FD61AD98A6AB5AF057F8F`.

## 3. Master-note integration findings

1. Section 109.27 contains all four low/high artifact names and their correct
   hashes.
2. Section 109.31 contains all six low/low artifact names and their correct
   hashes.
3. Section 109.16 now records `verify_rank7_high_high_convolution.py`,
   `rank7_high_high_convolution_exact_20260813.json`, and their hashes.
4. Section 109.31 now points to the high/high certificate recorded in Section
   109.16 rather than the unrelated finite terminal-broom base in 109.15.
5. Section 109.16 now states that both low cones are closed, while retaining
   the connected-tree theorem as the remaining condition.

The exact conditional lift remains:

```text
connected-tree Q7 for alpha>=12
+ high/high, low/high, low/low convolution cones
=> all-forest Q7 for alpha>=12.
```

Its report status is
`PASS_EXACT_CONDITIONAL_ALL_FOREST_RANK7_Q7_LIFT`, and the theorem-note and
report hashes are
`1BCE6473B3DD90E9D597AA43F75A7468D8FB6205754073AD78AC9C47E27D5F82`
and
`5DD81CC8BF4A334ED9D6D7B88DBE271DB0A0F9FEA4FEB9F9126DCC06875E563E`.

## 4. Exact terminal-broom coverage matrix

For

```text
R_t = sum_(j=0)^13 binom(t-1,j) Delta^j R_1,
```

the current exact theorem artifacts give:

| rooted core order | proved | exact remaining issue |
|---|---|---|
| through 18 | `Delta^1` through `Delta^13` from their first nonvacuous orders; `Delta^0>=0` for orders 13--18 | `Delta^0` can be negative at orders 10--12, so the final induction must cite the existing small-core disposal rather than claim coefficientwise positivity there |
| 19--38 | `Delta^7` through `Delta^13` | no theorem artifact currently proves `R_t>=0`; coefficientwise route still needs `Delta^0` through `Delta^6` |
| at least 39 | `Delta^0,Delta^1,Delta^2` and `Delta^5` through `Delta^13` | exactly `Delta^3,Delta^4` |

The rooted-cross package currently proves all roots at orders 19--22 and at
least 39, plus the stated structural portions of orders 23--38.  Its exact
remaining cut has 83 `(order,root-degree)` cells and 18,517 inclusive integer
parameter levels.  Closing that cut would make rooted `C_7` universal from
order 19, but it would not by itself prove the seven middle-band
terminal-broom inequalities.

The residual-cut theorem note and report hashes are
`68274D1D527D6A1A366A9447CB755DC9859958CC78234A76DDCA299686E9BE02`
and
`EBF9369561D528A94FA08846E6BF465DB7485D3DF271E462C63DF48E5473587D`.

## 5. Shortest exact remaining implication

The conjunction of the following two proposed closures is insufficient by
itself:

1. prove rooted `C_7` on the 83 residual cells in orders 23--38;
2. prove `Delta^3 R_1>=0` and `Delta^4 R_1>=0` for every rooted core of order
   at least 39.

It would leave core orders 19--38.  The weakest additional sufficient lemma
is the direct finite-band statement

```text
For every rooted tree core A with 19<=|A|<=38 and every integer t>=1,
R_t(A,q)>=0.
```

A stronger coefficientwise sufficient version is

```text
Delta^j R_1(A,q)>=0 for j=0,...,6
for every rooted A with 19<=|A|<=38.
```

The high coefficients `j=7,...,13` are already proved throughout that band.
If future `Delta^3,Delta^4` theorems are made uniform down to order 19, the
coefficientwise finite-band obligation reduces to `j in {0,1,2,5,6}`.

With the direct middle-band lemma and an explicit citation for the small-core
splice, the exact implication is:

```text
large-order Delta3/Delta4
+ middle-core R_t lemma
+ existing lower-core base and terminal-broom identity
=> connected-tree Q7 for alpha>=12

+ the three proved convolution cones and exact conditional lift
=> all-forest Q7 for alpha>=12

+ PASS_EXACT_ALL_FOREST_V7_ALPHA_AT_LEAST_12
+ PASS_EXACT_ALL_ORDER_RANK7_ALPHA11_BOUNDARY_THEOREM
=> rank-seven PGC.
```

The rooted-`C_7` residual closure belongs upstream of the middle-band and
large-order coefficient proofs wherever those arguments use rooted `C_7`;
it is not itself the missing terminal-broom conclusion.

## 6. Bounded replay

Run:

```text
python verify_rank7_integration_audit.py
```

Expected terminal lines:

```text
PASS_EXACT_BOUNDED_RANK7_INTEGRATION_AUDIT_WITH_DECLARED_GAPS
all_three_cones_mathematically_closed=True
master_high_high_explicit=True
master_stale_cone_text_corrected=True
remaining_exact_bridge=middle_core_R_t_orders_19_through_38
```

The replay checks artifact hashes, exact statuses/statistics, master-note
presence/absence, and the residual-cut cardinalities.  It intentionally does
not certify any currently open mathematical lemma.
