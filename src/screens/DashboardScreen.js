// DashboardScreen - Main care gaps dashboard

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import fhirService from '../services/fhirService';
import careGapsService from '../services/careGapsService';
import aiService from '../services/aiService';
import oauthService from '../services/oauthService';
import SummaryHeader from '../components/SummaryHeader';
import CareGapCard from '../components/CareGapCard';
import { MEASURE_STATUS } from '../constants/qualityMeasures';

const DashboardScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [measureResults, setMeasureResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [patientContext, setPatientContext] = useState(null);
  const [providerPhone, setProviderPhone] = useState(null);
  const [sdohResult, setSDOHResult] = useState(null); // self-reported questionnaire answers
  const [sdohFhirData, setSDOHFhirData] = useState(null); // FHIR SDOH data
  const [sdohBannerDismissed, setSDOHBannerDismissed] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadPatientData();
  }, []);

  const loadPatientData = async () => {
    try {
      setError(null);
      
      // Fetch all patient data from FHIR
      const data = await fhirService.getAllPatientData();
      setPatientData(data);

      // Fetch provider phone number
      const phone = await fhirService.getProviderPhone(data.patient);
      setProviderPhone(phone);

      // Store SDOH FHIR data
      setSDOHFhirData(data.sdoh);

      // Build patient context for AI (includes FHIR SDOH data)
      const context = aiService.buildPatientContext(data.patient, data.conditions, data.sdoh);
      setPatientContext(context);

      // Analyze quality measures
      const results = careGapsService.analyzeAllMeasures(data);
      const sortedResults = careGapsService.sortByPriority(results);
      setMeasureResults(sortedResults);

      // Get summary stats
      const summaryStats = careGapsService.getSummary(results);
      setSummary(summaryStats);

    } catch (err) {
      console.error('Error loading patient data:', err);
      setError(err.message || 'Failed to load health data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPatientData();
  };

  const handleSDOHComplete = (result) => {
    setSDOHResult(result);
    setSDOHBannerDismissed(true);
  };

  const openSDOHQuestionnaire = () => {
    navigation.navigate('SDOH', { onComplete: handleSDOHComplete });
  };

  // Merge self-reported SDOH into patient context for AI
  const enrichedPatientContext = sdohResult
    ? aiService.addSDOHAnswers(patientContext, sdohResult)
    : patientContext;

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to disconnect?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            oauthService.logout();
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  const getPatientName = () => {
    if (!patientData?.patient?.name?.[0]) return null;
    const name = patientData.patient.name[0];
    return name.given?.[0] || name.text || null;
  };

  // Filter results by status
  const actionNeeded = measureResults.filter(
    r => r.status === MEASURE_STATUS.DUE || r.status === MEASURE_STATUS.OVERDUE
  );
  const complete = measureResults.filter(
    r => r.status === MEASURE_STATUS.COMPLETE
  );
  const notApplicable = measureResults.filter(
    r => r.status === MEASURE_STATUS.NOT_APPLICABLE
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading your health data...</Text>
        <Text style={styles.loadingSubtext}>
          Connecting to Epic FHIR and analyzing your records
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar style="dark" />
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Unable to Load Data</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadPatientData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>HealthView</Text>
          <Text style={styles.headerSubtitle}>Your Preventive Care Dashboard</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}>
          <Text style={styles.logoutIconText}>👤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#6366F1']}
          />
        }
      >
        {/* Summary Card */}
        {summary && (
          <SummaryHeader
            summary={summary}
            patientName={getPatientName()}
          />
        )}

        {/* SDOH Personalization Banner */}
        {!sdohBannerDismissed && !sdohResult && (
          <TouchableOpacity style={styles.sdohBanner} onPress={openSDOHQuestionnaire} activeOpacity={0.8}>
            <View style={styles.sdohBannerContent}>
              <Text style={styles.sdohBannerIcon}>🎯</Text>
              <View style={styles.sdohBannerText}>
                <Text style={styles.sdohBannerTitle}>Personalize Your Care Insights</Text>
                <Text style={styles.sdohBannerSubtitle}>
                  Answer 6 quick questions to get recommendations tailored to your life.
                </Text>
              </View>
              <Text style={styles.sdohBannerArrow}>→</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* SDOH Completion Badge */}
        {sdohResult && (
          <View style={styles.sdohComplete}>
            <Text style={styles.sdohCompleteIcon}>✅</Text>
            <Text style={styles.sdohCompleteText}>
              Insights personalized to your life circumstances
              {sdohResult.needsIdentified.length > 0
                ? ` · ${sdohResult.needsIdentified.length} social need${sdohResult.needsIdentified.length > 1 ? 's' : ''} noted`
                : ''}
            </Text>
            <TouchableOpacity onPress={openSDOHQuestionnaire}>
              <Text style={styles.sdohCompleteEdit}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick-Access: Medications & Post-Discharge */}
        <View style={styles.quickAccessRow}>
          <TouchableOpacity
            style={[styles.quickCard, styles.quickCardMeds]}
            activeOpacity={0.8}
            onPress={() => {
              if (Platform.OS === 'web') document.activeElement?.blur();
              navigation.navigate('Medications', {
                patientContext: enrichedPatientContext,
                providerPhone,
              });
            }}
          >
            <Text style={styles.quickCardIcon}>💊</Text>
            <Text style={styles.quickCardTitle}>My Medications</Text>
            <Text style={styles.quickCardSub}>
              {patientData?.medications?.length
                ? `${patientData.medications.length} active`
                : 'View prescriptions'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, styles.quickCardDischarge]}
            activeOpacity={0.8}
            onPress={() => {
              if (Platform.OS === 'web') document.activeElement?.blur();
              navigation.navigate('Discharge', { providerPhone });
            }}
          >
            <Text style={styles.quickCardIcon}>🏥</Text>
            <Text style={styles.quickCardTitle}>Post-Discharge</Text>
            <Text style={styles.quickCardSub}>Follow-up & checklist</Text>
          </TouchableOpacity>
        </View>

        {/* Action Needed Section */}
        {actionNeeded.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 Action Needed</Text>
            <Text style={styles.sectionSubtitle}>
              These screenings are due or overdue
            </Text>
            {actionNeeded.map((result, index) => (
              <CareGapCard
                key={result.measure.id}
                measureResult={result}
                patientContext={enrichedPatientContext}
                providerPhone={providerPhone}
              />
            ))}
          </View>
        )}

        {/* Up to Date Section */}
        {complete.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ Up to Date</Text>
            <Text style={styles.sectionSubtitle}>
              You're current on these screenings
            </Text>
            {complete.map((result, index) => (
              <CareGapCard
                key={result.measure.id}
                measureResult={result}
                patientContext={enrichedPatientContext}
                providerPhone={providerPhone}
              />
            ))}
          </View>
        )}

        {/* Not Applicable Section */}
        {notApplicable.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>➖ Not Applicable</Text>
            <Text style={styles.sectionSubtitle}>
              These don't apply based on your age, gender, or conditions
            </Text>
            {notApplicable.map((result, index) => (
              <CareGapCard
                key={result.measure.id}
                measureResult={result}
                patientContext={enrichedPatientContext}
              />
            ))}
          </View>
        )}

        {/* SDOH FHIR Data Section */}
        {sdohFhirData && (
          <SDOHDataSection sdohFhirData={sdohFhirData} />
        )}

        {/* Educational Footer */}
        <View style={styles.educationalFooter}>
          <Text style={styles.educationalTitle}>
            💡 About These Recommendations
          </Text>
          <Text style={styles.educationalText}>
            These preventive care measures are based on guidelines from the CDC, 
            USPSTF, and CMS quality programs like HEDIS. They're designed to catch 
            health issues early when they're most treatable.
          </Text>
          <Text style={styles.educationalText}>
            Always discuss your preventive care plan with your healthcare provider, 
            as individual recommendations may vary based on your complete health history.
          </Text>
        </View>

        {/* Data Source Info */}
        <View style={styles.dataSource}>
          <Text style={styles.dataSourceText}>
            Data from Epic FHIR • Last updated: {new Date().toLocaleDateString()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 40,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 20,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  logoutButtonText: {
    color: '#6B7280',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  logoutIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIconText: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  educationalFooter: {
    backgroundColor: '#EEF2FF',
    padding: 20,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  educationalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4338CA',
    marginBottom: 12,
  },
  educationalText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 12,
  },
  dataSource: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  dataSourceText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  quickAccessRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  quickCardMeds: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  quickCardDischarge: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  quickCardIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  quickCardSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  sdohBanner: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  sdohBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sdohBannerIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  sdohBannerText: {
    flex: 1,
  },
  sdohBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4338CA',
    marginBottom: 4,
  },
  sdohBannerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  sdohBannerArrow: {
    fontSize: 20,
    color: '#6366F1',
    marginLeft: 8,
  },
  sdohComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  sdohCompleteIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  sdohCompleteText: {
    flex: 1,
    fontSize: 13,
    color: '#065F46',
  },
  sdohCompleteEdit: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '600',
  },
});

// ─── SDOH FHIR Data Section ───────────────────────────────────────────────────

const SDOHDataSection = ({ sdohFhirData }) => {
  const [expanded, setExpanded] = useState(false);

  const { socialHistory = [], surveys = [], zCodeConditions = [] } = sdohFhirData;
  const totalItems = socialHistory.length + surveys.length + zCodeConditions.length;

  if (totalItems === 0) return null;

  const renderObservation = (obs, index) => {
    const name = obs.code?.coding?.[0]?.display || obs.code?.text || 'Unknown';
    const value = obs.valueCodeableConcept?.text
      || obs.valueCodeableConcept?.coding?.[0]?.display
      || (obs.valueQuantity ? `${obs.valueQuantity.value} ${obs.valueQuantity.unit ?? ''}`.trim() : null)
      || obs.valueString
      || '—';
    const date = obs.effectiveDateTime
      ? new Date(obs.effectiveDateTime).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      : null;

    return (
      <View key={index} style={sdohStyles.dataRow}>
        <View style={sdohStyles.dataRowLeft}>
          <Text style={sdohStyles.dataName}>{name}</Text>
          {date && <Text style={sdohStyles.dataDate}>{date}</Text>}
        </View>
        <Text style={sdohStyles.dataValue}>{value}</Text>
      </View>
    );
  };

  const renderCondition = (cond, index) => {
    const name = cond.code?.coding?.[0]?.display || cond.code?.text || 'Unknown';
    const code = cond.code?.coding?.[0]?.code;
    return (
      <View key={index} style={sdohStyles.dataRow}>
        <View style={sdohStyles.dataRowLeft}>
          <Text style={sdohStyles.dataName}>{name}</Text>
          {code && <Text style={sdohStyles.dataDate}>{code}</Text>}
        </View>
        <Text style={sdohStyles.dataValue}>Documented</Text>
      </View>
    );
  };

  return (
    <View style={sdohStyles.container}>
      <TouchableOpacity
        style={sdohStyles.header}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.7}
      >
        <View style={sdohStyles.headerLeft}>
          <Text style={sdohStyles.headerIcon}>🌐</Text>
          <View>
            <Text style={sdohStyles.headerTitle}>Social Health Data from Epic</Text>
            <Text style={sdohStyles.headerSubtitle}>{totalItems} record{totalItems !== 1 ? 's' : ''} found in your chart</Text>
          </View>
        </View>
        <Text style={sdohStyles.expandIcon}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={sdohStyles.body}>
          {socialHistory.length > 0 && (
            <View style={sdohStyles.group}>
              <Text style={sdohStyles.groupTitle}>Social History</Text>
              {socialHistory.map(renderObservation)}
            </View>
          )}
          {surveys.length > 0 && (
            <View style={sdohStyles.group}>
              <Text style={sdohStyles.groupTitle}>Screening Surveys</Text>
              {surveys.map(renderObservation)}
            </View>
          )}
          {zCodeConditions.length > 0 && (
            <View style={sdohStyles.group}>
              <Text style={sdohStyles.groupTitle}>Social Conditions (Z-Codes)</Text>
              {zCodeConditions.map(renderCondition)}
            </View>
          )}
          <Text style={sdohStyles.footer}>
            Epic can store SDOH data including food security, housing, transportation,
            employment, social support, and stress — mapped to LOINC codes and ICD-10 Z-codes.
          </Text>
        </View>
      )}
    </View>
  );
};

const sdohStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  body: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
  },
  group: {
    marginBottom: 16,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dataRowLeft: {
    flex: 1,
    marginRight: 12,
  },
  dataName: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  dataDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  dataValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
    maxWidth: '40%',
  },
  footer: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default DashboardScreen;
