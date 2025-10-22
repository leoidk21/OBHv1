import React from "react";
import { useEvent } from '../../context/EventContext';
import { StyleSheet, Text, View, Image, TouchableOpacity, Modal} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { useNavigation } from "@react-navigation/native";
import { NavigationProp, ParamListBase } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import colors from "../config/colors";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from "react-native-responsive-screen";

const ChooseEvent = () => {
  const navigation: NavigationProp<ParamListBase> = useNavigation();
  const [modalVisible, setModalVisible] = React.useState(false);

  const { updateEvent, debugStorageKeys } = useEvent();
  const handleOptionPress = async (selectedWeddingType: string) => {
    await updateEvent('event_type', 'Wedding');
    await updateEvent('wedding_type', selectedWeddingType);
    await debugStorageKeys();
    
    setModalVisible(false);
    
    setTimeout(() => navigation.navigate('EventPrice'), 100);
  };

  return (
    <SafeAreaProvider>
      <>
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
          statusBarTranslucent={true}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>&times;</Text>
              </TouchableOpacity>

              <Image
                source={require("../../assets/flowers.png")}
                style={{ width: wp("14%"), height: wp("14%") }}
              />

              <Text style={styles.modalTitle}>Choose Wedding Type</Text>

              <LinearGradient
                style={styles.btnLink}
                end={{ x: 0, y: 0.5 }}
                start={{ x: 1, y: 0.5 }}
                colors={["#19579C", "#102E50"]}
              >
                <TouchableOpacity
                  style={styles.btnLink}
                  onPress={() => handleOptionPress("Grand Wedding")}
                >
                  <Text style={styles.btnText}>Grand Wedding</Text>
                </TouchableOpacity>
              </LinearGradient>

              <LinearGradient
                style={styles.btnLink}
                end={{ x: 0, y: 0.5 }}
                start={{ x: 1, y: 0.5 }}
                colors={["#19579C", "#102E50"]}
              >
                <TouchableOpacity
                  style={styles.btnLink}
                  onPress={() => handleOptionPress("Intimate Wedding")}
                >
                  <Text style={styles.btnText}>Intimate Wedding</Text>
                </TouchableOpacity>
              </LinearGradient>

              <LinearGradient
                style={styles.btnLink}
                end={{ x: 0, y: 0.5 }}
                start={{ x: 1, y: 0.5 }}
                colors={["#19579C", "#102E50"]}
              >
                <TouchableOpacity
                  style={styles.btnLink}
                  onPress={() => handleOptionPress("Civil Wedding")}
                >
                  <Text style={styles.btnText}>Civil Wedding</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </Modal>

        <SafeAreaView style={{ flex: 1 }}>
          <LinearGradient
              colors={["#FFFFFF", "#f2e8e2ff"]}
              style={styles.container}
            >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => navigation.navigate("SignIn")}
                >
                  <FontAwesomeIcon
                    icon={faChevronLeft}
                    size={18}
                    color="#343131"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.step}>
                  <View style={[styles.stepDot, { backgroundColor: colors.brown }]} />
                  <View style={[styles.stepDot, { backgroundColor: colors.border }]} />
                  <View style={[styles.stepDot, { backgroundColor: colors.border }]} />
                  <View style={[styles.stepDot, { backgroundColor: colors.border }]} />
              </View>

              <View>
                <Text style={styles.stepText}>
                  1/4
                </Text>
              </View>
            </View>

            <View style={styles.topContent}>
              <Text style={styles.topContentText}>
                Select{"\n"}Event Type
              </Text>
            </View>

            {/* WEDDING */}
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              activeOpacity={0.9}
            >
              <View style={styles.weddingContainer}>
                <View>
                  <Image
                    source={require("../../assets/select.png")}
                    style={styles.select}
                  />
                  <View style={styles.beforeImageCentered}>
                    <Image
                      source={require("../../assets/WEDDINGIMG.png")}
                      style={[styles.weddingImage, { borderRadius: wp("4%") }]}
                      resizeMode="cover"
                    />
                    <View style={styles.beforeImage} />
                    <Text style={styles.overlayTextTop}>WEDDING</Text>
                    <Text style={styles.overlayTextBottom}>
                      Make your wedding elegant with a well-organised event.
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* DEBUT */}
            <View style={styles.weddingContainer}>
              <View>
                <Image
                  source={require("../../assets/select.png")}
                  style={styles.select}
                />

                <View style={styles.beforeImageCentered}>
                  <Image
                    source={require("../../assets/DEBUTIMG.png")}
                    style={[styles.weddingImage, { borderRadius: wp("4%") }]}
                    resizeMode="cover"
                  />
                  <View style={styles.beforeImage} />
                  <Text style={styles.overlayTextTop}>DEBUT</Text>
                  <Text style={styles.overlayTextBottom}>
                    Step into elegance and make your 18th unforgettable.
                  </Text>
                </View>
              </View>
            </View>

            {/* PARTIES */}
            <View style={styles.weddingContainer}>
              <View>
                <Image
                  source={require("../../assets/select.png")}
                  style={styles.select}
                />

                <View style={styles.beforeImageCentered}>
                  <Image
                    source={require("../../assets/PARTIESIMG.png")}
                    style={[styles.weddingImage, { borderRadius: wp("4%") }]}
                    resizeMode="cover"
                  />
                  <View style={styles.beforeImage} />
                  <Text style={styles.overlayTextTop}>PARTIES</Text>
                  <Text style={styles.overlayTextBottom}>
                    Celebrate your special day with us! We’ll take care of the
                    rest.
                  </Text>
                </View>
              </View>
            </View>

            {/* OTHERS */}
            <View style={styles.weddingContainer}>
              <View>
                <Image
                  source={require("../../assets/select.png")}
                  style={styles.select}
                />

                <View style={styles.beforeImageCentered}>
                  <Image
                    source={require("../../assets/OTHERIMG.png")}
                    style={[styles.weddingImage, { borderRadius: wp("4%") }]}
                    resizeMode="cover"
                  />
                  <View style={styles.beforeImage} />
                  <Text style={styles.overlayTextTop}>OTHERS</Text>
                  <Text style={styles.overlayTextBottom}>
                    Not listed? Tell us more about it!
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </SafeAreaView>
      </>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  backBtn: {
    gap: 5,
    top: hp("2.3%"),
    left: wp("5%"),
    flexDirection: "row",
    alignItems: "center",
  },

  topContent: {
    marginTop: hp("3%"),
    justifyContent: "center",
  },

  step: {
    gap: wp("3%"),
    flexDirection: "row",
    marginTop: hp("3.2%"),
  },

  stepDot: {
    alignItems: "center",
    justifyContent: "center",
    width: wp("15%"),
    height: hp("0.8%"),
    borderRadius: 50,
  },

  stepText: {
    top: hp("2%"), 
    right: wp("6%"), 
    fontSize: wp("4%"), 
    color: colors.brown
  },

  topContentText: {
    fontSize: wp("8%"),
    marginTop: hp("1%"),
    textAlign: "left",
    left: wp("6%"),
    fontFamily: "Loviena",
    color: colors.black,
    lineHeight: wp("8%"),
    height: hp("9%"),
  },

  weddingContainer: {
    overflow: "hidden",
    alignItems: "center",
    position: "relative",
    justifyContent: "center",
  },

  beforeImageCentered: {
    alignItems: "center",
    justifyContent: "center",
  },

  weddingImage: {
    width: wp("88%"),
    height: wp("34%"),
    marginTop: hp("2.4%"),
  },

  beforeImage: {
    top: 0,
    left: 0,
    zIndex: 1,
    width: wp("88%"),
    height: wp("34%"),
    position: "absolute",
    marginTop: hp("2.4%"),
    borderRadius: wp("4%"),
    backgroundColor: "rgba(0, 0, 0, 0.36)",
  },

  overlayTextTop: {
    zIndex: 2,
    color: "white",
    top: wp("11%"),
    left: wp("6%"),
    right: wp("40%"),
    fontWeight: "400",
    fontSize: wp("5.5%"),
    position: "absolute",
    fontFamily: "Poppins",
  },

  overlayTextBottom: {
    zIndex: 2,
    color: "white",
    top: wp("20%"),
    left: wp("6%"),
    right: wp("20%"),
    fontWeight: "400",
    position: "absolute",
    fontSize: wp("3.6%"),
    fontFamily: "Poppins",
  },

  select: {
    zIndex: 2,
    top: wp("5%"),
    right: wp("6%"),
    width: wp("8%"),
    height: wp("8%"),
    position: "absolute",
    marginTop: hp("2.4%"),
  },

  modalOverlay: {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  
  modalContainer: {
    borderRadius: 20,
    maxWidth: wp('90%'),
    alignItems: 'center',
    marginHorizontal: wp('5%'),
    paddingVertical: hp('2.5%'),
    paddingHorizontal: wp('10%'),
    backgroundColor: colors.white,
  },
  
  closeButton: {
    width: 40,
    height: 40,
    zIndex: 1001,
    top: hp('1%'),
    right: wp('4%'),
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  closeButtonText: {
    fontSize: 36,
    color: '#666',
  },
  
  modalTitle: {
    fontSize: wp('6%'),
    textAlign: 'center',
    fontFamily: 'Loviena',
    marginBottom: hp('1.5%'),
  },
  
  btnLink: {
    width: wp('75%'),
    margin: hp('1%'),
    alignItems: 'center',
    borderRadius: wp('50%'),
    paddingVertical: hp('0.12%'), 
  },
  
  btnText: {
    color: 'white',
    width: wp('100%'),
    fontSize: wp('4%'),
    textAlign: 'center',
    fontFamily: 'Poppins',
  },

});

export default ChooseEvent;
