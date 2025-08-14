// Clean timeline data processing and view mode management

export const VIEW_MODES = {
  ALL_UPCOMING: 'ALL_UPCOMING',
  DATE_FILTER: 'DATE_FILTER', 
  TODAY_ONLY: 'TODAY_ONLY'
};

/**
 * Pure function to sort tasks - today first, then chronological
 */
export const sortTasksWithTodayFirst = (tasks) => {
  if (!tasks || tasks.length === 0) return [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return [...tasks].sort((a, b) => {
    const dateA = getTaskDate(a);
    const dateB = getTaskDate(b);
    
    if (!dateA || !dateB) return 0;
    
    const isATodayTask = isSameDay(dateA, today);
    const isBTodayTask = isSameDay(dateB, today);
    
    // Today's tasks come first
    if (isATodayTask && !isBTodayTask) return -1;
    if (isBTodayTask && !isATodayTask) return 1;
    
    // Then sort by date
    return dateA - dateB;
  });
};

/**
 * Get task date for sorting (deadline for maintenance, checkout for cleaning)
 */
export const getTaskDate = (task) => {
  if (!task) return null;
  
  // Maintenance tasks use deadline
  if (task.title !== undefined && task.deadlineDate) {
    return new Date(task.deadlineDate);
  }
  
  // Cleaning tasks use checkout
  if (task.checkOutDate) {
    return new Date(task.checkOutDate);
  }
  
  return null;
};

/**
 * Check if two dates are the same day
 */
export const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  return d1.getTime() === d2.getTime();
};

/**
 * Filter tasks by selected date
 */
export const filterTasksByDate = (tasks, selectedDate) => {
  if (!tasks || tasks.length === 0) return [];
  if (!selectedDate) return tasks; // Show all if no date selected
  
  const targetDate = new Date(selectedDate);
  targetDate.setHours(0, 0, 0, 0);
  
  return tasks.filter(task => {
    const taskDate = getTaskDate(task);
    return taskDate && isSameDay(taskDate, targetDate);
  });
};

/**
 * Get view mode based on selected date
 */
export const getViewMode = (selectedDate) => {
  if (!selectedDate) return VIEW_MODES.ALL_UPCOMING;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (isSameDay(selectedDate, today)) {
    return VIEW_MODES.TODAY_ONLY;
  }
  
  return VIEW_MODES.DATE_FILTER;
};

/**
 * Process timeline data with clean architecture
 */
export const processTimelineData = (tasks, selectedDate) => {
  if (!tasks || tasks.length === 0) {
    return {
      tasks: [],
      viewMode: getViewMode(selectedDate),
      isEmpty: true,
      emptyMessage: getEmptyMessage(getViewMode(selectedDate))
    };
  }
  
  const viewMode = getViewMode(selectedDate);
  let processedTasks = [];
  
  switch (viewMode) {
    case VIEW_MODES.ALL_UPCOMING:
      processedTasks = sortTasksWithTodayFirst(tasks);
      break;
      
    case VIEW_MODES.DATE_FILTER:
    case VIEW_MODES.TODAY_ONLY:
      const filteredTasks = filterTasksByDate(tasks, selectedDate);
      processedTasks = sortTasksWithTodayFirst(filteredTasks);
      break;
      
    default:
      processedTasks = sortTasksWithTodayFirst(tasks);
  }
  
  return {
    tasks: processedTasks,
    viewMode,
    isEmpty: processedTasks.length === 0,
    emptyMessage: getEmptyMessage(viewMode, selectedDate)
  };
};

/**
 * Generate context-aware empty state messages
 */
export const getEmptyMessage = (viewMode, selectedDate) => {
  switch (viewMode) {
    case VIEW_MODES.TODAY_ONLY:
      return {
        title: "No tasks for today",
        subtitle: "All caught up! Check other dates for upcoming tasks."
      };
      
    case VIEW_MODES.DATE_FILTER:
      const dateStr = selectedDate ? 
        new Date(selectedDate).toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        }) : 'this date';
      return {
        title: `No tasks for ${dateStr}`,
        subtitle: "Try selecting a different date or view all upcoming tasks."
      };
      
    case VIEW_MODES.ALL_UPCOMING:
    default:
      return {
        title: "No upcoming tasks",
        subtitle: "All tasks are completed or no tasks have been assigned."
      };
  }
};

/**
 * Group tasks by date for timeline display
 */
export const groupTasksByDate = (tasks) => {
  if (!tasks || tasks.length === 0) return [];
  
  const groups = new Map();
  
  tasks.forEach(task => {
    const taskDate = getTaskDate(task);
    if (!taskDate) return;
    
    const dateKey = taskDate.toDateString();
    
    if (!groups.has(dateKey)) {
      groups.set(dateKey, {
        date: taskDate,
        tasks: []
      });
    }
    
    groups.get(dateKey).tasks.push(task);
  });
  
  // Convert to array and sort by date
  return Array.from(groups.values()).sort((a, b) => a.date - b.date);
};

/**
 * Get task count for a specific date
 */
export const getTaskCountForDate = (tasks, date) => {
  if (!tasks || tasks.length === 0 || !date) return 0;
  
  return filterTasksByDate(tasks, date).length;
};

/**
 * Check if date has any tasks
 */
export const dateHasTasks = (tasks, date) => {
  return getTaskCountForDate(tasks, date) > 0;
};

/**
 * Get today's date normalized to midnight
 */
export const getTodayDate = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/**
 * Format date for timeline headers
 */
export const formatTimelineDate = (date) => {
  if (!date) return '';
  
  const today = getTodayDate();
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