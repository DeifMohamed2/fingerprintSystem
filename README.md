# Attendance Fingerprint System

A comprehensive attendance management system using fingerprint biometrics for educational institutions and organizations.

## Features

- **Fingerprint Biometric Authentication**: Secure attendance tracking using fingerprint scanners
- **Multi-Role Management**: Admin, Employee, and Supervisor roles with different access levels
- **Real-time Attendance Monitoring**: Live attendance updates via WebSocket connections
- **Student Management**: Complete student enrollment and tracking system
- **Payment Tracking**: Track student payments and remaining balances
- **Report Generation**: Excel export functionality for attendance reports
- **WhatsApp Integration**: Automated notifications and communication
- **KPI Dashboard**: Performance metrics and analytics

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Frontend**: EJS templating with Material Dashboard
- **Real-time**: Socket.io for live updates
- **Biometric**: Python-based fingerprint device integration
- **Authentication**: JWT-based session management

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Start MongoDB service
5. Run the application: `npm start`

## Configuration

The system uses environment variables for configuration. Set up your `.env` file with:

- `MONGO_URL`: MongoDB connection string (defaults to localhost)
- `JWT_SECRET`: Secret key for JWT authentication
- Other service-specific configurations

## Usage

1. Access the system through your web browser
2. Login with appropriate credentials (Admin/Employee/Supervisor)
3. Set up fingerprint devices and student enrollment
4. Monitor attendance in real-time
5. Generate reports and track payments

## License

ISC License