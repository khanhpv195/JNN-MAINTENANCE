import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import ImageViewer from '../components/ui/ImageViewer';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function ImageViewerScreen({ route, navigation }) {
    const [isVisible, setIsVisible] = useState(true);
    const [formattedImages, setFormattedImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log('ImageViewerScreen - Received params:', JSON.stringify(route.params));

        // Format images for the ImageViewer component
        if (route.params?.images && Array.isArray(route.params?.images)) {
            try {
                console.log('Processing images array of length:', route.params.images.length);

                // Ensure each image URL is unique by adding a timestamp query parameter
                // This prevents caching issues that might make different URLs appear as the same image
                const formatted = route.params.images.map((img, index) => {
                    console.log(`Processing image ${index}:`, typeof img, img);

                    // Create unique URL to prevent caching issues
                    let uniqueUrl;

                    // Handle both string URLs and objects with url property
                    if (typeof img === 'string') {
                        console.log(`Image ${index} is a string URL:`, img);
                        // Add timestamp to make URL unique
                        uniqueUrl = img.includes('?')
                            ? `${img}&_t=${Date.now()}_${index}`
                            : `${img}?_t=${Date.now()}_${index}`;
                        return { url: uniqueUrl, originalUrl: img };
                    } else if (img && img.url) {
                        console.log(`Image ${index} is an object with url:`, img.url);
                        // Add timestamp to make URL unique
                        uniqueUrl = img.url.includes('?')
                            ? `${img.url}&_t=${Date.now()}_${index}`
                            : `${img.url}?_t=${Date.now()}_${index}`;
                        return { ...img, url: uniqueUrl, originalUrl: img.url };
                    } else {
                        // If it's neither a string nor has a url property, use it directly
                        console.log(`Image ${index} is using direct value:`, img);
                        // Add timestamp to make URL unique if it's a string-like value
                        if (img && typeof img.toString === 'function') {
                            const imgStr = img.toString();
                            uniqueUrl = imgStr.includes('?')
                                ? `${imgStr}&_t=${Date.now()}_${index}`
                                : `${imgStr}?_t=${Date.now()}_${index}`;
                            return { url: uniqueUrl, originalUrl: imgStr };
                        }
                        return { url: img, originalUrl: img };
                    }
                });

                console.log('Formatted images with unique URLs:', formatted.map(img => img.url));
                setFormattedImages(formatted);
            } catch (err) {
                console.error('Error formatting images:', err);
                setError('Failed to process images: ' + err.message);
            }
        } else {
            console.error('No images provided or images is not an array:', route.params?.images);
            setError('No images provided or invalid image data');
        }

        setLoading(false);
    }, [route.params?.images]);

    const handleClose = () => {
        setIsVisible(false);
        navigation.goBack();
    };

    // For debugging purposes, show thumbnails of all images
    const renderImageThumbnails = () => {
        if (formattedImages.length <= 1) return null;

        return (
            <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Debug: All {formattedImages.length} images</Text>
                <ScrollView horizontal style={styles.thumbnailScroll}>
                    {formattedImages.map((img, index) => (
                        <View key={index} style={styles.thumbnailContainer}>
                            <Image
                                source={{ uri: img.url }}
                                style={styles.thumbnail}
                                resizeMode="cover"
                            />
                            <Text style={styles.thumbnailText}>{index + 1}</Text>
                        </View>
                    ))}
                </ScrollView>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00BFA5" />
                <Text style={styles.loadingText}>Loading images...</Text>
            </View>
        );
    }

    if (error || formattedImages.length === 0) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={64} color="#FF5252" />
                <Text style={styles.errorText}>{error || 'No images to display'}</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ImageViewer
                imageUrls={formattedImages}
                isVisible={isVisible}
                onClose={handleClose}
                initialIndex={0}
            />
            {__DEV__ && renderImageThumbnails()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
    loadingText: {
        color: '#fff',
        marginTop: 10,
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
        padding: 20,
    },
    errorText: {
        color: '#fff',
        marginTop: 20,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 30,
    },
    backButton: {
        backgroundColor: '#00BFA5',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    backButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    debugContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 10,
    },
    debugTitle: {
        color: '#fff',
        fontSize: 12,
        marginBottom: 5,
    },
    thumbnailScroll: {
        flexDirection: 'row',
    },
    thumbnailContainer: {
        marginRight: 10,
        alignItems: 'center',
    },
    thumbnail: {
        width: 60,
        height: 60,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#fff',
    },
    thumbnailText: {
        color: '#fff',
        fontSize: 10,
        marginTop: 2,
    }
}); 