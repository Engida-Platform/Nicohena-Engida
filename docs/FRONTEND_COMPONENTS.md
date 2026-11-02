# Engida Frontend Component Library

**Version**: 1.0.0  
**Last Updated**: January 2024

Complete documentation for the Engida frontend component library, design system, and UI patterns built with Next.js 16, React 19, and Tailwind CSS 4.

---

## Table of Contents

1. [Design System](#design-system)
2. [Component Architecture](#component-architecture)
3. [Layout Components](#layout-components)
4. [Core Components](#core-components)
5. [Feature Components](#feature-components)
6. [Design Tokens](#design-tokens)
7. [State Management](#state-management)
8. [Styling Guidelines](#styling-guidelines)
9. [Accessibility](#accessibility)
10. [Best Practices](#best-practices)

---

## Design System

### Warm Architectural Modernism

Engida's design system draws inspiration from Ethiopian coffee culture and the highlands, creating a warm, approachable yet professional aesthetic.

**Design Principles:**
1. **Warmth & Authenticity** - Earth tones reflecting Ethiopian landscape
2. **Clarity & Purpose** - Clean layouts with intentional hierarchy
3. **Cultural Connection** - Ethiopian heritage woven into visual language
4. **Accessibility First** - Inclusive design for all users

### Color Palette

**Brand Colors:**
```css
--brand-primary: #234B36       /* Deep forest green */
--brand-primary-hover: #2D5E43 /* Hover state */
--brand-primary-active: #1A3828/* Active state */
--brand-sand: #EEF3EF          /* Light sage */
--brand-canvas: #F8F5ED        /* Warm off-white */
--brand-espresso: #252923      /* Deep brown-black */
--brand-stone: #73776F         /* Muted gray-green */
--brand-border: #E5E0D5        /* Subtle border */
```

**Usage:**
- **Primary (#234B36)**: CTAs, active states, brand elements
- **Sand (#EEF3EF)**: Backgrounds, subtle highlights
- **Canvas (#F8F5ED)**: Page backgrounds
- **Espresso (#252923)**: Primary text
- **Stone (#73776F)**: Secondary text, muted elements

**Semantic Colors:**
```css
--admin-success: #536b4a    /* Success states */
--admin-warning: #95631f    /* Warning states */
--admin-danger: #9a3f33     /* Error/danger states */
```

### Typography

**Font Families:**
```css
/* Headlines & Display */
.font-headline {
  font-family: 'EB Garamond', Georgia, serif;
}

/* Body & UI */
.font-body {
  font-family: 'Manrope', -apple-system, sans-serif;
}
```

**Type Scale:**
```typescript
// Headlines
text-3xl: 1.875rem (30px)  // Page titles
text-2xl: 1.5rem (24px)    // Section titles
text-xl: 1.25rem (20px)    // Card titles

// Body
text-base: 1rem (16px)     // Default body
text-sm: 0.875rem (14px)   // Secondary text
text-xs: 0.75rem (12px)    // Captions, labels
```

**Font Weights:**
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700
- Extrabold: 800

### Spacing System

**Base Unit:** 4px (0.25rem)

```typescript
gap-1: 0.25rem  // 4px
gap-2: 0.5rem   // 8px
gap-3: 0.75rem  // 12px
gap-4: 1rem     // 16px
gap-6: 1.5rem   // 24px
gap-8: 2rem     // 32px
gap-12: 3rem    // 48px
```

### Border Radius

```typescript
rounded-sm: 0.125rem    // 2px - Subtle
rounded: 0.25rem        // 4px - Default
rounded-md: 0.375rem    // 6px - Cards
rounded-lg: 0.5rem      // 8px - Buttons
rounded-xl: 0.75rem     // 12px - Modals
rounded-2xl: 1rem       // 16px - Large cards
rounded-full: 9999px    // Circular
```

### Shadows

```css
/* Subtle elevation */
shadow-xs: 0 1px 2px rgba(58, 48, 42, 0.05)

/* Default card */
shadow-sm: 0 2px 12px rgba(58, 48, 42, 0.06)

/* Elevated card */
shadow: 0 4px 20px rgba(58, 48, 42, 0.08)

/* High elevation */
shadow-lg: 0 10px 40px rgba(58, 48, 42, 0.12)

/* Modal/dialog */
shadow-xl: 0 20px 60px rgba(58, 48, 42, 0.20)
```

---

## Component Architecture

### File Structure

```
src/components/
├── layout/              # Layout components
│   ├── AppHeader.tsx
│   ├── AppFooter.tsx
│   └── AppShell.tsx
├── auth/                # Authentication components
│   └── GoogleButton.tsx
├── home/                # Landing page components
├── host/                # Host-specific components
│   ├── onboarding/
│   ├── AmenitySelector.tsx
│   ├── GalleryManager.tsx
│   └── AiPricingWidget.tsx
├── admin/               # Admin console components
│   └── AdminStatusBadge.tsx
├── search/              # Search components
│   └── AiConversationalSearchModal.tsx
├── compare/             # Comparison features
│   └── AiPropertyComparisonModal.tsx
├── maps/                # Map components
├── assistant/           # AI assistant components
└── reports/             # Reporting components
    └── ReportDialog.tsx
```

### Component Patterns

**1. Server Components (Default):**
```typescript
// app/properties/page.tsx
export default async function PropertiesPage() {
  const properties = await fetchProperties();
  
  return (
    <div>
      <PropertyList properties={properties} />
    </div>
  );
}
```

**2. Client Components:**
```typescript
'use client';

import { useState } from 'react';

export default function InteractiveComponent() {
  const [state, setState] = useState();
  
  return <div onClick={() => setState(...)}>...</div>;
}
```

**3. Compound Components:**
```typescript
export function Card({ children }: { children: React.ReactNode }) {
  return <div className="admin-panel">{children}</div>;
}

Card.Header = function CardHeader({ children }) {
  return <div className="border-b p-4">{children}</div>;
};

Card.Body = function CardBody({ children }) {
  return <div className="p-4">{children}</div>;
};

// Usage
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
</Card>
```

---

## Layout Components

### AppHeader

Main navigation header with user menu, notifications, and host access.

**Location:** `src/components/layout/AppHeader.tsx`

**Features:**
- Responsive navigation
- User authentication state
- Notification badge
- Currency toggle
- Dropdown user menu
- Host dashboard access

**Usage:**
```typescript
import AppHeader from '@/components/layout/AppHeader';

export default function Layout({ children }) {
  return (
    <>
      <AppHeader />
      <main>{children}</main>
    </>
  );
}
```

**Props:** None (uses AuthContext)

**Styling:**
```css
/* Sticky header with backdrop blur */
.header {
  position: sticky;
  top: 0;
  z-index: 40;
  backdrop-filter: blur(12px);
  background: rgba(248, 245, 237, 0.95);
}
```

### AppFooter

Site footer with links, information, and branding.

**Location:** `src/components/layout/AppFooter.tsx`

**Features:**
- Multi-column layout
- Social links
- Legal links
- Newsletter signup

### AppShell

Root layout wrapper component.

**Location:** `src/components/AppShell.tsx`

**Usage:**
```typescript
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
```

---

## Core Components

### Buttons

**Primary Button:**
```typescript
<button className="inline-flex items-center px-4 py-2 rounded-lg bg-[#234B36] text-white font-semibold text-sm hover:bg-[#1a3828] transition-all duration-200 active:scale-95 shadow-xs">
  Button Text
</button>
```

**Secondary Button:**
```typescript
<button className="inline-flex items-center px-4 py-2 rounded-lg bg-[#EEF3EF] text-[#252923] font-semibold text-sm hover:bg-[#234B36] hover:text-white transition-all duration-200 active:scale-95">
  Button Text
</button>
```

**Ghost Button:**
```typescript
<button className="p-2 rounded-full hover:bg-[#EEF3EF] text-[#73776F] hover:text-[#234B36] transition">
  <span className="material-symbols-outlined">icon_name</span>
</button>
```

**Button Sizes:**
```typescript
// Small
px-3 py-1.5 text-xs

// Medium (default)
px-4 py-2 text-sm

// Large
px-6 py-3 text-base
```

### Cards

**Basic Card:**
```typescript
<div className="bg-white rounded-2xl shadow-sm border border-[#E5E0D5]/60 p-6">
  <h3 className="text-lg font-bold text-[#252923]">Card Title</h3>
  <p className="mt-2 text-sm text-[#73776F]">Card content</p>
</div>
```

**Property Card:**
```typescript
<Link href={`/properties/${property.id}`} className="block group">
  <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200">
    <div className="aspect-[4/3] relative overflow-hidden">
      <Image
        src={property.coverImage}
        alt={property.title}
        fill
        className="object-cover group-hover:scale-105 transition-transform duration-300"
      />
    </div>
    <div className="p-4">
      <h3 className="font-bold text-[#252923] line-clamp-2">
        {property.title}
      </h3>
      <p className="mt-1 text-sm text-[#73776F]">
        {property.city}, {property.country}
      </p>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-xl font-bold text-[#234B36]">
          {property.pricePerNight} ETB
        </span>
        <span className="text-sm text-[#73776F]">/ night</span>
      </div>
    </div>
  </div>
</Link>
```

### Forms

**Input Field:**
```typescript
<div>
  <label className="block text-sm font-semibold text-[#252923] mb-2">
    Label
  </label>
  <input
    type="text"
    className="w-full px-4 py-2.5 rounded-lg border border-[#E5E0D5] focus:border-[#234B36] focus:ring-2 focus:ring-[#234B36]/20 transition-colors"
    placeholder="Enter value"
  />
</div>
```

**Textarea:**
```typescript
<textarea
  className="w-full px-4 py-3 rounded-lg border border-[#E5E0D5] focus:border-[#234B36] focus:ring-2 focus:ring-[#234B36]/20 resize-vertical min-h-[120px]"
  placeholder="Enter description"
/>
```

**Select:**
```typescript
<select className="w-full px-4 py-2.5 rounded-lg border border-[#E5E0D5] focus:border-[#234B36] focus:ring-2 focus:ring-[#234B36]/20 bg-white">
  <option value="">Select option</option>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</select>
```

**Checkbox:**
```typescript
<label className="flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    className="w-5 h-5 rounded border-[#E5E0D5] text-[#234B36] focus:ring-[#234B36]/20"
  />
  <span className="text-sm text-[#252923]">Checkbox label</span>
</label>
```

### Badges & Status

**Status Badge:**
```typescript
// Success
<span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-xs font-bold">
  Active
</span>

// Warning
<span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
  Pending
</span>

// Danger
<span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold">
  Cancelled
</span>

// Info
<span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
  Info
</span>
```

**AdminStatusBadge Component:**
```typescript
// src/components/admin/AdminStatusBadge.tsx
export function AdminStatusBadge({ status }: { status: string }) {
  const variants = {
    ACTIVE: 'bg-green-100 text-green-800',
    PENDING: 'bg-amber-100 text-amber-800',
    CANCELLED: 'bg-red-100 text-red-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${variants[status]}`}>
      {status}
    </span>
  );
}
```

### Icons

Using Material Symbols Outlined:

```typescript
<span className="material-symbols-outlined text-2xl">
  home
</span>

<span className="material-symbols-outlined text-lg text-[#234B36]">
  check_circle
</span>

// Filled variant
<span className="material-symbols-outlined material-symbols-fill text-amber-500">
  star
</span>
```

**Common Icons:**
- `home` - Home
- `search` - Search
- `person` - User
- `notifications` - Notifications
- `menu` - Menu
- `close` - Close
- `check_circle` - Success
- `error` - Error
- `info` - Information
- `favorite` - Heart/Like
- `location_on` - Location
- `calendar_today` - Calendar
- `attach_money` - Money

---

## Feature Components

### AmenitySelector

Multi-select component for property amenities.

**Location:** `src/components/host/AmenitySelector.tsx`

**Usage:**
```typescript
<AmenitySelector
  selected={selectedAmenities}
  onChange={setSelectedAmenities}
  amenities={availableAmenities}
/>
```

**Features:**
- Checkbox grid layout
- Icon display
- Search/filter
- Responsive columns

### GalleryManager

Image upload and management component for property listings.

**Location:** `src/components/host/GalleryManager.tsx`

**Features:**
- Drag-and-drop upload
- Image reordering
- Cover image selection
- Cloudinary integration
- Preview thumbnails
- Delete images

**Usage:**
```typescript
<GalleryManager
  propertyId={propertyId}
  images={images}
  onImagesChange={handleImagesChange}
/>
```

### AiPricingWidget

AI-powered price suggestion widget.

**Location:** `src/components/host/AiPricingWidget.tsx`

**Features:**
- Real-time price predictions
- Market comparison
- Confidence score
- Historical data
- Explanation tooltips

**Usage:**
```typescript
<AiPricingWidget
  property={propertyData}
  onAcceptSuggestion={handleAcceptPrice}
/>
```

### GoogleButton

OAuth sign-in button for Google authentication.

**Location:** `src/components/auth/GoogleButton.tsx`

**Usage:**
```typescript
<GoogleButton
  mode="signin"  // or "signup"
  onSuccess={handleSuccess}
  onError={handleError}
/>
```

**Variants:**
- Sign In
- Sign Up
- Continue with Google

### ReportDialog

User reporting modal for flagging inappropriate content.

**Location:** `src/components/reports/ReportDialog.tsx`

**Features:**
- Category selection
- Detailed description
- File attachments
- Submission confirmation

**Usage:**
```typescript
<ReportDialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  resourceType="property"
  resourceId={propertyId}
/>
```

### ProtectedRoute

Client-side route protection wrapper.

**Location:** `src/components/ProtectedRoute.tsx`

**Usage:**
```typescript
<ProtectedRoute requireAuth roles={['USER', 'HOST']}>
  <DashboardContent />
</ProtectedRoute>
```

---

## Design Tokens

### Admin Console Theme

Separate design system for admin operations:

```css
.admin-shell {
  --admin-canvas: #faf5ee;
  --admin-surface: #f2ece4;
  --admin-ink: #3a302a;
  --admin-primary: #b3541e;
  --admin-success: #536b4a;
  --admin-warning: #95631f;
  --admin-danger: #9a3f33;
}
```

**Admin Components:**
```typescript
// Page Header
<div className="admin-page-header">
  <h1 className="admin-page-title">Page Title</h1>
  <p className="admin-page-description">Description</p>
</div>

// Panel
<div className="admin-panel">
  Content
</div>

// Button
<button className="admin-btn admin-btn-primary">
  Action
</button>

// Table
<table className="admin-ledger">
  <thead>
    <tr>
      <th>Column</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data</td>
    </tr>
  </tbody>
</table>

// Input
<input className="admin-input" />
```

### Animations

**Built-in Animations:**
```css
/* Fade in up */
.animate-fade-in-up {
  animation: fadeInUp 0.65s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Heart pop */
.heart-pop {
  animation: heartPop 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Pulse glow */
.search-glow:hover {
  animation: pulseGlowGreen 1.8s infinite;
}
```

**Usage:**
```typescript
<div className="animate-fade-in-up">
  Content with animation
</div>

<button className="heart-pop" onClick={handleLike}>
  <span className="material-symbols-outlined">favorite</span>
</button>
```

---

## State Management

### Context API

**AuthContext:**
```typescript
// src/context/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication on mount
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) throw new Error('Login failed');

    const userData = await response.json();
    setUser(userData.user);
  }

  function logout() {
    fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser: setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

**Usage:**
```typescript
import { useAuth } from '@/context/AuthContext';

export default function Component() {
  const { user, logout } = useAuth();

  return (
    <div>
      <p>Welcome, {user?.name}</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

### React Hooks

**Custom Hooks:**

**useClickOutside:**
```typescript
// src/hooks/useClickOutside.ts
import { useEffect, useRef } from 'react';

export function useClickOutside<T extends HTMLElement>(
  handler: () => void
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handler]);

  return ref;
}
```

**useDebounce:**
```typescript
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

---

## Styling Guidelines

### Tailwind CSS Usage

**DO:**
```typescript
// ✅ Use Tailwind utility classes
<div className="flex items-center gap-4 p-6 rounded-lg bg-white shadow-sm">
  Content
</div>

// ✅ Use design tokens
<div className="text-[#234B36]">Brand color</div>

// ✅ Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  Cards
</div>
```

**DON'T:**
```typescript
// ❌ Inline styles
<div style={{ padding: '24px', borderRadius: '8px' }}>
  Content
</div>

// ❌ Arbitrary values for common patterns
<div className="p-[24px] rounded-[8px]">  // Use p-6 rounded-lg instead
  Content
</div>
```

### Responsive Design

**Breakpoints:**
```typescript
sm: 640px   // Mobile landscape
md: 768px   // Tablet
lg: 1024px  // Desktop
xl: 1280px  // Large desktop
2xl: 1536px // Extra large
```

**Mobile-First Approach:**
```typescript
<div className="
  grid grid-cols-1      // Mobile: 1 column
  sm:grid-cols-2        // Tablet: 2 columns
  lg:grid-cols-3        // Desktop: 3 columns
  xl:grid-cols-4        // Large: 4 columns
  gap-4 sm:gap-6 lg:gap-8
">
  Cards
</div>
```

### Component Composition

**Prefer composition over props:**
```typescript
// ✅ Good: Composition
<Card>
  <CardImage src={image} />
  <CardContent>
    <CardTitle>{title}</CardTitle>
    <CardDescription>{description}</CardDescription>
  </CardContent>
</Card>

// ❌ Bad: Too many props
<Card
  image={image}
  title={title}
  description={description}
  showImage={true}
  imagePosition="top"
/>
```

---

## Accessibility

### ARIA Labels

```typescript
// Buttons
<button aria-label="Close modal">
  <span className="material-symbols-outlined">close</span>
</button>

// Links
<Link href="/properties" aria-label="View all properties">
  View More
</Link>

// Form controls
<label htmlFor="email">Email Address</label>
<input id="email" type="email" aria-required="true" />
```

### Keyboard Navigation

```typescript
// Focus management
<button
  onKeyDown={(e) => {
    if (e.key === 'Escape') handleClose();
  }}
  className="focus:outline-none focus:ring-2 focus:ring-[#234B36]"
>
  Button
</button>

// Tab index
<div tabIndex={0} role="button">
  Focusable div
</div>
```

### Screen Reader Support

```typescript
// Live regions
<div aria-live="polite" aria-atomic="true">
  {notification}
</div>

// Hidden content
<span className="sr-only">
  Additional context for screen readers
</span>

// Descriptive text
<img
  src={image}
  alt="Detailed description of the image"
/>
```

### Color Contrast

All text meets WCAG AA standards:
- Normal text: 4.5:1 contrast ratio
- Large text: 3:1 contrast ratio
- UI elements: 3:1 contrast ratio

**Examples:**
```typescript
// ✅ Good contrast
text-[#252923] on bg-[#F8F5ED]  // 10.8:1
text-white on bg-[#234B36]      // 4.6:1

// ❌ Poor contrast
text-[#73776F] on bg-[#EEF3EF]  // 2.1:1 (avoid for body text)
```

---

## Best Practices

### Component Design

**1. Single Responsibility:**
```typescript
// ✅ Good: Each component does one thing
function PropertyCard({ property }) { }
function PropertyImage({ src }) { }
function PropertyPrice({ price }) { }

// ❌ Bad: Component does too much
function PropertyEverything({ property, showMap, handleBooking, reviews }) { }
```

**2. Props Interface:**
```typescript
// ✅ Good: Clear, typed props
interface PropertyCardProps {
  property: Property;
  onFavorite?: (id: string) => void;
  showPrice?: boolean;
}

export function PropertyCard({
  property,
  onFavorite,
  showPrice = true
}: PropertyCardProps) { }

// ❌ Bad: Unclear props
export function PropertyCard(props: any) { }
```

**3. Error Boundaries:**
```typescript
// components/ErrorBoundary.tsx
'use client';

import React from 'react';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-red-600">
            Something went wrong
          </h2>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 bg-[#234B36] text-white rounded-lg"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Performance

**1. Image Optimization:**
```typescript
import Image from 'next/image';

// ✅ Good: Next.js Image component
<Image
  src={property.coverImage}
  alt={property.title}
  width={400}
  height={300}
  loading="lazy"
  className="object-cover"
/>

// ❌ Bad: Regular img tag
<img src={property.coverImage} alt={property.title} />
```

**2. Code Splitting:**
```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';

const HeavyMap = dynamic(() => import('./HeavyMap'), {
  loading: () => <p>Loading map...</p>,
  ssr: false,
});
```

**3. Memoization:**
```typescript
import { useMemo, useCallback } from 'react';

function ExpensiveComponent({ data }) {
  // Memoize expensive calculations
  const processedData = useMemo(() => {
    return data.map(item => expensiveOperation(item));
  }, [data]);

  // Memoize callbacks
  const handleClick = useCallback(() => {
    console.log('Clicked');
  }, []);

  return <div onClick={handleClick}>{processedData}</div>;
}
```

### Testing

**Component Testing:**
```typescript
// PropertyCard.test.tsx
import { render, screen } from '@testing-library/react';
import PropertyCard from './PropertyCard';

describe('PropertyCard', () => {
  const mockProperty = {
    id: '1',
    title: 'Test Property',
    pricePerNight: '1000',
    city: 'Addis Ababa',
  };

  it('renders property title', () => {
    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText('Test Property')).toBeInTheDocument();
  });

  it('displays price correctly', () => {
    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText(/1000 ETB/)).toBeInTheDocument();
  });
});
```

### Documentation

**Component Documentation:**
```typescript
/**
 * PropertyCard - Displays a property listing card
 * 
 * @param property - Property object with details
 * @param onFavorite - Optional callback when favorited
 * @param showPrice - Whether to display price (default: true)
 * 
 * @example
 * ```tsx
 * <PropertyCard
 *   property={property}
 *   onFavorite={(id) => handleFavorite(id)}
 *   showPrice={true}
 * />
 * ```
 */
export function PropertyCard({
  property,
  onFavorite,
  showPrice = true
}: PropertyCardProps) {
  // Implementation
}
```

---

## Component Checklist

Before creating a new component:

- [ ] Is it reusable?
- [ ] Does it have a single responsibility?
- [ ] Are props well-typed?
- [ ] Is it accessible (ARIA, keyboard nav)?
- [ ] Is it responsive?
- [ ] Does it handle loading/error states?
- [ ] Is it documented?
- [ ] Does it follow design system?
- [ ] Is it performant?
- [ ] Can it be tested?

---

## Resources

### Design Tools
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Material Symbols](https://fonts.google.com/icons)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)

### Inspiration
- Ethiopian coffee culture
- Highland landscapes
- Traditional architecture
- Modern minimalism

### Accessibility
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Practices](https://www.w3.org/WAI/ARIA/apg/)

---

**Document Version**: 1.0.0  
**Last Updated**: January 2024  
**Maintained By**: Engida Development Team
