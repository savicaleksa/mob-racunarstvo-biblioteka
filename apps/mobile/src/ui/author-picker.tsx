import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, HelperText, Menu, Text } from "react-native-paper";

import { useAuthors } from "../api/authors";
import { getErrorMessage } from "../api/errors";

interface AuthorPickerProps {
  /** Currently selected Author id, or `null` when none is chosen yet. */
  value: number | null;
  onChange: (authorId: number) => void;
}

/**
 * A dropdown that lets a Librarian pick the Author for a Book from the existing
 * roster (`GET /authors`) — used by the Book create/edit forms. A Book must
 * reference an existing Author (a bad `authorId` is a 400 from the API), so the
 * picker only offers real Authors rather than a free-text field. The list is
 * capped and scrollable so a large roster stays usable inside the menu.
 */
export function AuthorPicker({ value, onChange }: AuthorPickerProps) {
  const [open, setOpen] = useState(false);
  const { data: authors, isPending, isError, error } = useAuthors({});

  const selected = authors?.find((author) => author.id === value) ?? null;
  const label = selected ? selected.name : "Select an author";

  if (isError) {
    return (
      <HelperText type="error" visible>
        {getErrorMessage(error, "Could not load authors")}
      </HelperText>
    );
  }

  return (
    <View>
      <Text variant="labelLarge" style={styles.label}>
        Author
      </Text>
      <Menu
        visible={open}
        onDismiss={() => setOpen(false)}
        anchor={
          <Button
            mode="outlined"
            icon="account"
            loading={isPending}
            disabled={isPending}
            contentStyle={styles.anchorContent}
            onPress={() => setOpen(true)}
          >
            {label}
          </Button>
        }
      >
        <ScrollView style={styles.menuScroll}>
          {(authors ?? []).map((author) => (
            <Menu.Item
              key={author.id}
              title={author.name}
              trailingIcon={author.id === value ? "check" : undefined}
              onPress={() => {
                onChange(author.id);
                setOpen(false);
              }}
            />
          ))}
          {authors && authors.length === 0 ? (
            <Menu.Item title="No authors yet — add one first" disabled />
          ) : null}
        </ScrollView>
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 4, opacity: 0.7 },
  anchorContent: { flexDirection: "row-reverse" },
  menuScroll: { maxHeight: 300 },
});
