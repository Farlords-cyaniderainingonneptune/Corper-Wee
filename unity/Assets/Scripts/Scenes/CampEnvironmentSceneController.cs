using System;
using UnityEngine;
using UnityEngine.UI;
using CorperWee.Core;
using CorperWee.Network;

namespace CorperWee.Scenes
{
    /// <summary>
    /// Scene 3: Camp Environment Scene Controller.
    /// Manages open camp exploration (Iseyin Camp, Oyo State), proximity zone triggers,
    /// hydration depletion tick, and scene switching to minigames.
    /// </summary>
    public class CampEnvironmentSceneController : MonoBehaviour
    {
        [Header("Zone Trigger UI")]
        [SerializeField] private GameObject zonePromptPanel;
        [SerializeField] private Text zoneTitleText;
        [SerializeField] private Text zoneDescriptionText;
        [SerializeField] private Button enterZoneButton;

        [Header("Hydration Depletion Settings")]
        [SerializeField] private float hydrationDepletionRate = 0.5f; // % per second in hot sun
        private float waterTickTimer = 1.0f;

        private SceneLoadingManager.SceneName currentTargetZone = SceneLoadingManager.SceneName.ParadeGround;
        private bool isNearZone = false;

        private void Start()
        {
            if (zonePromptPanel != null)
            {
                zonePromptPanel.SetActive(false);
            }

            if (enterZoneButton != null)
            {
                enterZoneButton.onClick.AddListener(OnEnterZoneClicked);
            }
        }

        private void Update()
        {
            HandleHydrationDepletion();
        }

        private void HandleHydrationDepletion()
        {
            waterTickTimer -= Time.deltaTime;
            if (waterTickTimer <= 0f)
            {
                waterTickTimer = 2.0f;
                if (GameManager.Instance != null && GameManager.Instance.WaterLevel > 0f)
                {
                    float newLevel = Mathf.Max(0f, GameManager.Instance.WaterLevel - hydrationDepletionRate * 2.0f);
                    GameManager.Instance.UpdateHydration(newLevel);

                    if (newLevel <= 10f && newLevel > 8f)
                    {
                        GameManager.Instance.PostNotification("Warning: Heavy dehydration! Drink water at the borehole or buy pure water at Mami Market.");
                    }
                }
            }
        }

        public void OnZoneTriggerEnter(string zoneName, SceneLoadingManager.SceneName targetScene, string description)
        {
            isNearZone = true;
            currentTargetZone = targetScene;

            if (zonePromptPanel != null)
            {
                zoneTitleText.text = zoneName;
                zoneDescriptionText.text = description;
                zonePromptPanel.SetActive(true);
            }
        }

        public void OnZoneTriggerExit()
        {
            isNearZone = false;
            if (zonePromptPanel != null)
            {
                zonePromptPanel.SetActive(false);
            }
        }

        public void OnEnterZoneClicked()
        {
            if (isNearZone)
            {
                SceneLoadingManager.Instance.LoadScene(currentTargetZone);
            }
        }

        public void RefillWaterAtBorehole()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.UpdateHydration(100f);
                GameManager.Instance.PostNotification("Water bucket filled! Hydration restored to 100%.");
            }
        }
    }
}
