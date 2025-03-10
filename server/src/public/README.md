# Repeated Reading API Playground

This is a browser-based tool for testing and exploring the Repeated Reading API endpoints. It allows you to interact with all available API endpoints, send requests with different parameters, and see the responses in real-time.

## How to Use

1. Start your Express server
2. Navigate to `/api-playground` in your browser (e.g., http://localhost:3000/api-playground)
3. The page will load with tabs for each category of endpoints

## Features

- **Authentication:** Login as either a teacher or student to get an authentication token
- **API Testing:** Test all available endpoints with a simple UI
- **Request Parameters:** Enter parameters for endpoints that require them
- **Response Viewing:** See formatted JSON responses from the API
- **Authentication Integration:** Automatically includes authentication tokens for endpoints that require them

## Endpoint Categories

The playground organizes endpoints into logical categories:

- Healthcheck
- Users
- Teachers
- Schools
- Reading Materials
- Reading Sessions
- Achievements
- Rewards
- Progress
- Goals
- Assignments
- Reading Errors

Each category contains relevant endpoints with UI elements to provide necessary parameters and execute requests.

## Authentication

For endpoints that require authentication, you must first log in using the authentication forms at the top of the page. Once logged in, your authentication token will be displayed and automatically included in requests to protected endpoints. 