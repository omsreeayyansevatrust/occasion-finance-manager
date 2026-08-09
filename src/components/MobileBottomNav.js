// src/components/MobileBottomNav.js

import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useState } from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { signOut } from "firebase/auth";
import { COLORS, FONTS } from "../constants/theme";
import { auth } from "../services/firebase";

const PRIMARY_ITEMS = [
  {
    label: "Home",
    route: "/dashboard",
    icon: "home-outline",
    activeIcon: "home",
  },
  {
    label: "People",
    route: "/people",
    icon: "people-outline",
    activeIcon: "people",
  },
  {
    label: "Occasions",
    route: "/occasions",
    icon: "calendar-outline",
    activeIcon: "calendar",
  },
  {
    label: "Money",
    route: "/contributions",
    icon: "wallet-outline",
    activeIcon: "wallet",
  },
];

const MORE_ITEMS = [
  {
    label: "Expenses",
    route: "/expenses",
    icon: "arrow-down-circle-outline",
  },
  {
    label: "Financial Details",
    route: "/financialdetails",
    icon: "bar-chart-outline",
  },
  {
    label: "Reports",
    route: "/reports",
    icon: "document-text-outline",
  },
];

export default function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [moreVisible, setMoreVisible] = useState(false);

  const isActive = (route) => {
    if (route === "/dashboard") {
      return pathname === "/" || pathname === "/dashboard";
    }

    return pathname === route || pathname.startsWith(`${route}/`);
  };

  const navigate = (route) => {
    setMoreVisible(false);
    router.push(route);
  };

  const handleLogout = async () => {
    setMoreVisible(false);

    try {
      await signOut(auth);
      router.replace("/");
    } catch (error) {
      console.log("Logout error:", error);
    }
  };

  const moreActive = MORE_ITEMS.some((item) => isActive(item.route));

  return (
    <>
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 8),
          },
        ]}
      >
        {PRIMARY_ITEMS.map((item) => {
          const active = isActive(item.route);

          return (
            <TouchableOpacity
              key={item.route}
              style={styles.tab}
              activeOpacity={0.8}
              onPress={() => navigate(item.route)}
            >
              <View
                style={[
                  styles.iconWrap,
                  active && styles.iconWrapActive,
                ]}
              >
                <Ionicons
                  name={active ? item.activeIcon : item.icon}
                  size={21}
                  color={
                    active
                      ? COLORS.primary
                      : COLORS.textMuted
                  }
                />
              </View>

              <Text
                numberOfLines={1}
                style={[
                  styles.tabLabel,
                  active && styles.tabLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.tab}
          activeOpacity={0.8}
          onPress={() => setMoreVisible(true)}
        >
          <View
            style={[
              styles.iconWrap,
              moreActive && styles.iconWrapActive,
            ]}
          >
            <Ionicons
              name="menu-outline"
              size={22}
              color={
                moreActive
                  ? COLORS.primary
                  : COLORS.textMuted
              }
            />
          </View>

          <Text
            style={[
              styles.tabLabel,
              moreActive && styles.tabLabelActive,
            ]}
          >
            More
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={moreVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMoreVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setMoreVisible(false)}
        >
          <Pressable
            style={[
              styles.moreSheet,
              { paddingBottom: Math.max(insets.bottom, 16) + 8 },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>More</Text>
                <Text style={styles.sheetSubtitle}>
                  Additional finance tools
                </Text>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setMoreVisible(false)}
              >
                <Ionicons
                  name="close"
                  size={21}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {MORE_ITEMS.map((item) => {
              const active = isActive(item.route);

              return (
                <TouchableOpacity
                  key={item.route}
                  style={[
                    styles.moreItem,
                    active && styles.moreItemActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => navigate(item.route)}
                >
                  <View
                    style={[
                      styles.moreIcon,
                      active && styles.moreIconActive,
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={
                        active
                          ? COLORS.primary
                          : COLORS.textSecondary
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.moreLabel,
                      active && styles.moreLabelActive,
                    ]}
                  >
                    {item.label}
                  </Text>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              );
            })}

            <View style={styles.separator} />

            <TouchableOpacity
              style={styles.logoutItem}
              activeOpacity={0.8}
              onPress={handleLogout}
            >
              <View style={styles.logoutIcon}>
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={COLORS.danger}
                />
              </View>

              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 66,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: COLORS.text,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 1000,
  },

  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 7,
  },

  iconWrap: {
    width: 36,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  iconWrapActive: {
    backgroundColor: COLORS.primaryLight,
  },

  tabLabel: {
    marginTop: 2,
    fontFamily: FONTS.medium,
    fontSize: 10,
    lineHeight: 14,
    color: COLORS.textMuted,
  },

  tabLabelActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.38)",
  },

  moreSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 18,
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  sheetTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    lineHeight: 25,
    color: COLORS.text,
  },

  sheetSubtitle: {
    marginTop: 3,
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },

  moreItem: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: COLORS.background,
  },

  moreItemActive: {
    backgroundColor: COLORS.primaryLight,
  },

  moreIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },

  moreIconActive: {
    backgroundColor: COLORS.white,
  },

  moreLabel: {
    flex: 1,
    marginLeft: 12,
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: COLORS.text,
  },

  moreLabelActive: {
    fontFamily: FONTS.bold,
    color: COLORS.primary,
  },

  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },

  logoutItem: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 12,
  },

  logoutIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.dangerLight,
  },

  logoutText: {
    marginLeft: 12,
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: COLORS.danger,
  },
});
