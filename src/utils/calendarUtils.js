// Calendar utilities for smart task indicators and date handling

// Task color configuration
export const TASK_COLORS = {
  PURPLE: '#6366F1',  // Standard cleaning tasks
  TEAL: '#00BFA6',    // Deep cleaning (4+ hours)
  ORANGE: '#FB923C',  // Maintenance tasks
  BLUE: '#3B82F6'     // Default/other tasks
};

// Dot configuration for task indicators
export const DOT_CONFIG = {
  SMALL_SIZE: 6,      // 1 task
  LARGE_SIZE: 10,     // 2+ tasks
  COUNT_THRESHOLD: 3, // Show count bubble for 3+ tasks
  MAX_COUNT: 9        // Show "9+" for counts > 9
};

/**
 * Determine task color based on task characteristics
 */
export const getTaskColor = (task) => {
  if (!task) return TASK_COLORS.BLUE;
  
  // Maintenance tasks - orange
  if (task.title !== undefined || task.type === 'maintenance') {
    return TASK_COLORS.ORANGE;
  }
  
  // Deep cleaning detection
  const isDeepCleaning = 
    (task.description && task.description.toLowerCase().includes('deep')) ||
    (task.title && task.title.toLowerCase().includes('deep')) ||
    (task.duration && task.duration >= 240); // 4+ hours in minutes
    
  if (isDeepCleaning) {
    return TASK_COLORS.TEAL;
  }
  
  // Standard cleaning tasks - purple
  return TASK_COLORS.PURPLE;
};

/**
 * Generate task indicator dot properties
 */
export const getTaskDotConfig = (taskCount) => {
  if (taskCount === 0) {
    return { show: false };
  }
  
  if (taskCount === 1) {
    return {
      show: true,
      size: DOT_CONFIG.SMALL_SIZE,
      showCount: false,
      backgroundColor: TASK_COLORS.BLUE
    };
  }
  
  if (taskCount === 2) {
    return {
      show: true,
      size: DOT_CONFIG.LARGE_SIZE,
      showCount: false,
      backgroundColor: TASK_COLORS.TEAL
    };
  }
  
  // 3+ tasks - show count bubble
  const displayCount = taskCount > DOT_CONFIG.MAX_COUNT 
    ? `${DOT_CONFIG.MAX_COUNT}+` 
    : taskCount.toString();
    
  return {
    show: true,
    size: 20, // Larger for count bubble
    showCount: true,
    count: displayCount,
    backgroundColor: TASK_COLORS.ORANGE
  };
};

/**
 * Generate smart date header text
 */
export const getDateHeaderText = (date, isToday = false) => {
  if (!date) return 'Select Date';
  
  const dateObj = new Date(date);
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = dateObj.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
  const year = dateObj.getFullYear();
  
  if (isToday) {
    return `Today - ${dayName}, ${monthDay} ${year}`;
  }
  
  return `${dayName}, ${monthDay} ${year}`;
};

/**
 * Generate enhanced calendar days with task indicators
 */
export const generateEnhancedCalendarDays = (centerDate, tasks = []) => {
  const baseDateForCalendar = new Date(centerDate);
  baseDateForCalendar.setHours(0, 0, 0, 0);
  
  const days = [];
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  for (let i = -3; i <= 3; i++) {
    const date = new Date(baseDateForCalendar);
    date.setDate(baseDateForCalendar.getDate() + i);
    date.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = date.getTime() === today.getTime();
    
    // Get tasks for this day
    const tasksForThisDay = getTasksForDate(date, tasks);
    const taskCount = tasksForThisDay.length;
    const dotConfig = getTaskDotConfig(taskCount);
    
    days.push({
      date: date.getDate(),
      fullDate: date,
      day: daysOfWeek[date.getDay()],
      isToday,
      taskCount,
      dotConfig,
      tasks: tasksForThisDay
    });
  }
  
  return days;
};

/**
 * Generate enhanced month data with task indicators
 */
export const generateEnhancedMonthData = (centerDate, tasks = []) => {
  const months = [];
  const baseYear = centerDate.getFullYear();
  
  // Limit to 2025-2026 as per requirements
  const allowedYears = [2025, 2026];
  if (!allowedYears.includes(baseYear)) {
    return months;
  }
  
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const monthDate = new Date(baseYear, monthIndex, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    
    const days = [];
    
    // Empty days for alignment
    for (let j = 0; j < firstDayOfMonth; j++) {
      days.push({ empty: true, day: '' });
    }
    
    // Actual days with task indicators
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isToday = date.toDateString() === today.toDateString();
      
      const tasksForThisDay = getTasksForDate(date, tasks);
      const taskCount = tasksForThisDay.length;
      const dotConfig = getTaskDotConfig(taskCount);
      
      days.push({
        day,
        fullDate: date,
        isToday,
        taskCount,
        dotConfig,
        tasks: tasksForThisDay
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
};

/**
 * Get tasks for a specific date
 */
export const getTasksForDate = (date, tasks = []) => {
  if (!tasks || tasks.length === 0) return [];
  
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  return tasks.filter(task => {
    if (!task) return false;
    
    // Skip completed tasks for calendar indicators
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
  });
};

/**
 * Check if date is within allowed range (2025-2026)
 */
export const isDateInAllowedRange = (date) => {
  if (!date) return false;
  const year = new Date(date).getFullYear();
  return year >= 2025 && year <= 2026;
};