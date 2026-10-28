# Media slots

Drop a file here with the exact name below and the site uses it in place of the
drawn placeholder. No code change is needed. While `npm run dev` is running, run
`npm run media` after adding files, then refresh the page.

- An image and a video with the **same name** pair up: the image is the video's poster.
- Products, the hero film, the rose and the seal are shot on **pure white (#FFFFFF)**.
  The site blends white into the page, so they sit on the parchment with no box around them.
- Videos are muted, loop, and play only on screen. Visitors on data saver or reduced
  motion see the poster image instead, so every video needs its image.

| File | What | Size |
|---|---|---|
| hero/product.mp4 + hero/product.webp | Hero film: scroll, locket, rose | 1080x1080, 4–6 s loop, ≤ 3 MB |
| hero/rose.webp | Rose on its own (only if the film has no rose) | 800x1200 |
| hero/customer.webp (+ .mp4) | A real customer receiving a gift (with consent) | 800x1000, 3–5 s |
| seal/stamp.webp | Blank wax seal, no text (the site writes "Shop now") | 1000x1000 |
| products/<slug>.webp | One per product, slug as in src/lib/catalog.ts | 1200x1500 |
| gallery/m01.webp … m09 (+ .mp4) | Real customer photos and clips (with consent) | 1080x1350 |
| brands/<name>.svg | Client logos, single colour, with permission | SVG |

Compress a video before dropping it in (makes .mp4 and .webm):

    ffmpeg -i in.mp4 -an -vf scale=1080:-2 -c:v libx264 -crf 26 -preset veryfast -pix_fmt yuv420p -movflags +faststart out.mp4
    ffmpeg -i in.mp4 -an -vf scale=1080:-2 -c:v libvpx-vp9 -crf 36 -b:v 0 out.webm
