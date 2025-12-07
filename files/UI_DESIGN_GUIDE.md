# FitFlow - Complete UI Design Guide
## All Pages, Elements & Interactions

**Version:** 1.0  
**Last Updated:** November 28, 2025  
**Purpose:** UI Element Reference for All Pages

---

## TABLE OF CONTENTS

1. [Authentication Pages](#1-authentication-pages)
   - Login
   - Signup
   - Forgot Password
   - Verify Email
   - Gym Onboarding
2. [Dashboard](#2-dashboard)
3. [Members Module](#3-members-module)
   - Members List
   - Add Member
   - Member Details
   - Edit Member
4. [Payments Module](#4-payments-module)
   - Payment Calendar
   - Payment Records
   - Payments List
5. [Calendar Page](#5-calendar-page)
6. [Plans Management](#6-plans-management)
7. [Classes Module](#7-classes-module)
   - Classes List
   - Class Schedule
8. [Check-in Page](#8-check-in-page)
9. [Staff Management](#9-staff-management)
10. [Leads Management](#10-leads-management)
11. [Reports Dashboard](#11-reports-dashboard)
12. [Settings](#12-settings)
13. [Common Components](#13-common-components)

---

## 1. AUTHENTICATION PAGES

### 1.1 Login Page

**Purpose:** Allow existing users to authenticate and access the gym management system.

**Layout:** Full-screen, centered card on gradient background.

**Elements:**

| Element | Type | Description |
|---------|------|-------------|
| App Logo | Image | FitFlow logo at top center |
| Welcome Text | Heading | "Welcome Back" |
| Subtitle | Text | "Sign in to your account" |
| Email Input | Text Field | Email address with validation |
| Password Input | Password Field | Password with show/hide toggle |
| Remember Me | Checkbox | Optional session persistence |
| Forgot Password | Link | Navigate to forgot password page |
| Sign In Button | Primary Button | Submit login credentials |
| Divider | Line | "OR" divider |
| Google Sign In | Social Button | Google OAuth login |
| Sign Up Link | Text + Link | "Don't have an account? Sign up" |

**Validation:**
- Email: Required, valid email format
- Password: Required, minimum 6 characters

**Error States:**
- Invalid credentials toast/alert
- Network error message
- Email not verified message

---

### 1.2 Signup Page

**Purpose:** Allow new gym owners to register their account.

**Layout:** Full-screen, centered card on gradient background.

**Elements:**

| Element | Type | Description |
|---------|------|-------------|
| App Logo | Image | FitFlow logo at top center |
| Title | Heading | "Create Account" |
| Subtitle | Text | "Start managing your gym today" |
| Full Name Input | Text Field | User's full name |
| Email Input | Text Field | Email address with validation |
| Phone Input | Phone Field | With +91 country code prefix |
| Password Input | Password Field | With strength indicator |
| Confirm Password | Password Field | Must match password |
| Terms Checkbox | Checkbox | Accept terms & conditions |
| Create Account Button | Primary Button | Submit registration |
| Divider | Line | "OR" divider |
| Google Sign Up | Social Button | Google OAuth signup |
| Login Link | Text + Link | "Already have an account? Sign in" |

**Validation:**
- Full Name: Required, minimum 2 characters
- Email: Required, valid format, unique
- Phone: Required, 10 digits
- Password: Required, 8+ chars, 1 uppercase, 1 number
- Confirm Password: Must match
- Terms: Must be checked

---

### 1.3 Forgot Password Page

**Purpose:** Allow users to reset their password via email.

**Layout:** Full-screen, centered card.

**Elements:**

| Element | Type | Description |
|---------|------|-------------|
| Back Button | Icon Button | Return to login |
| Title | Heading | "Forgot Password?" |
| Subtitle | Text | "Enter your email to receive reset link" |
| Email Input | Text Field | User's registered email |
| Send Reset Link Button | Primary Button | Trigger password reset email |
| Back to Login Link | Text + Link | Return to login page |

**Success State:**
- Success message: "Check your email for reset link"
- Email icon animation

---

### 1.4 Verify Email Page

**Purpose:** Confirm user email after signup or email change.

**Layout:** Full-screen, centered content.

**Elements:**

| Element | Type | Description |
|---------|------|-------------|
| Email Icon | Animated Icon | Mail/envelope animation |
| Title | Heading | "Verify Your Email" |
| Description | Text | "We've sent a verification link to your email" |
| Email Display | Text | Show the email address |
| Resend Link Button | Secondary Button | Resend verification email |
| Change Email Link | Text Link | Go back to change email |
| Continue Button | Primary Button | Check verification status |

---

### 1.5 Gym Onboarding Page

**Purpose:** Collect gym details after first signup to complete profile.

**Layout:** Multi-step wizard/form.

**Step 1: Gym Details**

| Element | Type | Description |
|---------|------|-------------|
| Progress Bar | Progress Indicator | Step 1 of 3 |
| Title | Heading | "Tell us about your gym" |
| Gym Name Input | Text Field | Name of the gym |
| Gym Logo Upload | File Upload | Optional logo image |
| Address Input | Text Area | Full gym address |
| City Input | Text Field | City name |
| Phone Input | Phone Field | Gym contact number |
| Next Button | Primary Button | Go to step 2 |

**Step 2: Business Settings**

| Element | Type | Description |
|---------|------|-------------|
| Progress Bar | Progress Indicator | Step 2 of 3 |
| Title | Heading | "Business Settings" |
| Currency Selector | Dropdown | INR, USD, etc. |
| Timezone Selector | Dropdown | IST default |
| Language Selector | Dropdown | English, Telugu, Tamil, Hindi |
| GST Number Input | Text Field | Optional GST registration |
| Next Button | Primary Button | Go to step 3 |
| Back Button | Secondary Button | Go to step 1 |

**Step 3: First Plan**

| Element | Type | Description |
|---------|------|-------------|
| Progress Bar | Progress Indicator | Step 3 of 3 |
| Title | Heading | "Create your first plan" |
| Plan Name Input | Text Field | e.g., "Monthly Plan" |
| Plan Duration | Dropdown | Monthly, Quarterly, Annual |
| Plan Amount Input | Number Field | Price in selected currency |
| Skip Button | Text Link | Skip and finish later |
| Complete Setup Button | Primary Button | Finish onboarding |

**Success State:**
- Confetti animation
- "Your gym is ready!" message
- Go to Dashboard button

---

## 2. DASHBOARD

**Purpose:** Quick overview of daily operations - today's dues, overdue members, and quick actions.

**Layout:** Fixed full-screen with header, summary bar, and two-column scrollable content.

### Header Section

| Element | Type | Description |
|---------|------|-------------|
| Date Display | Text | Today's date (e.g., "Friday, November 28") |
| Title | Heading | "Dashboard" |

### Summary Bar (Glassmorphic Card)

| Element | Type | Description |
|---------|------|-------------|
| Due Today Section | Stat Block | Total amount due today + member count |
| Divider | Vertical Line | Visual separator |
| Overdue Section | Stat Block | Total overdue amount + member count |

### Main Content - Two Columns

**Left Column: Due Today**

| Element | Type | Description |
|---------|------|-------------|
| Section Header | Text | "Due Today" with status dot |
| Member Count Badge | Badge | Number of members |
| Member Cards | Card List | Scrollable list of member cards |

**Right Column: Overdue**

| Element | Type | Description |
|---------|------|-------------|
| Section Header | Text | "Overdue" with status dot |
| Member Count Badge | Badge | Number of members |
| Member Cards | Card List | Scrollable list of overdue member cards |

### Member Card Elements

| Element | Type | Description |
|---------|------|-------------|
| Status Accent Bar | Colored Line | Left edge indicator (green/red) |
| Member Avatar | Avatar/Image | Profile photo or initials |
| Member Name | Text | Full name |
| Amount Due | Text | ₹ amount |
| Days Late Badge | Badge | Only for overdue (e.g., "5d late") |
| Due Date | Text | Date payment was due |

**Card Tap Action:** Opens Member Action Popup

### Member Action Popup (Bottom Drawer)

**Purpose:** Quick actions on a member without leaving dashboard.

**Layout:** Glassmorphic bottom sheet/drawer sliding up from bottom.

**Header Section:**

| Element | Type | Description |
|---------|------|-------------|
| Drag Handle | UI Element | Horizontal bar to indicate draggable |
| Close Button | Icon Button | X button to dismiss |
| Member Avatar | Large Avatar | Profile photo or initials |
| Member Name | Heading | Full name |
| Phone Number | Text | Contact number |
| Amount Due Badge | Badge | Amount with late indicator |

**Tab Navigation:**

| Tab | Icon | Purpose |
|-----|------|---------|
| Notify | Message Icon | Send WhatsApp/Call |
| Edit | Pencil Icon | Edit member details |
| Pay | Credit Card Icon | Record payment |
| Status | Power Icon | Activate/Deactivate |

**Tab 1: Notify Content**

| Element | Type | Description |
|---------|------|-------------|
| WhatsApp Card | Action Card | Send reminder via WhatsApp |
| WhatsApp Button | Primary Button | Opens WhatsApp with pre-filled message |
| Call Button | Secondary Button | Initiate phone call |

**Tab 2: Edit Content**

| Element | Type | Description |
|---------|------|-------------|
| Full Name Input | Text Field | Editable name |
| Phone Input | Text Field | Editable phone |
| Save Changes Button | Primary Button | Save edits |

**Tab 3: Pay Content**

| Element | Type | Description |
|---------|------|-------------|
| Amount Display | Large Text | Amount due |
| Plan Info | Info Row | Current plan name |
| Record Payment Button | Primary Button | Mark as paid |

**Tab 4: Status Content**

| Element | Type | Description |
|---------|------|-------------|
| Status Info | Text | Explain deactivation |
| Deactivate Button | Danger Button | Deactivate member |

---

## 3. MEMBERS MODULE

### 3.1 Members List Page

**Purpose:** View, search, and manage all gym members.

**Layout:** Full-screen with fixed header, search, filters, and scrollable member list.

### Header Section

| Element | Type | Description |
|---------|------|-------------|
| Back Button | Icon Button | Navigate back (if applicable) |
| Title | Heading | "Members" |
| Add Button | Icon Button | Navigate to Add Member |

### Search & Filter Bar

| Element | Type | Description |
|---------|------|-------------|
| Search Input | Text Field | Search by name or phone |
| Filter Toggle | Button/Icon | Show/hide filter options |
| Status Filter | Chip Group | All, Active, Inactive, Expired |
| Plan Filter | Dropdown | Filter by membership plan |
| Sort Options | Dropdown | Name A-Z, Recent, Expiring Soon |

### Member List

| Element | Type | Description |
|---------|------|-------------|
| Member Card | Card | Repeating list item |
| Avatar | Avatar/Image | Member photo or initials |
| Name | Text | Member full name |
| Phone | Text | Phone number |
| Plan Badge | Badge | Current membership plan |
| Status Badge | Badge | Active/Expired/Inactive |
| Expiry Date | Text | Membership end date |
| Amount Indicator | Text | If payment due, show amount |

**Card Tap Action:** Navigate to Member Details

### Empty State

| Element | Type | Description |
|---------|------|-------------|
| Empty Icon | Icon/Illustration | No members icon |
| Empty Text | Text | "No members yet" |
| Add First Member Button | Primary Button | Navigate to Add Member |

---

### 3.2 Add Member Page

**Purpose:** Register a new gym member with all details and payment.

**Layout:** Multi-step form wizard OR single scrollable form.

### Step 1: Personal Details

| Element | Type | Description |
|---------|------|-------------|
| Photo Upload | Image Picker | Camera or gallery upload |
| Full Name Input | Text Field | Required |
| Phone Input | Phone Field | With +91 prefix, required |
| Email Input | Text Field | Optional |
| Gender Selection | Radio/Segment | Male, Female, Other |
| Date of Birth | Date Picker | Optional, for age calculation |
| Address Input | Text Area | Optional |
| Emergency Contact | Text Field | Optional |
| Emergency Phone | Phone Field | Optional |

### Step 2: Membership Details

| Element | Type | Description |
|---------|------|-------------|
| Plan Selection | Card List/Radio | Select from available plans |
| Plan Details | Info Block | Price, duration, features |
| Start Date | Date Picker | Defaults to today |
| End Date | Auto Display | Calculated from plan duration |
| Assign Trainer | Dropdown | Optional trainer assignment |

### Step 3: Payment

| Element | Type | Description |
|---------|------|-------------|
| Plan Amount | Display | Total amount |
| Discount Input | Number Field | Optional discount |
| Final Amount | Display | After discount |
| Payment Method | Radio/Segment | Cash, UPI, Card, Bank Transfer |
| Payment Status | Toggle | Paid / Pay Later |
| Transaction ID | Text Field | If paid via digital method |
| Notes | Text Area | Optional payment notes |

### Submit Section

| Element | Type | Description |
|---------|------|-------------|
| Summary Card | Info Card | Review all entered details |
| Add Member Button | Primary Button | Submit and create member |
| Cancel Button | Secondary Button | Discard and go back |

### Success Popup

| Element | Type | Description |
|---------|------|-------------|
| Success Icon | Animated Icon | Checkmark animation |
| Title | Heading | "Member Added!" |
| Member ID | Text | Auto-generated ID |
| QR Code | QR Image | For check-in |
| Share Button | Secondary Button | Share via WhatsApp |
| View Profile Button | Primary Button | Go to member details |
| Add Another Button | Text Link | Add another member |

---

### 3.3 Member Details Page

**Purpose:** View complete member profile, history, and take actions.

**Layout:** Scrollable page with header, profile card, tabs for different sections.

### Header Section

| Element | Type | Description |
|---------|------|-------------|
| Back Button | Icon Button | Return to list |
| Edit Button | Icon Button | Go to edit page |
| More Options | Icon Button | Menu with more actions |

### Profile Card

| Element | Type | Description |
|---------|------|-------------|
| Cover Photo | Image | Optional cover/background |
| Avatar | Large Avatar | Profile photo with status ring |
| Name | Heading | Full name |
| Member ID | Text | Unique ID (e.g., FM-0234) |
| Phone | Text + Call Button | Click to call |
| Email | Text | If available |
| Status Badge | Large Badge | Active/Expired/Inactive |
| QR Code | Small QR | Tap to enlarge |

### Quick Action Buttons (Horizontal Row)

| Button | Icon | Action |
|--------|------|--------|
| Call | Phone Icon | Initiate call |
| WhatsApp | WhatsApp Icon | Open WhatsApp chat |
| Payment | Credit Card Icon | Record payment |
| Check-in | QR Icon | Manual check-in |

### Tab Navigation

| Tab | Content |
|-----|---------|
| Overview | Membership & stats summary |
| Payments | Payment history |
| Attendance | Check-in history |
| Notes | Staff notes about member |

### Overview Tab Content

| Element | Type | Description |
|---------|------|-------------|
| Membership Card | Info Card | Plan name, start date, end date, days remaining |
| Stats Grid | Stat Cards | Total visits, current streak, avg visits/week |
| Assigned Trainer | Info Row | Trainer name if assigned |
| Personal Info | Info Section | DOB, gender, address, emergency contact |

### Payments Tab Content

| Element | Type | Description |
|---------|------|-------------|
| Next Payment | Alert Card | Due date and amount |
| Payment History | List | Date, amount, method, status for each payment |
| Add Payment Button | Floating Button | Record new payment |

### Attendance Tab Content

| Element | Type | Description |
|---------|------|-------------|
| This Month | Stats | Visits this month |
| Calendar View | Mini Calendar | Dots on visited days |
| Check-in List | List | Date and time of each visit |

### Notes Tab Content

| Element | Type | Description |
|---------|------|-------------|
| Notes List | List | Timestamped notes from staff |
| Add Note Input | Text Field + Button | Add new note |

### More Options Menu (3-dot menu)

| Option | Icon | Action |
|--------|------|--------|
| Edit Profile | Pencil | Go to edit page |
| Renew Membership | Refresh | Start renewal flow |
| Freeze Membership | Snowflake | Freeze account |
| Transfer Membership | Arrow | Transfer to another member |
| Print ID Card | Printer | Generate printable card |
| Deactivate | Power | Deactivate member |
| Delete | Trash | Delete member (with confirmation) |

---

### 3.4 Edit Member Page

**Purpose:** Modify existing member's information.

**Layout:** Form with pre-filled current values.

**Elements:** Same as Add Member but with:
- Pre-filled values from existing data
- "Update Member" button instead of "Add Member"
- Option to change plan (with proration popup)
- Cannot edit member ID

---

## 4. PAYMENTS MODULE

### 4.1 Payment Calendar Page

**Purpose:** Visual calendar view of all payment dues with status indicators.

**Layout:** Full-screen calendar with month navigation.

### Header Section

| Element | Type | Description |
|---------|------|-------------|
| Back Button | Icon Button | Return to previous page |
| Title | Heading | "Payment Calendar" |
| Month/Year Display | Text | Current viewing month |
| Previous Month | Icon Button | Navigate to previous month |
| Next Month | Icon Button | Navigate to next month |
| Today Button | Text Button | Jump to current month |

### Summary Stats Row

| Element | Type | Description |
|---------|------|-------------|
| Total Expected | Stat | Total amount expected this month |
| Collected | Stat | Amount collected |
| Pending | Stat | Amount still pending |
| Collection Rate | Percentage | % of target collected |

### Calendar Grid

| Element | Type | Description |
|---------|------|-------------|
| Day Header | Text Row | Sun, Mon, Tue... |
| Day Cell | Grid Cell | Date number |
| Status Dots | Colored Dots | Indicates payment status |
| Member Count | Small Badge | Number of members due that day |

**Day Cell Tap Action:** Opens day detail popup

### Day Detail Popup

| Element | Type | Description |
|---------|------|-------------|
| Date Header | Heading | Selected date |
| Total Amount | Text | Total due for this day |
| Member List | List | Members due on this day |
| Member Card | Card | Avatar, name, amount, status |
| Bulk Actions | Button Row | Remind All, Export |

**Member Card Tap:** Opens Member Action Drawer

### Legend Section

| Element | Type | Description |
|---------|------|-------------|
| Paid | Dot + Label | Paid status indicator |
| Due Today | Dot + Label | Due today indicator |
| Overdue | Dot + Label | Overdue indicator |
| Upcoming | Dot + Label | Future due indicator |

---

### 4.2 Payment Records Page

**Purpose:** Record new payments and view recent transactions.

**Layout:** Form at top, recent payments list below.

### Record Payment Section

| Element | Type | Description |
|---------|------|-------------|
| Member Search | Autocomplete Field | Search and select member |
| Amount Input | Number Field | Payment amount |
| Payment Method | Segment/Radio | Cash, UPI, Card, Bank |
| Payment Date | Date Picker | Defaults to today |
| Notes | Text Area | Optional payment notes |
| Record Button | Primary Button | Submit payment |

### Recent Payments List

| Element | Type | Description |
|---------|------|-------------|
| Filter Dropdown | Dropdown | Today, This Week, This Month |
| Payment Card | Card | Repeating list item |
| Member Name | Text | Who paid |
| Amount | Text | Payment amount |
| Method Badge | Badge | Cash/UPI/Card |
| Date & Time | Text | When recorded |
| Receipt Button | Icon Button | View/download receipt |

---

### 4.3 Payments List Page

**Purpose:** Comprehensive list of all payments with search and filters.

**Layout:** Full list view with filtering capabilities.

### Filter Section

| Element | Type | Description |
|---------|------|-------------|
| Date Range | Date Picker | From - To dates |
| Status Filter | Chips | All, Successful, Pending, Failed |
| Method Filter | Chips | All, Cash, UPI, Card |
| Amount Range | Range Inputs | Min - Max amount |
| Search | Text Field | Search by member name |
| Export Button | Button | Export to Excel/PDF |

### Payments Table/List

| Column/Field | Type | Description |
|--------------|------|-------------|
| Date | Text | Payment date |
| Member | Text + Avatar | Member name and photo |
| Amount | Text | Payment amount |
| Method | Badge | Payment method |
| Status | Badge | Success/Pending/Failed |
| Plan | Text | Membership plan |
| Actions | Icon Buttons | View, Receipt, Refund |

### Payment Detail Popup

| Element | Type | Description |
|---------|------|-------------|
| Receipt Header | Text | Invoice/Receipt number |
| Member Details | Info Block | Name, phone, member ID |
| Payment Details | Info Block | Amount, method, date, time |
| Plan Details | Info Block | Plan name, validity |
| Download Receipt | Button | PDF download |
| Share Receipt | Button | WhatsApp share |
| Print Receipt | Button | Print option |

---

## 5. CALENDAR PAGE

**Purpose:** View all gym events - payments due, membership expiries, class schedules, birthdays.

**Layout:** Full calendar view with event type filters.

### Header Section

| Element | Type | Description |
|---------|------|-------------|
| Title | Heading | "Calendar" |
| View Toggle | Segment | Month / Week / Day |
| Month Navigation | Arrows | Previous/Next |
| Today Button | Button | Jump to today |

### Event Type Filters

| Filter | Icon | Description |
|--------|------|-------------|
| Payment Due | Currency Icon | Show payment dues |
| Expiry | Warning Icon | Show membership expiries |
| Birthdays | Cake Icon | Show member birthdays |
| Classes | Calendar Icon | Show class schedules |
| All | All Icon | Show all events |

### Calendar Grid

| Element | Type | Description |
|---------|------|-------------|
| Day Cell | Grid Cell | Date with event indicators |
| Event Dot | Colored Dot | Different color per event type |
| Event Count | Badge | Number of events that day |

### Day Detail View (Tap on Day)

| Element | Type | Description |
|---------|------|-------------|
| Date Header | Heading | Selected date |
| Event List | Grouped List | Events grouped by type |
| Event Card | Card | Event details |
| Action Buttons | Button Row | Relevant actions per event type |

### Event Card Elements by Type

**Payment Due:**
- Member avatar, name
- Amount due
- "Remind" and "Record Payment" buttons

**Membership Expiry:**
- Member avatar, name
- Days until expiry
- "Renew" and "Remind" buttons

**Birthday:**
- Member avatar, name
- Age (if DOB available)
- "Send Wishes" button

**Class:**
- Class name, time
- Trainer name
- Spots available
- "View Details" button

---

## 6. PLANS MANAGEMENT

**Purpose:** Create, edit, and manage membership plans offered by the gym.

**Layout:** List of plans with add/edit capabilities.

### Header Section

| Element | Type | Description |
|---------|------|-------------|
| Title | Heading | "Membership Plans" |
| Add Plan Button | Primary Button | Create new plan |

### Plans List

| Element | Type | Description |
|---------|------|-------------|
| Plan Card | Card | Each plan as a card |
| Plan Name | Heading | e.g., "Monthly Plan" |
| Price | Large Text | Amount in currency |
| Duration | Badge | Monthly/Quarterly/Annual |
| Active Members | Text | Number of members on this plan |
| Features List | Bullet List | Plan features |
| Edit Button | Icon Button | Edit this plan |
| Toggle | Switch | Enable/Disable plan |

### Add/Edit Plan Popup

| Element | Type | Description |
|---------|------|-------------|
| Plan Name Input | Text Field | Required |
| Duration Dropdown | Dropdown | 1 month, 3 months, 6 months, 12 months, Custom |
| Price Input | Number Field | Plan price |
| Description | Text Area | Optional description |
| Features | Multi-line Input | Add plan features |
| Visibility Toggle | Switch | Show on signup / Hide |
| Save Button | Primary Button | Save plan |
| Delete Button | Danger Button | Delete plan (if editing) |

---

## 7. CLASSES MODULE

### 7.1 Classes List Page

**Purpose:** View and manage all class types offered by the gym.

**Layout:** Grid or list of class cards.

### Header Section

| Element | Type | Description |
|---------|------|-------------|
| Title | Heading | "Classes" |
| Add Class Button | Primary Button | Create new class type |
| View Toggle | Segment | Grid / List |

### Class Card Elements

| Element | Type | Description |
|---------|------|-------------|
| Class Image | Image | Class thumbnail |
| Class Name | Heading | e.g., "Yoga - Beginners" |
| Duration | Text | e.g., "60 min" |
| Trainer | Text | Assigned trainer |
| Capacity | Text | e.g., "20 spots" |
| Level Badge | Badge | Beginner/Intermediate/Advanced |
| Schedule Summary | Text | e.g., "Mon, Wed, Fri 6 AM" |
| Edit Button | Icon Button | Edit class |
| Schedule Button | Button | Go to scheduling |

### Add/Edit Class Popup

| Element | Type | Description |
|---------|------|-------------|
| Class Name Input | Text Field | Required |
| Category Dropdown | Dropdown | Yoga, Zumba, CrossFit, etc. |
| Description | Text Area | Class description |
| Duration Input | Number + Unit | Minutes |
| Capacity Input | Number Field | Max participants |
| Trainer Dropdown | Dropdown | Assign trainer |
| Level Radio | Radio Group | Beginner/Intermediate/Advanced |
| Image Upload | Image Picker | Class thumbnail |
| Save Button | Primary Button | Save class |

---

### 7.2 Class Schedule Page

**Purpose:** Set up weekly recurring schedule for classes.

**Layout:** Week view timetable grid.

### Header Section

| Element | Type | Description |
|---------|------|-------------|
| Title | Heading | "Class Schedule" |
| Week Navigation | Arrows | Previous/Next week |
| Add Session Button | Button | Schedule new session |

### Weekly Grid

| Element | Type | Description |
|---------|------|-------------|
| Time Column | Labels | 6 AM, 7 AM, 8 AM... |
| Day Columns | Columns | Mon, Tue, Wed, Thu, Fri, Sat, Sun |
| Session Block | Colored Block | Class placed in time slot |
| Session Info | Text in Block | Class name, trainer, spots |

### Session Block Tap Action

| Element | Type | Description |
|---------|------|-------------|
| Session Details Popup | Popup | Full session information |
| Class Name | Heading | Class name |
| Time | Text | Start - End time |
| Trainer | Text | Assigned trainer |
| Location | Text | Studio/Room |
| Enrolled | Text | X/Y spots filled |
| View Attendees | Button | See who's enrolled |
| Edit Session | Button | Modify session |
| Cancel Session | Button | Cancel this session |

### Add Session Popup

| Element | Type | Description |
|---------|------|-------------|
| Class Dropdown | Dropdown | Select class type |
| Day Selection | Checkbox Group | Which days |
| Start Time | Time Picker | Session start time |
| End Time | Auto/Manual | Duration-based or manual |
| Trainer Override | Dropdown | Override default trainer |
| Location | Dropdown | Select room/studio |
| Repeat | Dropdown | Weekly, Custom |
| Save Button | Primary Button | Create session |

---

## 8. CHECK-IN PAGE

**Purpose:** Member check-in via QR scan, manual search, or phone number.

**Layout:** Full-screen with multiple check-in methods.

### Header Section

| Element | Type | Description |
|---------|------|-------------|
| Title | Heading | "Check-in" |
| Today's Count | Stat | Number of check-ins today |

### Check-in Methods (Tabs or Segments)

| Method | Icon | Description |
|--------|------|-------------|
| QR Scan | QR Icon | Scan member QR code |
| Search | Search Icon | Search by name |
| Phone | Phone Icon | Enter phone number |

### QR Scan Tab

| Element | Type | Description |
|---------|------|-------------|
| Camera View | Camera Feed | QR code scanner |
| Instructions | Text | "Point camera at member's QR code" |
| Flash Toggle | Icon Button | Toggle flashlight |
| Manual Entry Link | Text Link | Switch to manual |

### Search Tab

| Element | Type | Description |
|---------|------|-------------|
| Search Input | Text Field | Search by name |
| Results List | List | Matching members |
| Member Card | Card | Avatar, name, status |
| Check-in Button | Button | On each card |

### Phone Tab

| Element | Type | Description |
|---------|------|-------------|
| Phone Input | Phone Field | Enter phone number |
| Search Button | Button | Find member |
| Result Card | Card | Member details |
| Check-in Button | Primary Button | Complete check-in |

### Check-in Success Popup

| Element | Type | Description |
|---------|------|-------------|
| Success Animation | Animation | Checkmark or celebration |
| Member Photo | Large Avatar | Member's photo |
| Member Name | Heading | Welcome message with name |
| Membership Status | Badge | Active / Days remaining |
| Visit Count | Stat | "Visit #45" |
| Streak | Stat | "5 day streak! 🔥" |
| Done Button | Primary Button | Dismiss |

### Check-in Error States

| Error | Display |
|-------|---------|
| Membership Expired | Red banner with "Renew" button |
| Membership Frozen | Blue banner with info |
| Member Not Found | "Not found" with "Add Member" button |
| Already Checked In | "Already checked in today" message |

---

## 9. STAFF MANAGEMENT

**Purpose:** Manage trainers and staff members with roles and permissions.

**Layout:** Staff list with role indicators.

### Header Section

| Element | Type | Description |
|---------|------|-------------|
| Title | Heading | "Staff" |
| Add Staff Button | Primary Button | Add new staff member |

### Staff List

| Element | Type | Description |
|---------|------|-------------|
| Staff Card | Card | Each staff member |
| Avatar | Avatar | Staff photo |
| Name | Text | Full name |
| Role Badge | Badge | Owner/Manager/Trainer/Front Desk |
| Email | Text | Contact email |
| Phone | Text | Contact phone |
| Status Badge | Badge | Active/Inactive |
| Edit Button | Icon Button | Edit staff |

### Add/Edit Staff Popup

| Element | Type | Description |
|---------|------|-------------|
| Photo Upload | Image Picker | Staff photo |
| Full Name Input | Text Field | Required |
| Email Input | Text Field | Required, for login |
| Phone Input | Phone Field | Required |
| Role Dropdown | Dropdown | Select role |
| Permissions | Checkbox Group | Custom permissions (if custom role) |
| Salary | Number Field | Optional |
| Joining Date | Date Picker | Start date |
| Send Invite | Toggle | Send login invitation email |
| Save Button | Primary Button | Save staff |

### Staff Detail View

| Element | Type | Description |
|---------|------|-------------|
| Profile Header | Card | Photo, name, role |
| Contact Info | Section | Email, phone |
| Assigned Classes | List | Classes they teach |
| Assigned Members | List | PT clients |
| Attendance | Section | Work attendance log |
| Actions | Button Row | Edit, Deactivate, Remove |

---

## 10. LEADS MANAGEMENT

**Purpose:** Track potential members (walk-ins, inquiries) and follow-up.

**Layout:** Lead pipeline/list view.

### Header Section

| Element | Type | Description |
|---------|------|-------------|
| Title | Heading | "Leads" |
| Add Lead Button | Primary Button | Add new lead |
| View Toggle | Segment | List / Pipeline |

### Lead Pipeline View

| Column | Description |
|--------|-------------|
| New | Fresh leads, just added |
| Contacted | Leads that have been reached out |
| Trial | Leads on trial membership |
| Negotiation | Discussing pricing/plans |
| Won | Converted to member |
| Lost | Did not convert |

### Lead Card Elements

| Element | Type | Description |
|---------|------|-------------|
| Name | Text | Lead name |
| Phone | Text | Contact number |
| Source Badge | Badge | Walk-in/Website/Referral/Social |
| Interest | Text | What they're interested in |
| Last Contact | Text | Days since last contact |
| Follow-up Date | Text | Next follow-up date |
| Drag Handle | Icon | To move between stages |

### Add/Edit Lead Popup

| Element | Type | Description |
|---------|------|-------------|
| Name Input | Text Field | Required |
| Phone Input | Phone Field | Required |
| Email Input | Text Field | Optional |
| Source Dropdown | Dropdown | Walk-in, Website, Referral, etc. |
| Interest | Dropdown | What plan/class interested in |
| Notes | Text Area | Additional notes |
| Follow-up Date | Date Picker | When to follow up |
| Assign To | Dropdown | Assign to staff member |
| Save Button | Primary Button | Save lead |

### Lead Detail Popup

| Element | Type | Description |
|---------|------|-------------|
| Lead Info | Section | Name, phone, email, source |
| Interest | Section | What they want |
| Activity Timeline | Timeline | All interactions logged |
| Add Activity Button | Button | Log call/meeting/note |
| Convert Button | Primary Button | Convert to member |
| Mark Lost Button | Secondary Button | Mark as lost |

---

## 11. REPORTS DASHBOARD

**Purpose:** Business analytics, revenue reports, member insights.

**Layout:** Dashboard with multiple report widgets.

### Header Section

| Element | Type | Description |
|---------|------|-------------|
| Title | Heading | "Reports" |
| Date Range Picker | Date Range | Select report period |
| Export Button | Button | Export all reports |

### Report Widgets

**Revenue Overview Card**

| Element | Type | Description |
|---------|------|-------------|
| Total Revenue | Large Number | Revenue in selected period |
| Comparison | Percentage | vs previous period |
| Revenue Chart | Line/Bar Chart | Revenue over time |

**Member Stats Card**

| Element | Type | Description |
|---------|------|-------------|
| Total Members | Number | All-time member count |
| Active Members | Number | Currently active |
| New This Month | Number | Joined this month |
| Churned | Number | Left this month |
| Growth Chart | Line Chart | Member growth trend |

**Collection Rate Card**

| Element | Type | Description |
|---------|------|-------------|
| Collection Rate | Percentage | On-time payment rate |
| Progress Bar | Visual | Visual representation |
| Target | Text | vs target rate |

**Popular Plans Card**

| Element | Type | Description |
|---------|------|-------------|
| Plan List | Ranked List | Plans by member count |
| Revenue Per Plan | Bar Chart | Revenue distribution |

**Attendance Trends Card**

| Element | Type | Description |
|---------|------|-------------|
| Avg Daily Visits | Number | Average check-ins per day |
| Peak Hours | Bar Chart | Visits by hour |
| Peak Days | Bar Chart | Visits by day of week |

**Detailed Report Links**

| Report | Description |
|--------|-------------|
| Revenue Report | Detailed revenue breakdown |
| Member Report | Member analytics |
| Payment Report | Payment collection details |
| Attendance Report | Visit patterns |
| Staff Report | Staff performance |

---

## 12. SETTINGS

**Purpose:** Configure gym settings, profile, preferences, integrations.

**Layout:** Grouped settings sections.

### Settings Sections

**Profile Settings**

| Setting | Type | Description |
|---------|------|-------------|
| Gym Name | Text Field | Edit gym name |
| Gym Logo | Image Picker | Upload/change logo |
| Address | Text Area | Gym address |
| Phone | Phone Field | Contact number |
| Email | Text Field | Contact email |
| Website | Text Field | Gym website URL |
| Description | Text Area | About the gym |

**Business Settings**

| Setting | Type | Description |
|---------|------|-------------|
| Currency | Dropdown | INR, USD, etc. |
| Timezone | Dropdown | Select timezone |
| Language | Dropdown | Default language |
| GST Number | Text Field | For invoices |
| Invoice Prefix | Text Field | e.g., "INV-" |

**Notification Settings**

| Setting | Type | Description |
|---------|------|-------------|
| Email Notifications | Toggle | Enable/disable |
| SMS Notifications | Toggle | Enable/disable |
| WhatsApp Notifications | Toggle | Enable/disable |
| Payment Reminders | Toggles | Day before, on due date, after |
| Birthday Wishes | Toggle | Auto send birthday messages |
| Expiry Reminders | Toggles | 7 days, 3 days, 1 day before |

**Payment Settings**

| Setting | Type | Description |
|---------|------|-------------|
| Payment Gateway | Selection | Razorpay/Stripe |
| Auto-charge | Toggle | Enable recurring billing |
| Late Fee | Number + Toggle | Apply late fee after X days |
| Grace Period | Number Field | Days before marking overdue |

**Check-in Settings**

| Setting | Type | Description |
|---------|------|-------------|
| Check-in Method | Checkboxes | QR, Phone, Manual |
| Allow Multiple Check-ins | Toggle | Per day |
| Check-in Greeting | Text Field | Custom welcome message |

**Security Settings**

| Setting | Type | Description |
|---------|------|-------------|
| Change Password | Button | Open password change flow |
| Two-Factor Auth | Toggle | Enable 2FA |
| Session Timeout | Dropdown | Auto-logout after inactivity |
| Login History | Link | View login history |

**Data & Privacy**

| Setting | Type | Description |
|---------|------|-------------|
| Export Data | Button | Export all gym data |
| Delete Account | Button | Delete gym account (danger) |
| Privacy Policy Link | Text Field | Your privacy policy URL |
| Terms Link | Text Field | Your terms URL |

**Subscription**

| Setting | Type | Description |
|---------|------|-------------|
| Current Plan | Display | Your FitFlow subscription |
| Billing History | Link | View invoices |
| Upgrade | Button | Upgrade plan |
| Cancel Subscription | Button | Cancel (with confirmation) |

---

## 13. COMMON COMPONENTS

### 13.1 Bottom Navigation Bar

**Purpose:** Primary navigation on mobile.

| Tab | Icon | Label | Destination |
|-----|------|-------|-------------|
| Home | Home Icon | Home | Dashboard |
| Members | Users Icon | Members | Members List |
| Calendar | Calendar Icon | Calendar | Calendar Page |
| Settings | Gear Icon | Settings | Settings |

**Active State:** Highlighted icon and label

---

### 13.2 Toast Notifications

| Type | Icon | Example |
|------|------|---------|
| Success | Checkmark | "Member added successfully" |
| Error | X | "Failed to save changes" |
| Warning | Warning | "Membership expiring soon" |
| Info | Info | "Reminder sent via WhatsApp" |

---

### 13.3 Confirmation Dialogs

| Element | Type | Description |
|---------|------|-------------|
| Title | Heading | Action being confirmed |
| Description | Text | Explanation of consequences |
| Cancel Button | Secondary Button | Dismiss without action |
| Confirm Button | Primary/Danger Button | Proceed with action |

**Examples:**
- "Delete Member?" - "This cannot be undone"
- "Deactivate Account?" - "Member will lose access"
- "Record Payment?" - "₹2,000 for Monthly Plan"

---

### 13.4 Loading States

| State | Display |
|-------|---------|
| Page Loading | Full-screen skeleton/shimmer |
| Section Loading | Skeleton for that section |
| Button Loading | Spinner inside button |
| Inline Loading | Small spinner with text |

---

### 13.5 Empty States

| Context | Elements |
|---------|----------|
| No Members | Illustration + "Add your first member" button |
| No Payments | Illustration + "No payments yet" text |
| No Search Results | "No results found" + suggestion |
| No Classes | Illustration + "Create first class" button |

---

### 13.6 Pull to Refresh

**Available on:** All list pages
**Animation:** Pull-down indicator with refresh animation

---

### 13.7 Floating Action Button (FAB)

**Pages with FAB:**
- Members List → Add Member
- Payments → Record Payment
- Classes → Add Class
- Staff → Add Staff
- Leads → Add Lead

---

## END OF DOCUMENT

---

**Note:** This document describes UI elements and their purposes only. It does not specify colors, fonts, exact sizing, or visual styling. Those details are in the separate Design System document (`design.json`).

**Usage:** Use this as a reference when implementing each page to ensure all required elements are included.
