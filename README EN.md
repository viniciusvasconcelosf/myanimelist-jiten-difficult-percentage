# MAL Jiten Difficulty Percent

A Tampermonkey userscript that overlays **color-coded Jiten difficulty percentages** on anime covers across MyAnimeList.

Works on detail pages, lists, Top Anime, Seasonal, Search results, and most other pages that show anime covers.

## Features

- Shows difficulty as a percentage badge (derived from Jiten’s difficulty score)
- Color-coded by difficulty:
  - **Blue** < 40%
  - **Green** 40–59%
  - **Lime/Yellow** 60–74%
  - **Orange** 75–84%
  - **Red** 85–94%
  - **Purple** ≥ 95%
- Badge size adapts to the cover size (tiny → xlarge)
- Hover tooltip shows difficulty %, estimated speech time, and word count
- Clicking the badge opens the corresponding Jiten media deck
- Results are cached for 7 days (localStorage) to reduce API calls
- Handles both full page loads and dynamic content / SPA-style navigation on MAL

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Firefox, Edge, Safari, etc.)
2. Create a new userscript and paste the contents of `mal-jiten-difficulty.user.js`
   (or install directly from the raw file if hosted on GitHub/Gist)
3. Make sure the script is enabled and matches `https://myanimelist.net/*`
4. Reload any MyAnimeList page

The script needs permission to connect to `api.jiten.moe`.

## How it works (short version)

1. Finds anime covers / links that contain a MAL anime ID (`/anime/{id}`)
2. Calls the Jiten API:
   - `GET /api/media-deck/by-link-id/5/{malId}` (type 5 = MyAnimeList)
   - Then fetches the deck detail
3. Converts `difficultyRaw` (0–5 scale) → percentage (0–100)
4. Creates a positioned badge on the cover with the percentage and appropriate color
5. Caches the result so the same anime doesn’t hit the API again for a week

## Notes / Limitations

- Only works for anime that have a linked Jiten media deck
- If no deck exists, nothing is shown
- Badge positioning relies on the cover’s parent having `position: relative` (the script sets this when needed)
- Heavy dynamic pages may take a moment for badges to appear (MutationObserver + short debounce)

## Credits

- Data provided by [Jiten](https://jiten.moe)
- Runs on [MyAnimeList](https://myanimelist.net)

## License

MIT (or whatever you prefer)