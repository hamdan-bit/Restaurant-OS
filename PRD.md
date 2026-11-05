# FairPrice SaaS Platform
## Product Requirements Document (PRD) — Version 3.1

**Status:** Proposed commercial SaaS baseline — dashboard and role specification refined  
**Date:** 5 November 2026  
**Primary market:** Small and medium-sized restaurants in Uganda  
**Product type:** Multi-tenant, cloud-hosted responsive web application  
**Business model:** Software as a Service (SaaS)  
**Existing application:** FairPrice restaurant ordering and operations system  
**Implementation direction:** Plain OOP PHP, lightweight custom router, relational database

---

## Revision note — Version 3.1

Version 3.1 keeps Sections 1–22 and the Version 3.0 addendum, and refines how every user dashboard and screen is defined. It contains no code. Items marked **[Proposed]** are recommendations that are not yet confirmed product decisions; they are collected in Section 34.

What changed:

1. **Every user surface is now inventoried and defined** using one standard template (Sections 23.1–23.3): Platform Console, Owner Dashboard, Manager Dashboard, public customer screens, applicant status page and the restricted-account page.
2. **Section 15 is superseded.** It described one "platform dashboard" and one "restaurant dashboard", which conflicted with the Owner/Manager split in the addendum. It now points to the detailed sections.
3. **One Platform Console (Section 24).** Super Administrator, Platform Administrator and Support Staff use the same console, filtered by permission. A platform permission catalogue and default role matrix are added. Platform Administrator and Support Staff dashboards, previously bullet lists only, are fully defined. The support-access flow is specified.
4. **Owner Dashboard (Section 25).** Navigation is grouped, "Orders" and "Customers / Order Records" are merged, and a Setup Checklist with go-live readiness conditions and a Data Export screen are added. Owner-only permissions are defined.
5. **Manager Dashboard (Section 26).** Every section now maps to a permission key, missing keys are added, permission presets are proposed, and rules for concurrent managers are added.
6. **Customer public screens (Section 27)** and the **applicant status page (Section 28.5)** are specified screen by screen.
7. **State-aware behavior (Section 29).** Landing rules, tenant-state behavior, subscription-state behavior and plan-based feature gating are defined as matrices.
8. **Shared rules (Section 31).** A metric glossary, notification catalogue, standard UI states, responsive priorities and data-masking rules are added.
9. **Acceptance tests (Section 32)** are extended from 18 to 50 tests.

Reconciliation with earlier text: where Version 3.0 or 3.1 conflicts with Sections 1–22, Version 3.1 applies. In particular, the account states in Section 6.3 (`PENDING_VERIFICATION`, `PENDING_APPROVAL`) and plan selection at registration in Section 6.1 are superseded by Sections 28.1–28.2: application states are separate from tenant states, and the plan or trial is assigned after approval.

---

# 1. Document purpose

This document refines the existing FairPrice Restaurant Ordering, Service Monitoring and Sales Management System into a commercial, multi-tenant SaaS platform.

FairPrice will be developed, hosted, maintained and operated as one central software product. Multiple independent restaurants will subscribe to and use the same platform. Each restaurant will have its own workspace, users, menu, tables, orders, payments, reports, settings and business data.

The platform operator owns and manages the SaaS service. Restaurant owners manage their individual restaurant workspaces.

This document defines the product vision, business model, user roles, tenant architecture, functional requirements, data isolation rules, subscription lifecycle, restaurant workflows, platform administration, security, deployment, testing and rollout requirements.

Requirements in this document are proposed requirements unless explicitly confirmed as already implemented. Existing single-restaurant functionality must be assessed and adapted rather than assumed to be multi-tenant-ready.

# 2. Product vision and summary

FairPrice is a subscription-based restaurant management platform for small and medium-sized restaurants. It provides digital menus, QR-based dine-in ordering, remote ordering, order and service monitoring, payment recording, sales reporting and restaurant administration.

Instead of developing a separate application for every restaurant, FairPrice operates one shared application that serves multiple independent restaurant businesses.

The product has two connected operating levels:

1. **Platform level:** FairPrice manages restaurant registration, tenant accounts, subscription plans, billing status, platform configuration, support and system monitoring.
2. **Restaurant level:** Each restaurant manages its own staff, menu, tables, QR codes, orders, payments, customers, reports and operational settings.

The platform must enforce strict data isolation. A restaurant must never access another restaurant's private records or perform actions on another restaurant's behalf.

## 2.1 Core product proposition

- One centrally maintained application.
- Multiple independently registered restaurant businesses.
- Separate restaurant workspaces and staff accounts.
- Shared application infrastructure with enforced tenant isolation.
- Subscription-based access to platform features.
- Centralized updates, maintenance, security and support.
- Ability to grow from a few pilot restaurants to many tenants without creating a separate codebase for each customer.

## 2.2 Product principles

1. **Tenant isolation first:** Every restaurant-owned record and operation is scoped to the authenticated tenant.
2. **One product, many businesses:** Restaurant-specific customization must not create separate application versions.
3. **Server authority:** Prices, totals, payment state, permissions, subscription entitlements and status transitions are enforced server-side.
4. **Historical integrity:** Orders, order-item snapshots, payment records and audit history are retained accurately.
5. **Least privilege:** Platform staff and restaurant staff receive only the access required for their roles.
6. **Commercial reliability:** Subscription, service availability, backups and support are part of the product, not optional afterthoughts.
7. **Incremental scalability:** Start with a manageable shared architecture and evolve infrastructure when measured demand requires it.

# 3. Business model

FairPrice will operate as a SaaS business. Restaurants pay for access to the hosted software rather than purchasing a separate installation or codebase.

## 3.1 Revenue model

The initial proposed revenue model is subscription-based:

- Monthly subscriptions.
- Annual subscriptions, potentially with a discounted rate.
- Optional time-limited trial.
- Plan upgrades and downgrades.
- Optional paid add-ons in later releases.

Final prices, plan limits and billing-provider selection are open business decisions and must be validated with target restaurants.

## 3.2 Proposed subscription tiers

The following tiers are a starting proposal, not final commercial commitments.

| Capability | Starter | Professional | Business |
|---|---|---|---|
| Digital menu | Included | Included | Included |
| QR dine-in ordering | Included | Included | Included |
| Remote ordering | Configurable | Included | Included |
| Order queue and tracking | Included | Included | Included |
| Sales reports | Basic | Advanced | Advanced |
| Meal popularity reports | Basic | Advanced | Advanced |
| Manager accounts | Plan-limited | Higher limit | Higher limit |
| Export | Basic | CSV | CSV and future formats |
| Multiple branches | Not included | Optional add-on | Included or configurable |
| Support | Standard | Priority | Priority |

The platform must store plan entitlements as data/configuration rather than scattering hard-coded plan-name checks throughout the application.

## 3.3 Subscription lifecycle

A restaurant subscription should support these states:

- `TRIAL`
- `ACTIVE`
- `PAST_DUE`
- `GRACE_PERIOD`
- `SUSPENDED`
- `CANCELLED`
- `EXPIRED`

The exact transitions, payment retry policy and grace-period duration must be configurable by the platform operator.

Subscription expiry or suspension must not delete restaurant data. Historical orders, payments, invoices and audit records must remain retained according to the data-retention policy.

The product owner must define which actions are allowed during grace or suspension. A recommended initial policy is to restrict new operational activity after suspension while allowing the restaurant owner to sign in, view billing information, settle outstanding subscription charges and request data export.

## 3.4 SaaS billing is separate from restaurant sales

FairPrice must distinguish two financial domains:

1. **Restaurant transactions:** Payments made by restaurant customers for meals and services.
2. **FairPrice subscription transactions:** Payments made by restaurant businesses to FairPrice for using the platform.

These must use separate records, reports, permissions and reconciliation processes. Restaurant customer payments must never be treated as FairPrice subscription revenue.

# 4. Tenant model and architecture

## 4.1 Definition of a tenant

A tenant is an independent restaurant business or customer organization using FairPrice.

For the initial release, one tenant represents one restaurant business workspace. The architecture should allow a tenant to have multiple branches in a later release without requiring a separate platform for each branch.

A tenant has:

- A unique internal identifier.
- A unique public slug or restaurant URL identifier.
- Business profile and contact information.
- Owner account and staff accounts.
- Subscription and plan entitlements.
- Menu and categories.
- Tables, seats and QR codes.
- Orders, order items and payments.
- Reports, settings and audit activity.

## 4.2 Recommended initial architecture

Use a shared application and shared relational database with strict tenant scoping.

This is the most practical starting point for the current project because it avoids maintaining a separate deployment and database for every restaurant. It is not a claim that one database can scale without limit; infrastructure must be monitored and upgraded as usage grows.

Logical architecture:

```text
                    FAIRPRICE PLATFORM
                            |
             +--------------+--------------+
             |                             |
      Platform services              Public application
             |                             |
  +----------+-----------+                 |
  |          |           |                 |
Tenant    Subscription  Platform           |
management  billing     administration     |
  |                                      |
  +------------------+-------------------+
                     |
             Tenant resolution
                     |
          Authentication and authorization
                     |
          Tenant-scoped application services
                     |
        +------------+-------------+
        |            |             |
   Restaurant A  Restaurant B  Restaurant C
     workspace     workspace     workspace
        |            |             |
        +------------+-------------+
                     |
          Shared relational database
          with tenant isolation controls
```

## 4.3 Tenant identification

Every authenticated restaurant user must be associated with a tenant.

For public customer journeys, the tenant must be resolved from a trusted restaurant identifier, such as:

- A unique restaurant slug in the URL.
- A tenant-specific QR token.
- A verified restaurant-specific public route.

The application must not trust a client-supplied `restaurant_id` as proof of access. The server resolves the tenant from the authenticated identity or validated public token.

## 4.4 Tenant isolation requirements

- Every tenant-owned query must be constrained by the resolved tenant ID.
- Every tenant-owned create operation must assign the tenant ID server-side.
- Updates and deletes must include tenant ownership conditions.
- A user must not be able to change a request parameter to access another tenant's record.
- Related records must be checked for ownership consistency.
- Background jobs and scheduled tasks must carry an explicit tenant context.
- Exports, reports, search, file access and payment callbacks must respect tenant boundaries.
- Cache keys must include tenant identity where cached data is tenant-specific.
- Uploaded files must be stored under tenant-specific paths or object-storage prefixes, with access checks.
- Audit logs must record tenant context.
- Automated tests must attempt cross-tenant access and confirm rejection.

Where practical, use composite database constraints and foreign keys to prevent records from being linked across tenants accidentally. PostgreSQL Row-Level Security may be evaluated as an additional defence if the chosen database and connection architecture support it reliably. It does not replace application-level authorization.

# 5. Users and roles

There are two authorization levels: platform-level roles and restaurant-level roles.

## 5.1 Platform Administrator

The Platform Administrator operates the FairPrice SaaS service.

Responsibilities:

- View platform-wide restaurant and subscription statistics.
- Review, approve, activate, suspend and deactivate tenant accounts.
- Manage subscription plans and feature entitlements.
- Monitor subscription billing and payment reconciliation.
- Manage platform-level configuration.
- Monitor system health, errors and operational alerts.
- Manage platform support users and permissions.
- Review platform audit activity.
- Coordinate maintenance, backups and incident response.

Platform administrators must not automatically receive unrestricted access to restaurant operational or financial records. Exceptional support access must be explicitly permission-controlled, time-limited where practical, justified and audited.

## 5.2 Platform Support Staff

This optional role may be introduced when the number of customers grows.

Responsibilities may include:

- Reviewing support requests.
- Viewing permitted account and subscription metadata.
- Helping restaurant owners with onboarding.
- Escalating technical issues.

Support staff must not receive platform-owner privileges by default.

## 5.3 Restaurant Owner

The Restaurant Owner controls one restaurant tenant.

Responsibilities:

- Manage the restaurant profile and settings.
- Invite, activate and deactivate restaurant staff.
- Assign restaurant-level roles and permissions.
- Manage categories, meals, prices and availability.
- Manage tables, seats and QR codes.
- Review restaurant orders and payments.
- Review sales and meal-popularity reports.
- View subscription plan, invoices and billing status.
- Request plan changes or cancellation.
- Manage permitted restaurant branding.

A restaurant owner must not administer other restaurant tenants.

## 5.4 Restaurant Manager

Managers perform assigned restaurant operations:

- Monitor and process orders.
- Record order lifecycle events.
- Coordinate with kitchen staff and waiters.
- Monitor service delays.
- Record authorized physical payments.
- View reports only when permitted.
- Perform assigned duties according to role permissions.

Multiple managers may work concurrently.

## 5.5 Customer

Customers do not need a FairPrice account for the initial release. They can:

- Open a restaurant's public menu.
- Scan a table or seat QR code.
- Submit dine-in orders.
- Submit remote orders where enabled.
- Make required online payments for remote orders.
- Track remote orders using the defined verification process.

Customer data must remain associated with the relevant restaurant order and must not be exposed to other tenants.

## 5.6 Kitchen staff and waiters

The existing MVP approach remains: kitchen staff and waiters do not require dedicated application accounts. Managers coordinate with them and record operational milestones. Dedicated staff accounts may be considered later.

# 6. Restaurant onboarding and tenant lifecycle

## 6.1 Registration

A restaurant owner should be able to:

1. Open the FairPrice website.
2. Select registration or start a trial.
3. Enter restaurant/business details.
4. Enter owner contact and login details.
5. Verify the owner email or phone using the selected verification method.
6. Accept the platform terms and privacy notice.
7. Select a plan or trial option.
8. Create the tenant workspace.
9. Complete the initial restaurant setup.

Duplicate tenant registrations and duplicate owner identities must be handled safely.

> **Version 3.1 note:** Under the confirmed approval model (Section 28), plan or trial selection follows approval rather than registration, and the registration states are defined in Section 28.2.

## 6.2 Initial restaurant setup

The onboarding workflow should guide the owner through:

- Restaurant name and public slug.
- Address, phone and contact information.
- Currency and timezone.
- Logo and basic branding.
- Menu categories and meals.
- Table and seat configuration.
- QR code generation.
- Manager invitations.
- Dine-in payment policy.
- Remote ordering configuration.
- Subscription plan and billing details.

The restaurant should be able to save progress and complete setup later.

## 6.3 Tenant activation

A tenant may be in one of these account states:

- `PENDING_VERIFICATION`
- `PENDING_APPROVAL` (only if manual approval is enabled)
- `ACTIVE`
- `SUSPENDED`
- `CLOSED`

Tenant account status and subscription status are separate concepts. For example, a restaurant may have an active account but a past-due subscription.

> **Version 3.1 note:** The tenant states listed above are superseded by Section 28.2. Application review states (`PENDING_APPROVAL` and others) belong to the registration application, and tenant states are `PENDING_SETUP`, `ACTIVE`, `SUSPENDED` and `CLOSED`.

## 6.4 Tenant closure and data retention

Closing a tenant must not immediately delete transactional records. The platform must define:

- Data export process.
- Retention period.
- Deletion request process.
- Legal and financial record retention obligations.
- Backup expiry behavior.
- Treatment of unpaid invoices and disputes.

# 7. Restaurant product scope

The existing restaurant functionality remains the operational core of FairPrice.

## 7.1 Included restaurant capabilities

- Public digital menu.
- Restaurant-specific public URL and QR codes.
- Table and seat management.
- Customer seating sessions.
- Dine-in ordering.
- Remote ordering.
- Group orders with multiple meal lines and quantities.
- Server-derived prices and totals.
- Manager order queue.
- Order lifecycle and status history.
- Waiting-time and delay indicators.
- Remote online payment initiation and confirmation.
- Authorized dine-in payment recording.
- Partial and split payments.
- Restaurant menu and category management.
- Manager accounts and permissions.
- Daily, date-range and meal-popularity reports.
- CSV report export.
- Restaurant audit logs.
- Manual downtime fallback.

## 7.2 Deferred restaurant capabilities

Unless separately approved, the following remain outside the first commercial release:

- Ingredient inventory and stock depletion.
- Supplier and purchasing management.
- Payroll and attendance.
- AI forecasting.
- Restaurant-owned delivery fleet or live GPS tracking.
- Full offline synchronization.
- Advanced dedicated kitchen display system.
- Customer loyalty programs.
- Advanced customer accounts.
- Automated refund processing.
- Full multi-branch synchronization, unless selected as an explicit launch requirement.

# 8. Restaurant workflows

The original restaurant workflows remain, but every workflow must execute within a tenant context.

## 8.1 Dine-in QR journey

1. Customer scans a restaurant-specific table or seat QR code.
2. The server validates the QR token and resolves the tenant, table and seat.
3. A customer seating session is created or reused for that tenant.
4. Customer browses that restaurant's active menu.
5. Customer selects multiple items and quantities.
6. Server validates the items against that tenant's menu and availability.
7. Server calculates totals and stores immutable item and price snapshots.
8. The order appears only in the correct restaurant's manager queue.
9. Authorized manager records order progress.
10. Authorized staff record payment according to the restaurant's configured policy.
11. Restaurant reports and audit records are updated.

## 8.2 Remote order journey

1. Customer opens the correct restaurant's public ordering page.
2. Customer selects meals and quantities.
3. Customer provides required name and checkout phone.
4. Server creates a remote order under the resolved tenant.
5. Server derives the total from that restaurant's menu.
6. Customer initiates online payment.
7. Payment provider confirmation is verified server-side.
8. Reconciliation updates the order payment state.
9. Manager can accept and prepare only after verified payment.
10. Customer tracks the order using the required reference and phone verification.
11. Manager records collection.

## 8.3 Restaurant staff journey

1. Staff signs in through the FairPrice application.
2. Server resolves the user's tenant and permissions.
3. Staff sees only the restaurant workspace they are authorized to access.
4. Manager processes the restaurant's queue.
5. All changes are recorded with tenant, actor and timestamp.
6. Reports show only data from the authorized tenant.

# 9. Platform-level functional requirements

| ID | Requirement | Priority |
|---|---|---|
| PLAT-01 | Platform administrator can sign in securely. | Must |
| PLAT-02 | Platform roles and permissions are separate from restaurant roles. | Must |
| PLAT-03 | Platform administrator can list and search tenant accounts. | Must |
| PLAT-04 | Platform administrator can activate, suspend and close tenant accounts according to policy. | Must |
| PLAT-05 | Platform administrator can create and update subscription plans. | Must |
| PLAT-06 | Platform administrator can configure plan entitlements and limits. | Must |
| PLAT-07 | Platform dashboard shows tenant counts and subscription status summaries. | Must |
| PLAT-08 | Platform dashboard shows subscription revenue and payment summaries to users holding the revenue permission (Section 24.2). | Must |
| PLAT-09 | Platform actions create platform audit records. | Must |
| PLAT-10 | Support access to tenant data is permission-controlled and audited. | Must |
| PLAT-11 | Platform health and operational errors can be monitored. | Must |
| PLAT-12 | Platform administrator can review support requests. | Should |

# 10. Tenant, registration and subscription requirements

| ID | Requirement | Priority |
|---|---|---|
| TEN-01 | Each restaurant business has a unique tenant ID. | Must |
| TEN-02 | Each tenant has a unique public slug or equivalent public identifier. | Must |
| TEN-03 | A restaurant owner can register a tenant through the onboarding flow. | Must |
| TEN-04 | Owner contact details are verified before activation according to policy. | Must |
| TEN-05 | Tenant records are independent of subscription records. | Must |
| TEN-06 | Each tenant has an assigned subscription plan or trial entitlement. | Must |
| TEN-07 | Tenant status transitions are validated server-side. | Must |
| TEN-08 | A tenant can be suspended without deleting its business records. | Must |
| TEN-09 | A tenant cannot access another tenant's records by changing IDs or URLs. | Must |
| TEN-10 | Tenant creation and privileged changes are audited. | Must |
| SUB-01 | Platform supports configurable subscription plans. | Must |
| SUB-02 | Plan entitlements are stored as configurable data. | Must |
| SUB-03 | Platform supports trial, active, past-due, grace, suspended, cancelled and expired states. | Must |
| SUB-04 | Subscription invoices and payments are distinct from restaurant meal payments. | Must |
| SUB-05 | Subscription renewal dates and billing history are retained. | Must |
| SUB-06 | Owners can view their plan and billing status. | Must |
| SUB-07 | Owners can request upgrades, downgrades and cancellation. | Should |
| SUB-08 | Expired or suspended subscriptions follow a defined access policy. | Must |
| SUB-09 | Subscription status is checked server-side for restricted features. | Must |
| SUB-10 | Subscription changes and payment events are auditable. | Must |

# 11. Restaurant-level functional requirements

The existing requirements for authentication, menu management, QR codes, ordering, payments, reporting and audit activity remain applicable, with the following additional conditions:

- Every staff identity belongs to a tenant.
- Every restaurant-level role assignment belongs to a tenant.
- Restaurant owner and manager sessions carry tenant context.
- Every API operation checks tenant ownership.
- Menu, category, table, seat and QR records are tenant-scoped.
- Orders and order items cannot reference another tenant's menu items.
- Payments cannot be attached to orders belonging to another tenant.
- Reports and exports are tenant-scoped.
- Public customer routes resolve the tenant from a trusted slug or QR token.
- Restaurant-specific settings cannot change global platform configuration.

Existing detailed business rules remain in force:

- The server determines prices and totals.
- Historical order item snapshots remain immutable.
- Remote orders are prepaid before preparation.
- Dine-in payment timing follows restaurant policy.
- Multiple payment rows may settle one order.
- Overpayments are rejected.
- Payment reconciliation is idempotent and concurrency-safe.
- Cancellation requires a reason.
- Important actions are auditable.

# 12. Data model requirements

The existing data model should be extended and reviewed for complete tenant ownership.

## 12.1 Platform-level entities

| Entity | Purpose |
|---|---|
| `platform_users` | Platform administrator and support identities |
| `platform_roles` | Platform role definitions |
| `platform_permissions` | Platform-level capabilities |
| `platform_role_permissions` | Platform role mappings |
| `restaurants` or `tenants` | Tenant identity and business profile |
| `subscription_plans` | Available SaaS plans |
| `plan_entitlements` | Configurable features and limits per plan |
| `subscriptions` | Tenant subscription lifecycle |
| `subscription_invoices` | Charges raised to restaurant businesses |
| `subscription_payments` | Payments made to FairPrice |
| `platform_audit_logs` | Platform-level administrative audit records |
| `support_tickets` | Customer support requests, if included |

## 12.2 Tenant-level entities

| Entity | Purpose |
|---|---|
| `users` | Restaurant owner and staff identities |
| `roles` | Restaurant role definitions |
| `permissions` | Restaurant capabilities |
| `role_permissions` | Restaurant role mappings |
| `manager_assignments` | Operational responsibility assignments |
| `branches` | Future or optional locations under a tenant |
| `tables` | Dining tables |
| `seats` | Seats belonging to tables |
| `qr_codes` | Tenant-specific QR tokens |
| `menu_categories` | Menu categories |
| `menu_items` | Restaurant meals and prices |
| `customer_sessions` | QR-originated seating sessions |
| `orders` | Order headers |
| `order_items` | Immutable order line snapshots |
| `order_status_history` | Order lifecycle audit |
| `payments` | Restaurant customer payment records |
| `discounts` | Restaurant discounts |
| `activity_logs` | Restaurant-level audit records |

## 12.3 Tenant ownership

Every tenant-owned table must have a tenant relationship. For direct ownership, include a non-null `restaurant_id` or `tenant_id`.

For child records, retain tenant ownership where it improves isolation and permits composite foreign-key constraints. For example, an order item should be verifiably linked to an order and menu item from the same tenant.

Recommended integrity pattern:

```text
restaurants
  id (primary key)

menu_items
  id
  restaurant_id
  unique (restaurant_id, id)

orders
  id
  restaurant_id
  unique (restaurant_id, id)

order_items
  id
  restaurant_id
  order_id
  menu_item_id

  foreign key (restaurant_id, order_id)
    references orders (restaurant_id, id)

  foreign key (restaurant_id, menu_item_id)
    references menu_items (restaurant_id, id)
```

The exact migration must be designed against the existing schema. Do not blindly add columns or constraints without checking current keys, indexes and relationships.

## 12.4 Data invariants

- Tenant IDs are assigned by trusted server logic.
- Tenant IDs cannot be changed by ordinary restaurant users.
- Cross-tenant foreign-key relationships are rejected.
- Tenant-scoped unique values use appropriate composite unique constraints where necessary.
- Tenant-specific public slugs and QR tokens are unique.
- Subscription records reference valid tenants and plans.
- Restaurant payment records are separate from FairPrice subscription payment records.
- Historical transactions are retained and not silently rewritten.
- Database migrations preserve existing restaurant data.

# 13. API and application architecture requirements

The existing custom PHP router and service architecture may be retained, but tenant resolution must become a standard part of request processing.

Recommended request flow:

```text
Incoming request
      |
      v
Request validation
      |
      v
Resolve tenant context
      |
      v
Authenticate identity
      |
      v
Check platform or restaurant role
      |
      v
Check tenant ownership
      |
      v
Check subscription entitlement
      |
      v
Controller
      |
      v
Tenant-aware service
      |
      v
Database query with tenant constraints
      |
      v
Response
```

Platform routes and restaurant routes must have distinct middleware and permission policies.

Example route groups:

```text
/platform/auth/*
/platform/tenants/*
/platform/plans/*
/platform/subscriptions/*
/platform/reports/*
/platform/support/*

/restaurant/auth/*
/restaurant/menu/*
/restaurant/tables/*
/restaurant/orders/*
/restaurant/payments/*
/restaurant/reports/*
/restaurant/settings/*

/public/{restaurant_slug}/menu
/public/{restaurant_slug}/orders
/public/{restaurant_slug}/tracking
```

These are logical route examples; final route naming should follow the existing router conventions.

## 13.1 Tenant-aware services

Controllers should not independently invent tenant filtering. Tenant context should be resolved once through trusted middleware and passed to application services.

Services must require tenant context for tenant-owned operations. Avoid methods that retrieve or modify a tenant-owned record using only a globally supplied record ID.

## 13.2 Payment callbacks

Payment callbacks must identify the correct payment intent and order using verified provider references. The server must derive the tenant from the stored payment/order relationship, not trust a tenant ID supplied by an external callback.

Webhook signature verification, idempotency and amount/currency checks remain mandatory before live payment launch.

# 14. Non-functional requirements

## 14.1 Security and tenant isolation

- Use prepared database statements.
- Hash passwords using secure platform password hashing.
- Rotate sessions after authentication.
- Use secure, HttpOnly cookies in production.
- Enforce platform and restaurant RBAC server-side.
- Enforce tenant ownership on every protected operation.
- Prevent insecure direct object reference (IDOR) attacks.
- Validate ownership of related records.
- Use CSRF protection for state-changing browser requests where cookie sessions are used.
- Apply rate limits to login, registration, public ordering and tracking endpoints.
- Protect public QR tokens against guessing and abuse.
- Verify payment webhooks before processing.
- Never store raw card numbers or CVV.
- Keep secrets outside the public web root.
- Escape customer-controlled content.
- Audit platform support access and privileged actions.
- Avoid exposing one tenant's data through errors, logs, caches, exports or file URLs.

## 14.2 Availability and recovery

- Serve only the public web directory.
- Use HTTPS.
- Maintain database backups and test restoration.
- Monitor application, database and payment callback health.
- Maintain a documented incident-response procedure.
- Keep manual restaurant downtime procedures.
- Support safe releases and rollback.
- Define a recovery point objective (RPO) and recovery time objective (RTO) before broad commercial launch.

## 14.3 Performance and scalability

The first commercial release should be load-tested using realistic assumptions rather than an unsupported claim of unlimited scale.

Measure:

- Concurrent restaurant staff sessions.
- Public menu traffic.
- Order creation rate.
- Peak order queue activity.
- Payment callback volume.
- Report query duration.
- Database connection usage.
- Background job processing time.

Use indexes on tenant IDs and common tenant-scoped query fields. Paginate large queues and reports. Avoid unbounded queries.

Polling may remain for the initial release. Realtime infrastructure, caching, queues and read replicas should be introduced when measurements justify them.

## 14.4 Maintainability

- Retain plain OOP PHP and the lightweight router if it remains suitable.
- Separate controllers, services, middleware, repositories/data access and views.
- Centralize tenant resolution and authorization.
- Centralize plan-entitlement checks.
- Keep platform and restaurant permissions distinct.
- Use reviewed database migrations.
- Maintain automated cross-tenant security tests.
- Document environment variables and deployment procedures.

# 15. Platform administration interfaces

> **Superseded in Version 3.1.** Version 2.0 described one platform dashboard and one restaurant dashboard. The detailed role model separates these into distinct, permission-controlled dashboards. Sections 24–29 are authoritative.

| Version 2.0 item | Where it is now defined |
|---|---|
| 15.1 Platform dashboard (tenant counts, plan distribution, subscription revenue, recent registrations, renewals and failed payments, health, support requests, audit activity) | Section 24.6 (overview widgets), 24.3–24.5 (role views) |
| 15.2 Restaurant dashboard (order queue, waiting-time alerts, daily sales, outstanding balances, meal popularity, payment summaries, menu/table administration, staff and settings) | Owner Dashboard, Section 25; Manager Dashboard, Section 26 |

Platform reports must not be confused with restaurant sales reports. Platform figures come only from FairPrice subscription transactions (Section 3.4).

# 16. Deployment and infrastructure direction

## 16.1 Initial deployment

The recommended initial deployment is:

- One production application deployment.
- One managed relational database or appropriately managed database instance.
- Shared application services.
- Tenant-scoped database access.
- Centralized backups and monitoring.
- HTTPS.
- Environment-based configuration.
- Separate development, staging and production environments.

The current proposed stack remains plain PHP 8.x, Apache and a relational database. PostgreSQL/Supabase and AWS remain options requiring a final architecture and cost decision.

## 16.2 Future infrastructure evolution

As usage increases, the platform may introduce:

- Dedicated background job workers.
- Redis caching and queues.
- Object storage for restaurant images and documents.
- Database connection pooling.
- Database read replicas.
- Separate reporting workloads.
- Horizontal application scaling.
- Stronger tenant-specific isolation for large enterprise customers.

Do not introduce distributed infrastructure prematurely. Start with a secure, well-structured modular application and scale based on measured usage.

# 17. Testing and acceptance criteria

## 17.1 Tenant isolation tests

These are release-blocking tests.

1. Restaurant A cannot retrieve Restaurant B's menu-management records.
2. Restaurant A cannot retrieve Restaurant B's orders by changing an order ID.
3. Restaurant A cannot update or cancel Restaurant B's orders.
4. Restaurant A cannot view Restaurant B's payments or reports.
5. Restaurant A cannot access Restaurant B's tables, seats or QR records.
6. A manager cannot perform owner-only actions.
7. A restaurant owner cannot access platform administration routes.
8. A platform support user cannot access tenant records without explicit permission.
9. A public QR token resolves only to its own tenant and table/seat context.
10. A payment callback cannot settle an unrelated tenant's order.
11. Tenant-specific cached data and exports do not leak across tenants.
12. Tenant deletion, suspension or subscription expiry does not silently destroy historical financial records.

## 17.2 Commercial acceptance criteria

The first commercial SaaS release is ready for pilot only when:

- Two or more independent restaurant tenants can be onboarded.
- Each tenant has a separate owner account.
- Each tenant can configure its own menu and tables.
- Each tenant can invite and manage its own staff.
- Each tenant can accept and process its own orders.
- Customer payments reconcile against the correct restaurant orders.
- Restaurant reports show only that restaurant's records.
- Platform administrators can manage tenant and subscription status.
- Subscription billing is distinct from restaurant customer payments.
- Subscription entitlements are enforced server-side.
- Cross-tenant security tests pass.
- Existing restaurant workflows pass regression tests.
- Backups and restore procedures are tested.
- Production HTTPS, monitoring and incident procedures are in place.

# 18. Migration from the current single-restaurant implementation

The current FairPrice application is the starting point, not a disposable prototype.

Migration should be staged.

## Phase 1 — Product and schema audit

- Review the existing database schemas.
- Identify every table containing restaurant-owned information.
- Identify queries that assume one restaurant.
- Identify global settings that should become tenant settings.
- Identify existing users and assign them to the initial tenant.
- Identify public routes that need tenant resolution.
- Record existing tests and establish a regression baseline.

**Exit condition:** A complete tenant ownership map and migration plan exist.

## Phase 2 — Tenant foundation

- Formalize tenant identity.
- Add tenant context middleware.
- Add tenant-aware data access patterns.
- Add tenant ownership constraints and indexes.
- Add platform identity and permission separation.
- Create the initial tenant migration.
- Migrate the current restaurant into the first tenant.

**Exit condition:** Existing restaurant data belongs to a valid tenant and normal workflows still work.

## Phase 3 — Tenant isolation

- Update every tenant-owned query.
- Update create, update and delete operations.
- Validate related-record ownership.
- Scope reports, exports, files and caches.
- Add cross-tenant security tests.
- Review background jobs and payment callbacks.

**Exit condition:** Cross-tenant access tests pass.

## Phase 4 — Restaurant onboarding

- Build restaurant registration.
- Add owner verification.
- Create tenant workspace.
- Build setup wizard.
- Add restaurant slug and public menu routing.
- Add manager invitation workflow.

**Exit condition:** A second restaurant can independently onboard and operate.

## Phase 5 — Platform administration

- Build platform administrator authentication.
- Build tenant management dashboard.
- Add tenant activation and suspension.
- Add platform audit logging.
- Add platform monitoring views.

**Exit condition:** The platform operator can administer tenants without using restaurant-owner accounts.

## Phase 6 — Subscription management

- Create subscription plans and entitlements.
- Add trial and subscription lifecycle.
- Add invoices and subscription payment records.
- Add renewal and overdue handling.
- Add owner billing view.
- Enforce plan limits and access policy.
- Test failed and duplicate billing callbacks.

**Exit condition:** Subscription status and entitlements work independently of restaurant sales/payment records.

## Phase 7 — Pilot and commercial launch

- Onboard a small number of pilot restaurants.
- Test separate menus, staff, orders and reports.
- Test peak operational periods.
- Review usability and onboarding completion.
- Measure infrastructure costs and performance.
- Train restaurant owners and document support procedures.
- Resolve pilot defects before wider marketing.

**Exit condition:** Pilot acceptance criteria are met and the operating cost/revenue model is understood.

# 19. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Cross-tenant data leakage | Severe privacy and business risk | Central tenant middleware, database constraints and security tests |
| Existing queries assume one restaurant | Incorrect data access | Audit and update all data access paths |
| Subscription and restaurant payments become mixed | Financial reporting errors | Separate entities, services and reconciliation |
| Subscription expiry blocks the wrong operations | Business disruption | Explicit access policy and tested state transitions |
| One tenant creates excessive load | Poor service for other tenants | Monitoring, quotas, pagination and capacity planning |
| Platform administrator has excessive access | Privacy and insider risk | Least privilege and audited support access |
| Payment callbacks are duplicated or forged | Incorrect financial state | Signature verification and idempotent reconciliation |
| Tenant onboarding is confusing | Low customer conversion | Guided setup and pilot usability testing |
| Infrastructure costs exceed subscription revenue | Unprofitable business | Measure per-tenant costs and validate pricing |
| Data migration damages existing records | Operational loss | Backups, reviewed migrations and rollback plan |

# 20. Open business and technical decisions

The following decisions must be made before or during implementation:

1. Final FairPrice brand name, domain and public website.
2. Whether registration is self-service, manually approved or a combination.
3. Initial subscription prices and billing intervals.
4. Trial duration and grace-period policy.
5. Exact feature and usage limits for each plan.
6. Subscription payment provider and supported payment methods.
7. Whether one tenant represents one physical restaurant or a business with multiple branches.
8. Whether multi-branch management is part of the first commercial release.
9. Final PostgreSQL/Supabase and AWS deployment architecture.
10. Production payment provider for restaurant customer transactions.
11. Data retention, export and tenant closure policies.
12. Support access and privacy policy.
13. Initial target number of pilot restaurants and expected concurrent usage.

# 21. Product success measures

Commercial and operational performance should be measured separately.

## 21.1 Commercial measures

- Number of registered restaurants.
- Number of activated restaurants.
- Trial-to-paid conversion rate.
- Monthly recurring revenue (MRR).
- Annual recurring revenue (ARR).
- Subscription renewal rate.
- Churn rate.
- Average revenue per tenant.
- Customer acquisition cost, once marketing data is available.
- Support cost per tenant.

## 21.2 Product and operational measures

- Successful order creation rate.
- Average time from order submission to acceptance.
- Average preparation and service time.
- Payment reconciliation error rate.
- Platform uptime.
- API response times.
- Cross-tenant security test results.
- Backup and restore success.
- Restaurant onboarding completion rate.

# 22. Final product direction

FairPrice is to be developed as a multi-tenant SaaS platform, not as a custom application for one restaurant.

The existing restaurant ordering and operations capabilities form the core product. The new platform layer introduces tenant registration, isolated restaurant workspaces, platform administration, subscription plans, billing and centralized service management.

The first commercial release should use a shared application and shared relational database with rigorous tenant isolation. The architecture should be modular and measurable so that infrastructure can evolve as the number of restaurants, orders and concurrent users grows.

The product must prove that multiple independent restaurants can safely use the same platform at the same time before it is marketed as a commercial multi-restaurant SaaS service.

---

**Change-control note:** This PRD supersedes the single-restaurant framing of version 1.0. Existing restaurant workflows and business rules remain the baseline unless explicitly changed here. Database migrations, API changes, implementation status and acceptance tests must be updated to reflect the multi-tenant architecture. A requirement described here is not considered implemented until it is present in the codebase and verified by tests.


---

# VERSION 3.0 ADDENDUM — DETAILED ROLE, DASHBOARD AND APPROVAL SPECIFICATION (REFINED IN VERSION 3.1)

**Confirmed product decision:** Restaurants can self-register, but a new restaurant tenant must remain pending until a FairPrice Platform Administrator approves it. Self-registration does not mean immediate permission to operate.

This addendum expands and, where necessary, supersedes the shorter role descriptions and open registration decision in Version 2.0. It is part of the PRD and must be used as the detailed functional blueprint.

# 23. Definitive account and role hierarchy

FairPrice has two administrative domains. They are related, but they are not the same account hierarchy.

```text
FAIRPRICE SAAS PLATFORM
|
+-- PLATFORM DOMAIN (operated by FairPrice)
|   |
|   +-- Platform Owner / Super Administrator
|   +-- Platform Administrator
|   +-- Platform Support Staff (optional, restricted)
|
+-- TENANT DOMAIN (one independent restaurant business per tenant)
    |
    +-- Restaurant Owner (tenant administrator)
    |
    +-- Restaurant Staff
        |
        +-- Restaurant Manager
        +-- Other assigned operational roles (future/configurable)

CUSTOMERS
  +-- Public customers ordering from a particular restaurant.
      They do not become platform users or restaurant administrators.
```

**Terminology rule:** In this PRD, “Platform Administrator” means a person administering FairPrice as the SaaS provider. “Restaurant Owner” means the administrator of one restaurant tenant. The word “admin” must not be used in code or interface labels without clarifying which domain it belongs to.

A tenant is the restaurant business workspace. Its owner and staff operate inside that tenant. A manager is not a separate tenant and does not own a separate restaurant account.

For the first release, one tenant represents one restaurant business workspace. Multi-branch operation remains a future capability unless separately approved. The data model should not prevent adding branches later.

## 23.1 Dashboard and screen inventory

Every place a person lands in FairPrice is one of the surfaces below. A surface that is not listed here must not be built until it is added to this table and defined.

| # | Surface | Who uses it | Domain | Shown when | Defined in |
|---|---|---|---|---|---|
| 1 | Platform Console — Super Administrator view | Platform Owner / Super Administrator | Platform | Signs in through the platform route | 24.3 |
| 2 | Platform Console — Platform Administrator view | Platform Administrator | Platform | Signs in through the platform route | 24.4 |
| 3 | Platform Console — Support Staff view | Platform Support Staff (optional, later) | Platform | Signs in through the platform route | 24.5 |
| 4 | Owner Dashboard | Restaurant Owner | Tenant | Tenant is `PENDING_SETUP` or `ACTIVE` (and, in restricted form, `SUSPENDED` or `CLOSED`) | 25 |
| 5 | Manager Dashboard | Restaurant Manager | Tenant | Tenant is `ACTIVE` and the manager account is active | 26 |
| 6 | Public customer journey | Customer (no FairPrice account) | Public, per tenant | Customer opens a restaurant slug or scans a QR code | 27 |
| 7 | Applicant status page | Restaurant applicant before approval | Pre-tenant | Applicant signs in while the application is not yet approved | 28.5 |
| 8 | Restricted account page | Owner or manager of a suspended, closed or expired tenant | Tenant (restricted) | Tenant or subscription state restricts normal operations | 29.2 |
| — | Kitchen and waiter screens | Kitchen staff and waiters | — | **Not in the first release.** They have no accounts; managers record their milestones (Section 5.6). A read-only kitchen display may be considered later. | 26.9 |

## 23.2 Standard definition template

Each dashboard in Sections 24–27 is defined with these blocks, so nothing is left implicit:

1. **Purpose and landing rule** — who it is for and when they arrive there.
2. **Navigation** — grouped menu items, each with the permission that reveals it.
3. **Overview widgets** — each figure with its calculation meaning and default period (definitions in Section 31.2).
4. **Section table** — information displayed, actions allowed, required permission, and plan or state restrictions.
5. **Permissions and restrictions** — what the role may and may not do.
6. **State behavior** — what changes under each tenant account state and subscription state (Section 29).
7. **Plan gating** — which items depend on subscription entitlements (Section 29.4).
8. **Notifications** — which events reach this role (Section 31.3).
9. **Standard states** — empty, loading, error, permission-denied (Section 31.4).
10. **Device priorities and acceptance tests** — responsive priorities (Section 31.5) and tests (Section 32).

## 23.3 Shared dashboard shell

All signed-in dashboards share a consistent frame:

- **Header:** the account's role label; for tenant users, the restaurant name; a notification indicator; an account menu with profile, security and sign out.
- **Navigation:** grouped, role-filtered, and limited to items the user is permitted to open. Hiding an item never replaces server-side permission checks.
- **Banner area**, shown in this priority order when several apply: security notice; subscription or suspension notice; active support-access notice; platform announcement.
- **Content area** and a **help link**.
- **Platform Console distinction:** the Platform Console must look clearly different from tenant dashboards, with a visible "FairPrice Platform" label, so staff cannot mistake which domain they are working in.
- **Support-access banner:** while a platform user holds approved access to a tenant's data, a persistent banner shows the tenant, the access scope and the time remaining.

# 24. Platform domain: Platform Console specification

## 24.1 One console, permission-filtered views **[Proposed]**

FairPrice provides one Platform Console. The Super Administrator, Platform Administrator and Support Staff roles are default **permission bundles** within that console, not three separate applications. Each navigation item and action requires a specific platform permission (Section 24.2). A user sees only the items their permissions allow, and the server rejects any request outside those permissions.

This keeps one set of screens to build, test and secure, and lets the Super Administrator grant or withdraw individual capabilities without creating new roles.

Platform identities and permissions are always separate from restaurant identities and permissions. A person who is both a FairPrice staff member and a restaurant owner uses two separate accounts.

## 24.2 Platform permission catalogue and default role matrix

Legend: **●** held by default · **○** can be granted by the Super Administrator · **—** reserved; cannot be granted to this role.

| Permission | What it allows | Super Admin | Platform Admin | Support Staff |
|---|---|:-:|:-:|:-:|
| `platform.overview.view` | Open the Platform Overview (counts and operational widgets) | ● | ● | ○ (support and onboarding widgets only) |
| `platform.revenue.view` | See subscription revenue widgets and summaries | ● | ○ | — |
| `registrations.view` | See registration applications | ● | ● | ○ (status only) |
| `registrations.decide` | Approve, reject or request more information | ● | ● | — |
| `tenants.view` | See the tenant list and profile | ● | ● | ● (limited metadata) |
| `tenants.suspend` / `tenants.reinstate` | Suspend or reinstate a tenant | ● | ● | ○ (narrow grant only) |
| `tenants.close` | Close a tenant | ● | ○ | — |
| `plans.view` | See subscription plans | ● | ● | ○ |
| `plans.manage` | Create, edit, publish and archive plans and entitlements | ● | ○ | — |
| `subscriptions.view` | See subscription state, dates and history | ● | ● | ○ (state only) |
| `subscriptions.adjust` | Manual correction, approved trial or grace period | ● | ○ | — |
| `billing.view` | See FairPrice invoices and subscription payments | ● | ○ | — |
| `billing.reconcile` | Reconcile and investigate subscription payments | ● | ○ | — |
| `billing.export` | Export platform billing reports | ● | ○ | — |
| `platform_users.view` | See platform user accounts | ● | ○ | — |
| `platform_users.manage` | Invite, deactivate and assign platform roles and permissions | ● | — | — |
| `support.tickets.manage` | View, assign, respond to, escalate and close tickets | ● | ● | ● |
| `support.access.request` | Request time-limited access to a tenant's private data | ● | ● | ● |
| `support.access.approve` | Approve a support-access request made by someone else | ● | ○ | — |
| `health.view` | See system health and diagnostics | ● | ● | ○ |
| `health.incidents.manage` | Acknowledge and escalate incidents | ● | ● | — |
| `audit.view` | Search and read platform audit records | ● | ● | — |
| `audit.export` | Export audit records | ● | ○ | — |
| `config.view` | See global configuration (secrets are masked) | ● | ○ | — |
| `config.manage` | Change global, payment-provider and security configuration | ● | — | — |
| `announcements.manage` | Publish platform announcements to tenants | ● | ○ | — |

Rules for the matrix:

- No permission allows editing or deleting audit records.
- Nobody can grant themselves a permission. Only a user holding `platform_users.manage` can change platform permissions, and every change is audited.
- Privileged accounts (Super Administrator and anyone holding `platform_users.manage`, `config.manage`, `billing.*` or `support.access.approve`) require stronger authentication.
- Defaults above are a starting point. Final defaults are confirmed before pilot launch.

## 24.3 Platform Owner / Super Administrator

**Purpose:** Control the FairPrice service, its commercial configuration and its platform administrators. This is the highest-trust FairPrice account and belongs to the person or organization that owns the SaaS business.

**Landing:** Platform Overview.

**Navigation:**

1. Platform Overview
2. Registration Approvals
3. Tenant Accounts
4. Subscription Plans
5. Subscriptions
6. Platform Billing and Revenue
7. Platform Users and Permissions
8. Support and Customer Success
9. System Health
10. Security and Audit Logs
11. Platform Configuration
12. Announcements
13. My Account

| Section | What the user sees | Actions the user can perform | Permission |
|---|---|---|---|
| Platform Overview | Widgets defined in Section 24.6 | Open filtered lists, inspect trends, navigate to items needing attention | `platform.overview.view`, `platform.revenue.view` |
| Registration Approvals | Applications awaiting review with submission date, business name, owner contact, verification state, supplied business details, possible-duplicate flags and review history | Open an application; approve; reject with a reason; request more information | `registrations.view`, `registrations.decide` |
| Tenant Accounts | Searchable list with tenant ID, name, owner, account status, subscription status, plan and creation date; tenant profile with onboarding progress | View tenant profile; activate, suspend, reinstate or close according to policy; record a reason for sensitive actions | `tenants.view`, `tenants.suspend`, `tenants.reinstate`, `tenants.close` |
| Subscription Plans | Plan name, price, billing interval, enabled features, usage limits, availability and number of tenants on the plan | Create, edit, publish, archive and configure plans. Changes must not silently rewrite historical invoices | `plans.view`, `plans.manage` |
| Subscriptions | Tenant, plan, start and end dates, renewal date, state and payment status | Inspect history; apply an authorized manual correction; grant an approved trial or grace period; record the reason | `subscriptions.view`, `subscriptions.adjust` |
| Platform Billing and Revenue | FairPrice invoices, subscription payments, failed payments, refunds or adjustments where supported, revenue summaries | Reconcile subscription transactions; export billing reports; investigate failed payments | `billing.view`, `billing.reconcile`, `billing.export` |
| Platform Users and Permissions | Platform users, roles, permission sets, account state, last login, authentication strength | Invite and deactivate users; assign least-privilege roles and individual permissions | `platform_users.view`, `platform_users.manage` |
| Support and Customer Success | Tickets with tenant contact, category, priority, status, assignee and history; support-access requests | Assign, respond, escalate and close tickets; request or approve support access (Section 24.7) | `support.tickets.manage`, `support.access.request`, `support.access.approve` |
| System Health | Availability, database status, queue and job failures, error rates, backup status, resource usage, open incidents | Review alerts; acknowledge and escalate incidents; open permitted diagnostics | `health.view`, `health.incidents.manage` |
| Security and Audit Logs | Privileged logins, approvals, suspensions, plan changes, permission changes, support-access events, configuration changes | Search, filter and export permitted records. Audit records are never editable | `audit.view`, `audit.export` |
| Platform Configuration | Global settings, email and SMS provider settings, payment-provider configuration references, maintenance settings, security policies | Change approved configuration. Secrets are stored securely and never shown in full after saving | `config.view`, `config.manage` |
| Announcements | Draft, scheduled and published announcements with audience | Create and publish announcements to all tenants or a selected group | `announcements.manage` |
| My Account | Own profile, security settings and authentication methods | Update permitted personal details and credentials; cannot change own role or permissions | — |

**Restrictions and safeguards:**

- The Platform Owner can administer platform accounts and the tenant lifecycle.
- The Platform Owner does not need unrestricted routine access to restaurant menus, customer details, individual orders or restaurant cash records.
- Any exceptional access to tenant operational data uses the support-access process (Section 24.7): a specific permission, a stated reason, a limited scope and an audit event.
- Platform subscription revenue is calculated from FairPrice subscription transactions only. It never includes restaurant meal sales.
- High-impact actions — closing a tenant, changing a payment provider, granting administrator privileges — require confirmation and a reason, and are audited.
- Platform credentials are never shared with restaurant owners or managers.

## 24.4 Platform Administrator

**Purpose:** Carry out delegated FairPrice platform operations without automatically receiving every Super Administrator capability.

**Landing:** Platform Overview, showing only widgets the administrator's permissions allow.

**Default navigation:**

1. Platform Overview (without revenue widgets by default)
2. Registration Approvals
3. Tenant Accounts
4. Subscriptions (read-only by default)
5. Support and Customer Success
6. System Health
7. Security and Audit Logs (view only)
8. My Account

**Not shown by default** (appear only if the Super Administrator grants the permission): Subscription Plans management, Platform Billing and Revenue, Platform Users and Permissions, Platform Configuration, Announcements.

| Section | Default capability | Limits by default |
|---|---|---|
| Registration Approvals | Review, approve, reject with reason, request information | Cannot decide an application they submitted themselves (Section 28.3) |
| Tenant Accounts | Search, view profiles, activate, suspend and reinstate with reason | Cannot close a tenant; cannot change tenant ownership |
| Subscriptions | See subscription state and history to assist billing enquiries | Cannot adjust subscriptions or see invoices and payments unless granted |
| Support and Customer Success | Manage tickets; request support access | Cannot approve support access unless granted |
| System Health | View status; acknowledge and escalate incidents | Cannot change platform configuration |
| Security and Audit Logs | Search and read records | Cannot export unless granted; cannot alter or delete anything |

A Platform Administrator must not, by default:

- Change Super Administrator credentials or ownership.
- Grant themselves higher permissions.
- Change sensitive global payment or security settings.
- Read restaurant customer or financial details without approved support access.
- Alter or delete audit history.

The interface hides unavailable actions and the server independently rejects unauthorized requests. Hiding a button is not authorization.

**Tenant suspension and reinstatement:** The action requires a reason category plus free-text detail and an effective policy (immediate or scheduled). The owner receives a notice that shows the reason category, not internal notes. Reinstatement is a separate, audited action.

## 24.5 Platform Support Staff (optional, later role)

**Purpose:** Help restaurant owners use FairPrice.

**Landing:** Support Inbox.

**Navigation:**

1. Support Inbox
2. Tenant Directory (limited)
3. Onboarding Progress
4. Help Articles and Templates
5. My Access Requests
6. My Account

| Section | What the user sees | Actions | Not allowed |
|---|---|---|---|
| Support Inbox | Tickets with tenant name, contact, category, priority (Standard or Priority plan), status and correspondence | Respond, record outcome, escalate to a Platform Administrator, close | Changing plans, suspending accounts or touching tenant financial data |
| Tenant Directory | Tenant name, public contact details, account state, subscription state, plan name | Search and open a limited tenant summary | Menus, orders, customer details, payments, staff lists, revenue |
| Onboarding Progress | Setup checklist progress for tenants still in `PENDING_SETUP` | Send onboarding guidance and help articles | Editing the tenant's setup |
| Help Articles and Templates | Help content and reply templates | Send and reuse | — |
| My Access Requests | Own pending, approved, active and expired support-access requests | Create a request; end an active access early | Approving own request |
| My Account | Own profile and security settings | Update personal details and credentials | Changing own role or permissions |

Support staff never receive platform-owner privileges by default. Any narrow additional permission is granted by the Super Administrator and audited.

## 24.6 Platform Overview widgets

Every widget shows its date range and a short calculation note. Figures come from FairPrice platform data only.

| Widget | Definition | Default period | Drill-down | Permission |
|---|---|---|---|---|
| Pending approvals | Applications in `PENDING_APPROVAL`, with count in `MORE_INFORMATION_REQUIRED` shown separately; age of the oldest pending application | Current | Registration Approvals, filtered | `registrations.view` |
| Tenants by account state | Count of tenants in `PENDING_SETUP`, `ACTIVE`, `SUSPENDED`, `CLOSED` | Current | Tenant Accounts, filtered | `tenants.view` |
| Subscriptions by state | Count in `TRIAL`, `ACTIVE`, `PAST_DUE`, `GRACE_PERIOD`, `SUSPENDED`, `CANCELLED`, `EXPIRED` | Current | Subscriptions, filtered | `subscriptions.view` |
| Plan distribution | Number of active and trial subscriptions per plan | Current | Subscriptions, filtered by plan | `subscriptions.view` |
| Trials ending soon | Trials ending within the next 7 days **[Proposed]** | Next 7 days | Subscriptions, filtered | `subscriptions.view` |
| Upcoming renewals | Subscriptions renewing in the next 7 and 30 days | Next 7 / 30 days | Subscriptions, filtered | `subscriptions.view` |
| Failed subscription payments | Subscription payment attempts that failed and are unresolved | Current | Platform Billing | `billing.view` |
| Subscription revenue | Confirmed FairPrice subscription payments net of refunds and adjustments in the period; excludes all restaurant meal payments | Current month | Platform Billing | `platform.revenue.view` |
| Recent registrations | Latest applications with status | Last 7 days | Registration Approvals | `registrations.view` |
| Open support tickets | Open tickets by priority and age | Current | Support Inbox | `support.tickets.manage` |
| Platform health | Availability, error rate, failed jobs, backup status, open incidents | Current / last 24 hours | System Health | `health.view` |
| Recent privileged activity | Latest privileged audit events | Last 7 days | Security and Audit Logs | `audit.view` |

A widget whose permission the user lacks is not shown. It is never shown as a zero.

## 24.7 Support access to tenant data

Platform staff do not browse tenant data routinely. When a support case needs it, they use this flow **[Proposed]**:

1. **Request.** The requester selects the tenant and enters a reason, the case or ticket reference, the data scope and the duration.
   - Scope options: read-only view of orders, menu, settings, or staff list. Customer contact details and payment references are separate scopes and are masked unless specifically requested.
   - Default duration is 60 minutes. A longer duration, up to 24 hours, requires the approver's agreement.
2. **Approval.** A different user holding `support.access.approve` approves or declines. Nobody can approve their own request.
3. **Notification.** The tenant owner is notified when access starts and can see it later in the Restaurant Activity Log.
4. **Access.** Access is read-only by default. The persistent support-access banner shows tenant, scope and time remaining.
5. **Expiry.** Access ends automatically at the time limit. The requester or a Super Administrator can end it earlier.
6. **Audit.** The request, approval, each area viewed (not the private content itself), the end of access and the reason are all recorded.

Any change to tenant data by a platform user (rather than viewing) is outside the default scope. It requires an explicit, separately approved write permission, and the Super Administrator should decide whether to allow it at all.

## 24.8 Platform Console states

- **Empty states:** for example, "No registrations awaiting review", "No open tickets", "No failed payments in this period".
- **Permission denied:** a clear message that the user lacks the permission and whom to ask, without revealing sensitive details.
- **Maintenance mode:** a console banner and read-only behavior for configuration screens while maintenance is active.
- **Session and security:** privileged accounts require stronger authentication; idle sessions expire; sensitive screens may require re-authentication **[Proposed]**.
- **Confirmation:** all high-impact actions require confirmation and a reason where specified.

# 25. Tenant domain: Restaurant Owner dashboard specification

## 25.1 Restaurant Owner / Tenant Administrator

**Purpose:** Own and administer one restaurant workspace on FairPrice. The owner configures the restaurant, manages its staff and oversees its business operations through the platform.

The owner is created as the first tenant administrator when the restaurant's registration is approved. The owner is not a FairPrice Platform Administrator.

**Landing:** The Owner Dashboard of the owner's tenant. While the tenant is in `PENDING_SETUP`, the landing screen is the Setup Checklist (Section 25.4). If the tenant or subscription is restricted, the owner lands on the Restricted Account Page (Section 29.2).

**Navigation (grouped):**

| Group | Items |
|---|---|
| Home | Restaurant Overview · Setup Checklist (until go-live) · Notifications |
| Operations | Orders and Customer Records · Tables and Seats · QR Codes |
| Catalog | Menu and Categories |
| People | Staff and Managers · Roles and Permissions |
| Money | Payments · Sales Reports |
| Insights | Meal Performance · Service Performance |
| Business Account | Restaurant Profile and Settings · Subscription and Billing · Data Export · Restaurant Activity Log |
| Help | Help and Support |

Change from Version 3.0: "Orders" and "Customers / Order Records" are merged into **Orders and Customer Records**, because customer information in this system exists only as order and checkout details. **Data Export** and the **Setup Checklist** are new. Rename or regroup labels freely during design, but keep every function below reachable.

## 25.2 Owner dashboard sections and functions

The owner holds every tenant permission implicitly. The permission column shows the key that would control the same action for a manager, or the owner-only key.

| Section | Information displayed | Owner actions | Permission / gating |
|---|---|---|---|
| Restaurant Overview | Widgets in Section 25.3 | Filter by date; open the related order, report or alert | — |
| Setup Checklist | Setup items with complete or incomplete state and go-live readiness (Section 25.4) | Jump to each setup task; save progress and return later | Owner |
| Orders and Customer Records | All tenant orders with reference, dine-in or remote type, table/seat where applicable, order time, items, amount, payment state, preparation state, and the customer name and phone given at checkout | Search and filter; open details and status history; monitor progress; perform owner-authorized order actions. Corrections and cancellations require a reason and are audited. Apply retention and privacy rules | `orders.view`, `orders.view_history`, `orders.cancel`, `customers.lookup` |
| Menu and Categories | Categories, meal names, descriptions, images, prices, availability | Create, edit, reorder, publish, temporarily disable and archive categories and meals. Price changes apply to new orders only and never alter historical order snapshots | `menu.view`, `menu.manage`, `menu.set_availability` |
| Tables and Seats | Table names or numbers, seat identifiers, capacity, current occupancy or session state where supported | Create, edit, deactivate and configure seating. Deletion is blocked where history must be retained | `tables.view`, `tables.manage` |
| QR Codes | QR token reference, linked table/seat or public menu route, active state, creation date | Generate, download, print, deactivate and replace. A revoked token stops working immediately | `qr.manage` |
| Staff and Managers | Name, login or contact, assigned role, account status, last activity, manager accounts used against the plan limit | Invite staff, resend invitations, activate and deactivate accounts, trigger secure access reset | `staff.view`, `staff.invite`, `staff.deactivate` (owner may also hold all) |
| Roles and Permissions | Available roles and presets, their capabilities, and who holds sensitive permissions | Assign a preset or individual permissions from the approved list; review sensitive access; create limited custom roles only if included in the release | `roles.manage` (owner-only) |
| Payments | Customer payment records: method, amount, reference, status, order link, reconciliation state | Review payments; record authorized physical payments; inspect failed and pending transactions; export permitted reports. Refunds and voids need a defined permission and audit trail | `payments.view`, `payments.record_physical`, `payments.initiate_refund`, `reports.export` |
| Sales Reports | Sales totals, order counts, payment breakdowns, date filters (definitions in Section 31.2) | Daily, weekly, monthly and custom-period reports; export. Sales, cash received and outstanding are always shown as distinct figures | `reports.view_sales`; Basic or Advanced by plan |
| Meal Performance | Best-selling and slow-selling meals, quantities sold, sales contribution | Filter by date and category; use for meal planning | `reports.view_sales`; Basic or Advanced by plan |
| Service Performance | Average acceptance, preparation and serving times; delayed orders; workload summaries | Set operational thresholds; review delays and plan staffing. The system records milestones that staff enter and does not directly observe kitchen activity | `reports.view_operations`, `settings.manage` for thresholds |
| Restaurant Profile and Settings | Business name, public slug, address, contact, logo, currency, timezone, opening information, dine-in payment policy, remote ordering option, delay thresholds | Update profile, branding, opening information and restaurant-specific settings. Changing the public slug invalidates the old public link; QR tokens are unaffected. Changing currency after orders exist is restricted **[Proposed]** | `settings.manage`; remote ordering by plan |
| Subscription and Billing | Current plan, entitlements and limits, subscription state, renewal date, invoices, FairPrice subscription payment history | View invoices; pay or renew; request upgrade, downgrade or cancellation; contact support. Never shows another tenant's data or restaurant meal payments | `subscription.view`, `subscription.manage` (owner-only) |
| Data Export | Available exports and recent export requests | Request an export of the tenant's own records; download it. Always available, including during suspension and expiry (Section 29.3) | `data.export` (owner-only); format by plan |
| Restaurant Activity Log | Staff logins and important changes to menu, prices, orders, payments, staff, roles and settings; support-access events affecting this tenant | Search and review. Ordinary users cannot rewrite audit history | `audit.view_tenant` (owner-only) |
| Notifications | Events listed in Section 31.3 | Read, dismiss, configure available preferences | — |
| Help and Support | Help content, open tickets, support history | Create a request, add details, follow status | `support.create` |

## 25.3 Owner overview widgets

Each widget shows its date range and calculation note. Defaults apply to the tenant's current day in the tenant's timezone.

| Widget | Definition | Default period | Drill-down |
|---|---|---|---|
| Orders today by state | Count of orders received today, split into received, accepted, preparing, ready and completed | Today | Orders, filtered |
| Gross sales | Sum of server-calculated totals of valid orders placed in the period | Today | Sales Reports |
| Recorded payments | Sum of confirmed payment records in the period, all methods | Today | Payments |
| Outstanding amounts | Totals of valid orders minus confirmed payments, never below zero | Current | Payments, filtered |
| Delayed orders | Orders that have exceeded the configured time threshold in their current state | Current | Orders, filtered |
| Popular meals | Top meals by quantity in valid orders | Today | Meal Performance |
| Payment-method summary | Recorded payments grouped by method | Today | Payments |
| Subscription notice | Plan, state and any renewal or overdue notice | Current | Subscription and Billing |
| Setup progress | Shown only until go-live readiness is met | Current | Setup Checklist |

## 25.4 Setup Checklist and go-live readiness **[Proposed]**

After approval, a tenant starts in `PENDING_SETUP`. The checklist tracks the setup items in Section 6.2 and lets the owner save progress and return. The restaurant can accept public orders only when all readiness conditions below are met and the account and subscription state allow it.

| Checklist item | Counts toward go-live? |
|---|---|
| Restaurant name, public slug, contact details, currency and timezone set | Yes |
| At least one published category with at least one available meal | Yes |
| At least one active table with at least one QR code, or the public menu route enabled | Yes |
| Dine-in payment policy chosen | Yes |
| Remote ordering configured (if the plan allows and the owner wants it) | No (optional) |
| Logo and branding | No (optional) |
| Manager invitations | No (optional) |
| Subscription and billing details | Per subscription policy |

Until ready, public ordering shows the "restaurant not yet open for orders" screen (Section 27.3), and managers who sign in see a clear "restaurant is not live yet" notice.

## 25.5 Restaurant Owner permissions

The owner may:

- Manage the restaurant's profile and operational settings.
- Manage its menu, categories, prices and availability.
- Manage its tables, seats and QR codes.
- Invite and manage its own staff.
- Assign manager permissions.
- View all restaurant orders and permitted payment information.
- View and export restaurant reports.
- View and manage the restaurant's FairPrice subscription.
- Review restaurant audit activity and request a data export.

The owner may not:

- View or administer another tenant.
- Approve other restaurants' registration applications.
- Change FairPrice-wide plans, global settings or platform payment configuration.
- View FairPrice's overall subscription revenue.
- Grant themselves Platform Administrator privileges.
- Bypass server-side payment verification or alter immutable transaction history.

**Owner-only permissions (never grantable to managers):** `roles.manage`, `subscription.view`, `subscription.manage`, `data.export`, `audit.view_tenant`, `support.create` (the owner may later delegate `support.create`), and ownership changes.

## 25.6 Owner dashboard behavior

After login, the server identifies the owner and resolves the owner's tenant. The owner lands on that tenant's dashboard. The restaurant name is visible so the user knows which workspace is open.

All navigation, search, counts, charts, exports and actions use the same tenant context. Changing a URL, record ID or request parameter must never expose another tenant's information. A record ID that belongs to another tenant must produce the same "not found" response as an ID that does not exist.

Owner behavior under account, subscription and plan conditions is defined in Sections 29.2–29.4.

# 26. Tenant domain: Restaurant Manager dashboard specification

## 26.1 Restaurant Manager

**Purpose:** Run the day-to-day operations of the restaurant on behalf of the owner. The manager works inside one tenant and receives only the permissions the owner assigns.

A manager account is created or invited by the Restaurant Owner and is linked to the same tenant as that owner. Several managers may work at the same time.

**Landing:** The Manager Dashboard, opening on Operations Overview. If the tenant is not live or is restricted, the manager sees the notice described in Section 29.2 instead of normal operations.

**Working vocabulary for order state.** Dashboards use these terms. The exact enumeration belongs in the data model.

- **Received** → **Accepted** → **Preparing** → **Ready** → **Served** (dine-in) or **Collected** (remote).
- Exits: **Rejected** (before acceptance, reason recorded) and **Cancelled** (after acceptance, reason required, permission required).
- A remote order becomes eligible for acceptance only after verified payment confirmation. Before that it shows **Awaiting payment confirmation**.

## 26.2 Navigation and section functions

Each item appears only if the manager holds the listed permission.

| Section | Information displayed | Manager actions | Permission |
|---|---|---|---|
| Operations Overview | Widgets in Section 26.4 | Open an order, filter the queue, prioritize work according to restaurant procedure | `orders.view` |
| Incoming Orders | New orders with reference, time, type, table/seat or remote collection details, items, quantities, notes and payment state | Review; accept or reject where policy permits; record a rejection reason | `orders.view`, `orders.accept`, `orders.reject` |
| Active Orders | Orders grouped by current state | Open orders; perform permitted next transitions. The server validates every transition | `orders.update_status` |
| Order History | Previous orders with status history | Search and inspect; corrections and cancellations are restricted and audited | `orders.view_history`, `orders.cancel` |
| Kitchen / Preparation Coordination | Accepted orders, item notes, elapsed time | Coordinate with kitchen staff through the restaurant's chosen process; record preparation started and completed when the milestone is confirmed | `orders.coordinate_preparation` |
| Ready to Serve | Ready orders with table/seat or collection reference | Mark as served or collected after it happens; actor and time are recorded | `orders.update_status` |
| Table and Seat Monitor | Active seating sessions, occupancy, open orders where supported | Inspect status; identify orders waiting for service; update only permitted session states | `tables.view`, `tables.update_session` |
| Payment Recording | Amount due, amount paid, method, reference, outstanding balance | Record authorized cash or other physical payments; record split payments where supported. Overpayments are rejected. Never mark an online payment successful without verified provider confirmation | `payments.view`, `payments.record_physical` |
| Customer Order Lookup | Search by order reference and permitted verification details | Find an order and give its status; only the information needed to serve that customer is shown | `customers.lookup` |
| Menu Availability (optional) | Meals with an available/unavailable switch | Mark a meal sold out or back in stock. Prices cannot be changed | `menu.set_availability` |
| Operational Reports | Order volume, processing time, service delays; sales summary only if granted | View permitted date ranges | `reports.view_operations`, `reports.view_sales` |
| Notifications | Events in Section 31.3 relevant to assigned duties | Read and act | — |
| My Account | Own profile, password and security settings, role summary | Update permitted personal details and credentials; cannot change own role or tenant | — |

## 26.3 Concurrency and conflict handling

Multiple managers may act on the same order. The server makes the first valid action win.

- If two managers try the same transition, the second sees a clear message such as "This order was already accepted by another manager" and the list refreshes. No duplicate transition is recorded.
- Every transition records the actor, time and previous state.
- A manager who loses a permission mid-session is denied on the next request, and the interface updates.

## 26.4 Manager overview widgets

| Widget | Definition | Default period |
|---|---|---|
| New orders awaiting action | Orders in Received state that the manager may act on | Current |
| Orders by state | Accepted, preparing, ready counts | Current |
| Awaiting payment confirmation | Remote orders not yet eligible for acceptance | Current |
| Delayed-order warnings | Orders past the owner's thresholds for their current state | Current |
| Completed today | Orders served or collected today | Today |
| Current workload | Orders in accepted, preparing or ready state | Current |

Sales figures do not appear on the Manager Dashboard unless `reports.view_sales` is granted.

## 26.5 Manager permissions and restrictions

By default, a manager may:

- View and process orders for their restaurant.
- Accept or reject orders according to restaurant policy.
- Update allowed order statuses.
- Coordinate preparation and serving.
- Monitor tables and seats.
- Record authorized physical payments.
- View operational alerts.
- View reports only if the owner grants the relevant permission.

By default, a manager may not:

- Register, approve, suspend or close a FairPrice tenant.
- Change restaurant ownership.
- Change the restaurant's subscription plan or billing account.
- Create or remove owner accounts.
- Invite or deactivate other staff unless explicitly permitted.
- Change menu prices or restaurant-wide settings unless explicitly permitted.
- Delete orders, payments or audit records.
- Mark an unverified online payment as successful.
- Access another restaurant's data.
- View platform-wide dashboards, revenue or tenant lists.

## 26.6 Manager permission catalogue

The owner grants or withholds these permissions. Keys marked **new** are added in Version 3.1 so every manager screen has a controlling permission.

| Permission | Allows | Default |
|---|---|:-:|
| `orders.view` | See current orders and their details | ● |
| `orders.accept` | Accept an incoming order | ● |
| `orders.reject` | Reject an incoming order with a reason | ● |
| `orders.update_status` | Perform allowed state transitions | ● |
| `orders.coordinate_preparation` **new** | Use Kitchen / Preparation Coordination and record preparation milestones | ● |
| `orders.view_history` **new** | Open Order History | ○ |
| `orders.cancel` | Cancel an accepted order with a reason | ○ |
| `customers.lookup` **new** | Use Customer Order Lookup | ● |
| `tables.view` | See the Table and Seat Monitor | ● |
| `tables.update_session` | Update table and seat session states | ○ |
| `payments.view` | See payment status and balances | ● |
| `payments.record_physical` | Record cash or other physical payments | ● |
| `payments.initiate_refund` | Start a refund (only if refunds are implemented) | ○ |
| `reports.view_operations` | See operational reports | ○ |
| `reports.view_sales` | See sales information | ○ |
| `reports.export` **new** | Export reports (format by plan) | ○ |
| `menu.view` | See the menu | ● |
| `menu.set_availability` **new** | Mark meals sold out or available | ○ |
| `menu.manage` | Change menu items, categories and prices | ○ |
| `staff.view` | See staff list | ○ |
| `staff.invite` | Invite staff | ○ |
| `staff.deactivate` **new** | Deactivate staff | ○ |
| `settings.manage` | Change restaurant-wide settings | ○ |

● = granted by default to a new manager; ○ = not granted unless the owner enables it. The initial manager role uses conservative defaults. The server checks each permission on every protected action.

**Permission presets [Proposed].** To avoid a full custom role editor in the first release while keeping the model extensible, the owner picks one of these presets and can adjust individual permissions:

| Preset | Contents |
|---|---|
| **Floor Manager** (default) | All ● defaults above |
| **Shift Lead** | Floor Manager + `orders.view_history` + `menu.set_availability` + `reports.view_operations` + `tables.update_session` |
| **Senior Manager** | Shift Lead + `orders.cancel` + `reports.view_sales` + `reports.export` + `staff.view` |

A full custom role editor can be deferred if it adds excessive complexity, but the permission model must allow it later.

## 26.7 Manager notifications

Managers receive new-order, delayed-order, payment-confirmation and operational alerts relevant to their permissions (Section 31.3). In-app alerts must be hard to miss during service, for example a visible and optional audible new-order alert **[Proposed]**.

## 26.8 Manager state behavior

Normal operation applies when the tenant is `ACTIVE` and the subscription is `TRIAL`, `ACTIVE`, `PAST_DUE` or `GRACE_PERIOD`. Under `PAST_DUE` and `GRACE_PERIOD`, managers see a generic notice with no billing details. Under restriction, managers see only what Section 29.3 allows. A manager's data masking rules are in Section 31.6.

## 26.9 Kitchen and waiters

Kitchen staff and waiters do not have accounts in the first release. Managers record their milestones. A read-only kitchen display for accepted orders, signed in with a limited kitchen role, may be considered later and would require its own definition here.

# 27. Customer experience and public ordering

Customers are not tenant administrators and have no FairPrice account in the initial release. They interact only with a restaurant's public menu and ordering journey.

## 27.1 What a customer can do

- Open a restaurant's public page or scan its QR code.
- See only that restaurant's published menu and current availability.
- Select multiple meals and quantities.
- Submit a dine-in order linked to the validated table/seat, or a remote order where enabled.
- Pay online for remote orders as required by the existing business rule (remote orders are prepaid before preparation).
- Receive an order reference and track permitted status information.
- Pay at the restaurant for dine-in orders according to that restaurant's configured policy.

A customer must not be able to browse a restaurant's private dashboard, staff list, internal reports, payment administration or another restaurant's records. Public routes must resolve the tenant from a trusted slug or signed, unguessable QR token, not from a freely editable tenant ID.

## 27.2 Public screen inventory

| Screen | Purpose | Shown to the customer | Not shown |
|---|---|---|---|
| Restaurant menu | Browse the published menu | Restaurant name and logo, categories, meals, descriptions, images, prices, current availability, opening information | Anything about other restaurants, staff or internal settings |
| Item detail and notes | Choose quantity and add a note | Meal details, quantity, optional note | — |
| Cart | Review the order | Items, quantities, server-calculated total | — |
| Checkout — dine-in | Confirm and submit | Confirmed table/seat, order summary, the restaurant's payment policy | — |
| Checkout — remote | Provide details and pay | Name and phone, collection information, total, payment method choices | Payment secrets; card data is handled only by the payment provider |
| Payment pending / failed / succeeded | Report payment outcome | Clear outcome and next step, such as "Retry payment" | Internal reconciliation detail |
| Order confirmation | Confirm receipt | Order reference, summary, expected next step | — |
| Order tracking | Follow progress | Customer-facing status (Section 27.4) after entering the order reference and phone verification | Staff names, internal notes, other orders |

## 27.3 Edge and error screens

Each of these is defined so the customer never sees a raw error or another tenant's information:

| Situation | Customer sees |
|---|---|
| QR code invalid, expired or revoked | "This code is no longer valid. Please ask staff for help." No restaurant internals |
| Table or seat inactive | "This table isn't taking orders right now. Please ask staff." |
| Restaurant outside opening information, or not yet live (`PENDING_SETUP`) | "This restaurant isn't taking orders right now." The menu may be viewable |
| Restaurant suspended, closed, or subscription restricted | "Ordering is temporarily unavailable." No reason is given |
| Remote ordering not enabled for this restaurant or plan | The remote option is not offered; a direct attempt is rejected |
| Item became unavailable or price changed between cart and submission | Updated cart with a short explanation; the server's current price and availability always apply |
| Tracking details do not match | Generic "We couldn't find that order" response; repeated attempts are rate-limited |

## 27.4 Customer-facing status wording

| Internal state | Customer sees |
|---|---|
| Awaiting payment confirmation (remote) | Waiting for payment |
| Received | Order received |
| Accepted | Order accepted |
| Preparing | Being prepared |
| Ready | Ready |
| Served / Collected | Completed |
| Rejected / Cancelled | Not going ahead; the restaurant's contact or next step is shown |

A rejection or cancellation reason may be shown to the customer only if the restaurant's settings allow it.

# 28. Self-registration with Platform Administrator approval

This is the confirmed onboarding model.

## 28.1 Registration journey

1. A prospective restaurant owner visits the FairPrice public website.
2. The owner selects **Register Restaurant**.
3. The owner enters business details, owner name, email/phone and password.
4. The system validates the fields and checks for likely duplicate applications.
5. The owner verifies the required email or phone contact.
6. The owner accepts the terms and privacy notice.
7. FairPrice creates a registration application with status `PENDING_APPROVAL`.
8. The owner receives confirmation that the application has been submitted and is awaiting review.
9. A permitted Platform Administrator sees the application in the Registration Approvals dashboard.
10. The administrator reviews the supplied information and chooses:
    - **Approve:** the tenant becomes eligible for activation and the owner receives an activation notice.
    - **Reject:** the application is rejected with a recorded reason and the owner is notified.
    - **Request information:** the application remains pending while the owner supplies the requested details.
11. After approval, the system creates or activates the tenant workspace, links the registering owner to it and assigns the initial plan/trial according to FairPrice policy.
12. The owner signs in and completes restaurant setup: profile, menu, tables/seats, QR codes and manager invitations.
13. The restaurant becomes operational only when the account, subscription and required setup conditions permit it.

## 28.2 Registration states

Recommended application states:

- `DRAFT`
- `PENDING_CONTACT_VERIFICATION`
- `PENDING_APPROVAL`
- `MORE_INFORMATION_REQUIRED`
- `APPROVED`
- `REJECTED`
- `WITHDRAWN`

Tenant account states remain separate:

- `PENDING_SETUP`
- `ACTIVE`
- `SUSPENDED`
- `CLOSED`

Subscription states remain separate as defined in Section 3.3. Do not overload one status field to represent application review, tenant account access and subscription payment.

## 28.3 Approval rules

- Only an authorized Platform Administrator can approve or reject an application.
- The person who submitted the application cannot approve it.
- Every decision records the administrator, timestamp, decision and reason.
- Approval must be idempotent: repeating the approval request must not create duplicate tenants or owner accounts.
- Rejection must not silently erase the application audit record.
- Requesting more information must notify the applicant and preserve the application.
- The owner must not access restaurant management functions before approval and activation.
- The platform may permit the applicant to sign in to a limited application-status page while approval is pending; this is not access to a tenant operations dashboard.
- Approval is not proof that subscription payment has succeeded. Subscription activation follows the selected plan/trial and payment policy.

## 28.4 Owner and tenant creation integrity

The system must create the tenant and initial owner relationship in a transaction or another reliable idempotent workflow. It must prevent:

- Two tenants being created from duplicate approval submissions.
- One owner's account accidentally being linked to the wrong tenant.
- An unapproved applicant becoming a tenant administrator.
- A manager account being created without an approved tenant context.
- A tenant being activated without a valid owner relationship.

## 28.5 Applicant status page

An applicant who signs in before approval sees a limited status page. It is not a tenant operations dashboard, and no tenant routes are reachable from it.

| Application state | What the applicant sees | Actions available |
|---|---|---|
| `DRAFT` | The incomplete application | Continue, edit, discard |
| `PENDING_CONTACT_VERIFICATION` | Which contact still needs verifying | Enter the code, resend the code, correct the contact detail |
| `PENDING_APPROVAL` | Submission date, a read-only copy of submitted details, "awaiting review" message | Withdraw the application; contact support |
| `MORE_INFORMATION_REQUIRED` | The administrator's request in clear language, with what is needed | Provide the information and resubmit; withdraw |
| `APPROVED` | Approval notice and next step | Continue to sign-in and setup (the tenant then starts in `PENDING_SETUP`) |
| `REJECTED` | The recorded reason as shared by the administrator | Appeal or submit a new application, depending on the open decision in Section 34 |
| `WITHDRAWN` | Confirmation that the application was withdrawn | Start a new application |

The page shows the application reference so support can find it. It never exposes internal review notes or other applicants.

# 29. Login, routing, restricted states and feature gating

## 29.1 Login, routing and dashboard landing rules

- Platform users sign in through the platform administration route and are authorized against platform roles and permissions.
- Restaurant owners and managers sign in through the restaurant user authentication flow.
- After authentication, the server derives the user's role and tenant association from trusted database records.
- A Restaurant Owner lands on the Owner Dashboard for their tenant.
- A Restaurant Manager lands on the Manager Dashboard for their tenant.
- Platform users land on the Platform Console (Overview or Support Inbox, by permission).
- A pending applicant sees only the applicant status page (Section 28.5) and permitted account actions.
- A suspended tenant's users see the restricted account page permitted by the account policy, not normal restaurant operations.
- A user cannot switch tenant by editing a URL or submitting another tenant identifier.
- If a person is legitimately associated with more than one tenant in a future release, tenant switching must be an explicit server-authorized selection and must not grant access to unassigned tenants.

**Landing matrix:**

| Signed-in identity and state | Lands on |
|---|---|
| Super Administrator, Platform Administrator | Platform Console → Platform Overview |
| Support Staff | Platform Console → Support Inbox |
| Applicant, application not approved | Applicant status page |
| Owner, tenant `PENDING_SETUP` | Owner Dashboard → Setup Checklist |
| Owner, tenant `ACTIVE`, subscription `TRIAL`, `ACTIVE`, `PAST_DUE`, `GRACE_PERIOD` | Owner Dashboard → Restaurant Overview |
| Owner, tenant `SUSPENDED` or subscription `SUSPENDED`, `CANCELLED`, `EXPIRED` | Restricted account page (owner view) |
| Owner, tenant `CLOSED` | Data export page, within the retention window **[Proposed]** |
| Manager, tenant `ACTIVE` and normal subscription | Manager Dashboard → Operations Overview |
| Manager, tenant `PENDING_SETUP` | "Restaurant is not live yet" notice |
| Manager, restricted state | Restricted account page (manager view) |
| Manager, tenant `CLOSED` or deactivated account | Cannot sign in; generic message |

## 29.2 Restricted account page

Shown when the tenant account or subscription restricts normal operation. Content differs by role.

| Element | Owner view | Manager view |
|---|---|---|
| Reason | Reason category (for example, unpaid subscription, policy matter) | "The restaurant's FairPrice account is currently restricted. Please contact your restaurant owner." |
| Actions | Open Subscription and Billing and pay; open Data Export; contact support; see reinstatement steps | Close-out tools only where Section 29.3 allows; otherwise none |
| Never shown | Internal platform notes | Billing details, owner-only information |

## 29.3 Subscription-state behavior **[Proposed defaults]**

Subscription states are defined in Section 3.3. The grace period length and the read-only and export policy are open decisions (Section 34). This matrix is the recommended starting policy, consistent with Section 3.3: restrict new operational activity after suspension, while the owner can still sign in, view billing, settle charges and request export.

| Capability | `TRIAL` | `ACTIVE` | `PAST_DUE` | `GRACE_PERIOD` | `SUSPENDED` | `CANCELLED` / `EXPIRED` |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| New public orders | Yes | Yes | Yes | Yes | No | No |
| Manager operations on open orders | Yes | Yes | Yes | Yes | Close-out only | No |
| Owner configuration (menu, tables, QR, staff, settings) | Yes | Yes | Yes | Yes | Read-only | Read-only |
| Historical orders, payments, reports | Yes | Yes | Yes | Yes | Read-only | Read-only until retention ends |
| Data export | Yes | Yes | Yes | Yes | Yes | Yes |
| Subscription and Billing | Yes | Yes | Yes | Yes | Yes | Yes |
| Support | Yes | Yes | Yes | Yes | Yes | Yes |
| Owner notice | Trial countdown | None | Payment overdue | Grace countdown | Suspension notice | Expiry and retention notice |
| Manager notice | None | None | Generic notice | Generic notice | Restricted page | Restricted page |

"Close-out only" means managers can finish orders already accepted (serve, collect, record payment) but cannot accept new orders. Subscription expiry or suspension never deletes data.

**Tenant account states:**

| Tenant state | Owner experience | Manager experience | Public experience |
|---|---|---|---|
| `PENDING_SETUP` | Setup Checklist and configuration screens; no live operations | "Not live yet" notice | "Not taking orders right now" |
| `ACTIVE` | Per subscription state above | Per subscription state above | Per subscription state above |
| `SUSPENDED` | Restricted account page; billing, export, support, read-only history | Restricted page or close-out only | "Ordering temporarily unavailable" |
| `CLOSED` | Data export during the retention window **[Proposed]** | Cannot sign in | "Ordering unavailable" |

Tenant account state and subscription state are separate. Where both restrict, the stricter applies.

## 29.4 Plan-based feature gating

Entitlements are stored as data (Section 3.2) and enforced by the server. The dashboards show the following. Exact Basic and Advanced contents are to be validated with pilot restaurants.

| Feature | Starter | Professional | Business | Dashboard effect |
|---|---|---|---|---|
| Remote ordering | Configurable | Included | Included | Settings toggle and public remote option appear only if enabled and entitled |
| Sales reports | Basic | Advanced | Advanced | Basic: daily totals and order counts. Advanced adds custom periods, category views and comparisons **[Proposed]** |
| Meal popularity | Basic | Advanced | Advanced | Basic: top meals. Advanced adds slow-selling, category filters and contribution **[Proposed]** |
| Manager accounts | Plan-limited | Higher limit | Higher limit | Staff screen shows usage against the limit and blocks invitations over it |
| Export | Basic | CSV | CSV and future formats | Data Export and report export offer only entitled formats |
| Multiple branches | Not included | Optional add-on | Included or configurable | No branch screens in the first release; the data model must not block it |
| Support | Standard | Priority | Priority | Ticket priority label and routing |

Locked features:

- The owner sees a locked item with a short explanation and an upgrade option.
- Managers never see upgrade prompts.
- The server rejects direct requests for entitlements the tenant does not have.
- A plan downgrade never deletes data; features the plan no longer includes become read-only or hidden as defined at the time of the plan change.

# 30. Cross-role workflows

## 30.1 Restaurant registration and approval

Applicant submits application → contact verification → pending approval → Platform Administrator reviews → approve/reject/request information → owner notified → tenant setup → subscription eligibility check → restaurant operational.

## 30.2 Owner creates a manager

Owner opens Staff Management → enters manager details → system sends invitation → manager verifies contact and sets credentials → system assigns the owner-selected tenant and role → manager signs in → manager sees only the Manager Dashboard and granted permissions.

## 30.3 Customer places a dine-in order

Customer scans tenant-specific QR → server validates restaurant/table/seat → customer selects menu items → server validates prices and availability → order is stored under that tenant → manager receives the order → manager coordinates preparation → manager records ready/served milestones → payment is recorded according to restaurant policy → order/report history is updated.

## 30.4 Customer places a remote order

Customer opens the restaurant-specific public menu → selects items → server calculates total → customer initiates online payment → payment provider callback is verified → order becomes eligible for manager acceptance/preparation → manager updates progress → customer tracks status → collection is recorded.

## 30.5 Subscription renewal

Owner views subscription → renewal invoice is issued → owner pays through configured FairPrice payment method → provider confirmation is verified → subscription state and next renewal date update → owner receives confirmation. This flow is separate from customer payment for meals.

## 30.6 Tenant suspension

Authorized platform user selects tenant → chooses suspension reason and effective policy → system records audit event → tenant access is restricted according to policy → owner receives notice and permitted billing/support access → reactivation occurs only through an authorized, audited process. Suspension does not delete historical restaurant records.

# 31. Dashboard-wide interface and usability requirements

## 31.1 General requirements

- Each dashboard must show the current account role and, for tenant users, the restaurant name.
- Navigation items must match the signed-in role and permissions.
- Dashboards must work on desktop, tablet and mobile browser sizes.
- Lists must support search, filtering, sorting and pagination where appropriate.
- Destructive or high-impact actions require confirmation and a reason where specified.
- Success and error messages must explain the outcome in clear language.
- Empty states must explain how to begin, for example, "No menu items yet — add your first category."
- Dashboard figures must show the date range and calculation meaning.
- Money values must use the tenant's configured currency; platform subscription reports use the currency and reporting rules configured by FairPrice.
- Sensitive data must be masked or withheld when not needed for the task.
- A dashboard card or hidden navigation item is never a substitute for server-side permission enforcement.

## 31.2 Metric glossary **[Proposed definitions]**

These definitions make dashboard and report figures consistent. The business must confirm them before pilot launch (Section 34).

| Term | Definition |
|---|---|
| Valid order | An order that has not been rejected or cancelled |
| Completed order | A valid order marked served (dine-in) or collected (remote) |
| Gross sales | Sum of server-calculated totals of valid orders placed in the period, based on immutable item and price snapshots |
| Recorded payments (cash received) | Sum of confirmed payment records in the period. Online payments count only after verified provider confirmation |
| Outstanding balance | Total of a valid order minus its confirmed payments; never negative because overpayments are rejected |
| Delayed order | An order that has spent longer in its current state than the owner's configured threshold for that state |
| Acceptance time | From received to accepted |
| Preparation time | From accepted to ready, as recorded by managers |
| Serving time | From ready to served or collected |
| Quantity sold | Sum of item quantities in valid orders in the period |
| Platform subscription revenue | Confirmed FairPrice subscription payments net of refunds and adjustments in the period; excludes all restaurant meal payments |
| Monthly recurring revenue | Active subscriptions normalized to a monthly amount (annual plans divided by 12) |

Sales, cash received and outstanding amounts are always presented separately.

## 31.3 Notification catalogue

In-app notification is required for every event below. Email and SMS delivery depend on provider configuration and are **[Proposed]** as optional channels.

| Event | Recipients | Priority |
|---|---|---|
| New order received | Managers with `orders.accept`; owner (by preference) | High |
| Remote payment confirmed (order now eligible) | Managers with `orders.accept` | High |
| Remote payment failed or unconfirmed after timeout | Managers with `payments.view`; owner | Medium |
| Order delayed beyond threshold | Managers; owner | High |
| Order rejected or cancelled | Owner; the acting manager | Medium |
| Payment recorded or corrected | Owner | Low |
| Staff invitation accepted or account deactivated | Owner | Low |
| Invoice issued, renewal reminder, payment failed, grace started, suspension, reinstatement | Owner (managers get a generic notice only when operations are affected) | High |
| Support ticket reply | Ticket creator | Medium |
| Platform announcement | Owner; managers optionally | Low |
| Registration decision or information request | Applicant | High |
| New registration pending; application waiting beyond a set time | Platform users with `registrations.decide` | Medium / High |
| Failed subscription payment | Platform users with `billing.view` | Medium |
| System incident | Platform users with `health.view` | High |
| Support ticket assigned | Assignee | Medium |
| Support-access request awaiting approval | Platform users with `support.access.approve` | Medium |
| Privileged security event | Super Administrator | High |

Notifications go only to recipients who hold the relevant permission in the relevant tenant or platform scope.

## 31.4 Standard interface states

Every screen defines these states:

- **Loading:** a visible loading indicator or placeholder.
- **Empty:** explains what the screen is for and how to begin.
- **No results:** explains the active filters and offers to clear them.
- **Validation error:** points to the field and says how to fix it.
- **Permission denied:** states that the action is not permitted and whom to ask, without revealing sensitive details.
- **Not found:** the same response for a record that does not exist and for one that belongs to another tenant.
- **Service unavailable and maintenance:** a clear message and, where possible, an expected return time.
- **Session expired:** returns the user to sign-in without losing unsaved input where practical.
- **Slow or lost connection:** shows that data may be out of date and retries safely.

## 31.5 Device priorities

| Surface | Primary device | Requirements |
|---|---|---|
| Manager Dashboard | Phone and tablet | Queue screens as cards; large, one-handed tap targets for status actions; fast refresh; visible new-order alert |
| Owner Dashboard | Phone and desktop | Overview readable on a phone; wide report tables scroll inside their own container |
| Platform Console | Desktop first; usable on tablet | Dense tables and filters; approval and incident actions usable on tablet |
| Public customer screens | Phone | Lightweight pages, quick load on slow connections, images loaded lazily **[Proposed]** |
| Applicant status page | Phone and desktop | Short, clear steps |

## 31.6 Privacy and data masking **[Proposed]**

- Customer phone numbers are masked in manager lists and shown in full only on the order detail where needed to serve the customer.
- Exports exclude customer contact details unless the user's permission explicitly includes them.
- Payment references are partially masked outside the Payments screen.
- Platform users never see tenant customer or financial data except through approved support access (Section 24.7).
- Secrets and provider credentials are never displayed in full after saving.

## 31.7 Session and security

- Privileged platform accounts require stronger authentication.
- Idle sessions expire after a configurable period **[Proposed]**.
- Sign-in, permission changes and sensitive actions are audited.

# 32. Minimum acceptance tests for roles and dashboards

The release is not accepted until the following tests pass:

1. A new restaurant owner can submit a self-registration application.
2. The applicant cannot access restaurant operations while approval is pending.
3. An authorized Platform Administrator can approve the application.
4. Approval creates exactly one tenant and one initial owner relationship.
5. A rejected applicant cannot enter an active tenant workspace.
6. The approved owner lands on the Owner Dashboard for the correct restaurant.
7. The owner can configure the menu, tables, seats and QR codes for that tenant.
8. The owner can invite a manager who is linked to the same tenant.
9. The manager lands on the Manager Dashboard and sees only permitted sections.
10. A manager cannot access owner-only subscription, ownership or staff administration actions unless explicitly granted.
11. A manager cannot mark an online payment successful without verified payment confirmation.
12. A Platform Administrator cannot access Super Administrator functions unless explicitly authorized.
13. A restaurant owner cannot access platform-wide tenant lists or subscription revenue.
14. Restaurant A cannot read, update, delete, search, export or infer Restaurant B's private records.
15. Public customer routes show only the selected restaurant's public menu and order journey.
16. Subscription invoices and payments are not mixed with restaurant meal transactions.
17. Tenant suspension restricts access according to policy but does not delete historical records.
18. All approvals, rejections, suspensions, permission changes and financial corrections create audit records.

**Additional dashboard acceptance tests (Version 3.1):**

19. The Platform Console navigation shows each of Super Administrator, Platform Administrator and Support Staff only the sections their permissions allow.
20. A default Platform Administrator cannot open Plans management, Billing and Revenue, Platform Users or Configuration, including by direct URL.
21. A platform user cannot grant themselves a permission. Only a user holding `platform_users.manage` can change platform permissions, and the change is audited.
22. The Support Staff Tenant Directory shows only the permitted metadata and no orders, customers, payments, staff lists or revenue.
23. A support-access request requires a reason, scope and duration. The approver cannot be the requester, access expires automatically and each area viewed is audited.
24. Platform revenue widgets exclude restaurant meal payments, verified with test data containing both kinds of payment.
25. Each Platform Overview widget count matches the list opened by its drill-down.
26. The Owner Dashboard shows the grouped navigation and shows the Setup Checklist until go-live conditions are met.
27. A tenant in `PENDING_SETUP` shows public customers the "not taking orders" screen, lets the owner configure, and shows managers a "not live yet" notice.
28. Owner overview figures reconcile with Payments and Sales Reports for the same period (gross sales, recorded payments and outstanding amounts).
29. The owner can assign a manager preset or individual permissions; the change applies on the manager's next request and is audited.
30. A manager without `orders.view_history` cannot see Order History in navigation or open it by URL.
31. A manager with default permissions cannot see sales reports, edit menu prices, or reach subscription and staff administration.
32. When two managers act on the same order at once, the second transition is rejected with a clear message, no duplicate transition is stored, and the audit trail shows both attempts.
33. A remote order cannot be accepted before verified payment, and the manager interface shows "Awaiting payment confirmation".
34. Payment Recording rejects an overpayment.
35. Manager lists and lookup mask customer contact details as defined in Section 31.6.
36. On a Starter-plan tenant, Basic reports appear; Advanced reports and CSV export show a locked state with an upgrade prompt for the owner only, and the server rejects direct requests for them.
37. An owner at the manager-account limit sees usage against the limit and cannot invite another manager.
38. When remote ordering is not enabled, the public page omits the remote option and a direct remote order submission is rejected.
39. Under `PAST_DUE` and `GRACE_PERIOD`, operations continue; the owner sees a billing notice and managers see only a generic notice without billing details.
40. Under `SUSPENDED`, public ordering shows "temporarily unavailable"; the owner can reach Billing, Data Export, Support and read-only history; managers can only close out accepted orders; no data is deleted.
41. Under `CLOSED`, managers cannot sign in, the owner reaches only Data Export within the retention window, and the public link shows "ordering unavailable".
42. Each application state shows its defined message and only its permitted actions, and the applicant cannot reach any tenant route.
43. An invalid, revoked or inactive QR code shows the defined customer screen without exposing tenant internals, and a revoked token cannot be reused.
44. When price or availability changes between cart and submission, the customer sees the updated cart and the server's current total is used.
45. Order tracking requires the order reference and phone verification; wrong details give a generic response and repeated attempts are rate-limited.
46. Requesting another tenant's record ID returns the same "not found" response as a nonexistent ID.
47. Notifications reach only recipients who hold the relevant permission in the correct tenant or platform scope.
48. Every dashboard works at phone, tablet and desktop widths, and the Manager queue screens are fully usable on a phone.
49. Dashboard figures show their date range and calculation meaning.
50. The Platform Console is visually distinct from tenant dashboards and shows the "FairPrice Platform" label.

# 33. Updated implementation sequence

The detailed role model changes the implementation order. Build the authorization foundation before building all dashboard screens.

1. **Identity and role foundations:** Separate platform identities/permissions from tenant identities/permissions; implement secure login and account recovery.
2. **Tenant and registration workflow:** Create registration applications, contact verification, approval queue, tenant creation and initial owner linkage.
3. **Tenant context and isolation:** Add tenant resolution to requests and enforce tenant scoping in repositories/services, exports, files, jobs and payment callbacks.
4. **Platform administration:** Build registration approvals, tenant account management, platform audit and essential monitoring.
5. **Owner workspace:** Build profile/setup, menu, tables/seats, QR codes, staff invitations, role assignment and subscription view.
6. **Manager workspace:** Build incoming orders, active orders, status transitions, table monitoring, payment recording and permission-limited reports.
7. **Customer public journeys:** Complete tenant-specific menu, QR, dine-in and remote order flows.
8. **Subscription billing:** Implement plan entitlements, invoices, subscription payments, renewal, overdue and suspension policy.
9. **Cross-role verification:** Test the workflows and all cross-tenant denial cases with multiple independent test tenants.
10. **Pilot launch:** Onboard pilot restaurants, observe real usage, fix defects and validate commercial pricing and operating costs.

## 33.1 Dashboard build notes (Version 3.1)

- Build the Platform Console permission catalogue (Section 24.2) in step 1 with the role foundations, so every later screen can reference a permission.
- Build one dashboard shell (Section 23.3) with banners, grouped navigation and standard states (Section 31.4) before individual screens.
- Build tenant-state and subscription-state handling (Section 29) with the tenant context in step 3, not as a late add-on.
- Confirm that the data model in Section 12 has a place for: platform permission assignments, support-access requests and grants, notifications and notification preferences, manager permission presets, setup checklist and go-live readiness, plan entitlements and usage limits, and data export requests.
- Define the exact order-state enumeration and metric rules (Sections 26.1 and 31.2) before building reports, so dashboards and reports agree.

# 34. Decisions confirmed and decisions still open

## Confirmed

- FairPrice is one centrally operated multi-tenant SaaS platform.
- Multiple independent restaurants use the same application.
- Each restaurant has its own tenant workspace and isolated business data.
- Restaurant owners and managers are tenant-level users.
- Platform administration is separate from restaurant administration.
- Restaurants can self-register.
- A Platform Administrator must approve each new restaurant before it becomes operational.
- Restaurant managers work under the restaurant owner and receive restricted permissions.
- Existing ordering, QR, payment and reporting functionality remains the restaurant operations core, adapted for tenant isolation.

## Still to decide

- Whether the first release supports one branch per tenant or multiple branches.
- Whether approved restaurants receive a free trial and its duration.
- Final subscription prices, plan limits and payment provider.
- Exact verification method for owner email/phone and any additional business checks.
- Whether a rejected applicant may appeal or submit a new application.
- Whether custom manager roles are included in the first release or deferred.
- Exact suspension grace period and read-only/data-export policy.
- Final production hosting and database arrangement.

## Proposed in Version 3.1 — pending confirmation

These recommendations are written into Sections 24–31 and marked **[Proposed]**. Each needs a decision.

- One shared Platform Console filtered by permission, instead of separate dashboards per platform role (Section 24.1).
- Platform permission catalogue and default role matrix (Section 24.2).
- Support-access rules: default duration, approver separate from requester, owner notification, and whether platform users may ever change tenant data (Section 24.7).
- Merging "Orders" and "Customers / Order Records" into one owner section (Section 25.1).
- Go-live readiness conditions for a tenant leaving `PENDING_SETUP` (Section 25.4).
- Manager permission keys added in 3.1 and the three presets (Section 26.6).
- Metric definitions: valid order, gross sales, delayed order and related terms (Section 31.2), including delay thresholds.
- Subscription-state behavior, grace period length, read-only period and retention window (Section 29.3).
- Exact contents of Basic and Advanced reports for each plan (Section 29.4).
- Data masking rules for customer and payment details (Section 31.6).
- Email and SMS as optional notification channels (Section 31.3).
- Whether a read-only kitchen display should be planned for a later release (Section 26.9).

---

**Version 3.1 rule:** The role definitions, dashboard specifications, registration approval workflow, state matrices, permissions and acceptance tests in Sections 23–34 are the authoritative detailed specification. If a shorter description elsewhere in this document conflicts with them, Sections 23–34 take precedence. Items marked **[Proposed]** are recommendations until they are confirmed and moved to the "Confirmed" list in Section 34.
