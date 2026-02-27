const pluginBotWhatsapp = require('eslint-plugin-bot-whatsapp');
const globals = require('globals');

module.exports = [
    {
        plugins: {
            'bot-whatsapp': pluginBotWhatsapp
        },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2021
            }
        },
        rules: {
            ...pluginBotWhatsapp.configs.recommended.rules
        }
    }
];
