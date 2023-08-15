import { getDisplayString, MedplumClient } from "@medplum/core";
import base64 from 'base-64';
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

const clientId = 'MY_CLIENT_ID';
const clientSecret = 'MY_CLIENT_SECRET';


const medplum = new MedplumClient({
  // Enter your Medplum connection details here
  // See MedplumClient docs for more details
  // baseUrl: "http://localhost:8103/",
  clientId: 'MY_CLIENT_ID',
  // clientSecret: `MY_CLIENT_SECRET',
  // projectId: 'MY_PROJECT_ID',
});

export default function App() {
  const authHeader = base64.encode(`${clientId}:${clientSecret}`);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  //ideally importing Profile resource from FhirTypes and using Partial<Profile> as the type
  const [profile, setProfile] = useState(undefined);

  function startLogin() {
    // medplum.startLogin({ email, password }).then(handleAuthResponse);
    medplum
      .post('auth/login', { email, password, clientId })
      .then(handleAuthResponse);
  }

  function handleAuthResponse(response) {
    if (response.code) {
      handleCode(response.code);
    }
    if (response.memberships) {
      // TODO: Handle multiple memberships
      // In a real app, you would present a list of memberships to the user
      // For this example, just use the first membership
      medplum
        .post("auth/profile", {
          login: response.login,
          profile: response.memberships[0].id,
        })
        .then(handleAuthResponse);
    }
  }

  async function handleAuthResponse(response) {
    if (response.code) {
      handleCode(response.code);
    }
    if (response.memberships) {
      // TODO: Handle multiple memberships
      // In a real app, you would present a list of memberships to the user
      // For this example, just use the first membership
      medplum
        .post("auth/profile", {
          login: response.login,
          profile: response.memberships[0].id,
        })
        .then(handleAuthResponse);
    }
  }

  async function handleCode(code) {
    // medplum.processCode(code).then(setProfile);
    const details = {
      grant_type: 'authorization_code',
      client_id: clientId,
      code: code,
    };
    const formBody = Object.entries(details)
      .map(
        ([key, value]) =>
          encodeURIComponent(key) +
          '=' +
          encodeURIComponent(value),
      )
      .join('&');

    const tokenResponse = await fetch(
      'https://api.medplum.com/oauth2/token',
      {
        method: 'POST',
        body: formBody,
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded; charset=UTF-8',
          Authorization: 'Basic ' + authHeader,
        },
      },
    );

    const { access_token } = await tokenResponse.json();
    await medplum.setAccessToken(access_token);

    medplum
      .get('auth/me', {
        headers: {
          Authorization: 'Basic ' + authHeader,
        },
      })
      .then((res) => {
        setProfile(res.profile);
      });
  }

  function signOut() {
    setProfile(undefined);
    setEmail('');
    setPassword('');
    medplum.signOut();
  }

  return (
    <View style={styles.container}>
      <Text>Medplum React Native Example</Text>
      {!profile ? (
        <>
          <View>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#003f5c"
              defaultValue={email}
              onChangeText={(email) => setEmail(email)}
            />
          </View>
          <View>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#003f5c"
              defaultValue={password}
              secureTextEntry={true}
              onChangeText={(password) => setPassword(password)}
            />
          </View>
          <Button onPress={startLogin} title="Sign in" />
        </>
      ) : (
        <>
          <Text>Logged in as {getDisplayString(profile)}</Text>
          <Button onPress={signOut} title="Sign out" />
        </>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  input: {
    height: 50,
    padding: 10,
    marginLeft: 20,
  },
});
