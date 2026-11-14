using System;
using UnityEngine;
using UnityEngine.EventSystems;

namespace CorperWee.Input
{
    /// <summary>
    /// Custom touch action button (Sprint, Jump, Salute, Interact) with press/release events
    /// </summary>
    public class TouchActionButton : MonoBehaviour, IPointerDownHandler, IPointerUpHandler
    {
        public bool IsPressed { get; private set; }
        public bool WasPressedThisFrame { get; private set; }

        public event Action OnPressed;
        public event Action OnReleased;

        public void OnPointerDown(PointerEventData eventData)
        {
            IsPressed = true;
            WasPressedThisFrame = true;
            OnPressed?.Invoke();
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            IsPressed = false;
            OnReleased?.Invoke();
        }

        private void LateUpdate()
        {
            WasPressedThisFrame = false;
        }
    }
}
