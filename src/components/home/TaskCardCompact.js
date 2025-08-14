import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTaskColor } from '../../utils/calendarUtils';
import { normalizeTaskData } from '../../utils/dataUtils';

export default function TaskCardCompact({ task, onPress, onExpand }) {
  const [expanded, setExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));

  if (!task) return null;

  const normalizedTask = normalizeTaskData(task);
  const taskColor = getTaskColor(task);

  const toggleExpanded = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    
    Animated.timing(animation, {
      toValue: newExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();

    if (onExpand) {
      onExpand(newExpanded);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'HIGH': return '#ff5252';
      case 'MEDIUM': return '#ffa726';
      case 'LOW': return '#66bb6a';
      default: return '#ffa726';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return '#FFA000';
      case 'IN_PROGRESS': return '#1976D2';
      case 'COMPLETED': return '#4CAF50';
      default: return '#666';
    }
  };

  const animatedHeight = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200], // Approximate height of expanded content
  });

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderLeftColor: taskColor, borderLeftWidth: 4 }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Compact Header - Always Visible */}
      <View style={styles.compactHeader}>
        <View style={styles.leftSection}>
          <Text style={styles.taskType}>
            {normalizedTask.isMaintenance ? 'Maintenance' : 'Cleaning'}
          </Text>
          <Text style={styles.taskTitle} numberOfLines={1}>
            {normalizedTask.isMaintenance 
              ? normalizedTask.title || 'Maintenance Task'
              : normalizedTask.property.name || 'Cleaning Task'
            }
          </Text>
          <Text style={styles.taskSubtitle} numberOfLines={1}>
            {normalizedTask.property.address || 'Address not available'}
          </Text>
        </View>
        
        <View style={styles.rightSection}>
          <View style={styles.badgeContainer}>
            <View style={[
              styles.urgencyBadge, 
              { backgroundColor: getUrgencyColor(normalizedTask.urgency) }
            ]}>
              <Text style={styles.badgeText}>{normalizedTask.urgency}</Text>
            </View>
          </View>
          
          <View style={styles.actionIcons}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => console.log('Person info')}
            >
              <Ionicons name="person-outline" size={20} color="#666" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => console.log('Refresh')}
            >
              <Ionicons name="refresh-outline" size={20} color="#666" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={toggleExpanded}
            >
              <Ionicons 
                name={expanded ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color="#00BFA6" 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Time Information - Always Visible */}
      <View style={styles.timeInfo}>
        {normalizedTask.isMaintenance ? (
          <View style={styles.timeItem}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.timeLabel}>Deadline: </Text>
            <Text style={[
              styles.timeValue,
              !normalizedTask.dates.deadline.isValid && styles.invalidTime
            ]}>
              {normalizedTask.dates.deadline.isValid 
                ? `${normalizedTask.dates.deadline.date} at ${normalizedTask.dates.deadline.time}`
                : 'No deadline set'
              }
            </Text>
          </View>
        ) : (
          <View style={styles.timeRow}>
            <View style={styles.timeItem}>
              <Ionicons name="log-out-outline" size={16} color="#666" />
              <Text style={styles.timeLabel}>Out: </Text>
              <Text style={[
                styles.timeValue,
                !normalizedTask.dates.checkOut.isValid && styles.invalidTime
              ]}>
                {normalizedTask.dates.checkOut.isValid 
                  ? normalizedTask.dates.checkOut.time
                  : 'TBD'
                }
              </Text>
            </View>
            
            <View style={styles.timeItem}>
              <Ionicons name="log-in-outline" size={16} color="#666" />
              <Text style={styles.timeLabel}>In: </Text>
              <Text style={[
                styles.timeValue,
                !normalizedTask.dates.checkIn.isValid && styles.invalidTime
              ]}>
                {normalizedTask.dates.checkIn.isValid 
                  ? normalizedTask.dates.checkIn.time
                  : 'TBD'
                }
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Guest ID - Always Visible */}
      {normalizedTask.guest.id && (
        <View style={styles.guestInfo}>
          <Ionicons name="bookmark-outline" size={16} color="#666" />
          <Text style={styles.guestId}>ID: {normalizedTask.guest.id}</Text>
        </View>
      )}

      {/* Expandable Details */}
      <Animated.View style={[styles.expandableContent, { height: animatedHeight }]}>
        <View style={styles.expandedDetails}>
          {/* Booking Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Details</Text>
            
            {normalizedTask.guest.name && (
              <View style={styles.detailItem}>
                <Ionicons name="person" size={16} color="#666" />
                <Text style={styles.detailText}>Guest: {normalizedTask.guest.name}</Text>
              </View>
            )}
            
            {normalizedTask.guest.phone && (
              <View style={styles.detailItem}>
                <Ionicons name="call" size={16} color="#666" />
                <Text style={styles.detailText}>Phone: {normalizedTask.guest.phone}</Text>
              </View>
            )}
            
            <View style={styles.detailItem}>
              <Ionicons name="cash" size={16} color="#666" />
              <Text style={styles.detailText}>Price: {normalizedTask.price}</Text>
            </View>
            
            {normalizedTask.property.accessCode && (
              <View style={styles.detailItem}>
                <Ionicons name="key" size={16} color="#666" />
                <Text style={styles.detailText}>Access Code: {normalizedTask.property.accessCode}</Text>
              </View>
            )}
          </View>

          {/* Address Information */}
          {normalizedTask.property.address && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Address</Text>
              <View style={styles.detailItem}>
                <Ionicons name="location" size={16} color="#666" />
                <Text style={styles.detailText}>{normalizedTask.property.address}</Text>
              </View>
            </View>
          )}

          {/* Timing Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Schedule</Text>
            
            {!normalizedTask.isMaintenance && (
              <>
                {normalizedTask.dates.checkIn.isValid && (
                  <View style={styles.detailItem}>
                    <Ionicons name="log-in" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      Check-in: {normalizedTask.dates.checkIn.date} at {normalizedTask.dates.checkIn.time}
                    </Text>
                  </View>
                )}
                
                {normalizedTask.dates.checkOut.isValid && (
                  <View style={styles.detailItem}>
                    <Ionicons name="log-out" size={16} color="#666" />
                    <Text style={styles.detailText}>
                      Check-out: {normalizedTask.dates.checkOut.date} at {normalizedTask.dates.checkOut.time}
                    </Text>
                  </View>
                )}
              </>
            )}
            
            {normalizedTask.dates.deadline.isValid && (
              <View style={styles.detailItem}>
                <Ionicons name="alarm" size={16} color="#666" />
                <Text style={styles.detailText}>
                  Deadline: {normalizedTask.dates.deadline.date} at {normalizedTask.dates.deadline.time}
                </Text>
              </View>
            )}
          </View>

          {/* Status */}
          <View style={styles.section}>
            <View style={styles.statusSection}>
              <Text style={styles.sectionTitle}>Status</Text>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: getStatusColor(normalizedTask.status) }
              ]}>
                <Text style={styles.statusText}>{normalizedTask.status}</Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  leftSection: {
    flex: 1,
    marginRight: 12,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  taskType: {
    fontSize: 12,
    color: '#00BFA6',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  taskSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  badgeContainer: {
    marginBottom: 8,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
  },
  timeInfo: {
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 12,
    color: '#000',
    fontWeight: '600',
  },
  invalidTime: {
    color: '#ff5252',
    fontStyle: 'italic',
  },
  guestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  guestId: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  expandableContent: {
    overflow: 'hidden',
  },
  expandedDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});