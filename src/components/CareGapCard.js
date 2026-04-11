// CareGapCard Component - Displays a single quality measure status

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MEASURE_STATUS, getStatusDisplay } from '../constants/qualityMeasures';
import aiService from '../services/aiService';

const CareGapCard = ({ measureResult, patientContext, onPress }) => {
  const [expanded, setExpanded] = useState(false);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loading, setLoading] = useState(false);

  const { measure, status, reason, lastCompleted, value, details } = measureResult;
  const statusDisplay = getStatusDisplay(status);

  const handlePress = async () => {
    setExpanded(!expanded);
    
    // Fetch AI explanation when expanding (only once)
    if (!expanded && !aiExplanation && status !== MEASURE_STATUS.NOT_APPLICABLE) {
      setLoading(true);
      try {
        const explanation = await aiService.explainCareGap(measureResult, patientContext);
        setAiExplanation(explanation);
      } catch (error) {
        console.error('Error getting AI explanation:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const isActionNeeded = status === MEASURE_STATUS.DUE || status === MEASURE_STATUS.OVERDUE;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isActionNeeded && styles.cardActionNeeded,
        status === MEASURE_STATUS.COMPLETE && styles.cardComplete,
        status === MEASURE_STATUS.NOT_APPLICABLE && styles.cardNA,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.statusIcon}>{statusDisplay.icon}</Text>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{measure.shortName}</Text>
            <Text style={styles.subtitle}>{measure.name}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusDisplay.color + '20' }]}>
          <Text style={[styles.statusText, { color: statusDisplay.color }]}>
            {statusDisplay.label}
          </Text>
        </View>
      </View>

      {/* Reason line */}
      <Text style={styles.reason}>{reason}</Text>

      {/* Value display for completed measures */}
      {status === MEASURE_STATUS.COMPLETE && value && (
        <View style={styles.valueContainer}>
          <Text style={styles.valueLabel}>Result:</Text>
          <Text style={styles.valueText}>{value}</Text>
        </View>
      )}

      {/* Expanded content */}
      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />
          
          {/* Why it matters */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why This Matters</Text>
            <Text style={styles.sectionText}>{measure.whyItMatters}</Text>
          </View>

          {/* Recommended frequency */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommended Frequency</Text>
            <Text style={styles.sectionText}>{measure.frequency}</Text>
          </View>

          {/* AI Explanation */}
          {status !== MEASURE_STATUS.NOT_APPLICABLE && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💬 Personalized Insight</Text>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#6366F1" />
                  <Text style={styles.loadingText}>Getting personalized explanation...</Text>
                </View>
              ) : aiExplanation ? (
                <Text style={styles.aiText}>{aiExplanation}</Text>
              ) : null}
            </View>
          )}

          {/* Action button for due measures */}
          {isActionNeeded && (
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Find a Provider</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Expand indicator */}
      <Text style={styles.expandIndicator}>
        {expanded ? '▲ Tap to collapse' : '▼ Tap for details'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardActionNeeded: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  cardComplete: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  cardNA: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reason: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
    marginLeft: 36,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 36,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  valueLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 6,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
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
  actionButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  expandIndicator: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
  },
});

export default CareGapCard;
