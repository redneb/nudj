import {type Component, createSignal} from "solid-js";
import {truncatePairingCode} from "../lib/pairing.ts";

export interface PairingCodeProps {
	code: string;
}

export const PairingCode: Component<PairingCodeProps> = (props) => {
	const [copied, setCopied] = createSignal(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(props.code);
			setCopied(true);
			setTimeout(() => setCopied(false), 2_000);
		}
		catch (error) {
			console.error("Failed to copy:", error);
		}
	};

	return (
		<div class="pairing-code">
			<code class="pairing-code__text">
				{truncatePairingCode(props.code)}
			</code>
			<button
				class="pairing-code__button"
				onClick={handleCopy}
			>
				{copied() ? "Copied!" : "Copy"}
			</button>
		</div>
	);
};
