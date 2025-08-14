import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { processTimelineData, VIEW_MODES } from '../../utils/timelineUtils';
import { EnhancedDateGroup } from './DateGroup';
import { groupTasksByDate, getTodayDate } from '../../utils/timelineUtils';

const TimelineTaskList = ({ 
  tasks = [],
  selectedDate,
  onTaskPress,
  loading = false,
  onRefresh,
  refreshing = false
}) => {
  // Process timeline data with clean architecture
  const timelineData = processTimelineData(tasks, selectedDate);
  const { tasks: processedTasks, viewMode, isEmpty, emptyMessage } = timelineData;

  // Group tasks by date for timeline display
  const groupedTasks = groupTasksByDate(processedTasks);

  const getViewModeText = () => {
    switch (viewMode) {
      case VIEW_MODES.TODAY_ONLY:
        return 'Today\'s Tasks';
      case VIEW_MODES.DATE_FILTER:
        return 'Filtered Tasks';
      case VIEW_MODES.ALL_UPCOMING:
      default:
        return 'All Upcoming Tasks';
    }
  };

  const renderViewModeInfo = () => (
    <View style={styles.viewModeInfo}>
      <View style={styles.viewModeIndicator}>
        <Ionicons 
          name={getViewModeIcon()} 
          size={16} 
          color="#00BFA6" 
        />
        <Text style={styles.viewModeText}>{getViewModeText()}</Text>
      </View>
      <Text style={styles.taskCountText}>
        {processedTasks.length} {processedTasks.length === 1 ? 'task' : 'tasks'}
      </Text>
    </View>
  );

  const getViewModeIcon = () => {
    switch (viewMode) {
      case VIEW_MODES.TODAY_ONLY:
        return 'today-outline';
      case VIEW_MODES.DATE_FILTER:
        return 'calendar-outline';
      case VIEW_MODES.ALL_UPCOMING:
      default:
        return 'list-outline';
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons 
        name="calendar-outline" 
        size={64} 
        color="#CCCCCC" 
      />
      <Text style={styles.emptyTitle}>{emptyMessage.title}</Text>
      <Text style={styles.emptySubtitle}>{emptyMessage.subtitle}</Text>
      
      {viewMode === VIEW_MODES.DATE_FILTER && (
        <View style={styles.emptyActions}>
          <Text style={styles.emptyActionText}>
            Try selecting a different date or view all tasks
          </Text>
        </View>
      )}
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#00BFA6" />
      <Text style={styles.loadingText}>Loading tasks...</Text>
    </View>
  );

  const renderDateGroup = ({ item: dateGroup }) => {
    const today = getTodayDate();
    const isToday = dateGroup.date.getTime() === today.getTime();
    
    return (
      <EnhancedDateGroup
        date={dateGroup.date}
        tasks={dateGroup.tasks}
        onTaskPress={onTaskPress}
        viewMode={viewMode}
        isToday={isToday}
      />
    );
  };

  if (loading && processedTasks.length === 0) {
    return renderLoadingState();
  }

  return (
    <View style={styles.container}>
      {/* View mode information */}
      {renderViewModeInfo()}

      {/* Task list or empty state */}
      {isEmpty ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={groupedTasks}
          keyExtractor={(item, index) => `${item.date.toISOString()}-${index}`}
          renderItem={renderDateGroup}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </View>
  );
};

// Simple timeline list without grouping
export const SimpleTimelineTaskList = ({ 
  tasks = [],
  onTaskPress,
  loading = false,
  emptyMessage = "No tasks available",
  renderTaskCard
}) => {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BFA6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="list-outline" size={64} color="#CCCCCC" />
        <Text style={styles.emptyTitle}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tasks}
        keyExtractor={(item, index) => item._id?.toString() || index.toString()}
        renderItem={renderTaskCard}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  viewModeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  viewModeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewModeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00BFA6',
    marginLeft: 8,
  },
  taskCountText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyActions: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  emptyActionText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default TimelineTaskList;