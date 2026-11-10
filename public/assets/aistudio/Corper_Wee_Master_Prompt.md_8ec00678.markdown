# CORPER WEE
## Master Game Development Prompt

**Project:** Corper Wee\
**Genre:** 3D Life Simulation / Adventure / Social RPG\
**Setting:** NYSC Orientation Camp, Iseyin, Oyo State, Nigeria\
**Primary platform:** Android and iOS\
**Additional platform:** Separate web-based Admin Portal\
**Core experience:** Explore, survive, compete, socialize, and enjoy
camp life.

------------------------------------------------------------------------

# PART 1: MASTER PROMPT

## 1. Your Role

Act as a multidisciplinary game development team consisting of:

-   Senior 3D game developer and Unity/gameplay engineer.
-   3D environment and character designer.
-   Backend software architect and database engineer.
-   Mobile UI/UX designer.
-   Multiplayer and real-time systems engineer.
-   Security engineer.
-   Game economy designer.
-   QA and game-testing engineer.

Design and develop **Corper Wee**, a polished, interactive, mobile-first
3D simulation game inspired by the Nigerian NYSC orientation camp
experience.

Do not approach this as a simple mobile game containing disconnected
mini-games. Build a connected virtual world where activities,
progression, social interactions, locations, purchases, and player
identities influence one another.

Design the architecture to support future expansion to other NYSC
orientation camps across Nigeria.

## 2. Game Concept and Objectives

Corper Wee recreates the experience of being a corps member at Iseyin
orientation camp.

Players should be able to:

1.  Register and create their own virtual corper.
2.  Explore a 3D representation of Iseyin camp.
3.  Belong to a platoon.
4.  Participate in parade and camp activities.
5.  Earn and lose points depending on performance.
6.  Navigate obstacles and avoid camp officials.
7.  Manage personal resources, especially water.
8.  Exchange points for virtual money.
9.  Purchase food, drinks, clothing, and other items at Mami Market.
10. Interact with other corps members.
11. Develop friendships and romantic relationships through
    charisma-based interactions.
12. Participate in scheduled camp events and competitions.
13. Build a reputation and progress through the game.

The experience should combine open-world exploration, simulation,
mini-games, role-playing, social interactions, character customization,
resource management, and competitive scoring.

## 3. Recommended Technology Architecture

Design the system around three independent applications communicating
through a shared backend.

### A. Mobile Game

**Recommended engine: Unity 3D with C#.**

Responsibilities:

-   3D rendering.
-   Character movement and animations.
-   Camera controls.
-   Character customization.
-   Interactive camp environment.
-   Gameplay mechanics and mini-games.
-   Game HUD.
-   Audio and visual effects.
-   Multiplayer interactions.

Target Android first while maintaining an architecture that supports
iOS.

### B. Backend API

**Recommended technologies:**

-   Node.js.
-   Express.js.
-   PostgreSQL.
-   Redis where justified for caching, sessions, leaderboards, and
    real-time coordination.
-   WebSockets or an appropriate real-time communication solution.
-   Google OAuth/OIDC for authentication.

The backend must be the authoritative source for player accounts, roles,
permissions, progression, points, virtual money, purchases, inventory,
platoon assignments, event participation, game configuration, and
administrative activities.

Never trust the mobile client to independently determine authoritative
player balances, rewards, penalties, or permissions.

### C. Separate Admin Portal

**Recommended technologies:**

-   React.
-   TypeScript.
-   A suitable component library.
-   REST API integration with the backend.

The admin portal must be a separate web application, with separate
routing and its own protected administrative interface.

Suggested domain structure:

-   `play.corperwee.com` --- mobile game services or landing page.
-   `admin.corperwee.com` --- administrative portal.
-   `api.corperwee.com` --- backend API.

These are proposed domain structures, not assumptions that the domains
are already registered.

## 4. Authentication and Authorization

Authentication is mandatory.

### Player Registration

Players register using:

-   Gmail/Google authentication.
-   Google-verified email address.
-   NYSC state code.

Registration flow:

1.  Player opens Corper Wee.
2.  Player selects Continue with Google.
3.  Google authentication is completed.
4.  Backend verifies the Google identity token, including the verified
    email.
5.  Player enters their NYSC state code.
6.  Backend checks the state code for uniqueness and validity according
    to the configured verification policy.
7.  Account is created.
8.  Player proceeds to character creation.

Do not assume Google authentication verifies NYSC membership. Design a
separate state-code validation mechanism, with an administrative
verification option if an official verification API is unavailable.

### Character Creation

After registration, players must:

1.  Select gender.
2.  Select a character skin.
3.  Customize their appearance.
4.  Select available hairstyles and outfits.
5.  Confirm their character.
6.  Get assigned to a platoon.

Platoon assignment should be configurable by administrators.

Character appearance and gender selection should be stored in the
database.

### Authorization

Implement role-based access control (RBAC).

  Role         Permissions
  ------------ -------------------------------------------------
  Player       Access gameplay and personal account
  Admin        Manage authorized game operations
  Superadmin   Full administrative access and admin management

Never use frontend-only authorization. Every protected backend endpoint
must verify the authenticated user's role and permissions.

The superadmin must have special protection against suspension,
deletion, and unauthorized privilege changes.

## 5. Superadmin Initialization and Admin Invitations

Create a database seed script that initializes the first superadmin.

Initial superadmin details:

-   **Email:** `farlodunolusege@gmail.com`
-   **State code:** `OY/26C/5439`
-   **Role:** `SUPERADMIN`

The seed script must:

1.  Check whether the superadmin already exists.
2.  Create the account if it does not exist.
3.  Assign the SUPERADMIN role.
4.  Be idempotent.
5.  Avoid duplicating accounts.
6.  Never expose credentials or secrets in source code.

Link the superadmin account to the verified Google identity and matching
state code. Use environment-based configuration for bootstrap values
where appropriate.

### Admin Invitation System

Only the superadmin can invite other administrators.

Process:

1.  Superadmin enters an administrator's email address.
2.  System generates a secure, single-use invitation token.
3.  Invitation is sent through email.
4.  Invitee authenticates using the invited Google account.
5.  Invitation is validated.
6.  Administrator account is activated.
7.  Admin receives the assigned permissions.

Invitation tokens must expire and be unusable after acceptance. Admins
cannot invite other admins unless explicitly granted that permission by
the superadmin.

## 6. The Virtual Camp Environment

Recreate Iseyin orientation camp as an explorable 3D environment.

Potential locations include:

-   Parade ground.
-   Mami Market.
-   Canteen.
-   Hostel blocks.
-   Camp entrance and security post.
-   Lecture hall.
-   Administrative offices.
-   Sports and recreational areas.
-   Water-selling points.
-   Other relevant camp facilities.

Use a 3D map that allows players to explore and navigate the camp.

### Interactive Map

Players should be able to:

-   View the entire camp layout.
-   Identify their current position.
-   Locate important facilities.
-   Select a destination.
-   See navigation markers.
-   Track their movement.
-   Discover new locations.

Include both a 3D world-navigation experience and a simplified
minimap/HUD.

Locations must be configurable through the admin portal. Use accurate
references where available. Do not invent the actual geographical layout
of Iseyin camp and present it as verified. Use an editable fictionalized
layout if accurate references cannot be obtained.

## 7. Core Gameplay Activities

### Activity 1: Parade Ground

Players participate in virtual military-style parades under instructions
from camp officials.

Commands may include:

-   Attention!
-   Stand at ease!
-   Quick march!
-   Halt!
-   Left turn!
-   Right turn!
-   About turn!
-   Salute!

Gameplay:

1.  A command appears or is announced through audio.
2.  Player responds using on-screen controls or an appropriate movement
    gesture.
3.  Game checks whether the response is correct.
4.  Correct response earns points.
5.  Incorrect response deducts points.
6.  Late responses may receive partial deductions.
7.  Repeated mistakes can affect the player's parade performance score.

Include beginner, intermediate, and advanced modes; timed challenges;
individual scores; platoon competitions; and leaderboards.

The command system should be configurable by administrators. Distinguish
between an incorrect action, a missed command, and a delayed response.

### Activity 2: The Canteen Rush

This is an obstacle-course mini-game. The player must reach the canteen
within a limited period.

Possible obstacles:

-   Barricades.
-   Muddy areas.
-   Potholes.
-   Other moving corps members.
-   Narrow pathways.
-   Physical obstacles.
-   Unexpected camp activities.

Players jump, slide, dodge, and navigate around obstacles.

Include a countdown timer, stamina or health, collision detection, time
bonuses, collision penalties, and rewards for reaching the canteen on
time. Different obstacle configurations should provide replayability.

### Activity 3: Avoid the Soldiers

Create a stealth and evasion mini-game around the parade ground.

Soldiers or camp officials patrol designated areas. Players navigate
around patrol zones without being caught.

Features:

-   AI-controlled patrol characters.
-   Defined patrol paths.
-   Detection radius.
-   Line-of-sight detection.
-   Safe zones.
-   Hiding points where appropriate.
-   Time-based objectives.

Getting caught results in a gameplay penalty, such as losing points or
restarting the challenge. Use humorous, exaggerated reactions rather
than graphic violence.

### Activity 4: Water Management

Every player has a water meter. Water gradually decreases as the
character moves around, participates in activities, and spends time in
camp.

When the meter becomes low:

1.  Display a warning.
2.  Notify the player that they need water.
3.  Allow the player to locate a water vendor.
4.  Purchase water using virtual money.
5.  Refill the water meter.

Different water products can have different prices and refill
quantities. Connect the water system to the game's economy.

If the meter reaches zero, the character can experience reduced stamina
or movement performance. Avoid making water depletion excessively
punishing and include accessible ways to refill it.

### Activity 5: Mami Market

Mami Market is the game's main commercial hub.

Potential products:

-   Bottled water.
-   Sachet water.
-   Soft drinks.
-   Snacks.
-   Food.
-   Indomie.
-   Bread.
-   Toiletries.
-   Clothing.
-   Accessories.
-   Personal-care products.
-   Special character skins.

Each product should have a name, description, image or 3D
representation, price, category, availability, and stock quantity where
applicable.

Players should have a virtual wallet, inventory, purchase history, and
the ability to buy available products and equip eligible clothing and
accessories.

Administrators should be able to create products, change prices, manage
stock, and deactivate products.

### Activity 6: Points and Money Economy

The game has two separate currencies:

-   **Corper Points (CP):** Earned from participating in activities and
    performing well.
-   **Virtual Naira (₦):** Used for purchasing items in the game.

Players can exchange points for virtual money.

Example:

-   Completing parade challenges earns CP.
-   Winning platoon competitions earns bonus CP.
-   Completing obstacle challenges earns CP.
-   Missing commands deducts CP.
-   Points can be exchanged for virtual Naira.
-   Virtual Naira can be spent at Mami Market.

The conversion rate must be configurable by administrators.

Implement transaction history, purchase records, exchange records,
reward records, penalty records, and anti-exploit checks.

All currency transactions must be handled by the backend. Never allow
clients to directly modify their currency balances.

### Activity 7: Charisma and Social Interactions

Social interactions are an important part of Corper Wee.

Players can approach and interact with other corps members. Each player
has a charisma score influenced by gameplay achievements, reputation,
selected dialogue options, and other configurable factors.

Possible interactions:

-   Greetings.
-   Introducing yourself.
-   Asking questions.
-   Telling jokes.
-   Giving compliments.
-   Asking to become friends.
-   Requesting a phone number.
-   Inviting someone to an activity.

Successful interactions can result in friendship, adding someone to a
friends list, unlocking additional dialogue, exchanging contact details
through an in-game consent-based interaction, and building a
relationship score.

Failed interactions can result in humorous consequences: a male corper
may deliver a cartoon-style punch reaction; a female corper may deliver
a cartoon-style slap reaction; the character may be embarrassed; the
other player may reject the interaction; or the player may lose a small
amount of reputation.

Keep interactions stylized, non-graphic, and appropriate for the
intended age rating. A failed charisma check must never force another
real player into unwanted interaction.

Implement friends lists, player profiles, character status, relationship
progression, interaction cooldowns, blocking, reporting, and
consent-based contact exchange.

Do not reveal real Gmail addresses, state codes, or personal contact
information to other players.

### Activity 8: Platoon System

Players must belong to a platoon. Platoons provide a competitive and
social structure.

Features:

-   Automatic or administrative platoon assignment.
-   Platoon identification.
-   Platoon colours.
-   Platoon leaderboard.
-   Platoon competitions.
-   Group activities.
-   Platoon performance scores.

Administrators should be able to create platoons, edit platoon details,
assign players, move players between platoons, and configure
competitions.

Support the actual number of platoons configured for a game season.

## 8. Multiplayer and Social Architecture

Design the game to support multiple players sharing the virtual camp.

Players should be able to see other players moving around camp, interact
with nearby players, participate in shared activities, compete in
platoon events, view profiles, and form friendships.

Not every activity must be multiplayer. Some can be individual
challenges, while others can be competitive or cooperative.

Design networking to handle player-position synchronization, player
presence, real-time interactions, event participation, connection
interruptions, and reconnection.

Use authoritative server-side validation for important competitive and
economic actions.

## 9. Events and Scheduling

Introduce a camp event system.

Examples include morning parade, platoon competitions, inter-platoon
football, camp orientation, social activities, special challenges, and
weekend activities.

Events should have a title, description, location, start time, end time,
participation requirements, reward configuration, and status.

Administrators should be able to create, update, cancel, and delete
events. Players should receive event notifications and view upcoming
activities.

## 10. Admin Portal Requirements

The admin portal must be completely separate from the mobile game
interface and provide a professional dashboard.

### Dashboard

Display:

-   Total registered players.
-   Active players.
-   Suspended players.
-   Total admins.
-   Total platoons.
-   Current events.
-   Recent activities.
-   Popular locations.
-   Economy statistics.

### Player Management

Administrators should be able to view registered players, search by
email, username, or state code (with sensitive-information access
restricted by role), view player profiles, activity history, gameplay
statistics, points and virtual money balances, and platoon assignments.

They should be able to suspend accounts, reactivate accounts, and delete
accounts subject to retention and audit policies.

Suspension should immediately prevent the player from accessing
protected game services. All administrative actions must be logged.

### Game Activity Monitoring

Admins should be able to view parade participation and performance,
obstacle-course performance, water purchases, Mami Market transactions,
points earned and deducted, social activity reports, event
participation, and login history.

Provide filtering by player, activity, date, platoon, and event.

### Economy Management

Admins should be able to change CP-to-Naira conversion rates, increase
or decrease product prices, add products, edit product details, remove
or deactivate products, manage stock, configure rewards and penalties,
and view transaction history.

Changes to economic settings must be recorded in an audit log.

### Event Management

Admins should be able to create, edit, delete or cancel events, set
event locations, configure rewards and participation requirements,
schedule events, and view participation.

### Location Management

Admins should be able to add, edit, delete or deactivate locations, set
location coordinates, assign categories, configure accessible
activities, set map markers, and define activity zones.

Deleting a location must not silently break existing event or
transaction records. Use appropriate relational integrity and
soft-deletion policies.

### Platoon Management

Admins should be able to create and edit platoons, assign players,
change platoon colours, view platoon statistics, and organize
competitions.

### Admin Management

Superadmin only:

-   Invite administrators.
-   View administrators.
-   Assign permissions.
-   Revoke administrator access.
-   Suspend administrators.
-   Review administrative activity logs.

No administrator should be able to promote themselves to superadmin.

## 11. Database Architecture

Design a normalized relational database. Consider these entities:

-   users
-   player_profiles
-   player_characters
-   character_skins
-   platoons
-   platoon_members
-   roles
-   permissions
-   role_permissions
-   user_roles
-   admin_invitations
-   locations
-   location_categories
-   events
-   event_participants
-   activities
-   activity_sessions
-   activity_results
-   parade_commands
-   patrol_zones
-   products
-   product_categories
-   inventory
-   inventory_items
-   wallets
-   wallet_transactions
-   point_transactions
-   currency_exchange_rates
-   water_meters
-   friendships
-   social_interactions
-   player_reports
-   notifications
-   audit_logs
-   game_settings

These are proposed entities, not a requirement to create every table
exactly as named. Evaluate relationships and normalize the final schema.

Use UUIDs where appropriate. Implement primary keys, foreign keys,
unique constraints, indexes, appropriate check constraints,
transactional operations, soft deletion where necessary, database
migrations, and seed scripts.

Do not store redundant balances without a consistent transaction and
reconciliation strategy.

## 12. Security Requirements

Security must be considered from the beginning.

Implement:

-   Google OAuth/OIDC identity verification.
-   Secure session or token management.
-   Refresh-token rotation where applicable.
-   RBAC and permission checks.
-   Input validation.
-   Rate limiting.
-   SQL injection prevention.
-   Secure password-free Google authentication.
-   Invitation-token expiration.
-   Audit logging.
-   Account suspension enforcement.
-   Protection against duplicate transactions.
-   Server-side game reward validation.
-   Secure environment variables.
-   Administrative action authorization.

Never hardcode API secrets, expose private user information, trust
client-side currency balances, allow players to assign themselves roles,
allow administrators to bypass permissions, or allow the mobile
application to access privileged admin endpoints without authorization.

## 13. UI/UX and Visual Direction

The game should look modern, colourful, and immersive.

Visual references include The Sims for character interaction and life
simulation, open-world games for environmental exploration (without
copying their visual identity or mature content), mobile adventure games
for obstacle-course mechanics, and cartoon-style social reactions.

Use stylized 3D characters, Nigerian corps-member outfits, NYSC-inspired
uniforms, recognizable camp architecture, Nigerian food and market
stalls, natural outdoor lighting, lively environmental animations, and
appropriate sound effects.

### Mobile Controls

Include:

-   Virtual joystick.
-   Camera movement controls.
-   Jump button.
-   Interaction button.
-   Action buttons.
-   Map button.
-   Inventory button.
-   Character status HUD.

Optimize for mid-range Android devices. Include graphics settings,
performance modes, adjustable camera sensitivity, and accessible
controls.

## 14. Game Progression

Create a progression system with experience points, character levels,
reputation, charisma, parade ranking, platoon ranking, achievement
badges, and unlockable cosmetics.

Progression should reward consistent participation, skill, and social
engagement. Avoid making progression entirely dependent on purchasing
virtual items.

## 15. Development Standards

Follow professional software engineering practices:

-   Use modular architecture.
-   Separate business logic from controllers.
-   Use clean API contracts.
-   Maintain clear folder structures.
-   Write reusable services.
-   Implement centralized error handling.
-   Use database migrations.
-   Include meaningful tests.
-   Document APIs.
-   Use Git and feature branches.
-   Maintain development, staging, and production environments.
-   Provide deployment documentation.

Do not generate the entire application in one response.

Before implementation, create a detailed Product Requirements Document
(PRD), system architecture, user flows, database design, API
specification, and development roadmap.

Implement incrementally and test each major feature before moving to the
next.

------------------------------------------------------------------------
