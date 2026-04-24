import { setGlobalOptions } from "firebase-functions";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();

// Triggers when a new booking is created in Firestore
export const onBookingCreated = onDocumentCreated(
  "bookings/{bookingId}",
  async (event) => {
    const booking = event.data?.data();
    if (!booking) return;

    const { customerName, phone, serviceId, date, time, businessId } = booking;

    logger.info("New booking received", {
      bookingId: event.params.bookingId,
      customerName,
      phone,
      serviceId,
      date,
      time,
      businessId,
    });

    // Update booking status to "confirmed"
    await event.data?.ref.update({ status: "confirmed" });

    logger.info(`Booking confirmed for ${customerName} on ${date} at ${time}`);

    // TODO: Add SMS via Twilio or email via SendGrid here
  }
);
