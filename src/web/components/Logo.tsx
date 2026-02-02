import logoSvg from "../assets/logo.svg?raw";
import styles from "./Logo.module.css";

export const Logo = () => (
	// eslint-disable-next-line solid/no-innerhtml
	<span class={styles.logo} innerHTML={logoSvg} aria-hidden="true" />
);
