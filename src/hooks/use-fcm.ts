
'use client';

import { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

export const useFcm = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !user) {
      return;
    }

    const messaging = getMessaging(app);

    const requestPermission = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted.');
          // Get token
          const currentToken = await getToken(messaging, {
            vapidKey: 'BPE42ljd1y5w-S-LAgEtO1i730iIeCVu3iYqgqfohZ3yI_AB5h2x3Gj-rdq2rGk1k5lZxnCV5Z_s9aOoZpPjGdo',
          });

          if (currentToken) {
            console.log('FCM Token:', currentToken);
            await saveTokenToFirestore(currentToken);
          } else {
            console.log('No registration token available. Request permission to generate one.');
          }
        } else {
          console.log('Unable to get permission to notify.');
        }
      } catch (error) {
        console.error('An error occurred while requesting permission. ', error);
      }
    };

    const saveTokenToFirestore = async (token: string) => {
        if (!user) return;
        const subscriptionsRef = collection(db, 'users', user.uid, 'subscriptions');
        const q = query(subscriptionsRef, where('token', '==', token));
        
        try {
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                // The structure of the subscription object should match what web-push expects.
                // However, we are getting the token from FCM, which is just a string.
                // The `web-push` library requires an object with `endpoint`, and `keys`.
                // This is a mismatch. Let's assume the token is the endpoint for now.
                // A full implementation would use the Push API directly to get the subscription object.
                // For this demo, we'll store the token and the cloud function will need to adapt.
                // A better approach is to get the full subscription object.
                // Let's get the full subscription object.

                const sw = await navigator.serviceWorker.ready;
                const sub = await sw.pushManager.getSubscription();
                if(sub) {
                   const subJson = sub.toJSON();
                   const subscriptionDocRef = doc(subscriptionsRef, sub.endpoint.split('/').pop());
                   await setDoc(subscriptionDocRef, subJson);
                   console.log('Subscription saved to Firestore.');
                }
            } else {
                console.log('Token already exists for this user.');
            }
        } catch (error) {
            console.error('Error saving token to Firestore: ', error);
        }
    };


    requestPermission();

    const unsubscribeOnMessage = onMessage(messaging, (payload) => {
      console.log('Message received. ', payload);
      toast({
        title: payload.notification?.title,
        description: payload.notification?.body,
      });
    });

    return () => {
      unsubscribeOnMessage();
    };

  }, [user, toast]);
};
