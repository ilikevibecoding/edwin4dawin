#!/usr/bin/env node
// Crop a region out of a shot and upscale it with nearest-neighbour so the
// near-field grain can be judged at the size it will be seen on a real screen.
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';

const args = process.argv.slice( 2 );
const opt = {};
for ( let i = 0; i < args.length; i += 2 ) opt[ args[ i ].replace( /^--/, '' ) ] = args[ i + 1 ];

const src = opt.in;
const out = opt.out;
const crop = opt.crop || '256:144:256:144';
const scale = Number( opt.scale || 4 );

if ( ! src || ! out ) {
  console.error( 'usage: gndcrop.mjs --in a.png --out b.png [--crop w:h:x:y] [--scale 4]' );
  process.exit( 1 );
}

const [ w, h, x, y ] = crop.split( ':' ).map( Number );
execFileSync( 'ffmpeg', [
  '-y', '-loglevel', 'error', '-i', src,
  '-vf', `crop=${ w }:${ h }:${ x }:${ y },scale=${ w * scale }:${ h * scale }:flags=neighbor`,
  out,
] );
console.log( `[gndcrop] ${ basename( src ) } ${ crop } x${ scale } -> ${ out }` );
