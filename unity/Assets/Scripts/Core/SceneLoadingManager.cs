/**
 * Corper Wee - Unity 3D Mobile Engine Architecture
 * Reusable Asynchronous Scene Management System for Android/iOS
 */
using System;
using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace CorperWee.Core
{
    public enum GameScene
    {
        Authentication = 0,
        CharacterCreation = 1,
        CampEnvironment = 2,
        ParadeGround = 3,
        CanteenObstacle = 4,
        MamiMarket = 5
    }

    public class SceneLoadingManager : MonoBehaviour
    {
        public static SceneLoadingManager Instance { get; private set; }

        [Header("Scene Configuration")]
        [SerializeField] private string[] sceneNames = new string[]
        {
            "Scene_01_Authentication",
            "Scene_02_CharacterCreation",
            "Scene_03_CampEnvironment",
            "Scene_04_ParadeGround",
            "Scene_05_CanteenObstacle",
            "Scene_06_MamiMarket"
        };

        [Header("UI Feedback")]
        [SerializeField] private CanvasGroup loadingCanvasGroup;
        [SerializeField] private UnityEngine.UI.Slider progressBar;
        [SerializeField] private UnityEngine.UI.Text loadingText;

        public event Action<GameScene> OnSceneLoadStarted;
        public event Action<GameScene> OnSceneLoadCompleted;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
                ConfigureAndroidQualitySettings();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void ConfigureAndroidQualitySettings()
        {
            // Optimize for mid-range Android devices
            Application.targetFrameRate = 60;
            QualitySettings.vSyncCount = 0;
            Screen.sleepTimeout = SleepTimeout.NeverSleep;
        }

        public void LoadScene(GameScene targetScene)
        {
            StartCoroutine(LoadSceneAsyncRoutine(targetScene));
        }

        private IEnumerator LoadSceneAsyncRoutine(GameScene targetScene)
        {
            int sceneIndex = (int)targetScene;
            if (sceneIndex < 0 || sceneIndex >= sceneNames.Length)
            {
                Debug.LogError($"[SceneManager] Invalid scene index: {sceneIndex}");
                yield break;
            }

            string targetSceneName = sceneNames[sceneIndex];
            OnSceneLoadStarted?.Invoke(targetScene);

            if (loadingCanvasGroup != null)
            {
                loadingCanvasGroup.alpha = 1f;
                loadingCanvasGroup.blocksRaycasts = true;
            }

            AsyncOperation asyncOp = SceneManager.LoadSceneAsync(targetSceneName);
            asyncOp.allowSceneActivation = false;

            while (!asyncOp.isDone)
            {
                float progress = Mathf.Clamp01(asyncOp.progress / 0.9f);
                if (progressBar != null) progressBar.value = progress;
                if (loadingText != null) loadingText.text = $"Deploying to {targetScene}... {(int)(progress * 100)}%";

                if (asyncOp.progress >= 0.9f)
                {
                    yield return new WaitForSeconds(0.2f); // brief smooth transition
                    asyncOp.allowSceneActivation = true;
                }

                yield return null;
            }

            if (loadingCanvasGroup != null)
            {
                float elapsed = 0f;
                while (elapsed < 0.3f)
                {
                    elapsed += Time.deltaTime;
                    loadingCanvasGroup.alpha = Mathf.Lerp(1f, 0f, elapsed / 0.3f);
                    yield return null;
                }
                loadingCanvasGroup.blocksRaycasts = false;
            }

            OnSceneLoadCompleted?.Invoke(targetScene);
            Debug.Log($"[SceneManager] Scene '{targetSceneName}' loaded successfully.");
        }
    }
}
