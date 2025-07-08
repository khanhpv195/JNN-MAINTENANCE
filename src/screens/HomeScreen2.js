import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { format, isSameDay } from 'date-fns';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonthCalendar from '../components/home/MonthCalendar';
import WeekCalendar from '../components/home/WeekCalendar';
import { useReservation } from '../hooks/useReservation';

const SELECTED_DATE_KEY = '@cleaner_app/selected_date';
const DAYS_TO_LOAD = 30; // Tải dữ liệu cho 30 ngày để hiển thị chấm đỏ

export default function HomeScreen() {
    const navigation = useNavigation();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [calendarDays, setCalendarDays] = useState([]);
    const [months, setMonths] = useState([]);
    const [calendarExpanded, setCalendarExpanded] = useState(false);
    const [allTasks, setAllTasks] = useState([]);
    const [dataLoaded, setDataLoaded] = useState(false);
    const scrollViewRef = useRef(null);
    const currentVisibleDateRef = useRef(new Date());
    
    const { 
        cleaningTasks, 
        loading, 
        error, 
        updateTask, 
        fetchAllMaintenanceTasks,
        clearTaskCache,
        fetching,
        getTasksForDate
    } = useReservation();
    
    // Get all tasks grouped by date for display
    const getAllTasksGroupedByDate = useCallback(() => {
        try {
            if (!cleaningTasks || cleaningTasks.length === 0) {
                return [];
            }

            const grouped = {};
            
            cleaningTasks.forEach(task => {
                if (!task) return;
                
                // Use checkOutDate for cleaning tasks, deadlineDate for maintenance tasks
                const taskDate = task.checkOutDate || task.deadlineDate;
                if (!taskDate) return;
                
                const dateObj = new Date(taskDate);
                if (isNaN(dateObj.getTime())) return;
                
                const dateKey = dateObj.toDateString();
                
                if (!grouped[dateKey]) {
                    grouped[dateKey] = {
                        date: dateKey,
                        tasks: []
                    };
                }
                
                grouped[dateKey].tasks.push(task);
            });
            
            // Sort by date and then by time
            return Object.values(grouped)
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map(group => ({
                    ...group,
                    tasks: group.tasks.sort((a, b) => {
                        const timeA = new Date(a.checkOutDate || a.deadlineDate).getTime();
                        const timeB = new Date(b.checkOutDate || b.deadlineDate).getTime();
                        return timeA - timeB;
                    })
                }));
        } catch (error) {
            console.error('Error grouping tasks by date:', error);
            return [];
        }
    }, [cleaningTasks]);

    // Memoized grouped tasks
    const memoizedAllTasks = useMemo(() => {
        return getAllTasksGroupedByDate();
    }, [getAllTasksGroupedByDate]);

    // Memoized tasks by date for calendar
    const tasksByDate = useMemo(() => {
        try {
            const grouped = {};
            if (cleaningTasks && cleaningTasks.length > 0) {
                cleaningTasks.forEach(task => {
                    if (!task) return;
                    
                    const taskDate = task.checkOutDate || task.deadlineDate;
                    if (!taskDate) return;
                    
                    const dateObj = new Date(taskDate);
                    if (isNaN(dateObj.getTime())) return;
                    
                    const dateKey = dateObj.toDateString();
                    if (!grouped[dateKey]) {
                        grouped[dateKey] = [];
                    }
                    grouped[dateKey].push(task);
                });
            }
            return grouped;
        } catch (error) {
            console.error('Error creating tasks by date:', error);
            return {};
        }
    }, [cleaningTasks]);

    // Updated getTasksForDate to use memoized data
    const getTasksForDateMemoized = useCallback((date) => {
        try {
            if (!date || !tasksByDate) return [];
            const dateKey = date.toDateString();
            return tasksByDate[dateKey] || [];
        } catch (error) {
            console.error('Error getting tasks for date:', error);
            return [];
        }
    }, [tasksByDate]);
    
    // Refs to track state
    const isMounted = useRef(true);
    const currentMonthRef = useRef(`${selectedMonth.getFullYear()}-${selectedMonth.getMonth()}`);

    // Load persisted date on mount
    useEffect(() => {
        let isCancelled = false;
        
        const loadPersistedDate = async () => {
            try {
                const savedDateStr = await AsyncStorage.getItem(SELECTED_DATE_KEY);
                if (savedDateStr && !isCancelled) {
                    const savedDate = new Date(savedDateStr);
                    // Validate date
                    if (!isNaN(savedDate.getTime())) {
                        setSelectedDate(savedDate);
                        setSelectedMonth(savedDate);
                        currentVisibleDateRef.current = savedDate;
                    }
                }
            } catch (error) {
                console.error('Error loading persisted date:', error);
            }
        };
        loadPersistedDate();
        
        return () => {
            isMounted.current = false;
            isCancelled = true;
        };
    }, []);

    // Save selected date whenever it changes
    useEffect(() => {
        let isCancelled = false;
        
        const persistDate = async () => {
            try {
                if (!isCancelled && selectedDate && !isNaN(selectedDate.getTime())) {
                    await AsyncStorage.setItem(SELECTED_DATE_KEY, selectedDate.toISOString());
                }
            } catch (error) {
                console.error('Error persisting selected date:', error);
            }
        };
        persistDate();
        
        return () => {
            isCancelled = true;
        };
    }, [selectedDate]);

    // Initial data load - only once when component mounts
    useEffect(() => {
        if (!dataLoaded && isMounted.current) {
            console.log('[HomeScreen] Initial data load');
            fetchAllMaintenanceTasks().then(() => {
                setDataLoaded(true);
                console.log('[HomeScreen] Initial data loaded');
            });
        }
    }, [fetchAllMaintenanceTasks, dataLoaded]);

    // Update all tasks when memoized data changes
    useEffect(() => {
        if (isMounted.current && dataLoaded) {
            setAllTasks(memoizedAllTasks);
            console.log(`[HomeScreen] Data changed: Found ${memoizedAllTasks.length} days with tasks`);
        }
    }, [memoizedAllTasks, dataLoaded]);

    // Update calendar UI when tasks or dates change
    useEffect(() => {
        if (isMounted.current) {
            setCalendarDays(memoizedCalendarDays);
            setMonths(memoizedMonths);
        }
    }, [memoizedCalendarDays, memoizedMonths]);

    // Refresh data when screen is focused - but only if data hasn't been loaded yet
    useFocusEffect(
        useCallback(() => {
            console.log('[HomeScreen] Screen focused');
            if (isMounted.current && !dataLoaded && !fetching) {
                console.log('[HomeScreen] Loading data on focus');
                fetchAllMaintenanceTasks().then(() => {
                    setDataLoaded(true);
                });
            }
            
            return () => {
                console.log('[HomeScreen] Screen unfocused');
            };
        }, [fetchAllMaintenanceTasks, dataLoaded, fetching])
    );

    // Handle scroll events to update the selected date based on visible tasks
    const handleScroll = useCallback((event) => {
        if (!allTasks || allTasks.length === 0) return;
        
        try {
            const offsetY = event.nativeEvent.contentOffset.y;
            const visibleHeight = event.nativeEvent.layoutMeasurement.height;
            
            // Estimate which date section is currently visible based on scroll position
            const approximateHeaderHeight = 50;
            const approximateTaskHeight = 200;
            
            let currentPosition = 0;
            let visibleDateIndex = 0;
            
            // Find which date group is currently visible based on scroll position
            for (let i = 0; i < allTasks.length; i++) {
                const sectionHeight = approximateHeaderHeight + (allTasks[i].tasks.length * approximateTaskHeight);
                
                // If the middle of the visible area is within this section
                if (offsetY + (visibleHeight / 2) >= currentPosition && 
                    offsetY + (visibleHeight / 2) < currentPosition + sectionHeight) {
                    visibleDateIndex = i;
                    break;
                }
                
                currentPosition += sectionHeight;
            }
            
            // Get the date of the visible section
            const visibleDate = new Date(allTasks[visibleDateIndex].date);
            
            // Validate date and only update if the date has changed
            if (!isNaN(visibleDate.getTime()) && !isSameDay(visibleDate, currentVisibleDateRef.current)) {
                currentVisibleDateRef.current = visibleDate;
                setSelectedDate(visibleDate);
                console.log(`[HomeScreen] Scroll updated selected date to: ${visibleDate.toDateString()}`);
            }
        } catch (error) {
            console.error('Error in handleScroll:', error);
        }
    }, [allTasks]);

    // Generate calendar days for week view
    const generateCalendarDays = useCallback((centerDate = new Date()) => {
        const baseDateForCalendar = new Date(centerDate);
        baseDateForCalendar.setHours(0, 0, 0, 0);

        const days = [];
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let i = -3; i <= 3; i++) {
            const date = new Date(baseDateForCalendar);
            date.setDate(baseDateForCalendar.getDate() + i);
            date.setHours(0, 0, 0, 0);

            // Check if this date is today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isToday = date.getTime() === today.getTime();

            // Check for tasks on this day
            const tasksForThisDay = getTasksForDateMemoized(date);
            const hasTask = tasksForThisDay.length > 0;

            days.push({
                date: date.getDate(),
                fullDate: date,
                day: daysOfWeek[date.getDay()],
                hasTask,
                isToday,
                tasksCount: tasksForThisDay.length
            });
        }
        
        return days;
    }, [getTasksForDateMemoized]);

    // Generate months for month calendar
    const generateMonths = useCallback((centerDate = new Date()) => {
        const months = [];
        const baseYear = centerDate.getFullYear();

        // Generate all 12 months of the year
        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
            const monthDate = new Date(baseYear, monthIndex, 1);
            const year = monthDate.getFullYear();
            const month = monthDate.getMonth();

            // Get days in month
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            // Get weekday of first day (0 = Sunday, 1 = Monday, etc.)
            const firstDayOfMonth = new Date(year, month, 1).getDay();

            // Build days for this month
            const days = [];

            // Add empty days for proper alignment
            for (let j = 0; j < firstDayOfMonth; j++) {
                days.push({
                    empty: true,
                    day: ''
                });
            }

            // Add actual days
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isToday = date.toDateString() === today.toDateString();

                // Check for tasks on this day
                const tasksForThisDay = getTasksForDateMemoized(date);
                const hasTask = tasksForThisDay.length > 0;

                days.push({
                    day,
                    fullDate: date,
                    isToday,
                    hasTask,
                    tasksCount: tasksForThisDay.length
                });
            }

            months.push({
                year,
                month,
                monthName: monthDate.toLocaleString('en-US', { month: 'long' }),
                days
            });
        }

        return months;
    }, [getTasksForDateMemoized]);

    // Memoized calendar days
    const memoizedCalendarDays = useMemo(() => {
        return generateCalendarDays(selectedDate);
    }, [generateCalendarDays, selectedDate]);

    // Memoized months data
    const memoizedMonths = useMemo(() => {
        return generateMonths(selectedMonth);
    }, [generateMonths, selectedMonth]);

    // Handle date selection
    const handleDateSelect = useCallback((fullDate) => {
        try {
            if (!fullDate || isNaN(new Date(fullDate).getTime())) {
                console.error('Invalid date provided to handleDateSelect:', fullDate);
                return;
            }
            
            const newSelectedDate = new Date(fullDate);
            newSelectedDate.setHours(0, 0, 0, 0);
            
            console.log(`[HomeScreen] Selected date: ${newSelectedDate.toDateString()}`);
            
            // Update selected date
            setSelectedDate(newSelectedDate);
            currentVisibleDateRef.current = newSelectedDate;
            
            // Scroll to the selected date's tasks
            scrollToDate(newSelectedDate);

            // Update the selected month if the date is in a different month
            if (newSelectedDate.getMonth() !== selectedMonth.getMonth() ||
                newSelectedDate.getFullYear() !== selectedMonth.getFullYear()) {
                setSelectedMonth(newSelectedDate);
            }
        } catch (error) {
            console.error('Error in handleDateSelect:', error);
        }
    }, [selectedMonth, scrollToDate]);
    
    // Scroll to tasks for a specific date
    const scrollToDate = useCallback((date) => {
        try {
            if (!date || !allTasks || allTasks.length === 0) return;
            
            // Find the index of the date group in allTasks
            const dateStr = date.toDateString();
            const dateIndex = allTasks.findIndex(group => {
                const groupDate = new Date(group.date);
                return !isNaN(groupDate.getTime()) && groupDate.toDateString() === dateStr;
            });
            
            if (dateIndex >= 0 && scrollViewRef.current) {
                // Calculate approximate scroll position based on date index
                const approximateHeaderHeight = 50;
                const approximateTaskHeight = 200;
                
                let scrollPosition = 0;
                for (let i = 0; i < dateIndex; i++) {
                    scrollPosition += approximateHeaderHeight + (allTasks[i].tasks.length * approximateTaskHeight);
                }
                
                // Use setTimeout to ensure scroll happens after render
                setTimeout(() => {
                    if (scrollViewRef.current) {
                        scrollViewRef.current.scrollTo({ y: scrollPosition, animated: true });
                        console.log(`[HomeScreen] Scrolling to date: ${dateStr} at position ~${scrollPosition}`);
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Error in scrollToDate:', error);
        }
    }, [allTasks]);

    // Handle month selection
    const handleMonthSelect = useCallback((monthIndex) => {
        try {
            if (typeof monthIndex !== 'number' || monthIndex < 0 || monthIndex > 11) {
                console.error('Invalid monthIndex provided to handleMonthSelect:', monthIndex);
                return;
            }
            
            console.log(`[HomeScreen] Month selected: ${monthIndex}`);
            
            const newDate = new Date(selectedMonth);
            newDate.setMonth(monthIndex);
            newDate.setDate(1);
            
            setSelectedMonth(newDate);

            // If there's no selected date in this month, set it to the 1st
            const currentSelectedMonth = selectedDate.getMonth();
            const currentSelectedYear = selectedDate.getFullYear();
            
            if (currentSelectedMonth !== monthIndex || currentSelectedYear !== newDate.getFullYear()) {
                // Set selected date to the 1st of the month
                const newSelectedDate = new Date(newDate);
                setSelectedDate(newSelectedDate);
                currentVisibleDateRef.current = newSelectedDate;
                
                // Scroll to the selected date
                scrollToDate(newSelectedDate);
                
                console.log(`[HomeScreen] Month changed to ${newSelectedDate.toDateString()}`);
            }
        } catch (error) {
            console.error('Error in handleMonthSelect:', error);
        }
    }, [selectedMonth, selectedDate, scrollToDate]);

    // Handle refresh with debouncing
    const handleRefresh = useCallback(() => {
        if (fetching) {
            console.log('[HomeScreen] Refresh already in progress, skipping');
            return;
        }
        
        console.log('[HomeScreen] Manual refresh triggered');
        clearTaskCache();
        setDataLoaded(false);
        fetchAllMaintenanceTasks().then(() => {
            setDataLoaded(true);
        }).catch((error) => {
            console.error('Error during refresh:', error);
            setDataLoaded(true); // Reset loading state even on error
        });
    }, [fetching, clearTaskCache, fetchAllMaintenanceTasks]);

    // Handle task press
    const handleTaskPress = useCallback((task) => {
        try {
            if (!task || !task._id) {
                console.error('Invalid task provided to handleTaskPress:', task);
                return;
            }
            
            console.log('[HomeScreen] Task pressed:', task._id);
            navigation.navigate('TaskDetail', {
                taskId: task._id,
                task: task,
                refreshOnReturn: true
            });
        } catch (error) {
            console.error('Error in handleTaskPress:', error);
        }
    }, [navigation]);

    // Handle booking info press
    const handleBookingInfoPress = useCallback((task) => {
        try {
            if (!task) {
                console.error('Invalid task provided to handleBookingInfoPress:', task);
                return;
            }
            
            console.log('[HomeScreen] Booking info pressed for task:', task._id);
            
            // Extract booking information with safe defaults
            const propertyName = task.propertyId?.name || 'Unknown Property';
            const guestName = task.reservationDetails?.guest?.name || 'Unknown Guest';
            const checkIn = task.reservationDetails?.checkIn ? new Date(task.reservationDetails.checkIn).toLocaleDateString() : 'N/A';
            const checkOut = task.reservationDetails?.checkOut ? new Date(task.reservationDetails.checkOut).toLocaleDateString() : 'N/A';
            const guests = task.reservationDetails?.numberOfGuests || 'N/A';
            const reservationId = task.reservationId ? task.reservationId : 'N/A';
            
            // Show alert with booking information
            Alert.alert(
                'Booking Information',
                `Property: ${propertyName}\nGuest: ${guestName}\nCheck-in: ${checkIn}\nCheck-out: ${checkOut}\nGuests: ${guests}\nReservation ID: ${reservationId}`,
                [{ text: 'Close' }]
            );
        } catch (error) {
            console.error('Error in handleBookingInfoPress:', error);
        }
    }, []);

    // Toggle calendar expanded
    const toggleCalendarExpanded = useCallback(() => {
        try {
            setCalendarExpanded(prev => {
                const newState = !prev;
                console.log(`[HomeScreen] Calendar expanded: ${newState}`);
                return newState;
            });
        } catch (error) {
            console.error('Error in toggleCalendarExpanded:', error);
        }
    }, []);

    // Handle year navigation
    const handlePrevYear = useCallback(() => {
        try {
            if (!selectedMonth || isNaN(selectedMonth.getTime())) {
                console.error('Invalid selectedMonth in handlePrevYear');
                return;
            }
            
            const prevYear = new Date(selectedMonth);
            prevYear.setFullYear(prevYear.getFullYear() - 1);
            setSelectedMonth(prevYear);
            console.log(`[HomeScreen] Previous year: ${prevYear.getFullYear()}`);
        } catch (error) {
            console.error('Error in handlePrevYear:', error);
        }
    }, [selectedMonth]);

    const handleNextYear = useCallback(() => {
        try {
            if (!selectedMonth || isNaN(selectedMonth.getTime())) {
                console.error('Invalid selectedMonth in handleNextYear');
                return;
            }
            
            const nextYear = new Date(selectedMonth);
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            setSelectedMonth(nextYear);
            console.log(`[HomeScreen] Next year: ${nextYear.getFullYear()}`);
        } catch (error) {
            console.error('Error in handleNextYear:', error);
        }
    }, [selectedMonth]);

    // Render a date header
    const renderDateHeader = useCallback((date) => {
        try {
            if (!date) {
                console.error('No date provided to renderDateHeader');
                return null;
            }
            
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
                console.error('Invalid date provided to renderDateHeader:', date);
                return null;
            }
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const isToday = dateObj.toDateString() === today.toDateString();
            
            const isTomorrow = new Date(today);
            isTomorrow.setDate(today.getDate() + 1);
            const isTomorrowDate = dateObj.toDateString() === isTomorrow.toDateString();
            
            let dateLabel;
            if (isToday) {
                dateLabel = "Today";
            } else if (isTomorrowDate) {
                dateLabel = "Tomorrow";
            } else {
                dateLabel = "";
            }
            
            return (
                <View 
                    key={`header-${date}`} 
                    style={styles.dateHeader}
                >
                    <Text style={styles.dateHeaderText}>
                        {dateLabel ? `${dateLabel} - ` : ""}
                        {format(new Date(date), 'EEE, MMM d yyyy')}
                    </Text>
                </View>
            );
        } catch (error) {
            console.error('Error in renderDateHeader:', error);
            return null;
        }
    }, []);

    // Helper function to format date and time
    const formatCheckoutDateTime = useCallback((dateString) => {
        if (!dateString) {
            return {
                date: 'Not scheduled',
                time: 'To be determined'
            };
        }

        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return {
                date: 'Invalid date',
                time: 'Invalid time'
            };
        }

        return {
            date: date.toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }),
            time: date.toLocaleString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
            })
        };
    }, []);

    // Helper function to get urgency color
    const getUrgencyColor = useCallback((urgencyLevel) => {
        switch (urgencyLevel) {
            case 'HIGH': return '#ff5252';
            case 'MEDIUM': return '#ffa726';
            case 'LOW': return '#66bb6a';
            default: return '#ffa726';
        }
    }, []);

    // Helper function to get status color
    const getStatusColor = useCallback((status) => {
        switch (status) {
            case 'PENDING': return '#FFA000';
            case 'IN_PROGRESS': return '#1976D2';
            case 'COMPLETED': return '#4CAF50';
            default: return '#666';
        }
    }, []);

    // Helper function to get status text
    const getStatusText = useCallback((status) => {
        return status;
    }, []);

    // Helper function to format task data
    const formatTaskData = useCallback((task) => {
        if (!task) return null;
        
        try {
            const {
                _id = 'unknown',
                status = 'UNKNOWN',
                propertyId = {},
                checkOutDate,
                checkInDate,
                price = { amount: 0, currency: 'USD' },
                urgency = 'MEDIUM',
                reservationId = '',
                title,
                description,
                deadlineDate,
                images = []
            } = task;

            // Format dates
            const checkout = formatCheckoutDateTime(checkOutDate);
            const checkin = formatCheckoutDateTime(checkInDate);
            const deadline = formatCheckoutDateTime(deadlineDate);

            // Get property details
            const propertyName = propertyId?.name || 'Unknown Property';
            const address = propertyId?.address || {};

            // Format address
            let formattedAddress = 'No address available';
            if (address) {
                if (typeof address === 'string') {
                    formattedAddress = address;
                } else if (address.display) {
                    formattedAddress = address.display;
                } else if (address.street) {
                    formattedAddress = `${address.street}, ${address.city || ''}, ${address.state || ''} ${address.postcode || ''}`;
                }
            }

            // Format price
            let formattedPrice = '$0.00';
            try {
                const priceAmount = price?.amount || 0;
                formattedPrice = (priceAmount / 100).toLocaleString('en-US', {
                    style: 'currency',
                    currency: price?.currency || 'USD',
                    minimumFractionDigits: 2
                });
            } catch (e) {
                console.error('Error formatting price:', e);
            }

            const accessCode = propertyId?.access_code || 'N/A';
            const isMaintenance = title !== undefined;

            return {
                _id,
                status,
                urgency,
                reservationId,
                title,
                description,
                images,
                propertyName,
                formattedAddress,
                formattedPrice,
                accessCode,
                isMaintenance,
                checkout,
                checkin,
                deadline,
                checkOutDate,
                checkInDate,
                deadlineDate
            };
        } catch (error) {
            console.error('Error formatting task data:', error);
            return null;
        }
    }, [formatCheckoutDateTime]);

    // Helper function to render task badges
    const renderTaskBadges = useCallback((urgency, status) => (
        <View style={styles.headerRight}>
            <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(urgency) }]}>
                <Text style={styles.urgencyText}>{urgency}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
                <Text style={styles.statusText}>{getStatusText(status)}</Text>
            </View>
        </View>
    ), [getUrgencyColor, getStatusColor, getStatusText]);

    // Helper function to render date info
    const renderDateInfo = useCallback((label, dateObj, originalDate) => (
        <View style={styles.checkoutInfo}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <View style={styles.checkoutTexts}>
                <Text style={styles.checkoutLabel}>{label}:</Text>
                <Text style={[styles.checkoutDate, !originalDate && styles.noDateText]}>
                    {dateObj.date}
                </Text>
                <Text style={[styles.checkoutTime, !originalDate && styles.noDateText]}>
                    {dateObj.time}
                </Text>
            </View>
        </View>
    ), []);

    // Helper function to render property info
    const renderPropertyInfo = useCallback((formattedPrice, accessCode) => (
        <View style={styles.propertyInfo}>
            <View style={styles.infoItem}>
                <Ionicons name="cash-outline" size={16} color="#666" />
                <Text style={styles.infoText}>{formattedPrice}</Text>
            </View>
            <View style={styles.infoItem}>
                <Ionicons name="key-outline" size={16} color="#666" />
                <Text style={styles.infoText}>Code: {accessCode}</Text>
            </View>
        </View>
    ), []);

    // Render a task
    const renderTask = useCallback((task) => {
        console.log('Rendering task:', task?._id);

        if (!task) {
            console.error('Received null or undefined item in renderTask');
            return null;
        }

        const taskData = formatTaskData(task);
        if (!taskData) return null;

        const {
            _id,
            status,
            urgency,
            reservationId,
            title,
            description,
            images,
            propertyName,
            formattedAddress,
            formattedPrice,
            accessCode,
            isMaintenance,
            checkout,
            checkin,
            deadline,
            checkOutDate,
            checkInDate,
            deadlineDate
        } = taskData;

        console.log(`Task ${_id} - Type: ${isMaintenance ? 'Maintenance' : 'Cleaning'}`);

        return (
            <TouchableOpacity
                key={_id}
                style={[
                    styles.taskCard,
                    { borderLeftWidth: 4, borderLeftColor: getStatusColor(status) }
                ]}
                onPress={() => handleTaskPress(task)}
            >
                <View style={styles.taskHeader}>
                    <Text style={styles.roomNumber}>{isMaintenance ? 'Maintenance' : 'Cleaning'}</Text>
                    {renderTaskBadges(urgency, status)}
                </View>

                <Text style={styles.taskTitle}>{isMaintenance ? title : propertyName}</Text>
                <Text style={styles.taskAddress}>{formattedAddress}</Text>

                {description && (
                    <Text style={styles.description} numberOfLines={2}>{description}</Text>
                )}

                {isMaintenance && images && images.length > 0 && (
                    <View style={styles.imagesInfo}>
                        <Ionicons name="images-outline" size={16} color="#666" />
                        <Text style={styles.infoText}>
                            {images.length} {images.length === 1 ? 'image' : 'images'} attached
                        </Text>
                    </View>
                )}

                <View style={styles.infoGrid}>
                    {isMaintenance ? (
                        renderDateInfo('Deadline', deadline, deadlineDate)
                    ) : (
                        <View style={styles.rowContainer}>
                            {renderDateInfo('Check-out', checkout, checkOutDate)}
                            {renderDateInfo('Check-in', checkin, checkInDate)}
                        </View>
                    )}

                    <View style={styles.divider} />

                    {renderPropertyInfo(formattedPrice, accessCode)}

                    {reservationId && !isMaintenance && (
                        <View style={styles.reservationInfo}>
                            <Ionicons name="bookmark-outline" size={16} color="#666" />
                            <Text style={styles.infoText}>
                                Reservation: {reservationId}
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    }, [formatTaskData, getStatusColor, renderTaskBadges, renderDateInfo, renderPropertyInfo, handleTaskPress]);

    // Render header component
     const renderHeader = useCallback(() => (
         <View style={styles.header}>
             <Text style={styles.headerTitle}>My Task</Text>
             <TouchableOpacity 
                 style={[styles.refreshButton, fetching && styles.refreshButtonDisabled]} 
                 onPress={handleRefresh}
                 disabled={fetching}
                 accessible={true}
                 accessibilityLabel={fetching ? "Refreshing tasks" : "Refresh tasks"}
                 accessibilityHint="Double tap to refresh the task list"
             >
                 <Ionicons 
                     name="refresh" 
                     size={24} 
                     color={fetching ? "#CCCCCC" : "#00BFA6"} 
                 />
                 {fetching && (
                     <Text style={styles.refreshingText}>Refreshing...</Text>
                 )}
             </TouchableOpacity>
         </View>
     ), [handleRefresh, fetching]);

    // Render calendar section
    const renderCalendarSection = useCallback(() => (
        <>
            <View style={styles.weekCalendarContainer}>
                <WeekCalendar
                calendarDays={memoizedCalendarDays}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
            />
            </View>

            <TouchableOpacity
                style={styles.calendarToggle}
                onPress={toggleCalendarExpanded}
                accessible={true}
                accessibilityLabel={calendarExpanded ? 'Hide calendar view' : 'Show calendar view'}
                accessibilityHint="Double tap to toggle calendar visibility"
                accessibilityRole="button"
            >
                <Text style={styles.monthYearText}>
                    {calendarExpanded ? "Hide Calendar" : "Show Calendar"}
                </Text>
                <Ionicons
                    name={calendarExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#00BFA6"
                />
            </TouchableOpacity>

            {calendarExpanded && (
                <View style={styles.compactCalendarContainer}>
                    <View style={styles.yearNavigator}>
                        <TouchableOpacity 
                            onPress={handlePrevYear} 
                            style={styles.yearButton}
                            accessible={true}
                            accessibilityLabel="Previous year"
                            accessibilityHint="Double tap to go to previous year"
                            accessibilityRole="button"
                        >
                            <Ionicons name="chevron-back" size={24} color="#00BFA6" />
                        </TouchableOpacity>
                        <Text 
                            style={styles.yearText}
                            accessible={true}
                            accessibilityLabel={`Current year ${selectedMonth.getFullYear()}`}
                        >
                            {selectedMonth.getFullYear()}
                        </Text>
                        <TouchableOpacity 
                            onPress={handleNextYear} 
                            style={styles.yearButton}
                            accessible={true}
                            accessibilityLabel="Next year"
                            accessibilityHint="Double tap to go to next year"
                            accessibilityRole="button"
                        >
                            <Ionicons name="chevron-forward" size={24} color="#00BFA6" />
                        </TouchableOpacity>
                    </View>
                    <MonthCalendar
                        months={memoizedMonths}
                        selectedMonth={selectedMonth}
                        selectedDate={selectedDate}
                        onDateSelect={handleDateSelect}
                        onMonthSelect={handleMonthSelect}
                    />
                </View>
            )}
        </>
    ), [calendarDays, selectedDate, handleDateSelect, calendarExpanded, toggleCalendarExpanded, selectedMonth, handlePrevYear, handleNextYear, months, handleMonthSelect]);

    // Render loading state
     const renderLoadingState = useCallback(() => (
         <View style={styles.centeredContent}>
             <ActivityIndicator 
                 size="large" 
                 color="#00BFA6" 
                 accessible={true}
                 accessibilityLabel="Loading tasks"
             />
             <Text style={styles.loadingText}>Loading requests...</Text>
             <Text style={styles.loadingSubtext}>Please wait while we fetch your tasks</Text>
         </View>
     ), []);

    // Render error state
     const renderErrorState = useCallback(() => (
         <View style={styles.centeredContent}>
             <Ionicons 
                 name="alert-circle" 
                 size={64} 
                 color="#FF3B30" 
                 accessible={true}
                 accessibilityLabel="Error occurred"
             />
             <Text style={styles.errorTitle}>Something went wrong</Text>
             <Text style={styles.errorText}>{error}</Text>
             <TouchableOpacity
                 style={styles.retryButton}
                 onPress={handleRefresh}
                 accessible={true}
                 accessibilityLabel="Retry loading tasks"
                 accessibilityHint="Double tap to try loading tasks again"
             >
                 <Text style={styles.retryButtonText}>Retry</Text>
             </TouchableOpacity>
         </View>
     ), [error, handleRefresh]);

    // Render empty state
     const renderEmptyState = useCallback(() => (
         <View style={styles.centeredContent}>
             <Ionicons 
                 name="calendar-outline" 
                 size={64} 
                 color="#CCCCCC" 
                 accessible={true}
                 accessibilityLabel="No tasks available"
             />
             <Text style={styles.noTasksText}>No cleaning requests found</Text>
             <Text style={styles.emptySubtext}>Tasks will appear here when they are assigned to you</Text>
             {!dataLoaded && (
                 <TouchableOpacity
                     style={styles.retryButton}
                     onPress={handleRefresh}
                     accessible={true}
                     accessibilityLabel="Refresh to check for new tasks"
                     accessibilityHint="Double tap to refresh and check for new tasks"
                 >
                     <Text style={styles.retryButtonText}>Refresh</Text>
                 </TouchableOpacity>
             )}
         </View>
     ), [dataLoaded, handleRefresh]);

    // Render task list content
    const renderTaskListContent = useCallback(() => (
        <ScrollView
            ref={scrollViewRef}
            style={styles.taskListContainer}
            contentContainerStyle={styles.taskListContent}
            showsVerticalScrollIndicator={true}
            onScroll={handleScroll}
            scrollEventThrottle={16}
        >
            {memoizedAllTasks.map(dateGroup => (
                <React.Fragment key={dateGroup.date}>
                    {renderDateHeader(dateGroup.date)}
                    {dateGroup.tasks.map(task => renderTask(task))}
                </React.Fragment>
            ))}
        </ScrollView>
    ), [memoizedAllTasks, handleScroll, renderDateHeader, renderTask]);

    // Render main content based on state
    const renderMainContent = useCallback(() => {
        if (loading && !dataLoaded) {
            return renderLoadingState();
        }
        
        if (error) {
            return renderErrorState();
        }
        
        if (allTasks.length === 0) {
            return renderEmptyState();
        }
        
        return renderTaskListContent();
    }, [loading, dataLoaded, error, memoizedAllTasks.length, renderLoadingState, renderErrorState, renderEmptyState, renderTaskListContent]);

    return (
        <SafeAreaView style={{flex: 1}}>
            <View style={styles.container}>
                {renderHeader()}
                {renderCalendarSection()}
                {renderMainContent()}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F8F8',
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333333',
    },
    refreshButton: {
        padding: 8,
        borderRadius: 20,
    },
    weekCalendarContainer: {
        marginBottom: 16,
    },
    calendarToggle: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
        marginBottom: 8,
    },
    monthYearText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#00BFA6',
        marginRight: 4,
    },
    compactCalendarContainer: {
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    yearNavigator: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    yearButton: {
        padding: 4,
    },
    yearText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333333',
    },
    selectedDateHeader: {
        marginVertical: 16,
    },
    selectedDateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333333',
    },
    taskListContainer: {
        flex: 1,
    },
    taskListContent: {
        paddingBottom: 16,
    },
    centeredContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
    },
    errorTitle: {
        marginTop: 16,
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333333',
        textAlign: 'center',
    },
    errorText: {
        marginTop: 8,
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
    },
    retryButton: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#00BFA6',
        borderRadius: 8,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    noTasksText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
    },
    refreshButtonDisabled: {
        opacity: 0.6,
    },
    refreshingText: {
        fontSize: 12,
        color: '#00BFA6',
        marginLeft: 8,
    },
    loadingSubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#999999',
        textAlign: 'center',
    },
    emptySubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#999999',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    taskCard: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#00BFA6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    propertyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    addressText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    timeInfo: {
        marginBottom: 12,
    },
    timeInfoText: {
        fontSize: 14,
        color: '#333',
        marginBottom: 4,
    },
    reservationId: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    taskActions: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        paddingBottom: 12,
        marginBottom: 12,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    bookingInfoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bookingInfoText: {
        color: '#00BFA6',
        fontSize: 14,
        fontWeight: '500',
        marginHorizontal: 8,
    },
    dateHeader: {
        padding: 8,
        backgroundColor: '#f0f0f0',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    dateHeaderText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333333',
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    roomNumber: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    urgencyBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    urgencyText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
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
    taskTitle: {
        fontSize: 16,
        marginBottom: 5,
    },
    taskAddress: {
        color: '#666',
        marginBottom: 10,
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginBottom: 10,
        fontStyle: 'italic'
    },
    imagesInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 10
    },
    infoText: {
        marginLeft: 4,
        fontSize: 12,
        color: '#666',
    },
    infoGrid: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    checkoutInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    checkoutTexts: {
        marginLeft: 8,
    },
    checkoutLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    checkoutDate: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    checkoutTime: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    noDateText: {
        color: '#ff5252',
        fontStyle: 'italic',
    },
    rowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 8,
    },
    propertyInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    reservationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
});