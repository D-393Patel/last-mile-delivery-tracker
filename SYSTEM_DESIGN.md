# System design

## Architecture

Dispatch is a modular monolith built with Next.js, PostgreSQL, and Prisma. The browser uses role-specific dashboards while route handlers expose the same business capabilities as JSON APIs. Authentication uses a signed, HTTP-only session cookie. Authorization is checked at both page and service boundaries for customer, delivery-agent, and admin roles.

The modular-monolith choice keeps the assignment deployable as one service while preserving clean boundaries: pricing, assignment, lifecycle, notifications, and persistence live in separate modules. These modules can later move into workers or services without changing their rules.

## Rate calculation and zone detection

An `Area` maps a normalized postal code and representative coordinates to a `Zone`. Order creation resolves both postal codes; unknown codes fail explicitly rather than silently selecting a default. A unique rate card is selected by origin zone, destination zone, and order type (B2B/B2C), so intra-zone and inter-zone rates are naturally independent.

Volumetric weight is `length x breadth x height / 5000`. Billable weight is the higher of actual and volumetric weight. Each card defines included base weight, base price, and additional per-kilogram price. Excess fractional kilograms round upward. COD rules are separate per order type and support a flat component, declared-value percentage, minimum, and maximum. The server recalculates the quote during order creation - never trusting a browser-supplied total - and stores all weight and charge components as decimal values. This produces an explainable, historically stable charge even after rate cards change.

## Intelligent assignment

The dispatcher first excludes inactive, unavailable, or at-capacity agents. Remaining agents are ranked by same pickup zone, Haversine distance from their latest coordinates, then current active-order count. Same-zone preference keeps routing operationally sensible; distance reduces pickup time; workload is a deterministic tie-breaker. The tracking entry records why an agent was selected. Admins can manually override the choice. Capacity and availability are explicit agent-profile fields rather than inferred from status alone.

Assignment and its tracking/audit entries are written in one database transaction. Production scale would add row locking or a reservation record so simultaneous dispatch requests cannot consume the same final capacity slot.

## Lifecycle and immutable history

Orders follow a guarded state machine from Created through Assigned, Picked Up, In Transit, Out for Delivery, and Delivered. Valid branches cover cancellation and failure. Agents can only update their assigned orders and cannot skip milestones. Admins may override non-terminal states, while Delivered and Cancelled remain terminal.

The mutable `Order.status` supports fast filtering; every change also appends a `TrackingEvent` with status, actor, timestamp, message, and optional coordinates. Events have no update/delete API and restrictive foreign keys, making them an immutable operational ledger. A separate `AuditLog` records before/after administrative changes. Optimistic order versions prevent stale concurrent updates.

## Failed deliveries and notifications

A failed update requires a reason and closes the current `DeliveryAttempt`. The customer can select a future date; rescheduling creates a new numbered attempt, clears the previous agent, appends a timeline event, and runs assignment again. This preserves every attempt instead of overwriting the failure.

Each status change writes email and, when a phone exists, SMS messages to a notification outbox. Provider delivery is intentionally decoupled from the order transaction: a worker can retry queued messages through Resend and Twilio without delaying or rolling back an operational update. Provider identifiers, state, timestamps, and errors support troubleshooting and idempotent delivery.

## Reliability and security

Inputs are validated with Zod, passwords use bcrypt, cookies are HTTP-only/SameSite, and all sensitive configuration stays in environment variables. Prisma parameterizes database access. Public tracking exposes only journey-safe fields. Focused tests cover pricing boundaries, distance calculations, and lifecycle guards. PostgreSQL indexes support customer history, agent queues, status/zone filtering, and timeline reads.
