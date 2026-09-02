# Forest-cone root coherence is false between sampled parameter values

Date: 2026-08-13

The endpoint parameter-derivative identity remains exact:

```text
K_c=E+2cF+c^2G,
H_c=(1/2)partial_cK_c=F+cG.
```

However, the stronger proposed assertion that all ordered zeros of `K_c`
move in one common direction is false even at sharp forest reserve.
The smallest certified example found is

```text
(N,s,u,c)=(13,4,1,6/5),       N=2s+5,
```

where interval evaluation of

```text
-(F+cG)(lambda)/partial_tK_c(lambda)
```

at the two simple zeros of `K_c` gives signs `(-1,+1)`.  Further exact
examples are `(17,6,1,119/100)`, with signs `(-1,-1,+1)`, and
`(21,8,1,6/5)`, with signs `(-1,-1,+1,+1)`.

This explains why the earlier certified grid had no failure: it sampled
`c` in `{0,10^-3,10^-1,1,10,10^3}`, while the orientation exchange occurs
inside a narrow band near `c=1.2`.  That finite grid statement remains true
on its exact grid, but it is not evidence for a no-collision continuation
over the intervening parameter interval.

The correction does **not** affect the exact low-layer theorem proving
`F+cG` negative-rooted through `s=8`; a derivative polynomial can be
real-rooted without interlacing the polynomial it differentiates in a
parameter.  It removes only the proposed all-order Wronskian/root-coherence
shortcut.  The remaining endpoint target for `s>=9` is direct
negative-rootedness of `F+cG` (and `E+cF`), for example through the aligned
three-ray compatibility or discriminant/subdiscriminant route.

The exact replay is `verify_endpoint_forest_root_coherence_counterexample.py`
and writes `endpoint_forest_root_coherence_counterexample_exact_20260813.json`.
