import type { ApiBook, IssueLoanRequest } from "@repo/shared";
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

/** A due date 14 days out (the API default), as `YYYY-MM-DD` for the input. */
function defaultDueDate(): string {
  const date = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

/**
 * Issue Loan form (ticket 10, user stories 32–35). The Librarian picks a Book
 * from the Catalog and identifies the Member. There is no librarian-accessible
 * route to list users (`GET /users` is Owner-only), so the Member is identified
 * by their numeric id in a plain input rather than a dropdown — an invalid id
 * comes back as the API's clear 400 message. The Due Date is prefilled 14 days
 * out (the API default) and can be overridden or cleared (blank → API default).
 * Issuing a Book with no Availability is rejected with the API's 409 message.
 */
export default function IssueLoanScreen() {
  const router = useRouter();
  const issueLoan = useIssueLoan();
  const booksQuery = useBooks({});

  const [bookId, setBookId] = useState<number | null>(null);
  const [memberId, setMemberId] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [bookMenuOpen, setBookMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBook =
    booksQuery.data?.find((book) => book.id === bookId) ?? null;

  const trimmedMember = memberId.trim();
  const memberInvalid =
    trimmedMember.length > 0 && !/^\d+$/.test(trimmedMember);
  const trimmedDue = dueDate.trim();
  const dueInvalid =
    trimmedDue.length > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDue);

  const canSubmit =
    bookId !== null &&
    /^\d+$/.test(trimmedMember) &&
    !dueInvalid &&
    !issueLoan.isPending;

  function handleSubmit() {
    setError(null);
    if (bookId === null || !/^\d+$/.test(trimmedMember)) {
      return;
    }
    const body: IssueLoanRequest = {
      bookId,
      memberId: Number(trimmedMember),
    };
    if (trimmedDue.length > 0) {
      body.dueDate = trimmedDue;
    }
    issueLoan.mutate(body, {
      onSuccess: () => router.back(),
      onError: (err) =>
        setError(getErrorMessage(err, "Could not issue the loan")),
    });
  }

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
          label="Member ID"
          value={memberId}
          onChangeText={setMemberId}
          mode="outlined"
          keyboardType="number-pad"
        />
        <HelperText type={memberInvalid ? "error" : "info"} visible>
          {memberInvalid
            ? "Member ID must be a number."
            : "Enter the borrowing Member's numeric id."}
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
