import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { HeaderLogoutButton } from "../../../../src/ui/header-logout-button";

/**
 * The Member's two primary destinations as a bottom-tab bar (ticket 09):
 * Catalog (browse + search + availability filter) and My Loans (current + past).
 * Each tab renders its own header with a logout action on the right, so the
 * shell's logout stays reachable now that the placeholder landing is gone.
 */
export default function MemberTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerRight: () => <HeaderLogoutButton />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Catalog",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="book-open-variant"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: "My Loans",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="bookshelf"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
