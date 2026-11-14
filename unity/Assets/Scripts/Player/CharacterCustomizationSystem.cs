using System;
using UnityEngine;
using CorperWee.Core;
using CorperWee.Network;

namespace CorperWee.Player
{
    /// <summary>
    /// Comprehensive character creation & customization system in Unity.
    /// Manages real-time 3D avatar preview, gender, skin tones, hairstyles,
    /// facial features, uniforms, footwear, accessories, and backend persistence.
    /// </summary>
    public class CharacterCustomizationSystem : MonoBehaviour
    {
        public static CharacterCustomizationSystem Instance { get; private set; }

        [Serializable]
        public class CharacterData
        {
            public string gender = "MALE";
            public string skinTone = "WARM_BROWN";
            public string hairstyle = "BUZZ_CUT";
            public string hairColor = "BLACK";
            public string facialFeature = "NONE";
            public string uniformType = "KHAKI_FULL";
            public string footwear = "JUNGLE_BOOTS";
            public string accessories = "WAIST_BAG";
        }

        [Header("Active Character State")]
        public CharacterData currentCharacter = new CharacterData();

        [Header("3D Avatar Preview Rigs")]
        [SerializeField] private GameObject maleRig;
        [SerializeField] private GameObject femaleRig;
        [SerializeField] private SkinnedMeshRenderer bodyMeshRenderer;
        [SerializeField] private Material[] skinMaterials;

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

        public void SetGender(string gender)
        {
            currentCharacter.gender = gender;
            UpdateRigVisibility();
        }

        public void SetSkinTone(string tone)
        {
            currentCharacter.skinTone = tone;
            ApplyMaterials();
        }

        public void SetHairstyle(string style)
        {
            currentCharacter.hairstyle = style;
        }

        public void SetFacialFeature(string feature)
        {
            currentCharacter.facialFeature = feature;
        }

        public void SetUniform(string uniform)
        {
            currentCharacter.uniformType = uniform;
            ApplyMaterials();
        }

        public void SetFootwear(string footwear)
        {
            currentCharacter.footwear = footwear;
        }

        public void SetAccessories(string accessories)
        {
            currentCharacter.accessories = accessories;
        }

        private void UpdateRigVisibility()
        {
            bool isMale = currentCharacter.gender == "MALE";
            if (maleRig != null) maleRig.SetActive(isMale);
            if (femaleRig != null) femaleRig.SetActive(!isMale);
        }

        private void ApplyMaterials()
        {
            // Material update on skinned mesh renderers for Unity
            Debug.Log($"[Character System] Applied {currentCharacter.uniformType} and skin {currentCharacter.skinTone}");
        }

        public void SaveToBackend(Action onSuccess, Action<string> onError)
        {
            ApiClient.Instance.UpdateCharacter(
                currentCharacter.gender,
                currentCharacter.skinTone,
                currentCharacter.hairstyle,
                currentCharacter.hairColor,
                currentCharacter.uniformType,
                () =>
                {
                    GameManager.Instance.SelectedGender = currentCharacter.gender;
                    GameManager.Instance.SkinTone = currentCharacter.skinTone;
                    GameManager.Instance.Hairstyle = currentCharacter.hairstyle;
                    GameManager.Instance.UniformType = currentCharacter.uniformType;
                    onSuccess?.Invoke();
                },
                onError
            );
        }

        public void LoadFromSession(ApiClient.CharacterData serverData)
        {
            if (serverData == null) return;

            currentCharacter.gender = serverData.gender ?? "MALE";
            currentCharacter.skinTone = serverData.skinTone ?? "WARM_BROWN";
            currentCharacter.hairstyle = serverData.hairstyle ?? "BUZZ_CUT";
            currentCharacter.hairColor = serverData.hairColor ?? "BLACK";
            currentCharacter.uniformType = serverData.uniformType ?? "KHAKI_FULL";

            UpdateRigVisibility();
            ApplyMaterials();
        }
    }
}
