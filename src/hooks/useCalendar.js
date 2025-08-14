import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  generateEnhancedCalendarDays, 
  generateEnhancedMonthData, 
  isDateInAllowedRange 
} from '../utils/calendarUtils';
import { processTimelineData, getViewMode, VIEW_MODES } from '../utils/timelineUtils';

export const useCalendar = (initialDate = null, tasks = []) => {
  // Default to null selectedDate to show all tasks by default
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [calendarExpanded, setCalendarExpanded] = useState(false);

  // Enhanced calendar data with task indicators
  const calendarDays = useMemo(() => {
    if (!selectedDate && !selectedMonth) return [];
    
    const baseDate = selectedDate || selectedMonth;
    return generateEnhancedCalendarDays(baseDate, tasks);
  }, [selectedDate, selectedMonth, tasks.length]); // Use tasks.length instead of tasks array

  // Enhanced month data with task indicators
  const monthsData = useMemo(() => {
    return generateEnhancedMonthData(selectedMonth, tasks);
  }, [selectedMonth, tasks.length]); // Use tasks.length instead of tasks array

  // Timeline data processing with view modes
  const timelineData = useMemo(() => {
    return processTimelineData(tasks, selectedDate);
  }, [tasks.length, selectedDate]); // Use tasks.length instead of tasks array

  // Current view mode
  const currentViewMode = useMemo(() => {
    return getViewMode(selectedDate);
  }, [selectedDate]);

  // Handle date selection with validation
  const handleDateSelect = useCallback((date) => {
    if (!date) return;
    
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    
    // Validate date is in allowed range
    if (!isDateInAllowedRange(newDate)) {
      console.warn('Date outside allowed range (2025-2026)');
      return;
    }
    
    setSelectedDate(newDate);
    // Note: selectedMonth will be auto-updated by useEffect
  }, []);

  // Handle month selection
  const handleMonthSelect = useCallback((monthIndex, year) => {
    const yearToUse = year || selectedMonth.getFullYear();
    const newMonthDate = new Date(yearToUse, monthIndex, 1);
    
    if (!isDateInAllowedRange(newMonthDate)) {
      console.warn('Month outside allowed range (2025-2026)');
      return;
    }
    
    setSelectedMonth(newMonthDate);
    
    // If no date selected or selected date is not in this month, select first day
    if (!selectedDate || 
        selectedDate.getMonth() !== monthIndex || 
        selectedDate.getFullYear() !== yearToUse) {
      setSelectedDate(newMonthDate);
    }
  }, [selectedDate, selectedMonth]);

  // Handle year navigation
  const handleYearNavigation = useCallback((direction) => {
    const currentYear = selectedMonth.getFullYear();
    const newYear = direction === 'next' ? currentYear + 1 : currentYear - 1;
    
    // Check year bounds (2025-2026)
    if (newYear < 2025 || newYear > 2026) {
      return;
    }
    
    const newDate = new Date(newYear, selectedMonth.getMonth(), 1);
    setSelectedMonth(newDate);
    
    // Update selected date if it exists
    if (selectedDate) {
      const newSelectedDate = new Date(newYear, selectedDate.getMonth(), selectedDate.getDate());
      if (isDateInAllowedRange(newSelectedDate)) {
        setSelectedDate(newSelectedDate);
      }
    }
  }, [selectedDate, selectedMonth]);

  // Clear date selection (show all tasks)
  const clearDateSelection = useCallback(() => {
    setSelectedDate(null);
  }, []);

  // Go to today
  const goToToday = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isDateInAllowedRange(today)) {
      setSelectedDate(today);
      setSelectedMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    }
  }, []);

  // Toggle calendar expanded state
  const toggleCalendarExpanded = useCallback(() => {
    setCalendarExpanded(prev => !prev);
  }, []);

  // Get display text for current selection
  const displayText = useMemo(() => {
    if (!selectedDate) {
      return `All Tasks (${tasks.length})`;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const isToday = selectedDate.getTime() === today.getTime();
    const filteredTasks = timelineData.tasks;
    
    if (isToday) {
      return `Today (${filteredTasks.length})`;
    }
    
    return `${selectedDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })} (${filteredTasks.length})`;
  }, [selectedDate, tasks.length, timelineData.tasks.length]); // Use timelineData.tasks.length instead

  // Get task count for a specific date
  const getTaskCountForDate = useCallback((date) => {
    if (!date || !tasks.length) return 0;
    
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return tasks.filter(task => {
      if (!task) return false;
      
      // Skip completed tasks
      if (task.status === 'COMPLETED') return false;
      
      // Maintenance tasks
      if (task.title !== undefined && task.deadlineDate) {
        const taskDate = new Date(task.deadlineDate);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === targetDate.getTime();
      }
      
      // Cleaning tasks
      if (task.checkOutDate) {
        const taskDate = new Date(task.checkOutDate);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === targetDate.getTime();
      }
      
      return false;
    }).length;
  }, [tasks]);

  // Auto-update month when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      const dateMonth = selectedDate.getMonth();
      const dateYear = selectedDate.getFullYear();
      
      setSelectedMonth(prevMonth => {
        if (prevMonth.getMonth() !== dateMonth || 
            prevMonth.getFullYear() !== dateYear) {
          return new Date(dateYear, dateMonth, 1);
        }
        return prevMonth;
      });
    }
  }, [selectedDate]); // Remove selectedMonth from dependencies

  return {
    // State
    selectedDate,
    selectedMonth,
    calendarExpanded,
    calendarDays,
    monthsData,
    timelineData,
    currentViewMode,
    
    // Computed values
    displayText,
    showAllTasks: !selectedDate,
    isToday: selectedDate && selectedDate.getTime() === new Date().setHours(0, 0, 0, 0),
    
    // Actions
    handleDateSelect,
    handleMonthSelect,
    handleYearNavigation,
    clearDateSelection,
    goToToday,
    toggleCalendarExpanded,
    getTaskCountForDate,
    
    // Utilities
    setSelectedDate,
    setSelectedMonth,
    setCalendarExpanded
  };
};