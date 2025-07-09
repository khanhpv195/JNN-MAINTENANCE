import format from 'date-fns/format';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { STATUS } from '../constants/status';
import TaskApis from '../shared/api/taskApis';
import { POST } from '../shared/api/fetch';

/**
 * Custom hook for managing cleaning tasks
 * Handles fetching, updating, and managing cleaning task data
 */
export const useReservation = () => {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState(null);
    const [cleaningTasks, setCleaningTasks] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);
    // Task cache to store tasks by date to prevent data loss when switching dates
    const [taskCache, setTaskCache] = useState(new Map());

    /**
     * Fetch all cleaning tasks for a specific date
     * @param {Date} date - Selected date to fetch tasks for
     * @param {String} status - Optional status filter (PENDING, IN_PROGRESS, COMPLETED)
     */
    const fetchMaintenanceTasks = useCallback(async (date = new Date(), status = null) => {
        try {
            setLoading(true);
            setError(null);

            // Format the date for API (YYYY-MM-DD)
            const localDate = new Date(date);
            const formattedDate = format(localDate, 'yyyy-MM-dd');

            // Build request body
            const requestBody = {
                date: date ? formattedDate : null,
                status: 'IN_PROGRESS'
            };


            const response = await POST('/listInProgressMaintenanceTasks', {
                body: requestBody,
            }).catch(error => {
                // Check if the error is a permission error
                if (error.message && error.message.includes('access denied')) {
                    // Handle permission error without affecting login state
                    setError('You do not have permission to access cleaning tasks');
                    // Keep the tasks list empty but don't throw further
                    setCleaningTasks([]);
                    console.log('Permission error handled in useReservation hook:', error.message);
                    // Return empty data to prevent further error handling
                    return { data: [] };
                }
                // Re-throw other errors to be caught by the outer catch
                throw error;
            });


            if (response && response.data) {
                setCleaningTasks(response.data);
                return response.data;
            }
            return response
        } catch (err) {
            console.error('Error fetching cleaning tasks:', err);
            setError(err.message || 'Failed to load cleaning tasks');

            // Show error alert for non-permission errors
            if (!err.message.includes('access denied')) {
                Alert.alert(
                    'Error Loading Tasks',
                    err.message || 'An error occurred while loading tasks',
                    [{ text: 'OK' }]
                );
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Helper function to update task cache
    const updateTaskCache = useCallback((tasks) => {
        // Group tasks by date
        const tasksByDate = new Map();
        tasks.forEach(task => {
            // For maintenance tasks, use deadlineDate
            // For cleaning tasks, use checkOutDate or reservationDetails.checkOut
            const taskDate = task.deadlineDate || task.checkOutDate || task.reservationDetails?.checkOut;
            if (taskDate) {
                const dateKey = format(new Date(taskDate), 'yyyy-MM-dd');
                if (!tasksByDate.has(dateKey)) {
                    tasksByDate.set(dateKey, []);
                }
                tasksByDate.get(dateKey).push(task);
            }
        });
        
        // Update cache with new data
        setTaskCache(prevCache => {
            const newCache = new Map(prevCache);
            tasksByDate.forEach((dateTasks, dateKey) => {
                newCache.set(dateKey, dateTasks);
            });
            return newCache;
        });
    }, []);


    const fetchMaintenancePendingTasks = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            // Build request body
            const requestBody = {
                status: 'ASSIGNED'
            };

            console.log('Fetching assigned tasks with request body:', requestBody);

            const response = await POST('/listAssignedMaintenanceTasks', {
                body: requestBody,
            }).catch(error => {
                // Check if the error is a permission error
                if (error.message && error.message.includes('access denied')) {
                    // Handle permission error without affecting login state
                    setError('You do not have permission to access cleaning tasks');
                    // Keep the tasks list empty but don't throw further
                    setCleaningTasks([]);
                    console.log('Permission error handled in useReservation hook:', error.message);
                    // Return empty data to prevent further error handling
                    return { data: [] };
                }
                // Re-throw other errors to be caught by the outer catch
                throw error;
            });


            if (response && response.data) {
                setCleaningTasks(response.data);
                return response.data;
            }
            return response
        } catch (err) {
            console.error('Error fetching cleaning tasks:', err);
            setError(err.message || 'Failed to load cleaning tasks');

            // Show error alert for non-permission errors
            if (!err.message.includes('access denied')) {
                Alert.alert(
                    'Error Loading Tasks',
                    err.message || 'An error occurred while loading tasks',
                    [{ text: 'OK' }]
                );
            }
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Get details of a specific cleaning task
     * @param {string} taskId - ID of the task to fetch details for
     */
    const getTaskDetails = async (taskId) => {
        try {
            setLoading(true);
            setError(null);

            const response = await TaskApis.detailTaskCleaner({
                maintenanceId: taskId
            });
            if (!response?.success) {
                throw new Error(response?.message || 'Failed to fetch task details');
            }

            return response?.data;
        } catch (err) {
            setError(err.message || 'An error occurred while fetching task details');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Update a cleaning task
     * @param {string} taskId - ID of the task to update
     * @param {Object} updateData - Data to update the task with
     */
    const updateTask = async (taskId, updateData) => {
        try {
            setLoading(true);
            setError(null);

            const response = await TaskApis.updateTaskCleaner({
                taskId: taskId,
                ...updateData
            });

            return response;
        } catch (err) {
            console.error('Error updating task:', err);
            return {
                success: false,
                message: err.message || 'An error occurred while updating task'
            };
        } finally {
            setLoading(false);
        }
    };

    const updateProperty = async (propertyId, updateData) => {
        try {
            setLoading(true);
            setError(null);

            const response = await TaskApis.updateProperty({
                propertyId,
                ...updateData
            });

            return response;
        } catch (err) {
            console.error('Error updating property problem:', err);
            return {
                success: false,
                message: err.message || 'An error occurred while updating property problem'
            };
        } finally {
            setLoading(false);
        }
    };

    const clearError = () => setError(null);

    // Get all cached tasks for calendar generation
    const getAllCachedTasks = useCallback(() => {
        const allTasks = [];
        for (const tasks of taskCache.values()) {
            allTasks.push(...tasks);
        }
        return allTasks;
    }, [taskCache]);

    // Clear task cache
    const clearTaskCache = useCallback(() => {
        setTaskCache(new Map());
        setCleaningTasks([]);
    }, []);

    // Force a refresh of data
    const refreshTasks = () => {
        setRefreshKey(prev => prev + 1);
    };

    const uploadImage = async (formData) => {
        try {
            const response = await TaskApis.uploadImage(formData);
            return response.data;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    };

    /**
     * Group tasks by date
     * @param {Date} date - Date to filter tasks for
     * @returns {Array} - Tasks for the specified date
     */
    const getTasksForDate = useCallback((date) => {
        if (!date || !cleaningTasks || cleaningTasks.length === 0) {
            return [];
        }
        
        const compareDate = new Date(date);
        compareDate.setHours(0, 0, 0, 0);
        
        return cleaningTasks.filter(task => {
            // Skip pending tasks if needed
            if (task.status === STATUS.PENDING) return false;
            
            // Get the task date from deadlineDate (maintenance) or checkOutDate/reservationDetails.checkOut (cleaning)
            const taskDate = new Date(task.deadlineDate || task.checkOutDate || task.reservationDetails?.checkOut);
            taskDate.setHours(0, 0, 0, 0);
            
            return taskDate.toDateString() === compareDate.toDateString();
        });
    }, [cleaningTasks]);

    /**
     * Fetch all cleaning tasks without date filtering
     * This will get all tasks from the API in a single call
     * @returns {Promise} - API response with all tasks
     */
    const fetchAllMaintenanceTasks = useCallback(async () => {
        try {
            if (fetching) {
                console.log('Already fetching data, skipping redundant request');
                return [];
            }
            
            setFetching(true);
            setLoading(true);
            setError(null);
            
            console.log('Fetching all cleaning tasks (no date filter)');
            
            // Call API without any date filter to get all tasks
            const response = await TaskApis.listAllMaintenanceTasks({ status: 'IN_PROGRESS'});

            if (response && response.data) {
                const tasks = response.data;
                console.log(`Fetched ${tasks.length} total tasks`);
                
                // Update the task cache
                updateTaskCache(tasks);
                
                // Update state with all tasks
                setCleaningTasks(tasks);
                
                return tasks;
            }
            return [];
        } catch (err) {
            console.error('Error fetching all cleaning tasks:', err);
            setError(err.message || 'Failed to load cleaning tasks');
            return [];
        } finally {
            setLoading(false);
            setFetching(false);
        }
    }, [fetching, updateTaskCache]);

    /**
     * Get all tasks grouped by date
     * @returns {Array} Array of objects with date and tasks
     */
    const getAllTasksGroupedByDate = useCallback(() => {
        if (!cleaningTasks || cleaningTasks.length === 0) {
            return [];
        }
        
        // Create a map to group tasks by date
        const tasksByDate = new Map();
        
        cleaningTasks.forEach(task => {
            // Skip pending tasks if needed
            // if (task.status === STATUS.PENDING) return;
            
            // Get the task date from deadlineDate (maintenance) or checkOutDate/reservationDetails.checkOut (cleaning)
            const taskDate = task.deadlineDate || task.checkOutDate || task.reservationDetails?.checkOut;
            if (!taskDate) return;
            
            const date = new Date(taskDate);
            date.setHours(0, 0, 0, 0);
            const dateStr = date.toDateString();
            
            if (!tasksByDate.has(dateStr)) {
                tasksByDate.set(dateStr, {
                    date: date,
                    tasks: []
                });
            }
            
            tasksByDate.get(dateStr).tasks.push(task);
        });
        
        // Convert map to array and sort by date
        const result = Array.from(tasksByDate.values()).sort((a, b) => 
            a.date.getTime() - b.date.getTime()
        );
        
        console.log(`[getAllTasksGroupedByDate] Found ${result.length} days with tasks`);
        return result;
    }, [cleaningTasks]);

    return {
        cleaningTasks,
        loading,
        fetching,
        setFetching,
        error,
        clearError,
        fetchMaintenanceTasks,
        fetchMaintenancePendingTasks,
        fetchAllMaintenanceTasks,
        getTaskDetails,
        updateTask,
        uploadImage,
        updateProperty,
        refreshKey,
        setRefreshKey,
        getTasksForDate,
        getAllTasksGroupedByDate,
        clearTaskCache,
        getAllCachedTasks,
        refreshTasks
    };
};