// Frontend view models. Server-side canonical DTOs live in `types/database.ts`;
// API routes import those directly. These models add display-only joins
// (customerName, planName, lineItems) and API envelope/pagination helpers.
export * from './ui';
export * from './ui-api';
