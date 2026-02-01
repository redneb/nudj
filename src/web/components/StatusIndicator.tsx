import type {Component} from "solid-js";

export interface StatusIndicatorProps {
	type: "success" | "warning";
	text: string;
}

export const StatusIndicator: Component<StatusIndicatorProps> = (props) => {
	return (
		<div class={`status-indicator status-indicator--${props.type}`}>
			<span class="status-indicator__icon">
				{props.type === "success" ? "✓" : "⚠"}
			</span>
			<span class="status-indicator__text">{props.text}</span>
		</div>
	);
};
