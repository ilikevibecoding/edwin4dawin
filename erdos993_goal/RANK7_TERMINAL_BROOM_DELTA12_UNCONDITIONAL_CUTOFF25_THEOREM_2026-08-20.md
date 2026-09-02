# Rank-seven terminal-broom `Delta1`--`Delta2` theorem from order 25

Date: 2026-08-20

Status: **PROVED EXACTLY FOR EVERY ROOTED TREE CORE OF ORDER `n>=25`.**

## Theorem

For the exact rank-seven terminal-broom residual `R_t(A,q)`, every rooted
tree core `A` of order at least 25 satisfies

```text
Delta^1 R_1(A,q) >= 0,
Delta^2 R_1(A,q) >= 0.
```

This removes the rooted-`C7` condition from the earlier cutoff-25
certificates.

## Complementary capacities

Put `J=A-N[q]`, `m=|J|`, `a=i4(J)`, `b=i5(J)`, and use the earlier
normalization

```text
y=c4/c5,  z=c5/c6,  s=h5/c5=1-a/c5,  d=h6/c6=1-b/c6.
```

Three literal containments/counts give

```text
a <= c4,
5b <= (m-4)a,
b <= h5.
```

Hence

```text
s >= 1-y,
d >= max(1-z(m-4)(1-s)/5, 1-sz).                 (1)
```

The two lower faces in (1) switch exactly at

```text
s0=(m-4)/(m+1).
```

For root degree at most four, the existing coefficient floor
`y>=5/(n-4)` puts `1-y<=s0`, so `[1-y,1]` splits at `s0`.  For root degrees
five through seven, the path/root-mass floor

```text
s >= 1-C(m,4)/C(n-4,5)
```

is already at least `s0`, leaving only the extension face.  The exact
structural replay checks all 98 integer `(n,r)` rows for `25<=n<=38` and
`1<=r<=7`, all 154 branch intervals, and verifies that every substituted
lower face remains in the half-retention domain `d>=1/2` required for the
proved `c7` concavity.

## Exact finite certificate and coverage join

The current rooted-`C7` residual manifest has 69 `(n,r)` cells in orders
25--38, all with `r<=7`.  The checkpointed exact batch certifies both ranks,
both rank-six-defect endpoints, and every required active capacity face:

```text
472 expected cells
472 passing cells
0 failures.
```

Each fixed cell retains the full rank-`(3,4)`/rank-`(4,5)` and defect boxes
used by the earlier theorem and uses exact rational tensor-Bernstein
coefficients.  No floating-point inference is used.

The join is exhaustive:

1. from order 39, the prior rooted-`C7` theorem and cutoff boxes apply;
2. in orders 25--38, the rooted-`C7`-covered complement uses those same
   boxes;
3. every remaining rooted-`C7` residual cell uses the 472 new lower-face
   cells together with the eight already-proved unconditional upper-face
   boxes.

The exact assembler terminates with

```text
PASS_EXACT_RANK7_DELTA1_DELTA2_UNCONDITIONAL_N_AT_LEAST_25
```

## Replay

Run

```powershell
python .\verify_rank7_delta12_complementary_capacity_structure.py
python .\run_rank7_delta12_complementary_capacity_fixed_batch.py
python .\verify_rank7_terminal_broom_delta12_unconditional_cutoff25.py
```

Primary SHA-256 values:

```text
rank7_terminal_broom_delta12_unconditional_cutoff25_exact_20260820.json
81B99AC71502FBC48077D3600855C6AA22B61BE49129755C38FD1EFEA56BE0C9

verify_rank7_terminal_broom_delta12_unconditional_cutoff25.py
230A7132A0491DE26BA423168D04DB189F2CFBB733086E9E82B4E16F27C462E8

rank7_delta12_complementary_capacity_fixed_exact_20260820.json
3851B082A8AD23194DD36E4866F3556BE2F43F972BCE951658E8C76FAB49473F

prove_rank7_delta12_complementary_capacity_fixed.py
E40E3AA63FB6D357ABF258E09F4F4A6BD115FB50D745E37545CD74172FF9E5B8
```

## Scope

This theorem closes `Delta1` and `Delta2`; it does not close `Delta0`, the
connected-tree `Q7` reserve, or Erdős Problem #993.  The exact rank-zero
enclosure failure at order 27 remains separately preserved.
