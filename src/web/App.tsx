import {type Component, createSignal, Show, Switch, Match, onMount} from "solid-js";
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

type AppState = "loading" | "unsupported" | "prompt" | "denied" | "enabled" | "recover" | "subscriptionLost";

export const App: Component = () => {
	const [state, setState] = createSignal<AppState>("loading");
	const [pairingCode, setPairingCode] = createSignal<string | null>(null);
	const [isResetting, setIsResetting] = createSignal(false);
	const [isDisabling, setIsDisabling] = createSignal(false);

	const getDisplayMode = (): string => {
		if (window.matchMedia("(display-mode: standalone)").matches)
			return "standalone";
		if (window.matchMedia("(display-mode: minimal-ui)").matches)
			return "minimal-ui";
		if (window.matchMedia("(display-mode: fullscreen)").matches)
			return "fullscreen";
		return "browser";
	};

	const shouldShowAndroidInstallFirstHint = (): boolean => {
		const userAgent = navigator.userAgent;
		const isAndroid = /Android/i.test(userAgent);
		const isChrome = /Chrome\//i.test(userAgent);
		const isKnownAlternativeBrowser = /EdgA|OPR|SamsungBrowser/i.test(userAgent);
		return isAndroid && isChrome && !isKnownAlternativeBrowser && getDisplayMode() === "browser";
	};

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

			// A subscription without keys is unusable, so clear it and prompt to re-enable.
			if (subscription) {
				await unsubscribe();
				setState("prompt");
				return;
			}

			// Keys with no subscription likely means Chrome rotated/expired the subscription.
			// Keep keys for debugging and ask the user to re-enable.
			if (vapidKeys) {
				setState("subscriptionLost");
				return;
			}
		}

		// Post-install recovery: Chrome Android may reset installed PWAs to
		// "default" permission and drop their push subscription.
		if (permission === "default") {
			const vapidKeys = getVapidKeys();
			if (vapidKeys) {
				const subscription = await getSubscription();
				if (subscription) {
					setState("recover");
					return;
				}
				setState("subscriptionLost");
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

		try {
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
		}
		catch (error) {
			console.error("Failed to enable notifications:", error);

			// Clean up partial state so the next attempt starts fresh
			await unsubscribe();
			clearVapidKeys();
		}
	};

	const handleRecover = async () => {
		const permission = await requestPermission();

		if (permission === "denied") {
			setState("denied");
			return;
		}

		if (permission !== "granted")
			return;

		const subscription = await getSubscription();
		const vapidKeys = getVapidKeys();

		if (subscription && vapidKeys) {
			setPairingCode(generatePairingCode(subscription, vapidKeys.privateKey));
			setState("enabled");
		}
		else {
			// Subscription expired or was revoked - fall through to full setup
			await handleEnable();
		}
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

	const handleDisable = async () => {
		setIsDisabling(true);
		try {
			await unsubscribe();
			clearVapidKeys();
			setPairingCode(null);
			setState("prompt");
		}
		catch (error) {
			console.error("Failed to disable:", error);
		}
		finally {
			setIsDisabling(false);
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

					<Match when={state() === "recover"}>
						<StatusIndicator type="warning" text="Re-enable required" />
						<p class={styles.helpText}>
							You previously enabled notifications in the browser.
							The installed app needs its own permission — your
							pairing code will stay the same.
						</p>
						<EnableButton onEnable={handleRecover} />
					</Match>

					<Match when={state() === "subscriptionLost"}>
						<StatusIndicator type="warning" text="Setup needs refresh" />
						<p class={styles.helpText}>
							Your notification subscription is no longer available.
							Re-enable notifications to create a new pairing code,
							then re-pair all sender devices.
						</p>
						<EnableButton onEnable={handleEnable} />
					</Match>

					<Match when={state() === "enabled" && pairingCode()}>
						<StatusIndicator type="success" text="Notifications enabled" />
						<PairingCode code={pairingCode()!} />
						<p class={styles.helpText}>
							Paste this code into the nudj CLI on your computer to pair.
						</p>
						<Show when={shouldShowAndroidInstallFirstHint()}>
							<p class={styles.note}>
								If you install nudj to your home screen now, Chrome
								may reset this notification setup. If that happens,
								re-enable notifications and re-pair all sender devices.
							</p>
						</Show>
						<div class={styles.divider} />
						<Collapsible title="How to use">
							<div class={styles.helpContent}>
								<ol>
									<li>Copy the pairing code above</li>
									<li>
										On your computer, install the nudj CLI:
										<pre><code>npm install -g nudj</code></pre>
										Or
										{" "}
										<a href="./nudj.js" download="nudj.js">download the standalone script</a>
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
								<p>
									If you believe your pairing code was compromised,
									you can reset your subscription under
									{" "}
									<strong>Manage</strong>
									{" "}
									below.
								</p>
							</div>
						</Collapsible>
						<Collapsible title="Manage">
							<div class={styles.helpContent}>
								<p><strong>Reset Subscription</strong></p>
								<p>
									Generates new encryption keys and a new pairing code
									while keeping notifications active. Use this if your
									pairing code was compromised. All paired devices will
									need to re-pair.
								</p>
								<button
									class={styles.resetButton}
									onClick={handleReset}
									disabled={isResetting() || isDisabling()}
								>
									{isResetting() ? "Resetting..." : "Reset Subscription"}
								</button>
								<div class={styles.divider} />
								<p><strong>Disable Notifications</strong></p>
								<p>
									Removes your push subscription and deletes your
									encryption keys from this device. The app returns
									to its initial state. You can re-enable notifications
									at any time, but you will need to re-pair all your devices.
								</p>
								<button
									class={styles.resetButton}
									onClick={handleDisable}
									disabled={isDisabling() || isResetting()}
								>
									{isDisabling() ? "Disabling..." : "Disable Notifications"}
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
									Tip (Android): If you plan to install nudj to your home
									screen ("Install app" / "Add to Home Screen"), do that
									before enabling notifications. Installing later may
									require re-enabling notifications and re-pairing all
									sender devices.
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
									<li>No server — nudj operates no servers and stores none of your data</li>
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
