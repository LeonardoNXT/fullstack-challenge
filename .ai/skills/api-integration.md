# Skill - API Integration

## REST

- All browser API calls go through Kong at `http://localhost:8000`.
- Authenticated calls attach bearer token.
- Use typed request/response DTOs.
- Treat all server errors as displayable but not necessarily user-friendly.

## WebSocket

- Subscribe to server events.
- Fetch REST snapshot on connect/reconnect.
- Use WebSocket for real-time updates, not commands.

## RabbitMQ

- Define message contracts centrally.
- Include `eventId` and `correlationId`.
- Consumers must be idempotent.
- Use inbox tables for consumed messages.
- Use outbox tables for messages published after database changes.
- Log correlation ids for debugging.

## OpenAPI

- Generate Swagger/OpenAPI docs with `@nestjs/swagger`.
- Keep DTOs and examples aligned with frontend usage.
