# Chanakya AI — Personal Strategy Engine (MVP)

A private, mobile-first web app that turns real-life situations into structured strategic analysis using an **Arthashastra-centered principle library** plus clearly labeled modern adaptations.

## What V1 does

- **Analyze Situation** — professional, wealth/business, or personal mode.
- **Structured Chanakya lens** — objective, interests, power, allies, resistance, timing, information, second-order effects.
- **Strategy sequence** — can use ideas such as Sama, Dana, Bheda, Danda, Sandhi, Asana, Vigraha and preparation, but with modern ethical boundaries.
- **Decision Journal** — save analyses as cases and later record what actually happened.
- **People Memory** — store useful context about people who materially affect your decisions.
- **Principle Library** — inspect the exact principles the AI is allowed to use.
- **Private API key** — the OpenAI key stays on the server, not in browser JavaScript.
- **Optional app password** — useful if you deploy it to the internet.
- **PWA** — can be added to an iPhone home screen after deployment over HTTPS.

## Important design rule

This app does **not** tell the model to “pretend to be Chanakya.” Instead it gives the model a controlled library of decision principles and asks it to apply them. The prompt explicitly blocks fake quotations and requires motives to be labeled as hypotheses when uncertain.

## Run locally

1. Install Node.js (current LTS is recommended).
2. Copy `.env.example` to `.env`.
3. Add your OpenAI API key:

   ```env
   OPENAI_API_KEY=...
   OPENAI_MODEL=gpt-6-astra
   ```

4. Optional: set a private password:

   ```env
   APP_PASSWORD=choose-a-private-password
   ```

5. In this folder run:

   ```bash
   npm install
   npm start
   ```

6. Open `http://localhost:3000`.

## Use from your iPhone on the same Wi-Fi

For local testing, run the server on your computer and find the computer's LAN IP (for example `192.168.1.20`). Then open:

`http://YOUR-COMPUTER-IP:3000`

Some PWA features require HTTPS, so **Add to Home Screen works best after deployment**.

## Easy deployment options

This app is a normal Node/Express service. Deploy it to any host that supports Node and persistent storage. For a serious long-term version, replace the JSON file with PostgreSQL/Supabase before depending on hosted persistence.

Set environment variables on the host:

- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional)
- `APP_PASSWORD` (strongly recommended on a public URL)
- `PORT` (usually supplied by the host)

## Data

Personal data is stored in:

`data/store.json`

The starter `.gitignore` excludes this file so you do not accidentally commit your private journal.

### Backup

Periodically copy `data/store.json` somewhere private. V2 should add encrypted export/import and a proper database.

## Principle sources and source discipline

V1 is centered on **Kautilya's Arthashastra**, organized broadly around topics such as discipline, ministers/counsel, administration, state elements, six-fold policy, relative strength, risk and calamities. The app's `knowledge/principles.json` intentionally uses broad book-level source labels rather than pretending every modern rule is a literal ancient sentence.

Useful primary-text starting point:

- R. Shamasastry's early English translation of *Kautilya's Arthashastra* (1915), available through public-domain repositories such as Wikisource.

For future versions, the source library should be upgraded principle-by-principle with chapter/section references and stronger modern scholarship. **Chanakya Niti should be added separately**, because popular internet quotations are often poorly sourced or misattributed.

## Safety / ethics layer

The AI instructions prohibit recommendations involving deception, retaliation, sabotage, harassment, illegal surveillance, discrimination, bribery, blackmail, exploiting private vulnerabilities, or hiding required safety/legal/quality information.

Ancient statecraft ideas such as `bheda` are translated into ethical modern equivalents such as stakeholder differentiation and issue decomposition—not malicious division.

## Suggested V2

1. PostgreSQL/Supabase database.
2. Encrypted backups and user authentication.
3. Voice input.
4. Photo/document attachment support.
5. Follow-up questioning before analysis when confidence is low.
6. Outcome analytics: which strategies work best for you.
7. Pattern detection across 50–100 past cases.
8. A deeper sourced Arthashastra + Chanakya Niti knowledge base.
9. Weekly strategic review.
10. Native iOS shell only after the workflow proves useful.

## Project structure

```text
chanakya-ai-mvp/
├─ server.js
├─ package.json
├─ .env.example
├─ knowledge/
│  └─ principles.json
├─ data/
│  ├─ store.json
│  └─ store.example.json
└─ public/
   ├─ index.html
   ├─ styles.css
   ├─ app.js
   ├─ manifest.webmanifest
   ├─ sw.js
   └─ icon.svg
```


## Recommended private-web deployment

Deploy this project as a private personal website on Railway or another Node.js host.

Required environment variables:
- `OPENAI_API_KEY` — your OpenAI API key; never commit it to GitHub.
- `OPENAI_MODEL=gpt-6-sol` — strong default balance for this personal tool.
- `APP_PASSWORD` — a long unique password.
- `PORT` — normally supplied automatically by the host.

For Railway persistence, mount a volume at `/app/data`.

Security note: V1 uses a server-checked password sent with API requests and stores the password only in browser `sessionStorage`. This is suitable as a lightweight personal MVP behind HTTPS, but for a higher-security production deployment, upgrade authentication to a hashed credential + server-side session cookie/passkey.
