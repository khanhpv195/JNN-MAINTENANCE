import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, ToastAndroid, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useReservation } from '../hooks/useReservation';
import { useCalendar } from '../hooks/useCalendar';
import { STATUS } from '../constants/status';
import CalendarHeader from '../components/home/CalendarHeader';
import WeekCalendar from '../components/home/WeekCalendar';
import TimelineTaskList from '../components/home/TimelineTaskList';
import { processTimelineData } from '../utils/timelineUtils';

export default function HomeScreen() {
    const navigation = useNavigation();
    const { cleaningTasks, loading, error, updateTask, fetchMaintenanceTasks } = useReservation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Enhanced calendar hook with task indicators and clean architecture
    const {
        selectedDate,
        calendarExpanded,
        calendarDays,
        timelineData,
        displayText,
        showAllTasks,
        handleDateSelect,
        clearDateSelection,
        goToToday,
        toggleCalendarExpanded
    } = useCalendar(null, cleaningTasks);



    // Simplified refresh data function
    const refreshData = useCallback(() => {
        const dateToFetch = new Date(); // Always fetch for current date, filtering happens in UI
        fetchMaintenanceTasks(dateToFetch)
            .then(response => {
                console.log('Tasks refreshed:', response ? 'success' : 'no response');
            })
            .catch(err => {
                console.error('Error refreshing data:', err);
            });
    }, [fetchMaintenanceTasks]); // Remove selectedDate dependency

    // Initial data fetch
    useEffect(() => {
        refreshData();
    }, []);

    // Focus effect for data refresh
    useFocusEffect(
        React.useCallback(() => {
            console.log('Home screen focused, refreshing data');
            refreshData();
        }, [refreshData])
    );

    // Task press handler
    const handleTaskPress = useCallback((task) => {
        navigation.navigate('TaskDetail', {
            taskId: task._id,
            task: task,
            refreshOnReturn: true
        });
    }, [navigation]);







    // Handle refresh with callback
    const handleRefresh = useCallback(() => {
        console.log('Manual refresh triggered');
        refreshData();
    }, [refreshData]);



    // Toast notification helper
    const showToast = useCallback((message) => {
        if (Platform.OS === 'android') {
            ToastAndroid.show(message, ToastAndroid.SHORT);
        } else {
            Alert.alert('Notification', message);
        }
    }, []);

    // Handle task acceptance
    const handleAcceptTask = useCallback(async (task) => {
        try {
            setIsSubmitting(true);
            const response = await updateTask(task._id, {
                status: STATUS.IN_PROGRESS
            });

            if (response?.success) {
                showToast(response.message || 'Task accepted successfully');
                refreshData();
                navigation.navigate('TaskDetail', {
                    taskId: task._id,
                    task: response.data,
                    refreshOnReturn: true
                });
            } else {
                showToast(response.message || 'Failed to accept task');
            }
        } catch (error) {
            console.error('Error accepting task:', error);
            showToast('Failed to accept task. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [updateTask, showToast, refreshData, navigation]);





    // Error handling with clean UI
    if (error) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>My Tasks</Text>
                </View>
                
                <CalendarHeader
                    selectedDate={selectedDate}
                    onDateSelect={handleDateSelect}
                    onClearSelection={clearDateSelection}
                    showAllTasks={showAllTasks}
                    taskCount={cleaningTasks.length}
                />
                
                <View style={styles.errorContainer}>
                    <Text style={styles.errorTitle}>Error Loading Tasks</Text>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            </View>
        );
    }

    // Process timeline data
    const processedTimelineData = processTimelineData(cleaningTasks, selectedDate);
    console.log(`Timeline data processed: ${processedTimelineData.tasks.length} tasks in ${processedTimelineData.viewMode} mode`);

    return (
        <View style={styles.container}>
            {/* Enhanced header with calendar controls */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Tasks</Text>
            </View>

            {/* Enhanced calendar header with smart display */}
            <CalendarHeader
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                onClearSelection={clearDateSelection}
                showAllTasks={showAllTasks}
                taskCount={processedTimelineData.tasks.length}
            />

            {/* Enhanced week calendar with task indicators */}
            <View style={styles.weekCalendarContainer}>
                <WeekCalendar
                    calendarDays={calendarDays}
                    selectedDate={selectedDate}
                    onDateSelect={handleDateSelect}
                />
            </View>

            {/* Timeline task list with enhanced features */}
            <TimelineTaskList
                tasks={cleaningTasks}
                selectedDate={selectedDate}
                onTaskPress={handleTaskPress}
                loading={loading}
                onRefresh={handleRefresh}
                refreshing={loading}
            />
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        backgroundColor: '#ffffff',
        marginTop: 50,
        borderBottomWidth: 1,
        borderBottomColor: '#e9ecef',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000000',
    },
    weekCalendarContainer: {
        marginHorizontal: 16,
        marginVertical: 12,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ff5252',
        marginTop: 16,
    },
    errorText: {
        color: '#666',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
    },
});