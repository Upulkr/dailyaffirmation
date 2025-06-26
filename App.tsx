import { StatusBar } from "expo-status-bar";
import {
  Text,
  View,
  TextInput,
  Button,
  Alert,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useState, useEffect } from "react";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import DateTimePicker from '@react-native-community/datetimepicker';
import "./global.css";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      Alert.alert("Failed to get push token for push notification!");
      return;
    }
    token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas.projectId,
    });
    console.log(token);
  } else {
    Alert.alert("Must use physical device for Push Notifications");
  }

  return token;
}

async function schedulePushNotification(affirmation, scheduledTime) {
  // Calculate the trigger time
  const now = new Date();
  const triggerTime = new Date(scheduledTime);
  
  // If the scheduled time is for today but has passed, schedule for tomorrow
  if (triggerTime <= now) {
    triggerTime.setDate(triggerTime.getDate() + 1);
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Daily Affirmation 📬",
      body: affirmation || "Here is your daily affirmation!",
      data: { affirmation },
    },
    trigger: {
      hour: triggerTime.getHours(),
      minute: triggerTime.getMinutes(),
      repeats: true, // This will make it repeat daily
    },
  });
}

export default function App() {
  const [name, setName] = useState("");
  const [profession, setProfession] = useState("");
  const [mind, setMind] = useState("");
  const [goals, setGoals] = useState("");
  const [notificationTime, setNotificationTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [quote, setQuote] = useState("");
  const [loading, setLoading] = useState(false);

  // Gemini API Configuration
  const GEMINI_API_KEY = 'AIzaSyBreU8ZX1WnfxtenkK7LE6_Lsw6xV8piuw';
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      console.log("Push token is", token);
    });
  }, []);

  const generateQuote = async (name, profession, mind, goals) => {
    if (!name || !profession || !mind || !goals) {
      Alert.alert("Error", "Please fill in all fields before generating an affirmation.");
      return;
    }

    setLoading(true);
    try {
      const prompt = `Create a personalized daily affirmation for ${name}, who works as a ${profession}. 
      They are currently thinking about: ${mind}
      Their goals are: ${goals}
      
      Please create an inspiring, positive, and motivational affirmation that addresses their current mindset and helps them work towards their goals. Keep it concise but powerful, around 1 sentence.this should be suitable lock screen size, keep it is simple but goes to mind of the user and Limit to max 12-15 words Avoid line breaks.use thug amercian language,bro,dude,get the fuck out of here,get up shit,what up dude,,like wise bro etc.`;

      const response = await callGeminiAPI(prompt);
      setQuote(response);
      
    } catch (error) {
      console.error("Error generating affirmation:", error);
      Alert.alert("Error", "Failed to generate affirmation. Please try again.");
      setQuote("I am capable of achieving great things. Today I take another step towards my goals with confidence and determination.");
    } finally {
      setLoading(false);
    }
  };

  const callGeminiAPI = async (prompt:any) => {
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 200,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('No content generated');
      }
      
    } catch (error) {
      console.error("Gemini API call failed:", error);
      throw error;
    }
  };

  const handleSubmit = () => {

    generateQuote(name, profession, mind, goals);
  };

  const handleScheduleNotification = () => {
    if (quote) {
      schedulePushNotification(quote, notificationTime);
      const timeString = notificationTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      Alert.alert("Success", `Daily notification scheduled for ${timeString}!`);
    } else {
      Alert.alert("Error", "Please generate an affirmation first!");
    }
  };
const onTimeChange = (event, selectedTime) => {
  if (event.type === "dismissed") {
    setShowTimePicker(false);
    return;
  }
  
  const currentTime = selectedTime || notificationTime;
  setShowTimePicker(Platform.OS === 'ios'); // iOS keeps it open
  setNotificationTime(currentTime);
};


  const showTimePickerModal = () => {
    setShowTimePicker(true);
  };

  const formatTime = (time) => {
    return time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  useEffect(() => {
    if (quote) {
      console.log("Generated Quote:", quote);
    }
  }, [quote]);

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <Text className="text-2xl font-bold mb-5 text-center">Daily Affirmations</Text>

      <TextInput
        className="border border-gray-300 rounded-lg py-3 px-4 w-full max-w-xs mb-4 text-base"
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        className="border border-gray-300 rounded-lg py-3 px-4 w-full max-w-xs mb-4 text-base"
        placeholder="Profession"
        value={profession}
        onChangeText={setProfession}
      />
      <TextInput
        className="border border-gray-300 rounded-lg py-3 px-4 w-full max-w-xs mb-4 text-base h-20"
        placeholder="What's on your mind?"
        value={mind}
        onChangeText={setMind}
        multiline
        numberOfLines={3}
        style={{ textAlignVertical: 'top' }}
      />
      <TextInput
        className="border border-gray-300 rounded-lg py-3 px-4 w-full max-w-xs mb-4 text-base h-20"
        placeholder="Goals to be achieved"
        value={goals}
        onChangeText={setGoals}
        multiline
        numberOfLines={3}
        style={{ textAlignVertical: 'top' }}
      />

      <View className="flex-row items-center justify-between w-full max-w-xs mb-4 px-1">
        <Text className="text-base font-medium text-gray-800">Notification Time:</Text>
        <TouchableOpacity className="bg-blue-500 py-2.5 px-5 rounded-lg min-w-[100px] items-center" onPress={showTimePickerModal}>
          <Text className="text-white text-base font-medium">{formatTime(notificationTime)}</Text>
        </TouchableOpacity>
      </View>

     {showTimePicker && (
  <DateTimePicker
    testID="dateTimePicker"
    value={notificationTime}
    mode="time"
    is24Hour={false}
    display="default"
    onChange={onTimeChange}
  />
)}


      <View className="my-2.5 w-full max-w-xs">
        <Button 
          title={loading ? "Generating..." : "Generate Affirmation"} 
          onPress={handleSubmit} 
          disabled={loading}
        />
      </View>

      {loading && (
        <View className="items-center my-5">
          <ActivityIndicator size="large" color="#0000ff" />
          <Text className="mt-2">Creating your personalized affirmation...</Text>
        </View>
      )}

      {quote ? (
        <View className="mt-5 p-5 bg-gray-50 rounded-xl w-full max-w-xs mb-5">
          <Text className="text-lg font-bold mb-2.5 text-center text-gray-800">Your Daily Affirmation:</Text>
          <Text className="text-base leading-6 text-center italic text-gray-600">{quote}</Text>
        </View>
      ) : null}

      <View className="my-2.5 w-full max-w-xs">
        <Button
          title="Schedule Notification"
          onPress={handleScheduleNotification}
        />
      </View>

      <StatusBar style="auto" />
    </ScrollView>
  );
}
