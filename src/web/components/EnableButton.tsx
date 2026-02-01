import {type Component, createSignal} from "solid-js";

export interface EnableButtonProps {
	onEnable: () => Promise<void>;
}

export const EnableButton: Component<EnableButtonProps> = (props) => {
	const [isLoading, setIsLoading] = createSignal(false);

	const handleClick = async () => {
		setIsLoading(true);
		try {
			await props.onEnable();
		}
		finally {
			setIsLoading(false);
		}
	};

	return (
		<button
			class="enable-button"
			onClick={handleClick}
			disabled={isLoading()}
		>
			{isLoading() ? "Enabling..." : "Enable Notifications"}
		</button>
	);
};
