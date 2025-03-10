FROM postgres:14

# Set environment variables
ENV POSTGRES_DB=repeatedreading
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres

# Copy initialization scripts
COPY schema.sql /docker-entrypoint-initdb.d/01-schema.sql
COPY seed.sql /docker-entrypoint-initdb.d/02-seed.sql

# Expose the PostgreSQL port
EXPOSE 5432

# Set health check
HEALTHCHECK --interval=5s --timeout=5s --retries=3 \
  CMD pg_isready -U postgres -d repeatedreading || exit 1 