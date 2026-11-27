# First Run

An ASCII race loops in the landing-page background. Three.js renders four animated runners on one track using captured running strides. Canvas draws their silhouettes in ASCII, and GSAP plays the four camera angles in sequence. Vite builds the static site from `index.html`, `src/styles.css`, and the animation modules in `src/race/`.

## Local development

Use Node.js 22.12 or later.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

The dev server runs at `http://127.0.0.1:4324`. Vite builds `dist/index.html` and the bundled assets in `dist/`. The preview command serves that production build locally.

## Deploying on Vercel

Import the GitHub repository with its root directory selected. `vercel.json` sets the Vite preset, runs `npm run build`, and serves `dist/`. The project serves the landing page at `/`.

## Branding and media

- `brand/first-run-track-square-mark.png` is the 1024 × 1024 transparent logo master.
- `public/mark.svg` is the simplified favicon.
- `public/images/track-background.webp` is the still behind the animated race.
- `src/race/track-rubber.jpg` is the supplied rubber texture, mapped to the track and tinted to the original brand red.
- `src/race/strides.js` contains distance-sampled loops from the run/jog trials 35_17, 35_19, and 35_22. Motion data comes from the [Carnegie Mellon Graphics Lab Motion Capture Database](https://mocap.cs.cmu.edu/), created with NSF funding EIA-0196217.
- `public/fonts/` contains self-hosted Barlow Condensed and Work Sans fonts and their license files.

The race advances to the next camera angle every four seconds. Pause the animation to hold the current frame. The page starts paused when reduced motion is enabled.

The palette uses track red `#842313` and cream `#F5EFE4`. The contact link currently uses the provisional address `hello@firstrun.agency`. Update the link in `index.html` when the address is confirmed.
