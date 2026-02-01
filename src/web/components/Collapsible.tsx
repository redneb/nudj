import {type Component, type JSX, createSignal} from "solid-js";

export interface CollapsibleProps {
	title: string;
	children: JSX.Element;
}

export const Collapsible: Component<CollapsibleProps> = (props) => {
	const [isOpen, setIsOpen] = createSignal(false);

	const toggle = () => setIsOpen(!isOpen());

	return (
		<div class="collapsible">
			<button
				class="collapsible__header"
				onClick={toggle}
				aria-expanded={isOpen()}
			>
				<span class="collapsible__title">{props.title}</span>
				<span class={`collapsible__icon ${isOpen() ? "collapsible__icon--open" : ""}`}>
					›
				</span>
			</button>
			<div
				class="collapsible__content"
				style={{display: isOpen() ? "block" : "none"}}
			>
				{props.children}
			</div>
		</div>
	);
};
