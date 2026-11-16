# Asklep — frontend

React application of **Asklep**, a clinic and hospital management system. It talks only to the JSON
API of the backend (`hospital-case-backend`); it has no server of its own.

**Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, React Router, Motion (animations) and Lucide
icons. The visual identity follows a light, editorial health-care style, and the logo is the Rod of
Asclepius.

## Areas

| Address | Who uses it | What it offers |
|---|---|---|
| `/`, `/servicos/...`, `/cadastro` | Anyone, no login | Public site: specialties and doctors, exams (preparation, whether a medical order is required), vaccines and patient sign-up |
| `/minha-saude/...` | Patients | Book, confirm, reschedule and cancel appointments; exams with an attached medical order; vaccines and vaccination card; prescriptions |
| `/painel` and the other staff screens | Reception, nursing, doctors, administrator | Patients, appointment and exam schedules, medical order review, vaccination room, triage, encounters, professionals, specialties, users and permissions, audit log |
| `/chamados`, `/perfil`, `/equipe` | Every staff user (team overview: manager group) | Framework examples: support tickets, profile with photo and Base64 file upload, team overview |

After login each person lands in their own area. Patients never see staff screens, and staff
(administrator included) never enter a patient's portal. The backend enforces the same rules.

## How it talks to the backend

- `src/lib/api.ts` holds every call. Reads are `GET /api/...`; changes are `POST` with the
  `X-CSRF-Token` header.
- `src/lib/session.tsx` reads `GET /api/auth/session`: who is signed in, groups, permissions, whether
  the password must be changed, and the CSRF token.
- The menu and buttons follow the user's permissions, but access is decided by the backend: it
  answers 403 for what the role cannot do and 404 for clinical data of patients without a care link.
- Validation errors (422) arrive per field and are shown under each field.
- Page URLs are in Portuguese because people read them; code, API routes and parameters are in
  English. Data fields keep the backend's column names.

## Structure

```
src/
  lib/          API client, session, formatting, input masks, permission-based menu, hooks
  components/   layouts (staff sidebar, patient and public layouts), UI kit, notices and dialogs, booking widgets
  pages/        one screen per file; pages/patient (portal) and pages/public (site)
```
