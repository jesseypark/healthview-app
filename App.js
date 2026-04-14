import React, { useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';

import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import SDOHScreen from './src/screens/SDOHScreen';
import MedicationsScreen from './src/screens/MedicationsScreen';
import DischargeScreen from './src/screens/DischargeScreen';

// Keep splash visible until navigation is ready.
SplashScreen.preventAutoHideAsync();

// Required on web to complete the OAuth redirect flow.
WebBrowser.maybeCompleteAuthSession();

const Stack = createNativeStackNavigator();

export default function App() {
  const onNavigationReady = useCallback(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer onReady={onNavigationReady}>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen
            name="SDOH"
            component={SDOHScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen name="Medications" component={MedicationsScreen} />
          <Stack.Screen name="Discharge" component={DischargeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
