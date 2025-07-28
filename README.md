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
NEXT_PUBLIC_CATBOX_USERHASH=

# ImageBB API Key
IBB_API_KEY=

# Cloudflare Turnstile Site Key
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

4. **Start the development server:**
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
| `NEXT_PUBLIC_CATBOX_USERHASH` | CATBOX.MOE Userhash |
| `IBB_API_KEY` | IBB.CO API key |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile Website Key |

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
