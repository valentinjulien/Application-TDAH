import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Colors, BorderRadius } from '../../constants/theme';

// Simple icon components (no external library needed)
const HomeIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <View style={[styles.homeIcon, { borderColor: color }]}>
      <View style={[styles.homeRoof, { borderColor: color }]} />
    </View>
  </View>
);

const MatrixIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <View style={styles.matrixGrid}>
      <View style={[styles.matrixCell, { backgroundColor: color }]} />
      <View style={[styles.matrixCell, { backgroundColor: color }]} />
      <View style={[styles.matrixCell, { backgroundColor: color }]} />
      <View style={[styles.matrixCell, { backgroundColor: color }]} />
    </View>
  </View>
);

const ProfileIcon = ({ color, size }: { color: string; size: number }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <View style={[styles.profileHead, { backgroundColor: color }]} />
    <View style={[styles.profileBody, { backgroundColor: color }]} />
  </View>
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface.dark,
          borderTopColor: Colors.neutral[800],
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: Colors.primary[400],
        tabBarInactiveTintColor: Colors.neutral[500],
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Maintenant',
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="matrix"
        options={{
          title: 'Matrice',
          tabBarIcon: ({ color, size }) => <MatrixIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <ProfileIcon color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeIcon: {
    width: 18,
    height: 14,
    borderWidth: 2,
    borderTopWidth: 0,
    borderRadius: 2,
  },
  homeRoof: {
    position: 'absolute',
    top: -8,
    left: -4,
    width: 0,
    height: 0,
    borderLeftWidth: 13,
    borderRightWidth: 13,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  matrixGrid: {
    width: 20,
    height: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  matrixCell: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  profileHead: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 2,
  },
  profileBody: {
    width: 16,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
});
