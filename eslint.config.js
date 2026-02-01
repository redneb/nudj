import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import solid from "eslint-plugin-solid/configs/typescript";
import globals from "globals";
import stylistic from "@stylistic/eslint-plugin";

export default tseslint.config(
	{
		ignores: ["dist/**", "node_modules/**"],
	},

	// Base config
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	stylistic.configs.customize({
		indent: "tab",
		quotes: "double",
		semi: true,
	}),

	// CLI-specific
	{
		files: ["src/cli/**/*.ts"],
		languageOptions: {
			globals: globals.node,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},

	// Web-specific (Solid.js)
	{
		files: ["src/web/**/*.{ts,tsx}"],
		ignores: ["src/web/**/*.test.{ts,tsx}"],
		...solid,
		languageOptions: {
			globals: globals.browser,
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},

	// Web tests
	{
		files: ["src/web/**/*.test.{ts,tsx}"],
		...solid,
		languageOptions: {
			globals: globals.browser,
			parserOptions: {
				project: "./src/web/tsconfig.test.json",
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},

	// Common
	{
		files: ["src/common/**/*.ts"],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},

	// Shared rules
	{
		rules: {
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": ["error", {
				argsIgnorePattern: "^_",
			}],
			"unicode-bom": ["error", "never"],
			"curly": ["error", "multi-or-nest"],
			"eqeqeq": ["error", "always", {
				null: "ignore",
			}],
			"no-loss-of-precision": "warn",
			"require-atomic-updates": "error",
			"no-unneeded-ternary": ["error", {
				defaultAssignment: false,
			}],
			"no-unused-expressions": "error",
			"indent": "off",
			"@stylistic/indent": ["error", "tab", {
				SwitchCase: 1,
				flatTernaryExpressions: true,
			}],
			"@stylistic/linebreak-style": ["error", "unix"],
			"@stylistic/eol-last": ["error", "always"],
			"@stylistic/object-curly-spacing": ["error", "never"],
			"@stylistic/block-spacing": ["error", "never"],
			"@stylistic/quotes": ["error", "double", {
				avoidEscape: true,
				allowTemplateLiterals: "always",
			}],
			"@stylistic/semi": ["error", "always", {
				omitLastInOneLineBlock: true,
			}],
			"@stylistic/semi-style": ["error", "last"],
			"@stylistic/brace-style": ["error", "stroustrup", {
				allowSingleLine: true,
			}],
			"@stylistic/keyword-spacing": ["error", {
				before: true,
				after: true,
			}],
			"@stylistic/space-before-function-paren": ["error", {
				named: "never",
				anonymous: "never",
				asyncArrow: "always",
			}],
			"func-call-spacing": ["error", "never"],
			"@stylistic/arrow-spacing": ["error", {
				before: true,
				after: true,
			}],
			"@stylistic/space-before-blocks": ["error", "always"],
			"@stylistic/space-infix-ops": ["error"],
			"@stylistic/space-unary-ops": ["error", {
				words: true,
				nonwords: false,
			}],
			"@stylistic/array-bracket-spacing": ["error", "never"],
			"@stylistic/space-in-parens": ["error", "never"],
			"@stylistic/computed-property-spacing": ["error", "never"],
			"@stylistic/key-spacing": ["error"],
			"@stylistic/switch-colon-spacing": ["error", {
				after: true,
				before: false,
			}],
			"@stylistic/generator-star-spacing": ["error", {
				before: false,
				after: true,
				method: {
					before: true,
					after: true,
				},
				anonymous: {
					before: false,
					after: false,
				},
			}],
			"@stylistic/yield-star-spacing": ["error", {
				before: false,
				after: true,
			}],
			"@stylistic/semi-spacing": ["error", {
				before: false,
				after: true,
			}],
			"@stylistic/comma-spacing": ["error", {
				before: false,
				after: true,
			}],
			"@stylistic/object-curly-newline": ["error", {
				consistent: true,
				multiline: true,
			}],
			"@stylistic/object-property-newline": ["error", {
				allowAllPropertiesOnSameLine: true,
			}],
			"@stylistic/array-element-newline": ["error", "consistent"],
			"@stylistic/array-bracket-newline": ["error", "consistent"],
			"@stylistic/function-call-argument-newline": ["error", "consistent"],
			"@stylistic/function-paren-newline": ["error", "consistent"],
			"@stylistic/arrow-parens": ["error", "as-needed", {
				requireForBlockBody: true,
			}],
			"@stylistic/no-trailing-spaces": ["warn"],
			"@stylistic/member-delimiter-style": ["error", {
				singleline: {delimiter: "comma"},
			}],
			"@stylistic/comma-style": ["error", "last"],
			"@stylistic/comma-dangle": ["error", "always-multiline"],
			"@stylistic/quote-props": ["warn", "consistent"],
			"@stylistic/padded-blocks": ["warn", "never"],
			"@stylistic/no-multiple-empty-lines": ["warn"],
			"@stylistic/multiline-ternary": "off",
			"@stylistic/operator-linebreak": "off",
		},
	},

	// TypeScript-specific rules
	{
		files: ["**/*.{ts,tsx}"],
		rules: {
			// Use TS-aware version for spacing between function name and paren
			"func-call-spacing": "off",
			"@/func-call-spacing": ["error", "never"],
			"@typescript-eslint/no-non-null-assertion": "off",
			"@typescript-eslint/no-empty-interface": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/restrict-template-expressions": "error",
			"@typescript-eslint/no-floating-promises": "error",
			"@typescript-eslint/no-misused-promises": ["error", {
				checksVoidReturn: {
					arguments: false,
					attributes: false,
				},
			}],
			"@typescript-eslint/no-empty-object-type": ["error", {
				allowInterfaces: "with-single-extends",
			}],
		},
	},

	// TSX-specific rules
	{
		files: ["**/*.tsx"],
		rules: {
			"@typescript-eslint/explicit-module-boundary-types": "off",
		},
	},
);
