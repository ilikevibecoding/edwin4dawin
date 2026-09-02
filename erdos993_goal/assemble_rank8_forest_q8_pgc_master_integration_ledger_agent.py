#!/usr/bin/env python3
"""Build the fail-closed rank-8 forest-Q8/PGC master integration ledger.

The report deliberately separates theorem cases from certificate sub-indices.
In particular, the 124 low/low mixed-cross row-grade cells are nested evidence
for the 144 mixed geometric positions; they are never added to the 521-position
low/low universe.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "rank8_forest_q8_pgc_master_integration_ledger_agent_20260823.json"


# Immutable, already sealed inputs.  A change to any byte fails the assembly.
REQUIRED = {
    "rank7_integration_readonly_20260820.json": (
        "E5E09C141040746F6FDBC69EA89A9E4507CE63C9DDEDD73DF0E1C47E67191C59",
        "PASS_EXACT_RANK7_INTEGRATION_DEPENDENCY_ASSEMBLER",
    ),
    "rank8_connected_q8_integration_readonly_20260820.json": (
        "440B5783DAB918BBF1DBAAC49D24166ADACFA38740399D7AC4E03EF1D02E4BC6",
        "PENDING_EXACT_RANK8_CONNECTED_Q8_INTEGRATION_DELTA0_3_N27_PLUS",
    ),
    "rank8_delta5_delta4_full_branch_independent_audit_20260820.json": (
        "55B91CF39CE16808C04BA64C6093CEEFEBF6DD244B9842ADE189D53EDE50D32D",
        "PASS_INDEPENDENT_SCOPE_AND_INTEGRITY_AUDIT",
    ),
    "rank8_forest_lift_lane_independent_audit_exact_20260820.json": (
        "6DC960E80727BF64941C9F0C02AC37E459F5444DB986DD780B8A22829F371FA0",
        "PASS_EXACT_RANK8_FOREST_LIFT_REDUCTION_AND_ALPHA1_FIXED_CONES",
    ),
    "rank8_high_high_mlr_convolution_exact_20260820.json": (
        "B3C617BB8B46E7C4C830882F12A1A6000388588F759B35FC53AD4FF300C9B6FF",
        "PASS_EXACT_ALL_ORDER_RANK8_HIGH_HIGH_FULL_CONVOLUTION_CONE",
    ),
    "rank8_high_high_mlr_convolution_independent_audit_exact_20260820.json": (
        "F1E5634AE939B2D0C7789B3D20D6AC5588F2EF535895F742E657892900337AD3",
        "PASS_INDEPENDENT_AUDIT_RANK8_HIGH_HIGH_FULL_CONVOLUTION_CONE",
    ),
    "rank8_low_high_full_cone_direct_h_exact_20260821.json": (
        "DAE963CA32C18CF7E6FAB7876B82EBC622A1ECAA8808F44DC901CE2E912DC9A5",
        "PASS_EXACT_RANK8_LOW_HIGH_FULL_CONVOLUTION_CONE",
    ),
    "rank8_low_high_full_cone_direct_h_independent_audit_exact_20260821.json": (
        "EE7828E3738047A0C925D885845DFE02A1D51871E3D10B842C5B5105F4240AD5",
        "PASS_INDEPENDENT_AUDIT_RANK8_LOW_HIGH_FULL_CONVOLUTION_CONE",
    ),
    "rank8_forest_lift_fixed_full_complete_integration_exact_20260820.json": (
        "591A2793682BF79D0E1241258DB1F0F385B94219577FDFC00C3705DA3FA6E2EF",
        "PASS_EXACT_READ_ONLY_FOREST_LIFT_INTEGRATION_FIXED_FULL_COMPLETE",
    ),
    "rank8_exceptional_first_crossing_alpha7_sources7_13_complete_exact_20260820.json": (
        "7CF5B21D18CD0D9B208F1D36ABC2E8FEF4947F942CBC291872705B99AB1E5768",
        "PASS_EXACT_NO_GAP_RANK8_ALPHA7_SOURCES7_13_COMPLETE",
    ),
    "rank8_exceptional_first_crossing_alpha7_sources7_13_complete_audit_exact_20260820.json": (
        "9B9CA836AB13AE52D969F681C6DFF8E0CD9FB01B74E85E32E7165076E80F2E0E",
        "PASS_INDEPENDENT_NO_GAP_RANK8_ALPHA7_SOURCES7_13_ASSEMBLY_AUDIT",
    ),
    "rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_agent_20260823.json": (
        "E0BE16DFDC987E0886C79AF7AC844A1E854DE11C27B434629BF6A14C9DAF23AD",
        "PASS_EXACT_NO_GAP_RESOURCE_DESIGN_REMAINING_2159_EXCEPTIONAL_FIRST_CROSSING_CELLS_NO_SIGN_RUN",
    ),
    "rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_independent_audit_agent_20260823.json": (
        "CF029B8CA26AC83FB86C8222F4852B30A8FC95596B181DE20AE411B0F8925168",
        "PASS_INDEPENDENT_NO_GAP_RESOURCE_DESIGN_REMAINING_2159_EXCEPTIONAL_FIRST_CROSSING_CELLS_NO_SIGN_RUN",
    ),
    "rank8_exceptional_first_crossing_all_2159_complete_closure_audit_agent_20260823.json": (
        "528175C118497AE27B8BC3C2B1F065DFC4D9A9DC6C78EB18F9D8C6B1A3169887",
        "PASS_EXACT_HASH_PINNED_INDEPENDENT_AGGREGATE_REPLAY_NO_GAP_RANK8_EXCEPTIONAL_FIRST_CROSSING_ALL_2159_CLOSURE_AUDIT_AGENT",
    ),
    "rank8_low_low_full_early_suffix45_redistribution_exact_20260822.json": (
        "846145E70AD06754450951C233E92C249770BBBCD02A1061C8AD78A122E13183",
        "PASS_EXACT_RANK8_LOW_LOW_FULL_EARLY_SUFFIX45_REDISTRIBUTION_GRID",
    ),
    "rank8_low_low_full_early_suffix45_redistribution_audit_20260822.json": (
        "784C9F6343FC4058E4A60BF5BD5742B5A1A67766A7CC1EF926BC5FCA58684ABE",
        "PASS_INDEPENDENT_SUFFIX45_REDISTRIBUTION_GRID_AUDIT",
    ),
    "rank8_low_low_suffix3_gap0_fast_agent_full_face_exact_20260822.json": (
        "E63F12DCBFC9ACF7874A241A6DF48D7DD6CE4CE136F0AEF5413477F867F3EBFD",
        "PASS_EXACT_FAST_AGENT_SUFFIX3_GAP0_FULL_FACE",
    ),
    "rank8_low_low_suffix3_gap0_fast_full_face_root_audit_exact_20260822.json": (
        "51EF34F786D4E472C2392766EDF5007EE5CCE5636C53EF81D2426B569D732A79",
        "PASS_INDEPENDENT_EXACT_FAST_SUFFIX3_GAP0_FULL_FACE_AUDIT",
    ),
    "rank8_low_low_a23_redistribution_interior_complete_exact_root_20260823.json": (
        "DF2AE35AD9F3627DA949E5ADE8F36C50D922679A1AF2DF40DA2E00A3F221F0F4",
        "PASS_EXACT_A23_377_POSITION_COMPLEMENT_ASSEMBLED",
    ),
    "rank8_low_low_a23_redistribution_interior_complete_independent_audit_root_20260823.json": (
        "9DC856937822DEC180E5F2AF8ACFC6B8E56FF5F41897123BE24A4B59BF098992",
        "PASS_INDEPENDENT_A23_377_POSITION_ASSEMBLY_AUDIT",
    ),
    "rank8_delta01_e2_complete_exact_agent_20260823.json": (
        "86D5D25E1C45090AA3FD95A5890F937333267439FF8375205EE89D95794F46AE",
        "PASS_EXACT_RANK8_DELTA01_E2_ALL_ROOTED_DOUBLE_CLAWS_N23_PLUS",
    ),
    "rank8_delta01_e2_complete_independent_audit_agent_20260823.json": (
        "8C1254D37A5F3628AFE8D68E8FE6A97E0E1D68F48B1A2E79B20B107EFDD85462",
        "PASS_INDEPENDENT_RANK8_DELTA01_E2_ALL_ROOTED_DOUBLE_CLAWS_N23_PLUS_AUDIT",
    ),
    "rank8_delta3_e2_complete_exact_root_20260823.json": (
        "E6E07392465F452E453915485EC9E62021F5497B7B8246C9EBCEC0D4124020C4",
        "PASS_EXACT_RANK8_DELTA3_E2_COMPLETE_ALL_ROOTS_ALL_ORDERS_N23_PLUS",
    ),
    "rank8_delta3_e2_complete_independent_audit_root_20260823.json": (
        "25BF34B6DD0B1D8CAA626EC70EF2C6DE9BFA736CBC6EF8F76BAA8A64351BE54C",
        "PASS_INDEPENDENT_RANK8_DELTA3_E2_COMPLETE_ALL_ROOTS_ALL_ORDERS_N23_PLUS_AUDIT",
    ),
    "rank8_delta03_e3_all_ranks_complete_exact_root_20260823.json": (
        "02C35B44E5E9B3DDFA7AE28D3AB6ED602B50AA62E6A4A69BC191B24F008E203B",
        "PASS_EXACT_RANK8_DELTA03_E3_ALL_RANKS_COMPLETE_N27_PLUS",
    ),
    "rank8_delta03_e3_all_ranks_complete_independent_audit_root_20260823.json": (
        "B94DE8DB80B3E99916720DAC248C141734A2E5FEE866AD75FF89C3644CDD5054",
        "PASS_INDEPENDENT_RANK8_DELTA03_E3_ALL_RANKS_COMPLETE_AUDIT",
    ),
    "rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json": (
        "E68D35E2CA3D5E061AACB7D45CD5B5D5A5ABA61FB0F8621111367E0CC1BA8F28",
        "PASS_EXACT_RANK8_DELTA03_E4_SKELETON_ROOT_NO_GAP_PARTITION",
    ),
    "rank8_delta03_e4_skeleton_root_partition_independent_audit_agent_20260823.json": (
        "207813C6F056BA63945B0025A0E1E907117F2CD09DA88891BD0F7820636C065C",
        "PASS_INDEPENDENT_RANK8_DELTA03_E4_SKELETON_ROOT_NO_GAP_PARTITION_AUDIT",
    ),
    "rank8_delta03_e4_skeletons_order27_exact_agent_20260823.json": (
        "257C7549AFEB4BB70ACAAA3DE416A27E5C14565EBEB4A56BC0E2343629498C8E",
        "PASS_EXACT_RANK8_DELTA03_E4_SKELETONS_ALL_ROOTS_ORDER27",
    ),
    "rank8_delta03_e4_skeletons_order27_independent_audit_agent_20260823.json": (
        "FFC1EE49014697148539AC7701DCA1446C33D483C491F96DE8E298B6B93DB4E6",
        "PASS_INDEPENDENT_RANK8_DELTA03_E4_SKELETONS_ALL_ROOTS_ORDER27_AUDIT",
    ),
    "RANK8_TERMINAL_DELTA03_ALL_ROOT_N27_FINITE_THEOREM_2026-08-23.md": (
        "A84B8D433B8024080A74890309C3C5C98DA21569CCE783C9AA4C2D287B83D81A",
        None,
    ),
    "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json": (
        "213ADB30A53D575D0CF39B5A5953A74305A8D38AB2A488350FCF35F5FCF70787",
        "PASS_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N27",
    ),
    "audit_rank8_terminal_delta03_finite_n27_wrom_threaded_root.py": (
        "D45E05C7EB63E7469F5D74F2E349C953DFA6D7EAA8D7641DBA14822D92E4AB12",
        None,
    ),
    "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json": (
        "BDA50403AD39A58884746A7345D7B403B286E0B5877947E9155061FDEAF4D02D",
        "PASS_INDEPENDENT_AUDIT_EXACT_RANK8_TERMINAL_DELTA0_3_CENSUS_N27",
    ),
    "audit_rank8_delta2_e2_bridge_all_arm_pairs_all_root_positions_root.py": (
        "DAF8DF5EFDF4C7C44ADD33831536864D15B769E08C2CCFE369674951EF42050F",
        None,
    ),
    "audit_rank8_delta2_e2_pendant_bridges1to7_all_nonlonglong_far_pairs_root.py": (
        "B62A056C40264B6DC3CBF5216AB4BAF3A2A104C39AF99FE10BC4D715E5FAB867",
        None,
    ),
    "audit_rank8_delta2_e2_complete_all_root_types_root.py": (
        "1E396AD7DB07AC508A707C973E957FFAFB4C913C2F78CA9B92EF6BEDD4C978E3",
        None,
    ),
    "rank8_delta2_e2_complete_all_root_types_independent_audit_root_20260823.json": (
        "FACB47E7F157483B18980A50F3465252257547960F462C2F857DC37D098997A2",
        "PASS_INDEPENDENT_RANK8_DELTA2_E2_COMPLETE_ALL_ROOT_TYPES_N23_PLUS_AUDIT",
    ),
    "assemble_rank8_delta03_e2_complete_root.py": (
        "2F93556842736505CBF7F322D26D5825B8F39DC53B4243DD519A3206950CF998",
        None,
    ),
    "rank8_delta03_e2_complete_all_ranks_all_roots_exact_root_20260823.json": (
        "2A021F3E0C238A43513C53A6183D983C1C2E14811B09375D5D15D484354CC656",
        "PASS_EXACT_RANK8_DELTA03_E2_COMPLETE_ALL_ROOTS_N23_PLUS",
    ),
    "audit_rank8_delta03_e2_complete_root.py": (
        "EDEDB0CB4E300B9EFD9C70D7070495E1EB16FDF6C9984C52F484A15B057D1496",
        None,
    ),
    "rank8_delta03_e2_complete_all_ranks_all_roots_independent_audit_root_20260823.json": (
        "9DC4AC421ADF5B9C46560004970A8C06FC26488F495A6B1418B51805F27DAD10",
        "PASS_INDEPENDENT_RANK8_DELTA03_E2_COMPLETE_ALL_ROOTS_N23_PLUS_AUDIT",
    ),
    "assemble_rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_agent.py": (
        "607CE40D529F5BD1C73684969564B9CFAE0CED7AF5263D2C100EF9D793E19A71",
        None,
    ),
    "rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_exact_agent_20260823.json": (
        "B5D1F3C3E27B54D77A229CC2CCE3E95679523164A40A433796E6678743220A34",
        "PASS_EXACT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_ALL_ROOTS_ORDER27",
    ),
    "audit_rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_agent.py": (
        "CE75CBCAB82FA1A16D3EC0BD6830FDA886D1082F952D341771DAED038562B0A5",
        None,
    ),
    "rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_independent_audit_agent_20260823.json": (
        "11CEF04556F24A4A15B3ED7250E9AE6F964ACB5F31D31366F1587966D4F9345A",
        "PASS_INDEPENDENT_RANK8_DELTA03_E5_QUARTIC_CENTER_TWO_CUBIC_ALL_ROOTS_ORDER27_PARTITION_AUDIT",
    ),
    "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json": (
        "A2E5E67E7852E2E663DE8092803C8FB889796E29E5888FB62994B9063E5A374F",
        "PASS_EXACT_RANK8_DELTA03_E5_SKELETON_ROOT_NO_GAP_PARTITION",
    ),
    "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json": (
        "E1096D465A47A425CCB37DB5C648EEB988389B03B0214757C62E2B4EF097BFF7",
        "PASS_INDEPENDENT_RANK8_DELTA03_E5_SKELETON_ROOT_NO_GAP_PARTITION_AUDIT",
    ),
    "rank8_v8_alpha14_finite_reduction_exact_20260816.json": (
        "6E7706445F2AB7161880489E8EDA56AE5F6395620545B813DE0D6E83D6133BF3",
        "PASS_PROOF_RANK8_V8_ALPHA14_ALL_FORESTS",
    ),
    "rank8_pgc_matching_quotient_boundary_exact_20260817.json": (
        "E61C51E0D37569C617DBE23AC3E88BA1A89DD188B3FC629264303714D1679A85",
        "PASS_PROOF_RANK8_PGC_ALPHA13_ALPHA14_BOUNDARY_ALL_FORESTS",
    ),
}


E4_GROUPS = [
    {
        "orbits": [
            "quartic_cubic_bistar:quartic_branch",
            "quartic_cubic_bistar:cubic_branch",
        ],
        "producer": "rank8_delta03_e4_bistar_branch_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e4_bistar_branch_all_order_independent_audit_agent_20260823.json",
    },
    {
        "orbits": ["quartic_cubic_bistar:cubic_leaf"],
        "producer": "rank8_delta03_e4_bistar_cubic_leaf_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e4_bistar_cubic_leaf_all_order_independent_audit_agent_20260823.json",
    },
    {
        "orbits": ["quartic_cubic_bistar:quartic_leaf"],
        "producer": "rank8_delta03_e4_bistar_quartic_leaf_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e4_bistar_quartic_leaf_all_order_independent_audit_agent_20260823.json",
    },
    {
        "orbits": ["quartic_cubic_bistar:central_spine_internal"],
        "producer": "rank8_delta03_e4_bistar_central_spine_internal_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e4_bistar_central_spine_internal_all_order_independent_audit_agent_20260823.json",
    },
    {
        "orbits": ["quartic_cubic_bistar:cubic_pendant_internal"],
        "producer": "rank8_delta03_e4_bistar_cubic_pendant_internal_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e4_bistar_cubic_pendant_internal_all_order_independent_audit_agent_20260823.json",
    },
    {
        "orbits": ["quartic_cubic_bistar:quartic_pendant_internal"],
        "producer": "rank8_delta03_e4_bistar_quartic_pendant_internal_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e4_bistar_quartic_pendant_internal_all_order_independent_audit_agent_20260823.json",
    },
    {
        "orbits": ["four_cubic_star:center_branch"],
        "producer": "rank8_delta03_e4_four_cubic_star_center_branch_all_order_exact_root_20260823.json",
        "audit": "rank8_delta03_e4_four_cubic_star_center_branch_all_order_independent_audit_root_20260823.json",
    },
    {
        "orbits": ["four_cubic_star:outer_branch"],
        "producer": "rank8_delta03_e4_four_cubic_star_outer_branch_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e4_four_cubic_star_outer_branch_all_order_independent_audit_agent_20260823.json",
    },
    {
        "orbits": ["four_cubic_star:leaf"],
        "producer": "rank8_delta03_e4_four_cubic_star_leaf_all_order_exact_root_20260823.json",
        "audit": "rank8_delta03_e4_four_cubic_star_leaf_all_order_independent_audit_root_20260823.json",
    },
    {
        "orbits": ["four_cubic_star:center_outer_spine_internal"],
        "producer": "rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e4_four_cubic_star_center_outer_spine_internal_all_order_independent_audit_agent_20260823.json",
    },
    {
        "orbits": ["four_cubic_star:pendant_internal"],
        "producer": "rank8_delta03_e4_four_cubic_star_pendant_internal_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e4_four_cubic_star_pendant_internal_all_order_independent_audit_agent_20260823.json",
    },
    {
        "orbits": ["four_cubic_path:outer_branch"],
        "producer": "rank8_delta03_e4_four_cubic_path_outer_branch_all_order_exact_root_20260823.json",
        "audit": "rank8_delta03_e4_four_cubic_path_outer_branch_all_order_independent_audit_root_20260823.json",
    },
    {
        "orbits": ["four_cubic_path:inner_branch"],
        "producer": "rank8_delta03_e4_four_cubic_path_inner_branch_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e4_four_cubic_path_inner_branch_all_order_independent_audit_agent_20260823.json",
    },
    {
        "orbits": ["four_cubic_path:inner_leaf"],
        "producer": "rank8_delta03_e4_four_cubic_path_inner_leaf_all_order_exact_root_20260823.json",
        "audit": "rank8_delta03_e4_four_cubic_path_inner_leaf_all_order_independent_audit_root_20260823.json",
    },
    {
        "orbits": ["four_cubic_path:middle_spine_internal"],
        "producer": "rank8_delta03_e4_four_cubic_path_middle_spine_internal_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e4_four_cubic_path_middle_spine_internal_all_order_independent_audit_agent_20260823.json",
    },
    {
        "orbits": ["four_cubic_path:outer_leaf"],
        "producer": "rank8_delta03_e4_four_cubic_path_outer_leaf_all_order_exact_root_20260823.json",
        "audit": "rank8_delta03_e4_four_cubic_path_outer_leaf_all_order_independent_audit_root_20260823.json",
    },
    {
        "orbits": ["four_cubic_path:outer_spine_internal"],
        "producer": "rank8_delta03_e4_four_cubic_path_outer_spine_internal_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e4_four_cubic_path_outer_spine_internal_all_order_independent_audit_agent_20260823.json",
    },
    {
        "orbits": ["four_cubic_path:inner_pendant_internal"],
        "producer": "rank8_delta03_e4_four_cubic_path_inner_pendant_internal_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e4_four_cubic_path_inner_pendant_internal_all_order_independent_audit_agent_20260823.json",
    },
    {
        "orbits": ["four_cubic_path:outer_pendant_internal"],
        "producer": "rank8_delta03_e4_four_cubic_path_outer_pendant_internal_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e4_four_cubic_path_outer_pendant_internal_all_order_independent_audit_agent_20260823.json",
    },
]


E5_GROUPS = [
    {
        "orbits": ["quartic_center_two_cubic:central_quartic"],
        "producer": "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_quartic_center_two_cubic_central_quartic_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["quartic_center_two_cubic:cubic_branch"],
        "producer": "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_quartic_center_two_cubic_cubic_branch_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["quartic_center_two_cubic:cubic_leaf"],
        "producer": "rank8_delta03_e5_quartic_center_two_cubic_cubic_leaf_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_quartic_center_two_cubic_cubic_leaf_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_quartic_center_two_cubic_cubic_leaf_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["quartic_center_two_cubic:quartic_leaf"],
        "producer": "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_quartic_center_two_cubic_quartic_leaf_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["quartic_endpoint_cubic_path:quartic_branch"],
        "producer": "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_branch_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["quartic_endpoint_cubic_path:quartic_leaf"],
        "producer": "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_leaf_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["quartic_endpoint_cubic_path:center_cubic_branch"],
        "producer": "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_branch_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["quartic_endpoint_cubic_path:endpoint_cubic_branch"],
        "producer": "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_branch_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["quartic_endpoint_cubic_path:center_cubic_leaf"],
        "producer": "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_leaf_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["quartic_endpoint_cubic_path:endpoint_cubic_leaf"],
        "producer": "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_leaf_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_leaf_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_leaf_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["quartic_endpoint_cubic_path:quartic_center_cubic_spine_internal"],
        "producer": "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_center_cubic_spine_internal_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_center_cubic_spine_internal_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_center_cubic_spine_internal_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["quartic_endpoint_cubic_path:cubic_cubic_spine_internal"],
        "producer": "rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_quartic_endpoint_cubic_path_cubic_cubic_spine_internal_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["quartic_endpoint_cubic_path:center_cubic_pendant_internal"],
        "producer": "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_pendant_internal_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_pendant_internal_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_quartic_endpoint_cubic_path_center_cubic_pendant_internal_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["quartic_center_two_cubic:quartic_pendant_internal"],
        "producer": "rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_quartic_center_two_cubic_quartic_pendant_internal_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["quartic_center_two_cubic:center_cubic_spine_internal"],
        "producer": "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_quartic_center_two_cubic_center_cubic_spine_internal_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["quartic_endpoint_cubic_path:endpoint_cubic_pendant_internal"],
        "producer": "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_quartic_endpoint_cubic_path_endpoint_cubic_pendant_internal_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["quartic_center_two_cubic:cubic_pendant_internal"],
        "producer": "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_quartic_center_two_cubic_cubic_pendant_internal_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["quartic_endpoint_cubic_path:quartic_pendant_internal"],
        "producer": "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_quartic_endpoint_cubic_path_quartic_pendant_internal_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["five_cubic_t:center_branch"],
        "producer": "rank8_delta03_e5_five_cubic_t_center_branch_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_five_cubic_t_center_branch_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_five_cubic_t_center_branch_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["five_cubic_t:middle_branch"],
        "producer": "rank8_delta03_e5_five_cubic_t_middle_branch_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_five_cubic_t_middle_branch_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_five_cubic_t_middle_branch_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["five_cubic_t:long_outer_branch"],
        "producer": "rank8_delta03_e5_five_cubic_t_long_outer_branch_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_five_cubic_t_long_outer_branch_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_five_cubic_t_long_outer_branch_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["five_cubic_path:center_branch"],
        "producer": "rank8_delta03_e5_five_cubic_path_center_branch_all_order_exact_agent_20260825.json",
        "audit": "rank8_delta03_e5_five_cubic_path_center_branch_all_order_independent_audit_agent_20260825.json",
        "theorem": "rank8_delta03_e5_five_cubic_path_center_branch_n27_plus_exact_agent_20260825.json",
    },
    {
        "orbits": ["five_cubic_path:center_leaf"],
        "producer": "rank8_delta03_e5_five_cubic_path_center_leaf_all_order_exact_agent_20260825.json",
        "audit": "rank8_delta03_e5_five_cubic_path_center_leaf_all_order_independent_audit_agent_20260825.json",
        "theorem": "rank8_delta03_e5_five_cubic_path_center_leaf_n27_plus_exact_agent_20260825.json",
    },
    {
        "orbits": ["five_cubic_path:near_inner_branch"],
        "producer": "rank8_delta03_e5_five_cubic_path_near_inner_branch_all_order_exact_agent_20260825.json",
        "audit": "rank8_delta03_e5_five_cubic_path_near_inner_branch_all_order_independent_audit_agent_20260825.json",
        "theorem": "rank8_delta03_e5_five_cubic_path_near_inner_branch_n27_plus_exact_agent_20260825.json",
    },
    {
        "orbits": ["five_cubic_path:outer_branch"],
        "producer": "rank8_delta03_e5_five_cubic_path_outer_branch_all_order_exact_agent_20260825.json",
        "audit": "rank8_delta03_e5_five_cubic_path_outer_branch_all_order_independent_audit_agent_20260825.json",
        "theorem": "rank8_delta03_e5_five_cubic_path_outer_branch_n27_plus_exact_agent_20260825.json",
    },
    {
        "orbits": ["five_cubic_path:inner_leaf"],
        "producer": "rank8_delta03_e5_five_cubic_path_inner_leaf_all_order_exact_agent_20260825.json",
        "audit": "rank8_delta03_e5_five_cubic_path_inner_leaf_all_order_independent_audit_agent_20260825.json",
        "theorem": "rank8_delta03_e5_five_cubic_path_inner_leaf_n27_plus_exact_agent_20260825.json",
    },
    {
        "orbits": ["five_cubic_path:outer_leaf"],
        "producer": "rank8_delta03_e5_five_cubic_path_outer_leaf_all_order_exact_agent_20260825.json",
        "audit": "rank8_delta03_e5_five_cubic_path_outer_leaf_all_order_independent_audit_agent_20260825.json",
        "theorem": "rank8_delta03_e5_five_cubic_path_outer_leaf_n27_plus_exact_agent_20260825.json",
    },
    {
        "orbits": ["five_cubic_path:center_pendant_internal"],
        "producer": "rank8_delta03_e5_five_cubic_path_center_pendant_internal_all_order_exact_agent_20260825.json",
        "audit": "rank8_delta03_e5_five_cubic_path_center_pendant_internal_all_order_independent_audit_agent_20260825.json",
        "theorem": "rank8_delta03_e5_five_cubic_path_center_pendant_internal_n27_plus_exact_agent_20260825.json",
    },
    {
        "orbits": ["five_cubic_path:inner_pendant_internal"],
        "producer": "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_all_order_exact_agent_20260825.json",
        "audit": "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_all_order_independent_audit_agent_20260825.json",
        "theorem": "rank8_delta03_e5_five_cubic_path_inner_pendant_internal_n27_plus_exact_agent_20260825.json",
    },
    {
        "orbits": ["five_cubic_path:inner_spine_internal"],
        "producer": "rank8_delta03_e5_five_cubic_path_inner_spine_internal_all_order_exact_agent_20260825.json",
        "audit": "rank8_delta03_e5_five_cubic_path_inner_spine_internal_all_order_independent_audit_agent_20260825.json",
        "theorem": "rank8_delta03_e5_five_cubic_path_inner_spine_internal_n27_plus_exact_agent_20260825.json",
    },
    {
        "orbits": ["five_cubic_path:outer_spine_internal"],
        "producer": "rank8_delta03_e5_five_cubic_path_outer_spine_internal_all_order_exact_agent_20260825.json",
        "audit": "rank8_delta03_e5_five_cubic_path_outer_spine_internal_all_order_independent_audit_agent_20260825.json",
        "theorem": "rank8_delta03_e5_five_cubic_path_outer_spine_internal_n27_plus_exact_agent_20260825.json",
    },
    {
        "orbits": ["five_cubic_path:outer_pendant_internal"],
        "producer": "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_all_order_exact_agent_20260825.json",
        "audit": "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_all_order_independent_audit_agent_20260825.json",
        "theorem": "rank8_delta03_e5_five_cubic_path_outer_pendant_internal_n27_plus_exact_agent_20260825.json",
    },
    {
        "orbits": ["five_cubic_t:center_middle_spine_internal"],
        "producer": "rank8_delta03_e5_five_cubic_t_center_middle_spine_internal_all_order_exact_agent_20260824.json",
        "audit": "rank8_delta03_e5_five_cubic_t_center_middle_spine_internal_all_order_independent_audit_agent_20260824.json",
        "theorem": "rank8_delta03_e5_five_cubic_t_center_middle_spine_internal_n27_plus_exact_agent_20260824.json",
    },
    {
        "orbits": ["five_cubic_t:center_short_outer_spine_internal"],
        "producer": "rank8_delta03_e5_five_cubic_t_center_short_outer_spine_internal_all_order_exact_agent_20260824.json",
        "audit": "rank8_delta03_e5_five_cubic_t_center_short_outer_spine_internal_all_order_independent_audit_agent_20260824.json",
        "theorem": "rank8_delta03_e5_five_cubic_t_center_short_outer_spine_internal_n27_plus_exact_agent_20260824.json",
    },
    {
        "orbits": ["five_cubic_t:long_outer_leaf"],
        "producer": "rank8_delta03_e5_five_cubic_t_long_outer_leaf_all_order_exact_agent_20260824.json",
        "audit": "rank8_delta03_e5_five_cubic_t_long_outer_leaf_all_order_independent_audit_agent_20260824.json",
        "theorem": "rank8_delta03_e5_five_cubic_t_long_outer_leaf_n27_plus_exact_agent_20260824.json",
    },
    {
        "orbits": ["five_cubic_t:long_outer_pendant_internal"],
        "producer": "rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_all_order_exact_agent_20260824.json",
        "audit": "rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_all_order_independent_audit_agent_20260824.json",
        "theorem": "rank8_delta03_e5_five_cubic_t_long_outer_pendant_internal_n27_plus_exact_agent_20260824.json",
    },
    {
        "orbits": ["five_cubic_t:middle_leaf"],
        "producer": "rank8_delta03_e5_five_cubic_t_middle_leaf_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_five_cubic_t_middle_leaf_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_five_cubic_t_middle_leaf_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["five_cubic_t:middle_long_outer_spine_internal"],
        "producer": "rank8_delta03_e5_five_cubic_t_middle_long_outer_spine_internal_all_order_exact_agent_20260824.json",
        "audit": "rank8_delta03_e5_five_cubic_t_middle_long_outer_spine_internal_all_order_independent_audit_agent_20260824.json",
        "theorem": "rank8_delta03_e5_five_cubic_t_middle_long_outer_spine_internal_n27_plus_exact_agent_20260824.json",
    },
    {
        "orbits": ["five_cubic_t:middle_pendant_internal"],
        "producer": "rank8_delta03_e5_five_cubic_t_middle_pendant_internal_all_order_exact_agent_20260824.json",
        "audit": "rank8_delta03_e5_five_cubic_t_middle_pendant_internal_all_order_independent_audit_agent_20260824.json",
        "theorem": "rank8_delta03_e5_five_cubic_t_middle_pendant_internal_n27_plus_exact_agent_20260824.json",
    },
    {
        "orbits": ["five_cubic_t:short_outer_branch"],
        "producer": "rank8_delta03_e5_five_cubic_t_short_outer_branch_all_order_exact_agent_20260823.json",
        "audit": "rank8_delta03_e5_five_cubic_t_short_outer_branch_all_order_independent_audit_agent_20260823.json",
        "theorem": "rank8_delta03_e5_five_cubic_t_short_outer_branch_n27_plus_exact_agent_20260823.json",
    },
    {
        "orbits": ["five_cubic_t:short_outer_leaf"],
        "producer": "rank8_delta03_e5_five_cubic_t_short_outer_leaf_all_order_exact_agent_20260824.json",
        "audit": "rank8_delta03_e5_five_cubic_t_short_outer_leaf_all_order_independent_audit_agent_20260824.json",
        "theorem": "rank8_delta03_e5_five_cubic_t_short_outer_leaf_n27_plus_exact_agent_20260824.json",
    },
    {
        "orbits": ["five_cubic_t:short_outer_pendant_internal"],
        "producer": "rank8_delta03_e5_five_cubic_t_short_outer_pendant_internal_all_order_exact_agent_20260824.json",
        "audit": "rank8_delta03_e5_five_cubic_t_short_outer_pendant_internal_all_order_independent_audit_agent_20260824.json",
        "theorem": "rank8_delta03_e5_five_cubic_t_short_outer_pendant_internal_n27_plus_exact_agent_20260824.json",
    },
]


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest().upper()


def stable_bytes(path: Path) -> bytes:
    before = path.stat()
    data = path.read_bytes()
    after = path.stat()
    assert before.st_size == after.st_size == len(data), f"moving size: {path.name}"
    assert before.st_mtime_ns == after.st_mtime_ns, f"moving mtime: {path.name}"
    return data


def load_json(path: Path) -> tuple[dict, str]:
    data = stable_bytes(path)
    return json.loads(data.decode("utf-8")), sha256_bytes(data)


def digest(path: Path) -> str:
    return sha256_bytes(stable_bytes(path))


def main() -> int:
    evidence_hashes: dict[str, str] = {}
    docs: dict[str, dict] = {}
    for name, (expected_hash, expected_status) in REQUIRED.items():
        path = ROOT / name
        data = stable_bytes(path)
        actual = sha256_bytes(data)
        assert actual == expected_hash, (name, expected_hash, actual)
        evidence_hashes[name] = actual
        if path.suffix == ".json":
            doc = json.loads(data.decode("utf-8"))
            docs[name] = doc
            if expected_status is not None:
                assert doc["status"] == expected_status, (name, doc.get("status"))

    # Entire exceptional-only first-crossing lane: the old alpha-7 band plus
    # the newly sealed exact alpha-8/9 design.  These are disjoint terminal-alpha
    # bands, so their cell counts add.
    alpha7 = docs["rank8_exceptional_first_crossing_alpha7_sources7_13_complete_exact_20260820.json"]
    design = docs["rank8_exceptional_first_crossing_alpha8_alpha9_streaming_design_agent_20260823.json"]
    closure = docs["rank8_exceptional_first_crossing_all_2159_complete_closure_audit_agent_20260823.json"]
    alpha7_cells = int(alpha7["coverage"]["source_terminal_cells"])
    remaining_design_cells = int(design["aggregate"]["remaining_source_type_cells"])
    assert alpha7_cells == 4900
    assert remaining_design_cells == 2159
    assert closure["coverage"] == {
        "design_shards_replayed": 435,
        "gaps": 0,
        "overlaps": 0,
        "package_count": 13,
        "source_type_cells": 2159,
        "terminal_alpha8_cells": 2024,
        "terminal_alpha8_source_range": [6, 13],
        "terminal_alpha8_type_indices": [948, 1200],
        "terminal_alpha9_cells": 135,
        "terminal_alpha9_source_range": [5, 13],
        "terminal_alpha9_type_indices": [1201, 1215],
    }
    replay = closure["independent_aggregate_replay"]
    assert replay["negative_Q8"] == replay["zero_Q8"] == 0
    assert replay["raw_multisets"] == 214127795
    first_crossing_total = alpha7_cells + remaining_design_cells
    assert first_crossing_total == 7059

    # The low/low 521-position a23 bridge is a geometric partition.  The mixed
    # registry below is a separate, nested certificate index and must not be
    # added to these position counts.
    interior = docs["rank8_low_low_a23_redistribution_interior_complete_exact_root_20260823.json"]
    assert interior["universe"] == {
        "outer_expansion_units": 89,
        "cached_prefix_units": 85,
        "streamed_tail_units": 4,
        "both_positive_units": 72,
        "axis_units": 17,
        "retained_positions": 377,
        "separate_mixed_face_positions": 144,
        "original_position_universe": 521,
    }
    assert interior["universe"]["retained_positions"] + interior["universe"]["separate_mixed_face_positions"] == 521

    registry_name = "rank8_low_low_a23_mixed_cross_outer_registry_agent_20260823.json"
    registry_audit_name = "rank8_low_low_a23_mixed_cross_outer_registry_independent_audit_agent_20260823.json"
    registry, registry_hash = load_json(ROOT / registry_name)
    registry_audit, registry_audit_hash = load_json(ROOT / registry_audit_name)
    evidence_hashes[registry_name] = registry_hash
    evidence_hashes[registry_audit_name] = registry_audit_hash
    assert registry_audit["status"] == "PASS_INDEPENDENT_HASH_PINNED_REGISTRY_EXACT_124_CELL_DOMAIN_AND_EVIDENCE_REPLAY"
    assert registry_audit["registry_sha256"] == registry_hash
    assert registry["required_cell_count"] == registry_audit["required_cell_count"] == 124
    states = {
        "SEALED_AND_INDEPENDENTLY_AUDITED": 0,
        "PRODUCER_SEALED_AUDIT_MISSING": 0,
        "MISSING_PRODUCER_AND_AUDIT": 0,
    }
    cell_keys = set()
    for cell in registry["cells"]:
        key = (cell["face_token"], cell["auxiliary"], int(cell["total_ordinary_slack_degree"]))
        assert key not in cell_keys
        cell_keys.add(key)
        states[cell["state"]] += 1
    expected_cells = {
        (face, auxiliary, grade)
        for face in ("01", "10")
        for grade in range(2, 18)
        for auxiliary in (
            ("curvature_middle_times_4", "curvature_far", "strong_middle_times_4", "strong_far")
            if grade <= 16
            else ("strong_middle_times_4", "strong_far")
        )
    }
    assert cell_keys == expected_cells and len(cell_keys) == 124
    assert states == {
        "SEALED_AND_INDEPENDENTLY_AUDITED": int(registry["sealed_and_independently_audited"]),
        "PRODUCER_SEALED_AUDIT_MISSING": int(registry["producer_sealed_audit_missing"]),
        "MISSING_PRODUCER_AND_AUDIT": int(registry["missing_producer_and_audit"]),
    }
    assert sum(states.values()) == 124
    assert registry_audit["sealed_and_independently_audited"] == states["SEALED_AND_INDEPENDENTLY_AUDITED"]
    assert registry_audit["producer_sealed_audit_missing"] == states["PRODUCER_SEALED_AUDIT_MISSING"]
    assert registry_audit["missing_producer_and_audit"] == states["MISSING_PRODUCER_AND_AUDIT"]

    # Exact connected partition.  The all-root census closes order 27 without
    # any degree-surplus split.  For n>=28, the recursively audited master
    # package seals every e=2 root and Delta0..3, while e=0,1,3 are already
    # complete.  The e=5 skeleton package below is nested corroboration of the
    # all-root n=27 theorem and contributes no additional coverage.
    e2_complete = docs["rank8_delta03_e2_complete_all_ranks_all_roots_exact_root_20260823.json"]
    e2_complete_audit = docs["rank8_delta03_e2_complete_all_ranks_all_roots_independent_audit_root_20260823.json"]
    assert e2_complete["rank_partition"] == {
        "Delta0_Delta1": "rank8_delta01_e2_complete_independent_audit_agent_20260823.json",
        "Delta2": "rank8_delta2_e2_complete_all_root_types_independent_audit_root_20260823.json",
        "Delta3": "rank8_delta3_e2_complete_independent_audit_root_20260823.json",
    }
    assert e2_complete_audit["rank_coverage"] == [0, 1, 2, 3]
    assert e2_complete_audit["reachable_files_rehashed"] == 931
    assert e2_complete_audit["immutable_input_hashes"][
        "rank8_delta03_e2_complete_all_ranks_all_roots_exact_root_20260823.json"
    ] == evidence_hashes["rank8_delta03_e2_complete_all_ranks_all_roots_exact_root_20260823.json"]

    n27_name = "rank8_terminal_delta03_finite_n27_wrom_threaded_exact_root_20260823.json"
    n27_audit_name = (
        "rank8_terminal_delta03_finite_n27_wrom_threaded_independent_audit_root_20260823.json"
    )
    n27 = docs[n27_name]
    n27_audit = docs[n27_audit_name]
    expected_n27_scope = {
        "core_order": 27,
        "free_trees": 751065460,
        "all_rooted_pairs": 20278767420,
        "ranks": [0, 1, 2, 3],
        "claim": "finite exact order-27 census only",
    }
    assert n27["scope"] == n27_audit["scope"] == expected_n27_scope
    assert n27["acceptance"]["active_rooted_pairs"] == 20278767420
    assert n27["acceptance"]["negative_counts"] == [0, 0, 0, 0]
    assert all(value > 0 for value in n27["acceptance"]["global_minima"])
    ranges = n27["threaded_coverage"]["worker_ranges"]
    assert len(ranges) == n27["threaded_coverage"]["threads"] == 6
    assert ranges[0]["start"] == 0 and ranges[-1]["stop"] == 751065460
    assert all(left["stop"] == right["start"] for left, right in zip(ranges, ranges[1:]))
    assert sum(row["processed"] for row in ranges) == 751065460
    assert sum(row["roots"] for row in ranges) == 20278767420
    assert sum(row["active"] for row in ranges) == 20278767420
    assert n27["threaded_coverage"]["adjacent_no_gap_no_overlap"] is True
    assert n27_audit["primary_report"] == n27_name
    assert n27_audit["primary_report_sha256"] == evidence_hashes[n27_name]
    assert n27_audit["threaded_no_gap_coverage"]["adjacent_no_gap_no_overlap"] is True
    assert n27_audit["threaded_no_gap_coverage"]["trees"] == 751065460
    assert n27_audit["threaded_no_gap_coverage"]["roots"] == 20278767420
    assert n27_audit["audit_source_sha256"] == evidence_hashes[
        "audit_rank8_terminal_delta03_finite_n27_wrom_threaded_root.py"
    ]
    assert n27_audit["literal_witness_replay"]["path_endpoint"][
        "matches_every_global_minimum"
    ] is True
    assert n27_audit["i128_safety"]["delta3_bound_bits"] == 95
    assert n27_audit["i128_safety"]["integer_margin_floor"] >= 5043832458
    for immutable in (n27["immutable_inputs"], n27_audit["immutable_inputs"]):
        for name, expected in immutable.items():
            actual = digest(ROOT / name)
            assert actual == expected, (name, expected, actual)
            evidence_hashes[name] = actual
    n27_runner_name = "run_rank8_terminal_delta03_finite_wrom_threaded_n27_root.py"
    assert n27["source_sha256"] == digest(ROOT / n27_runner_name)
    evidence_hashes[n27_runner_name] = n27["source_sha256"]

    e5_finite = docs["rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_exact_agent_20260823.json"]
    e5_finite_audit = docs["rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_independent_audit_agent_20260823.json"]
    assert e5_finite["exact_scope"] == {
        "order": 27,
        "degree_surplus": 5,
        "suppressed_skeleton": "quartic_center_two_cubic",
        "suppressed_vertex_count": 9,
        "suppressed_edge_count": 8,
        "Delta_indices": [0, 1, 2, 3],
    }
    assert e5_finite["root_location_partition"]["root_orbits_total"] == 7
    assert e5_finite["root_location_partition"]["gaps"] == 0
    assert e5_finite["root_location_partition"]["overlaps"] == 0
    assert e5_finite["totals"]["canonical_rooted_isomorphism_classes"] == 1176604
    assert e5_finite["totals"]["nonpositive_Delta0_3"] == [0, 0, 0, 0]
    assert e5_finite_audit["independent_global_rooted_burnside_count"] == 1176604
    assert e5_finite_audit["primary_sha256"] == evidence_hashes[
        "rank8_delta03_e5_quartic_center_two_cubic_order27_all_roots_exact_agent_20260823.json"
    ]

    e4_partition = docs["rank8_delta03_e4_skeleton_root_partition_exact_agent_20260823.json"]
    e4_orbits = {
        row["root_location_orbit"] for row in e4_partition["root_location_partitions"]
    }
    assert e4_partition["totals"]["root_location_orbits"] == len(e4_orbits) == 20
    assert {row["skeleton"] for row in e4_partition["skeletons"]} == {
        "four_cubic_star", "four_cubic_path", "quartic_cubic_bistar"
    }

    e4_credited: set[str] = set()
    e4_producer_only: set[str] = set()
    e4_group_evidence: list[dict] = []
    for group in E4_GROUPS:
        producer_path = ROOT / group["producer"]
        audit_path = ROOT / group["audit"]
        producer_exists = producer_path.exists()
        audit_exists = audit_path.exists()
        entry = {"orbits": group["orbits"], "producer": group["producer"], "audit": group["audit"]}
        if producer_exists:
            producer, producer_hash = load_json(producer_path)
            assert producer["status"].startswith("PASS_EXACT_RANK8_DELTA03_E4_")
            evidence_hashes[producer_path.name] = producer_hash
            entry["producer_sha256"] = producer_hash
        if audit_exists:
            assert producer_exists, f"audit without producer: {audit_path.name}"
            audit, audit_hash = load_json(audit_path)
            assert audit["status"].startswith("PASS_INDEPENDENT_RANK8_DELTA03_E4_")
            assert audit["immutable_input_hashes"][producer_path.name] == evidence_hashes[producer_path.name]
            evidence_hashes[audit_path.name] = audit_hash
            entry["audit_sha256"] = audit_hash
            entry["state"] = "SEALED_AND_INDEPENDENTLY_AUDITED"
            e4_credited.update(group["orbits"])
        elif producer_exists:
            entry["state"] = "PRODUCER_ONLY_UNCREDITED"
            e4_producer_only.update(group["orbits"])
        else:
            entry["state"] = "MISSING_PRODUCER_AND_AUDIT"
        e4_group_evidence.append(entry)
    assert e4_credited.isdisjoint(e4_producer_only)
    assert (e4_credited | e4_producer_only).issubset(e4_orbits)
    e4_open = e4_orbits - e4_credited
    assert len(e4_credited) + len(e4_open) == 20

    e5_partition = docs["rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json"]
    e5_partition_audit = docs[
        "rank8_delta03_e5_skeleton_root_partition_independent_audit_agent_20260823.json"
    ]
    e5_orbits = {
        row["root_location_orbit"] for row in e5_partition["root_location_partitions"]
    }
    assert e5_partition["totals"]["suppressed_skeletons"] == 4
    assert e5_partition["totals"]["root_location_orbits"] == len(e5_orbits) == 42
    assert e5_partition["totals"]["vertex_root_orbits"] == 23
    assert e5_partition["totals"]["edge_interior_root_orbits"] == 19
    assert e5_partition_audit["root_rows_replayed"] == 42
    assert e5_partition_audit["primary_report_sha256"] == evidence_hashes[
        "rank8_delta03_e5_skeleton_root_partition_exact_agent_20260823.json"
    ]

    e5_credited: set[str] = set()
    e5_incomplete: set[str] = set()
    e5_group_evidence: list[dict] = []
    for group in E5_GROUPS:
        producer_path = ROOT / group["producer"]
        audit_path = ROOT / group["audit"]
        theorem_path = ROOT / group["theorem"]
        producer_exists = producer_path.exists()
        audit_exists = audit_path.exists()
        theorem_exists = theorem_path.exists()
        entry = {
            "orbits": group["orbits"],
            "producer": group["producer"],
            "audit": group["audit"],
            "theorem": group["theorem"],
        }
        if producer_exists:
            producer, producer_hash = load_json(producer_path)
            assert producer["status"].startswith("PASS_EXACT_RANK8_DELTA03_E5_")
            evidence_hashes[producer_path.name] = producer_hash
            entry["producer_sha256"] = producer_hash
        if audit_exists:
            assert producer_exists, f"e5 audit without producer: {audit_path.name}"
            audit, audit_hash = load_json(audit_path)
            assert audit["status"].startswith("PASS_INDEPENDENT_RANK8_DELTA03_E5_")
            assert audit["immutable_input_hashes"][producer_path.name] == producer_hash
            evidence_hashes[audit_path.name] = audit_hash
            entry["audit_sha256"] = audit_hash
        if theorem_exists:
            assert producer_exists and audit_exists, f"e5 theorem without both engines: {theorem_path.name}"
            theorem, theorem_hash = load_json(theorem_path)
            assert theorem["status"].startswith("PASS_EXACT_AND_INDEPENDENT_RANK8_DELTA03_E5_")
            assert theorem["root_orbit"] in group["orbits"]
            for name, expected in theorem["immutable_input_hashes"].items():
                actual = digest(ROOT / name)
                assert actual == expected, (name, expected, actual)
                evidence_hashes[name] = actual
            evidence_hashes[theorem_path.name] = theorem_hash
            entry["theorem_sha256"] = theorem_hash
            entry["state"] = "SEALED_AND_INDEPENDENTLY_AUDITED_ALL_ORDERS_N27_PLUS"
            e5_credited.update(group["orbits"])
        elif producer_exists or audit_exists:
            entry["state"] = "INCOMPLETE_UNCREDITED"
            e5_incomplete.update(group["orbits"])
        else:
            entry["state"] = "MISSING_PRODUCER_AUDIT_AND_THEOREM"
        e5_group_evidence.append(entry)
    assert e5_credited.isdisjoint(e5_incomplete)
    assert (e5_credited | e5_incomplete).issubset(e5_orbits)
    e5_open = e5_orbits - e5_credited
    assert len(e5_credited) + len(e5_open) == 42

    payload = {
        "schema": "rank8-forest-q8-pgc-master-integration-ledger-agent-v1",
        "status": "PENDING_EXACT_FOREST_Q8_AND_RANK8_PGC_AFTER_COMPLETE_FIRST_CROSSING_E2_AND_ALL_ROOT_N27",
        "strongest_new_exact_claim": {
            "exceptional_first_crossing_lane": "COMPLETE",
            "terminal_alpha7_source_type_cells": alpha7_cells,
            "terminal_alpha8_9_source_type_cells": remaining_design_cells,
            "total_disjoint_source_type_cells": first_crossing_total,
            "terminal_alpha_bands": [7, 8, 9],
            "remaining_first_crossing_cells": 0,
            "alpha8_9_raw_multisets": replay["raw_multisets"],
            "alpha8_9_negative_Q8": replay["negative_Q8"],
            "alpha8_9_zero_Q8": replay["zero_Q8"],
            "alpha8_9_minimum_Q8": replay["minimum_Q8"],
            "alpha8_9_maximum_Q8": replay["maximum_Q8"],
            "connected_order27_all_root_layer": "COMPLETE_751065460_FREE_TREES_20278767420_ROOTED_PAIRS",
        },
        "forest_Q8_master_partition": {
            "closed_inputs": {
                "rank7_lower_all_forest_gaps_including_Q7": "COMPLETE",
                "full_full_high_high": "COMPLETE",
                "full_full_low_high": "COMPLETE",
                "fixed_exceptional_full_all_1215_jets_both_cones": "COMPLETE",
                "exceptional_first_crossing_terminal_alpha7_8_9": "COMPLETE_7059_CELLS",
            },
            "open_disjoint_theorem_lanes": [
                {
                    "lane": "full_full_low_low",
                    "scope": "the low/low member of the exhaustive high/high, low/high, low/low full/full trichotomy",
                    "open_geometric_cases": 144,
                },
                {
                    "lane": "connected_Q8",
                    "scope": "Delta0..3 terminal residuals on the exact remaining rooted cores",
                    "open_subpartition": [
                        "e=4 at n>=28 on uncredited root orbits",
                        "e=5 at n>=28 on uncredited root orbits",
                        "e>=6 at n>=28",
                    ],
                },
            ],
            "forest_Q8_complete": False,
        },
        "low_low_exact_state": {
            "completed_endpoint_faces": ["a3=b3=0 suffix4/5", "a2=b2=0 suffix3/gap0"],
            "a23_geometric_position_partition": {
                "total": 521,
                "sealed_complement": 377,
                "open_mixed_positions": 144,
                "gaps": 0,
                "overlaps": 0,
            },
            "nested_mixed_cross_certificate_registry": {
                "required_row_grade_cells": 124,
                "sealed_and_independently_audited": states["SEALED_AND_INDEPENDENTLY_AUDITED"],
                "producer_sealed_audit_missing": states["PRODUCER_SEALED_AUDIT_MISSING"],
                "missing_producer_and_audit": states["MISSING_PRODUCER_AND_AUDIT"],
                "faces": {"01": [0, 2], "10": [2, 0]},
                "ordinary_slack_grades": [2, 17],
                "index_relation": "nested evidence for the 144 mixed positions; do not add 124 to 521 or 144",
            },
            "post_registry_gates_not_yet_credited": [
                "cross-only fail-closed assembler",
                "Z/EA/EB/X support-coverage assembler",
                "full a23 bridge theorem insertion",
            ],
            "low_low_complete": False,
        },
        "connected_Q8_exact_state": {
            "closed_base": {
                "all_rooted_cores_orders_at_most_27_Delta0_3": "COMPLETE_INCLUDING_EXACT_ALL_ROOT_N27_CENSUS",
                "finite_all_root_order27": "COMPLETE_751065460_FREE_TREES_20278767420_ROOTED_PAIRS",
                "Delta4_through_Delta15_all_orders": "COMPLETE",
                "degree_surplus_e0_and_e1_Delta0_3_n27_plus": "COMPLETE",
                "degree_surplus_e2_Delta0_3_all_roots_n23_plus": "COMPLETE_RECURSIVELY_AUDITED_931_FILES",
                "degree_surplus_e3_Delta0_3_n27_plus": "COMPLETE",
            },
            "nested_order27_corroboration_not_additive": {
                "degree_surplus_e4_all_roots_order27": "SUBSUMED_BY_ALL_ROOT_N27_THEOREM",
                "degree_surplus_e5_quartic_center_two_cubic_all_roots_order27": (
                    "SUBSUMED_7_ROOT_ORBITS_1176604_ROOTED_CLASSES"
                ),
            },
            "open_no_overlap_partition_for_n28_plus": [
                {
                    "case": "degree_surplus_e4_Delta0_3",
                    "orders": "n>=28 only for uncredited root-location orbits",
                    "root_location_orbits_total": 20,
                    "all_order_sealed_and_audited_orbits": sorted(e4_credited),
                    "all_order_sealed_and_audited_count": len(e4_credited),
                    "producer_only_uncredited_orbits": sorted(e4_producer_only),
                    "open_orbits": sorted(e4_open),
                    "open_orbit_count": len(e4_open),
                    "group_evidence": e4_group_evidence,
                },
                {
                    "case": "degree_surplus_e5_Delta0_3",
                    "orders": "n>=28",
                    "root_location_orbits_total": 42,
                    "all_order_sealed_and_audited_orbits": sorted(e5_credited),
                    "all_order_sealed_and_audited_count": len(e5_credited),
                    "incomplete_uncredited_orbits": sorted(e5_incomplete),
                    "open_orbits": sorted(e5_open),
                    "open_orbit_count": len(e5_open),
                    "group_evidence": e5_group_evidence,
                    "status": "OPEN_E5_AFTER_PARTIAL_ALL_ORDER_CLOSURE",
                },
                {
                    "case": "degree_surplus_e_at_least_6_Delta0_3",
                    "orders": "n>=28",
                    "remaining_scope": "every e>=6 rooted core at every order n>=28",
                    "status": "OPEN_ALL_E_AT_LEAST_6_N28_PLUS",
                },
            ],
            "partition_exhaustivity": "Partition first by order: all rooted cores through n=27 are closed. For n>=28, degree surplus is exactly one of 0,1,2,3,4,5,>=6; e=0,1,2,3 are closed, leaving only uncredited e=4 and e=5 root-orbit families and all e>=6 rooted cores.",
            "connected_Q8_complete": False,
        },
        "rank8_PGC_dependency": {
            "rank7_PGC_prefix": "COMPLETE",
            "coupled_boundary_alpha_G_13_14": "COMPLETE",
            "V8_all_forests_alpha_at_least_14": "COMPLETE",
            "separated_identity": "H8(P)-H7(B)=4*Q8(P)/p7+12*c7+V8(B)/(2*b6)",
            "conditional_alpha_G_at_least_15": "closes after forest Q8(alpha>=14) closes",
            "independent_unbounded_PGC_gap_beyond_forest_Q8": "NONE_IDENTIFIED_IN_THE_PINNED_REDUCTION",
            "rank8_PGC_complete": False,
        },
        "no_double_counting_rules": [
            "full/full, fixed/full, and exceptional-first-crossing are disjoint forest-lift lanes",
            "high/high, low/high, and low/low are the disjoint exhaustive full/full cone trichotomy",
            "377+144=521 is the low/low geometric partition; the 124 row-grade registry is nested evidence, not another position set",
            "connected cases are partitioned first by order, then degree surplus, then residual rank and rooted skeleton orbit",
            "the all-root order-27 census is credited once before any degree-surplus split; e4 and e5 order-27 packages are nested corroboration only",
            "rank8 PGC is downstream conditional composition and contributes no additional forest-Q8 cases",
        ],
        "proof_booleans": {
            "exceptional_first_crossing_complete": True,
            "low_low_complete": False,
            "connected_Q8_complete": False,
            "forest_Q8_complete": False,
            "rank8_PGC_complete": False,
            "problem_993_solved": False,
        },
        "evidence_hashes": dict(sorted(evidence_hashes.items())),
        "source_sha256": digest(Path(__file__)),
        "scope_warning": "This ledger seals the complete exceptional-first-crossing lane, the complete e=2 connected lane, all rooted order-27 Delta0..3 cases, and the explicitly listed all-order e=4/e=5 root orbits. It inventories but does not prove the remaining low/low, connected n>=28 Q8, forest Q8, rank-eight PGC, or Erdos Problem 993 gaps.",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(payload["status"])
    print(
        f"first_crossing=7059/7059 low_low_positions_open=144 "
        f"mixed_registry={states['SEALED_AND_INDEPENDENTLY_AUDITED']}/124 "
        f"e2=complete n27_all_roots=complete e4_all_order_open={len(e4_open)}/20 "
        f"e5_all_order_open={len(e5_open)}/42"
    )
    print(f"report_sha256={digest(OUTPUT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
