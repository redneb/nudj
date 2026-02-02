import type {Component} from "solid-js";
import styles from "./StatusIndicator.module.css";

export interface StatusIndicatorProps {
	type: "success" | "warning";
	text: string;
}

export const StatusIndicator: Component<StatusIndicatorProps> = (props) => {
	return (
		<div class={styles.indicator} classList={{[styles[props.type]!]: true}}>
			<span class={styles.icon}>
				{props.type === "success" ? "✓" : "⚠"}
			</span>
			<span>{props.text}</span>
		</div>
	);
};
