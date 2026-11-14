using System;
using System.Collections.Generic;
using UnityEngine;

namespace CorperWee.Camp
{
    /// <summary>
    /// Modular location registry for Iseyin Orientation Camp in Unity.
    /// Defines building zones, trigger radiuses, and activity bindings.
    /// Completely editable so verified reference maps can be incorporated.
    /// </summary>
    public class CampLocationRegistry : MonoBehaviour
    {
        public static CampLocationRegistry Instance { get; private set; }

        [Serializable]
        public class CampZone
        {
            public string id;
            public string displayName;
            public string category; // CHECKPOINT, ACTIVITY, ACCOMMODATION, COMMERCE, FACILITY
            public Vector3 worldCoordinates;
            public float triggerRadius;
            public string description;
            public string actionText;
            public Color badgeColor;
        }

        [Header("Modular Camp Layout (Editable)")]
        public List<CampZone> campZones = new List<CampZone>
        {
            new CampZone
            {
                id = "main_entrance",
                displayName = "Main Camp Gate & Security",
                category = "CHECKPOINT",
                worldCoordinates = new Vector3(0f, 0f, 80f),
                triggerRadius = 12f,
                description = "Military checkpoint, barrier, and NYSC welcome archway.",
                actionText = "Report to Sentry Post",
                badgeColor = Color.green
            },
            new CampZone
            {
                id = "parade_ground",
                displayName = "Parade Ground & Saluting Dais",
                category = "ACTIVITY",
                worldCoordinates = new Vector3(0f, 0f, -35f),
                triggerRadius = 16f,
                description = "VIP saluting dais, 3 national/state flagpoles, and drill ground.",
                actionText = "Enter Parade Drill",
                badgeColor = Color.yellow
            },
            new CampZone
            {
                id = "admin_hq",
                displayName = "Administrative Headquarters",
                category = "FACILITY",
                worldCoordinates = new Vector3(0f, 0f, 15f),
                triggerRadius = 10f,
                description = "State Coordinator & Camp Director offices and admin desks.",
                actionText = "Enter Admin Reception",
                badgeColor = Color.red
            },
            new CampZone
            {
                id = "lecture_pavilion",
                displayName = "Orientation Lecture Pavilion",
                category = "FACILITY",
                worldCoordinates = new Vector3(-42f, 0f, 35f),
                triggerRadius = 14f,
                description = "Multipurpose open-air hall for SAED lectures and ceremonies.",
                actionText = "Attend Lecture",
                badgeColor = Color.magenta
            },
            new CampZone
            {
                id = "male_hostel",
                displayName = "Male Hostels (Platoons 1–5)",
                category = "ACCOMMODATION",
                worldCoordinates = new Vector3(-52f, 0f, -5f),
                triggerRadius = 14f,
                description = "Two-storey male residential dormitory blocks.",
                actionText = "Enter Male Hostel",
                badgeColor = Color.blue
            },
            new CampZone
            {
                id = "female_hostel",
                displayName = "Female Hostels (Platoons 6–10)",
                category = "ACCOMMODATION",
                worldCoordinates = new Vector3(52f, 0f, -5f),
                triggerRadius = 14f,
                description = "Two-storey female residential dormitory blocks.",
                actionText = "Enter Female Hostel",
                badgeColor = new Color(1f, 0.4f, 0.7f)
            },
            new CampZone
            {
                id = "camp_canteen",
                displayName = "Camp Canteen & Mess Hall",
                category = "COMMERCE",
                worldCoordinates = new Vector3(-38f, 0f, -50f),
                triggerRadius = 12f,
                description = "Official camp mess hall serving daily rations.",
                actionText = "Join Canteen Rush",
                badgeColor = new Color(1f, 0.5f, 0f)
            },
            new CampZone
            {
                id = "mami_market",
                displayName = "Mami Market Vendor Plaza",
                category = "COMMERCE",
                worldCoordinates = new Vector3(42f, 0f, -45f),
                triggerRadius = 15f,
                description = "Mama Put smoky jollof, tailors, cold drinks, ATM kiosk.",
                actionText = "Visit Mami Market",
                badgeColor = Color.yellow
            },
            new CampZone
            {
                id = "water_borehole",
                displayName = "Borehole Water Point",
                category = "FACILITY",
                worldCoordinates = new Vector3(25f, 0f, 30f),
                triggerRadius = 8f,
                description = "Deep borehole station with 2,000L overhead tanks.",
                actionText = "Refill Water Bucket",
                badgeColor = Color.cyan
            }
        };

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }

        public CampZone GetZoneById(string id)
        {
            return campZones.Find(z => z.id == id);
        }

        public CampZone GetNearbyZone(Vector3 playerPos, out float distance)
        {
            CampZone nearest = null;
            float minDist = float.MaxValue;

            foreach (var zone in campZones)
            {
                float d = Vector3.Distance(new Vector3(playerPos.x, 0f, playerPos.z), zone.worldCoordinates);
                if (d <= zone.triggerRadius && d < minDist)
                {
                    minDist = d;
                    nearest = zone;
                }
            }

            distance = minDist;
            return nearest;
        }
    }
}
