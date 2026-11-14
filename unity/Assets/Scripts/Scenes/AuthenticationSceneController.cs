using System;
using UnityEngine;
using UnityEngine.UI;
using CorperWee.Core;
using CorperWee.Network;

namespace CorperWee.Scenes
{
    /// <summary>
    /// Scene 1: Authentication Scene Controller for Unity.
    /// Handles Demo Email + NYSC State Code authentication flow with 1-to-1 uniqueness,
    /// Superadmin fast login, and transition to Character Creation or Camp Environment.
    /// </summary>
    public class AuthenticationSceneController : MonoBehaviour
    {
        [Header("UI References")]
        [SerializeField] private InputField emailInputField;
        [SerializeField] private InputField stateCodeInputField;
        [SerializeField] private InputField fullNameInputField;
        [SerializeField] private Text errorText;
        [SerializeField] private Button enterCampButton;
        [SerializeField] private Button superadminButton;
        [SerializeField] private GameObject loadingOverlay;

        private void Start()
        {
            if (errorText != null) errorText.text = "";
            if (loadingOverlay != null) loadingOverlay.SetActive(false);

            if (enterCampButton != null)
            {
                enterCampButton.onClick.AddListener(OnEnterCampClicked);
            }

            if (superadminButton != null)
            {
                superadminButton.onClick.AddListener(OnSuperadminFastLoginClicked);
            }
        }

        public void OnEnterCampClicked()
        {
            string email = emailInputField != null ? emailInputField.text.Trim().ToLower() : "corper@gmail.com";
            string stateCode = stateCodeInputField != null ? stateCodeInputField.text.Trim().ToUpper() : "OY/26C/1001";
            string fullName = fullNameInputField != null ? fullNameInputField.text.Trim() : "Bisi Adebayo";

            if (string.IsNullOrEmpty(email) || !email.Contains("@"))
            {
                ShowError("Please enter a valid email address.");
                return;
            }

            if (string.IsNullOrEmpty(stateCode))
            {
                ShowError("Please enter your NYSC State Code (e.g. OY/26C/1001).");
                return;
            }

            SetLoading(true);

            ApiClient.Instance.AuthenticateWithCredentials(email, stateCode, fullName, (data) =>
            {
                SetLoading(false);
                if (data.isNewUser || data.requiresOnboarding)
                {
                    SceneLoadingManager.Instance.LoadScene(SceneLoadingManager.SceneName.CharacterCreation);
                }
                else
                {
                    SceneLoadingManager.Instance.LoadScene(SceneLoadingManager.SceneName.CampEnvironment);
                }
            }, (err) =>
            {
                SetLoading(false);
                ShowError(err);
            });
        }

        public void OnSuperadminFastLoginClicked()
        {
            SetLoading(true);
            ApiClient.Instance.AuthenticateWithCredentials("farlodunolusege@gmail.com", "OY/26C/5439", "Olusegun Farlodun (Commandant)", (data) =>
            {
                SetLoading(false);
                GameManager.Instance.PostNotification("Welcome, Superadmin Olusegun!");
                SceneLoadingManager.Instance.LoadScene(SceneLoadingManager.SceneName.CampEnvironment);
            }, (err) =>
            {
                SetLoading(false);
                ShowError(err);
            });
        }

        private void ShowError(string msg)
        {
            if (errorText != null)
            {
                errorText.text = msg;
            }
        }

        private void SetLoading(bool active)
        {
            if (loadingOverlay != null)
            {
                loadingOverlay.SetActive(active);
            }
        }
    }
}
