import {type Component, type JSX, createSignal} from "solid-js";
import styles from "./Collapsible.module.css";

export interface CollapsibleProps {
	title: string;
	children: JSX.Element;
}

export const Collapsible: Component<CollapsibleProps> = (props) => {
	const [isOpen, setIsOpen] = createSignal(false);

	const toggle = () => setIsOpen(!isOpen());

	return (
		<div class={styles.collapsible}>
			<button
				class={styles.header}
				onClick={toggle}
				aria-expanded={isOpen()}
			>
				<span class={styles.title}>{props.title}</span>
				<span class={styles.icon} classList={{[styles.iconOpen!]: isOpen()}}>
					›
				</span>
			</button>
			<div
				class={styles.content}
				style={{display: isOpen() ? "block" : "none"}}
			>
				{props.children}
			</div>
		</div>
	);
};
