// SDOHScreen - Optional social determinants of health self-screening

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SDOH_QUESTIONS } from '../constants/sdohQuestions';

const SDOHScreen = ({ navigation, route }) => {
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const question = SDOH_QUESTIONS[currentIndex];
  const isLast = currentIndex === SDOH_QUESTIONS.length - 1;
  const totalAnswered = Object.keys(answers).length;

  const handleAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (answers[question.id] === undefined) {
      Alert.alert('Please answer the question', 'Select an option to continue.');
      return;
    }
    if (isLast) {
      handleSubmit();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex === 0) {
      navigation.goBack();
    } else {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Questionnaire?',
      'You can always complete this later from the dashboard to help personalize your care insights.',
      [
        { text: 'Continue Questionnaire', style: 'cancel' },
        {
          text: 'Skip for Now',
          onPress: () => {
            const onComplete = route.params?.onComplete;
            if (onComplete) onComplete(null);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleSubmit = () => {
    // Build a summary of needs identified
    const needs = SDOH_QUESTIONS
      .filter(q => answers[q.id] !== undefined && answers[q.id] >= q.riskThreshold)
      .map(q => q.category);

    const result = {
      answers,
      needsIdentified: needs,
      completedAt: new Date().toISOString(),
    };

    const onComplete = route.params?.onComplete;
    if (onComplete) onComplete(result);
    navigation.goBack();
  };

  const progressPercent = Math.round(((currentIndex) / SDOH_QUESTIONS.length) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Background</Text>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Intro banner (only on first question) */}
        {currentIndex === 0 && (
          <View style={styles.introBanner}>
            <Text style={styles.introIcon}>✨</Text>
            <View style={styles.introTextContainer}>
              <Text style={styles.introTitle}>Personalize Your Care</Text>
              <Text style={styles.introSubtitle}>
                These 6 quick questions help us tailor your health insights to your real-life situation.
                Your answers are private and never shared.
              </Text>
            </View>
          </View>
        )}

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.progressText}>
            Question {currentIndex + 1} of {SDOH_QUESTIONS.length}
          </Text>
        </View>

        {/* Question card */}
        <View style={styles.questionCard}>
          <View style={styles.categoryRow}>
            <Text style={styles.questionIcon}>{question.icon}</Text>
            <Text style={styles.categoryText}>{question.category}</Text>
          </View>
          <Text style={styles.questionText}>{question.question}</Text>

          {/* Answer options */}
          <View style={styles.optionsContainer}>
            {question.options.map((option) => {
              const selected = answers[question.id] === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.optionButton, selected && styles.optionSelected]}
                  onPress={() => handleAnswer(question.id, option.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.optionRadio, selected && styles.optionRadioSelected]}>
                    {selected && <View style={styles.optionRadioDot} />}
                  </View>
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Navigation button */}
        <TouchableOpacity
          style={[
            styles.nextButton,
            answers[question.id] === undefined && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            {isLast ? 'See My Personalized Insights' : 'Next Question'}
          </Text>
        </TouchableOpacity>

        {/* Privacy note */}
        <Text style={styles.privacyNote}>
          🔒 Your responses are stored only on your device and used solely to personalize your care recommendations.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    paddingVertical: 4,
  },
  backText: {
    fontSize: 15,
    color: '#6366F1',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  skipText: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  introBanner: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  introIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  introTextContainer: {
    flex: 1,
  },
  introTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4338CA',
    marginBottom: 6,
  },
  introSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  questionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionIcon: {
    fontSize: 28,
    marginRight: 10,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366F1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 26,
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  optionSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioSelected: {
    borderColor: '#6366F1',
  },
  optionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366F1',
  },
  optionLabel: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  optionLabelSelected: {
    color: '#4338CA',
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  nextButtonDisabled: {
    backgroundColor: '#C7D2FE',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  privacyNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default SDOHScreen;
