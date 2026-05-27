import Constants from 'expo-constants';

export const getBackendUrl = (): string => {
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.50:8081"
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:8000`;
  }
  return 'http://localhost:8000';
};
