# Rank-eight terminal Delta0--Delta3: four-cubic-path inner leaf root

## Theorem

For every subdivision of the four-cubic-path degree-surplus-four skeleton, of
every order `n>=27`, rooted at an inner terminal leaf,

`Delta^j R_1(A,q)>0` for `j=0,1,2,3`.

## Exact quotient and all-order lift

The exact symmetry quotient has 19,668,992 keys, partitioned without a gap as:

- 5,445,468 all-short keys, of which 4,950,075 have order at least 27;
- 14,223,523 mixed all-order rays;
- one all-long ray.

The transfer/Newton reduction proves degree bounds `28,28,27,26` for
`Delta0,...,Delta3`. The primary scan checked all 4,950,075 finite cells and
29 points on every rank-ray, totaling 1,649,928,784 rank-ray samples. Every
Newton constant and first difference is positive, all higher coefficients
through the exact degree are nonnegative, and every coefficient above the
degree vanishes.

## Independent literal audit

A separately compiled checked-`i256` engine used independently transcribed
right-to-left edge messages. It rebuilt 47,620,647 literal trees, matched the
complete primary finite-value and Newton-coefficient streams, and checked an
unseen `S=29` value for each rank and ray (56,894,096 checks).

## Immutable evidence

- reduction source/report:  
  `9A91F7DDCFB30D1D54BD47346C62CE7C2242F0A47C84F11A11E1AC7326FF9405`  
  `C57C21ADDB6672CC97A040B6C173A2292BE0BF514D2A0BB1F94E4DFAD66BE61D`
- primary source/executable/raw result:  
  `890239EF02C6E17645C4375213ECD2D322152CF62FDAE6326B80774BF847607D`  
  `8A48D04942D2EC76538BDC40FB7481C454DAF52D26E90A8A0F128790DC33E30D`  
  `D59576C0D0501D09602AF86A77210A2A6B3D1C03CB35E9EDB62BF42212DC9863`
- sealed primary source/report:  
  `CFE64D770D8215D715E637E89B6B94FE50CD5D33A462FDF121F4B2563631B7BF`  
  `249ADD9F09306572B43E7CEDA3AF2256EC2B5865498F3D8E762A6E479D4ABE19`
- literal-audit source/executable/raw result:  
  `F2EBE20662F6DFEE3DDB65A4472436C6E7FE39E931D74EE8F8DBA7C355A03D8C`  
  `68648A9C3E0DB2D646B5A19D85ED9D49DC38B7989484956D55206CBFB4E399D3`  
  `ACC10E6E7CD0C841427FE46D64814B50AF3170EF08F632502F960CF517FC8033`
- sealed independent-audit source/report:  
  `B8CB8035FFADE62F499BC07BE4720A4A9016B23433FBE0CC0061788BCF2AEB54`  
  `C594C8FDF057EB6E43EEDE51A8788CC938D2C93DD100D1042C7021E874490D4A`

This theorem credits exactly `four_cubic_path:inner_leaf`; all other root
orbits remain separate.
