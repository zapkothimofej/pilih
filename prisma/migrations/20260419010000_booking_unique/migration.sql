-- A user can't have two bookings of the same type at the same instant.
-- Defends against a client double-click that would otherwise insert
-- duplicate UPCOMING bookings (the route handler only runs a single
-- unchecked prisma.booking.create).
ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_userId_scheduledAt_type_key"
  UNIQUE ("userId", "scheduledAt", "type");
