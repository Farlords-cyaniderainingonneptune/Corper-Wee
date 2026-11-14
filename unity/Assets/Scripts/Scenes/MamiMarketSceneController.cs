using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using CorperWee.Core;
using CorperWee.Network;

namespace CorperWee.Scenes
{
    /// <summary>
    /// Scene 6: Mami Market Scene Controller.
    /// Manages Mami Market commerce, vendor stalls (Mama Put, Tailors, Provisions),
    /// cold water purchases, and Corper Points (CP) to Virtual Naira (₦) banking.
    /// </summary>
    public class MamiMarketSceneController : MonoBehaviour
    {
        [Header("UI Panels")]
        [SerializeField] private GameObject shopPanel;
        [SerializeField] private GameObject atmPanel;
        [SerializeField] private Text marketFeedbackText;
        [SerializeField] private Button backToCampButton;

        [Header("ATM Convert Input")]
        [SerializeField] private InputField pointsToConvertInput;
        [SerializeField] private Button convertButton;

        private void Start()
        {
            if (backToCampButton != null)
            {
                backToCampButton.onClick.AddListener(OnBackToCampClicked);
            }

            if (convertButton != null)
            {
                convertButton.onClick.AddListener(OnConvertPointsClicked);
            }
        }

        public void BuyColdWater()
        {
            // Purchase cold pure water (Restores 35% hydration, costs ₦50)
            GameManager.Instance.PostNotification("Purchased Cold Sachet Water (₦50). Hydration +35%!");
            float newWater = Mathf.Min(100f, GameManager.Instance.WaterLevel + 35f);
            GameManager.Instance.UpdateHydration(newWater);
        }

        public void BuyMamaPutJollof()
        {
            // Purchase Mama Put Jollof & Fried Chicken (costs ₦1,200)
            if (GameManager.Instance.VirtualNaira >= 1200m)
            {
                decimal remainingNaira = GameManager.Instance.VirtualNaira - 1200m;
                GameManager.Instance.UpdateEconomy(GameManager.Instance.CorperPoints, remainingNaira);
                GameManager.Instance.PostNotification("Delicious Mama Put Jollof rice enjoyed! Stamina boosted.");
            }
            else
            {
                GameManager.Instance.PostNotification("Insufficient Naira! Convert your Corper Points at the camp ATM kiosk.");
            }
        }

        public void OnConvertPointsClicked()
        {
            if (pointsToConvertInput == null) return;

            if (int.TryParse(pointsToConvertInput.text, out int points) && points > 0)
            {
                if (points > GameManager.Instance.CorperPoints)
                {
                    if (marketFeedbackText != null) marketFeedbackText.text = "You do not have enough Corper Points.";
                    return;
                }

                // 10 CP = ₦100 Virtual Naira
                decimal nairaEarned = (decimal)(points * 10);
                int remainingCP = GameManager.Instance.CorperPoints - points;
                decimal totalNaira = GameManager.Instance.VirtualNaira + nairaEarned;

                GameManager.Instance.UpdateEconomy(remainingCP, totalNaira);
                if (marketFeedbackText != null)
                {
                    marketFeedbackText.text = $"Converted {points} CP -> +₦{nairaEarned:N2} Naira!";
                }
            }
        }

        public void OnBackToCampClicked()
        {
            SceneLoadingManager.Instance.LoadScene(SceneLoadingManager.SceneName.CampEnvironment);
        }
    }
}
