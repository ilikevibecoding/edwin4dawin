# Rank-seven terminal-broom small-core splice

Date: 2026-08-20

Status: **exact finite-family theorem.**  This closes the literal small-core
case needed by the connected-tree `Q7` induction.  It does not claim that
the terminal residual `R_t` is nonnegative at every small core.

## Statement

Let `A` be any tree of order at most 14 rooted at `q`.  Form `G_t` by
adjoining a new support vertex at `q` and then adjoining `t>=1` leaves to
that support.  For every integer

```text
t >= max(1,12-alpha(A)),
```

the exact certificate proves

```text
Q7(G_t)=14 i7(G_t)^2-i6(G_t)i7(G_t)-16i6(G_t)i8(G_t) >= 0.
```

The lower limit is exactly the target range because choosing the support or
all new leaves gives

```text
alpha(G_t)=max(1+alpha(A-q),t+alpha(A))=t+alpha(A).
```

## Exact method

The WROM generator enumerates every free tree through order 14 and every
choice of root, for 72,145 rooted cores.  Rooted independence-polynomial
dynamic programming computes `I(A)` and `I(A-q)` through rank eight.  The
identity

```text
I(G_t;x)=(1+x)^t I(A;x)+xI(A-q;x)
```

then gives `Q7(G_t)` exactly.

The polynomial `Q7(G_t)` has degree at most 14 in `t`.  At
`t0=max(1,12-alpha(A))`, the verifier evaluates the 15 values from `t0`
through `t0+14` and takes successive exact forward differences.  Every
Newton coefficient is nonnegative.  Hence

```text
Q7(G_t)=sum_(j=0)^14 binom(t-t0,j) Delta^j Q7(G_t0) >= 0
```

for every integer `t>=t0`.

The minimum value at the target entry point is

```text
609848,
```

attained among rooted cores of order 10.  Structural high differences can
vanish, so the minimum over all Newton coefficients is zero.

## Why the splice is necessary

The older residual census proves all 14 residual coefficients nonnegative
at core orders 13 through 18, but its zeroth coefficient is negative for
some rooted cores of orders 10, 11, and 12.  In addition, a smaller core
`A` can have negative `Q7(A)` when `alpha(A)` is 7 or 8.  Therefore the
connected induction cannot legitimately replace this theorem by a blanket
claim that `R_t>=0` below order 19.

For core orders 15 through 18, the existing residual census applies.  If
`alpha(A)<=11`, the exact exceptional-tree classification proves
`Q7(A)>=0` above order 14; if `alpha(A)>=12`, strong induction applies.
Also `A-q` has order at least 14, so the order-at-least-13 conclusion inside
the exact rank-six forest lift gives `Q6(A-q)>=0`.  Thus this new theorem
joins the old residual census without an order gap.

## Replay and hashes

Run:

```powershell
python .\replay_rank7_terminal_broom_small_core_splice.py
```

Expected status:

```text
PASS_EXACT_RANK7_TERMINAL_BROOM_SMALL_CORE_SPLICE_THROUGH_N14
```

Artifacts and SHA-256 hashes:

```text
verify_rank7_terminal_broom_small_core_splice.rs
E34F4B185A953D6925DD3243025A8B8749AF99BB7955FFF442B88FD0182F966F

replay_rank7_terminal_broom_small_core_splice.py
5BAC31E26CBD6414AD866CF415923E97DEC68230A7EFBDCAC6F2F822FB246C48

rank7_terminal_broom_small_core_splice_exact_20260820.log
4D4ED6CD8EF530B1B02B6B7EA95295E3E5F00F852C7C04C636900E25E9084B7F

rank7_terminal_broom_small_core_splice_exact_20260820.json
96242456FB1BAD0861F8B6731FEA21986F4B3E0FA673EB5A8C84545549881A20
```
