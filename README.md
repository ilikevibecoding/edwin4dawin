# Cloudbreak Royale — playable build

This branch holds only the production build of the game (`npm run build` output from the
`cursor/battle-royale-game-c7e6` source branch) so it can be served straight from a CDN.
Do not merge it into `main`.

Play it via githack (commit-pinned, permanent):

    https://rawcdn.githack.com/ilikevibecoding/edwin4dawin/<commit-sha-of-this-branch>/index.html

On the first visit githack shows a one-click "Open the page" notice, then the game loads.
(jsDelivr and Statically serve HTML as text/plain, so they cannot host the page.)

To update: `npm run build` on the source branch, copy `dist/*` here, commit and push.
