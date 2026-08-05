# PASOC's 2nd Website/Platform

A full-stack membership management platform built for the **Pangasinan Society of Calgary (PASOC)**, a Filipino-Canadian nonprofit organization. PASOC handles member registration, donations, events, and sponsor management in one place.

Built by **JBYRDS Inc.** maintained by **Benjamin Noel**

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org) (App Router)
- **Database:** MySQL
- **Auth:** Firebase Auth (ID token verification on the server)
- **Payments:** Stripe (webhooks, donations, membership fees)
- **Email:** Resend (WIP)
- **Media/Object Storage:** Cloudflare R2
- **Content Moderation:** Azure AI Content Safety (WIP)
- **Deployment:** Hostinger VPS via [Dokploy](https://dokploy.com) + Docker (Traefik for routing/SSL)

## Features

- Member registration and role-based access control (`roleId`)
- Donation and membership payments via Stripe, with webhook-driven status updates
- Sponsor admin dashboard with logo uploads (presigned URL flow to Cloudflare R2), external links, and event tagging
- Automated email flows via Resend (currently: guest signup welcome email)
- Content moderation on user-submitted text via Azure AI Content Safety
- Input validation and sanitization against XSS/SQLi

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- MySQL instance (local or remote)
- Accounts/API keys for: Firebase, Stripe, Resend, Cloudflare R2, Azure AI Content Safety

### Environment Variables

Copy the variables from the sent document to `.env.local` and fill in the required values.

Credentials themselves are not stored in this repo, reach out to Benjamin Noel or Jerome Noel for access to the relevant keys.

### Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app. The page auto-updates as you edit files under `app/`.

## Deployment

PASOC is deployed via Dokploy on a managed VPS, with Traefik handling routing/SSL. Deployment configuration and access are managed by Benjamin Noel - see internal deployment docs or contact for details.

Media assets are served separately via Cloudflare R2.

## Project Structure

```
app/              # Next.js App Router pages, API routes, and route-scoped UI components
lib/              # Shared utilities (db, firebase-admin, r2)
public/           # Static assets
```

## Contributing

This is a client project for PASOC, maintained under the PASOC GitHub org. For repo access, environment setup help, or contribution guidelines, contact Benjamin Noel directly.

## License

Proprietary, built for the Pangasinan Society of Calgary. Not licensed for reuse without permission.
