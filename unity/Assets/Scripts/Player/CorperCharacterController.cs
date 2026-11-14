using System;
using UnityEngine;
using CorperWee.Core;
using CorperWee.Input;

namespace CorperWee.Player
{
    /// <summary>
    /// Kinematic character controller and animation driver for NYSC Corper avatar.
    /// Handles movement, sprint stamina, hydration penalties, drill salutes, and ground physics.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public class CorperCharacterController : MonoBehaviour
    {
        [Header("Movement Attributes")]
        [SerializeField] private float marchSpeed = 3.6f;
        [SerializeField] private float sprintSpeed = 6.8f;
        [SerializeField] private float dehydratedSpeedMultiplier = 0.65f;
        [SerializeField] private float rotationSpeed = 14f;
        [SerializeField] private float jumpHeight = 1.4f;
        [SerializeField] private float gravity = -19.62f;

        [Header("Ground Check")]
        [SerializeField] private Transform groundCheck;
        [SerializeField] private float groundDistance = 0.25f;
        [SerializeField] private LayerMask groundMask;

        [Header("Visual & Animation")]
        [SerializeField] private Animator animator;
        [SerializeField] private Transform modelRoot;

        private CharacterController characterController;
        private UnityEngine.Camera mainCamera;
        private Vector3 verticalVelocity = Vector3.zero;
        private bool isGrounded;
        private bool isSaluting;
        private float saluteDuration = 1.5f;
        private float saluteTimer = 0f;

        // Animator parameter hashes for performance
        private static readonly int SpeedHash = Animator.StringToHash("Speed");
        private static readonly int IsGroundedHash = Animator.StringToHash("IsGrounded");
        private static readonly int SaluteTriggerHash = Animator.StringToHash("Salute");
        private static readonly int AttentionBoolHash = Animator.StringToHash("IsAtAttention");

        public bool IsMarching { get; private set; }
        public bool IsSprinting { get; private set; }

        private void Awake()
        {
            characterController = GetComponent<CharacterController>();
            mainCamera = UnityEngine.Camera.main;
        }

        private void Update()
        {
            CheckGrounded();
            HandleSaluteState();

            if (isSaluting)
            {
                // Stand firmly at attention while saluting
                ApplyGravityOnly();
                return;
            }

            HandleMovement();
        }

        private void CheckGrounded()
        {
            if (groundCheck != null)
            {
                isGrounded = Physics.CheckSphere(groundCheck.position, groundDistance, groundMask);
            }
            else
            {
                isGrounded = characterController.isGrounded;
            }

            if (animator != null)
            {
                animator.SetBool(IsGroundedHash, isGrounded);
            }

            if (isGrounded && verticalVelocity.y < 0f)
            {
                verticalVelocity.y = -2f; // Keep grounded tightly
            }
        }

        private void HandleMovement()
        {
            MobileTouchInput input = MobileTouchInput.Instance;
            if (input == null) return;

            // Trigger salute if requested
            if (input.SaluteRequested && isGrounded && !isSaluting)
            {
                TriggerSalute();
                return;
            }

            Vector2 moveDir = input.MoveVector;
            float inputMagnitude = moveDir.magnitude;

            if (inputMagnitude > 0.05f)
            {
                // Determine camera-relative movement direction
                Vector3 camForward = mainCamera != null ? mainCamera.transform.forward : Vector3.forward;
                Vector3 camRight = mainCamera != null ? mainCamera.transform.right : Vector3.right;
                camForward.y = 0f;
                camRight.y = 0f;
                camForward.Normalize();
                camRight.Normalize();

                Vector3 targetMove = (camForward * moveDir.y + camRight * moveDir.x).normalized;

                // Rotate smoothly towards moving direction
                Quaternion targetRotation = Quaternion.LookRotation(targetMove);
                transform.rotation = Quaternion.Slerp(transform.rotation, targetRotation, Time.deltaTime * rotationSpeed);

                // Speed calculation with hydration penalty
                float currentBaseSpeed = input.IsSprinting ? sprintSpeed : marchSpeed;
                if (GameManager.Instance != null && GameManager.Instance.WaterLevel < 20f)
                {
                    currentBaseSpeed *= dehydratedSpeedMultiplier;
                }

                Vector3 displacement = targetMove * (currentBaseSpeed * inputMagnitude * Time.deltaTime);
                characterController.Move(displacement);

                IsMarching = !input.IsSprinting;
                IsSprinting = input.IsSprinting;

                if (animator != null)
                {
                    float animSpeed = input.IsSprinting ? 2.0f : 1.0f;
                    animator.SetFloat(SpeedHash, animSpeed * inputMagnitude);
                }
            }
            else
            {
                IsMarching = false;
                IsSprinting = false;

                if (animator != null)
                {
                    animator.SetFloat(SpeedHash, 0f);
                }
            }

            // Jump
            if (input.JumpRequested && isGrounded)
            {
                verticalVelocity.y = Mathf.Sqrt(jumpHeight * -2f * gravity);
            }

            // Apply gravity
            verticalVelocity.y += gravity * Time.deltaTime;
            characterController.Move(verticalVelocity * Time.deltaTime);
        }

        private void ApplyGravityOnly()
        {
            verticalVelocity.y += gravity * Time.deltaTime;
            characterController.Move(verticalVelocity * Time.deltaTime);

            if (animator != null)
            {
                animator.SetFloat(SpeedHash, 0f);
            }
        }

        public void TriggerSalute()
        {
            isSaluting = true;
            saluteTimer = saluteDuration;

            if (animator != null)
            {
                animator.SetTrigger(SaluteTriggerHash);
                animator.SetBool(AttentionBoolHash, true);
            }

            GameManager.Instance?.PostNotification("CORPER WEE! Attention salute presented.");
        }

        private void HandleSaluteState()
        {
            if (!isSaluting) return;

            saluteTimer -= Time.deltaTime;
            if (saluteTimer <= 0f)
            {
                isSaluting = false;
                if (animator != null)
                {
                    animator.SetBool(AttentionBoolHash, false);
                }
            }
        }
    }
}
