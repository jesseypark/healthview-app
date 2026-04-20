// MedicationsScreen — Active medications, dosage details, and refill requests

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import fhirService from '../services/fhirService';
import aiService from '../services/aiService';


const MedicationsScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [medications, setMedications] = useState([]);
  const [dispenses, setDispenses] = useState([]);
  const [error, setError] = useState(null);

  // Optional: patient context passed from Dashboard for AI explanations
  const patientContext = route.params?.patientContext ?? null;
  const providerPhone = route.params?.providerPhone ?? null;

  useEffect(() => {
    loadMedications();
  }, []);

  const loadMedications = async () => {
    try {
      setError(null);
      const [meds, disps] = await Promise.all([
        fhirService.getMedications(),
        fhirService.getMedicationDispenses(),
      ]);
      setMedications(meds);
      setDispenses(disps);
    } catch (err) {
      setError(err.message || 'Failed to load medications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMedications();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading medications...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    const is403 = error.includes('403');
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar style="dark" />
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Could Not Load Medications</Text>
        <Text style={styles.errorText}>
          {is403
            ? 'Access denied (403). Your current session may not include the medication scope. Log out and sign in again to refresh your permissions.'
            : error}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadMedications}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Medications</Text>
          <Text style={styles.headerSubtitle}>
            {medications.length} active prescription{medications.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />
        }
      >
        {medications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💊</Text>
            <Text style={styles.emptyTitle}>No Active Medications Found</Text>
            <Text style={styles.emptyText}>
              No active medication requests were found in your Epic record. If you believe this is
              incorrect, contact your provider's office.
            </Text>
          </View>
        ) : (
          medications.map((med, index) => (
            <MedicationCard
              key={med.id || index}
              med={med}
              allMedications={medications}
              dispenses={dispenses}
              patientContext={patientContext}
              providerPhone={providerPhone}
            />
          ))
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Medications sourced from Epic FHIR. Always follow your provider's instructions. For
            urgent medication questions, contact your pharmacist or provider directly.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Individual Medication Card ───────────────────────────────────────────────

// Extract a generic search-friendly drug name from the FHIR medication name
const getGenericName = (medName) =>
  medName.replace(/\s*[\[(].*?[\])]\s*/g, '').split(/\s+/)[0].replace(/-/g, ' ');

// Build a DailyMed (NIH/NLM) search URL
const getDailyMedUrl = (medName) => {
  return `https://dailymed.nlm.nih.gov/dailymed/search.cfm?labeltype=all&query=${encodeURIComponent(getGenericName(medName))}`;
};

const MedicationCard = ({ med, allMedications, dispenses, patientContext, providerPhone }) => {
  const [expanded, setExpanded] = useState(false);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);

  const name = fhirService.getMedicationName(med);
  const dosage = fhirService.getMedicationDosage(med);
  const prescriber = med.requester?.display ?? null;
  const authoredOn = med.authoredOn
    ? new Date(med.authoredOn).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  const refillsAllowed = med.dispenseRequest?.numberOfRepeatsAllowed ?? null;
  const validityEnd = med.dispenseRequest?.validityPeriod?.end
    ? new Date(med.dispenseRequest.validityPeriod.end).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  // Find the most recent dispense (refill) for this medication
  const lastRefillDate = React.useMemo(() => {
    if (!dispenses || dispenses.length === 0) return null;
    // Match dispenses to this medication by reference or name
    const medRef = `MedicationRequest/${med.id}`;
    const matching = dispenses.filter(d => {
      if (d.authorizingPrescription?.some(p => p.reference === medRef)) return true;
      // Fallback: match by medication name
      const dispName = d.medicationCodeableConcept?.text
        || d.medicationCodeableConcept?.coding?.[0]?.display
        || '';
      return dispName && name.toLowerCase().includes(dispName.toLowerCase().split(' ')[0]);
    });
    if (matching.length === 0) return null;
    // Sort by whenHandedOver or whenPrepared, most recent first
    matching.sort((a, b) => {
      const dateA = new Date(a.whenHandedOver || a.whenPrepared || 0);
      const dateB = new Date(b.whenHandedOver || b.whenPrepared || 0);
      return dateB - dateA;
    });
    const date = matching[0].whenHandedOver || matching[0].whenPrepared;
    return date
      ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : null;
  }, [med.id, name, dispenses]);

  const handleExpand = async () => {
    setExpanded(e => !e);
    if (!expanded && !aiExplanation) {
      setAiLoading(true);
      try {
        const allMedNames = allMedications.map(m => fhirService.getMedicationName(m));
        const explanation = await aiService.explainMedication(name, dosage, patientContext, allMedNames);
        setAiExplanation(explanation);
      } catch {
        // silent — no explanation shown
      } finally {
        setAiLoading(false);
      }
    }
  };

  const handleRefillRequest = () => {
    if (providerPhone) {
      Linking.openURL(`tel:${providerPhone}`);
    }
  };

  const handleLearnMore = () => {
    Linking.openURL(getDailyMedUrl(name));
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handleExpand} activeOpacity={0.7}>
      {/* Card header */}
      <View style={styles.cardHeader}>
        <View style={styles.pillIcon}>
          <Text style={styles.pillIconText}>💊</Text>
        </View>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle}>{name}</Text>
          {dosage && <Text style={styles.cardDosage}>{dosage}</Text>}
        </View>
        <View style={styles.activeBadge}>
          <Text style={styles.activeBadgeText}>Active</Text>
        </View>
      </View>

      {/* Meta row */}
      <View style={styles.metaRow}>
        {prescriber && (
          <Text style={styles.metaText}>Prescribed by {prescriber}</Text>
        )}
        {authoredOn && (
          <Text style={styles.metaText}>Since {authoredOn}</Text>
        )}
        {lastRefillDate && (
          <Text style={styles.metaText}>Last refill {lastRefillDate}</Text>
        )}
      </View>

      {/* Expanded content */}
      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />

          {/* Dispense details */}
          {(refillsAllowed !== null || validityEnd || lastRefillDate) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prescription Details</Text>
              {refillsAllowed !== null && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Refills allowed</Text>
                  <Text style={styles.detailValue}>{refillsAllowed}</Text>
                </View>
              )}
              {validityEnd && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Valid through</Text>
                  <Text style={styles.detailValue}>{validityEnd}</Text>
                </View>
              )}
              {lastRefillDate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Last refill</Text>
                  <Text style={styles.detailValue}>{lastRefillDate}</Text>
                </View>
              )}
            </View>
          )}

          {/* AI explanation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✨ Personalized AI Insights</Text>
            {aiLoading ? (
              <View style={styles.aiLoading}>
                <ActivityIndicator size="small" color="#6366F1" />
                <Text style={styles.aiLoadingText}>Getting personalized insight...</Text>
              </View>
            ) : aiExplanation ? (
              <>
                <Text style={styles.aiText}>{aiExplanation}</Text>
                <Text style={styles.aiDisclaimer}>AI-generated content may not be accurate. Verify with your care team.</Text>
              </>
            ) : null}
          </View>

          {/* Learn more link */}
          <TouchableOpacity style={styles.learnMoreButton} onPress={handleLearnMore}>
            <Text style={styles.learnMoreText}>📖 Learn more on DailyMed (NIH)</Text>
          </TouchableOpacity>

          {/* Refill request */}
          <TouchableOpacity
            style={[styles.refillButton, !providerPhone && styles.refillButtonDisabled]}
            onPress={handleRefillRequest}
            disabled={!providerPhone}
          >
            <Text style={styles.refillButtonText}>📞 Request Refill</Text>
            <Text style={styles.refillButtonSub}>
              {providerPhone ? providerPhone : 'Call your provider\'s office'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.expandIndicator}>
        {expanded ? '▲ Tap to collapse' : '▼ Tap for details & refill'}
      </Text>
    </TouchableOpacity>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
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
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: '#6366F1',
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pillIcon: {
    marginRight: 12,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillIconText: {
    fontSize: 24,
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  cardDosage: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 3,
    lineHeight: 18,
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginLeft: 36,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  expandedContent: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  aiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  aiLoadingText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#6B7280',
  },
  aiText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  aiDisclaimer: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
    fontStyle: 'italic',
  },
  learnMoreButton: {
    backgroundColor: '#F0F9FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
  },
  learnMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  refillButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  refillButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  refillButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  refillButtonSub: {
    color: '#C7D2FE',
    fontSize: 12,
    marginTop: 3,
  },
  expandIndicator: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
  },
  footer: {
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#4338CA',
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default MedicationsScreen;
