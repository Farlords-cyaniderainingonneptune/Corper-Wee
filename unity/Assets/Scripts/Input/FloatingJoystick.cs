using System;
using UnityEngine;
using UnityEngine.EventSystems;

namespace CorperWee.Input
{
    /// <summary>
    /// Dual-axis floating virtual joystick designed specifically for mobile touch screens (Android/iOS).
    /// Dynamically centers on finger touch down within left screen quadrant.
    /// </summary>
    public class FloatingJoystick : MonoBehaviour, IPointerDownHandler, IDragHandler, IPointerUpHandler
    {
        [Header("Joystick Visual Elements")]
        [SerializeField] private RectTransform backgroundRect;
        [SerializeField] private RectTransform handleRect;

        [Header("Settings")]
        [SerializeField] private float handleRange = 100f;
        [SerializeField] private float deadZone = 0.1f;
        [SerializeField] private bool autoHideWhenIdle = true;

        private Canvas parentCanvas;
        private Vector2 inputVector = Vector2.zero;
        private CanvasGroup canvasGroup;

        public Vector2 Direction => inputVector;
        public float Horizontal => inputVector.x;
        public float Vertical => inputVector.y;

        private void Awake()
        {
            parentCanvas = GetComponentInParent<Canvas>();
            canvasGroup = GetComponent<CanvasGroup>();

            if (canvasGroup == null)
            {
                canvasGroup = gameObject.AddComponent<CanvasGroup>();
            }

            if (autoHideWhenIdle && canvasGroup != null)
            {
                canvasGroup.alpha = 0.5f;
            }
        }

        public void OnPointerDown(PointerEventData eventData)
        {
            if (canvasGroup != null) canvasGroup.alpha = 1.0f;

            // Anchor background to touch position
            RectTransformUtility.ScreenPointToLocalPointInRectangle(
                parentCanvas.transform as RectTransform,
                eventData.position,
                parentCanvas.worldCamera,
                out Vector2 localPoint
            );

            backgroundRect.anchoredPosition = localPoint;
            handleRect.anchoredPosition = Vector2.zero;
            OnDrag(eventData);
        }

        public void OnDrag(PointerEventData eventData)
        {
            RectTransformUtility.ScreenPointToLocalPointInRectangle(
                backgroundRect,
                eventData.position,
                parentCanvas.worldCamera,
                out Vector2 localPoint
            );

            // Clamp handle to circular radius
            Vector2 clamped = Vector2.ClampMagnitude(localPoint, handleRange);
            handleRect.anchoredPosition = clamped;

            Vector2 normalized = clamped / handleRange;
            if (normalized.magnitude < deadZone)
            {
                inputVector = Vector2.zero;
            }
            else
            {
                inputVector = normalized;
            }
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            inputVector = Vector2.zero;
            handleRect.anchoredPosition = Vector2.zero;

            if (autoHideWhenIdle && canvasGroup != null)
            {
                canvasGroup.alpha = 0.5f;
            }
        }
    }
}
