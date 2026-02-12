# 📄 SSOT_LEGAL.md

Version: 1.1  
Status: LOCKED (Platform-Only Model)  
Owner: Founder / Product  
Effective Date: 2026-02-12  
Supersedes: v1.0  

---

# 1. Purpose

This document defines and permanently locks the legal architecture of Need4Trip (N4T).

It establishes:

- Legal classification of the platform  
- Liability boundaries  
- Revenue model constraints  
- Architectural red lines  
- Mandatory legal documentation structure  
- Risk containment strategy  

This SSOT has governance priority over product decisions that may materially increase regulatory or liability exposure.

---

# 2. Platform Legal Classification

## 2.1 Legal Status

N4T is classified as:

> A technology platform providing digital tools that allow users to create, publish, discover, and communicate regarding community events.

N4T is NOT:

- An event organizer  
- A tour operator  
- A travel agency  
- A ticket seller  
- A marketplace for goods  
- A payment intermediary for event participation  
- An escrow provider  
- An agent or representative of organizers  
- A party to any agreement between users  

---

## 2.2 Core Non-Participation Principle

N4T does not participate in offline relationships between users.

All agreements regarding participation in events are concluded directly between users outside the platform.

N4T does not guarantee:

- Event execution  
- Safety  
- Organizer competence  
- Event accuracy  
- Legal compliance of events  

---

# 3. Business Model Boundaries

## 3.1 Permitted Revenue Streams

N4T MAY generate revenue through:

1. Subscription fees for access to digital platform features  
2. Premium feature upgrades  
3. Visibility boosts / ranking features  
4. Advertising placements  
5. Sponsored content  

All monetization must relate exclusively to digital platform functionality or visibility.

---

## 3.2 Prohibited Revenue Streams

N4T MUST NOT:

- Collect payments for event participation  
- Act as intermediary for ticket sales  
- Hold funds on behalf of organizers  
- Process participant-to-organizer payments  
- Take commission from event participation fees  
- Guarantee event delivery  

Any such feature requires formal reclassification of the platform model and amendment of this SSOT.

---

# 4. Liability Architecture

## 4.1 Assumption of Risk (Off-Road Context)

Users acknowledge that off-road and automotive activities involve inherent risks, including:

- Personal injury  
- Vehicle damage  
- Property damage  
- Environmental risks  

Participation in any event is voluntary and at the user's own risk.

N4T bears no responsibility for physical, material, or financial harm resulting from participation in user-organized activities.

---

## 4.2 Limitation of Liability

N4T liability shall be limited to:

- Direct damages only  
- A capped amount equal to fees paid for access to platform features during the preceding 12 months  

N4T shall not be liable for:

- Indirect damages  
- Lost profits  
- Reputational harm  
- Event cancellation  
- User misconduct  

---

## 4.3 User-Generated Content

Users are solely responsible for:

- Event descriptions  
- Safety claims  
- Promotional statements  
- Uploaded media  
- Communications  

N4T acts as a hosting provider and does not pre-approve or verify user content.

N4T reserves the right (but not obligation) to remove content.

---

# 5. Moderation & Enforcement

## 5.1 Right to Suspend

N4T may suspend or terminate accounts for:

- Violations of Terms  
- Illegal content  
- Unsafe activities  
- Abuse of platform functionality  
- Reputational risk to the platform  

Suspension may occur without prior notice.

---

## 5.2 Content Removal

N4T may remove events or content at its sole discretion.

Moderation does not imply endorsement or validation.

---

# 6. Data & Privacy Principles

N4T processes:

- Telegram identifiers  
- Account data  
- IP addresses  
- Device data  
- Logs  
- Platform activity data  

Third-party processors may include:

- Hosting providers  
- Database providers  
- Analytics tools  

Cross-border data transfer may occur where technically necessary.

Users retain rights to:

- Access  
- Correction  
- Deletion  
- Account termination  

---

# 7. Advertising Framework

If advertising is enabled:

- N4T sells digital advertising space only  
- N4T does not guarantee performance  
- N4T does not verify advertiser legality beyond basic moderation  
- Advertisers are solely responsible for claims  

Advertising does not imply endorsement.

---

# 8. Governance & Jurisdiction

Governing Law: Republic of Kazakhstan  
Dispute Resolution: Competent courts of Kazakhstan  

Future arbitration mechanisms may be introduced.

---

# 9. Architectural Red Lines

The following features are STRICTLY PROHIBITED under the current model:

- In-platform ticket checkout  
- Event payment processing  
- Revenue sharing with organizers  
- Escrow wallet functionality  
- Platform-issued participation confirmation certificates  
- Platform-backed insurance  

Adding any of the above requires:

1. Formal risk review  
2. Legal model reclassification  
3. Updated SSOT_LEGAL version  
4. Updated Terms of Service  

---

# 10. Legal Documentation Architecture

This section defines the mandatory legal document stack for N4T.

All legal documents must be:

- Publicly accessible
- Versioned
- Linked in footer
- Referenced inside Terms of Service
- Stored in repository under `/docs/legal/`

---

## 10.1 Core Public Legal Documents (Mandatory)

### 1️⃣ Terms of Service  
File: `/docs/legal/terms-of-service.md`  
Route: `/legal/terms`

Purpose:
- Defines platform status
- Defines liability limitations
- Defines user obligations
- Defines governing law
- Incorporates all other policies by reference

Priority: Highest  
Owner: Founder  

---

### 2️⃣ Privacy Policy  
File: `/docs/legal/privacy-policy.md`  
Route: `/legal/privacy`

Purpose:
- Data categories processed
- Legal basis
- Data retention
- Third-party processors
- Cross-border transfer
- User rights

Must reflect actual technical architecture (Telegram login, Supabase, analytics).

---

### 3️⃣ Acceptable Use Policy  
File: `/docs/legal/acceptable-use-policy.md`  
Route: `/legal/acceptable-use`

Purpose:
- Prohibited activities
- Illegal content restrictions
- Unsafe event prohibitions
- Enforcement rights

Referenced by Terms of Service.

---

### 4️⃣ Advertising Terms (Conditional)  
File: `/docs/legal/advertising-terms.md`  
Route: `/legal/advertising`

Required when paid advertising is enabled.

Purpose:
- Defines advertising service scope
- Disclaims performance guarantees
- Assigns responsibility to advertiser
- Defines payment terms for ad placements

---

## 10.2 Internal Legal Governance Documents (Non-Public)

These documents are not public but must exist internally.

---

### 5️⃣ SSOT_LEGAL.md  
File: `/docs/ssot/SSOT_LEGAL.md`

Purpose:
- Locks legal model
- Defines architectural boundaries
- Prevents accidental regulatory shift

Governance-level document.

---

### 6️⃣ Incident Response & Legal Escalation Policy  
File: `/docs/legal/internal/incident-response.md`

Purpose:
- Defines process for:
  - Injury claims
  - Legal threats
  - Government requests
  - Data breach
- Defines response timeline
- Defines communication authority

---

### 7️⃣ Moderation & Suspension Framework  
File: `/docs/legal/internal/moderation-framework.md`

Purpose:
- Defines moderation thresholds
- Defines suspension process
- Defines appeal process
- Protects against arbitrary enforcement claims

---

# 11. Document Hierarchy

Legal document precedence:

1. SSOT_LEGAL.md (architecture-level)
2. Terms of Service
3. Privacy Policy
4. Acceptable Use Policy
5. Advertising Terms

In case of conflict:
Terms of Service prevails over subordinate policies.

---

# 12. Required UX Integration

The following UI integrations are mandatory:

## 12.1 Registration

Checkbox:

☐ I agree to the Terms of Service and Privacy Policy

Must link to:
- `/legal/terms`
- `/legal/privacy`

Consent must be logged in database with:
- timestamp
- IP
- version hash of document

---

## 12.2 Footer

Footer must include:

- Terms
- Privacy
- Acceptable Use
- Advertising (when active)

---

## 12.3 Versioning

Each legal document must contain:

- Version number
- Effective date
- Change summary (when updated)

Document updates must trigger:

- Version increment
- Optional user notification (if material changes)

---

# 13. Change Control

Any product feature that:

- Introduces financial intermediation  
- Creates implied organizer endorsement  
- Assumes safety oversight  
- Introduces mandatory verification  

Triggers mandatory legal review.

The following actions require legal document updates:

- Adding new monetization method
- Introducing payment processing
- Adding verification/KYC
- Introducing in-app transaction features
- Introducing reputation scoring impacting visibility

Failure to update legal documentation before release is a governance violation.

Amendments to this SSOT require:

- Version increment  
- Explicit approval by Founder  
- Documentation of risk impact  

---

# 14. Model Stability Statement

N4T is permanently structured as a technology infrastructure platform.

Any evolution toward marketplace, tour operator, or payment intermediary status constitutes a fundamental change in legal architecture and is outside the scope of this SSOT.

Any expansion beyond the boundaries defined in SSOT_LEGAL.md requires:

1. Legal reclassification review  
2. Risk matrix update  
3. SSOT version increment  
4. Terms of Service revision  

---

END OF DOCUMENT
