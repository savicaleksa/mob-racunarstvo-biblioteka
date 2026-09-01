# Spec: Pull-to-refresh on the mobile read screens

Status: ready-for-agent

Vocabulary follows `CONTEXT.md`; the mobile stack follows `docs/adr/0010`.

## Problem Statement

Every screen in the Expo app that displays server data does so through TanStack Query with `staleTime: 30_000` and `refetchOnWindowFocus: false` (`src/query/query-client.ts`). Mutations invalidate the caches they affect, so data a user changes _on this device_ is always correct.

What the app has no answer for is change made by **someone else**. A Librarian on another phone Issues a Loan, and a Member staring at the Catalog sees an Availability that is silently wrong. A Member returns a Book at the desk, and the Librarian's Active Loans list still lists it. The only ways out today are to navigate away and back, or to wait for a screen to unmount.

The one existing manual affordance is the **Retry** button, and it only appears in the error branch — precisely when there is _no_ data on screen. When data is present but stale, there is nothing to press.

## Solution

Add the platform-standard pull-down-to-refresh gesture (`RefreshControl`) to every screen that only _displays_ server data, so any user can force a refetch of what they are looking at.

The change is purely additive. No query defaults change, no existing component's behaviour changes, and no data path is altered — a pull calls the same `refetch` those screens already destructure for their Retry button.

Screens that host a **form** are deliberately excluded. `useBook`/`useAuthor` seed the edit forms' initial state, so a pull mid-edit would refetch underneath the user and stomp on text they were typing. A refresh gesture is only coherent where the screen is a read.

## User Stories

1. As a Member browsing the Catalog, I want to pull down to refresh, so that I see Availability that reflects Loans other people have taken out since I opened the screen.
2. As a Member on My Loans, I want to pull down to refresh, so that a Loan a Librarian just Issued me appears without restarting the app.
3. As a Member with no Loans yet, I want the pull gesture to work on the empty screen too, so that I can check again right after borrowing without leaving the tab.
4. As a Librarian on Active Loans, I want to pull down to refresh, so that Returns recorded by a colleague drop off my list.
5. As a Librarian on the Books or Authors tab, I want to pull down to refresh, so that catalog edits made by a colleague show up.
6. As an Owner on the users list, I want to pull down to refresh, so that accounts registered since I opened the screen appear.
7. As anyone on a Book or Author detail screen, I want to pull down to refresh, so that I can re-check a derived Availability without backing out and re-entering.
8. As a user, I want the refresh spinner to appear only when _I_ pull, so that it is never a spontaneous flicker I have to interpret.
9. As a user in dark mode, I want the spinner drawn in the app's own palette, so that it does not appear as a grey disc pasted onto an espresso background.

## Out of Scope

- **Pagination / infinite scroll.** Every list endpoint returns its full set; there is nothing to load more of. A bottom swipe is not part of this work.
- **Changing the query client defaults.** `staleTime: 30_000` and `refetchOnWindowFocus: false` stay exactly as they are. Refresh stays manual and explicit.
- **Form screens.** `books/new`, `books/edit/[id]`, `authors/new`, `authors/edit/[id]`, `loans/new`.
- **A mobile test harness.** `@repo/mobile` has no test runner — only `lint` and `check-types`. Standing up jest-expo and a React Native testing library for one hook is a larger decision than this feature, and is not taken here.

## Decisions

Settled in a grilling session before implementation:

| #   | Decision       | Choice                                                | Why                                                                                                                                          |
| --- | -------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Gesture        | Pull down from the top (`RefreshControl`)             | The platform standard on both iOS and Android. A bottom swipe conventionally means "load more", which does not apply.                        |
| 2   | Scope          | 9 read-only screens; form screens excluded            | A pull on a form would refetch over in-progress input.                                                                                       |
| 3   | Refetch scope  | Only the query backing what is visible                | The Catalog holds two queries and shows one; refreshing the hidden one is a wasted request on a LAN-tethered phone.                          |
| 4   | Dead states    | Empty states become pullable; error states keep Retry | An empty list is the most likely moment a user pulls. An error already has a visible button, and a redundant invisible gesture buys nothing. |
| 5   | Spinner state  | A shared hook holding a local flag                    | `isRefetching` is true for _any_ refetch, so a mutation's cache invalidation would pop the pull spinner unprompted.                          |
| 6   | Query defaults | Untouched                                             | Keeps the change additive and the diff reviewable.                                                                                           |
| 7   | Docs           | No `CONTEXT.md` entry, no ADR                         | "Refresh" is UI mechanics, not domain language. The ADR bar needs an irreversible choice; deleting one hook and nine props is not one.       |
