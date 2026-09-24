import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { colors } from '../theme';

const Splashscreen = ({ navigation }) => {
  const [user, setUser] = useState({});

  useEffect(() => {
    retrieveData();
  }, []);

  useEffect(() => {
    if (Object.keys(user).length > 0) {
      const t = setTimeout(() => navigation.navigate('home'), 1500);
      return () => clearTimeout(t);
    }
  }, [user]);

  const retrieveData = async () => {
    try {
      const value = await AsyncStorage.getItem('user');
      if (value !== null) {
        setUser(JSON.parse(value));
      } else {
        setTimeout(() => navigation.navigate('Login'), 1800);
      }
    } catch (error) {
      setTimeout(() => navigation.navigate('Login'), 1800);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={colors.card} barStyle="dark-content" />
      <Image style={styles.logo} source={require('../assets/Sangam-logo.png')} resizeMode="contain" />
      <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: { width: '80%', height: 200 },
  loader: { marginTop: 32 },
});

export default Splashscreen;
