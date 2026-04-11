// SummaryHeader Component - Shows overall care gap summary

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const SummaryHeader = ({ summary, patientName }) => {
  const { complete, due, overdue, total, percentComplete } = summary;
  const actionNeeded = due + overdue;

  return (
    <View style={styles.container}>
      {/* Greeting */}
      <Text style={styles.greeting}>
        Hello, {patientName || 'there'}! 👋
      </Text>
      
      {/* Main stat */}
      <View style={styles.mainStatContainer}>
        <View style={styles.percentCircle}>
          <Text style={styles.percentText}>{percentComplete}%</Text>
        </View>
        <View style={styles.mainStatText}>
          <Text style={styles.mainStatTitle}>Preventive Care Score</Text>
          <Text style={styles.mainStatSubtitle}>
            {complete} of {total} recommended screenings up to date
          </Text>
        </View>
      </View>

      {/* Action summary */}
      {actionNeeded > 0 && (
        <View style={styles.actionBanner}>
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>
            {actionNeeded} {actionNeeded === 1 ? 'screening needs' : 'screenings need'} your attention
          </Text>
        </View>
      )}

      {actionNeeded === 0 && (
        <View style={styles.successBanner}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successText}>
            You're all caught up on your preventive care!
          </Text>
        </View>
      )}

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>{complete}</Text>
          <Text style={styles.statLabel}>Complete</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{due}</Text>
          <Text style={styles.statLabel}>Due</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#EF4444' }]}>{overdue}</Text>
          <Text style={styles.statLabel}>Overdue</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
  },
  mainStatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  percentCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  percentText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  mainStatText: {
    flex: 1,
  },
  mainStatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  mainStatSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  successIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  successText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#065F46',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
});

export default SummaryHeader;
