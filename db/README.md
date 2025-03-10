# RepeatedReading PostgreSQL Docker Setup

This repository contains Docker configuration for setting up the PostgreSQL database for the K-3 Repeated Reading App.

## Database Schema

The database schema includes tables for:
- Schools and Teachers
- Users (Students)
- Reading Materials and Categories
- Reading Sessions and Errors
- Achievements and Rewards
- User Progress and Daily Goals
- Reading Assignments

## Development Data

The database comes pre-loaded with seed data for development and testing purposes, including:
- 3 schools and 4 teachers
- 8 students across different grade levels
- 13 reading materials of various difficulty levels
- Sample reading sessions, errors, achievements, and rewards
- Realistic user progress data and daily goals
- Example reading assignments

## Prerequisites

- Docker
- Docker Compose

## Getting Started

1. Clone this repository:
```bash
git clone <repository-url>
cd repeatedreading
```

2. Build and start the Docker container:
```bash
docker-compose up -d
```

3. Verify the database is running:
```bash
docker-compose ps
```

4. Connect to the database:
```bash
docker exec -it repeatedreading-postgres psql -U postgres -d repeatedreading
```

5. To stop the container:
```bash
docker-compose down
```

## Configuration

- PostgreSQL Database Name: `repeatedreading`
- PostgreSQL Username: `postgres`
- PostgreSQL Password: `postgres`
- PostgreSQL Port: `5432`

You can modify these settings in the `docker-compose.yml` file.

## Data Persistence

Database data is persisted in a Docker volume called `postgres_data`. This ensures that your data remains intact even if you stop or remove the container.

## Initialization

The database is automatically initialized when the container is first created using:
- `schema.sql` - Creates the database schema (tables, indexes, etc.)
- `seed.sql` - Populates the database with sample data for development

## Customization

To customize the PostgreSQL configuration, you can:
1. Modify environment variables in the `docker-compose.yml` file
2. Edit the schema in `db/schema.sql` before building the container
3. Modify the seed data in `db/seed.sql` for different test data

## Helper Script

The included `docker-helpers.sh` script provides convenient commands for managing the database:

```bash
# Start the database
./docker-helpers.sh start

# Stop the database
./docker-helpers.sh stop

# Restart the database
./docker-helpers.sh restart

# Check database status
./docker-helpers.sh status

# Connect to the database with psql
./docker-helpers.sh connect

# Create a database backup
./docker-helpers.sh backup

# Restore from a backup file
./docker-helpers.sh restore path/to/backup.sql
``` 