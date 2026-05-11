// Mock Anomaly Detection
export async function detectAnomaly(userId, deviceId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      // In reality, this would check if deviceId has been used by another userId recently
      // For mock, we assume no anomaly
      resolve({ isAnomaly: false });
    }, 500);
  });
}
