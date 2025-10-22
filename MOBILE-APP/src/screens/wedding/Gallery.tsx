import React, { useState } from "react";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Modal, Pressable, Image, Dimensions } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp} from "react-native-responsive-screen";
import colors from "../config/colors";
import Svg, { Path } from "react-native-svg";
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faChevronRight } from '@fortawesome/free-solid-svg-icons';

import NavigationSlider from './ReusableComponents/NavigationSlider';
import MenuBar from "./ReusableComponents/MenuBar";

const screenWidth = Dimensions.get('window').width;

const Gallery  = () => {
  
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient colors={["#FFFFFF", "#f2e8e2ff"]} style={{ flex: 1 }}>
          {/* HEADER */}
          <View>
              <NavigationSlider headerTitle="Gallery" />
          </View>
          {/* HEADER */}
          {/* ===== CONTENT ===== */}
          <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: hp("8%") }}>
              <View style={styles.galleryHeader}>
                  <Text style={styles.galleryHeaderText}>Media Collection</Text>
                  <Text style={styles.galleryHeaderSubText}>Your event memories, all in one place.</Text>
              </View>

            {/* PHOTOS CONTAINER */}
            <View style={styles.imageContainer}>
              <View style={styles.imageHeader}>
                <Text style={styles.imageHeaderText}>Photo</Text>
                <TouchableOpacity
                  style={styles.seeMoreButton}
                >
                  <Text>See more</Text>
                  <FontAwesomeIcon icon={faChevronRight} size={12} />
                </TouchableOpacity>
              </View>
                {/* PHOTOS GRID */}
                <View>
                    <View style={styles.photosItems}>
                        <Image
                          style={styles.image}
                          source={require('../../assets/SAMPLE_1.png')}
                          resizeMode="cover"
                        />
                        <Image
                          style={styles.image}
                          source={require('../../assets/SAMPLE_1.png')}
                          resizeMode="cover"
                        />
                        <Image
                          style={styles.image}
                          source={require('../../assets/SAMPLE_1.png')}
                          resizeMode="cover"
                        />
                        <Image
                          style={styles.image}
                          source={require('../../assets/SAMPLE_1.png')}
                          resizeMode="cover"
                        />
                    </View>
                </View>
                {/* PHOTOS GRID */}
            </View>
            {/* PHOTOS CONTAINER */}

            {/* VIDEOS CONTAINER */}
            <View style={[styles.imageContainer, styles.videosContainer]}>
              <View style={styles.imageHeader}>
                <Text style={styles.imageHeaderText}>Video</Text>
              </View>

              {/* VIDEOS GRID */}
              <View style={styles.videosGrid}>
                   <View style={styles.videoItem}>
                    <Image
                      style={styles.videoThumbnail}
                      source={require('../../assets/VIDEO.png')}
                    />
                    <View style={styles.playButtonOverlay}>
                      <Text style={styles.playIcon}>▶</Text>
                    </View>
                  </View>

                  <View style={styles.videoItem}>
                    <Image
                      style={styles.videoThumbnail}
                      source={require('../../assets/OTHERIMG.png')}
                    />
                    <View style={styles.playButtonOverlay}>
                      <Text style={styles.playIcon}>▶</Text>
                    </View>
                  </View>
              </View>
              {/* VIDEOS GRID */}
            </View>
            {/* VIDEOS CONTAINER */}
          </ScrollView>
          {/* ===== CONTENT ===== */}
        </LinearGradient>
        <MenuBar activeScreen={"Gallery"} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  galleryHeader: {
    marginTop: hp('2%'),
    marginHorizontal: wp('6%'),

    borderBottomWidth: 1,
    paddingBottom: hp('2%'),
    borderColor: colors.borderv2,
  },

  galleryHeaderText: {
    fontSize: wp('6%'),
    color: colors.brown,
    fontFamily: "Loviena",
  },

  galleryHeaderSubText: {
    fontSize: wp('4%'),
    color: colors.brown,
  },

  imageContainer: {
    marginTop: hp('2%'),
    marginHorizontal: wp('6%'),
  },

  imageHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: hp('1%'),
    justifyContent: 'space-between',
  },

  seeMoreButton: {
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },

  imageHeaderText: {
    fontWeight: "500",
    fontSize: wp('5.5%'),
    fontFamily: "Loviena",
  },

  photosItems: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  image: {
    aspectRatio: 1,
    width: wp('42%'),
    borderRadius: wp('2%'),
    marginBottom: wp('4%'),
  },

  videosContainer: {
    marginTop: hp('1%'),
  },
  
  videosGrid: {
    flexDirection: 'column', 
  },

  videoItem: {
    marginBottom: 16,
    alignItems: 'center',
    position: 'relative',
  },

  videoThumbnail: {
    height: 'auto',
    width: wp('90%'),  
    aspectRatio: 16 / 6,
    borderRadius: wp('2%'),
  },

  playButtonOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  playIcon: {
    fontSize: 20,
    color: '#000',
    fontWeight: 'bold',
  },
});

export default Gallery;