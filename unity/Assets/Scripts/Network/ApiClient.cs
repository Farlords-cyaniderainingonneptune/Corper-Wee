using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;
using CorperWee.Core;

namespace CorperWee.Network
{
    /// <summary>
    /// Production-grade API Client for Unity mobile communicating with the
    /// authoritative Node.js/Express backend on Port 3000 / Cloud Run.
    /// Supports Bearer token authentication, refresh rotation, and typed payloads.
    /// </summary>
    public class ApiClient : MonoBehaviour
    {
        public static ApiClient Instance { get; private set; }

        private const int RequestTimeoutSeconds = 15;

        [Serializable]
        public class ApiResponse<T>
        {
            public bool success;
            public string message;
            public T data;
            public string code;
        }

        [Serializable]
        public class AuthData
        {
            public string accessToken;
            public string refreshToken;
            public UserData user;
            public CharacterData character;
            public WalletData wallet;
            public HydrationData water;
            public bool isNewUser;
            public bool requiresOnboarding;
        }

        [Serializable]
        public class UserData
        {
            public string id;
            public string email;
            public string fullName;
            public string role;
            public string stateCode;
            public int platoonNumber;
        }

        [Serializable]
        public class CharacterData
        {
            public string gender;
            public string skinTone;
            public string hairstyle;
            public string hairColor;
            public string uniformType;
        }

        [Serializable]
        public class WalletData
        {
            public int corperPoints;
            public string virtualNaira;
        }

        [Serializable]
        public class HydrationData
        {
            public float waterLevel;
            public bool isDehydrated;
        }

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        /// <summary>
        /// Authenticate with Google identity token & NYSC State Code
        /// </summary>
        public void AuthenticateWithGoogle(string googleIdToken, string stateCode, Action<AuthData> onSuccess, Action<string> onError)
        {
            string url = $"{GameManager.Instance.ApiBaseUrl}/auth/google";
            string jsonBody = $"{{\"idToken\":\"{googleIdToken}\",\"stateCode\":\"{stateCode}\"}}";

            StartCoroutine(PostCoroutine<AuthData>(url, jsonBody, false, (response) =>
            {
                if (response.success && response.data != null)
                {
                    var data = response.data;
                    decimal naira = 0m;
                    if (data.wallet != null)
                    {
                        decimal.TryParse(data.wallet.virtualNaira, out naira);
                    }

                    GameManager.Instance.SetSession(
                        data.accessToken,
                        data.refreshToken,
                        data.user.id,
                        data.user.stateCode,
                        data.user.fullName,
                        data.user.role,
                        data.user.platoonNumber
                    );

                    if (data.wallet != null)
                    {
                        GameManager.Instance.UpdateEconomy(data.wallet.corperPoints, naira);
                    }

                    if (data.water != null)
                    {
                        GameManager.Instance.UpdateHydration(data.water.waterLevel);
                    }

                    onSuccess?.Invoke(data);
                }
                else
                {
                    onError?.Invoke(response.message ?? "Authentication failed");
                }
            }, onError));
        }

        /// <summary>
        /// Authenticate with Corps Member Email & NYSC State Code (1-to-1 unique demo flow)
        /// </summary>
        public void AuthenticateWithCredentials(string email, string stateCode, string fullName, Action<AuthData> onSuccess, Action<string> onError)
        {
            string url = $"{GameManager.Instance.ApiBaseUrl}/auth/authenticate";
            string jsonBody = $"{{\"email\":\"{email}\",\"stateCode\":\"{stateCode}\",\"fullName\":\"{fullName}\"}}";

            StartCoroutine(PostCoroutine<AuthData>(url, jsonBody, false, (response) =>
            {
                if (response.success && response.data != null)
                {
                    var data = response.data;
                    decimal naira = 0m;
                    if (data.wallet != null)
                    {
                        decimal.TryParse(data.wallet.virtualNaira, out naira);
                    }

                    GameManager.Instance.SetSession(
                        data.accessToken,
                        data.refreshToken,
                        data.user.id,
                        data.user.stateCode,
                        data.user.fullName,
                        data.user.role,
                        data.user.platoonNumber
                    );

                    if (data.wallet != null)
                    {
                        GameManager.Instance.UpdateEconomy(data.wallet.corperPoints, naira);
                    }

                    if (data.water != null)
                    {
                        GameManager.Instance.UpdateHydration(data.water.waterLevel);
                    }

                    onSuccess?.Invoke(data);
                }
                else
                {
                    onError?.Invoke(response.message ?? "Authentication failed");
                }
            }, onError));
        }

        /// <summary>
        /// Update Character Customization
        /// </summary>
        public void UpdateCharacter(string gender, string skinTone, string hairstyle, string hairColor, string uniformType, Action onSuccess, Action<string> onError)
        {
            string url = $"{GameManager.Instance.ApiBaseUrl}/player/character";
            string jsonBody = $"{{\"gender\":\"{gender}\",\"skinTone\":\"{skinTone}\",\"hairstyle\":\"{hairstyle}\",\"hairColor\":\"{hairColor}\",\"uniformType\":\"{uniformType}\"}}";

            StartCoroutine(PutCoroutine<object>(url, jsonBody, true, (res) =>
            {
                GameManager.Instance.SelectedGender = gender;
                GameManager.Instance.SkinTone = skinTone;
                GameManager.Instance.Hairstyle = hairstyle;
                GameManager.Instance.HairColor = hairColor;
                GameManager.Instance.UniformType = uniformType;
                onSuccess?.Invoke();
            }, onError));
        }

        /// <summary>
        /// Submit Parade Rhythm QTE drill performance
        /// </summary>
        public void SubmitParadeDrill(int commandsTotal, int commandsSuccessful, Action<int> onPointsAwarded, Action<string> onError)
        {
            string url = $"{GameManager.Instance.ApiBaseUrl}/activities/parade/submit";
            string jsonBody = $"{{\"commandsTotal\":{commandsTotal},\"commandsSuccessful\":{commandsSuccessful}}}";

            StartCoroutine(PostCoroutine<ParadeResultData>(url, jsonBody, true, (res) =>
            {
                if (res.data != null)
                {
                    onPointsAwarded?.Invoke(res.data.pointsEarned);
                }
            }, onError));
        }

        /// <summary>
        /// Submit Canteen Rush Obstacle Run results
        /// </summary>
        public void SubmitCanteenRush(float timeTakenSeconds, int obstaclesCleared, int puddlesHit, int staminaRemaining, Action<int> onPointsAwarded, Action<string> onError)
        {
            string url = $"{GameManager.Instance.ApiBaseUrl}/activities/canteen-rush/submit";
            string jsonBody = $"{{\"timeTakenSeconds\":{timeTakenSeconds:F1},\"obstaclesCleared\":{obstaclesCleared},\"puddlesHit\":{puddlesHit},\"staminaRemaining\":{staminaRemaining}}}";

            StartCoroutine(PostCoroutine<CanteenRushResultData>(url, jsonBody, true, (res) =>
            {
                if (res.data != null)
                {
                    onPointsAwarded?.Invoke(res.data.earnedPoints);
                }
            }, onError));
        }

        /// <summary>
        /// Report Soldier Patrol Evasion / Stealth Outcome
        /// </summary>
        public void ReportStealthOutcome(bool survived, int timeInZoneSec, Action<int, string> onOutcome, Action<string> onError)
        {
            string url = $"{GameManager.Instance.ApiBaseUrl}/activities/stealth/report";
            string jsonBody = $"{{\"survived\":{(survived ? "true" : "false")},\"timeInZoneSec\":{timeInZoneSec}}}";

            StartCoroutine(PostCoroutine<StealthResultData>(url, jsonBody, true, (res) =>
            {
                if (res.data != null)
                {
                    onOutcome?.Invoke(res.data.pointsDelta, res.data.narrative);
                }
            }, onError));
        }

        /// <summary>
        /// Social & Charisma Interaction with dialogue choice
        /// </summary>
        public void SocialInteract(string targetUserId, string interactionType, string dialogueOptionId, Action<string, string> onOutcome, Action<string> onError)
        {
            string url = $"{GameManager.Instance.ApiBaseUrl}/social/interact";
            string jsonBody = $"{{\"targetUserId\":\"{targetUserId}\",\"interactionType\":\"{interactionType}\",\"dialogueOptionId\":\"{dialogueOptionId}\"}}";

            StartCoroutine(PostCoroutine<SocialResultData>(url, jsonBody, true, (res) =>
            {
                if (res.data != null)
                {
                    onOutcome?.Invoke(res.data.outcome, res.data.dialogue);
                }
            }, onError));
        }

        [Serializable]
        public class SocialResultData
        {
            public string outcome;
            public string dialogue;
            public string reactionAnimation;
            public int charismaDelta;
            public int relationshipScore;
        }

        [Serializable]
        public class ParadeResultData
        {
            public int pointsEarned;
            public float accuracy;
            public int platoonNumber;
        }

        [Serializable]
        public class CanteenRushResultData
        {
            public int earnedPoints;
            public float timeTaken;
            public int newCorperPoints;
        }

        [Serializable]
        public class StealthResultData
        {
            public bool survived;
            public int pointsDelta;
            public string narrative;
        }

        /// <summary>
        /// General Coroutine for POST requests
        /// </summary>
        private IEnumerator PostCoroutine<T>(string url, string jsonBody, bool authenticated, Action<ApiResponse<T>> onSuccess, Action<string> onError)
        {
            using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
            {
                byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                request.timeout = RequestTimeoutSeconds;

                if (authenticated && !string.IsNullOrEmpty(GameManager.Instance.AuthToken))
                {
                    request.SetRequestHeader("Authorization", $"Bearer {GameManager.Instance.AuthToken}");
                }

                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    try
                    {
                        var response = JsonUtility.FromJson<ApiResponse<T>>(request.downloadHandler.text);
                        onSuccess?.Invoke(response);
                    }
                    catch (Exception ex)
                    {
                        onError?.Invoke($"Failed to parse JSON response: {ex.Message}");
                    }
                }
                else
                {
                    // If 401 Unauthorized, trigger refresh token rotation
                    if (request.responseCode == 401 && authenticated)
                    {
                        yield return StartCoroutine(RefreshTokenCoroutine(() =>
                        {
                            // Retry request once
                            StartCoroutine(PostCoroutine<T>(url, jsonBody, true, onSuccess, onError));
                        }, onError));
                    }
                    else
                    {
                        onError?.Invoke($"HTTP {request.responseCode}: {request.downloadHandler?.text ?? request.error}");
                    }
                }
            }
        }

        /// <summary>
        /// General Coroutine for PUT requests
        /// </summary>
        private IEnumerator PutCoroutine<T>(string url, string jsonBody, bool authenticated, Action<ApiResponse<T>> onSuccess, Action<string> onError)
        {
            using (UnityWebRequest request = new UnityWebRequest(url, "PUT"))
            {
                byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                request.timeout = RequestTimeoutSeconds;

                if (authenticated && !string.IsNullOrEmpty(GameManager.Instance.AuthToken))
                {
                    request.SetRequestHeader("Authorization", $"Bearer {GameManager.Instance.AuthToken}");
                }

                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success)
                {
                    try
                    {
                        var response = JsonUtility.FromJson<ApiResponse<T>>(request.downloadHandler.text);
                        onSuccess?.Invoke(response);
                    }
                    catch (Exception ex)
                    {
                        onError?.Invoke($"Failed to parse JSON response: {ex.Message}");
                    }
                }
                else
                {
                    onError?.Invoke($"HTTP {request.responseCode}: {request.downloadHandler?.text ?? request.error}");
                }
            }
        }

        [Serializable]
        private class RefreshPayload
        {
            public string refreshToken;
        }

        [Serializable]
        private class RefreshResponseData
        {
            public string accessToken;
            public string refreshToken;
        }

        private IEnumerator RefreshTokenCoroutine(Action onRefreshed, Action<string> onFail)
        {
            if (string.IsNullOrEmpty(GameManager.Instance.RefreshToken))
            {
                onFail?.Invoke("No refresh token stored. Re-authentication required.");
                yield break;
            }

            string url = $"{GameManager.Instance.ApiBaseUrl}/auth/refresh";
            string body = $"{{\"refreshToken\":\"{GameManager.Instance.RefreshToken}\"}}";

            using (UnityWebRequest req = new UnityWebRequest(url, "POST"))
            {
                byte[] raw = Encoding.UTF8.GetBytes(body);
                req.uploadHandler = new UploadHandlerRaw(raw);
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");

                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    var res = JsonUtility.FromJson<ApiResponse<RefreshResponseData>>(req.downloadHandler.text);
                    if (res != null && res.data != null)
                    {
                        GameManager.Instance.AuthToken = res.data.accessToken;
                        GameManager.Instance.RefreshToken = res.data.refreshToken;
                        PlayerPrefs.SetString("cw_auth_token", res.data.accessToken);
                        PlayerPrefs.SetString("cw_refresh_token", res.data.refreshToken);
                        PlayerPrefs.Save();
                        onRefreshed?.Invoke();
                    }
                    else
                    {
                        onFail?.Invoke("Failed to rotate refresh token.");
                    }
                }
                else
                {
                    GameManager.Instance.ClearSession();
                    onFail?.Invoke("Session expired. Please log in again.");
                }
            }
        }
    }
}
