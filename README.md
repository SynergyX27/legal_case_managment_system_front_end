# LegalFlow frontend

React + TypeScript + TanStack Router + Vite + Tailwind. The backend is a separate JavaScript project in `../backend`.

Run `npm ci` and `npm run dev`. Open `http://localhost:8080`. Vite proxies `/api` to `http://127.0.0.1:3001`; start the backend separately. No frontend environment secrets are required.

Build with `npm run build`. Serve `dist` through the backend (default) or reverse-proxy `/api` to the backend on the same public origin. Do not use `vite preview` as the production application server.

Commands: `npm run typecheck`, `npm test`, `npm run build`.

The Zustand store holds only the current API response in memory. Cases, documents, invoices, user profiles, conversations, read markers, saved views and column settings are persisted by PostgreSQL. Only the appearance preference is saved in localStorage. Message drafts remain in memory until sent or signed out. Old prototype browser storage is removed on startup.

An active browser tab refreshes authorized records every five seconds. Successful mutations also reload records immediately. Hidden tabs stop polling. Messaging uses this five-second synchronization; it does not require a WebSocket service.

The shared `src/lib/domain.ts` contains types and allowed status/type options, with no generated records. Reports and dashboard figures are computed from the server-authorized records. The floating messenger and light/dark layouts are preserved.

## Create cases in a modal or on a page

The New case button on Case Files and Create a case on Overview offer two choices: Create in modal and Create on full page. The header's Create new menu also offers both. The page is `/cases/new`; successful creation opens the case details, and Cancel returns to Case Files. Both presentations use `CaseForm` in `src/components/lf/case-form-dialog.tsx`, including the same fields, validation, Dropbox attachments and API save operation. Editing existing cases still opens the modal. Owners and managers can create cases, with permissions enforced by the existing API. No backend or SQL update is required.
