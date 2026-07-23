# 12 — Grader onboarding: seed command + README demo flow

**What to build:** A grader who clones the repository can, with a single command, recreate the database from migrations and populate the Catalog seed — with no database file committed to git — and follow documented instructions to exercise all three roles on a physical phone: register (→ Owner), register a second account (→ Member), and promote it to Librarian, pointing the app at their machine's LAN IP.

**Blocked by:** 03, 06, 07, 10, 11

**Status:** ready-for-agent

- [ ] A single command recreates the SQLite database from migrations and runs the Catalog seed (Authors + Books; no users seeded). No `.db`/`.sqlite` is committed.
- [ ] README documents the first-user/promote demo flow: register → Owner, register a second account → Member, promote it to Librarian to demonstrate all three tiers and role management.
- [ ] README documents pointing the app at the grader's machine: setting `EXPO_PUBLIC_API_URL` (or relying on LAN auto-detect) and opening in Expo Go on a phone sharing the network.
- [ ] README covers running migrations + Catalog seed and starting the API and mobile app.
