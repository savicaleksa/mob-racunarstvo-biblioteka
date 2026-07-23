import type { ApiUser, AssignableRole } from "@repo/shared";
import { ASSIGNABLE_ROLES, Role } from "@repo/shared";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  SegmentedButtons,
  Snackbar,
  Text,
} from "react-native-paper";

import { getErrorMessage } from "../../../src/api/errors";
import { useUpdateUserRole, useUsers } from "../../../src/api/users";
import { useAuth } from "../../../src/auth/auth-context";

/** Human-readable label for each assignable role in the toggle. */
const ROLE_LABEL: Record<AssignableRole, string> = {
  [Role.LIBRARIAN]: "Librarian",
  [Role.MEMBER]: "Member",
};

/**
 * Owner home = the Users roster + role management (ticket 11, stories 39–43).
 * Lists every registered user with their role and lets the Owner promote a
 * Member to Librarian or demote a Librarian back to Member. Only
 * `ASSIGNABLE_ROLES` (LIBRARIAN | MEMBER) are ever offered — `OWNER` is never a
 * target — and the Owner's own (OWNER) row shows no control at all, since the
 * API refuses changing it (400). A "Library management" link crosses into the
 * Librarian area so the Owner can operate the library directly (story 43).
 */
export default function OwnerUsersScreen() {
  const router = useRouter();
  const { user: me } = useAuth();
  const { data, isPending, isError, error, refetch } = useUsers();
  const updateRole = useUpdateUserRole();
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  function changeRole(user: ApiUser, role: AssignableRole) {
    if (role === user.role) {
      return;
    }
    setPendingId(user.id);
    updateRole.mutate(
      { id: user.id, role },
      {
        onError: (err) =>
          setSnackbar(getErrorMessage(err, "Could not change the role")),
        onSettled: () => setPendingId(null),
      },
    );
  }

  const libraryLink = (
    <View style={styles.controls}>
      <Button
        mode="contained-tonal"
        icon="bookshelf"
        onPress={() => router.push({ pathname: "/librarian" })}
      >
        Library management
      </Button>
      <Text variant="bodySmall" style={styles.dim}>
        Manage the Catalog and Loans as a Librarian.
      </Text>
    </View>
  );

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: "Users" }} />
      {isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text variant="bodyMedium" style={styles.error}>
            {getErrorMessage(error, "Could not load the users")}
          </Text>
          <Button mode="contained" onPress={() => refetch()}>
            Retry
          </Button>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(user) => String(user.id)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={libraryLink}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text variant="bodyMedium" style={styles.dim}>
                No users registered yet.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <UserRow
              user={item}
              isSelf={me?.id === item.id}
              busy={pendingId === item.id}
              onChangeRole={(role) => changeRole(item, role)}
            />
          )}
        />
      )}
      <Snackbar
        visible={snackbar !== null}
        onDismiss={() => setSnackbar(null)}
        duration={5000}
      >
        {snackbar}
      </Snackbar>
    </View>
  );
}

/**
 * One user: email, id, and either a role toggle (Members/Librarians) or a plain
 * "Owner" chip (the OWNER row — the role cannot be changed through the app).
 */
function UserRow({
  user,
  isSelf,
  busy,
  onChangeRole,
}: {
  user: ApiUser;
  isSelf: boolean;
  busy: boolean;
  onChangeRole: (role: AssignableRole) => void;
}) {
  const isOwner = user.role === Role.OWNER;
  return (
    <Card>
      <Card.Title
        title={user.email}
        subtitle={`ID ${user.id}${isSelf ? " · you" : ""}`}
        titleNumberOfLines={2}
      />
      <Card.Content style={styles.cardContent}>
        {isOwner ? (
          <View style={styles.ownerRow}>
            <Chip icon="shield-crown" mode="flat">
              Owner
            </Chip>
            <Text variant="bodySmall" style={styles.dim}>
              The Owner role cannot be changed.
            </Text>
          </View>
        ) : (
          <SegmentedButtons
            value={user.role}
            onValueChange={(value) => onChangeRole(value as AssignableRole)}
            buttons={ASSIGNABLE_ROLES.map((role) => ({
              value: role,
              label: ROLE_LABEL[role],
              disabled: busy,
            }))}
          />
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  controls: { paddingBottom: 12, gap: 6 },
  listContent: { padding: 12, gap: 8, paddingBottom: 24 },
  cardContent: { gap: 4 },
  ownerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  error: { textAlign: "center" },
  dim: { opacity: 0.7 },
});
