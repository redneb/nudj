import logoSvg from "../assets/logo.svg?raw";

export const Logo = () => (
	// eslint-disable-next-line solid/no-innerhtml
	<span class="logo" innerHTML={logoSvg} aria-hidden="true" />
);
