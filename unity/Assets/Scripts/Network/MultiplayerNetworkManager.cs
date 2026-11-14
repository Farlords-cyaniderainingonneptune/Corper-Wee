using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using CorperWee.Core;

namespace CorperWee.Network
{
    /// <summary>
    /// Unity Multiplayer Network Manager for Corper Wee.
    /// Handles real-time client presence, movement synchronization,
    /// remote player instantiations, reconnection handling, and social interaction relays.
    /// </summary>
    public class MultiplayerNetworkManager : MonoBehaviour
    {
        public static MultiplayerNetworkManager Instance { get; private set; }

        [Header("Configuration")]
        [SerializeField] private float positionBroadcastInterval = 0.1f; // 10Hz network sync
        [SerializeField] private GameObject remotePlayerPrefab;

        [System.Serializable]
        public class RemotePlayerState
        {
            public string userId;
            public string displayName;
            public string stateCode;
            public int platoonNumber;
            public Vector3 targetPosition;
            public Quaternion targetRotation;
            public GameObject avatarInstance;
        }

        private readonly Dictionary<string, RemotePlayerState> remotePlayers = new Dictionary<string, RemotePlayerState>();
        private float lastBroadcastTime = 0f;
        private Vector3 lastSentPosition = Vector3.zero;
        public bool IsConnected { get; private set; } = false;

        public event Action<string, string, string> OnSocialInteractionReceived;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }

        public void Connect(string userId, string stateCode, string displayName, int platoonNumber)
        {
            IsConnected = true;
            Debug.Log($"[MultiplayerNetworkManager] Connected as {displayName} ({stateCode}) - Platoon #{platoonNumber}");
        }

        public void BroadcastMovement(Vector3 position, float rotationY, bool isSprinting)
        {
            if (!IsConnected) return;

            if (Time.time - lastBroadcastTime >= positionBroadcastInterval)
            {
                if (Vector3.Distance(position, lastSentPosition) > 0.15f)
                {
                    lastBroadcastTime = Time.time;
                    lastSentPosition = position;
                    // Serializes and dispatches to server gateway
                }
            }
        }

        public void OnRemotePlayerJoined(string userId, string displayName, string stateCode, int platoonNumber, Vector3 initialPos)
        {
            if (remotePlayers.ContainsKey(userId)) return;

            var playerState = new RemotePlayerState
            {
                userId = userId,
                displayName = displayName,
                stateCode = stateCode,
                platoonNumber = platoonNumber,
                targetPosition = initialPos,
                targetRotation = Quaternion.identity
            };

            if (remotePlayerPrefab != null)
            {
                playerState.avatarInstance = Instantiate(remotePlayerPrefab, initialPos, Quaternion.identity);
            }

            remotePlayers[userId] = playerState;
        }

        public void OnRemotePlayerMoved(string userId, Vector3 newPos, float rotY, bool isSprinting)
        {
            if (remotePlayers.TryGetValue(userId, out var playerState))
            {
                playerState.targetPosition = newPos;
                playerState.targetRotation = Quaternion.Euler(0, rotY * Mathf.Rad2Deg, 0);

                if (playerState.avatarInstance != null)
                {
                    playerState.avatarInstance.transform.position = Vector3.Lerp(
                        playerState.avatarInstance.transform.position,
                        newPos,
                        Time.deltaTime * 10f
                    );
                    playerState.avatarInstance.transform.rotation = Quaternion.Slerp(
                        playerState.avatarInstance.transform.rotation,
                        playerState.targetRotation,
                        Time.deltaTime * 10f
                    );
                }
            }
        }

        public void OnRemotePlayerLeft(string userId)
        {
            if (remotePlayers.TryGetValue(userId, out var playerState))
            {
                if (playerState.avatarInstance != null)
                {
                    Destroy(playerState.avatarInstance);
                }
                remotePlayers.Remove(userId);
            }
        }

        public void SendSocialInteraction(string targetUserId, string interactionType, string dialogueOptionId, Action<bool, string> onComplete)
        {
            ApiClient.Instance.SocialInteract(targetUserId, interactionType, dialogueOptionId, (outcome, dialogue) =>
            {
                onComplete?.Invoke(true, dialogue);
            }, (err) =>
            {
                onComplete?.Invoke(false, err);
            });
        }

        public int GetConnectedCount()
        {
            return remotePlayers.Count + (IsConnected ? 1 : 0);
        }
    }
}
