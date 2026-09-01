# 01 — Pull-to-refresh on the mobile read screens

**What to build:** A shared `useRefreshControl` hook, wired into all nine screens of the Expo app that only display server data, so a pull down from the top refetches what is on screen. Purely additive: the query client defaults, every existing component, and every data path stay as they are.

**Blocked by:** —

**Status:** done

Kept as one ticket rather than split: the hook and its nine call sites are a single cohesive change, and landing the helper alone would leave a component with no users.

## The hook

- [x] `apps/mobile/src/ui/use-refresh-control.tsx` exports `useRefreshControl(refetch)`, returning a ready-to-use `<RefreshControl>` element for a `FlatList` / `SectionList` / `ScrollView` `refreshControl` prop.
- [x] It holds its **own** `refreshing` flag, set on pull and cleared when that specific `refetch()` settles — so the spinner never appears for a refetch the user did not ask for. A doc comment records why this is not `query.isRefetching`: `useReturnLoan` and the Book/Author mutations invalidate `loanKeys.all` / `bookKeys.all`, and the resulting background refetch would otherwise pop the pull spinner on a list the user is merely looking at.
- [x] The spinner is painted from the Paper theme (`tintColor` / `colors` from `theme.colors.primary`, `progressBackgroundColor` from an elevated surface) so it reads correctly in both the wood-and-leaves light theme and OS dark mode. The RN default is a grey spinner on a hard white disc.
- [x] A refetch that rejects still clears the flag; the spinner never sticks after a failed pull.
- [x] No unmount guard: on React 19 a `setState` after unmount is a silent no-op, so a `mounted` ref would guard nothing and only add a ref, an effect, and a branch.

## The six list screens

Add the `refreshControl` prop, refetching only the query that backs the visible content:

- [x] `app/(app)/librarian/(tabs)/index.tsx` — Books
- [x] `app/(app)/librarian/(tabs)/authors.tsx` — Authors
- [x] `app/(app)/librarian/(tabs)/loans.tsx` — Active Loans
- [x] `app/(app)/member/(tabs)/index.tsx` — Catalog. Two queries live here; the pull refetches the **active** segmented mode (Books or Authors), not both.
- [x] `app/(app)/member/(tabs)/loans.tsx` — My Loans
- [x] `app/(app)/owner/index.tsx` — users

## The three detail screens

Add the `refreshControl` prop to the existing `ScrollView`:

- [x] `app/(app)/librarian/books/[id].tsx`
- [x] `app/(app)/librarian/authors/[id].tsx`
- [x] `app/(app)/member/books/[id].tsx`

## Empty states

- [x] `app/(app)/member/(tabs)/loans.tsx` renders "You have no loans yet…" as an early return _before_ its `SectionList`, so a pull on an empty My Loans does nothing. Move it into `ListEmptyComponent`.
- [x] Any list whose empty state must stay vertically centred gets `flexGrow: 1` on its `contentContainerStyle`, so moving the message inside the list does not park it at the top. The rule is documented once in the hook's JSDoc rather than repeated at each call site.
- [x] The three Librarian tabs carry `paddingBottom: 96` to clear the FAB, which would centre an empty message ~48px high. They swap in a `listContentEmpty` override when the list is empty — there are no cards to clear the FAB of.
- [x] Error branches are left exactly as they are — the existing **Retry** button stays the affordance there.

## Explicitly not in this ticket

- [x] `books/new`, `books/edit/[id]`, `authors/new`, `authors/edit/[id]`, `loans/new` get **no** refresh gesture — a pull would refetch over text the user is typing.
- [x] `src/query/query-client.ts` is not modified.

## Verification

`@repo/mobile` has no test runner, so this ticket is verified by:

- [x] `pnpm check-types` passes.
- [x] `pnpm lint` passes with `--max-warnings 0`.
- [x] `pnpm test` (the API e2e suite) still passes, confirming no cross-app regression.
