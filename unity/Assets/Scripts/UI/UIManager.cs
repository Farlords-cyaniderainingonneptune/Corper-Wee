using System;
using UnityEngine;
using UnityEngine.UI;
using CorperWee.Core;

namespace CorperWee.UI
{
    /// <summary>
    /// Master UI framework manager controlling HUD counters, hydration meters,
    /// notifications, modal dialogs, and scene overlays.
    /// </summary>
    public class UIManager : MonoBehaviour
    {
        public static UIManager Instance { get; private set; }

        [Header("Top HUD Elements")]
        [SerializeField] private Text pointsText;
        [SerializeField] private Text nairaText;
        [SerializeField] private Text platoonText;
        [SerializeField] private Text stateCodeText;

        [Header("Hydration Meter")]
        [SerializeField] private Slider hydrationSlider;
        [SerializeField] private Image hydrationFillImage;
        [SerializeField] private Color normalHydrationColor = new Color(0.2f, 0.7f, 1.0f);
        [SerializeField] private Color lowHydrationColor = new Color(1.0f, 0.3f, 0.2f);

        [Header("Notification Toast")]
        [SerializeField] private GameObject notificationPanel;
        [SerializeField] private Text notificationText;
        [SerializeField] private float notificationDisplayTime = 3.5f;

        private float notificationTimer = 0f;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }

        private void Start()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnEconomyUpdated += UpdateEconomyUI;
                GameManager.Instance.OnHydrationChanged += UpdateHydrationUI;
                GameManager.Instance.OnNotificationMessage += ShowNotification;

                // Initial sync
                UpdateEconomyUI(GameManager.Instance.CorperPoints, GameManager.Instance.VirtualNaira);
                UpdateHydrationUI(GameManager.Instance.WaterLevel);

                if (platoonText != null)
                {
                    platoonText.text = $"Platoon {GameManager.Instance.PlatoonNumber}";
                }
                if (stateCodeText != null)
                {
                    stateCodeText.text = GameManager.Instance.StateCode ?? "OY/26C/5439";
                }
            }

            if (notificationPanel != null)
            {
                notificationPanel.SetActive(false);
            }
        }

        private void OnDestroy()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnEconomyUpdated -= UpdateEconomyUI;
                GameManager.Instance.OnHydrationChanged -= UpdateHydrationUI;
                GameManager.Instance.OnNotificationMessage -= ShowNotification;
            }
        }

        private void Update()
        {
            if (notificationPanel != null && notificationPanel.activeSelf)
            {
                notificationTimer -= Time.deltaTime;
                if (notificationTimer <= 0f)
                {
                    notificationPanel.SetActive(false);
                }
            }
        }

        public void UpdateEconomyUI(int points, decimal naira)
        {
            if (pointsText != null) pointsText.text = $"{points:N0} CP";
            if (nairaText != null) nairaText.text = $"₦{naira:N2}";
        }

        public void UpdateHydrationUI(float level)
        {
            if (hydrationSlider != null)
            {
                hydrationSlider.value = level / 100f;
            }

            if (hydrationFillImage != null)
            {
                hydrationFillImage.color = level < 25f ? lowHydrationColor : normalHydrationColor;
            }
        }

        public void ShowNotification(string message)
        {
            if (notificationPanel != null && notificationText != null)
            {
                notificationText.text = message;
                notificationPanel.SetActive(true);
                notificationTimer = notificationDisplayTime;
            }
        }
    }
}
