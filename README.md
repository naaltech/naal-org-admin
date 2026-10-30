[![Netlify Status](https://api.netlify.com/api/v1/badges/66759a92-d1d0-4acf-b05b-7c354b819ce0/deploy-status)](https://app.netlify.com/projects/nevzatayaz-admin/deploys)
# NAAL Club Admin Panel

The admin panel of the school-wide club platform of Nevzat Ayaz Anatolian High School ([naal.org.tr](https://naal.org.tr)). Each club signs in with its own account to manage its public page, certificates, short URLs, Instagram feed, applications and (for magazine clubs) its magazine. The super admin manages every club. The UI is in Turkish.

![Admin panel dashboard](docs/panel.png)

## 🚀 Features

- **Certificates**: Create digital certificates and bulk PDF certificates (jsPDF), upload PDFs, export lists to Excel
- **Club information**: Edit the club profile, logo, description and links, including the WhatsApp community link
- **Short URLs**: `<club code>.naal.org.tr/<path>` redirects, with availability checks
- **Instagram**: Connect Business/Creator accounts through the official Instagram API; posts are synced every 20 minutes and their images stored as WebP on Cloudflare R2
- **Applications**: Review Tally application forms, mark submissions as accepted/rejected, add notes, export, and email results to applicants
- **Magazine**: Publish magazine issues (PDF up to 50 MB, cover rendered from the first page) and open personal editor accounts
- **Role-based access**: Super admin (`admin@naal.org.tr`), club accounts (`<club code>@naal.org.tr`) and magazine editors, enforced by Supabase RLS
- **KVKK pages**: Public privacy notice (`/gizlilik`) and data deletion instructions (`/veri-silme`)

## 🛠️ Technologies

- **Framework**: Next.js 16 (App Router, webpack build), React 19, TypeScript
- **UI**: IBM Carbon (`@carbon/react`), Sass, IBM Plex
- **Backend**: Supabase (Auth, Postgres with RLS, Storage, Edge Functions)
- **Storage**: Cloudflare R2 (`aws4fetch`, `sharp`), Catbox for certificate PDFs
- **Other**: Cloudflare Turnstile, `pdfjs-dist`, `jspdf`, `write-excel-file`
- **Deployment**: Netlify (every push to `main` goes to production)

> Next.js 16 has breaking changes compared to older versions (for example `middleware.ts` became `proxy.ts`). See `AGENTS.md` and `node_modules/next/dist/docs/` before changing framework code.

## 📋 Requirements

- Node.js 20+
- pnpm (or npm)
- A Supabase project

## 🏃‍♂️ Installation

1. **Clone the project:**
```bash
git clone https://github.com/naaltech/naal-org-admin.git
cd naal-org-admin
```

2. **Install dependencies:**
```bash
pnpm install
```

3. **Set environment variables:**
Copy `.env.example` to `.env.local` and fill it in (see [Environment variables](#environment-variables)).

4. **Set up the database:**

The schemas are applied by hand in the Supabase SQL Editor; there are no migrations. Run the files in `supabase/` in this order:

| File | Purpose |
|------|---------|
| `schema.sql` | Base tables (`clubs`, `cert`, `cert_pdf`, `url`, `posts_instagram`) |
| `policies.sql` | Row level security: a club account can only write its own rows, the super admin everything |
| `storage.sql` | Public `club-logos` bucket and its policies |
| `instagram.sql` | `instagram_accounts` (tokens, service role only) and the new `posts_instagram` columns |
| `applications.sql` | `club_forms` and `application_reviews` |
| `application-notify.sql` | Notification tracking for application result emails |
| `club-settings.sql` | `club_settings` (private per club, e.g. WhatsApp link) |
| `magazines.sql` | `magazines` table and the public `magazines` bucket |
| `editors.sql` | `club_editors` (magazine editor accounts) |

5. **Set up the Instagram integration (optional):**

Club posts are fetched with the official [Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login) and their images are stored on Cloudflare R2 as WebP.

- Create a Meta app with the Instagram product, add `<site>/api/instagram/callback` as the OAuth redirect URI and set `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET`. While the app is in development mode, each club's Instagram account must be added as an Instagram tester in the app.
- Create an R2 bucket with public access (preferably on a custom domain such as `img.naal.org.tr`) and an API token with write access to it, then set the `R2_*` variables.
- Set `SUPABASE_SERVICE_ROLE_KEY` and a random `CRON_SECRET`. On Netlify, `netlify/functions/instagram-sync.ts` calls `/api/instagram/cron` every 20 minutes; elsewhere, call it from any cron service with `Authorization: Bearer <CRON_SECRET>`.
- Club accounts must be Instagram **Business** or **Creator** accounts. Connect them from the **Instagram** page of the panel.
- Meta app URLs: Privacy Policy `https://admin.naal.org.tr/gizlilik`, Deauthorize callback `https://admin.naal.org.tr/api/instagram/deauthorize`, Data deletion request `https://admin.naal.org.tr/api/instagram/data-deletion`.

6. **Set up club applications (optional):**

Clubs review the submissions of their Tally application forms on the **Başvurular** page. Submissions stay in Tally; the panel reads and deletes them through the `tally-applications` Supabase Edge Function, so the Tally API key never reaches Netlify or the browser.

- Run `applications.sql`, deploy `supabase/functions/tally-applications` and add the Tally API key as the Edge Function secret `TALLY_API_KEY`.
- Link a form to a club with `insert into club_forms (form_id, club_code, title, since) values (...)`.
- Run `club-settings.sql` so clubs can set a WhatsApp community link on the **Kulüp bilgileri** page. It is added to acceptance emails.
- To email results to applicants, run `application-notify.sql`, verify `naal.org.tr` on [Resend](https://resend.com) (EU region; the DKIM, `send`/`rsend` CNAME and `_dmarc` records live in Cloudflare and do not touch the Google Workspace MX/SPF) and add a sending-only API key as the Edge Function secret `RESEND_API_KEY`. Results are sent from `basvuru@naal.org.tr` after the club confirms a preview of the email.

7. **Set up the club magazine (optional):**

Clubs listed in `MAGAZINE_CLUBS` (`lib/magazines.ts`, currently `bilim`) publish their magazine issues on the **Dergi** page. The club site shows the highest published issue as the current one and lists the others as previous issues.

- Run `magazines.sql` and then `editors.sql`. `editors.sql` adds `club_editors`: personal accounts that a club opens for its magazine editors from the **Dergi** page.
- Deploy `supabase/functions/editor-accounts`: it creates, resets and deletes the accounts with the service role and emails the generated password to the editor from `<club code>@naal.org.tr` through Resend (the same `RESEND_API_KEY` secret as `tally-applications`). The panel also shows the password once. Editors sign in with their own email (never `@naal.org.tr`) and can only reach the **Dergi** page; the database policies grant them nothing else.

8. **Start the development server:**
```bash
pnpm dev
```

The application will run at [http://localhost:3000](http://localhost:3000).

## 📜 Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Development server (webpack) |
| `pnpm build` | Production build (`next build --webpack`) |
| `pnpm start` | Start the production server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |

## 📁 Project Structure

```
├── app/
│   ├── (app)/              # Signed-in pages (app shell)
│   │   ├── dashboard/      # Overview
│   │   ├── club-info/      # Club profile and logo
│   │   ├── applications/   # Tally applications
│   │   ├── magazine/       # Magazine issues and editors
│   │   ├── certificates/   # Certificate list and create/
│   │   ├── urls/manage/    # Short URLs
│   │   └── instagram/      # Instagram connection
│   ├── api/
│   │   ├── instagram/      # connect, callback, sync, cron, deauthorize, data-deletion, accounts
│   │   ├── upload/         # PDF upload (Catbox)
│   │   └── urls/check/     # Short URL availability
│   ├── login/              # Login (Turnstile)
│   ├── gizlilik/           # KVKK privacy notice
│   └── veri-silme/         # Data deletion instructions
├── components/             # Carbon based shared components
├── contexts/               # Auth and toast contexts
├── hooks/                  # Custom hooks
├── lib/                    # Supabase clients, roles, Instagram, R2, uploads, exports
├── netlify/functions/      # Scheduled Instagram sync
├── supabase/               # SQL files and Edge Functions
└── public/                 # Static files and fonts
```

## 🔧 Configuration

### Environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only, never use a `NEXT_PUBLIC_` prefix) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `CATBOX_USERHASH` | CATBOX.MOE userhash for PDF uploads (server only) |
| `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` | Meta app credentials for Instagram Login |
| `INSTAGRAM_REDIRECT_URI` | Optional OAuth redirect override |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | Cloudflare R2 storage for Instagram images |
| `CRON_SECRET` | Secret for the scheduled Instagram sync |

Edge Function secrets (`TALLY_API_KEY`, `RESEND_API_KEY`) are set in Supabase, not in Netlify.

## 🚀 Deployment

The site is linked to its GitHub repository through Netlify's Git integration: every push to `main` builds and deploys to production at `admin.naal.org.tr` (and the `dash`, `dashboard`, `manage`, `yonet`, `yonetici` aliases). Run `pnpm build`, `pnpm lint` and `pnpm typecheck` locally before pushing.

### Manual Deployment

```bash
pnpm build
pnpm start
```

## 📄 License

This project is licensed under the GPLv3 License. See the `LICENSE` file for details.
