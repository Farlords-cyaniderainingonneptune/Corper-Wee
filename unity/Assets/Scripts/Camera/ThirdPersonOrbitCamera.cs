using UnityEngine;

namespace CorperWee.CameraSystem
{
    /// <summary>
    /// Smooth third-person orbit camera optimized for mobile touch screens.
    /// Supports right-hand touch swipe rotation, collision pull-in, and target dampening.
    /// </summary>
    public class ThirdPersonOrbitCamera : MonoBehaviour
    {
        [Header("Target Follow")]
        [SerializeField] private Transform target;
        [SerializeField] private Vector3 targetOffset = new Vector3(0f, 1.6f, 0f);

        [Header("Distance & Collision")]
        [SerializeField] private float defaultDistance = 4.2f;
        [SerializeField] private float minDistance = 1.2f;
        [SerializeField] private float maxDistance = 6.0f;
        [SerializeField] private float collisionRadius = 0.25f;
        [SerializeField] private LayerMask collisionLayers;

        [Header("Orbit Sensitivity")]
        [SerializeField] private float touchSensitivityX = 0.18f;
        [SerializeField] private float touchSensitivityY = 0.14f;
        [SerializeField] private float pitchMin = -20f;
        [SerializeField] private float pitchMax = 65f;
        [SerializeField] private float smoothSpeed = 12f;

        private float currentYaw = 0f;
        private float currentPitch = 15f;
        private float currentDistance;
        private int touchFingerId = -1;

        private void Start()
        {
            currentDistance = defaultDistance;
            if (target != null)
            {
                currentYaw = target.eulerAngles.y;
            }
        }

        public void SetTarget(Transform newTarget)
        {
            target = newTarget;
            if (target != null)
            {
                currentYaw = target.eulerAngles.y;
            }
        }

        private void LateUpdate()
        {
            if (target == null) return;

            HandleTouchOrbit();

            // Compute ideal orientation
            Quaternion rotation = Quaternion.Euler(currentPitch, currentYaw, 0f);
            Vector3 focusPoint = target.position + targetOffset;

            // Handle occlusion / collision raycast
            float targetDist = defaultDistance;
            Vector3 desiredDir = rotation * -Vector3.forward;

            if (Physics.SphereCast(focusPoint, collisionRadius, desiredDir, out RaycastHit hit, defaultDistance, collisionLayers))
            {
                targetDist = Mathf.Clamp(hit.distance - 0.1f, minDistance, defaultDistance);
            }

            currentDistance = Mathf.Lerp(currentDistance, targetDist, Time.deltaTime * smoothSpeed);

            // Apply position and rotation
            Vector3 targetPosition = focusPoint + desiredDir * currentDistance;
            transform.position = targetPosition;
            transform.LookAt(focusPoint);
        }

        private void HandleTouchOrbit()
        {
            // Mobile multi-touch handling: look for touch starting in right half of screen
            for (int i = 0; i < UnityEngine.Input.touchCount; i++)
            {
                Touch touch = UnityEngine.Input.GetTouch(i);

                if (touch.phase == TouchPhase.Began)
                {
                    // If touch is on right 60% of screen, claim it for camera rotation
                    if (touch.position.x > Screen.width * 0.4f && touchFingerId == -1)
                    {
                        touchFingerId = touch.fingerId;
                    }
                }
                else if (touch.fingerId == touchFingerId)
                {
                    if (touch.phase == TouchPhase.Moved)
                    {
                        currentYaw += touch.deltaPosition.x * touchSensitivityX;
                        currentPitch -= touch.deltaPosition.y * touchSensitivityY;
                        currentPitch = Mathf.Clamp(currentPitch, pitchMin, pitchMax);
                    }
                    else if (touch.phase == TouchPhase.Ended || touch.phase == TouchPhase.Canceled)
                    {
                        touchFingerId = -1;
                    }
                }
            }

            // Mouse orbit fallback for Unity Editor
            if (UnityEngine.Input.GetMouseButton(1))
            {
                currentYaw += UnityEngine.Input.GetAxis("Mouse X") * 2.5f;
                currentPitch -= UnityEngine.Input.GetAxis("Mouse Y") * 2.0f;
                currentPitch = Mathf.Clamp(currentPitch, pitchMin, pitchMax);
            }
        }
    }
}
