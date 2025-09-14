
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as webpush from "web-push";

// Initialize the Admin SDK
admin.initializeApp();

const db = admin.firestore();

// VAPID keys should be generated once and stored securely
// You can generate them using `npx web-push generate-vapid-keys`
// Store these in Firebase environment variables for security
// For demo purposes, I'm defining them here.
// In a real app, set them using:
// firebase functions:config:set push.vapid_public="YOUR_PUBLIC_KEY"
// firebase functions:config:set push.vapid_private="YOUR_PRIVATE_KEY"
const vapidKeys = {
  publicKey: functions.config().push?.vapid_public || "BPE42ljd1y5w-S-LAgEtO1i730iIeCVu3iYqgqfohZ3yI_AB5h2x3Gj-rdq2rGk1k5lZxnCV5Z_s9aOoZpPjGdo",
  privateKey: functions.config().push?.vapid_private || "Wc254bO8Gf91ZJt-i2g7Hgm-u2FprG_Esdgse4y9Roo",
};

webpush.setVapidDetails(
  "mailto:example@your-domain.org",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

/**
 * A scheduled Cloud Function that runs every 24 hours to delete past events.
 */
export const autoDeletePastEvents = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    functions.logger.info("Starting past events cleanup task.");

    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    const pastEventsQuery = db.collection("events").where("date", "<", todayStr);

    try {
      const snapshot = await pastEventsQuery.get();

      if (snapshot.empty) {
        functions.logger.info("No past events found to delete.");
        return null;
      }

      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        functions.logger.info(`Deleting event: ${doc.id}`);
        batch.delete(doc.ref);
      });

      await batch.commit();

      functions.logger.info(`Successfully deleted ${snapshot.size} past events.`);
      return null;
    } catch (error) {
      functions.logger.error("Error deleting past events:", error);
      return null;
    }
  });


/**
 * Triggers when a new announcement is created and sends push notifications.
 */
export const sendNotificationOnNewAnnouncement = functions.firestore
  .document("announcements/{announcementId}")
  .onCreate(async (snapshot, context) => {
    const announcement = snapshot.data();

    if (!announcement) {
      functions.logger.log("No data associated with the event");
      return;
    }

    const payload = JSON.stringify({
      title: `New Announcement: ${announcement.authorName}`,
      body: announcement.content,
      icon: "/icons/icon-192x192.png", // Optional: Add an icon
      data: {
        url: "/dashboard/announcements", // URL to open on notification click
      },
    });

    try {
      // Get all users in the same department
      const usersSnapshot = await db.collection("users")
        .where("department", "==", announcement.authorDepartment)
        .get();

      if (usersSnapshot.empty) {
        functions.logger.log("No users found for department:", announcement.authorDepartment);
        return;
      }

      const notificationPromises: Promise<any>[] = [];

      usersSnapshot.forEach((userDoc) => {
        const userId = userDoc.id;
        const subscriptionsQuery = db.collection("users").doc(userId).collection("subscriptions");
        
        subscriptionsQuery.get().then((subscriptionsSnapshot) => {
          subscriptionsSnapshot.forEach((subDoc) => {
            const subscription = subDoc.data();
            functions.logger.log(`Sending notification to user ${userId}`);
            notificationPromises.push(
              webpush.sendNotification(subscription, payload)
            );
          });
        }).catch(err => functions.logger.error("Error getting subscriptions", err));
      });

      await Promise.all(notificationPromises);
      functions.logger.log("Notifications sent successfully.");
    } catch (error) {
      functions.logger.error("Error sending notifications:", error);
    }
  });

