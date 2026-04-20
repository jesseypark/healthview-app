// Avatar component with gradient background and white initials

import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const GRADIENT_PRESETS = {
  blue: ['#3B82F6', '#1D4ED8'],
  purple: ['#8B5CF6', '#6D28D9'],
  teal: ['#14B8A6', '#0D9488'],
  indigo: ['#6366F1', '#4338CA'],
  rose: ['#F43F5E', '#E11D48'],
};

const Avatar = ({ initials, size = 48, gradient = 'blue', style }) => {
  const colors = GRADIENT_PRESETS[gradient] || GRADIENT_PRESETS.blue;
  const fontSize = size * 0.4;
  const borderRadius = size / 2;

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        { width: size, height: size, borderRadius },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1,
  },
});

export default Avatar;
