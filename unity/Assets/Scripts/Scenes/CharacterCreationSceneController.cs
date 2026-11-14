using System;
using UnityEngine;
using UnityEngine.UI;
using CorperWee.Core;
using CorperWee.Network;

namespace CorperWee.Scenes
{
    /// <summary>
    /// Scene 2: Character Creation Scene Controller.
    /// Handles 3D avatar preview, gender toggle, skin tones, hairstyles, uniforms, and persists to backend.
    /// </summary>
    public class CharacterCreationSceneController : MonoBehaviour
    {
        [Header("3D Preview Model")]
        [SerializeField] private Transform characterPreviewRoot;
        [SerializeField] private float previewRotationSpeed = 30f;

        [Header("Selection State")]
        private string currentGender = "MALE";
        private string currentSkin = "WARM_BROWN";
        private string currentHair = "BUZZ_CUT";
        private string currentHairColor = "BLACK";
        private string currentUniform = "KHAKI_FULL"; // KHAKI_FULL or WHITE_PT

        [Header("UI Controls")]
        [SerializeField] private Button maleButton;
        [SerializeField] private Button femaleButton;
        [SerializeField] private Dropdown skinDropdown;
        [SerializeField] private Dropdown hairDropdown;
        [SerializeField] private Dropdown uniformDropdown;
        [SerializeField] private Button confirmButton;
        [SerializeField] private Text statusText;

        private void Start()
        {
            if (confirmButton != null)
            {
                confirmButton.onClick.AddListener(OnConfirmCharacterClicked);
            }

            if (maleButton != null) maleButton.onClick.AddListener(() => SetGender("MALE"));
            if (femaleButton != null) femaleButton.onClick.AddListener(() => SetGender("FEMALE"));
        }

        private void Update()
        {
            // Rotate 3D preview model slowly
            if (characterPreviewRoot != null)
            {
                characterPreviewRoot.Rotate(Vector3.up, previewRotationSpeed * Time.deltaTime);
            }
        }

        public void SetGender(string gender)
        {
            currentGender = gender;
            UpdatePreviewModel();
        }

        public void SetSkin(string skin)
        {
            currentSkin = skin;
            UpdatePreviewModel();
        }

        public void SetUniform(string uniform)
        {
            currentUniform = uniform;
            UpdatePreviewModel();
        }

        private void UpdatePreviewModel()
        {
            // Updates preview material and hair mesh in Unity scene
            Debug.Log($"[Preview] Updated to {currentGender}, Skin: {currentSkin}, Uniform: {currentUniform}");
        }

        public void OnConfirmCharacterClicked()
        {
            if (statusText != null) statusText.text = "Saving Corper profile...";

            ApiClient.Instance.UpdateCharacter(currentGender, currentSkin, currentHair, currentHairColor, currentUniform, () =>
            {
                GameManager.Instance.PostNotification("Character created! Welcome to Iseyin Camp.");
                SceneLoadingManager.Instance.LoadScene(SceneLoadingManager.SceneName.CampEnvironment);
            }, (err) =>
            {
                if (statusText != null) statusText.text = $"Error: {err}";
            });
        }
    }
}
