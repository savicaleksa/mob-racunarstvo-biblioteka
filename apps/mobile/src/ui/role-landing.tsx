import { StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";

import { useAuth } from "../auth/auth-context";

interface RoleLandingProps {
  /** The area title, e.g. "Member". */
  title: string;
  /** One line describing what later tickets will add here. */
  description: string;
}

/**
 * Placeholder landing shown at the top of each role area. It proves the session
 * + role gating end to end (it greets the signed-in user by email and role) and
 * offers logout. Tickets 09/10/11 replace / build around it with the real
 * screens for that role; the logout button and the header pattern can stay.
 */
export function RoleLanding({ title, description }: RoleLandingProps) {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">{title}</Text>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium">Signed in</Text>
          <Text variant="bodyMedium">{user?.email}</Text>
          <Text variant="labelLarge">Role: {user?.role}</Text>
        </Card.Content>
      </Card>
      <Text variant="bodyMedium" style={styles.description}>
        {description}
      </Text>
      <Button
        mode="outlined"
        onPress={() => {
          void signOut();
        }}
        style={styles.logout}
      >
        Log out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  card: { marginTop: 8 },
  cardContent: { gap: 4 },
  description: { opacity: 0.7 },
  logout: { marginTop: "auto" },
});
