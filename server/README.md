# K-3 Repeated Reading App Server

This is the backend server for the K-3 Repeated Reading application, designed to help young students improve their reading fluency through repeated reading practice, immediate error correction, and rewards for progress.

## Features

- **User Management**: Register and manage teachers and students
- **Reading Materials**: Store and retrieve grade-appropriate reading texts
- **Reading Sessions**: Track reading performance including words correct per minute (WCPM)
- **Error Tracking**: Record specific reading errors for targeted improvement
- **Progress Monitoring**: Track student progress over time
- **Achievements & Rewards**: Motivate students through gamification
- **Assignment System**: Allow teachers to assign reading materials to students

## Technology Stack

- Node.js
- Express.js
- PostgreSQL
- JSON Web Token (JWT) for authentication
- bcrypt for password hashing

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- PostgreSQL (v12 or later)

### Installation

1. Clone the repository
2. Navigate to the server directory
3. Install dependencies:

```bash
npm install
```

4. Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

5. Modify the `.env` file with your database credentials and JWT secret

6. Initialize the database:

```bash
psql -U postgres -f ../db/schema.sql
```

### Running the Server

Development mode with auto-restart:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/teacher/register` - Register a new teacher
- `POST /api/auth/teacher/login` - Login as a teacher
- `POST /api/auth/student/login` - Login as a student

### User Management Endpoints

- `GET /api/users` - Get all users (students)
- `GET /api/users/:id` - Get a specific user
- `POST /api/users` - Create a new user (student)
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user
- `GET /api/users/:id/achievements` - Get user achievements
- `GET /api/users/:id/assignments` - Get user reading assignments
- `GET /api/users/:id/progress` - Get detailed user progress

### Reading Materials Endpoints

- `GET /api/reading-materials` - Get all reading materials
- `GET /api/reading-materials/:id` - Get a specific reading material
- `POST /api/reading-materials` - Create a new reading material
- `PUT /api/reading-materials/:id` - Update a reading material
- `DELETE /api/reading-materials/:id` - Delete a reading material
- `GET /api/reading-materials/recommended/:userId` - Get recommended materials for a user
- `GET /api/reading-materials/categories` - Get all reading material categories

### Reading Sessions Endpoints

- `POST /api/reading-sessions` - Create a new reading session
- `GET /api/reading-sessions/user/:userId` - Get all sessions for a user
- `GET /api/reading-sessions/:id` - Get a specific session
- `POST /api/reading-sessions/:id/errors` - Add errors to a session
- `GET /api/reading-sessions/analyze/:userId` - Analyze reading performance

## Security

- All passwords are securely hashed using bcrypt
- API routes are protected with JWT authentication
- Role-based access control restricts access to endpoints
- Input validation using express-validator
- Error handling and logging for security issues

## License

This project is proprietary and confidential. Unauthorized copying, transferring, or reproduction of the contents of this project, via any medium is strictly prohibited. 