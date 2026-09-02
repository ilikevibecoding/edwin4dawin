# Exact subdivided-star obstruction to token-sliding ratio monotonicity

## Scope

The proposed adjacent-rank strengthening

```text
s_(r+1)/((r+1)i_(r+1)) <= s_r/(r i_r)
```

is false for trees.  The smallest counterexample inside the uniform
subdivided-star family has order 37.  This is not a counterexample to the
averaged component-surplus inequality or to Erdős Problem 993.

## Closed family

Let `S_d` be obtained from the star `K_(1,d)` by subdividing every edge once.
Separating subsets according to whether the center is selected gives

```text
A_d(x)=I(S_d;x)=(1+2x)^d+x(1+x)^d.
```

A subset inducing exactly one edge either uses one arm-leaf edge while the
center is absent, or one center-arm edge while every other arm root is
absent.  Hence its polynomial is

```text
B_d(x)=d*x^2*((1+2x)^(d-1)+(1+x)^(d-1)).
```

Writing `s_r=[x^(r+1)]B_d`, exact simplification gives

```text
q_r=s_r/(r*i_r)
   =(2^(r-1)+1)/(2^r+r/(d-r+1)).
```

For `t=d-r+1`, the sign of `q_r-q_(r+1)` is the sign of

```text
F(r,t)=2^(r-1)*(2t^2-(r+1)t+2r)+t+r.
```

## Exact witness

Take `d=18`, so the tree has 37 vertices.  Then

```text
q_15 = 65540/131087,
q_16 = 98307/196624,
q_15-q_16 = -32749/25774850288 < 0.
```

The next comparison also fails:

```text
q_16 = 98307/196624,
q_17 = 131074/262161,
q_16<q_17.
```

The original integer cross margins are respectively

```text
-81772943040,
-4088647152.
```

An exact scan of the displayed formula finds no failure for `d<=17`, so
order 37 is minimal within this family.

## Why the actual route survives

For `S_d`,

```text
W=binom(2d-1,2),
e=binom(d-1,2),
m2=W-e=3d(d-1)/2.
```

At the two failed ratio comparisons, every actual averaged margin

```text
r*m2*i_r-W*s_r
```

is still strictly positive.  For `d=18`, the margins at ranks 15, 16, and
17 are

```text
64788256980,
25914324816,
6478458957.
```

Moreover, the complete independence sequence has its unique mode at rank 12
and is unimodal.  The witness therefore removes only the monotone-ratio
shortcut; the weaker aggregate inequality remains the live target.

## Replay

Run

```powershell
python .\verify_token_sliding_ratio_subdivided_star_obstruction_root.py
```

The replay constructs the 37-vertex tree, independently reconstructs both
coefficient rows using a generic rooted-tree DP retaining zero and one induced
edge, checks the closed forms coefficient by coefficient, verifies both exact
negative crosses, checks the positive aggregate margins, and prints

```text
COUNTEREXAMPLE_EXACT_TOKEN_SLIDING_RATIO_MONOTONICITY_SUBDIVIDED_STAR
```
