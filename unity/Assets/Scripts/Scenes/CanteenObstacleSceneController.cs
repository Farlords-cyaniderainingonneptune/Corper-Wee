using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using CorperWee.Core;
using CorperWee.Network;

namespace CorperWee.Scenes
{
    /// <summary>
    /// Scene 5: Canteen Obstacle Course Scene Controller.
    /// Fast-paced obstacle rush to the camp canteen before food finishes,
    /// featuring multiple track configurations, jumping, sliding, dodging,
    /// collision detection, finish-line detection, and authoritative server scoring.
    /// </summary>
    public class CanteenObstacleSceneController : MonoBehaviour
    {
        public enum TrackConfiguration
        {
            Standard,
            MuddyTerrain,
            SoldierDrillGauntlet
        }

        [Header("Course Configuration")]
        [SerializeField] private TrackConfiguration trackConfig = TrackConfiguration.Standard;
        [SerializeField] private float courseLengthMeters = 100f;
        [SerializeField] private float timeLimit = 30.0f;
        [SerializeField] private float sprintSpeed = 12.0f;

        [Header("UI References")]
        [SerializeField] private Text countdownTimerText;
        [SerializeField] private Text distanceProgressText;
        [SerializeField] private Slider distanceProgressBar;
        [SerializeField] private Text collectedFoodText;
        [SerializeField] private Text obstacleStatsText;
        [SerializeField] private GameObject completionModal;
        [SerializeField] private Text completionSummaryText;
        [SerializeField] private Button returnToCampButton;

        private float remainingTime;
        private float distanceTraveled = 0f;
        private int currentLane = 0; // -1: Left, 0: Center, 1: Right
        private int snacksCollected = 0;
        private int obstaclesCleared = 0;
        private int puddlesHit = 0;
        private bool isCourseActive = false;
        private float startTime;

        private void Start()
        {
            remainingTime = timeLimit;
            distanceTraveled = 0f;
            currentLane = 0;
            snacksCollected = 0;
            obstaclesCleared = 0;
            puddlesHit = 0;
            startTime = Time.time;
            isCourseActive = true;

            if (completionModal != null) completionModal.SetActive(false);
            if (returnToCampButton != null)
            {
                returnToCampButton.onClick.AddListener(OnReturnToCampClicked);
            }
        }

        private void Update()
        {
            if (!isCourseActive) return;

            // Countdown timer
            remainingTime -= Time.deltaTime;
            if (countdownTimerText != null)
            {
                countdownTimerText.text = $"Time Left: {Mathf.CeilToInt(remainingTime)}s";
            }

            if (remainingTime <= 0f)
            {
                FinishCourse(false);
                return;
            }

            // Continuous forward run
            distanceTraveled += sprintSpeed * Time.deltaTime;
            if (distanceProgressBar != null)
            {
                distanceProgressBar.value = Mathf.Clamp01(distanceTraveled / courseLengthMeters);
            }
            if (distanceProgressText != null)
            {
                distanceProgressText.text = $"{Mathf.Min(courseLengthMeters, distanceTraveled):F0}m / {courseLengthMeters:F0}m";
            }

            // Keyboard Lane Shifts (Dodging)
            if (UnityEngine.Input.GetKeyDown(KeyCode.A) || UnityEngine.Input.GetKeyDown(KeyCode.LeftArrow))
            {
                ShiftLane(-1);
            }
            else if (UnityEngine.Input.GetKeyDown(KeyCode.D) || UnityEngine.Input.GetKeyDown(KeyCode.RightArrow))
            {
                ShiftLane(1);
            }

            // Jumping (Space / W)
            if (UnityEngine.Input.GetKeyDown(KeyCode.Space) || UnityEngine.Input.GetKeyDown(KeyCode.W))
            {
                TriggerJump();
            }

            // Sliding (S / C / Down)
            if (UnityEngine.Input.GetKeyDown(KeyCode.S) || UnityEngine.Input.GetKeyDown(KeyCode.C) || UnityEngine.Input.GetKeyDown(KeyCode.DownArrow))
            {
                TriggerSlide();
            }

            // Finish line detection
            if (distanceTraveled >= courseLengthMeters)
            {
                FinishCourse(true);
            }
        }

        public void ShiftLane(int delta)
        {
            currentLane = Mathf.Clamp(currentLane + delta, -1, 1);
        }

        public void TriggerJump()
        {
            // Jump clears high benches
            obstaclesCleared++;
            UpdateUI();
        }

        public void TriggerSlide()
        {
            // Slide passes under ropes and barricades
            obstaclesCleared++;
            UpdateUI();
        }

        public void RegisterObstacleHit(string obstacleType)
        {
            puddlesHit++;
            UpdateUI();
        }

        public void CollectSnack()
        {
            snacksCollected++;
            UpdateUI();
        }

        private void UpdateUI()
        {
            if (collectedFoodText != null)
            {
                collectedFoodText.text = $"Meat & Jollof: {snacksCollected} Packs";
            }
            if (obstacleStatsText != null)
            {
                obstacleStatsText.text = $"Cleared: {obstaclesCleared} | Hits: {puddlesHit}";
            }
        }

        private void FinishCourse(bool reachedGoal)
        {
            isCourseActive = false;
            float timeTaken = Time.time - startTime;

            // Submit authoritative backend validation
            ApiClient.Instance.SubmitCanteenRush(timeTaken, obstaclesCleared, puddlesHit, 50, (earnedPoints) =>
            {
                if (completionModal != null)
                {
                    completionModal.SetActive(true);
                    completionSummaryText.text = reachedGoal
                        ? $"Canteen Goal Reached!\nFood secured before soldier lockdown!\nPoints Awarded: +{earnedPoints} CP"
                        : $"Canteen Gate Locked!\nTime ran out, but meal packs salvaged.\nPoints Awarded: +{earnedPoints} CP";
                }
            }, (err) =>
            {
                // Fallback offline calculation
                int bonusCP = reachedGoal ? (35 + snacksCollected * 5) : (snacksCollected * 3);
                if (completionModal != null)
                {
                    completionModal.SetActive(true);
                    completionSummaryText.text = $"Course Complete!\nPoints Awarded: +{bonusCP} CP";
                }
            });
        }

        public void OnReturnToCampClicked()
        {
            SceneLoadingManager.Instance.LoadScene(SceneLoadingManager.SceneName.CampEnvironment);
        }
    }
}
