import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import oauthService from '../services/oauthService';
import fhirService from '../services/fhirService';
import { SANDBOX_TEST_USERS, REDIRECT_URI } from '../constants/epicConfig';

export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const authResult = await oauthService.authenticate();
      fhirService.setAccessToken(authResult.accessToken);
      fhirService.setPatientId(authResult.patientId);
      navigation.replace('Dashboard');
    } catch (err) {
      const message = err.message || 'Authentication failed. Please try again.';
      setError(message);
      Alert.alert('Login Failed', message, [{ text: 'OK' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>🏥</Text>
          <Text style={styles.title}>HealthView</Text>
          <Text style={styles.subtitle}>
            Your personal health dashboard with{'\n'}AI-powered insights
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {[
            { icon: '📊', title: 'Care Gap Tracking', desc: "See which screenings and tests you're due for" },
            { icon: '🤖', title: 'AI Explanations',   desc: 'Understand your health data in plain language' },
            { icon: '🔒', title: 'Secure Access',      desc: 'Your data stays private with SMART on FHIR' },
          ].map(({ icon, title, desc }) => (
            <View key={title} style={styles.feature}>
              <Text style={styles.featureIcon}>{icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureDesc}>{desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Login button */}
        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.loadingText}>Connecting…</Text>
            </View>
          ) : (
            <>
              <Text style={styles.loginButtonText}>Connect with Epic</Text>
              <Text style={styles.loginButtonSub}>Secure login via MyChart</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Sandbox info */}
        <View style={styles.sandboxBox}>
          <Text style={styles.sandboxTitle}>🧪 Sandbox Mode</Text>
          <Text style={styles.sandboxDesc}>
            This demo connects to Epic's test environment.{'\n'}Use these credentials after login:
          </Text>
          {SANDBOX_TEST_USERS.map((u) => (
            <View key={u.username} style={styles.testUser}>
              <Text style={styles.testUserName}>{u.name}</Text>
              <Text style={styles.testUserCreds}>
                {u.username} / {u.password}
              </Text>
              <Text style={styles.testUserDesc}>{u.description}</Text>
            </View>
          ))}
        </View>

        {/* Debug panel */}
        <TouchableOpacity
          style={styles.debugBox}
          onPress={() => Alert.alert('OAuth Redirect URI', REDIRECT_URI)}
        >
          <Text style={styles.debugLabel}>🔧 OAuth Redirect URI (tap to copy)</Text>
          <Text style={styles.debugValue} selectable>{REDIRECT_URI}</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Powered by FHIR® and SMART on FHIR</Text>
          <Text style={styles.footerSub}>A portfolio project by Jesse Park</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scrollContent: { padding: 24, paddingTop: 60 },

  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 36, fontWeight: '800', color: '#FFFFFF', marginBottom: 12 },
  subtitle: { fontSize: 16, color: '#94A3B8', textAlign: 'center', lineHeight: 24 },

  features: { marginBottom: 40 },
  feature: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1E293B', padding: 16,
    borderRadius: 12, marginBottom: 12,
  },
  featureIcon: { fontSize: 32, marginRight: 16 },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  featureDesc: { fontSize: 14, color: '#94A3B8' },

  loginButton: {
    backgroundColor: '#6366F1', paddingVertical: 18,
    paddingHorizontal: 32, borderRadius: 16,
    alignItems: 'center', marginBottom: 24,
  },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  loginButtonSub: { fontSize: 13, color: '#C7D2FE', marginTop: 4 },
  loadingRow: { flexDirection: 'row', alignItems: 'center' },
  loadingText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginLeft: 12 },

  errorBox: {
    backgroundColor: '#FEE2E2', padding: 16,
    borderRadius: 12, marginBottom: 20,
  },
  errorText: { color: '#DC2626', fontSize: 14, textAlign: 'center' },

  sandboxBox: {
    backgroundColor: '#1E293B', padding: 20,
    borderRadius: 16, marginBottom: 32,
  },
  sandboxTitle: { fontSize: 16, fontWeight: '600', color: '#FBBF24', marginBottom: 8 },
  sandboxDesc: { fontSize: 14, color: '#94A3B8', marginBottom: 16, lineHeight: 20 },
  testUser: {
    backgroundColor: '#334155', padding: 12,
    borderRadius: 8, marginBottom: 8,
  },
  testUserName: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  testUserCreds: { fontSize: 12, color: '#10B981', fontFamily: 'monospace', marginBottom: 4 },
  testUserDesc: { fontSize: 12, color: '#94A3B8' },

  debugBox: {
    backgroundColor: '#0F2942',
    borderWidth: 1,
    borderColor: '#1E3A5F',
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
  },
  debugLabel: { fontSize: 11, color: '#60A5FA', marginBottom: 6, fontWeight: '600' },
  debugValue: { fontSize: 11, color: '#93C5FD', fontFamily: 'monospace' },

  footer: { alignItems: 'center', paddingTop: 20, paddingBottom: 40 },
  footerText: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  footerSub: { fontSize: 12, color: '#475569' },
});
