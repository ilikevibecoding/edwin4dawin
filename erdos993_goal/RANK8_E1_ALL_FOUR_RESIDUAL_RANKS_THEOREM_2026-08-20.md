# Rank eight: all four pending residual ranks on the `e=1` layer

Date: 2026-08-20

Status: **proved and independently audited for every rooted tree core of order
at least 23 with degree surplus `e=1`.  This is a degree-surplus-layer theorem,
not a complete connected-`Q8` theorem.**

## 1. The theorem

For a tree core `A`, define

```text
e(A)=sum_v binom(deg_A(v)-1,2).
```

If `|A|>=23` and `e(A)=1`, then for every root `q` of `A`,

```text
Delta^j R_1(A,q) > 0,  j=0,1,2,3.
```

The new exact certificate proves ranks `0,1,3`.  The separately proved and
independently audited `Delta2` theorem supplies rank `2`.

## 2. Classification and root coordinates

The summand `binom(d-1,2)` is zero for degrees one and two, one for degree
three, and at least three for degree at least four.  Thus `e=1` forces exactly
one degree-three vertex and no larger degree.  The tree handshake identity
then gives exactly three leaves.  Suppressing degree-two vertices yields a
three-edge star, so `A` is a subdivided claw with three positive arms.

A root is either the degree-three center or lies on one arm.  For an arm root,
write `near,tail>=0` for the two pieces of its selected arm and order the two
other positive arms as `1<=b<=c`.  Then

```text
|A| = near + tail + b + c + 2,
```

so order at least 23 is exactly `near+tail+b+c>=21`.

## 3. Exact no-gap cells

Each segment is fixed short or symbolic long:

```text
near,tail in {0,1,...,6} or X+7,
b,c         in {1,2,...,6} or X+7.
```

The center-root orbit has 28 cells:

- one cell with three long arms;
- six cells with two long arms and one fixed short arm;
- 21 cells with one long arm and an unordered pair of fixed short arms.

Zero long arms have order at most 19 and are irrelevant.

The arm-root universe has 787 relevant short/long patterns and 838 symbolic
order-cover cells.  If a pattern has `m` long coordinates, baseline segment
sum `B`, and needs long-offset sum `T=max(0,21-B)`, then some offset is at
least `ceil(T/m)`.  Shifting each nonsymmetric witness coordinate covers the
whole order region.  When both other arms are long, their exact `b/c`
symmetry removes the duplicate `c` witness without losing coverage.

For ranks `0,1,3`, every coefficient and every constant coefficient in every
cell is strictly positive.  Across the center and arm cells the exact global
minima are

```text
rank    minimum coefficient       minimum constant
0       1/2633637888000           9521754536674380
1       1/2304433152000           44528787736465032
3       41/365783040000           285350865429930300
```

The exact order-23 control independently checks 40 unordered arm triples and
all 920 root placements.  Its minima are

```text
Delta0  5923170966582245376
Delta1  19969651851918297984
Delta3  58724193884454990528.
```

## 4. Independent fail-closed audit

The independent audit does not merely replay the assembler.  It:

1. rederives the `e=1` classification and all root coordinates;
2. reconstructs the complete 28-cell center key set;
3. reconstructs all 787 arm patterns and 838 cover cells;
4. checks the order-cover inequalities and `b/c` symmetry;
5. checks every reported coefficient minimum for strict positivity;
6. independently rebuilds all 2,514 arm-cell rank constants using path
   convolution and explicit transcriptions of `Delta0`, `Delta1`, and
   `Delta3`;
7. independently recomputes the 920-root order-23 control; and
8. pins the independently audited all-order `Delta2` theorem.

The audit returns

```text
PASS_INDEPENDENT_FAIL_CLOSED_AUDIT_RANK8_DELTA013_E1_ALL_ORDER.
```

## 5. Scope

Together with the all-root path theorem, this closes the complete
degree-surplus-zero and degree-surplus-one layers for all four pending ranks.
The remaining nonpath lane begins at `e>=2`.  No result here proves those
layers, connected `Q8`, the forest lift, or rank-eight PGC.

## 6. Replay and hashes

```powershell
python .\assemble_rank8_delta013_e1_all_order.py
python .\audit_rank8_delta013_e1_all_order_independent.py
python .\assemble_rank8_delta2_e1_all_order.py
python .\audit_rank8_delta2_e1_all_order.py
```

```text
assemble_rank8_delta013_e1_all_order.py
F0F6FCCE979A2E65FBEE83B9728B58FF402FA274D70AB9AD9B561029BFAED6FE

rank8_delta013_e1_all_order_exact_20260820.json
B0996169B0A122F8A5D01B0573293604768BFF6A48A5CF2B1B06B7805323D14D

audit_rank8_delta013_e1_all_order_independent.py
DFA9A031D54CBB686FEA80AA170522219A0CF544E53FDA6A0842DDCB44AAD3EC

rank8_delta013_e1_all_order_independent_audit_exact_20260820.json
6A43F883A9FB3D46D64A42403FD53CA80B0CEE6204A06C69766263C0A2E05E5F

assemble_rank8_delta2_e1_all_order.py
1A85FB61A066676D78ACF2594DFFAB7B9FFB90EC7457D456C6C5D376783F9EE1

rank8_delta2_e1_all_order_exact_20260820.json
755DBEBDF4D0F43E6C7C6FD4A999443BAB5410F977F4741933FF63DC3B8D1F3E

audit_rank8_delta2_e1_all_order.py
7F2D9FEB80138E36491D0133CDFD78C27690B4DA3C1FEF65D244315F14AB587C

rank8_delta2_e1_all_order_independent_audit_exact_20260820.json
6E51683EB933CAD94B2E1EFA4E054476FAC097B2F0E99A4FC47D8EB0B2035FE3
```

No master file was edited.
