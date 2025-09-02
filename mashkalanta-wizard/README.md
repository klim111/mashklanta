# משכלנתא - Mortgage Wizard

A production-ready Hebrew/RTL mortgage planning wizard with a clean UI/UX skeleton. This is a demo version with placeholder calculations and stubbed business logic.

## 🚀 Features

- **Full RTL Support**: Native Hebrew interface with proper right-to-left layout
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Accessible**: WCAG compliant with keyboard navigation and screen reader support
- **Modern Stack**: Built with Next.js 15, TypeScript, Tailwind CSS, and shadcn/ui
- **State Management**: Zustand for UI state management
- **Smooth Animations**: Framer Motion for subtle transitions

## 📁 Project Structure

```
mashkalanta-wizard/
├── app/
│   ├── page.tsx                    # Main wizard page
│   ├── layout.tsx                  # Root layout with RTL and Hebrew font
│   ├── globals.css                 # Global styles and theme
│   └── (wizard)/
│       └── wizard/
│           └── page.tsx            # Alternative route for wizard
├── src/
│   ├── store/
│   │   └── useWizardStore.ts      # Zustand store for UI state
│   └── components/
│       ├── LayoutShell.tsx        # Main layout wrapper
│       ├── TopNav.tsx             # Top navigation bar
│       ├── Stepper.tsx            # 3-stage progress indicator
│       ├── CostRail.tsx           # Cost summary sidebar
│       ├── StageCards.tsx         # Main stage cards container
│       ├── MiniCalc.tsx           # Generic calculator component
│       ├── DNAProfile.tsx         # Financial DNA profile sliders
│       ├── BankQuotesTable.tsx    # Bank quotes input table
│       ├── BankMixer.tsx          # Bank selection per track
│       ├── Guard.tsx              # Missing steps alert
│       └── PDFButton.tsx          # PDF download button
└── components/ui/                 # shadcn/ui components
```

## 🎯 Three Main Stages

1. **הכרת הלקוח (Discovery)**: Client profiling with equity and affordability calculators
2. **בניית תמהיל (Design)**: Building mortgage mix based on financial DNA profile
3. **מו״מ מול הבנקים (Market)**: Comparing bank offers and selecting best rates

## 🔧 Installation & Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🔌 Integration Points

### 1. Real Financial Calculations

Replace stub calculations in `MiniCalc.tsx`:

```typescript
// Current stub in MiniCalc.tsx
const calculateEquity = (values: Record<string, number>) => {
  return Math.max(0, values.cash + values.family - values.buffer);
};

// Replace with real calculation
const calculateEquity = (values: Record<string, number>) => {
  // Add real equity calculation logic
  // Consider taxes, fees, etc.
};
```

### 2. DNA Profile to Mortgage Mix Mapping

In `DNAProfile.tsx`, connect the sliders to actual mortgage mix generation:

```typescript
// Add a service to map DNA profile to mortgage tracks
const generateMortgageMix = (profile: DNAProfile) => {
  // Implement algorithm to generate optimal mix
  // Based on stability, flexibility, price sensitivity, etc.
};
```

### 3. Bank Rate Calculations

In `BankMixer.tsx`, implement real monthly payment calculations:

```typescript
// Replace stub with actual calculation
const calculateMonthlyPayment = (tracks: Track[], selections: BankSelections) => {
  // Implement PMT formula for each track
  // Sum up all monthly payments
};
```

### 4. PDF Generation

To enable PDF generation:

1. Create an API route at `/app/api/pdf/route.ts`
2. Use jsPDF (already installed) or a server-side solution
3. Connect to `PDFButton.tsx`

```typescript
// app/api/pdf/route.ts
import { NextResponse } from 'next/server';
import jsPDF from 'jspdf';

export async function POST(request: Request) {
  const data = await request.json();
  // Generate PDF with data
  // Return PDF blob
}
```

### 5. Data Persistence

Add a persistence layer using:
- LocalStorage for client-side persistence
- Database (PostgreSQL/MongoDB) for server-side
- Add API routes for saving/loading wizard state

## 🎨 Customization

### Theme Colors

Edit color variables in `/app/globals.css`:

```css
:root {
  --primary: oklch(0.55 0.15 185);    /* Teal accent */
  --background: oklch(0.985 0.005 90); /* Neutral background */
}
```

### Hebrew Copy

All Hebrew text is inline in components. To manage translations:
1. Create a `/src/locales/he.json` file
2. Use a i18n library like `next-intl`
3. Replace hardcoded strings with translation keys

## 🚦 Development Guidelines

1. **RTL First**: Always test UI changes in RTL mode
2. **Hebrew Typography**: Use the Heebo font for optimal Hebrew rendering
3. **Accessibility**: Test with keyboard navigation and screen readers
4. **Mobile First**: Design for mobile, enhance for desktop
5. **Performance**: Keep bundle size minimal, lazy load heavy components

## 📝 Environment Variables

Create a `.env.local` file for configuration:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_PDF_ENABLED=false
```

## 🧪 Testing

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests (when added)
npm test
```

## 🚀 Deployment

The app is ready for deployment to Vercel, Netlify, or any Node.js hosting:

```bash
# Build for production
npm run build

# Start production server
npm start
```

For Vercel:
```bash
vercel deploy
```

## 📄 License

This is a demo project for educational purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📞 Support

For questions or issues, please open a GitHub issue.

---

Built with ❤️ for the Israeli mortgage market