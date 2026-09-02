# Forest terminal `m=1`, `j=4,5`: supported high-degree cap endpoint

Date: 2026-08-29

Status: **exact all-order modular endpoint theorem.**

## Statement

In the no-isolate disconnected-forest terminal-`q3` setup, put

```text
|G|=N+1, h=c(G)-1, d=deg_G(w), R=sum_(u~w)(deg_G(u)-1),
W=sum_v C(deg_G(v),2), y=i_j(H)/i_j(F).
```

Fix `j=4` or `5`, assume `N>=13`, `d>j`, and consider the supported face
`y>0`.  After the common nonnegative `W^2` term is removed from the exact
Gap-retaining forest-`m=1` lower, its value is nonnegative at the adverse
relative-shadow cap endpoint, at both rigorous `W` boundaries and both
rigorous `R` boundaries.

## Supported relative-shadow cap

The frozen relative-shadow triple count gives

```text
y <= (N-d-j+1)/(N-d-j+1+j(d-j)).
```

Support gives `N-d>=j`, so the first denominator summand is at least one;
`d>j` makes the other summand positive.

For fixed `h<ceil(j/2)`, the exact box is

```text
N=13+S,
d=j+1+(N-2j-1)v.
```

For `h>=ceil(j/2)`, it is

```text
h=ceil(j/2)+(N-j-2ceil(j/2)-1)u/2,
d=j+1+(N-2h-j-1)v.
```

Here `S>=0` and every box variable lies in `[0,1]`.  These maps use the
support cap `d<=N-j` and the root-component cap `d<=N-2h` and cover the
entire supported `d>j` domain.

The square-dropped lower is affine in `W`; after either `W` boundary is
substituted it is affine in `R`.  The producer therefore checks all four
`(W,R)` endpoints in each box.  Exact tensor-Bernstein conversion gives

```text
20 endpoint families,
526 numerator Bernstein coefficients,
7,134 numerator power coefficients in S,
0 negative and 0 zero numerator coefficients,
minimum positive numerator coefficient 1/4.
```

Every cleared denominator is independently coefficient-certified positive:
64 Bernstein coefficients and 156 power coefficients, all strictly positive.
The combined ordered coefficient stream is

```text
D7FE3888F81B59F60EAB3B2D7B75A2FF583ACC10423414C8419893D15D56D8FF.
```

## Frozen replay

```powershell
python .\prove_terminal_q3_m1_general_forest_j4j5_relative_cap_agent.py
```

Marker:

```text
PASS_EXACT_ALL_ORDER_FOREST_M1_J4J5_SUPPORTED_HIGH_DEGREE_CAP_ENDPOINT
```

Pins:

```text
prove_terminal_q3_m1_general_forest_j4j5_relative_cap_agent.py
  F80BD0E14F13D3F859499694B92858891107F82CA5B1A0C43345DA65CD4BF521
terminal_q3_m1_general_forest_j4j5_relative_cap_exact_agent_20260829.json
  10F521DCF9A938B245FFCCD4B413AA5A712D00F86DC724A9BDD39E7D5FB37F6B
```

## Scope

This is a modular endpoint theorem, not yet the complete `j=4,5` forest
`m=1` result.  Promotion requires the common `W^2`, FQ32-margin, `y=0`, and
`B=0` cones, the low-degree balanced-cap active and inactive sectors, and
the pinned finite-order theorem.  Target `j=3`, forest `m=0`, the final
assembly, unimodality, and Erdos Problem 993 remain open.
