import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EventProvider } from './src/context/EventContext';
import { RootStackParamList } from './src/screens/type';
import { View, Text, StyleSheet } from 'react-native';

{/* Get Started Screens */}
import { LoadingScreen } from './src/screens/getstarted/Loadingpage';
import GetStartedScreen from './src/screens/getstarted/Getstarted';

{/* Auth */}
import SignIn from './src/screens/auth/SignIn';
import SignUp from './src/screens/auth/SignUp';
import ForgotPass from './src/screens/auth/ForgotPass';
import SendCode from './src/screens/auth/SendCode';
import ResetPass from './src/screens/auth/ResetPass';

{/* Setting Up */}
import ChooseEvent from './src/screens/settingUp/ChooseEvent';
import EventPrice from './src/screens/settingUp/EventPrice';
import ClientsName from './src/screens/settingUp/ClientsName';
import EventDate from './src/screens/settingUp/EventDate';
import CompanyPolicy from './src/screens/settingUp/CompanyPolicy';

{/* Home Wedding */}
import Home from './src/screens/wedding/Home';
import Event from './src/screens/wedding/Event';
import Schedule from './src/screens/wedding/Schedule';
import Guest from './src/screens/wedding/Guest';
import Budget from './src/screens/wedding/Budget';
import Checklist from './src/screens/wedding/Checklist';
import Gallery from './src/screens/wedding/Gallery';
import Account from './src/screens/wedding/Account';
import Notification from './src/screens/wedding/Notification';
import Payment from './src/screens/wedding/Payment';
import ESignature from './src/screens/wedding/ESignature';

import { useGuestManagement } from './src/screens/wedding/Hook/useGuestManagement';

import NavigationSlider from './src/screens/wedding/ReusableComponents/NavigationSlider';
import MenuBar from './src/screens/wedding/ReusableComponents/MenuBar';

import { HomeIcon, EventIcon, GuestIcon, ScheduleIcon, BudgetIcon, ChecklistIcon, ESignatureIcon }
  from "./src/screens/icons";

import { EventSvg } from './src/screens/icons/svg/EventSvg';
import { BudgetSvg } from './src/screens/icons/svg/BudgetSvg';
import { ESignatureSvg } from './src/screens/icons/svg/ESignatureSvg';
import { ChecklistSvg } from './src/screens/icons/svg/ChecklistSvg';
import { GuestSvg } from './src/screens/icons/svg/GuestSvg';
import { ScheduleSvg } from './src/screens/icons/svg/ScheduleSvg';
import { PaymentSvg } from './src/screens/icons/svg/PaymentSvg';
import { AccountSvg } from './src/screens/icons/svg/AccountSvg';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Error Boundary Component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null, errorInfo: any}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: any) {
    console.log('=== ERROR CAUGHT IN ERROR BOUNDARY ===');
    console.log('Error:', error);
    console.log('Error Message:', error.message);
    console.log('Error Stack:', error.stack);
    console.log('Error Component Stack:', errorInfo.componentStack);
    console.log('=== END ERROR LOG ===');
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>App Error</Text>
          <Text style={styles.errorMessage}>{this.state.error?.toString()}</Text>
          <Text style={styles.errorDetails}>
            Component Stack: {this.state.errorInfo?.componentStack}
          </Text>
          <Text style={styles.errorStack}>
            {this.state.error?.stack}
          </Text>
        </View>
      );
    }
    
    return this.props.children;
  }
}

// Debug Wrapper for Screens
const withDebug = (Component: React.ComponentType<any>, name: string) => {
  return (props: any) => {
    console.log(`[DEBUG] Rendering screen: ${name}`);
    try {
      return <Component {...props} />;
    } catch (error) {
      console.log(`[DEBUG ERROR] In screen ${name}:`, error);
      throw error;
    }
  };
};

export default function App() {
  return (
        <ErrorBoundary>
      <EventProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Loading"
            screenOptions={{
              headerShown: false,
              animation: "fade"
            }}
          >
            {/* Get Started Screens */}
            <Stack.Screen name="Loading" component={LoadingScreen} />
            <Stack.Screen name="GetStarted" component={GetStartedScreen} /> 

            {/* Auth */}
            <Stack.Screen name="SignIn" component={SignIn} />
            <Stack.Screen name="SignUp" component={SignUp} />
            <Stack.Screen name="ForgotPass" component={ForgotPass} />
            <Stack.Screen name="SendCode" component={SendCode} />
            <Stack.Screen name="ResetPass" component={ResetPass} />

            {/* Setting Up */}
            <Stack.Screen name="ChooseEvent" component={ChooseEvent} />
            <Stack.Screen name="ClientsName" component={ClientsName} />
            <Stack.Screen name="EventDate" component={EventDate} />
            <Stack.Screen name="EventPrice" component={EventPrice} />
            <Stack.Screen name="CompanyPolicy" component={CompanyPolicy} />

            {/* Home Wedding */}
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="Event" component={Event} />
            <Stack.Screen name="Schedule" component={Schedule} />
            <Stack.Screen name="Guest" component={Guest} />
            <Stack.Screen name="Budget" component={Budget} />
            <Stack.Screen name="Checklist" component={Checklist} />
            <Stack.Screen name="Gallery" component={Gallery} />
            <Stack.Screen name="Account" component={Account} />
            <Stack.Screen name="Notification" component={Notification} />
            <Stack.Screen name="Payment" component={Payment} />
            <Stack.Screen name="ESignature" component={ESignature} />
            
            {/* Icons */}
            <Stack.Screen name="HomeIcon" component={HomeIcon} />
            <Stack.Screen name="EventIcon" component={EventIcon} />
            <Stack.Screen name="GuestIcon" component={GuestIcon} />
            <Stack.Screen name="ScheduleIcon" component={ScheduleIcon} />
            <Stack.Screen name="BudgetIcon" component={BudgetIcon} />
            <Stack.Screen name="ESignatureIcon" component={ESignatureIcon} />
            <Stack.Screen name="ChecklistIcon" component={ChecklistIcon} />

            <Stack.Screen name="EventSvg" component={EventSvg} />
            <Stack.Screen name="ChecklistSvg" component={ChecklistSvg} />
            <Stack.Screen name="BudgetSvg" component={BudgetSvg} />
            <Stack.Screen name="GuestSvg" component={GuestSvg} />
            <Stack.Screen name="ScheduleSvg" component={ScheduleSvg} />
            <Stack.Screen name="PaymentSvg" component={PaymentSvg} />
            <Stack.Screen name="ESignatureSvg" component={ESignatureSvg} />
            <Stack.Screen name="AccountSvg" component={AccountSvg} />

            <Stack.Screen name="NavigationSlider" component={NavigationSlider} />
            
          </Stack.Navigator>
        </NavigationContainer>
      </EventProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'red',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorStack: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
  },
});