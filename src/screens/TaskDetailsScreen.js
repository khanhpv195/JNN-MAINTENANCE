import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, ToastAndroid, Platform, Image, TextInput, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ChecklistModal from '../components/ChecklistModal';
import { format } from 'date-fns';
import { useReservation } from '../hooks/useReservation';
import { STATUS } from '../constants/status';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import TaskApis from '../shared/api/taskApis';
import Toast from 'react-native-toast-message';

// Update STATUS object to include ASSIGNED
const TASK_STATUS = {
    ...STATUS,
    ASSIGNED: 'ASSIGNED'
};

export default function TaskDetailsScreen({ route, navigation }) {
    const [showChecklist, setShowChecklist] = useState(false);
    const [task, setTask] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { loading, error, getTaskDetails, updateTask } = useReservation();
    const [taskId, setTaskId] = useState(null);
    const [selectedImages, setSelectedImages] = useState([]);
    const [showImageUploader, setShowImageUploader] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [rawPrice, setRawPrice] = useState('');


    const refreshData = () => {
        fetchTaskDetails();
    };

    useFocusEffect(
        React.useCallback(() => {
            refreshData();
        }, [])
    );

    useEffect(() => {
        navigation.setOptions({
            headerLeft: () => (
                <TouchableOpacity
                    style={{ marginLeft: 16 }}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
            ),
            headerShown: true
        });
        setTaskId(route.params.taskId);
        fetchTaskDetails();
    }, [route.params?.taskId]);

    const fetchTaskDetails = async () => {
        try {
            if (!route.params?.taskId) {
                console.error('No taskId provided in fetchTaskDetails');
                return;
            }

            console.log('Fetching task details for id:', route.params.taskId);
            const response = await getTaskDetails(route.params.taskId);

            console.log('API response structure:', Object.keys(response).join(', '));
            setTask(response);

        } catch (error) {
            console.error('Error fetching task details:', error);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case TASK_STATUS.ASSIGNED:
                return '#FF9800'; // Orange for ASSIGNED
            case TASK_STATUS.PENDING:
                return '#FFA000'; // Orange
            case TASK_STATUS.IN_PROGRESS:
                return '#1976D2'; // Blue
            case TASK_STATUS.COMPLETED:
                return '#4CAF50'; // Green
            default:
                return '#666'; // Gray
        }
    };

    const showToast = (message) => {
        if (Platform.OS === 'android') {
            ToastAndroid.show(message, ToastAndroid.SHORT);
        } else {
            Alert.alert(message);
        }
    };

    const pickImages = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                Alert.alert('Permission Required', 'You need to grant camera roll permissions to upload images.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                aspect: [4, 3],
                quality: 0.8,
                allowsMultipleSelection: true,
                selectionLimit: 5,
            });

            if (result.canceled) {
                return;
            }

            // Get selected assets
            const selectedAssets = result.assets || [];

            if (selectedAssets.length > 0) {
                setSelectedImages(selectedAssets);
                setShowImageUploader(true);
            }
        } catch (error) {
            console.error('Error picking images:', error);
            showToast('Failed to pick images');
        }
    };

    // Raw price input value (without any formatting)
    const getRawPrice = () => {
        // Convert dollars to cents for API
        return rawPrice ? parseInt(rawPrice, 10) * 100 : 0;
    };

    // Function to format currency for display (only used for task display, not input)
    const formatCurrency = (value) => {
        if (!value) return '$0';

        // Check if it's already a number
        const amount = typeof value === 'number' ? value : parseInt(value.toString().replace(/[^0-9]/g, ''), 10);

        // Format with $ (without cents for display clarity)
        if (amount) {
            const dollars = Math.floor(amount / 100);
            return `$${dollars.toLocaleString('en-US')}`;
        }
        return '$0';
    };

    const uploadImages = async () => {
        if (selectedImages.length === 0) {
            showToast('Please select at least one image');
            return;
        }

        // Validate price is not empty
        if (!rawPrice || parseInt(rawPrice, 10) === 0) {
            showToast('Please enter a valid price');
            return;
        }

        try {
            setIsSubmitting(true);
            setUploadProgress(10); // Start with 10% to show activity

            // Create a single FormData with all images
            const formData = new FormData();
            
            // Process and compress each image before adding to FormData
            for (let i = 0; i < selectedImages.length; i++) {
                const image = selectedImages[i];
                setUploadProgress(10 + (i * 10)); // Update progress during compression
                
                try {
                    // Compress the image using ImageManipulator
                    const compressedImage = await ImageManipulator.manipulateAsync(
                        image.uri,
                        [{ resize: { width: 1024 } }], // Resize to max width of 1024px
                        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG } // Compress to 50% quality
                    );
                    
                    const imageUri = compressedImage.uri;
                    const fileName = imageUri.split('/').pop();
                    const match = /\.([\w]+)$/.exec(fileName);
                    const type = 'image/jpeg'; // Force JPEG type for consistency
                    
                    // Add the compressed image to FormData
                    formData.append('files', {
                        uri: imageUri,
                        name: fileName || `image_${i}.jpg`,
                        type
                    });
                    
                    console.log(`Added compressed image ${i + 1}/${selectedImages.length} to FormData`);
                } catch (compressionError) {
                    console.error('Error compressing image:', compressionError);
                    // Fallback to original image if compression fails
                    const imageUri = image.uri;
                    const fileName = imageUri.split('/').pop();
                    const match = /\.([\w]+)$/.exec(fileName);
                    const type = match ? `image/${match[1]}` : 'image';
                    
                    formData.append('files', {
                        uri: imageUri,
                        name: fileName,
                        type
                    });
                    console.log(`Added original image ${i + 1}/${selectedImages.length} to FormData (compression failed)`);
                }
            }

            setUploadProgress(30); // Update progress after preparing FormData

            try {
                console.log(`Uploading ${selectedImages.length} compressed images at once...`);

                // Upload all images in one request
                const response = await TaskApis.uploadImage(formData);
                console.log('Bulk upload response:', response);

                // Extract all URLs from the response
                let uploadedUrls = [];

                // Handle both response formats (array or single URL)
                if (response && response.success) {
                    setUploadProgress(70); // Update progress

                    // Case 1: Response has data.allUrls array (from our handler)
                    if (response.data && response.data.allUrls && Array.isArray(response.data.allUrls)) {
                        uploadedUrls = response.data.allUrls;
                        console.log(`Extracted ${uploadedUrls.length} URLs from allUrls`);
                    }
                    // Case 2: Response data is directly an array of URLs
                    else if (response.data && Array.isArray(response.data)) {
                        uploadedUrls = response.data;
                        console.log(`Extracted ${uploadedUrls.length} URLs from data array`);
                    }
                    // Case 3: Single URL in data.url
                    else if (response.data && response.data.url) {
                        uploadedUrls = [response.data.url];
                        console.log('Extracted single URL from data.url');
                    }
                    // Case 4: Fallback for unexpected formats
                    else {
                        // Use placeholder URLs or local URIs as fallback
                        uploadedUrls = selectedImages.map(img => img.uri);
                        console.warn('Could not extract URLs from response, using local URIs as fallback');
                    }
                } else {
                    console.error('Upload failed:', response);
                    throw new Error(response?.message || 'Upload failed');
                }

                setUploadProgress(80); // Update progress before final step

                // Update maintenance with all uploaded image URLs
                if (uploadedUrls.length > 0) {
                    console.log(`Proceeding with maintenance update using ${uploadedUrls.length} URLs`);

                    const updateResponse = await TaskApis.updateMaintenanceStatus({
                        maintenanceId: task._id,
                        status: 'COMPLETED',
                        images: uploadedUrls,
                        price: getRawPrice()
                    });

                    setUploadProgress(100); // Complete

                    if (updateResponse && updateResponse.success) {
                        setTask(updateResponse.data);
                        setShowImageUploader(false);
                        setSelectedImages([]);

                        Toast.show({
                            text1: 'Maintenance completed successfully',
                            type: 'success'
                        });
                    } else {
                        const errorMsg = updateResponse?.message || 'Failed to complete maintenance';
                        showToast(errorMsg);
                        console.error('Update maintenance error:', errorMsg);
                    }
                } else {
                    throw new Error('No images were successfully uploaded');
                }

            } catch (uploadError) {
                console.error('Error uploading images:', uploadError);

                // Ask user if they want to complete maintenance with just price
                Alert.alert(
                    'Upload Problem',
                    'There was a problem uploading the images. Do you want to complete the maintenance with just the price?',
                    [
                        {
                            text: 'Cancel',
                            style: 'cancel',
                            onPress: () => setIsSubmitting(false)
                        },
                        {
                            text: 'Complete anyway',
                            onPress: async () => {
                                try {
                                    const updateResponse = await TaskApis.updateMaintenanceStatus({
                                        maintenanceId: task._id,
                                        status: 'COMPLETED',
                                        images: [],
                                        price: getRawPrice()
                                    });

                                    if (updateResponse && updateResponse.success) {
                                        setTask(updateResponse.data);
                                        setShowImageUploader(false);
                                        setSelectedImages([]);
                                        showToast('Maintenance completed successfully');
                                    } else {
                                        showToast(updateResponse?.message || 'Failed to complete maintenance');
                                    }
                                } catch (err) {
                                    console.error('Error completing maintenance without images:', err);
                                    showToast('Failed to complete maintenance');
                                } finally {
                                    setIsSubmitting(false);
                                }
                            }
                        }
                    ]
                );
            }

        } catch (error) {
            console.error('Error in overall upload process:', error);
            showToast('Upload process failed: ' + (error.message || 'Unknown error'));
            Alert.alert('Upload Error', 'There was a problem with the upload process. Please try again or contact support.');
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };

    const handleAcceptTask = async () => {
        try {
            setIsSubmitting(true);

            // If it's a maintenance task, use updateMaintenanceStatus
            if (task.type !== 'CLEANING') {
                const response = await TaskApis.updateMaintenanceStatus({
                    maintenanceId: task._id,
                    status: 'IN_PROGRESS'
                });

                if (response?.success) {
                    setTask(response.data);
                    showToast(response.message || 'Task accepted successfully');
                } else {
                    showToast(response.message || 'Failed to accept task');
                }
            } else {
                // For cleaning tasks, use the existing updateTask
                const response = await updateTask(task._id, {
                    status: 'IN_PROGRESS'
                });

                if (response?.success) {
                    setTask(response.data);
                    showToast(response.message);
                } else {
                    showToast(response.message || 'Failed to accept task');
                }
            }
        } catch (error) {
            console.error('Error accepting task:', error);
            showToast('Failed to accept task');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCompleteChecklist = async (checklistData) => {
        try {
            setIsSubmitting(true);
            const response = await updateTask(task._id, {
                status: 'COMPLETED',
                checklist: checklistData
            });

            if (response?.success) {
                setTask(response.data);
                setShowChecklist(false);
                showToast(response.message);
            } else {
                showToast(response.message || 'Failed to complete checklist');
            }
        } catch (error) {
            console.error('Error completing checklist:', error);
            showToast('Failed to complete checklist');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePropertyProblem = () => {
        if (!taskId) {
            console.error('No taskId available');
            window.alert('Task information not available');
            return;
        }

        console.log('Navigating to PropertyProblem with task:', task?._id);
        const navigationParams = {
            taskId: taskId,
            propertyId: task?.propertyId?._id,
            problems: task?.propertyProblems || []
        };

        navigation.navigate('PropertyProblem', navigationParams);
    };

    useEffect(() => {
        if (!route.params?.taskId) {
            console.error('TaskDetailsScreen - No taskId in route params');
            window.alert('Missing required task information');
            navigation.goBack();
        }
    }, [route]);

    const renderCompletedChecklist = () => {
        const checkListCompleted = task?.propertyDetails?.checkListCompleted || [];

        if (!checkListCompleted || checkListCompleted.length === 0) {
            console.log('No completed checklist found');
            return null;
        }

        console.log('Found checklist items:', checkListCompleted.length);

        return (
            <TouchableOpacity
                style={styles.detailItem}
                onPress={() => {
                    console.log('Navigating to CompletedChecklist with data:', checkListCompleted);
                    navigation.navigate('CompletedChecklist', {
                        checkListCompleted: checkListCompleted
                    });
                }}
            >
                <Ionicons name="list-circle-outline" size={24} color="#666" />
                <Text style={styles.detailText}>Cleaning Checklist</Text>
                <Text style={styles.detailCount}>
                    {checkListCompleted.length} section(s)
                </Text>
                <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
        );
    };

    const CleanerUI = ({ task, isSubmitting, handleAcceptTask, setShowChecklist, renderCompletedChecklist }) => {
        // Log task structure for debugging
        console.log('CleanerUI rendering with task:', task?._id);

        // Use propertyId instead of propertyDetails
        const propertyDetails = task?.propertyId || {};
        const address = propertyDetails?.address || {};
        const formattedAddress = address?.display || 'No address available';

        // Use checkInDate and checkOutDate directly
        const checkInDate = task?.checkInDate;
        const checkOutDate = task?.checkOutDate;

        return (
            <ScrollView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.projectId}>
                        Project #{task?._id?.slice(-8) || 'N/A'}
                    </Text>
                    <Text style={styles.projectTitle}>
                        {propertyDetails?.name || 'Unknown Property'}
                    </Text>
                </View>

                {/* Type Badge */}
                <View style={styles.typeBadge}>
                    <Ionicons name="water" size={20} color="#666" />
                    <Text style={styles.typeText}>{task?.type || 'CLEANING'}</Text>
                </View>

                {/* Time Section */}
                <View style={styles.timeSection}>
                    <View style={styles.timeColumn}>
                        <Text style={styles.timeLabel}>Check In</Text>
                        <Text style={styles.timeValue}>
                            {checkInDate ?
                                format(new Date(checkInDate), 'h:mm a')
                                : 'N/A'}
                        </Text>
                        <Text style={styles.dateText}>
                            {checkInDate ?
                                format(new Date(checkInDate), 'EEE, MMM d yyyy')
                                : 'N/A'}
                        </Text>
                    </View>
                    <View style={styles.timeColumn}>
                        <Text style={styles.timeLabel}>Check Out</Text>
                        <Text style={styles.timeValue}>
                            {checkOutDate ?
                                format(new Date(checkOutDate), 'h:mm a')
                                : 'N/A'}
                        </Text>
                        <Text style={styles.dateText}>
                            {checkOutDate ?
                                format(new Date(checkOutDate), 'EEE, MMM d yyyy')
                                : 'N/A'}
                        </Text>
                    </View>
                </View>

                {/* Details List */}
                <View style={styles.detailsList}>
                    <TouchableOpacity style={styles.detailItem}>
                        <Ionicons name="location" size={24} color="#666" />
                        <Text style={styles.detailText}>
                            {formattedAddress || 'No address available'}
                        </Text>
                    </TouchableOpacity>

                    {/* Status Tags */}
                    <View style={[styles.detailItem, styles.statusContainer]}>
                        <Ionicons name="stats-chart" size={24} color="#666" />
                        <Text style={styles.detailText}>Status</Text>
                        <View style={[styles.statusTag, { backgroundColor: getStatusColor(task?.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(task?.status) }]}>
                                {task?.status || 'N/A'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.detailItem}>
                        <Ionicons name="cash" size={24} color="#666" />
                        <Text style={styles.detailText}>Cleaning Price</Text>
                        <Text style={styles.priceText}>
                            {formatCurrency(task?.price?.amount)}
                        </Text>
                    </View>

                    <View style={styles.detailItem}>
                        <Ionicons name="key" size={24} color="#666" />
                        <Text style={styles.detailText}>Access Code</Text>
                        <View style={styles.codeContainer}>
                            <Text style={styles.codeText}>
                                {propertyDetails?.access_code || 'N/A'}
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.detailItem}
                        onPress={handlePropertyProblem}
                    >
                        <Ionicons name="alert-circle" size={24} color="#666" />
                        <Text style={styles.detailText}>Property Problems</Text>
                        <View style={styles.problemBadge}>
                            <Text style={styles.problemCount}>
                                {task?.propertyProblems?.length || 0}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#666" />
                    </TouchableOpacity>


                    {renderCompletedChecklist()}
                    {/* Accept Button - only show when status is ASSIGNED or PENDING */}
                    {(task?.status === TASK_STATUS.PENDING || task?.status === TASK_STATUS.ASSIGNED) && (
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                styles.acceptButton,
                                isSubmitting && styles.disabledButton
                            ]}
                            onPress={handleAcceptTask}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.actionButtonText}>
                                {isSubmitting ? 'Processing...' : 'Accept Task'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Complete Checklist Button - only show when status is IN_PROGRESS */}
                    {task?.status === TASK_STATUS.IN_PROGRESS && (
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                styles.checklistButton,
                                isSubmitting && styles.disabledButton
                            ]}
                            onPress={() => setShowChecklist(true)}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.actionButtonText}>
                                {isSubmitting ? 'Processing...' : 'Complete Checklist'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        );
    };

    const MaintenanceUI = ({ task, isSubmitting, handleAcceptTask }) => {
        // Log task structure for debugging
        console.log('MaintenanceUI rendering with task:', task?._id);

        // Use propertyId as an object instead of accessing nested properties
        const propertyDetails = task?.propertyId || {};

        return (
            <ScrollView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.projectId}>
                        Maintenance #{task?._id?.slice(-8) || 'N/A'}
                    </Text>
                    <Text style={styles.projectTitle}>
                        {propertyDetails?.name || 'Unknown Property'}
                    </Text>
                </View>

                {/* Type Badge */}
                <View style={styles.typeBadge}>
                    <Ionicons name="build" size={20} color="#666" />
                    <Text style={styles.typeText}>MAINTENANCE</Text>
                </View>

                {/* Title and Description */}
                <View style={styles.detailsList}>
                    <View style={styles.detailItem}>
                        <Ionicons name="document-text" size={24} color="#666" />
                        <Text style={[styles.detailText, styles.titleText]}>
                            {task?.title || 'No Title'}
                        </Text>
                    </View>

                    {task?.description && (
                        <View style={styles.detailItem}>
                            <Ionicons name="information-circle" size={24} color="#666" />
                            <Text style={styles.detailText}>
                                {task.description}
                            </Text>
                        </View>
                    )}

                    {/* Assigned To */}
                    {task?.assignedTo && (
                        <View style={styles.detailItem}>
                            <Ionicons name="person" size={24} color="#666" />
                            <Text style={styles.detailText}>Assigned To</Text>
                            <Text style={styles.assignedValue}>
                                {task.assignedTo.fullName || 'Unassigned'}
                            </Text>
                        </View>
                    )}

                    {/* Deadline Date */}
                    {task?.deadlineDate && (
                        <View style={styles.detailItem}>
                            <Ionicons name="calendar" size={24} color="#666" />
                            <Text style={styles.detailText}>Deadline</Text>
                            <Text style={styles.dateValue}>
                                {format(new Date(task.deadlineDate), 'EEE, MMM d yyyy')}
                            </Text>
                        </View>
                    )}

                    {/* Price if available */}
                    {task?.price && (
                        <View style={styles.detailItem}>
                            <Ionicons name="cash" size={24} color="#666" />
                            <Text style={styles.detailText}>Service Price</Text>
                            <Text style={styles.priceText}>
                                {formatCurrency(task?.price?.amount || 0)}
                            </Text>
                        </View>
                    )}

                    {/* Property */}
                    <TouchableOpacity style={styles.detailItem}>
                        <Ionicons name="location" size={24} color="#666" />
                        <Text style={styles.detailText}>
                            {propertyDetails?.name || 'Unknown Property'}
                        </Text>
                    </TouchableOpacity>

                    {/* Status Tags */}
                    <View style={[styles.detailItem, styles.statusContainer]}>
                        <Ionicons name="stats-chart" size={24} color="#666" />
                        <Text style={styles.detailText}>Status</Text>
                        <View style={[styles.statusTag, { backgroundColor: getStatusColor(task?.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(task?.status) }]}>
                                {task?.status || 'N/A'}
                            </Text>
                        </View>
                    </View>

                    {/* Images - If there are images attached */}
                    {task?.images && task.images.length > 0 && (
                        <TouchableOpacity
                            style={styles.detailItem}
                            onPress={() => navigation.navigate('ImageViewer', { images: task.images })}
                        >
                            <Ionicons name="images" size={24} color="#666" />
                            <Text style={styles.detailText}>Maintenance Photos</Text>
                            <View style={styles.problemBadge}>
                                <Text style={styles.problemCount}>
                                    {task.images.length}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="#666" />
                        </TouchableOpacity>
                    )}

                    {/* Accept Button - only show when status is ASSIGNED */}
                    {task?.status === TASK_STATUS.ASSIGNED && (
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                styles.acceptButton,
                                isSubmitting && styles.disabledButton
                            ]}
                            onPress={handleAcceptTask}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.actionButtonText}>
                                {isSubmitting ? 'Processing...' : 'Accept Maintenance Task'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Complete Checklist Button - only show when status is IN_PROGRESS */}
                    {task?.status === TASK_STATUS.IN_PROGRESS && (
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                styles.checklistButton,
                                isSubmitting && styles.disabledButton
                            ]}
                            onPress={pickImages}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.actionButtonText}>
                                {isSubmitting ? 'Processing...' : 'Complete with Photos'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        );
    };

    // Image Uploader Component
    const ImageUploader = () => {
        if (!showImageUploader) return null;

        return (
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Upload Maintenance Photos</Text>

                    <ScrollView horizontal style={styles.imagePreviewContainer}>
                        {selectedImages.map((image, index) => (
                            <View key={index} style={styles.imagePreviewWrapper}>
                                <Image source={{ uri: image.uri }} style={styles.imagePreview} />
                                <TouchableOpacity
                                    style={styles.removeImageButton}
                                    onPress={() => {
                                        const newImages = [...selectedImages];
                                        newImages.splice(index, 1);
                                        setSelectedImages(newImages);
                                    }}
                                >
                                    <Ionicons name="close-circle" size={24} color="#FF5252" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>

                    {/* Maintenance Price - Simple with no formatting */}
                    <View style={styles.notesContainer}>
                        <Text style={styles.notesLabel}>
                            Maintenance Price <Text style={styles.requiredText}>*</Text>
                        </Text>

                        {/* Simple plain numeric input - no formatting */}
                        <TextInput
                            style={styles.notesInput}
                            value={rawPrice}
                            onChangeText={(text) => {
                                // Only allow digits
                                const numericOnly = text.replace(/[^0-9]/g, '');
                                setRawPrice(numericOnly);
                            }}
                            placeholder="Enter price in dollars"
                            keyboardType="numeric"
                            returnKeyType="done"
                            disableFullscreenUI={true}
                            autoFocus={false}
                            caretHidden={false}
                            contextMenuHidden={true}
                        />

                        <Text style={styles.priceHelperText}>
                            Enter whole dollar amount (no cents)
                        </Text>
                    </View>

                    {isSubmitting && (
                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
                            <Text style={styles.progressText}>{Math.round(uploadProgress)}%</Text>
                        </View>
                    )}

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => {
                                setShowImageUploader(false);
                                setSelectedImages([]);
                            }}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.modalButton,
                                styles.uploadButton,
                                (isSubmitting || !rawPrice || parseInt(rawPrice, 10) === 0) && styles.disabledButton
                            ]}
                            onPress={uploadImages}
                            disabled={isSubmitting || !rawPrice || parseInt(rawPrice, 10) === 0}
                        >
                            <Text style={styles.uploadButtonText}>
                                {isSubmitting ? 'Uploading...' : 'Upload & Complete'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <>
            {loading && (
                <View style={[styles.container, styles.centerContent]}>
                    <ActivityIndicator size="large" color="#00BFA5" />
                </View>
            )}

            {error && (
                <View style={[styles.container, styles.centerContent]}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={fetchTaskDetails}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}

            {!loading && !error && !task && (
                <View style={[styles.container, styles.centerContent]}>
                    <Text>Task not found</Text>
                </View>
            )}

            {!loading && !error && task && (
                <>
                    {task.type === 'CLEANING' ? (
                        <CleanerUI
                            task={task}
                            isSubmitting={isSubmitting}
                            handleAcceptTask={handleAcceptTask}
                            setShowChecklist={setShowChecklist}
                            renderCompletedChecklist={renderCompletedChecklist}
                        />
                    ) : (
                        <MaintenanceUI
                            task={task}
                            isSubmitting={isSubmitting}
                            handleAcceptTask={handleAcceptTask}
                            setShowChecklist={setShowChecklist}
                        />
                    )}

                    <ChecklistModal
                        visible={showChecklist}
                        onClose={() => setShowChecklist(false)}
                        onComplete={handleCompleteChecklist}
                        loading={isSubmitting}
                        checkList={task?.propertyId?.check_list || []}
                    />

                    <ImageUploader />
                </>
            )}
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 20,
        backgroundColor: '#00BFA5',
    },
    projectId: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    projectTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginVertical: 10,
    },
    teamRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    teamLabel: {
        color: 'white',
        fontSize: 16,
    },
    teamName: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    ratingContainer: {
        flexDirection: 'row',
        marginLeft: 10,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        alignSelf: 'flex-start',
        padding: 10,
        borderRadius: 20,
        margin: 20,
    },
    typeText: {
        marginLeft: 5,
        color: '#666',
        fontWeight: '500',
    },
    timeSection: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 20,
        marginHorizontal: 20,
        borderRadius: 10,
        justifyContent: 'space-around',
    },
    timeColumn: {
        alignItems: 'center',
        flex: 1,
    },
    timeLabel: {
        color: '#666',
        fontSize: 16,
        marginBottom: 5,
    },
    timeValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    dateText: {
        color: '#666',
        fontSize: 14,
        marginTop: 2,
    },
    requestedTime: {
        color: '#666',
        fontSize: 12,
        marginTop: 5,
        fontStyle: 'italic',
    },
    statusTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 20,
        gap: 10,
    },
    statusTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        padding: 10,
        borderRadius: 20,
    },
    statusText: {
        marginLeft: 5,
        color: '#4CAF50',
        fontWeight: '500',
    },
    detailsList: {
        backgroundColor: 'white',
        marginHorizontal: 20,
        borderRadius: 10,
        padding: 20,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    detailText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#333',
        lineHeight: 22,
    },
    detailCount: {
        marginHorizontal: 10,
        color: '#666',
    },
    checklistButton: {
        backgroundColor: '#00BFA5',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
    },
    checklistButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        color: 'red',
        marginBottom: 20,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: '#00BFA5',
        padding: 10,
        borderRadius: 5,
    },
    retryButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    disabledButton: {
        opacity: 0.7,
    },
    actionButton: {
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
    },
    acceptButton: {
        backgroundColor: '#1976D2', // Blue
    },
    checklistButton: {
        backgroundColor: '#00BFA5', // Green
    },
    actionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    priceText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#00BFA5',
        marginLeft: 'auto',
    },
    codeContainer: {
        marginLeft: 'auto',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    codeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        letterSpacing: 1,
    },
    problemBadge: {
        backgroundColor: '#FF5252',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginHorizontal: 8,
    },
    problemCount: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    titleText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statusContainer: {
        alignItems: 'center',
    },
    dateValue: {
        marginLeft: 'auto',
        fontWeight: '500',
        color: '#333',
    },
    assignedValue: {
        marginLeft: 'auto',
        fontWeight: '500',
        color: '#1976D2',
    },
    // Image uploader styles
    modalContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        width: '90%',
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    imagePreviewContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    imagePreviewWrapper: {
        position: 'relative',
        margin: 5,
    },
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: 10,
    },
    removeImageButton: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: 'white',
        borderRadius: 12,
    },
    progressContainer: {
        height: 20,
        backgroundColor: '#f5f5f5',
        borderRadius: 10,
        marginBottom: 20,
        overflow: 'hidden',
        position: 'relative',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#00BFA5',
    },
    progressText: {
        position: 'absolute',
        width: '100%',
        textAlign: 'center',
        color: '#333',
        fontWeight: 'bold',
        lineHeight: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    uploadButton: {
        backgroundColor: '#00BFA5',
    },
    cancelButtonText: {
        color: '#333',
        fontWeight: 'bold',
    },
    uploadButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    // Add these new styles for the notes
    notesContainer: {
        marginBottom: 20,
    },
    notesLabel: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 8,
        color: '#333',
    },
    notesInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    requiredText: {
        color: '#FF5252',
        fontWeight: 'bold',
    },
    priceDisplay: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#00BFA5',
        marginBottom: 8,
    },
    priceHelperText: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
        fontStyle: 'italic',
    },
}); 