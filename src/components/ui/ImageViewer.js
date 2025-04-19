import React, { useState, useRef, useEffect } from 'react';
import { View, Image, Modal, TouchableOpacity, Dimensions, FlatList, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const ImageViewer = ({ imageUrls, isVisible, onClose, initialIndex = 0 }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [loadingImage, setLoadingImage] = useState(false);
    const [imageError, setImageError] = useState({});
    const flatListRef = useRef(null);

    // Log image URLs for debugging
    useEffect(() => {
        console.log(`ImageViewer received ${imageUrls?.length || 0} images`);
        imageUrls?.forEach((img, idx) => {
            console.log(`Image ${idx} URL: ${img.url || img}`);
        });
    }, [imageUrls]);

    const handleNext = () => {
        if (currentIndex < imageUrls.length - 1) {
            const newIndex = currentIndex + 1;
            setCurrentIndex(newIndex);
            // Scroll FlatList to the new index
            flatListRef.current?.scrollToIndex({
                index: newIndex,
                animated: true
            });
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            const newIndex = currentIndex - 1;
            setCurrentIndex(newIndex);
            // Scroll FlatList to the new index
            flatListRef.current?.scrollToIndex({
                index: newIndex,
                animated: true
            });
        }
    };

    // Handle scroll end to ensure currentIndex is in sync with scroll position
    const handleScrollEnd = (event) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const newIndex = Math.round(offsetX / width);

        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < imageUrls.length) {
            console.log(`Scroll ended at index ${newIndex}, updating currentIndex`);
            setCurrentIndex(newIndex);
        }
    };

    const renderItem = ({ item, index }) => {
        // Handle different types of image URL formats
        const imageUrl = item.url || item;

        console.log(`Rendering image ${index} with URL:`, imageUrl);

        return (
            <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
                {loadingImage && index === currentIndex && (
                    <ActivityIndicator size="large" color="#fff" style={{ position: 'absolute', zIndex: 10 }} />
                )}

                {imageError[index] ? (
                    <View style={{ alignItems: 'center' }}>
                        <Ionicons name="image-outline" size={80} color="#666" />
                        <Text style={{ color: 'white', marginTop: 20 }}>
                            Failed to load image
                        </Text>
                        <Text style={{ color: '#999', fontSize: 12, marginTop: 10, textAlign: 'center', maxWidth: width * 0.8 }}>
                            {imageUrl}
                        </Text>
                    </View>
                ) : (
                    <Image
                        source={{ uri: imageUrl }}
                        style={{ width: width * 0.9, height: height * 0.7, resizeMode: 'contain' }}
                        onLoadStart={() => {
                            if (index === currentIndex) setLoadingImage(true);
                        }}
                        onLoadEnd={() => {
                            if (index === currentIndex) setLoadingImage(false);
                        }}
                        onError={() => {
                            console.error(`Error loading image ${index} at URL: ${imageUrl}`);
                            setImageError(prev => ({ ...prev, [index]: true }));
                            if (index === currentIndex) setLoadingImage(false);
                        }}
                    />
                )}
                <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 5, borderRadius: 10 }}>
                    <Text style={{ color: 'white', fontSize: 12 }}>
                        {index + 1}/{imageUrls.length}
                    </Text>
                </View>
            </View>
        );
    };

    // Skip rendering if no image URLs
    if (!imageUrls || imageUrls.length === 0) {
        return (
            <Modal visible={isVisible} transparent={true} animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: 'white' }}>No images to display</Text>
                    <TouchableOpacity
                        style={{ marginTop: 20, padding: 10, backgroundColor: '#00BFA5', borderRadius: 8 }}
                        onPress={onClose}
                    >
                        <Text style={{ color: 'white' }}>Close</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={isVisible} transparent={true} animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
                <TouchableOpacity
                    style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, backgroundColor: 'rgba(50,50,50,0.5)', borderRadius: 20, padding: 8 }}
                    onPress={onClose}
                >
                    <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>

                <FlatList
                    ref={flatListRef}
                    data={imageUrls}
                    renderItem={renderItem}
                    horizontal
                    pagingEnabled
                    initialScrollIndex={initialIndex}
                    getItemLayout={(data, index) => ({
                        length: width,
                        offset: width * index,
                        index,
                    })}
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleScrollEnd}
                    // Prevent performance issues with large image lists
                    windowSize={3}
                    maxToRenderPerBatch={3}
                    removeClippedSubviews={true}
                    // Prevent list recreation when data changes slightly
                    keyExtractor={(item, index) => `image-${index}-${item.url || item}`}
                />

                {imageUrls.length > 1 && (
                    <>
                        {currentIndex > 0 && (
                            <TouchableOpacity
                                style={{ position: 'absolute', left: 20, backgroundColor: 'rgba(50,50,50,0.5)', borderRadius: 20, padding: 8 }}
                                onPress={handlePrevious}
                            >
                                <Ionicons name="chevron-back" size={30} color="white" />
                            </TouchableOpacity>
                        )}

                        {currentIndex < imageUrls.length - 1 && (
                            <TouchableOpacity
                                style={{ position: 'absolute', right: 20, backgroundColor: 'rgba(50,50,50,0.5)', borderRadius: 20, padding: 8 }}
                                onPress={handleNext}
                            >
                                <Ionicons name="chevron-forward" size={30} color="white" />
                            </TouchableOpacity>
                        )}

                        <View style={{ position: 'absolute', bottom: 40, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                            <Text style={{ color: 'white', fontSize: 14, marginRight: 10 }}>
                                {currentIndex + 1}/{imageUrls.length}
                            </Text>
                            <View style={{ flexDirection: 'row' }}>
                                {imageUrls.map((_, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => {
                                            setCurrentIndex(index);
                                            flatListRef.current?.scrollToIndex({
                                                index,
                                                animated: true
                                            });
                                        }}
                                    >
                                        <View
                                            style={{
                                                height: 8,
                                                width: 8,
                                                borderRadius: 4,
                                                marginHorizontal: 4,
                                                backgroundColor: index === currentIndex ? '#fff' : '#666'
                                            }}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </>
                )}
            </View>
        </Modal>
    );
};

export default ImageViewer;