# Forest terminal `m=1`, `j=4,5`: common exact cone

Date: 2026-08-29

Status: **exact all-order modular theorem for `N>=13`.**

For the fixed-low-block, Gap-retaining forest-`m=1` reduction at target
`j=4` or `5`, the following common facts hold over the full no-isolate
disconnected-forest structural domain:

1. the coefficient of `W^2` is nonnegative for every `0<=y<=1`;
2. the coefficient of the all-forest FQ32 margin `M` is nonnegative for every
   `y>=0`;
3. both exact `B=0` endpoint values are nonnegative; and
4. all four square-dropped `y=0` boundary values in `(W,R)` are nonnegative.

Here

```text
N=|G|-1, h=c(G)-1, d=deg_G(w),
B=N-2h-1, y=i_j(H)/i_j(F).
```

The exact box

```text
N=13+S,
h=1+(10+S)u/2,
d=1+(10+S)(1-u)v
```

satisfies

```text
B=(10+S)(1-u),
N-2h-d=(10+S)(1-u)(1-v),
lambda=(d-1)/B=v
```

and covers the entire relaxed domain.  At `B>0`, the two rigorous wedge
boundaries are the corrected affine lower

```text
lambda*C(d,2)+(1-lambda)B
```

and `C(N-2h,2)`; after either boundary is substituted, the square-dropped
`y=0` lower is affine in `R`, so its two endpoints suffice.  The separate
`B=0` identities cover the singular face.

Exact tensor-Bernstein conversion checked

```text
392 Bernstein coefficients,
4,276 power coefficients in S,
28 zero coefficients,
minimum positive coefficient 1/2.
```

The ordered coefficient stream is

```text
97EC7AE19D9263ABDF69E5007FEBED33BCB79B6EC05D27912BFB8B692A278915.
```

Replay:

```powershell
python .\prove_terminal_q3_m1_general_forest_j4j5_common_cone_agent.py
```

Marker and pins:

```text
PASS_EXACT_ALL_ORDER_FOREST_M1_J4J5_COMMON_CONE

prove_terminal_q3_m1_general_forest_j4j5_common_cone_agent.py
  0466DCA4BD4E4D4C40374F36C944057F97FF45FEF2C56FF94EFBAB7571EFBE19
terminal_q3_m1_general_forest_j4j5_common_cone_exact_agent_20260829.json
  C90DD965E7B9A8A16BEB2DFDA741AD1AD269D16C8448FC56CA9F354BD9CD655F
```

This is a modular theorem.  The adverse positive-`y` endpoint requires the
separate high-degree relative-cap and low-degree balanced-neighbor-cap
certificates.  Target `j=3`, forest `m=0`, final assembly, unimodality, and
Erdos Problem 993 remain outside this statement.
