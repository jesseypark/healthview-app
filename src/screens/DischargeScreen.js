// DischargeScreen — Post-discharge summary, medications, and follow-up checklist

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

const DischargeScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [encounters, setEncounters] = useState([]);
  const [medications, setMedications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [carePlans, setCarePlans] = useState([]);
  const [error, setError] = useState(null);

  const providerPhone = route.params?.providerPhone ?? null;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      const [encs, meds, docs, plans] = await Promise.allSettled([
        fhirService.getEncounters(),
        fhirService.getMedications(),
        fhirService.getDocumentReferences(),
        fhirService.getCarePlans(),
      ]);
      const settled = (r) => (r.status === 'fulfilled' ? r.value : []);
      setEncounters(settled(encs));
      setMedications(settled(meds));
      setDocuments(settled(docs));
      setCarePlans(settled(plans));
    } catch (err) {
      setError(err.message || 'Failed to load discharge data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading discharge records...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <StatusBar style="dark" />
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Could Not Load Records</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Most recent encounter first (already sorted by Epic's _sort=-date)
  const mostRecent = encounters[0] ?? null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Post-Discharge Care</Text>
          <Text style={styles.headerSubtitle}>
            {encounters.length > 0
              ? `${encounters.length} hospital stay${encounters.length !== 1 ? 's' : ''} on record`
              : 'No recent hospital stays'}
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
        {encounters.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏥</Text>
            <Text style={styles.emptyTitle}>No Inpatient Stays Found</Text>
            <Text style={styles.emptyText}>
              No completed hospital stays were found in your Epic record. This section will show
              post-discharge summaries and follow-up guidance after a hospital visit.
            </Text>
          </View>
        ) : (
          <>
            {/* Most recent discharge summary */}
            {mostRecent && (
              <DischargeCard
                encounter={mostRecent}
                medications={medications}
                documents={documents}
                carePlans={carePlans}
                providerPhone={providerPhone}
                isLatest
              />
            )}

            {/* Prior encounters */}
            {encounters.slice(1).map((enc, index) => (
              <DischargeCard
                key={enc.id || index}
                encounter={enc}
                medications={[]}
                providerPhone={providerPhone}
                isLatest={false}
              />
            ))}
          </>
        )}

        {/* Post-discharge general guidance */}
        {encounters.length > 0 && (
          <PostDischargeChecklist providerPhone={providerPhone} />
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Discharge records sourced from Epic FHIR. Always follow your care team's specific
            discharge instructions. Call your provider if you have concerns after leaving the hospital.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Discharge Encounter Card ─────────────────────────────────────────────────

const DischargeCard = ({ encounter, medications, documents = [], carePlans = [], providerPhone, isLatest }) => {
  const [expanded, setExpanded] = useState(isLatest); // auto-expand most recent

  const admitDate = encounter.period?.start
    ? new Date(encounter.period.start)
    : null;
  const dischargeDate = encounter.period?.end
    ? new Date(encounter.period.end)
    : null;

  const formatDate = (d) =>
    d
      ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : 'Unknown';

  const lengthOfStay = admitDate && dischargeDate
    ? Math.round((dischargeDate - admitDate) / (1000 * 60 * 60 * 24))
    : null;

  const classCode = encounter.class?.code ?? '';
  const classLabel =
    classCode === 'IMP' ? 'Inpatient' :
    classCode === 'EMER' ? 'Emergency' :
    classCode === 'ACUTE' ? 'Acute Care' : 'Hospital Stay';

  const diagnoses = (encounter.reasonCode ?? []).map(
    rc => rc.text || rc.coding?.[0]?.display
  ).filter(Boolean);

  const encDiagnoses = (encounter.diagnosis ?? []).map(
    d => d.condition?.display || d.use?.coding?.[0]?.display
  ).filter(Boolean);

  const allDiagnoses = [...new Set([...diagnoses, ...encDiagnoses])];

  const dischargeDisposition =
    encounter.hospitalization?.dischargeDisposition?.text ||
    encounter.hospitalization?.dischargeDisposition?.coding?.[0]?.display ||
    null;

  return (
    <TouchableOpacity
      style={[styles.card, isLatest && styles.cardLatest]}
      onPress={() => setExpanded(e => !e)}
      activeOpacity={0.7}
    >
      {/* Card header */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>🏥</Text>
        <View style={styles.cardTitleBlock}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>{classLabel}</Text>
            {isLatest && (
              <View style={styles.latestBadge}>
                <Text style={styles.latestBadgeText}>Most Recent</Text>
              </View>
            )}
          </View>
          <Text style={styles.cardDateRange}>
            {formatDate(admitDate)} — {formatDate(dischargeDate)}
            {lengthOfStay !== null ? `  ·  ${lengthOfStay} day${lengthOfStay !== 1 ? 's' : ''}` : ''}
          </Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />

          {/* Diagnoses */}
          {allDiagnoses.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reason for Visit</Text>
              {allDiagnoses.map((dx, i) => (
                <View key={i} style={styles.listRow}>
                  <Text style={styles.listDot}>•</Text>
                  <Text style={styles.listText}>{dx}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Discharge disposition */}
          {dischargeDisposition && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Discharged To</Text>
              <Text style={styles.bodyText}>{dischargeDisposition}</Text>
            </View>
          )}

          {/* Discharge medications (only on most recent card) */}
          {isLatest && medications.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Medications</Text>
              <Text style={styles.sectionHint}>
                Active prescriptions at the time of discharge
              </Text>
              {medications.slice(0, 5).map((med, i) => {
                const name = fhirService.getMedicationName(med);
                const dosage = fhirService.getMedicationDosage(med);
                return (
                  <View key={i} style={styles.medRow}>
                    <Text style={styles.medName}>{name}</Text>
                    {dosage && <Text style={styles.medDosage}>{dosage}</Text>}
                  </View>
                );
              })}
              {medications.length > 5 && (
                <Text style={styles.moreText}>+{medications.length - 5} more — see Medications tab</Text>
              )}
            </View>
          )}

          {/* Discharge summary documents */}
          {isLatest && documents.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Discharge Documents</Text>
              {documents.map((doc, i) => {
                const title = doc.description || doc.type?.coding?.[0]?.display || doc.type?.text || 'Clinical Document';
                const date = doc.date
                  ? new Date(doc.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                  : null;
                const status = doc.status ?? null;
                return (
                  <View key={i} style={styles.docRow}>
                    <Text style={styles.docIcon}>📄</Text>
                    <View style={styles.docContent}>
                      <Text style={styles.docTitle}>{title}</Text>
                      {date && <Text style={styles.docMeta}>{date}{status ? ` · ${status}` : ''}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Active care plans */}
          {isLatest && carePlans.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Active Care Plans</Text>
              {carePlans.map((plan, i) => {
                const title = plan.title || plan.description || plan.category?.[0]?.text || plan.category?.[0]?.coding?.[0]?.display || 'Care Plan';
                const period = plan.period?.end
                  ? `Through ${new Date(plan.period.end).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}`
                  : null;
                return (
                  <View key={i} style={styles.docRow}>
                    <Text style={styles.docIcon}>📋</Text>
                    <View style={styles.docContent}>
                      <Text style={styles.docTitle}>{title}</Text>
                      {period && <Text style={styles.docMeta}>{period}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Call provider */}
          {isLatest && (
            <TouchableOpacity
              style={[styles.callButton, !providerPhone && styles.callButtonDisabled]}
              onPress={() => providerPhone && Linking.openURL(`tel:${providerPhone}`)}
              disabled={!providerPhone}
            >
              <Text style={styles.callButtonText}>📞 Call Provider's Office</Text>
              <Text style={styles.callButtonSub}>
                {providerPhone ? providerPhone : 'Contact your care team'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text style={styles.expandIndicator}>
        {expanded ? '▲ Tap to collapse' : '▼ Tap to expand'}
      </Text>
    </TouchableOpacity>
  );
};

// ─── Post-Discharge Checklist ─────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  {
    icon: '📋',
    title: 'Review discharge instructions',
    detail: 'Read all written instructions from the hospital. Keep them accessible for follow-up calls.',
  },
  {
    icon: '💊',
    title: 'Fill all prescriptions',
    detail: 'Get new or changed medications filled right away. Do not skip doses.',
  },
  {
    icon: '📅',
    title: 'Schedule follow-up appointment',
    detail: 'Most patients should see their primary care provider within 7–14 days of discharge.',
  },
  {
    icon: '⚠️',
    title: 'Know your warning signs',
    detail: 'Call your provider or go to the ER if symptoms worsen, you have a fever, or experience new chest pain or shortness of breath.',
  },
  {
    icon: '🔄',
    title: 'Reconcile your medications',
    detail: 'Compare all medications — new, continued, and discontinued — with your provider at your follow-up visit.',
  },
  {
    icon: '🍎',
    title: 'Follow activity & diet restrictions',
    detail: 'Stick to any lifting limits, dietary changes, or wound care instructions given at discharge.',
  },
];

const PostDischargeChecklist = ({ providerPhone }) => {
  const [expanded, setExpanded] = useState(true);
  const [checked, setChecked] = useState({});

  const toggleCheck = (index) => {
    setChecked(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const completedCount = Object.values(checked).filter(Boolean).length;

  return (
    <View style={styles.checklist}>
      <TouchableOpacity
        style={styles.checklistHeader}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.7}
      >
        <View style={styles.checklistHeaderLeft}>
          <Text style={styles.checklistIcon}>✅</Text>
          <View>
            <Text style={styles.checklistTitle}>Post-Discharge Checklist</Text>
            <Text style={styles.checklistSubtitle}>
              {completedCount} of {CHECKLIST_ITEMS.length} completed
            </Text>
          </View>
        </View>
        <Text style={styles.expandIcon}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${(completedCount / CHECKLIST_ITEMS.length) * 100}%` },
          ]}
        />
      </View>

      {expanded && (
        <View style={styles.checklistBody}>
          {CHECKLIST_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.checkItem}
              onPress={() => toggleCheck(index)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, checked[index] && styles.checkboxChecked]}>
                {checked[index] && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.checkItemContent}>
                <View style={styles.checkItemHeader}>
                  <Text style={styles.checkItemIcon}>{item.icon}</Text>
                  <Text style={[styles.checkItemTitle, checked[index] && styles.checkItemTitleDone]}>
                    {item.title}
                  </Text>
                </View>
                <Text style={styles.checkItemDetail}>{item.detail}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {providerPhone && (
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => Linking.openURL(`tel:${providerPhone}`)}
            >
              <Text style={styles.callButtonText}>📞 Call Provider to Schedule Follow-Up</Text>
              <Text style={styles.callButtonSub}>{providerPhone}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
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
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  errorText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  retryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
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
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  backArrow: { fontSize: 22, color: '#6366F1', fontWeight: '600' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  headerRight: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    borderLeftColor: '#9CA3AF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLatest: {
    borderLeftColor: '#F59E0B',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardIcon: { fontSize: 24, marginRight: 12 },
  cardTitleBlock: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  latestBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  latestBadgeText: { fontSize: 11, fontWeight: '600', color: '#92400E' },
  cardDateRange: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  expandedContent: { marginTop: 12 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginBottom: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  sectionHint: { fontSize: 12, color: '#9CA3AF', marginBottom: 8 },
  bodyText: { fontSize: 14, color: '#4B5563' },
  listRow: { flexDirection: 'row', marginBottom: 4 },
  listDot: { fontSize: 14, color: '#6B7280', marginRight: 8, marginTop: 1 },
  listText: { fontSize: 14, color: '#4B5563', flex: 1, lineHeight: 20 },
  medRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  medName: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  medDosage: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  moreText: { fontSize: 12, color: '#6366F1', marginTop: 8 },
  docRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  docIcon: { fontSize: 16, marginRight: 10, marginTop: 1 },
  docContent: { flex: 1 },
  docTitle: { fontSize: 13, fontWeight: '600', color: '#1F2937' },
  docMeta: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  callButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  callButtonDisabled: { backgroundColor: '#E5E7EB' },
  callButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  callButtonSub: { color: '#C7D2FE', fontSize: 12, marginTop: 3 },
  expandIndicator: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 12 },
  checklist: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  checklistHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  checklistIcon: { fontSize: 24, marginRight: 12 },
  checklistTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  checklistSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  expandIcon: { fontSize: 12, color: '#9CA3AF' },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  checklistBody: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  checkItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    marginTop: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkmark: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  checkItemContent: { flex: 1 },
  checkItemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  checkItemIcon: { fontSize: 16, marginRight: 6 },
  checkItemTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  checkItemTitleDone: { color: '#9CA3AF', textDecorationLine: 'line-through' },
  checkItemDetail: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  footer: {
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    marginTop: 8,
  },
  footerText: { fontSize: 12, color: '#4338CA', lineHeight: 18, textAlign: 'center' },
});

export default DischargeScreen;
