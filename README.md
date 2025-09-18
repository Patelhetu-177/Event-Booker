# Event Booking System

A comprehensive event booking and management system built with Next.js, TypeScript, and Prisma. This application allows users to discover events, make reservations, process payments, and provides administrative tools for event organizers.

## 🚀 Features

### For Customers
- **Event Discovery**: Browse and search available events
- **Ticket Reservation**: Reserve tickets for events
- **Payment Processing**: Secure payment system for ticket purchases
- **Reservation Management**: View and manage your bookings

### For Organizers
- **Event Management**: Create, update, and manage events
- **Ticket Management**: Set pricing and availability for event tickets
- **Dashboard**: Monitor event performance and reservations

### For Administrators
- **User Management**: Manage user accounts and roles
- **System Overview**: Complete system administration capabilities
- **Event Oversight**: Oversee all events across the platform

## 🛠️ Tech Stack

- **Frontend**: Next.js 15.5.3, React 19, TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Lucide React
- **Form Handling**: React Hook Form with Zod validation
- **Testing**: Jest with Testing Library

## 📋 Prerequisites

Before running this project, make sure you have:

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn package manager

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd event-booking-system
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Setup

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/event_booking_db"

# JWT Secrets
JWT_SECRET="your-jwt-secret-key"
JWT_REFRESH_SECRET="your-jwt-refresh-secret-key"

# Next.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"
```

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Seed the database (optional)
npm run prisma:seed
```

### 5. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```
src/
├── app/
│   ├── api/                    # API routes
│   │   ├── admin/             # Admin-specific endpoints
│   │   ├── auth/              # Authentication endpoints
│   │   ├── events/            # Event management
│   │   ├── organizer/         # Organizer-specific endpoints
│   │   ├── payments/          # Payment processing
│   │   ├── reservations/      # Reservation management
│   │   ├── tickets/           # Ticket management
│   │   └── users/             # User management
│   ├── dashboard/             # Dashboard pages
│   └── login/                 # Authentication pages
├── components/                # Reusable UI components
├── context/                   # React context providers
├── lib/                       # Utility functions and configurations
└── types/                     # TypeScript type definitions

prisma/
├── schema.prisma              # Database schema
└── seed.ts                    # Database seeding script
```

## 🗄️ Database Schema

The application uses the following main entities:

- **User**: Customer, Organizer, and Admin accounts
- **Event**: Events created by organizers
- **Ticket**: Individual tickets for events
- **Reservation**: User reservations for tickets
- **Payment**: Payment records for reservations
- **RefreshToken**: JWT refresh token management

## 🔐 Authentication & Authorization

The system implements role-based access control with three user roles:

- **Customer**: Can browse events, make reservations, and process payments
- **Organizer**: Can create and manage their own events and tickets
- **Admin**: Full system access and user management capabilities

Authentication is handled via JWT tokens with refresh token rotation for enhanced security.

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run prisma:seed` - Seed the database

## 🚀 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Deploy on Vercel

The easiest way to deploy is using the [Vercel Platform](https://vercel.com/new):

1. Connect your GitHub repository
2. Configure environment variables
3. Deploy automatically on every push

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions, please:

1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Contact the development team

---

Built with ❤️ using Next.js and TypeScript
