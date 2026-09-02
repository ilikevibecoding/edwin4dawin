# Three-quarters PGC manifest

Generated and reverified on 2026-07-26.

```text
2F05C4EEF51305F06FAABFCFDF1FC8B8DCADAAB9B100733BE40A4C9A7AA15BD7
  pgc_three_quarters_all_forest_polynomials_n17_20260726.json

6990AA2B66448EFF6923F3D099DE93F659CAED66D66411F6408BF5234107615E
  scan_pgc_all_forest_polynomials.py

BD4266BFBDDF9B2C508A54C33C4854805BC975D3248ED9A03307A8E2133656EF
  verify_pendant_pgc_rank2_forests.py

E39683C7CF79D2C233FC33D0F5A3229CA103CFC74B452C584C88EA8CE47F80C3
  verify_terminal_pgc_paths.py

638F7F2206717497E30C2D0376E2ADEF899C1739BC4A16B6DB72DFA952ADB281
  verify_terminal_pgc_stars.py

CCECD90154F528CA2618F6D1371B895140CB2C2DDA86059835A732012809D5F4
  verify_rank3_three_quarters_trees.py

3250A99B6332E2FF526C9AFA947DA2D1FE084E34A697FA4E3E7BDF122CF16201
  RANK3_THREE_QUARTERS_TREE_CERTIFICATE_2026-07-26.md

0029E254A589621CD0C13AF66095C6291E427E1ED6CF8CB22E1F8B26DA98CFC2
  verify_rank3_three_quarters_forests.py

DDB83C9308926F42046222DC1D1E47958F1C24564D5B0978F8F8E6EBF9604CC2
  RANK3_THREE_QUARTERS_FOREST_CERTIFICATE_2026-07-26.md

003EB2385DDCC9262408060A005EE6B9D1080B4CE62F19319EE5DCB492C68466
  scan_scaled_three_boundary.py

169A65B9AD046998A37015C81AF42C3FC8D37C87C9637F494F66DD029691BD7E
  scaled_three_boundary_n17_20260726.json

2DAA58FEE6C92ECD72C66533B6BDF7AE401BB4F03FE720B8362EC14238EFC55A
  scan_scaled_three_leaf_boundary.py

5996208AC99B5D51A7698F516FC6595C5DA0F0CBF5059F59F231DC7D61DBDE50
  scaled_three_leaf_boundary_n17_20260726.json

06C4B29D57B5C92D76A4242D1987DAF7D198D1CE5859D0E4ABF609398FC79A85
  scan_scaled_three_patternboost.py

F14EE7537FCF5A43BDAA58443A6B1599593A2DA83FCE29447DBF750BB7EC692C
  scaled_three_patternboost60_20260726.json

7CFFD8C24056E10D285A4DC7120B86B1FBA07D590EBC69B824A0E04EF30DCCF1
  verify_scaled_three_prefix_reduction.py

F60D328242EA2EAEEE9EF9739EC16749CFDA04F49CC69D073C135957506FC860
  FUGACITY3_COEFFICIENT_PREFIX_REDUCTION_2026-07-26.md

517359CE1FA4CE5FA3D948AB7E31728D1C1A9800F82B51C5A2D6D815781D95F1
  scan_patternboost_scaled_three_boundary_payment.py

7D27424C00891B48E69868813C537911B8B592CF8631C65940D25D12BAF42C10
  patternboost60_scaled_three_boundary_exact_r5_20260726.json

44FB86EE0DCF561CAD60A251F8AB2C21E1A5E68F0A8F23F15AD839F0EC7ABD25
  random_scaled_three_leaf_boundary_search.py

7F8264670F61382F55AD6A5A9619CF3C59E3A98BFACE184A133C4FAD2BDBF631
  random_scaled_three_leaf_boundary_extra_roots_5k_20260726.json

D310C83A1C44E02E6F40EACE1395060B3F3F324A905C985AA676A56471FB3111
  verify_pendant_gsb_cascade_reduction.py

27B7B4B1CF5583061711E0573F7D2363A71241C4B6E140AC09AFB5F2D93A7C60
  PENDANT_GSB_CASCADE_REDUCTION_2026-07-26.md

5464F588BE67C149B2DEEA22414C795D9264865CC2093558D86CB8A4386B183A
  scan_leaf_gsb_mixture_reserve.py

920D012BB50C3F6138EBBEFE279FE70FAA1F715AEFED7BD21B0384A2943A2C32
  leaf_gsb_mixture_local_payment_n15_20260726.json

D02D60E1D763251B93D8A955C74184C00601435F3E237F95B618A7167C48E155
  scan_patternboost_leaf_gsb_local_payment.py

962B58F72BCCA14C6DE9E98727017A95144225ACBB1F8E5886CD10997BA1791F
  patternboost60_leaf_gsb_local_payment_all_a3_20260726.json

75FDD733A04C232B90DC08AA21D02AA921B23E06BA005E37A32C27145E9E0535
  verify_terminal_quarter_payment_rank2_forests.py

EC93CC854F930F8342A077D4DB71A8E040AD896D16AD83E2BD115243D60594E0
  TERMINAL_QUARTER_PAYMENT_RANK2_CERTIFICATE_2026-07-26.md
```

All symbolic verifiers report `PASS`.  The order-17 scan reports
no PGC failure and no three-quarters PGC failure in 4,275,315 exact
prefix-rank comparisons.  The rank-3 forest verifier additionally
checks 13,675 exact nonnegative coefficients.  The scaled-three scans
find no floor-prefix failure in 1,040,175 distinct-forest comparisons
through order 17, and no stronger ceil-prefix failure in 1,150,009
comparisons.  They find no true boundary failure in 344,313 actual
exceptional leaf instances; among the 47,825 instances with negative
closed-deleted term, neither conditional payment half fails.  The exact
60-vertex PatternBoost corpus adds 871,902 floor-prefix and 911,883
ceil-prefix comparisons.  The targeted random-root run adds 4,280,730
exact exceptional boundaries, 2,112,290 with negative closed-deleted
term, with no failure.

The strengthened direct boundary \(D_k(G)\geq f_{k-1}\) also has no
failure in those 344,313 exhaustive and 4,280,730 random exceptional
boundaries.  The terminal cross determinant has no failure in 490,720
exhaustive ranks through order 15 or 2,484,921 exact PatternBoost
rooted ranks.  The stronger terminal quarter-payment has no PatternBoost
failure; its largest exhaustive ratio through order 15 is \(16/77\).
An exact orthant certificate proves it for local ranks \(r=1,2\).
