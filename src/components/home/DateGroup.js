import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { formatTimelineDate } from '../../utils/timelineUtils';
import TaskCardCompact from './TaskCardCompact';

const DateGroup = ({ 
  date, 
  tasks = [], 
  onTaskPress,
  showDateHeader = true,
  useCompactCard = false,
  renderTaskCard
}) => {
  if (!tasks || tasks.length === 0) return null;

  const formatDateHeader = (date) => {
    if (!date) return '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const isToday = targetDate.getTime() === today.getTime();
    
    if (isToday) {
      return `Today - ${targetDate.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })}`;
    }
    
    return targetDate.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderDefaultTaskCard = ({ item }) => {
    if (useCompactCard) {
      return (
        <TaskCardCompact
          task={item}
          onPress={() => onTaskPress && onTaskPress(item)}
          onExpand={(expanded) => console.log('Task expanded:', expanded)}
        />
      );
    }
    
    // Fallback to custom renderer or default
    if (renderTaskCard) {
      return renderTaskCard({ item });
    }
    
    return null;
  };

  const TaskCountBadge = ({ count }) => (
    <View style={styles.taskCountBadge}>
      <Text style={styles.taskCountText}>{count}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {showDateHeader && (
        <View style={styles.dateHeader}>
          <Text style={styles.dateHeaderText}>
            {formatDateHeader(date)}
          </Text>
          <TaskCountBadge count={tasks.length} />
        </View>
      )}
      
      <View style={styles.tasksContainer}>
        <FlatList
          data={tasks}
          keyExtractor={(item, index) => item._id?.toString() || index.toString()}
          renderItem={renderDefaultTaskCard}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.taskSeparator} />}
        />
      </View>
    </View>
  );
};

// Enhanced DateGroup with visual hierarchy
export const EnhancedDateGroup = ({ 
  date, 
  tasks = [], 
  onTaskPress,
  viewMode,
  isToday = false 
}) => {
  if (!tasks || tasks.length === 0) return null;

  const getHeaderStyle = () => {
    if (isToday) {
      return [styles.dateHeader, styles.todayHeader];
    }
    return styles.dateHeader;
  };

  const getHeaderTextStyle = () => {
    if (isToday) {
      return [styles.dateHeaderText, styles.todayHeaderText];
    }
    return styles.dateHeaderText;
  };

  return (
    <View style={styles.enhancedContainer}>
      {/* Enhanced date header with context */}
      <View style={getHeaderStyle()}>
        <View style={styles.headerLeft}>
          <Text style={getHeaderTextStyle()}>
            {formatTimelineDate(date)}
          </Text>
          {isToday && (
            <View style={styles.todayIndicator}>
              <Text style={styles.todayIndicatorText}>TODAY</Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerRight}>
          <View style={[
            styles.taskCountBadge,
            isToday && styles.todayTaskCountBadge
          ]}>
            <Text style={[
              styles.taskCountText,
              isToday && styles.todayTaskCountText
            ]}>
              {tasks.length}
            </Text>
          </View>
        </View>
      </View>

      {/* Task list with compact cards */}
      <View style={styles.tasksContainer}>
        {tasks.map((task, index) => (
          <View key={task._id?.toString() || index} style={styles.taskWrapper}>
            <TaskCardCompact
              task={task}
              onPress={() => onTaskPress && onTaskPress(task)}
              onExpand={(expanded) => console.log(`Task ${task._id} expanded:`, expanded)}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  enhancedContainer: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  todayHeader: {
    backgroundColor: '#e6f7f5',
    borderBottomColor: '#00BFA6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  todayHeaderText: {
    color: '#00BFA6',
    fontWeight: 'bold',
  },
  todayIndicator: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#00BFA6',
    borderRadius: 4,
  },
  todayIndicatorText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  taskCountBadge: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayTaskCountBadge: {
    backgroundColor: '#00BFA6',
  },
  taskCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  todayTaskCountText: {
    color: '#ffffff',
  },
  tasksContainer: {
    padding: 12,
  },
  taskWrapper: {
    marginBottom: 8,
  },
  taskSeparator: {
    height: 8,
  },
});

export default DateGroup;