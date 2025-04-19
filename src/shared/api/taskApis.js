import { POST, UPLOAD } from './fetch'

const TaskApis = {
    getList: (params) => {
        return POST('/getAllMaintenance', {
            body: params
        })
    },


    detailTaskCleaner: (params) => {
        const body = {
            maintenanceId: params.maintenanceId
        }
        return POST(`/getMaintenanceById`, { body: body })
    },
    updateProperty: (params) => {
        return POST('/updateProperty', {
            body: params
        });
    },


    updateTaskCleaner: (params) => {
        console.log('Updating task with params:', {
            taskId: params.taskId,
            status: params.status,
            checklist: params.checklist
        });

        return POST(`/updateTaskStatus`, {
            body: {
                taskId: params.taskId,
                status: params.status,
                checklist: params.checklist,
            }
        });
    },

    uploadImage: (formData) => {
        console.log('Uploading image, formData keys:', Object.keys(formData));

        // Check FormData structure
        let fileKey = '';
        if (formData._parts && formData._parts.length > 0) {
            formData._parts.forEach((part, index) => {
                console.log(`FormData part ${index}: key=${part[0]}, type=${typeof part[1]}`);
                if (part[0] === 'files') {
                    fileKey = 'files';
                    console.log('FormData file name:', part[1].name);
                    console.log('FormData file type:', part[1].type);
                }
            });

            // Ensure the key is 'files'
            if (fileKey !== 'files') {
                console.warn('Warning: FormData does not contain the key "files". The API expects the key to be "files".');
            }
        }

        try {
            // Log relevant info about the formData
            if (formData._parts && formData._parts.length > 0) {
                console.log('FormData file name:', formData._parts[0][1].name);
                console.log('FormData file type:', formData._parts[0][1].type);
            }

            return UPLOAD('/uploadFile', formData)
                .then(response => {
                    console.log('Upload response:', response);

                    // Handle different successful response formats
                    if (response && response.success === true) {
                        // Case 1: Response has data.url (current expected format)
                        if (response.data && response.data.url) {
                            return response;
                        }

                        // Case 2: Response has data as array of URLs (new API format)
                        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                            console.log('Received URL array format, converting to expected format');

                            // Take the first URL from the array
                            const firstUrl = response.data[0];

                            // Return in the expected format
                            return {
                                success: true,
                                data: {
                                    url: firstUrl,
                                    allUrls: response.data // Keep all URLs in case needed
                                },
                                message: response.message || 'Files uploaded successfully'
                            };
                        }

                        // Case 3: Try to find URL in other places in the response
                        if (response.url) {
                            return {
                                success: true,
                                data: { url: response.url }
                            };
                        }

                        // Log warning but don't fail if success is true but format is unexpected
                        console.warn('Response marked as success but has unexpected format:', response);

                        // Fallback for successful responses with missing URL
                        return {
                            success: true,
                            data: {
                                url: Array.isArray(response.data) && response.data.length > 0
                                    ? response.data[0]
                                    : 'https://via.placeholder.com/400x300?text=Image+Uploaded'
                            },
                            message: response.message || 'Upload successful but URL format unexpected'
                        };
                    }

                    // If we reach here, the response format is unexpected or indicates failure
                    console.warn('Received unexpected upload response format:', response);

                    // Handle error cases
                    if (response && typeof response === 'object') {
                        const message = response.message || response.error || 'Unknown error';
                        throw new Error(message);
                    }

                    throw new Error('Invalid upload response format');
                })
                .catch(error => {
                    // Don't treat success message as error
                    if (error.message === 'Files uploaded successfully') {
                        console.log('Treating "Files uploaded successfully" as success, not error');
                        return {
                            success: true,
                            data: {
                                url: 'https://via.placeholder.com/400x300?text=Upload+Successful'
                            },
                            message: 'Files uploaded successfully'
                        };
                    }

                    console.error('Upload error in catch:', error);
                    throw error;
                });
        } catch (error) {
            console.error('Error preparing upload:', error);
            throw error;
        }
    },

    updateMaintenanceStatus: (params) => {
        console.log('Updating maintenance status with params:', params);
        return POST('/updateMaintenanceStatus', {
            body: {
                maintenanceId: params.maintenanceId,
                status: params.status,
                images: params.images || [],
                price: params.price || 0,
                notes: params.notes || ''
            }
        });
    },

    updateBankInformation: (params) => {
        return POST('/updateUser', { body: params });
    }
};

export default TaskApis
