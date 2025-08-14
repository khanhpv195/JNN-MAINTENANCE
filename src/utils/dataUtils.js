// Production-ready data validation and processing utilities

/**
 * Safely extract guest information from task data
 */
export const getGuestInfo = (task) => {
  if (!task) return { name: null, id: null, phone: null };
  
  // Try different possible guest data structures
  const guest = task.guest || task.guestInfo || task.customer;
  
  if (!guest) return { name: null, id: null, phone: null };
  
  return {
    name: guest.name || guest.fullName || null,
    id: guest.id || guest.guestId || guest._id || null,
    phone: guest.phone || guest.phoneNumber || null
  };
};

/**
 * Safely extract property information from task data
 */
export const getPropertyInfo = (task) => {
  if (!task) return { name: null, address: null, accessCode: null };
  
  const property = task.propertyId || task.property;
  
  if (!property) return { name: null, address: null, accessCode: null };
  
  // Format address
  let formattedAddress = null;
  if (property.address) {
    if (typeof property.address === 'string') {
      formattedAddress = property.address;
    } else if (property.address.display) {
      formattedAddress = property.address.display;
    } else if (property.address.street) {
      const parts = [
        property.address.street,
        property.address.city,
        property.address.state,
        property.address.postcode
      ].filter(Boolean);
      formattedAddress = parts.join(', ');
    }
  }
  
  return {
    name: property.name || property.title || null,
    address: formattedAddress,
    accessCode: property.access_code || property.accessCode || null
  };
};

/**
 * Safely format date and time with error handling
 */
export const formatDateTime = (dateString) => {
  if (!dateString) {
    return {
      date: null,
      time: null,
      full: null,
      isValid: false
    };
  }
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return {
      date: null,
      time: null,
      full: null,
      isValid: false
    };
  }
  
  try {
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }),
      full: date.toLocaleString('en-US'),
      isValid: true
    };
  } catch (error) {
    return {
      date: null,
      time: null,
      full: null,
      isValid: false
    };
  }
};

/**
 * Safely format price with currency
 */
export const formatPrice = (price) => {
  if (!price) return '$0.00';
  
  try {
    const amount = typeof price === 'object' ? price.amount : price;
    const currency = typeof price === 'object' ? price.currency : 'USD';
    
    if (typeof amount !== 'number') return '$0.00';
    
    // Handle price in cents vs dollars
    const finalAmount = amount > 999 ? amount / 100 : amount;
    
    return finalAmount.toLocaleString('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2
    });
  } catch (error) {
    return '$0.00';
  }
};

/**
 * Safely extract task dates
 */
export const getTaskDates = (task) => {
  if (!task) return {};
  
  const checkInDate = task.checkInDate || task.checkin;
  const checkOutDate = task.checkOutDate || task.checkout;
  const deadlineDate = task.deadlineDate || task.deadline;
  
  return {
    checkIn: formatDateTime(checkInDate),
    checkOut: formatDateTime(checkOutDate),
    deadline: formatDateTime(deadlineDate)
  };
};

/**
 * Determine if task is a maintenance task
 */
export const isMaintenanceTask = (task) => {
  if (!task) return false;
  
  return task.title !== undefined || 
         task.type === 'maintenance' ||
         task.category === 'maintenance';
};

/**
 * Get task urgency level with fallback
 */
export const getTaskUrgency = (task) => {
  if (!task) return 'MEDIUM';
  
  return task.urgency || task.priority || 'MEDIUM';
};

/**
 * Get task status with fallback
 */
export const getTaskStatus = (task) => {
  if (!task) return 'UNKNOWN';
  
  return task.status || 'UNKNOWN';
};

/**
 * Safely extract task description
 */
export const getTaskDescription = (task) => {
  if (!task) return null;
  
  return task.description || task.notes || task.details || null;
};

/**
 * Safely extract task images
 */
export const getTaskImages = (task) => {
  if (!task) return [];
  
  const images = task.images || task.photos || task.attachments || [];
  
  // Ensure it's an array
  return Array.isArray(images) ? images : [];
};

/**
 * Validate task data completeness
 */
export const validateTaskData = (task) => {
  if (!task) return { valid: false, issues: ['Task is null or undefined'] };
  
  const issues = [];
  
  if (!task._id) issues.push('Missing task ID');
  if (!task.status) issues.push('Missing task status');
  
  if (isMaintenanceTask(task)) {
    if (!task.title) issues.push('Missing maintenance task title');
  } else {
    if (!task.propertyId) issues.push('Missing property information');
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
};

/**
 * Clean and normalize task data
 */
export const normalizeTaskData = (task) => {
  if (!task) return null;
  
  const validation = validateTaskData(task);
  if (!validation.valid) {
    console.warn('Task validation issues:', validation.issues);
  }
  
  return {
    ...task,
    guest: getGuestInfo(task),
    property: getPropertyInfo(task),
    dates: getTaskDates(task),
    price: formatPrice(task.price),
    urgency: getTaskUrgency(task),
    status: getTaskStatus(task),
    description: getTaskDescription(task),
    images: getTaskImages(task),
    isMaintenance: isMaintenanceTask(task),
    isValid: validation.valid
  };
};