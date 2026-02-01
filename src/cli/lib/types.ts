import type {PairingData} from "../../common/types.ts";

/**
 * Stored receiver configuration (CLI side only).
 * Extends PairingData with metadata.
 */
export interface ReceiverConfig extends PairingData {
	/** User-defined name for this receiver */
	name: string;
	/** ISO timestamp when receiver was added */
	addedAt: string;
	/** ISO timestamp of last successful push, or null if never used */
	lastUsedAt: string | null;
}

/**
 * CLI configuration file structure.
 */
export interface Config {
	receivers: ReceiverConfig[];
}
