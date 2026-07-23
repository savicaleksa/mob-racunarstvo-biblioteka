# Deletes are RESTRICT, not cascade

Foreign-key deletes are **restricted, not cascading**: an Author with any Books cannot be deleted, and a Book with any Loans (active *or* historical) cannot be deleted. The API returns a friendly error instead of proceeding. A cascade would silently erase loan history — which the Member "previous loans" view and the app's audit story depend on — so blocking the delete is the safer default. This is the deliberate opposite of the `ON DELETE CASCADE` a reader might expect, hence the record.

## Consequences

- To remove a referenced Author or Book, the referencing rows must be dealt with first. There is no soft-delete in the base scope.
