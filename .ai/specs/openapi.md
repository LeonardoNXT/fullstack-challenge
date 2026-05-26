# Spec - OpenAPI

## Goal

Expose API documentation for both backend services with Swagger/OpenAPI.

## Backend Requirements

- Install and configure `@nestjs/swagger`.
- Expose docs for Games Service.
- Expose docs for Wallets Service.
- Document auth requirements per route.
- Document request/response DTOs and error response shape.

## Suggested Routes

- Games docs: direct `http://localhost:4001/docs`, through Kong `http://localhost:8000/games/docs` if routing supports it.
- Wallets docs: direct `http://localhost:4002/docs`, through Kong `http://localhost:8000/wallets/docs` if routing supports it.

## Acceptance Criteria

- Swagger UI loads for both services.
- OpenAPI JSON is available for both services.
- README final references docs URLs.
