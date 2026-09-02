# Exact degree and outer-support bounds for the mixed-face cross block

This note concerns either mixed endpoint face `(z,w)=(0,1)` or `(1,0)`.
It is only a compression lemma for the finite rank-eight auxiliary rows.  It
does not assert the full Erdős #993 conjecture.

Let `R^L_i,R^R_i` be the left and right factor rows.  Every factor ratio is
homogeneous linear in the five base variables and ten ordinary slacks, hence
`R^L_i` and the zero-direction right row `R^{R,0}_i` are homogeneous of total
degree `i` and have ordinary-slack degree at most `i`.

The direction row starts at

```
R^{R,1}_3 = h R^{R,0}_2
```

and is extended by one linear ratio per rank.  The displayed explicit `h` is a
base variable, not an ordinary slack.  Consequently

```
slackdeg R^{R,1}_i <= i-1.
```

Binomial convolution with the left row preserves these bounds.  For ranks
`r=7,8,9`, both the full convolutions `c^epsilon_r` and tail convolutions
`v^epsilon_r` therefore satisfy

```
slackdeg c^0_r, slackdeg v^0_r <= r,
slackdeg c^1_r, slackdeg v^1_r <= r-1.
```

Each curvature expression is quadratic at ranks `(7,8,9)` and homogeneous of
total degree 16.  Writing its direction expansion as base, linear, direction
gives the exact ordinary-slack bounds

```
base curvature     <= 16,
linear curvature   <= 15,
direction curvature<= 14.
```

The capacity `left_ratios[2]` is homogeneous linear and has ordinary-slack
degree at most one.  The derivative part of a strong row has the same quadratic
rank degree as curvature and is then multiplied by the base variable `h`.
Thus the three strong pieces have bounds

```
base strong        <= 17,
linear strong      <= 16,
direction strong   <= 15.
```

It follows without expansion that:

- curvature has no ordinary-slack grades above 16;
- at curvature grade 16, only the base piece survives, so the middle row is
  exactly four times the far row;
- strong has no ordinary-slack grades above 17;
- at strong grade 17, only the base piece survives, so the middle row is
  exactly four times the far row;
- at strong grade 16, only base and linear pieces can survive; the direction
  piece is identically zero.

Finally, the ordinary slack `b0` occurs only in right gap zero.  Therefore it
occurs only in right ratio zero, which appears exactly once in every positive
rank factor-row product.  Every `c` or `v` convolution term has `b0` exponent at
most one, and every quadratic curvature/derivative auxiliary has `b0` exponent
at most two.  The left capacity has no `b0`.  Hence all curvature and strong
mixed-cross rows have exact outer support

```
0 <= exponent(b0) <= 2.
```

The three `b0` slices are disjoint and exhaustive.  Fixed total algebraic
degree makes them contiguous in the FLINT `degrevlex` term order because `b0`
is the final context variable.  This justifies atomic coefficient streaming by
the three outer exponents without assembling a global strong polynomial.
