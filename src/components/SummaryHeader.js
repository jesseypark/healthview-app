// SummaryHeader Component - Shows greeting and action-needed banner

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const SummaryHeader = ({ summary, patientName, onActionPress }) => {
  const { due, overdue } = summary;
  const actionNeeded = due + overdue;

  return (
    <View style={styles.container}>
      {/* Greeting */}
      <Text style={styles.greeting}>
        Hello, {patientName || 'there'}! 👋
      </Text>

      {/* Action banner or all-clear */}
      {actionNeeded > 0 ? (
        <TouchableOpacity style={styles.actionBanner} onPress={onActionPress} activeOpacity={0.7}>
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>
            {actionNeeded} {actionNeeded === 1 ? 'screening needs' : 'screenings need'} your attention
          </Text>
          <Text style={styles.actionArrow}>↓</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.successBanner}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successText}>
            You're all caught up on your preventive care!
          </Text>
        </View>
      )}
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
    marginBottom: 16,
  },
  actionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 12,
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
  actionArrow: {
    fontSize: 18,
    color: '#92400E',
    fontWeight: '600',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: 14,
    borderRadius: 12,
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
});

export default SummaryHeader;
