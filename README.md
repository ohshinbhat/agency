# First Run

An ASCII race loops in the landing-page background. Three.js renders four animated runners on one track, using captured running strides, and a canvas draws their silhouettes in ASCII over the textured track. GSAP plays the four camera angles in sequence. The landing page and styles are in `index.html`, and the race is in `public/race/`.

```sh
npm ci
npm run dev
npm run build
```

The local server runs at http://127.0.0.1:4324. The build copies the landing page, public assets, and local Three.js and GSAP files into `dist/` for static hosting.

## Branding and media

- `brand/first-run-track-square-mark.png` is the 1024 × 1024 transparent logo master.
- `public/mark.svg` is the simplified favicon.
- `public/images/track-background.webp` is the still behind the animated race.
- `public/race/track-rubber.jpg` is the supplied rubber texture, mapped to the track and tinted to the original brand red.
- `public/race/strides.js` contains distance-sampled loops from the run/jog trials 35_17, 35_19, and 35_22. Motion data comes from the [Carnegie Mellon Graphics Lab Motion Capture Database](https://mocap.cs.cmu.edu/), created with NSF funding EIA-0196217.
- `public/fonts/` contains self-hosted Barlow Condensed and Work Sans fonts and their license files.

The race advances to the next camera angle every four seconds. Pause the animation to hold the current frame. The page starts paused when reduced motion is enabled.

The palette uses track red `#842313` and cream `#F5EFE4`. The contact link currently uses the provisional address `hello@firstrun.agency`. Update the link in `index.html` when the address is confirmed.
