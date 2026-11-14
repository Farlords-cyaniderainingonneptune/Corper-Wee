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
    /// Scene 4: Parade Ground Scene Controller.
    /// Military rhythm-action drill minigame featuring configurable difficulties,
    /// specific action-key matching, timing evaluation, penalty deductions, and authoritative server scoring.
    /// </summary>
    public class ParadeGroundSceneController : MonoBehaviour
    {
        public enum DrillDifficulty
        {
            Easy,
            Normal,
            Hard
        }

        [System.Serializable]
        public struct DrillCommand
        {
            public string id;
            public string label;
            public KeyCode primaryKey;
            public string sergeantCall;
        }

        [Header("Drill UI Elements")]
        [SerializeField] private Text sergeantOrderText;
        [SerializeField] private Slider timingSlider;
        [SerializeField] private RectTransform hitZoneTransform;
        [SerializeField] private Text drillScoreText;
        [SerializeField] private Text drillStreakText;
        [SerializeField] private Text drillFeedbackText;
        [SerializeField] private GameObject difficultySelectModal;
        [SerializeField] private GameObject resultsModal;
        [SerializeField] private Text resultsSummaryText;
        [SerializeField] private Text performanceRankText;
        [SerializeField] private Button backToCampButton;

        [Header("Difficulty Settings")]
        [SerializeField] private DrillDifficulty activeDifficulty = DrillDifficulty.Normal;
        [SerializeField] private float easyInterval = 2.2f;
        [SerializeField] private float normalInterval = 1.65f;
        [SerializeField] private float hardInterval = 1.25f;

        private float currentInterval = 1.65f;
        private int totalCommandsInRound = 12;
        private int currentCommandIndex = 0;
        private int successfulCommands = 0;
        private int currentStreak = 0;
        private int currentScore = 0;
        private bool isDrillActive = false;
        private float currentBeatTime = 0f;
        private bool commandEvaluated = false;

        private DrillCommand activeCommand;
        private List<DrillCommand> activeSequence = new List<DrillCommand>();

        private readonly DrillCommand[] commandDatabase = new DrillCommand[]
        {
            new DrillCommand { id = "ATTENTION", label = "ATTEN-TION!", primaryKey = KeyCode.A, sergeantCall = "ATTEN-TION!" },
            new DrillCommand { id = "RIGHT_TURN", label = "RIGHT TURN!", primaryKey = KeyCode.D, sergeantCall = "RIGHT... TURN!" },
            new DrillCommand { id = "LEFT_TURN", label = "LEFT TURN!", primaryKey = KeyCode.L, sergeantCall = "LEFT... TURN!" },
            new DrillCommand { id = "ABOUT_TURN", label = "ABOUT TURN!", primaryKey = KeyCode.S, sergeantCall = "ABOUT... TURN!" },
            new DrillCommand { id = "QUICK_MARCH", label = "QUICK MARCH!", primaryKey = KeyCode.M, sergeantCall = "QUICK... MARCH!" },
            new DrillCommand { id = "EYES_RIGHT", label = "EYES RIGHT!", primaryKey = KeyCode.E, sergeantCall = "EYES... RIGHT!" },
            new DrillCommand { id = "STAND_AT_EASE", label = "STAND AT EASE!", primaryKey = KeyCode.X, sergeantCall = "STAND AT... EASE!" },
            new DrillCommand { id = "PLATOON_HALT", label = "PLATOON HALT!", primaryKey = KeyCode.H, sergeantCall = "PLATOON... HALT!" }
        };

        private void Start()
        {
            if (resultsModal != null) resultsModal.SetActive(false);
            if (difficultySelectModal != null) difficultySelectModal.SetActive(true);
            if (backToCampButton != null)
            {
                backToCampButton.onClick.AddListener(OnBackToCampClicked);
            }
        }

        public void SelectDifficulty(int difficultyIndex)
        {
            activeDifficulty = (DrillDifficulty)difficultyIndex;
            switch (activeDifficulty)
            {
                case DrillDifficulty.Easy:
                    currentInterval = easyInterval;
                    totalCommandsInRound = 8;
                    break;
                case DrillDifficulty.Normal:
                    currentInterval = normalInterval;
                    totalCommandsInRound = 12;
                    break;
                case DrillDifficulty.Hard:
                    currentInterval = hardInterval;
                    totalCommandsInRound = 16;
                    break;
            }

            if (difficultySelectModal != null) difficultySelectModal.SetActive(false);
            StartDrillSession();
        }

        private void StartDrillSession()
        {
            currentCommandIndex = 0;
            successfulCommands = 0;
            currentStreak = 0;
            currentScore = 0;
            isDrillActive = true;

            // Generate sequence
            activeSequence.Clear();
            for (int i = 0; i < totalCommandsInRound; i++)
            {
                activeSequence.Add(commandDatabase[UnityEngine.Random.Range(0, commandDatabase.Length)]);
            }

            NextCommand();
        }

        private void Update()
        {
            if (!isDrillActive) return;

            currentBeatTime += Time.deltaTime;
            float progress = Mathf.Clamp01(currentBeatTime / currentInterval);

            if (timingSlider != null)
            {
                timingSlider.value = progress;
            }

            // Exceeded time window without key response: Miss
            if (currentBeatTime >= currentInterval)
            {
                if (!commandEvaluated)
                {
                    HandleCommandMiss();
                }
                AdvanceDrill();
                return;
            }

            // Detect user key inputs
            if (!commandEvaluated)
            {
                foreach (var cmd in commandDatabase)
                {
                    if (UnityEngine.Input.GetKeyDown(cmd.primaryKey))
                    {
                        EvaluateCommandInput(cmd, progress);
                        break;
                    }
                }
            }
        }

        private void NextCommand()
        {
            if (currentCommandIndex >= totalCommandsInRound)
            {
                FinishDrillSession();
                return;
            }

            activeCommand = activeSequence[currentCommandIndex];
            commandEvaluated = false;
            currentBeatTime = 0f;

            if (sergeantOrderText != null)
            {
                sergeantOrderText.text = $"SERGEANT: \"{activeCommand.sergeantCall}\"\nRespond: [{activeCommand.primaryKey}] {activeCommand.label}";
            }

            currentCommandIndex++;
            UpdateScoreUI();
        }

        private void EvaluateCommandInput(DrillCommand pressedCommand, float progress)
        {
            commandEvaluated = true;

            // Wrong command penalty
            if (pressedCommand.id != activeCommand.id)
            {
                currentScore = Mathf.Max(0, currentScore - 40);
                currentStreak = 0;
                TriggerFeedback($"WRONG COMMAND! ({pressedCommand.label}) -40 Pts!", Color.red);
                UpdateScoreUI();
                return;
            }

            // Correct command: assess timing window
            float sweetStart = activeDifficulty == DrillDifficulty.Hard ? 0.74f : 0.70f;
            float sweetEnd = activeDifficulty == DrillDifficulty.Hard ? 0.88f : 0.94f;

            if (progress >= sweetStart && progress <= sweetEnd)
            {
                successfulCommands++;
                currentStreak++;
                int pts = Mathf.RoundToInt(100 * (activeDifficulty == DrillDifficulty.Hard ? 2.2f : activeDifficulty == DrillDifficulty.Normal ? 1.5f : 1.0f));
                currentScore += pts;
                TriggerFeedback($"PERFECT! Smart corper! +{pts} Pts!", Color.green);
            }
            else if (progress >= sweetStart - 0.20f && progress < sweetStart)
            {
                successfulCommands++;
                currentStreak++;
                int pts = Mathf.RoundToInt(60 * (activeDifficulty == DrillDifficulty.Hard ? 2.2f : activeDifficulty == DrillDifficulty.Normal ? 1.5f : 1.0f));
                currentScore += pts;
                TriggerFeedback($"GOOD! Keep in step! +{pts} Pts!", Color.yellow);
            }
            else
            {
                // Late penalty
                currentScore = Mathf.Max(0, currentScore - 20);
                currentStreak = 0;
                TriggerFeedback("LATE RESPONSE! Hesitant corper! -20 Pts!", new Color(1f, 0.5f, 0f));
            }

            UpdateScoreUI();
        }

        private void HandleCommandMiss()
        {
            commandEvaluated = true;
            currentStreak = 0;
            currentScore = Mathf.Max(0, currentScore - 30);
            TriggerFeedback("MISSED! Platoon out of sync! -30 Pts!", Color.red);
            UpdateScoreUI();
        }

        private void AdvanceDrill()
        {
            NextCommand();
        }

        private void TriggerFeedback(string feedback, Color color)
        {
            if (drillFeedbackText != null)
            {
                drillFeedbackText.text = feedback;
                drillFeedbackText.color = color;
            }
        }

        private void UpdateScoreUI()
        {
            if (drillScoreText != null)
            {
                drillScoreText.text = $"Score: {currentScore} Pts | Order: {currentCommandIndex}/{totalCommandsInRound}";
            }
            if (drillStreakText != null)
            {
                drillStreakText.text = $"{currentStreak}x Combo";
            }
        }

        private void FinishDrillSession()
        {
            isDrillActive = false;

            string diffStr = activeDifficulty.ToString().ToUpper();
            ApiClient.Instance.SubmitParadeDrill(totalCommandsInRound, successfulCommands, (pointsAwarded) =>
            {
                if (resultsModal != null)
                {
                    resultsModal.SetActive(true);
                    float acc = ((float)successfulCommands / totalCommandsInRound) * 100f;
                    string rank = acc >= 95f ? "S" : acc >= 85f ? "A" : acc >= 70f ? "B" : acc >= 50f ? "C" : "F";

                    if (performanceRankText != null)
                    {
                        performanceRankText.text = $"RATING: {rank}";
                    }

                    resultsSummaryText.text = $"Drill Complete!\nAccuracy: {acc:F1}%\nScore: {currentScore} Pts\nPoints Awarded: +{pointsAwarded} CP";
                }
            }, (err) =>
            {
                GameManager.Instance.PostNotification($"Failed to record score: {err}");
            });
        }

        public void OnBackToCampClicked()
        {
            SceneLoadingManager.Instance.LoadScene(SceneLoadingManager.SceneName.CampEnvironment);
        }
    }
}
