const {
    defineConfig,
} = require("eslint/config");

const globals = require("globals");
const js = require("@eslint/js");

const {
    FlatCompat,
} = require("@eslint/eslintrc");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = defineConfig([{
    languageOptions: {
        globals: {
            ...globals.browser,
            customElements: "readonly",
            window: "readonly",
            document: "readonly",
            console: "readonly",
            alert: "readonly",
            confirm: "readonly",
            setTimeout: "readonly",
        },

        ecmaVersion: "latest",
        sourceType: "module",
        parserOptions: {},
    },

    extends: compat.extends("eslint:recommended"),

    rules: {
        "no-unused-vars": ["error", {
            argsIgnorePattern: "^_",
        }],

        "no-console": "off",
        "prefer-const": "error",
        "no-var": "error",
        "indent": ["error", 2],
        "quotes": ["error", "single"],
        "semi": ["error", "always"],
        "comma-dangle": ["error", "always-multiline"],
        "object-curly-spacing": ["error", "always"],
        "array-bracket-spacing": ["error", "never"],
        "space-before-function-paren": ["error", "never"],
        "keyword-spacing": "error",
        "space-infix-ops": "error",
        "eqeqeq": ["error", "always"],
        "curly": ["error", "all"],
        "brace-style": ["error", "1tbs"],
        "no-trailing-spaces": "error",
        "eol-last": "error",

        "max-len": ["warn", {
            code: 100,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
        }],
    },
}]);

