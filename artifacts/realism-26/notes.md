# Realism pass 26 — outline-free rendering

- Edge treatment cut from a drawn line to an occlusion tint: `edgeFor` blends
  only 34% toward shadow (was 58%) and stroke width dropped to 0.6x, so the
  silhouette reads as shading where a form turns away from light — the way
  rendered 3D assets separate — not as ink.
- Remaining deliberate detail strokes (`PAL.out`) lightened from near-black
  to a softer dark violet so poles, fences and door frames stop reading as
  cartoon linework; text strokes stay readable.

Verified in the crop: towers, banners and troops read as soft rendered
geometry; team colors keep silhouettes legible against the turf.
