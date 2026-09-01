import { canonicalEmail, type ApiBook, type IssueLoanRequest } from "@repo/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  HelperText,
  Menu,
  Text,
  TextInput,
} from "react-native-paper";

import { useBooks } from "../../../../src/api/books";
import { getErrorMessage } from "../../../../src/api/errors";
import { useIssueLoan } from "../../../../src/api/loans";
import { useMemberLookup } from "../../../../src/api/users";

/** A due date 14 days out (the API default), as `YYYY-MM-DD` for the input. */
function defaultDueDate(): string {
  const date = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

/**
 * Client-side shape check only — enough to avoid spending a lookup request on
 * something that cannot be an address. The API's `@IsEmail()` is the real rule,
 * and this is deliberately the *looser* of the two: anything it lets through
 * that the server rejects comes back as a plain 400 the field renders, so no
 * address the API would accept can ever be blocked here.
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Issue Loan form (ticket 10, user stories 32–35). The Librarian picks a Book
 * from the Catalog and identifies the Member by **email** (ADR-0011).
 *
 * Email rather than a numeric id because a Librarian has no route that lists
 * users (`GET /users` is Owner-only), so an id is a number they have no way to
 * find — while an email is one the member can simply tell them. The trade-off is
 * that a typo now points at nobody rather than at the wrong person, so the form
 * confirms the address before it will submit: leaving the field triggers
 * `GET /users/lookup`, and Issue stays disabled until that comes back `true`.
 *
 * Three outcomes are kept visually distinct, because conflating them would lie
 * to the Librarian: *not registered* (the answer is no), *could not check* (the
 * request itself failed — the email may well be fine), and *confirmed*. Editing
 * the field after a confirmation clears it, so the email submitted is always the
 * exact one that was checked. The server re-validates regardless; this check is
 * a convenience, never the enforcement.
 *
 * The Due Date is prefilled 14 days out (the API default) and can be overridden
 * or cleared (blank → API default). Issuing a Book with no Availability is
 * rejected with the API's 409 message.
 */
export default function IssueLoanScreen() {
  const router = useRouter();
  const issueLoan = useIssueLoan();
  const booksQuery = useBooks({});

  const [bookId, setBookId] = useState<number | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  // The email the lookup was last asked about — null until the field is left,
  // and cleared on every edit so a stale ✓ can never outlive a change.
  const [checkedEmail, setCheckedEmail] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [bookMenuOpen, setBookMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberLookup = useMemberLookup(checkedEmail);

  const selectedBook =
    booksQuery.data?.find((book) => book.id === bookId) ?? null;

  const normalizedEmail = canonicalEmail(memberEmail);
  const emailMalformed =
    normalizedEmail.length > 0 && !EMAIL_SHAPE.test(normalizedEmail);
  // Only a settled lookup for the *current* value counts as a confirmation.
  // `isFetching` matters as much as the value: TanStack keeps the previous
  // `data` while a refetch is in flight, so without it a re-check would show
  // "Checking…" and a ✓ and an enabled button at the same time, and could
  // submit on the stale answer.
  const memberConfirmed =
    checkedEmail !== null &&
    checkedEmail === normalizedEmail &&
    !memberLookup.isFetching &&
    memberLookup.data?.exists === true;

  const trimmedDue = dueDate.trim();
  const dueInvalid =
    trimmedDue.length > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDue);

  const canSubmit =
    bookId !== null && memberConfirmed && !dueInvalid && !issueLoan.isPending;

  function handleEmailChange(text: string) {
    setMemberEmail(text);
    setCheckedEmail(null);
  }

  /** Check the address once the Librarian has finished typing it. */
  function handleEmailBlur() {
    const candidate = canonicalEmail(memberEmail);
    if (!EMAIL_SHAPE.test(candidate)) {
      setCheckedEmail(null);
      return;
    }
    if (candidate === checkedEmail) {
      // Same address as last time, so setting state would be a no-op and the
      // query would never re-run. A check that *failed* must still be
      // retryable without forcing the Librarian to edit a correct email, so
      // ask the query directly.
      if (memberLookup.isError) {
        void memberLookup.refetch();
      }
      return;
    }
    setCheckedEmail(candidate);
  }

  function handleSubmit() {
    setError(null);
    if (bookId === null || !memberConfirmed || checkedEmail === null) {
      return;
    }
    const body: IssueLoanRequest = { bookId, memberEmail: checkedEmail };
    if (trimmedDue.length > 0) {
      body.dueDate = trimmedDue;
    }
    issueLoan.mutate(body, {
      onSuccess: () => router.back(),
      onError: (err) =>
        setError(getErrorMessage(err, "Could not issue the loan")),
    });
  }

  /**
   * Helper text under the email field. Ordered most-specific first, and it never
   * reports "not registered" for a check that merely failed to run.
   */
  function memberHelper(): { type: "error" | "info"; text: string } {
    if (emailMalformed) {
      return { type: "error", text: "Enter a valid email address." };
    }
    if (checkedEmail === null) {
      return {
        type: "info",
        text: "Enter the borrowing member's email, then tap outside to check it.",
      };
    }
    if (memberLookup.isPending || memberLookup.isFetching) {
      return { type: "info", text: "Checking this email…" };
    }
    if (memberLookup.isError) {
      return {
        type: "error",
        text: `${getErrorMessage(
          memberLookup.error,
          "Could not check this email.",
        )} Tap the field and leave it again to retry.`,
      };
    }
    if (memberLookup.data?.exists === false) {
      return {
        type: "error",
        text: "No account is registered with that email.",
      };
    }
    return { type: "info", text: "✓ Registered — this member can borrow." };
  }

  const helper = memberHelper();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text variant="labelLarge" style={styles.label}>
            Book
          </Text>
          {booksQuery.isError ? (
            <HelperText type="error" visible>
              {getErrorMessage(booksQuery.error, "Could not load books")}
            </HelperText>
          ) : (
            <Menu
              visible={bookMenuOpen}
              onDismiss={() => setBookMenuOpen(false)}
              anchor={
                <Button
                  mode="outlined"
                  icon="book-open-variant"
                  loading={booksQuery.isPending}
                  disabled={booksQuery.isPending}
                  contentStyle={styles.anchorContent}
                  onPress={() => setBookMenuOpen(true)}
                >
                  {selectedBook ? selectedBook.title : "Select a book"}
                </Button>
              }
            >
              <ScrollView style={styles.menuScroll}>
                {(booksQuery.data ?? []).map((book: ApiBook) => (
                  <Menu.Item
                    key={book.id}
                    title={`${book.title}  (${book.availability}/${book.totalCopies})`}
                    trailingIcon={book.id === bookId ? "check" : undefined}
                    onPress={() => {
                      setBookId(book.id);
                      setBookMenuOpen(false);
                    }}
                  />
                ))}
                {booksQuery.data && booksQuery.data.length === 0 ? (
                  <Menu.Item title="No books in the catalog yet" disabled />
                ) : null}
              </ScrollView>
            </Menu>
          )}
          {selectedBook ? (
            <HelperText type="info" visible>
              {selectedBook.availability > 0
                ? `${selectedBook.availability} of ${selectedBook.totalCopies} available`
                : "No copies available — issuing will be rejected"}
            </HelperText>
          ) : null}
        </View>

        <TextInput
          label="Member email"
          value={memberEmail}
          onChangeText={handleEmailChange}
          onBlur={handleEmailBlur}
          mode="outlined"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="member@example.com"
          right={
            memberConfirmed ? <TextInput.Icon icon="check-circle" /> : undefined
          }
        />
        <HelperText type={helper.type} visible>
          {helper.text}
        </HelperText>

        <TextInput
          label="Due date (YYYY-MM-DD)"
          value={dueDate}
          onChangeText={setDueDate}
          mode="outlined"
          autoCapitalize="none"
          placeholder="YYYY-MM-DD"
        />
        <HelperText type={dueInvalid ? "error" : "info"} visible>
          {dueInvalid
            ? "Use the format YYYY-MM-DD."
            : "Defaults to 14 days from today. Clear to use the default."}
        </HelperText>

        {error ? (
          <HelperText type="error" visible style={styles.submitError}>
            {error}
          </HelperText>
        ) : null}

        <Button
          mode="contained"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={issueLoan.isPending}
          style={styles.submit}
        >
          Issue loan
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 20, gap: 4 },
  label: { marginBottom: 4, opacity: 0.7 },
  anchorContent: { flexDirection: "row-reverse" },
  menuScroll: { maxHeight: 300 },
  submitError: { marginTop: 4 },
  submit: { marginTop: 12 },
});
