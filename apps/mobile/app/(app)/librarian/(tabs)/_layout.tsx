import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { HeaderLogoutButton } from "../../../../src/ui/header-logout-button";

/**
 * The Librarian's three primary destinations as a bottom-tab bar (ticket 10):
 * Books (catalog management, with Availability), Authors (roster management),
 * and Active Loans (everything out on loan, with Return). Issue Loan and the
 * create/edit/detail screens are pushed on top of these tabs by the area Stack.
 * Each tab renders its own header with a logout action on the right.
 */
export default function LibrarianTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerRight: () => <HeaderLogoutButton />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Books",
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
        name="authors"
        options={{
          title: "Authors",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="loans"
        options={{
          title: "Active Loans",
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
