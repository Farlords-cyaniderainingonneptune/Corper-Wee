using System;
using UnityEngine;

namespace CorperWee.Core
{
    /// <summary>
    /// Central game manager singleton maintaining global session state,
    /// player profile caches, network state, and scene coordination.
    /// </summary>
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Runtime Session State")]
        public string AuthToken;
        public string RefreshToken;
        public string UserId;
        public string StateCode;
        public string FullName;
        public string UserRole = "PLAYER";
        public int PlatoonNumber = 1;
        public int CorperPoints = 0;
        public decimal VirtualNaira = 0m;
        public float WaterLevel = 100f; // 0 - 100%

        [Header("Character Customization Cache")]
        public string SelectedGender = "MALE";
        public string SkinTone = "WARM_BROWN";
        public string Hairstyle = "BUZZ_CUT";
        public string HairColor = "BLACK";
        public string UniformType = "KHAKI_FULL"; // KHAKI_FULL, WHITE_PT, CEREMONIAL

        [Header("Game Configuration")]
        [Tooltip("Target base URL for Node.js authoritative backend")]
        public string ApiBaseUrl = "http://localhost:3000/api/v1";

        public event Action<int, decimal> OnEconomyUpdated;
        public event Action<float> OnHydrationChanged;
        public event Action<string> OnNotificationMessage;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }

            Instance = this;
            DontDestroyOnLoad(gameObject);

            // Configure mid-range Android mobile performance baseline
            Application.targetFrameRate = 60;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
            QualitySettings.vSyncCount = 0;

            // Load cached credentials if available on mobile
            LoadCachedSession();
        }

        public void SetSession(string token, string refresh, string userId, string stateCode, string name, string role, int platoon)
        {
            AuthToken = token;
            RefreshToken = refresh;
            UserId = userId;
            StateCode = stateCode;
            FullName = name;
            UserRole = role;
            PlatoonNumber = platoon;

            PlayerPrefs.SetString("cw_auth_token", token);
            PlayerPrefs.SetString("cw_refresh_token", refresh);
            PlayerPrefs.SetString("cw_user_id", userId);
            PlayerPrefs.SetString("cw_state_code", stateCode);
            PlayerPrefs.Save();
        }

        public void UpdateEconomy(int points, decimal naira)
        {
            CorperPoints = points;
            VirtualNaira = naira;
            OnEconomyUpdated?.Invoke(points, naira);
        }

        public void UpdateHydration(float level)
        {
            WaterLevel = Mathf.Clamp(level, 0f, 100f);
            OnHydrationChanged?.Invoke(WaterLevel);
        }

        public void PostNotification(string message)
        {
            Debug.Log($"[Corper Wee Notice] {message}");
            OnNotificationMessage?.Invoke(message);
        }

        public void ClearSession()
        {
            AuthToken = null;
            RefreshToken = null;
            UserId = null;
            StateCode = null;
            PlayerPrefs.DeleteKey("cw_auth_token");
            PlayerPrefs.DeleteKey("cw_refresh_token");
            PlayerPrefs.DeleteKey("cw_user_id");
            PlayerPrefs.DeleteKey("cw_state_code");
            PlayerPrefs.Save();
        }

        private void LoadCachedSession()
        {
            if (PlayerPrefs.HasKey("cw_auth_token"))
            {
                AuthToken = PlayerPrefs.GetString("cw_auth_token");
                RefreshToken = PlayerPrefs.GetString("cw_refresh_token", "");
                UserId = PlayerPrefs.GetString("cw_user_id", "");
                StateCode = PlayerPrefs.GetString("cw_state_code", "");
            }
        }
    }
}
