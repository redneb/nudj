import {type Component, createSignal, Switch, Match, onMount} from "solid-js";
import {Collapsible} from "./components/Collapsible.tsx";
import {EnableButton} from "./components/EnableButton.tsx";
import {Logo} from "./components/Logo.tsx";
import {PairingCode} from "./components/PairingCode.tsx";
import {StatusIndicator} from "./components/StatusIndicator.tsx";
import {generateVapidKeys} from "./lib/vapid.ts";
import {getVapidKeys, setVapidKeys, clearVapidKeys} from "./lib/storage.ts";
import {
	isPushSupported,
	getPermissionState,
	requestPermission,
	getSubscription,
	createSubscription,
	unsubscribe,
	registerServiceWorker,
} from "./lib/push.ts";
import {generatePairingCode} from "./lib/pairing.ts";
import styles from "./App.module.css";

type AppState = "loading" | "unsupported" | "prompt" | "denied" | "enabled";

export const App: Component = () => {
	const [state, setState] = createSignal<AppState>("loading");
	const [pairingCode, setPairingCode] = createSignal<string | null>(null);
	const [isResetting, setIsResetting] = createSignal(false);

	onMount(async () => {
		// Register service worker first
		await registerServiceWorker();

		// Check browser support
		if (!isPushSupported()) {
			setState("unsupported");
			return;
		}

		// Check permission state
		const permission = getPermissionState();
		if (permission === "denied") {
			setState("denied");
			return;
		}

		// Check for existing subscription
		if (permission === "granted") {
			const subscription = await getSubscription();
			const vapidKeys = getVapidKeys();

			if (subscription && vapidKeys) {
				const code = generatePairingCode(subscription, vapidKeys.privateKey);
				setPairingCode(code);
				setState("enabled");
				return;
			}
		}

		setState("prompt");
	});

	const handleEnable = async () => {
		// Request permission
		const permission = await requestPermission();

		if (permission === "denied") {
			setState("denied");
			return;
		}

		if (permission !== "granted")
			return;

		// Generate or get VAPID keys
		let vapidKeys = getVapidKeys();
		if (!vapidKeys) {
			vapidKeys = await generateVapidKeys();
			setVapidKeys(vapidKeys);
		}

		// Create subscription
		const subscription = await createSubscription(vapidKeys.publicKey);

		// Generate pairing code
		const code = generatePairingCode(subscription, vapidKeys.privateKey);
		setPairingCode(code);
		setState("enabled");
	};

	const handleReset = async () => {
		setIsResetting(true);
		try {
			// Unsubscribe from push
			await unsubscribe();

			// Clear stored keys
			clearVapidKeys();

			// Generate new keys
			const vapidKeys = await generateVapidKeys();
			setVapidKeys(vapidKeys);

			// Create new subscription
			const subscription = await createSubscription(vapidKeys.publicKey);

			// Generate new pairing code
			const code = generatePairingCode(subscription, vapidKeys.privateKey);
			setPairingCode(code);
		}
		catch (error) {
			console.error("Failed to reset:", error);
		}
		finally {
			setIsResetting(false);
		}
	};

	return (
		<div class={styles.app}>
			<header class={styles.header}>
				<Logo />
				<h1 class={styles.title}>nudj</h1>
			</header>

			<main class={styles.main}>
				<Switch>
					<Match when={state() === "loading"}>
						<div class={styles.loading}>Loading...</div>
					</Match>

					<Match when={state() === "unsupported"}>
						<StatusIndicator type="warning" text="Not supported" />
						<p class={styles.helpText}>
							Your browser doesn't support push notifications.
							Please use a modern browser like Chrome, Firefox, or Safari.
						</p>
					</Match>

					<Match when={state() === "denied"}>
						<StatusIndicator type="warning" text="Notifications blocked" />
						<p class={styles.helpText}>
							You've blocked notifications for this site. To use nudj, you need to allow notifications.
						</p>
						<Collapsible title="How to enable notifications">
							<div class={styles.helpContent}>
								<p><strong>iOS (Safari):</strong></p>
								<ol>
									<li>Open Settings → Safari → nudj</li>
									<li>Enable "Allow Notifications"</li>
									<li>Reload this page</li>
								</ol>
								<p><strong>Android (Chrome):</strong></p>
								<ol>
									<li>Tap the lock icon in the address bar</li>
									<li>Tap "Site settings"</li>
									<li>Enable "Notifications"</li>
									<li>Reload this page</li>
								</ol>
								<p><strong>Desktop:</strong></p>
								<ol>
									<li>Click the lock/info icon in the address bar</li>
									<li>Find "Notifications" and set to "Allow"</li>
									<li>Reload this page</li>
								</ol>
							</div>
						</Collapsible>
					</Match>

					<Match when={state() === "enabled" && pairingCode()}>
						<StatusIndicator type="success" text="Notifications enabled" />
						<PairingCode code={pairingCode()!} />
						<p class={styles.helpText}>
							Paste this code into the nudj CLI on your computer to pair.
						</p>
						<div class={styles.divider} />
						<Collapsible title="How to use">
							<div class={styles.helpContent}>
								<ol>
									<li>Copy the pairing code above</li>
									<li>
										On your computer, install the nudj CLI:
										<pre><code>npm install -g nudj</code></pre>
										Or download from GitHub Releases
									</li>
									<li>
										Run:
										<code>nudj pair</code>
									</li>
									<li>Paste the pairing code when prompted</li>
									<li>
										Send notifications:
										<code>nudj push "Hello!"</code>
									</li>
								</ol>
							</div>
						</Collapsible>
						<Collapsible title="Security">
							<div class={styles.helpContent}>
								<p>Your privacy is protected by design:</p>
								<ul>
									<li>The pairing code contains encryption keys — treat it like a password</li>
									<li>Only devices you've paired can send you notifications</li>
									<li>Push services cannot read your notification content</li>
									<li>The nudj creators have no access to your keys or messages</li>
								</ul>
								<div class={styles.securityDivider} />
								<p>
									If you believe your pairing code was compromised, you can reset your subscription below.
									This generates new encryption keys.
								</p>
								<p class={styles.warningText}>
									<strong>⚠ Important:</strong>
									{" "}
									Resetting will disconnect ALL your paired devices.
									You'll need to re-pair each one.
								</p>
								<button
									class={styles.resetButton}
									onClick={handleReset}
									disabled={isResetting()}
								>
									{isResetting() ? "Resetting..." : "Reset Subscription"}
								</button>
							</div>
						</Collapsible>
					</Match>

					<Match when={state() === "prompt"}>
						<EnableButton onEnable={handleEnable} />
						<Collapsible title="How to install this app">
							<div class={styles.helpContent}>
								<p><strong>iOS (Safari):</strong></p>
								<ol>
									<li>Tap the Share button (□↑)</li>
									<li>Scroll down and tap "Add to Home Screen"</li>
									<li>Tap "Add"</li>
								</ol>
								<p><strong>Android (Chrome):</strong></p>
								<ol>
									<li>Tap the menu (⋮) or look for the install prompt</li>
									<li>Tap "Install app" or "Add to Home Screen"</li>
									<li>Tap "Install"</li>
								</ol>
								<p class={styles.note}>
									Note: Push notifications work best when the app is installed to your home screen.
								</p>
							</div>
						</Collapsible>
						<Collapsible title="What is nudj?">
							<div class={styles.helpContent}>
								<p>
									nudj lets you send push notifications from your computer to your phone
									using a simple command-line tool.
								</p>
								<ul>
									<li>No account required</li>
									<li>No cloud service — your data stays yours</li>
									<li>End-to-end encrypted — only you can read your notifications</li>
								</ul>
							</div>
						</Collapsible>
					</Match>
				</Switch>
			</main>
		</div>
	);
};
