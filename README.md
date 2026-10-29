[![Netlify Status](https://api.netlify.com/api/v1/badges/66759a92-d1d0-4acf-b05b-7c354b819ce0/deploy-status)](https://app.netlify.com/projects/nevzatayaz-admin/deploys)
# Nevzat Ayaz Anatolian High School Club Management System

A modern club management system. A web application that includes certificate creation for club members, club information management, and URL redirection features.

<img width="1280" height="640" alt="Untitled design(1)" src="https://github.com/user-attachments/assets/5f26673d-bd37-4531-9c36-fae74a8286ea" />


## 🚀 Features

- **Certificate Management**: Create and manage digital and PDF certificates
- **Club Information**: Edit club profile information
- **URL Management**: URL redirection system
- **Role-Based Access**: Admin and user roles
- **Modern UI**: User interface designed with Tailwind CSS and shadcn/ui
- **Responsive Design**: Mobile and desktop compatible

## 🛠️ Technologies

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Backend**: Supabase (Authentication, Database)
- **Forms**: React Hook Form, Zod
- **Icons**: Lucide React
- **Deployment**: Netlify (recommended)

## 📋 Requirements

- Node.js 18+ 
- npm/pnpm/yarn
- Supabase account

## 🏃‍♂️ Installation

1. **Clone the project:**
```bash
git clone https://github.com/naaltech/naal-org-admin.git
cd naal-org-admin
```

2. **Install dependencies:**
```bash
pnpm install
# or
npm install
```

3. **Set environment variables:**
Create a `.env.local` file:
```bash
# Supabase Keys
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Catbox User Hash
CATBOX_USERHASH=

# Cloudflare Turnstile Site Key
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

4. **Set up logo storage:**

Run `supabase/storage.sql` once in the Supabase SQL Editor. It creates the public `club-logos` bucket and its access policies.

5. **Set up the Instagram integration (optional):**

Club posts are fetched with the official [Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login) and their images are stored on Cloudflare R2 as WebP.

- Run `supabase/instagram.sql` once in the Supabase SQL Editor. It creates the `instagram_accounts` table (tokens, readable only with the service role) and adds `ig_media_id` / `club_code` columns to `posts_instagram`.
- Create a Meta app with the Instagram product, add `<site>/api/instagram/callback` as the OAuth redirect URI and set `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET`. While the app is in development mode, each club's Instagram account must be added as an Instagram tester in the app.
- Create an R2 bucket with public access (preferably on a custom domain) and an API token with write access to it, then set the `R2_*` variables.
- Set `SUPABASE_SERVICE_ROLE_KEY` and a random `CRON_SECRET`. On Netlify, `netlify/functions/instagram-sync.ts` calls `/api/instagram/cron` every 20 minutes; elsewhere, call it from any cron service with `Authorization: Bearer <CRON_SECRET>`.
- Club accounts must be Instagram **Business** or **Creator** accounts. Connect them from the **Instagram** page of the panel.
- Meta app URLs: Privacy Policy `https://admin.naal.org.tr/gizlilik`, Deauthorize callback `https://admin.naal.org.tr/api/instagram/deauthorize`, Data deletion request `https://admin.naal.org.tr/api/instagram/data-deletion`. The KVKK notice (`/gizlilik`) and data deletion instructions (`/veri-silme`) are public pages.

6. **Set up club applications (optional):**

Clubs review the submissions of their Tally application forms on the **Başvurular** page. Submissions stay in Tally; the panel reads and deletes them through the `tally-applications` Supabase Edge Function, so the Tally API key never reaches Netlify or the browser.

- Run `supabase/applications.sql` once in the Supabase SQL Editor. It creates `club_forms` (which Tally form belongs to which club, and the date from which submissions are shown) and `application_reviews` (status and note per submission).
- Deploy `supabase/functions/tally-applications` and add the Tally API key as the Edge Function secret `TALLY_API_KEY`.
- Link a form to a club with `insert into club_forms (form_id, club_code, title, since) values (...)`.
- To email results to applicants, run `supabase/application-notify.sql`, verify `naal.org.tr` on [Resend](https://resend.com) (EU region; the DKIM, `send`/`rsend` CNAME and `_dmarc` records live in Cloudflare and do not touch the Google Workspace MX/SPF) and add a sending-only API key as the Edge Function secret `RESEND_API_KEY`. Results are sent from `basvuru@naal.org.tr` after the club confirms a preview of the email.

7. **Start the development server:**
```bash
pnpm dev
# or
npm run dev
```

The application will run at [http://localhost:3000](http://localhost:3000).

## 📁 Project Structure

```
├── app/                    # Next.js App Router
│   ├── certificates/       # Certificate management
│   ├── club-info/         # Club information
│   ├── dashboard/         # Main dashboard
│   ├── login/             # Login page
│   └── urls/              # URL management
├── components/            # UI components
│   └── ui/               # shadcn/ui components
├── contexts/             # React Contexts
├── hooks/                # Custom Hooks
├── lib/                  # Utility functions
└── public/               # Static files
```

## 🔧 Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous API key |
| `CATBOX_USERHASH` | CATBOX.MOE Userhash |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile Website Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` | Meta app credentials for Instagram Login |
| `INSTAGRAM_REDIRECT_URI` | Optional OAuth redirect override |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | Cloudflare R2 storage for Instagram images |
| `CRON_SECRET` | Secret for the scheduled Instagram sync |

## 🚀 Deployment

### Deploy with Netlify

1. Connect your GitHub repository to Netlify
2. Add environment variables in the Netlify dashboard
3. Deploy

### Manual Deployment

```bash
# Build
pnpm build

# Start production server
pnpm start
```

## 📄 License

This project is licensed under the GPLv3 License. See the `LICENSE` file for details.
