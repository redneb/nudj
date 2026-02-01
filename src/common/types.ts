/**
 * Pairing data structure shared between CLI and PWA.
 * This is what gets base64url-encoded into the pairing code.
 */
export interface PairingData {
	/** Push service endpoint URL */
	endpoint: string;

	/** Encryption keys from PushSubscription */
	keys: {
		/** ECDH public key (base64url) */
		p256dh: string;
		/** Auth secret (base64url) */
		auth: string;
	};

	/** VAPID credentials */
	vapid: {
		/** VAPID private key (base64url) */
		privateKey: string;
	};
}

/**
 * Notification payload sent via push.
 */
export interface NotificationPayload {
	title: string;
	body: string;
	timestamp: number;
}
