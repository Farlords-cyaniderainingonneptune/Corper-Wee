using System;
using UnityEngine;
using UnityEngine.UI;

namespace CorperWee.Camp
{
    /// <summary>
    /// Interactive mobile minimap radar and navigation guidance system in Unity.
    /// Tracks player position, active waypoint beacons, distance, and compass bearings.
    /// </summary>
    public class MinimapNavigationSystem : MonoBehaviour
    {
        [Header("Target References")]
        [SerializeField] private Transform playerTransform;
        [SerializeField] private RectTransform playerMarkerRect;
        [SerializeField] private RectTransform minimapContent;

        [Header("Waypoint Navigation")]
        [SerializeField] private Text waypointDistanceText;
        [SerializeField] private Text compassBearingText;
        [SerializeField] private GameObject waypointBeaconPrefab;

        private GameObject activeBeaconInstance;
        private string currentWaypointZoneId;

        private void Update()
        {
            if (playerTransform == null) return;

            UpdateMinimapMarkers();
            UpdateWaypointGuidance();
        }

        private void UpdateMinimapMarkers()
        {
            if (playerMarkerRect != null)
            {
                // Map player world pos [-120, 120] to minimap rect
                float normalizedX = Mathf.InverseLerp(-120f, 120f, playerTransform.position.x);
                float normalizedZ = Mathf.InverseLerp(-120f, 120f, playerTransform.position.z);

                // Rotate marker to match player heading
                playerMarkerRect.localEulerAngles = new Vector3(0f, 0f, -playerTransform.eulerAngles.y);
            }
        }

        public void SetNavigationWaypoint(string zoneId)
        {
            currentWaypointZoneId = zoneId;
            var zone = CampLocationRegistry.Instance?.GetZoneById(zoneId);

            if (zone != null)
            {
                if (activeBeaconInstance == null && waypointBeaconPrefab != null)
                {
                    activeBeaconInstance = Instantiate(waypointBeaconPrefab);
                }

                if (activeBeaconInstance != null)
                {
                    activeBeaconInstance.transform.position = zone.worldCoordinates;
                    activeBeaconInstance.SetActive(true);
                }
            }
            else
            {
                if (activeBeaconInstance != null)
                {
                    activeBeaconInstance.SetActive(false);
                }
            }
        }

        private void UpdateWaypointGuidance()
        {
            if (string.IsNullOrEmpty(currentWaypointZoneId))
            {
                if (waypointDistanceText != null) waypointDistanceText.text = "";
                return;
            }

            var zone = CampLocationRegistry.Instance?.GetZoneById(currentWaypointZoneId);
            if (zone == null) return;

            float dist = Vector3.Distance(playerTransform.position, zone.worldCoordinates);

            if (waypointDistanceText != null)
            {
                waypointDistanceText.text = $"{zone.displayName}: {Mathf.RoundToInt(dist)}m";
            }

            // Calculate compass bearing
            Vector3 dir = (zone.worldCoordinates - playerTransform.position).normalized;
            float angle = Mathf.Atan2(dir.x, dir.z) * Mathf.Rad2Deg;
            if (angle < 0f) angle += 360f;

            string[] bearings = { "N", "NE", "E", "SE", "S", "SW", "W", "NW" };
            int index = Mathf.RoundToInt(angle / 45f) % 8;

            if (compassBearingText != null)
            {
                compassBearingText.text = $"{bearings[index]} ({Mathf.RoundToInt(angle)}°)";
            }
        }
    }
}
