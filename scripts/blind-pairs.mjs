#!/usr/bin/env node
/**
 * Builds anonymized A/B pairs (ours vs reference) for blind judging.
 * Both images are cover-cropped to identical 1600x900 JPEGs so format/size
 * tells nothing. Assignment manifest goes OUTSIDE the judged folder.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const PAIRS = [
  ['review/round3/crossroads_hud_0_nobots_1.png', 'review/refs/cod5_mwiii_daylight_urban_street_fp.jpg', 'urban street vista'],
  ['review/round3/market_hud_0_nobots_1.png', 'review/refs/cod1_mw19_daylight_urban_fp_rifle.jpg', 'street with rifle'],
  ['review/round3/street_fx_firing_t_2_fxt_0.04.png', 'review/refs/cod8_mwiii_daylight_soldiers_combat.jpg', 'combat moment'],
  ['review/round3/ads_hud_0_nobots_1.png', 'review/refs/cod2_mw19_ads_optic.jpg', 'aiming down sights'],
  ['review/round3/street_fx_explosion_t_2_fxt_0.5_hud_0_nobots_1.png', 'review/refs/cod3_mw19_fp_explosion_night.jpg', 'explosion'],
  ['review/round3/overview_hud_0_nobots_1.png', 'review/refs/cod4_wz_verdansk_downtown_vista.jpg', 'city vista'],
  ['review/round3/spawn_hud_0_enemyat_142_enemystate_combat_t_1.93.png', 'review/refs/cod6_mw19_viewmodel_daylight.jpg', 'soldier in street'],
  ['review/round3/crossroads_fx_airstrike_t_5_fxt_4.2_hud_0_nobots_1.png', 'review/refs/cod7_wz_building_rooftop_detail.jpg', 'destruction scene'],
];

await rm('review/blind', { recursive: true, force: true });
const manifest = [];
for (let i = 0; i < PAIRS.length; i++) {
  const [ours, ref, label] = PAIRS[i];
  const dir = `review/blind/pair${i + 1}`;
  await mkdir(dir, { recursive: true });
  const oursIsA = Math.random() < 0.5;
  const enc = (src, dest) => sharp(src).resize(1600, 900, { fit: 'cover' }).jpeg({ quality: 86 }).toFile(dest);
  await enc(oursIsA ? ours : ref, `${dir}/A.jpg`);
  await enc(oursIsA ? ref : ours, `${dir}/B.jpg`);
  manifest.push({ pair: i + 1, label, ours: oursIsA ? 'A' : 'B' });
}
await writeFile('/tmp/blind-manifest.json', JSON.stringify(manifest, null, 2));
console.log('pairs built:', manifest.length, '(manifest hidden at /tmp/blind-manifest.json)');
