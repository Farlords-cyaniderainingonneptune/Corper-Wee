using UnityEngine;

namespace CorperWee.Input
{
    /// <summary>
    /// Aggregates floating joystick movement and action buttons into a unified input provider
    /// with fallback to keyboard WASD / Space / Shift for Unity Editor testing.
    /// </summary>
    public class MobileTouchInput : MonoBehaviour
    {
        public static MobileTouchInput Instance { get; private set; }

        [Header("Touch References")]
        [SerializeField] private FloatingJoystick movementJoystick;
        [SerializeField] private TouchActionButton sprintButton;
        [SerializeField] private TouchActionButton jumpButton;
        [SerializeField] private TouchActionButton interactButton;
        [SerializeField] private TouchActionButton saluteButton;

        public Vector2 MoveVector { get; private set; }
        public bool IsSprinting { get; private set; }
        public bool JumpRequested { get; private set; }
        public bool InteractRequested { get; private set; }
        public bool SaluteRequested { get; private set; }

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
        }

        private void Update()
        {
            // 1. Mobile Touch Input
            Vector2 touchDir = movementJoystick != null ? movementJoystick.Direction : Vector2.zero;
            bool touchSprint = sprintButton != null && sprintButton.IsPressed;
            bool touchJump = jumpButton != null && jumpButton.WasPressedThisFrame;
            bool touchInteract = interactButton != null && interactButton.WasPressedThisFrame;
            bool touchSalute = saluteButton != null && saluteButton.WasPressedThisFrame;

            // 2. Keyboard fallback for Editor / PC testing
            float h = UnityEngine.Input.GetAxisRaw("Horizontal");
            float v = UnityEngine.Input.GetAxisRaw("Vertical");
            Vector2 keyboardDir = new Vector2(h, v).normalized;

            bool keySprint = UnityEngine.Input.GetKey(KeyCode.LeftShift);
            bool keyJump = UnityEngine.Input.GetKeyDown(KeyCode.Space);
            bool keyInteract = UnityEngine.Input.GetKeyDown(KeyCode.E);
            bool keySalute = UnityEngine.Input.GetKeyDown(KeyCode.F);

            // Merge
            MoveVector = touchDir.sqrMagnitude > 0.01f ? touchDir : keyboardDir;
            IsSprinting = touchSprint || keySprint;
            JumpRequested = touchJump || keyJump;
            InteractRequested = touchInteract || keyInteract;
            SaluteRequested = touchSalute || keySalute;
        }
    }
}
