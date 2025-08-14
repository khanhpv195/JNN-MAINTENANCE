import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isDateInAllowedRange, getDateHeaderText } from '../../utils/calendarUtils';

const CalendarHeader = ({ 
  selectedDate, 
  onDateSelect,
  onClearSelection,
  showAllTasks = false,
  taskCount = 0 
}) => {
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const currentDate = selectedDate || new Date();
  
  // Year range limitation (2025-2026)
  const allowedYears = [2025, 2026];
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevYear = () => {
    if (currentYear > allowedYears[0]) {
      const newDate = new Date(currentDate);
      newDate.setFullYear(currentYear - 1);
      if (isDateInAllowedRange(newDate)) {
        onDateSelect(newDate);
      }
    }
  };

  const handleNextYear = () => {
    if (currentYear < allowedYears[allowedYears.length - 1]) {
      const newDate = new Date(currentDate);
      newDate.setFullYear(currentYear + 1);
      if (isDateInAllowedRange(newDate)) {
        onDateSelect(newDate);
      }
    }
  };

  const handleMonthSelect = (monthIndex) => {
    const newDate = new Date(currentYear, monthIndex, 1);
    if (isDateInAllowedRange(newDate)) {
      onDateSelect(newDate);
    }
    setShowMonthPicker(false);
  };

  const handleClearSelection = () => {
    if (onClearSelection) {
      onClearSelection();
    }
  };

  const getDisplayText = () => {
    if (showAllTasks || !selectedDate) {
      return `All Tasks${taskCount > 0 ? ` (${taskCount})` : ''}`;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateNormalized = new Date(selectedDate);
    selectedDateNormalized.setHours(0, 0, 0, 0);
    
    const isToday = selectedDateNormalized.getTime() === today.getTime();
    return getDateHeaderText(selectedDate, isToday) + (taskCount > 0 ? ` (${taskCount})` : '');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Main display text */}
        <TouchableOpacity 
          style={styles.titleContainer}
          onPress={() => setShowMonthPicker(true)}
        >
          <Text style={styles.titleText}>{getDisplayText()}</Text>
          <Ionicons name="chevron-down" size={20} color="#00BFA6" />
        </TouchableOpacity>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          {(selectedDate && !showAllTasks) && (
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={handleClearSelection}
            >
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.todayButton}
            onPress={() => onDateSelect(new Date())}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Month/Year Picker Modal */}
      <Modal
        visible={showMonthPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          onPress={() => setShowMonthPicker(false)}
        >
          <View style={styles.modalContent}>
            {/* Year Navigation */}
            <View style={styles.yearNavigation}>
              <TouchableOpacity 
                style={[
                  styles.yearButton,
                  currentYear <= allowedYears[0] && styles.yearButtonDisabled
                ]}
                onPress={handlePrevYear}
                disabled={currentYear <= allowedYears[0]}
              >
                <Ionicons 
                  name="chevron-back" 
                  size={24} 
                  color={currentYear <= allowedYears[0] ? "#ccc" : "#00BFA6"} 
                />
              </TouchableOpacity>
              
              <Text style={styles.yearText}>{currentYear}</Text>
              
              <TouchableOpacity 
                style={[
                  styles.yearButton,
                  currentYear >= allowedYears[allowedYears.length - 1] && styles.yearButtonDisabled
                ]}
                onPress={handleNextYear}
                disabled={currentYear >= allowedYears[allowedYears.length - 1]}
              >
                <Ionicons 
                  name="chevron-forward" 
                  size={24} 
                  color={currentYear >= allowedYears[allowedYears.length - 1] ? "#ccc" : "#00BFA6"} 
                />
              </TouchableOpacity>
            </View>

            {/* Month Grid */}
            <ScrollView style={styles.monthGrid}>
              <View style={styles.monthRow}>
                {months.map((month, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.monthButton,
                      currentMonth === index && styles.selectedMonthButton
                    ]}
                    onPress={() => handleMonthSelect(index)}
                  >
                    <Text style={[
                      styles.monthButtonText,
                      currentMonth === index && styles.selectedMonthButtonText
                    ]}>
                      {month}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => {
                  handleClearSelection();
                  setShowMonthPicker(false);
                }}
              >
                <Text style={styles.quickActionText}>View All Tasks</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.quickActionButton, styles.primaryQuickAction]}
                onPress={() => {
                  onDateSelect(new Date());
                  setShowMonthPicker(false);
                }}
              >
                <Text style={[styles.quickActionText, styles.primaryQuickActionText]}>Go to Today</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e6f7f5',
  },
  todayButtonText: {
    fontSize: 14,
    color: '#00BFA6',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    maxHeight: Dimensions.get('window').height * 0.8,
  },
  yearNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  yearButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  yearButtonDisabled: {
    backgroundColor: '#f9f9f9',
  },
  yearText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  monthGrid: {
    maxHeight: 300,
  },
  monthRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthButton: {
    width: '30%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
  },
  selectedMonthButton: {
    backgroundColor: '#00BFA6',
  },
  monthButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  selectedMonthButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  primaryQuickAction: {
    backgroundColor: '#00BFA6',
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  primaryQuickActionText: {
    color: '#ffffff',
  },
});

export default CalendarHeader;