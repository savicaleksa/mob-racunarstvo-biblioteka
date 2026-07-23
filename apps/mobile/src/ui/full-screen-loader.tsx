import { StyleSheet, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

/** A centered spinner filling the screen — shown while the session hydrates or a guard resolves. */
export function FullScreenLoader() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
